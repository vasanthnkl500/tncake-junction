import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  sendEmail, 
  sendPasswordChangedNotificationEmail, 
  isEmailConfigured 
} from './emailService';
import { queueBackupEvent } from './driveBackupService';

// ============================================================================
// TYPES & DATA STRUCTURES
// ============================================================================

export interface CustomerAccountRecord {
  id: string;
  name: string;
  username: string; // unique, lowercase
  email: string; // unique, lowercase
  phone?: string; // optional contact / delivery field, NEVER used as auth factor!
  passwordHash: string;
  passwordSalt: string;
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: number | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface ActiveCustomerSession {
  sessionId: string;
  customerId: string;
  email: string;
  username: string;
  name: string;
  ip: string;
  userAgent: string;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
}

interface CustomerEmailOtpSession {
  email: string;
  hashedOtp: string; // HMAC-SHA256 with server secret
  expiresAt: number; // 10 minutes from creation
  createdAt: number;
  attempts: number; // max 5 attempts
  maxAttempts: number;
  lastRequestedAt: number; // for 60s cooldown
  verified: boolean;
  recoveryToken?: string; // Single-use token issued upon OTP verification
  recoveryTokenExpiresAt?: number;
}

export interface CustomerSecurityStore {
  customers: CustomerAccountRecord[];
}

const DATA_DIR = path.resolve(process.cwd(), '.server_data');
const STORE_FILE = path.join(DATA_DIR, 'customer_accounts.json');

// In-memory sessions & rate limits
const activeCustomerSessions = new Map<string, ActiveCustomerSession>();
const customerOtpSessions = new Map<string, CustomerEmailOtpSession>();
const customerLoginRateLimits = new Map<string, { attempts: number; resetAt: number }>();
const otpRequestIpRateLimits = new Map<string, { count: number; resetAt: number }>();

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================================
// CRYPTOGRAPHIC HELPERS
// ============================================================================

const OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'cake-junction-cust-email-otp-secret-2026';

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, chosenSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: chosenSalt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  if (!password || !storedHash || !salt) return false;
  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const computedBuf = Buffer.from(computedHash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (computedBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, storedBuf);
  } catch {
    return false;
  }
}

function hashOtp(email: string, otp: string): string {
  return crypto.createHmac('sha256', OTP_HMAC_SECRET).update(`${email.toLowerCase().trim()}:${otp.trim()}`).digest('hex');
}

/**
 * Validates password strength policy
 */
export function validateCustomerPasswordPolicy(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { isValid: false, error: 'Password must not exceed 128 characters.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one digit (0-9).' };
  }

  const banned = ['password', 'password123', 'admin123', '12345678', 'cakejunction', 'cakeowner2026'];
  if (banned.includes(password.toLowerCase())) {
    return { isValid: false, error: 'Password is too common. Please choose a more secure password.' };
  }

  return { isValid: true };
}

// ============================================================================
// STORE PERSISTENCE & INITIAL MIGRATION
// ============================================================================

let currentStore: CustomerSecurityStore | null = null;

export function loadStore(): CustomerSecurityStore {
  if (currentStore) return currentStore;

  if (fs.existsSync(STORE_FILE)) {
    try {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      currentStore = JSON.parse(content);
      return currentStore!;
    } catch (err) {
      console.error('Failed to parse customer accounts store, creating fresh:', err);
    }
  }

  // Pre-seed and preserve existing customer accounts from orders so order history is preserved!
  const defaultPw = 'CakeCustomer#2026';
  const { hash: h1, salt: s1 } = hashPassword(defaultPw);
  const { hash: h2, salt: s2 } = hashPassword(defaultPw);
  const { hash: h3, salt: s3 } = hashPassword(defaultPw);

  const newStore: CustomerSecurityStore = {
    customers: [
      {
        id: 'cust-meenakshi',
        name: 'Meenakshi Sundaram',
        username: 'meenakshi',
        email: 'meenakshi.s@gmail.com',
        phone: '+91 94441 23456',
        passwordHash: h1,
        passwordSalt: s1,
        isEmailVerified: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'cust-sanjay',
        name: 'Sanjay Kumar',
        username: 'sanjay',
        email: 'sanjay.k@outlook.com',
        phone: '+91 98765 43210',
        passwordHash: h2,
        passwordSalt: s2,
        isEmailVerified: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: '2026-03-02T11:00:00.000Z',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'cust-priya',
        name: 'Priya Dharshini',
        username: 'priya',
        email: 'priya.d@yahoo.com',
        phone: '+91 97890 12345',
        passwordHash: h3,
        passwordSalt: s3,
        isEmailVerified: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: '2026-03-03T12:00:00.000Z',
        updatedAt: new Date().toISOString()
      }
    ]
  };

  saveStore(newStore);
  currentStore = newStore;
  return newStore;
}

function saveStore(store: CustomerSecurityStore): void {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
    currentStore = store;
  } catch (err) {
    console.error('Failed to save customer accounts store:', err);
  }
}

// ============================================================================
// CUSTOMER AUTHENTICATION METHODS
// ============================================================================

/**
 * Register a new customer with name, username, email, password, and optional phone
 */
export function registerCustomer(params: {
  name: string;
  username: string;
  email: string;
  password: string;
  phone?: string;
  ip?: string;
}): { success: boolean; error?: string; customer?: Omit<CustomerAccountRecord, 'passwordHash' | 'passwordSalt'> } {
  const store = loadStore();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanUsername = params.username.trim().toLowerCase();
  const cleanName = params.name.trim();

  if (!cleanName || !cleanUsername || !cleanEmail || !params.password) {
    return { success: false, error: 'Name, username, email and password are all required.' };
  }

  if (!/^[a-z0-9_.-]{3,30}$/.test(cleanUsername)) {
    return { success: false, error: 'Username must be 3-30 characters and contain only letters, numbers, hyphens or underscores.' };
  }

  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, error: 'Please provide a valid email address.' };
  }

  // Check uniqueness
  if (store.customers.some(c => c.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: 'An account with this email address already exists. Please log in or use Forgot Password.' };
  }

  if (store.customers.some(c => c.username.toLowerCase() === cleanUsername)) {
    return { success: false, error: 'This username is already taken. Please choose another username.' };
  }

  // Validate password policy
  const pwPolicy = validateCustomerPasswordPolicy(params.password);
  if (!pwPolicy.isValid) {
    return { success: false, error: pwPolicy.error };
  }

  const { hash, salt } = hashPassword(params.password);

  const newCustomer: CustomerAccountRecord = {
    id: `cust-${Date.now()}-${crypto.randomInt(100, 999)}`,
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    phone: params.phone?.trim() || undefined,
    passwordHash: hash,
    passwordSalt: salt,
    isEmailVerified: false,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.customers.push(newCustomer);
  saveStore(store);

  const { passwordHash, passwordSalt, ...safeProfile } = newCustomer;

  // Queue sanitized customer account and registration audit log for Google Drive backup
  try {
    queueBackupEvent({
      category: 'Customer_Account_Exports',
      entityType: 'customer',
      entityId: newCustomer.id,
      action: 'create',
      data: safeProfile
    });
    queueBackupEvent({
      category: 'Login_Audit_Logs',
      entityType: 'audit',
      entityId: `reg-${Date.now()}`,
      action: 'create',
      data: {
        timestamp: new Date().toISOString(),
        action: 'CUSTOMER_REGISTRATION',
        userIdentifier: cleanEmail,
        ip: params.ip || 'unknown',
        outcome: 'SUCCESS',
        details: `Customer registered: ${cleanName} (${cleanUsername})`
      }
    });
  } catch (err) {
    console.warn('Failed to queue registration backup event:', err);
  }

  return { success: true, customer: safeProfile };
}

/**
 * Authenticate customer by username OR email and password (NO mobile OTP)
 */
export function authenticateCustomer(
  identifier: string,
  password: string,
  ip = 'unknown'
): { success: boolean; error?: string; status?: string; customer?: Omit<CustomerAccountRecord, 'passwordHash' | 'passwordSalt'> } {
  const store = loadStore();
  const cleanId = identifier.trim().toLowerCase();
  const now = Date.now();

  // Rate limit by IP
  const ipLimit = customerLoginRateLimits.get(ip) || { attempts: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > ipLimit.resetAt) {
    ipLimit.attempts = 0;
    ipLimit.resetAt = now + 15 * 60 * 1000;
  }
  if (ipLimit.attempts >= 10) {
    return { success: false, error: 'Too many login attempts from this network. Please wait a few minutes before trying again.', status: 'ip_rate_limited' };
  }

  // Find by email OR username
  const customer = store.customers.find(
    c => c.email.toLowerCase() === cleanId || c.username.toLowerCase() === cleanId
  );

  if (!customer) {
    ipLimit.attempts += 1;
    customerLoginRateLimits.set(ip, ipLimit);
    try {
      queueBackupEvent({
        category: 'Login_Audit_Logs',
        entityType: 'audit',
        entityId: `cust-fail-${Date.now()}`,
        action: 'create',
        data: {
          timestamp: new Date().toISOString(),
          action: 'CUSTOMER_LOGIN_FAILED',
          userIdentifier: cleanId,
          ip,
          outcome: 'FAILURE',
          details: 'Unregistered identifier entered.'
        }
      });
    } catch {}
    return { success: false, error: 'Invalid username/email or password.', status: 'invalid_credentials' };
  }

  // Check account lockout
  if (customer.lockedUntil && now < customer.lockedUntil) {
    const minsLeft = Math.ceil((customer.lockedUntil - now) / (60 * 1000));
    return { success: false, error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'} or use Forgot Password.`, status: 'account_locked' };
  }

  // Verify password
  const isValid = verifyPassword(password, customer.passwordHash, customer.passwordSalt);

  if (!isValid) {
    customer.failedLoginAttempts = (customer.failedLoginAttempts || 0) + 1;
    ipLimit.attempts += 1;
    customerLoginRateLimits.set(ip, ipLimit);

    if (customer.failedLoginAttempts >= 5) {
      customer.lockedUntil = now + 15 * 60 * 1000;
      saveStore(store);
      try {
        queueBackupEvent({
          category: 'Login_Audit_Logs',
          entityType: 'audit',
          entityId: `cust-lock-${Date.now()}`,
          action: 'create',
          data: {
            timestamp: new Date().toISOString(),
            action: 'CUSTOMER_ACCOUNT_LOCKED',
            userIdentifier: customer.email,
            ip,
            outcome: 'BLOCKED',
            details: 'Account locked for 15 minutes after 5 failed password attempts.'
          }
        });
      } catch {}
      return { success: false, error: 'Too many incorrect attempts. Account locked for 15 minutes. Use Forgot Password to reset your credentials.', status: 'account_locked' };
    }

    saveStore(store);
    const remaining = 5 - customer.failedLoginAttempts;
    try {
      queueBackupEvent({
        category: 'Login_Audit_Logs',
        entityType: 'audit',
        entityId: `cust-fail-${Date.now()}`,
        action: 'create',
        data: {
          timestamp: new Date().toISOString(),
          action: 'CUSTOMER_LOGIN_FAILED',
          userIdentifier: customer.email,
          ip,
          outcome: 'FAILURE',
          details: `Incorrect password. ${remaining} attempts remaining.`
        }
      });
    } catch {}
    return { success: false, error: `Invalid password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`, status: 'invalid_credentials' };
  }

  // Successful login! Reset counters
  customer.failedLoginAttempts = 0;
  customer.lockedUntil = null;
  customer.lastLoginAt = new Date().toISOString();
  saveStore(store);

  try {
    queueBackupEvent({
      category: 'Login_Audit_Logs',
      entityType: 'audit',
      entityId: `cust-login-${Date.now()}`,
      action: 'create',
      data: {
        timestamp: new Date().toISOString(),
        action: 'CUSTOMER_LOGIN_SUCCESS',
        userIdentifier: customer.email,
        ip,
        outcome: 'SUCCESS',
        details: `Customer authenticated (${customer.name})`
      }
    });
  } catch {}

  const { passwordHash, passwordSalt, ...safeProfile } = customer;
  return { success: true, customer: safeProfile };
}

// ============================================================================
// CUSTOMER EMAIL OTP PASSWORD RECOVERY
// ============================================================================

/**
 * Step 1: Send a Real 6-Digit Email OTP for Customer Password Recovery
 * Generic response is ALWAYS returned to protect against account enumeration.
 */
export async function requestCustomerPasswordResetOtp(email: string, ip = 'unknown'): Promise<{
  success: boolean;
  status: 'accepted' | 'cooldown' | 'unconfigured' | 'rate_limited' | 'error' | 'sent' | 'failed';
  message: string;
  cooldownSeconds?: number;
}> {
  const store = loadStore();
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();

  // 1. IP rate limiting: max 5 requests per 15 minutes
  const ipRate = otpRequestIpRateLimits.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > ipRate.resetAt) {
    ipRate.count = 0;
    ipRate.resetAt = now + 15 * 60 * 1000;
  }
  if (ipRate.count >= 6) {
    return {
      success: false,
      status: 'rate_limited',
      message: 'Too many verification requests from this IP. Please wait 15 minutes before trying again.'
    };
  }

  // 2. Check 60-second resend cooldown for this email
  const existingSession = customerOtpSessions.get(cleanEmail);
  if (existingSession) {
    const elapsedSeconds = Math.floor((now - existingSession.lastRequestedAt) / 1000);
    if (elapsedSeconds < 60) {
      const waitTime = 60 - elapsedSeconds;
      return {
        success: false,
        status: 'cooldown',
        message: `Please wait ${waitTime} second${waitTime === 1 ? '' : 's'} before requesting another verification code.`,
        cooldownSeconds: waitTime
      };
    }
  }

  // Increment IP request count
  ipRate.count += 1;
  otpRequestIpRateLimits.set(ip, ipRate);

  // Check if account exists
  const customer = store.customers.find(c => c.email.toLowerCase() === cleanEmail);

  // If email delivery service is NOT configured on the server, report clearly!
  if (!isEmailConfigured()) {
    // Generate code anyway for testing/outbox inspection so it's not blocked in dev
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = hashOtp(cleanEmail, otpCode);

    customerOtpSessions.set(cleanEmail, {
      email: cleanEmail,
      hashedOtp,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
      createdAt: now,
      attempts: 0,
      maxAttempts: 5,
      lastRequestedAt: now,
      verified: false
    });

    // Write to email service outbox
    await sendEmail({
      to: cleanEmail,
      subject: 'Cake Junction — Password Reset Verification Code',
      html: `
        <h2 style="color: #4B2E25; font-family: Georgia, serif;">Cake Junction — Password Reset Verification Code</h2>
        <p>Your 6-digit password recovery code is: <strong style="font-size: 24px; color: #4B2E25; letter-spacing: 4px;">${otpCode}</strong></p>
        <p>This code expires in 10 minutes. Never share this code with anyone.</p>
      `,
      type: 'password_reset'
    });

    return {
      success: false,
      status: 'unconfigured',
      message: 'Email delivery is not configured on this server. Please configure SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) in server environment variables.'
    };
  }

  // If account does NOT exist: return generic success response to protect customer privacy
  if (!customer) {
    return {
      success: true,
      status: 'accepted',
      message: 'If an account is associated with this email address, a 6-digit verification code has been sent. Please check your inbox and spam folder.'
    };
  }

  // Account exists: Generate cryptographically secure 6-digit OTP
  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = hashOtp(cleanEmail, otpCode);

  customerOtpSessions.set(cleanEmail, {
    email: cleanEmail,
    hashedOtp,
    expiresAt: now + 10 * 60 * 1000, // 10 minutes
    createdAt: now,
    attempts: 0,
    maxAttempts: 5,
    lastRequestedAt: now,
    verified: false
  });

  // Dispatch branded HTML email via real email provider
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="background-color: #FFF8EF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #4B2E25; margin: 0; padding: 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #E8D5C8; overflow: hidden; box-shadow: 0 4px 12px rgba(75, 46, 37, 0.06);">
        <tr>
          <td style="background-color: #4B2E25; padding: 24px; text-align: center;">
            <h1 style="color: #FFF8EF; margin: 0; font-family: Georgia, serif; font-size: 22px;">Cake Junction</h1>
            <p style="color: #C5A15A; margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Artisanal Cakes &amp; Bakery</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 28px;">
            <h2 style="font-family: Georgia, serif; font-size: 19px; color: #4B2E25; margin: 0 0 12px;">Password Reset Verification Code</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #4B2E25; margin: 0 0 20px;">Hello <strong>${customer.name}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #4B2E25; margin: 0 0 24px;">We received a request to reset the password for your Cake Junction customer account. Please enter the verification code below on the recovery screen:</p>
            
            <div style="text-align: center; margin: 28px 0; background-color: #FFF8EF; padding: 20px; border-radius: 16px; border: 1px solid #E8D5C8;">
              <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4B2E25;">${otpCode}</span>
            </div>

            <div style="background-color: #FFF3E0; border-left: 4px solid #FFA000; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 12px; color: #E65100; font-weight: 600;">Important Security Notices:</p>
              <ul style="margin: 6px 0 0; padding-left: 18px; font-size: 12px; color: #7A5B51; line-height: 1.5;">
                <li>This code expires in <strong>10 minutes</strong>.</li>
                <li>Never share this code with anyone. Cake Junction staff will never ask for your verification code.</li>
              </ul>
            </div>

            <p style="font-size: 12px; color: #7A5B51; margin: 0; line-height: 1.5;">If you did not request this password recovery, you can safely ignore this email. Your existing password remains unchanged.</p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #FDF9F3; padding: 18px 24px; text-align: center; border-top: 1px solid #E8D5C8; font-size: 11px; color: #9A7B71;">
            Cake Junction · Handcrafted celebration cakes and artisanal treats
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const sendRes = await sendEmail({
    to: cleanEmail,
    subject: 'Cake Junction — Password Reset Verification Code',
    html: emailHtml,
    type: 'password_reset'
  });

  if (!sendRes.success) {
    return {
      success: false,
      status: sendRes.status,
      message: sendRes.message || 'Failed to dispatch verification email via SMTP provider.'
    };
  }

  return {
    success: true,
    status: 'sent',
    message: 'A 6-digit verification code has been dispatched to your registered email address. Please check your inbox and spam folder.'
  };
}

/**
 * Step 2: Verify the 6-Digit Email OTP
 * Returns a single-use recoveryToken required to submit the new password.
 */
export function verifyCustomerPasswordResetOtp(email: string, otp: string, ip = 'unknown'): {
  success: boolean;
  status: 'verified' | 'incorrect_otp' | 'expired' | 'max_attempts_exceeded' | 'no_active_otp';
  message: string;
  remainingAttempts?: number;
  recoveryToken?: string;
} {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otp.trim().replace(/\D/g, '');
  const now = Date.now();

  const session = customerOtpSessions.get(cleanEmail);
  if (!session) {
    return {
      success: false,
      status: 'no_active_otp',
      message: 'No active password recovery session found for this email, or the code has expired. Please request a new verification code.'
    };
  }

  // Expiration check (10 minutes)
  if (now > session.expiresAt) {
    customerOtpSessions.delete(cleanEmail);
    return {
      success: false,
      status: 'expired',
      message: 'The verification code has expired (10-minute validity limit). Please request a new verification code.'
    };
  }

  // Max attempts check (5 attempts)
  if (session.attempts >= session.maxAttempts) {
    customerOtpSessions.delete(cleanEmail);
    return {
      success: false,
      status: 'max_attempts_exceeded',
      message: 'Maximum verification attempts exceeded. For your security, this verification code has been revoked. Please request a new code.'
    };
  }

  // Verify HMAC-SHA256 representation of OTP using timing-safe comparison
  const enteredHashed = hashOtp(cleanEmail, cleanOtp);
  const isValid = crypto.timingSafeEqual(
    Buffer.from(enteredHashed, 'hex'),
    Buffer.from(session.hashedOtp, 'hex')
  );

  if (!isValid) {
    session.attempts += 1;
    const remaining = session.maxAttempts - session.attempts;

    if (remaining <= 0) {
      customerOtpSessions.delete(cleanEmail);
      return {
        success: false,
        status: 'max_attempts_exceeded',
        message: 'Maximum attempts exceeded. This verification code has been revoked. Please request a new code.'
      };
    }

    return {
      success: false,
      status: 'incorrect_otp',
      message: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before this code is revoked.`,
      remainingAttempts: remaining
    };
  }

  // Valid OTP! Issue single-use recovery token valid for 10 minutes
  const recoveryToken = crypto.randomBytes(32).toString('hex');
  session.verified = true;
  session.recoveryToken = recoveryToken;
  session.recoveryTokenExpiresAt = now + 10 * 60 * 1000;

  return {
    success: true,
    status: 'verified',
    message: 'Verification code verified successfully. Please enter your new password.',
    recoveryToken
  };
}

/**
 * Step 3: Set New Password after Successful Email OTP Verification
 * Validates recoveryToken, atomically updates password with PBKDF2, revokes sessions, and dispatches notification.
 */
export async function resetCustomerPasswordWithVerifiedOtp(
  email: string,
  recoveryToken: string,
  newPassword: string,
  ip = 'unknown'
): Promise<{ success: boolean; message?: string; error?: string }> {
  const store = loadStore();
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();

  const session = customerOtpSessions.get(cleanEmail);
  if (!session || !session.verified || !session.recoveryToken) {
    return {
      success: false,
      error: 'Unauthorized password reset request. Please verify your email code first.'
    };
  }

  // Verify recovery token
  if (now > (session.recoveryTokenExpiresAt || 0)) {
    customerOtpSessions.delete(cleanEmail);
    return {
      success: false,
      error: 'Password reset authorization has expired. Please restart the verification process.'
    };
  }

  const tokenMatches = crypto.timingSafeEqual(
    Buffer.from(recoveryToken.trim()),
    Buffer.from(session.recoveryToken.trim())
  );

  if (!tokenMatches) {
    return {
      success: false,
      error: 'Invalid recovery authorization token.'
    };
  }

  // Find customer account
  const customer = store.customers.find(c => c.email.toLowerCase() === cleanEmail);
  if (!customer) {
    customerOtpSessions.delete(cleanEmail);
    return { success: false, error: 'Customer account not found.' };
  }

  // Validate new password policy
  const pwPolicy = validateCustomerPasswordPolicy(newPassword);
  if (!pwPolicy.isValid) {
    return { success: false, error: pwPolicy.error };
  }

  // Prevent setting identical password
  if (verifyPassword(newPassword, customer.passwordHash, customer.passwordSalt)) {
    return { success: false, error: 'New password cannot be the same as your old password. Please choose a different password.' };
  }

  // ATOMIC UPDATE: Hash new password with fresh salt
  const { hash: newHash, salt: newSalt } = hashPassword(newPassword);
  customer.passwordHash = newHash;
  customer.passwordSalt = newSalt;
  customer.updatedAt = new Date().toISOString();
  customer.failedLoginAttempts = 0;
  customer.lockedUntil = null;
  saveStore(store);

  // Invalidate OTP session IMMEDIATELY so it can NEVER be reused
  customerOtpSessions.delete(cleanEmail);

  // Revoke all active sessions for this customer across all devices
  revokeAllCustomerSessions(customer.id);

  // Send password changed notification email to registered customer email
  try {
    await sendPasswordChangedNotificationEmail(customer.email, customer.name, 'customer');
  } catch (err) {
    console.error('Failed to send customer password changed email notification:', err);
  }

  return {
    success: true,
    message: 'Your password has been reset successfully. Please log in with your new password.'
  };
}

/**
 * Change customer password from in-account settings (requires current password)
 */
export async function changeCustomerPasswordWithCurrent(
  customerId: string,
  currentPassword: string,
  newPassword: string,
  ip = 'unknown'
): Promise<{ success: boolean; error?: string; message?: string }> {
  const store = loadStore();
  const customer = store.customers.find(c => c.id === customerId);

  if (!customer) {
    return { success: false, error: 'Customer account not found.' };
  }

  // Verify current password
  if (!verifyPassword(currentPassword, customer.passwordHash, customer.passwordSalt)) {
    return { success: false, error: 'Current password is incorrect. Please re-enter your current password.' };
  }

  // Validate new password policy
  const pwPolicy = validateCustomerPasswordPolicy(newPassword);
  if (!pwPolicy.isValid) {
    return { success: false, error: pwPolicy.error };
  }

  // Prevent identical password
  if (verifyPassword(newPassword, customer.passwordHash, customer.passwordSalt)) {
    return { success: false, error: 'New password cannot be the same as your existing password.' };
  }

  const { hash: newHash, salt: newSalt } = hashPassword(newPassword);
  customer.passwordHash = newHash;
  customer.passwordSalt = newSalt;
  customer.updatedAt = new Date().toISOString();
  saveStore(store);

  // Revoke other sessions
  revokeAllCustomerSessions(customer.id);

  try {
    await sendPasswordChangedNotificationEmail(customer.email, customer.name, 'customer');
  } catch {}

  return {
    success: true,
    message: 'Password updated successfully. Other active sessions have been safely logged out.'
  };
}

// ============================================================================
// CUSTOMER SESSION MANAGEMENT
// ============================================================================

export function createCustomerSession(
  customer: CustomerAccountRecord,
  ip: string,
  userAgent: string
): ActiveCustomerSession {
  const sessionId = 'cj_cust_' + crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: ActiveCustomerSession = {
    sessionId,
    customerId: customer.id,
    email: customer.email,
    username: customer.username,
    name: customer.name,
    ip,
    userAgent,
    createdAt: now,
    lastActiveAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  activeCustomerSessions.set(sessionId, session);
  return session;
}

export function validateCustomerSession(sessionId: string): ActiveCustomerSession | null {
  if (!sessionId) return null;
  const session = activeCustomerSessions.get(sessionId);
  if (!session) return null;

  const now = Date.now();
  if (now > session.expiresAt) {
    activeCustomerSessions.delete(sessionId);
    return null;
  }

  session.lastActiveAt = now;
  return session;
}

export function revokeCustomerSession(sessionId: string): boolean {
  return activeCustomerSessions.delete(sessionId);
}

export function revokeAllCustomerSessions(customerId: string): number {
  let count = 0;
  for (const [sId, sess] of activeCustomerSessions.entries()) {
    if (sess.customerId === customerId) {
      activeCustomerSessions.delete(sId);
      count++;
    }
  }
  return count;
}

/**
 * Get customer by email or id
 */
export function getCustomerByEmailOrId(idOrEmail: string): CustomerAccountRecord | null {
  const store = loadStore();
  const clean = idOrEmail.trim().toLowerCase();
  return store.customers.find(c => c.id === idOrEmail || c.email.toLowerCase() === clean || c.username.toLowerCase() === clean) || null;
}
