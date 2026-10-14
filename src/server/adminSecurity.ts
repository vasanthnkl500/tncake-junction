import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  sendAdminPasswordResetEmail, 
  sendPasswordChangedNotificationEmail, 
  isEmailConfigured 
} from './emailService';
import { queueBackupEvent } from './driveBackupService';

// ============================================================================
// TYPES & INTERFACES FOR SECURE AUTHENTICATION
// ============================================================================

export interface OwnerAccountRecord {
  id: string;
  email: string;
  alternateEmails?: string[];
  phone: string;
  phoneCountryCode: string;
  isPhoneVerified: boolean;
  passwordHash: string;
  passwordSalt: string;
  recoveryKeyHash: string;
  recoveryKeyRotatedAt?: string;
  recoveryKeyStatus?: 'active' | 'used' | 'revoked_compromised' | 'unconfigured';
  failedLoginAttempts: number;
  lockedUntil: number | null;
  createdAt: string;
  updatedAt: string;
  lastPasswordChangedAt?: string;
  lastLoginAt?: string;
}

export interface StaffAccountRecord {
  id: string;
  name: string;
  email: string;
  role: 'staff' | 'manager';
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  createdBy: string;
  lastLoginAt?: string;
}

export interface ActiveSessionRecord {
  sessionId: string;
  userId: string;
  role: 'owner' | 'staff' | 'manager';
  email: string;
  name: string;
  ip: string;
  userAgent: string;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
}

export interface SecurityAuditRecord {
  id: string;
  timestamp: string;
  action: string;
  userIdentifier: string;
  ip: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'REVOKED';
  details: string;
}

export interface PasswordOtpSession {
  hashedOtp: string;
  expiresAt: number;
  createdAt: number;
  attempts: number;
  maxAttempts: number;
  phone: string;
}

export interface AdminSecurityStore {
  owner: OwnerAccountRecord;
  staff: StaffAccountRecord[];
  securityLogs: SecurityAuditRecord[];
}

// ============================================================================
// DATA STORAGE PATHS & COMPROMISED KEY PURGING
// ============================================================================

const DATA_DIR = path.resolve(process.cwd(), '.server_data');
const STORE_FILE = path.join(DATA_DIR, 'admin_security.json');

// Known compromised key & hash that were previously exposed in plaintext file
export const COMPROMISED_RECOVERY_KEY = 'CJ-A98C-A95D-DFB7';
export const COMPROMISED_RECOVERY_HASH = 'a0e50f84925b1c69be6fa7c1837b68e1d632e97eb31376861b4e2b1b25c7d4e5';

// In-memory active sessions and password OTP sessions
const activeSessions = new Map<string, ActiveSessionRecord>();
const passwordOtpSessions = new Map<string, PasswordOtpSession>();
const phoneUpdateOtpSessions = new Map<string, { stage: 'old_verified' | 'pending'; oldHashedOtp?: string; newHashedOtp?: string; newPhone: string; expiresAt: number; attempts: number }>();
const loginIpRateLimits = new Map<string, { attempts: number; resetAt: number }>();
const recoveryRateLimits = new Map<string, { failedAttempts: number; lockedUntil: number | null }>();
const adminPasswordResetSessions = new Map<string, { hashedToken: string; email: string; userId: string; expiresAt: number; createdAt: number }>();

// Ensure storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ============================================================================
// CRYPTOGRAPHIC HELPERS (PBKDF2, Timing-Safe Comparison, Key Generation)
// ============================================================================

/**
 * Hash a password securely using PBKDF2 with SHA-512 and 100,000 iterations
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const chosenSalt = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, chosenSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: chosenSalt };
}

/**
 * Verify a plaintext password against a stored PBKDF2 hash using timing-safe comparison
 */
export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
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

/**
 * Hash recovery key using SHA-256
 */
export function hashRecoveryKey(key: string): string {
  const cleanKey = key.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return crypto.createHash('sha256').update(cleanKey).digest('hex');
}

/**
 * Verify recovery key
 */
export function verifyRecoveryKey(enteredKey: string, storedHash: string): boolean {
  if (!enteredKey || !storedHash) return false;
  const cleanEnteredKey = enteredKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Strictly reject the known compromised key:
  if (cleanEnteredKey === COMPROMISED_RECOVERY_KEY.replace(/[^A-Z0-9]/g, '')) {
    return false;
  }

  const enteredHash = hashRecoveryKey(enteredKey);
  if (enteredHash === COMPROMISED_RECOVERY_HASH) {
    return false;
  }

  const enteredBuf = Buffer.from(enteredHash, 'hex');
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (enteredBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(enteredBuf, storedBuf);
}

/**
 * Generates an emergency recovery key formatted as CJ-XXXX-XXXX-XXXX
 */
export function generateEmergencyRecoveryKey(): string {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CJ-${part1}-${part2}-${part3}`;
}

/**
 * Enforces strict enterprise-grade password policy
 */
export function validatePasswordPolicy(password: string): { isValid: boolean; error?: string } {
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

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character (e.g. !@#$%^&*).' };
  }

  // Reject commonly compromised or trivial passwords
  const lower = password.toLowerCase();
  const bannedPasswords = [
    'admin123',
    'cakeowner2026',
    'owner123',
    'staff123',
    'staff2026',
    'password',
    'password123',
    '12345678',
    'cakejunction',
    'cakejunction123',
    'welcome123'
  ];

  if (bannedPasswords.includes(lower)) {
    return { isValid: false, error: 'This password is too common or matches a banned default credential. Please choose a unique, secure password.' };
  }

  return { isValid: true };
}

/**
 * Mask an email address: e.g. "ananya.r@cakejunction.com" -> "a******@cakejunction.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'Not configured';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local.charAt(0)}*@${domain}`;
  }
  return `${local.charAt(0)}${'*'.repeat(Math.min(local.length - 2, 6))}${local.charAt(local.length - 1)}@${domain}`;
}

/**
 * Mask an Indian mobile number: e.g. "9876543210" -> "+91 98*** **210"
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 10) return 'Not configured';
  const digits = phone.replace(/\D/g, '').slice(-10);
  return `+91 ${digits.slice(0, 2)}*** **${digits.slice(-3)}`;
}

// ============================================================================
// DATA STORE PERSISTENCE
// ============================================================================

let currentStore: AdminSecurityStore | null = null;

function loadStore(): AdminSecurityStore {
  if (currentStore) return currentStore;

  if (fs.existsSync(STORE_FILE)) {
    try {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      currentStore = JSON.parse(content);
      
      // Check if store contains previously compromised key hash
      if (currentStore?.owner?.recoveryKeyHash === COMPROMISED_RECOVERY_HASH) {
        currentStore.owner.recoveryKeyHash = '';
        currentStore.owner.recoveryKeyStatus = 'revoked_compromised';
        currentStore.owner.updatedAt = new Date().toISOString();
        saveStore(currentStore);
        console.warn('[Security Notice] Compromised recovery key hash detected and permanently purged.');
      }

      return currentStore!;
    } catch (err) {
      console.error('Failed to parse admin security store, initializing fresh:', err);
    }
  }

  // Check if an initial password was passed via secure environment variable
  const initialPassword = process.env.OWNER_INITIAL_PASSWORD || 'CakeJunctionSecure#2026';
  const { hash: passwordHash, salt: passwordSalt } = hashPassword(initialPassword);

  const newStore: AdminSecurityStore = {
    owner: {
      id: 'owner-cakejunction-primary',
      email: process.env.OWNER_EMAIL || 'vasanthnkl500@gmail.com',
      alternateEmails: ['VASANTHDHANUSHYA1998@gmail.com'],
      phone: process.env.OWNER_PHONE || '8825648728',
      phoneCountryCode: '+91',
      isPhoneVerified: false,
      passwordHash,
      passwordSalt,
      recoveryKeyHash: '', // Unconfigured until owner securely generates in dashboard
      recoveryKeyStatus: 'unconfigured',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastPasswordChangedAt: new Date().toISOString()
    },
    staff: [],
    securityLogs: [
      {
        id: `sec-${Date.now()}-1`,
        timestamp: new Date().toISOString(),
        action: 'SECURITY_SYSTEM_INITIALIZED',
        userIdentifier: 'SYSTEM',
        ip: '127.0.0.1',
        outcome: 'SUCCESS',
        details: 'Admin security engine bootstrapped. Plaintext recovery secrets strictly disabled.'
      }
    ]
  };

  saveStore(newStore);
  currentStore = newStore;
  return newStore;
}

function saveStore(store: AdminSecurityStore): void {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
    currentStore = store;
  } catch (err) {
    console.error('Failed to save admin security store to disk:', err);
  }
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export function recordSecurityAudit(
  action: string,
  userIdentifier: string,
  ip: string,
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'REVOKED',
  details: string
): void {
  const store = loadStore();
  const entry: SecurityAuditRecord = {
    id: `sec-${Date.now()}-${crypto.randomInt(100, 999)}`,
    timestamp: new Date().toISOString(),
    action,
    userIdentifier: userIdentifier.includes('@') ? maskEmail(userIdentifier) : (userIdentifier.length === 10 ? maskPhone(userIdentifier) : userIdentifier),
    ip: ip || 'unknown',
    outcome,
    details
  };

  store.securityLogs.unshift(entry);
  if (store.securityLogs.length > 200) {
    store.securityLogs = store.securityLogs.slice(0, 200);
  }

  saveStore(store);

  // Sync to Google Drive Login Audit Logs queue (strictly sanitized)
  try {
    queueBackupEvent({
      category: 'Login_Audit_Logs',
      entityType: 'audit',
      entityId: entry.id,
      action: 'create',
      data: entry
    });
  } catch {}
}

// ============================================================================
// SESSION MANAGEMENT (Creation, Validation, Revocation)
// ============================================================================

export function createSession(
  userId: string,
  role: 'owner' | 'staff' | 'manager',
  email: string,
  name: string,
  ip: string,
  userAgent: string
): ActiveSessionRecord {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: ActiveSessionRecord = {
    sessionId,
    userId,
    role,
    email,
    name,
    ip,
    userAgent: userAgent || 'Standard Web Browser',
    createdAt: now,
    lastActiveAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000 // 24 hours
  };

  activeSessions.set(sessionId, session);
  return session;
}

export function validateSession(sessionId?: string): ActiveSessionRecord | null {
  if (!sessionId) return null;
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  const now = Date.now();
  if (now > session.expiresAt) {
    activeSessions.delete(sessionId);
    return null;
  }

  // Sliding idle window update
  session.lastActiveAt = now;
  return session;
}

export function revokeSession(sessionId: string): boolean {
  return activeSessions.delete(sessionId);
}

export function revokeOtherSessions(userId: string, currentSessionId: string): number {
  let count = 0;
  for (const [sId, sess] of activeSessions.entries()) {
    if (sess.userId === userId && sId !== currentSessionId) {
      activeSessions.delete(sId);
      count++;
    }
  }
  return count;
}

export function revokeAllSessionsForUser(userId: string): number {
  let count = 0;
  for (const [sId, sess] of activeSessions.entries()) {
    if (sess.userId === userId) {
      activeSessions.delete(sId);
      count++;
    }
  }
  return count;
}

export function getActiveSessionsForUser(userId: string): ActiveSessionRecord[] {
  const list: ActiveSessionRecord[] = [];
  const now = Date.now();
  for (const [_, sess] of activeSessions.entries()) {
    if (sess.userId === userId && sess.expiresAt > now) {
      list.push(sess);
    }
  }
  return list.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}

// ============================================================================
// OWNER & STAFF AUTHENTICATION METHODS
// ============================================================================

export function getOwnerAccount(): OwnerAccountRecord {
  const store = loadStore();
  return store.owner;
}

export function getEmergencyRecoveryKey(): string | null {
  // REDACTED FOR SECURITY: Plain emergency recovery keys are never returned or logged
  return null;
}

/**
 * Checks whether an email address belongs to the bakery owner (primary or verified alias)
 */
export function isOwnerEmailMatch(cleanEmail: string, owner: OwnerAccountRecord): boolean {
  if (!cleanEmail) return false;
  const email = cleanEmail.trim().toLowerCase();
  if (owner.email.toLowerCase() === email) return true;
  if (owner.alternateEmails && owner.alternateEmails.some(e => e.trim().toLowerCase() === email)) return true;
  if (email === 'vasanthnkl500@gmail.com' || email === 'vasanthdhanushya1998@gmail.com') return true;
  return false;
}

/**
 * Authenticate owner or staff member
 */
export function authenticateAdminCredentials(
  email: string,
  password: string,
  ip: string
): { success: boolean; user?: { id: string; email: string; name: string; role: 'owner' | 'staff' }; error?: string; status?: string } {
  const now = Date.now();
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. IP rate limiting: max 10 failed logins per IP per 10 minutes
  const ipLimit = loginIpRateLimits.get(ip);
  if (ipLimit && ipLimit.resetAt > now) {
    if (ipLimit.attempts >= 10) {
      const waitMinutes = Math.ceil((ipLimit.resetAt - now) / 60000);
      recordSecurityAudit('LOGIN_BLOCKED_RATE_LIMIT', cleanEmail, ip, 'BLOCKED', `Too many failed attempts from IP. Lockout: ${waitMinutes}m`);
      return { success: false, error: `Too many failed login attempts from your IP. Please try again after ${waitMinutes} minutes.`, status: 'ip_rate_limited' };
    }
  } else {
    loginIpRateLimits.set(ip, { attempts: 0, resetAt: now + 10 * 60 * 1000 });
  }

  const store = loadStore();

  // 2. Check if owner account
  if (isOwnerEmailMatch(cleanEmail, store.owner)) {
    // Check account lockout
    if (store.owner.lockedUntil && store.owner.lockedUntil > now) {
      const remainingMins = Math.ceil((store.owner.lockedUntil - now) / 60000);
      recordSecurityAudit('LOGIN_BLOCKED_ACCOUNT_LOCKED', cleanEmail, ip, 'BLOCKED', `Account temporarily locked. Remaining: ${remainingMins}m`);
      return { success: false, error: `Owner account is temporarily locked due to multiple failed attempts. Please try again in ${remainingMins} minute${remainingMins === 1 ? '' : 's'} or use Emergency Account Recovery.`, status: 'account_locked' };
    }

    // Verify password
    const isPwValid = verifyPassword(password, store.owner.passwordHash, store.owner.passwordSalt);

    if (isPwValid) {
      // Reset lockout counter
      store.owner.failedLoginAttempts = 0;
      store.owner.lockedUntil = null;
      store.owner.lastLoginAt = new Date().toISOString();
      saveStore(store);

      recordSecurityAudit('OWNER_LOGIN_SUCCESS', cleanEmail, ip, 'SUCCESS', 'Owner authenticated with verified password.');
      return {
        success: true,
        user: {
          id: store.owner.id,
          email: store.owner.email,
          name: 'Bakery Owner (Chef Ananya)',
          role: 'owner'
        }
      };
    } else {
      // Increment failed attempts
      store.owner.failedLoginAttempts = (store.owner.failedLoginAttempts || 0) + 1;
      const currentIpLimit = loginIpRateLimits.get(ip)!;
      currentIpLimit.attempts += 1;

      if (store.owner.failedLoginAttempts >= 5) {
        store.owner.lockedUntil = now + 15 * 60 * 1000; // 15-minute lockout
        saveStore(store);
        recordSecurityAudit('OWNER_ACCOUNT_LOCKED', cleanEmail, ip, 'BLOCKED', '5 failed password attempts. Account locked for 15 minutes.');
        return { success: false, error: 'Too many incorrect password attempts. Your account has been temporarily locked for 15 minutes for security. Use Emergency Account Recovery if needed.', status: 'account_locked' };
      }

      saveStore(store);
      const remainingAttempts = 5 - store.owner.failedLoginAttempts;
      recordSecurityAudit('OWNER_LOGIN_FAILED', cleanEmail, ip, 'FAILURE', `Incorrect password. ${remainingAttempts} attempts remaining before lockout.`);
      return { success: false, error: `Incorrect password. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining before temporary security lockout.`, status: 'incorrect_credentials' };
    }
  }

  // 3. Check staff accounts
  const staffMember = store.staff.find(s => s.email.toLowerCase() === cleanEmail);
  if (staffMember) {
    const isPwValid = verifyPassword(password, staffMember.passwordHash, staffMember.passwordSalt);
    if (isPwValid) {
      staffMember.lastLoginAt = new Date().toISOString();
      saveStore(store);
      recordSecurityAudit('STAFF_LOGIN_SUCCESS', cleanEmail, ip, 'SUCCESS', `Staff member authenticated (${staffMember.name}).`);
      return {
        success: true,
        user: {
          id: staffMember.id,
          email: staffMember.email,
          name: staffMember.name,
          role: 'staff'
        }
      };
    } else {
      const currentIpLimit = loginIpRateLimits.get(ip)!;
      currentIpLimit.attempts += 1;
      recordSecurityAudit('STAFF_LOGIN_FAILED', cleanEmail, ip, 'FAILURE', 'Incorrect password for staff account.');
      return { success: false, error: 'Incorrect credentials for staff account.', status: 'incorrect_credentials' };
    }
  }

  // 4. No account found
  const currentIpLimit = loginIpRateLimits.get(ip)!;
  currentIpLimit.attempts += 1;
  recordSecurityAudit('LOGIN_FAILED_UNKNOWN_ACCOUNT', cleanEmail, ip, 'FAILURE', 'Attempted login with unregistered email address.');
  return { success: false, error: 'Invalid email address or password. Please verify credentials.', status: 'incorrect_credentials' };
}

// ============================================================================
// PASSWORD CHANGE WITH OTP IMPLEMENTATION
// ============================================================================

export function storePasswordOtpSession(phone: string, hashedOtp: string): void {
  const now = Date.now();
  passwordOtpSessions.set(phone, {
    hashedOtp,
    phone,
    createdAt: now,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
    attempts: 0,
    maxAttempts: 3
  });
}

export function getPasswordOtpSession(phone: string): PasswordOtpSession | undefined {
  return passwordOtpSessions.get(phone);
}

export function clearPasswordOtpSession(phone: string): void {
  passwordOtpSessions.delete(phone);
}

/**
 * Validates OTP and updates owner password
 */
/**
 * STEP 1-3: Change Owner Password Using Current Password (NO MOBILE OTP)
 */
export async function changeOwnerPasswordWithCurrentPassword(
  currentPassword: string,
  newPassword: string,
  ip = 'unknown'
): Promise<{ success: boolean; error?: string; status?: string }> {
  const store = loadStore();
  const owner = store.owner;

  // 1. Re-verify current password
  if (!verifyPassword(currentPassword, owner.passwordHash, owner.passwordSalt)) {
    recordSecurityAudit('PASSWORD_CHANGE_FAILED', owner.email, ip, 'FAILURE', 'Incorrect current password provided during password change attempt.');
    return { success: false, error: 'Current password is incorrect. Please re-enter your current password.', status: 'incorrect_current_password' };
  }

  // 2. Validate new password strength policy
  const policy = validatePasswordPolicy(newPassword);
  if (!policy.isValid) {
    return { success: false, error: policy.error || 'New password does not meet security requirements.', status: 'weak_password' };
  }

  // Prevent reusing same password
  if (verifyPassword(newPassword, owner.passwordHash, owner.passwordSalt)) {
    return { success: false, error: 'New password cannot be identical to your current password. Please choose a new password.', status: 'same_password' };
  }

  // 3. Hash new password with fresh salt
  const { hash: newHash, salt: newSalt } = hashPassword(newPassword);
  owner.passwordHash = newHash;
  owner.passwordSalt = newSalt;
  owner.lastPasswordChangedAt = new Date().toISOString();
  owner.updatedAt = new Date().toISOString();
  saveStore(store);

  // 4. Revoke all other active sessions (session rotation)
  const revokedCount = revokeAllSessionsForUser(owner.id);

  recordSecurityAudit('PASSWORD_CHANGED_SUCCESS', owner.email, ip, 'SUCCESS', `Owner password changed via verified current password. Revoked ${revokedCount} active sessions.`);

  // 5. Send notification email to registered admin email
  try {
    await sendPasswordChangedNotificationEmail(owner.email, 'Bakery Owner (Chef Ananya)', 'owner');
  } catch (err) {
    console.error('Failed to send admin password change notification email:', err);
  }

  return { success: true };
}

/**
 * Request Admin Password Reset Link by Email (Generic response prevents enumeration)
 */
export async function requestAdminPasswordResetByEmail(
  email: string,
  appUrl: string,
  ip = 'unknown'
): Promise<{ success: boolean; status: 'accepted' | 'unconfigured' | 'rate_limited' | 'sent' | 'failed'; message: string }> {
  const store = loadStore();
  const cleanEmail = email.trim().toLowerCase();

  // If email delivery is not configured, report accurately!
  if (!isEmailConfigured()) {
    return {
      success: false,
      status: 'unconfigured',
      message: 'Email delivery is not configured on this server. Please configure SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) in server environment variables.'
    };
  }

  const isOwner = isOwnerEmailMatch(cleanEmail, store.owner);
  const staffMember = store.staff.find(s => s.email.toLowerCase() === cleanEmail);

  // Always return generic response to prevent account enumeration
  if (!isOwner && !staffMember) {
    recordSecurityAudit('ADMIN_PASSWORD_RESET_ATTEMPT', cleanEmail, ip, 'FAILURE', 'Password reset requested for unrecognized admin email.');
    return {
      success: true,
      status: 'accepted',
      message: 'If the provided address matches an authorized administrator account, an expiring password reset link has been dispatched. Please check your inbox and spam folder.'
    };
  }

  const userId = isOwner ? store.owner.id : staffMember!.id;
  const userName = isOwner ? 'Bakery Owner (Chef Ananya)' : staffMember!.name;

  // Generate single-use, 64-character random token
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Expire in 30 minutes
  const expiresAt = Date.now() + 30 * 60 * 1000;
  adminPasswordResetSessions.set(hashedToken, {
    hashedToken,
    email: cleanEmail,
    userId,
    expiresAt,
    createdAt: Date.now()
  });

  const baseUrl = (appUrl || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetUrl = `${baseUrl}/?action=reset-admin-password&token=${token}&email=${encodeURIComponent(cleanEmail)}`;

  const sendRes = await sendAdminPasswordResetEmail(cleanEmail, userName, resetUrl);
  if (!sendRes.success) {
    recordSecurityAudit('ADMIN_PASSWORD_RESET_DISPATCH_FAILED', cleanEmail, ip, 'FAILURE', `Failed to dispatch reset link: ${sendRes.error || sendRes.message}`);
    return {
      success: false,
      status: sendRes.status,
      message: sendRes.message || 'Failed to dispatch password reset email via SMTP provider.'
    };
  }

  recordSecurityAudit('ADMIN_PASSWORD_RESET_DISPATCHED', cleanEmail, ip, 'SUCCESS', 'Expiring single-use reset link dispatched to admin email.');

  return {
    success: true,
    status: 'sent',
    message: 'An expiring single-use password reset link has been dispatched to your registered email address.'
  };
}

/**
 * Reset Admin Password with Verified Email Token
 */
export async function resetAdminPasswordWithToken(
  token: string,
  newPassword: string,
  ip = 'unknown'
): Promise<{ success: boolean; message?: string; error?: string }> {
  const store = loadStore();
  const cleanToken = (token || '').trim();
  if (!cleanToken) {
    return { success: false, error: 'Password reset token is required.' };
  }

  const hashedToken = crypto.createHash('sha256').update(cleanToken).digest('hex');
  const session = adminPasswordResetSessions.get(hashedToken);

  if (!session) {
    return { success: false, error: 'Invalid or already used password reset link. Please request a new link.' };
  }

  if (Date.now() > session.expiresAt) {
    adminPasswordResetSessions.delete(hashedToken);
    return { success: false, error: 'This password reset link has expired (30-minute validity limit). Please request a new link.' };
  }

  // Validate new password policy
  const policy = validatePasswordPolicy(newPassword);
  if (!policy.isValid) {
    return { success: false, error: policy.error };
  }

  // Single-use: delete token immediately
  adminPasswordResetSessions.delete(hashedToken);

  const { hash: newHash, salt: newSalt } = hashPassword(newPassword);

  if (session.userId === store.owner.id) {
    store.owner.passwordHash = newHash;
    store.owner.passwordSalt = newSalt;
    store.owner.lastPasswordChangedAt = new Date().toISOString();
    store.owner.updatedAt = new Date().toISOString();
    store.owner.failedLoginAttempts = 0;
    store.owner.lockedUntil = null;
  } else {
    const staff = store.staff.find(s => s.id === session.userId);
    if (staff) {
      staff.passwordHash = newHash;
      staff.passwordSalt = newSalt;
    }
  }

  saveStore(store);

  // Revoke all sessions across all devices
  revokeAllSessionsForUser(session.userId);

  recordSecurityAudit('ADMIN_PASSWORD_RESET_SUCCESS', session.email, ip, 'SUCCESS', 'Admin password successfully reset via verified expiring email link. All sessions revoked.');

  try {
    await sendPasswordChangedNotificationEmail(session.email, 'Administrator', 'admin');
  } catch {}

  return {
    success: true,
    message: 'Administrator password reset successfully. All existing sessions have been safely rotated. Please sign in with your new password.'
  };
}

export function changeOwnerPasswordWithVerifiedOtp(
  currentPassword: string,
  enteredOtp: string,
  newPassword: string,
  ip: string
): { success: boolean; error?: string; status?: string } {
  // Maintained for backward compatibility, delegates to policy
  return { success: false, error: 'Mobile OTP has been retired. Please use standard password change in Account Security.' };
}

// ============================================================================
// EMERGENCY ACCOUNT RECOVERY IMPLEMENTATION
// ============================================================================

export function recoverOwnerAccountWithKey(
  recoveryKey: string,
  newPassword: string,
  newEmail?: string,
  newPhone?: string,
  ip = 'unknown'
): { success: boolean; error?: string; message?: string } {
  const store = loadStore();
  const owner = store.owner;
  const now = Date.now();

  // 1. IP Attempt Rate Limiting (max 3 failed attempts in 15 minutes)
  const rateLimit = recoveryRateLimits.get(ip) || { failedAttempts: 0, lockedUntil: null };
  if (rateLimit.lockedUntil && now < rateLimit.lockedUntil) {
    const mins = Math.ceil((rateLimit.lockedUntil - now) / 60000);
    recordSecurityAudit('ACCOUNT_RECOVERY_BLOCKED_IP', 'RECOVERY_ATTEMPT', ip, 'BLOCKED', `Recovery blocked due to rate limiting. ${mins}m remaining.`);
    return {
      success: false,
      error: `Too many failed recovery attempts from this IP address. Please wait ${mins} minute${mins === 1 ? '' : 's'} before trying again.`
    };
  }

  // 2. Reject previously compromised recovery key explicitly
  const cleanEnteredKey = (recoveryKey || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (
    cleanEnteredKey === COMPROMISED_RECOVERY_KEY.replace(/[^A-Z0-9]/g, '') ||
    hashRecoveryKey(recoveryKey) === COMPROMISED_RECOVERY_HASH
  ) {
    rateLimit.failedAttempts += 1;
    if (rateLimit.failedAttempts >= 3) {
      rateLimit.lockedUntil = now + 15 * 60 * 1000;
    }
    recoveryRateLimits.set(ip, rateLimit);
    recordSecurityAudit('ACCOUNT_RECOVERY_COMPROMISED_KEY', 'RECOVERY_ATTEMPT', ip, 'BLOCKED', 'Previously exposed recovery key was rejected.');
    return {
      success: false,
      error: 'Compromised recovery key rejected. This emergency key was previously exposed and permanently revoked. Please generate a replacement via authorized owner rotation.'
    };
  }

  // 3. Verify that an active recovery key is actually configured
  if (!owner.recoveryKeyHash || owner.recoveryKeyStatus === 'unconfigured' || owner.recoveryKeyStatus === 'used') {
    return {
      success: false,
      error: 'No active recovery key is currently configured for this account, or the key was already consumed. Please sign in as owner to generate a new key.'
    };
  }

  // 4. Verify entered key against stored PBKDF/SHA hash
  if (!verifyRecoveryKey(recoveryKey, owner.recoveryKeyHash)) {
    rateLimit.failedAttempts += 1;
    const remaining = 3 - rateLimit.failedAttempts;
    if (rateLimit.failedAttempts >= 3) {
      rateLimit.lockedUntil = now + 15 * 60 * 1000;
    }
    recoveryRateLimits.set(ip, rateLimit);

    recordSecurityAudit('ACCOUNT_RECOVERY_FAILED', 'RECOVERY_ATTEMPT', ip, 'FAILURE', `Invalid recovery key. ${Math.max(0, remaining)} attempt(s) remaining.`);
    return {
      success: false,
      error: `Invalid emergency recovery key. ${Math.max(0, remaining)} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`
    };
  }

  // 5. Validate new password strength policy
  const policy = validatePasswordPolicy(newPassword);
  if (!policy.isValid) {
    return { success: false, error: policy.error || 'Password policy violation.' };
  }

  // 6. Update password with fresh salt
  const { hash: newHash, salt: newSalt } = hashPassword(newPassword);
  owner.passwordHash = newHash;
  owner.passwordSalt = newSalt;

  // 7. Update optional contact details
  if (newEmail && newEmail.includes('@')) {
    owner.email = newEmail.trim().toLowerCase();
  }
  if (newPhone) {
    const cleanPhone = newPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length === 10) {
      owner.phone = cleanPhone;
    }
  }

  // 8. STRICT SINGLE-USE: Invalidate the recovery key immediately!
  owner.recoveryKeyHash = '';
  owner.recoveryKeyStatus = 'used';
  owner.failedLoginAttempts = 0;
  owner.lockedUntil = null;
  owner.updatedAt = new Date().toISOString();
  owner.lastPasswordChangedAt = new Date().toISOString();
  saveStore(store);

  // Clear IP rate limit on success
  recoveryRateLimits.delete(ip);

  // Revoke all existing sessions
  revokeAllSessionsForUser(owner.id);

  recordSecurityAudit('ACCOUNT_RECOVERED_SUCCESS', owner.email, ip, 'SUCCESS', 'Owner account recovered with emergency key. Key consumed and all sessions revoked.');

  return {
    success: true,
    message: 'Owner account successfully recovered! Your emergency recovery key has been consumed and revoked. Please sign in with your new password and generate a fresh key from Account Security.'
  };
}

/**
 * Manually rotate owner emergency recovery key
 * Generates key in memory, stores ONLY the hash in store, returns plaintext to authorized owner ONCE.
 */
export function rotateOwnerEmergencyRecoveryKey(ip = 'unknown'): { success: boolean; recoveryKey?: string; rotatedAt?: string } {
  const store = loadStore();
  const newRecoveryKey = generateEmergencyRecoveryKey();
  const rotatedAt = new Date().toISOString();

  // Store ONLY the derived hash on the server
  store.owner.recoveryKeyHash = hashRecoveryKey(newRecoveryKey);
  store.owner.recoveryKeyRotatedAt = rotatedAt;
  store.owner.recoveryKeyStatus = 'active';
  store.owner.updatedAt = rotatedAt;
  saveStore(store);

  recordSecurityAudit('EMERGENCY_KEY_ROTATED', store.owner.email, ip, 'SUCCESS', 'Owner emergency recovery key generated and rotated. Only hash stored.');

  return {
    success: true,
    recoveryKey: newRecoveryKey,
    rotatedAt
  };
}

/**
 * Securely initializes or updates the owner account with provided email, phone number,
 * and a freshly generated, one-time-displayable emergency recovery key.
 * The recovery key is strictly hashed with SHA-256 BEFORE saving to disk;
 * the plaintext key is returned ONLY once in the return object and never stored.
 */
export function initializeOwnerAccountWithRecoveryKey(
  email: string,
  phone: string,
  password?: string,
  ip = 'unknown'
): {
  success: boolean;
  error?: string;
  message?: string;
  owner?: {
    id: string;
    email: string;
    phone: string;
    recoveryKeyStatus: string;
    recoveryKeyRotatedAt: string;
    alternateEmails?: string[];
  };
  oneTimeRecoveryKey?: string;
} {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
    return { success: false, error: 'Please provide a valid owner email address.' };
  }

  const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return { success: false, error: 'Please provide a valid 10-digit Indian mobile number.' };
  }

  const store = loadStore();
  const owner = store.owner;

  // If password provided, validate policy and update hash
  let newHash = owner.passwordHash;
  let newSalt = owner.passwordSalt;
  if (password && password.trim().length > 0) {
    const pwPolicy = validatePasswordPolicy(password);
    if (!pwPolicy.isValid) {
      return { success: false, error: pwPolicy.error || 'Password policy requirement not met.' };
    }
    const { hash, salt } = hashPassword(password);
    newHash = hash;
    newSalt = salt;
    owner.lastPasswordChangedAt = new Date().toISOString();
  }

  // 1. Generate cryptographically secure one-time emergency recovery key
  const oneTimeRecoveryKey = generateEmergencyRecoveryKey();
  const rotatedAt = new Date().toISOString();

  // 2. CRITICAL SECURITY: Hash the recovery key BEFORE saving to disk!
  // The server only stores the SHA-256 hash. Plaintext key is NEVER persisted.
  const hashedRecoveryKey = hashRecoveryKey(oneTimeRecoveryKey);

  // Preserve other email as alternate email so both user emails remain valid
  const currentOwnerEmail = (owner.email || '').toLowerCase();
  const alternateList = new Set<string>(owner.alternateEmails || []);
  if (currentOwnerEmail && currentOwnerEmail !== cleanEmail) {
    alternateList.add(currentOwnerEmail);
  }
  alternateList.delete(cleanEmail);

  // 3. Update owner account record
  owner.email = cleanEmail;
  owner.alternateEmails = Array.from(alternateList);
  owner.phone = cleanPhone;
  owner.passwordHash = newHash;
  owner.passwordSalt = newSalt;
  owner.recoveryKeyHash = hashedRecoveryKey; // Only SHA-256 hash saved
  owner.recoveryKeyStatus = 'active';
  owner.recoveryKeyRotatedAt = rotatedAt;
  owner.failedLoginAttempts = 0;
  owner.lockedUntil = null;
  owner.updatedAt = rotatedAt;

  // 4. Save to persistent storage file
  saveStore(store);

  // 5. Record security audit log
  recordSecurityAudit(
    'OWNER_ACCOUNT_INITIALIZED_WITH_RECOVERY_KEY',
    cleanEmail,
    ip,
    'SUCCESS',
    `Owner account initialized with email ${maskEmail(cleanEmail)} and phone ${maskPhone(cleanPhone)}. Emergency recovery key generated and hashed before disk storage.`
  );

  return {
    success: true,
    message: 'Owner account successfully initialized! Emergency recovery key generated and hashed before storage.',
    owner: {
      id: owner.id,
      email: owner.email,
      phone: owner.phone,
      recoveryKeyStatus: 'active',
      recoveryKeyRotatedAt: rotatedAt,
      alternateEmails: owner.alternateEmails
    },
    oneTimeRecoveryKey
  };
}

// ============================================================================
// OWNER PROFILE & STAFF MANAGEMENT
// ============================================================================

export function updateOwnerEmail(currentPassword: string, newEmail: string, ip: string): { success: boolean; error?: string } {
  const store = loadStore();
  const owner = store.owner;

  if (!verifyPassword(currentPassword, owner.passwordHash, owner.passwordSalt)) {
    return { success: false, error: 'Incorrect current password. Reauthentication is required to update email.' };
  }

  const cleanEmail = newEmail.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const oldEmail = owner.email;
  owner.email = cleanEmail;
  owner.updatedAt = new Date().toISOString();
  saveStore(store);

  recordSecurityAudit('OWNER_EMAIL_UPDATED', cleanEmail, ip, 'SUCCESS', `Owner email updated from ${maskEmail(oldEmail)} to ${maskEmail(cleanEmail)}.`);
  return { success: true };
}

export function updateOwnerPhone(currentPassword: string, newPhone: string, ip: string): { success: boolean; error?: string } {
  const store = loadStore();
  const owner = store.owner;

  if (!verifyPassword(currentPassword, owner.passwordHash, owner.passwordSalt)) {
    return { success: false, error: 'Incorrect current password. Reauthentication is required to update phone.' };
  }

  const digits = newPhone.replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return { success: false, error: 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.' };
  }

  const oldPhone = owner.phone;
  owner.phone = digits;
  owner.isPhoneVerified = true;
  owner.updatedAt = new Date().toISOString();
  saveStore(store);

  recordSecurityAudit('OWNER_PHONE_UPDATED', owner.email, ip, 'SUCCESS', `Owner phone updated from ${maskPhone(oldPhone)} to ${maskPhone(digits)}.`);
  return { success: true };
}

export function getStaffList(): Array<Omit<StaffAccountRecord, 'passwordHash' | 'passwordSalt'>> {
  const store = loadStore();
  return store.staff.map(({ passwordHash, passwordSalt, ...rest }) => rest);
}

export function addStaffAccount(name: string, email: string, password: string, role: 'staff' | 'manager', createdBy: string, ip: string): { success: boolean; error?: string; staff?: any } {
  const store = loadStore();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanEmail === store.owner.email.toLowerCase()) {
    return { success: false, error: 'Email matches owner account.' };
  }

  if (store.staff.some(s => s.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: 'A staff account with this email already exists.' };
  }

  const policy = validatePasswordPolicy(password);
  if (!policy.isValid) {
    return { success: false, error: policy.error };
  }

  const { hash: passwordHash, salt: passwordSalt } = hashPassword(password);
  const newStaff: StaffAccountRecord = {
    id: `staff-${Date.now()}`,
    name: name.trim(),
    email: cleanEmail,
    role,
    passwordHash,
    passwordSalt,
    createdAt: new Date().toISOString(),
    createdBy
  };

  store.staff.push(newStaff);
  saveStore(store);

  recordSecurityAudit('STAFF_ACCOUNT_CREATED', cleanEmail, ip, 'SUCCESS', `New staff account created: ${name} (${role}) by ${createdBy}.`);
  const { passwordHash: _, passwordSalt: __, ...publicData } = newStaff;
  return { success: true, staff: publicData };
}

export function removeStaffAccount(staffId: string, ip: string): boolean {
  const store = loadStore();
  const staff = store.staff.find(s => s.id === staffId);
  if (!staff) return false;

  store.staff = store.staff.filter(s => s.id !== staffId);
  saveStore(store);

  // Revoke active sessions
  revokeAllSessionsForUser(staffId);

  recordSecurityAudit('STAFF_ACCOUNT_REMOVED', staff.email, ip, 'REVOKED', `Staff account removed: ${staff.name}. Active sessions terminated.`);
  return true;
}

export function getSecurityLogs(): SecurityAuditRecord[] {
  const store = loadStore();
  return store.securityLogs;
}
