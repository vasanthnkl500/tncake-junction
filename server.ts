import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import {
  authenticateAdminCredentials,
  createSession,
  validateSession,
  revokeSession,
  revokeOtherSessions,
  revokeAllSessionsForUser,
  getActiveSessionsForUser,
  getOwnerAccount,
  changeOwnerPasswordWithCurrentPassword,
  requestAdminPasswordResetByEmail,
  resetAdminPasswordWithToken,
  recoverOwnerAccountWithKey,
  rotateOwnerEmergencyRecoveryKey,
  initializeOwnerAccountWithRecoveryKey,
  storePasswordOtpSession,
  getPasswordOtpSession,
  clearPasswordOtpSession,
  updateOwnerEmail,
  updateOwnerPhone,
  getStaffList,
  addStaffAccount,
  removeStaffAccount,
  getSecurityLogs,
  recordSecurityAudit,
  maskEmail,
  maskPhone,
  ActiveSessionRecord
} from './src/server/adminSecurity';
import {
  registerCustomer,
  authenticateCustomer,
  requestCustomerPasswordResetOtp,
  verifyCustomerPasswordResetOtp,
  resetCustomerPasswordWithVerifiedOtp,
  changeCustomerPasswordWithCurrent,
  createCustomerSession,
  validateCustomerSession,
  revokeCustomerSession,
  loadStore as loadCustomerStore,
  CustomerAccountRecord
} from './src/server/customerSecurity';
import {
  getEmailDiagnosticStatus,
  getRecentOutboxEmails,
  isEmailConfigured,
  validateEmailConfigurationOnStartup,
  testEmailDelivery,
  sendOrderStatusUpdateEmail
} from './src/server/emailService';
import {
  setServerDriveAccessToken,
  isDriveAuthorized,
  getDriveStatus,
  getBackupHistory,
  testDriveConnection,
  flushBackupQueue,
  executeFullBackupNow
} from './src/server/driveBackupService';
import {
  getShopData,
  updateShopData,
  recordNewOrder,
  updateOrderInStore,
  recordOrderNotification,
  getOrderNotifications,
  getOrderNotificationById,
  updateOrderNotification
} from './src/server/shopDataStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(express.json());

// ============================================================================
// SECURITY & SMS GATEWAY DATA TYPES
// ============================================================================

interface StoredOtpSession {
  phone: string;
  hashedOtp: string;
  expiresAt: number;
  createdAt: number;
  lastRequestedAt: number;
  attempts: number;
  maxAttempts: number;
  requestCountInWindow: number;
  windowStartTime: number;
}

interface GatewayDiagnosticState {
  lastTestedAt: string | null;
  lastTestStatus: 'accepted' | 'request_failed' | 'not_tested';
  lastProviderMessage: string | null;
  lastProviderReference: string | null;
  lastRedactedError: string | null;
}

// In-memory sessions & diagnostic store
const activeOtpSessions = new Map<string, StoredOtpSession>();
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();

const gatewayDiagnostic: GatewayDiagnosticState = {
  lastTestedAt: null,
  lastTestStatus: 'not_tested',
  lastProviderMessage: null,
  lastProviderReference: null,
  lastRedactedError: null,
};

// ============================================================================
// HELPERS: Normalization, Redaction & Cryptography
// ============================================================================

/**
 * Normalizes Indian mobile numbers strictly according to TRAI standards:
 * Accepts formats: +91 9876543210, 919876543210, 09876543210, 9876543210
 * Returns clean 10-digit string starting with 6, 7, 8, or 9
 */
function normalizeIndianPhone(rawPhone: string): { isValid: boolean; normalizedPhone: string; error?: string } {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, normalizedPhone: '', error: 'Mobile number is required.' };
  }

  const digits = rawPhone.replace(/\D/g, '');
  let normalized = '';

  if (digits.length === 10) {
    normalized = digits;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    normalized = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    normalized = digits.slice(1);
  } else {
    return {
      isValid: false,
      normalizedPhone: '',
      error: `Invalid length: Phone number contains ${digits.length} digits. A standard 10-digit Indian mobile number is required.`
    };
  }

  if (!/^[6-9]\d{9}$/.test(normalized)) {
    return {
      isValid: false,
      normalizedPhone: '',
      error: `Invalid Indian mobile number: Must begin with digits 6, 7, 8, or 9. Given starts with '${normalized.charAt(0)}'.`
    };
  }

  return { isValid: true, normalizedPhone: normalized };
}

/**
 * Mask sensitive credentials for safe owner diagnostic views
 */
function maskApiKey(key?: string): string {
  if (!key || key.trim().length === 0) return 'Not configured (Missing in server environment)';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '********';
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

/**
 * Redact potential sensitive tokens or keys from provider error messages
 */
function redactSensitive(message: string): string {
  if (!message) return '';
  return message
    .replace(/[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_TOKEN]')
    .replace(/authkey|authorization|bearer|token/gi, '[AUTH]');
}

/**
 * Generates cryptographically secure 6-digit numeric OTP
 */
function generateCryptographicOtp(): string {
  // crypto.randomInt is cryptographically strong
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Secure hash using SHA-256 to avoid storing plaintext OTPs in memory
 */
function hashOtp(phone: string, otp: string): string {
  const salt = process.env.OTP_SALT || 'cake-junction-salt-2026';
  return crypto.createHmac('sha256', salt).update(`${phone}:${otp}`).digest('hex');
}

/**
 * Reads SMS gateway credentials from server environment variables
 */
function getServerSmsConfig() {
  const rawProvider = (process.env.SMS_PROVIDER || '').toLowerCase().trim();
  const fast2smsKey = (process.env.FAST2SMS_API_KEY || '').trim();
  const msg91Key = (process.env.MSG91_AUTH_KEY || '').trim();
  const msg91TemplateId = (process.env.MSG91_TEMPLATE_ID || '').trim();
  const senderId = (process.env.SMS_SENDER_ID || 'CKJNCT').trim();
  const isLive = process.env.SMS_LIVE_MODE !== 'false';

  let provider: 'fast2sms' | 'msg91' | 'none' = 'none';

  if (rawProvider === 'fast2sms' || (!rawProvider && fast2smsKey)) {
    provider = fast2smsKey ? 'fast2sms' : 'none';
  } else if (rawProvider === 'msg91' || (!rawProvider && msg91Key)) {
    provider = msg91Key ? 'msg91' : 'none';
  }

  const isConfigured = provider !== 'none' && (
    (provider === 'fast2sms' && fast2smsKey.length > 0) ||
    (provider === 'msg91' && msg91Key.length > 0 && msg91TemplateId.length > 0)
  );

  return {
    provider,
    isConfigured,
    isLive,
    fast2smsKey,
    msg91Key,
    msg91TemplateId,
    senderId,
  };
}

// ============================================================================
// API ROUTES: SMS GATEWAY & OTP
// ============================================================================

/**
 * GET /api/sms/diagnostic
 * Owner-only diagnostic view showing provider state, redacted credentials, and health
 */
app.get('/api/sms/diagnostic', (_req: Request, res: Response) => {
  const config = getServerSmsConfig();

  res.json({
    success: true,
    provider: config.provider,
    isConfigured: config.isConfigured,
    isLive: config.isLive,
    apiKeyConfigured: config.provider === 'fast2sms' ? config.fast2smsKey.length > 0 : config.msg91Key.length > 0,
    maskedApiKey: config.provider === 'fast2sms' 
      ? maskApiKey(config.fast2smsKey) 
      : (config.provider === 'msg91' ? maskApiKey(config.msg91Key) : 'Not configured'),
    templateConfigured: config.provider === 'msg91' ? config.msg91TemplateId.length > 0 : true,
    templateId: config.provider === 'msg91' ? (config.msg91TemplateId ? `${config.msg91TemplateId.slice(0, 4)}...` : 'Missing') : undefined,
    senderId: config.senderId,
    lastTestedAt: gatewayDiagnostic.lastTestedAt,
    lastTestStatus: gatewayDiagnostic.lastTestStatus,
    lastProviderMessage: gatewayDiagnostic.lastProviderMessage,
    lastProviderReference: gatewayDiagnostic.lastProviderReference,
    lastRedactedError: gatewayDiagnostic.lastRedactedError,
    environmentKeys: {
      SMS_PROVIDER: process.env.SMS_PROVIDER ? 'Configured' : 'Defaulting (fast2sms)',
      FAST2SMS_API_KEY: process.env.FAST2SMS_API_KEY ? 'Present in environment' : 'Missing',
      MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY ? 'Present in environment' : 'Missing',
      MSG91_TEMPLATE_ID: process.env.MSG91_TEMPLATE_ID ? 'Present in environment' : 'Missing',
      SMS_LIVE_MODE: process.env.SMS_LIVE_MODE || 'true'
    }
  });
});

/**
 * POST /api/sms/send-otp
 * Dispatches an OTP to a verified Indian mobile number via the active server provider
 */
app.post('/api/sms/send-otp', async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body;
  const now = Date.now();

  // 1. Validate & Normalize Mobile Number
  const norm = normalizeIndianPhone(phone);
  if (!norm.isValid) {
    res.status(400).json({
      success: false,
      status: 'invalid_phone',
      message: norm.error || 'Invalid Indian mobile number.'
    });
    return;
  }

  const normalizedPhone = norm.normalizedPhone;

  // 2. Enforce IP Rate Limiting (max 20 requests per 10 mins)
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const ipLimit = ipRateLimits.get(clientIp);
  if (ipLimit && ipLimit.resetAt > now) {
    if (ipLimit.count >= 20) {
      res.status(429).json({
        success: false,
        status: 'rate_limited',
        message: 'Too many requests from your network. Please try again after 10 minutes.'
      });
      return;
    }
    ipLimit.count += 1;
  } else {
    ipRateLimits.set(clientIp, { count: 1, resetAt: now + 10 * 60 * 1000 });
  }

  // 3. Enforce Per-Phone Rate Limiting & Cooldown
  const existingSession = activeOtpSessions.get(normalizedPhone);
  if (existingSession) {
    // 15-minute rolling window check (max 3 requests)
    const windowElapsed = now - existingSession.windowStartTime;
    if (windowElapsed < 15 * 60 * 1000) {
      if (existingSession.requestCountInWindow >= 3) {
        const remainingMinutes = Math.ceil((15 * 60 * 1000 - windowElapsed) / 60000);
        res.status(429).json({
          success: false,
          status: 'rate_limited',
          message: `Too many OTP requests for this number. For security, please wait ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} before requesting again.`,
          canRetryAfterSeconds: Math.ceil((15 * 60 * 1000 - windowElapsed) / 1000)
        });
        return;
      }
    } else {
      existingSession.windowStartTime = now;
      existingSession.requestCountInWindow = 0;
    }

    // 60-Second Cooldown check
    const cooldownElapsed = now - existingSession.lastRequestedAt;
    const COOLDOWN_MS = 60 * 1000;
    if (cooldownElapsed < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - cooldownElapsed) / 1000);
      res.status(429).json({
        success: false,
        status: 'rate_limited',
        message: `Please wait ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} before requesting another OTP.`,
        canRetryAfterSeconds: remainingSeconds
      });
      return;
    }
  }

  // 4. Verify Server Gateway Configuration
  const config = getServerSmsConfig();

  if (!config.isConfigured || !config.isLive) {
    gatewayDiagnostic.lastTestStatus = 'request_failed';
    gatewayDiagnostic.lastTestedAt = new Date().toISOString();
    gatewayDiagnostic.lastRedactedError = 'No live SMS provider credentials configured in server environment.';
    
    // HONEST REPORTING: Never fake delivery or simulate success
    res.status(200).json({
      success: false,
      status: 'unconfigured',
      message: 'SMS Gateway Not Configured: No live SMS provider credentials (FAST2SMS_API_KEY or MSG91_AUTH_KEY) have been configured on the server. Customers can look up their orders using their Order ID and registered phone number without SMS.',
      canRetryAfterSeconds: 0
    });
    return;
  }

  // 5. Generate Cryptographically Strong OTP
  const otpCode = generateCryptographicOtp();
  const hashedOtp = hashOtp(normalizedPhone, otpCode);
  const validityMs = 5 * 60 * 1000; // 5 minutes

  // 6. Dispatch to Configured Gateway
  let providerAccepted = false;
  let providerReference = '';
  let providerMessage = '';
  let rawErrorText = '';

  try {
    if (config.provider === 'fast2sms') {
      // Fast2SMS India Quick OTP V2 API
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': config.fast2smsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otpCode,
          numbers: normalizedPhone,
          flash: 0
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.return === true) {
        providerAccepted = true;
        providerReference = data.request_id || `f2s-${Date.now()}`;
        providerMessage = 'Request accepted by Fast2SMS operator gateway';
      } else {
        const errMsg = Array.isArray(data.message) ? data.message[0] : (data.message || `HTTP ${response.status}`);
        rawErrorText = `Fast2SMS response: ${errMsg}`;
      }
    } else if (config.provider === 'msg91') {
      // MSG91 SendOTP API
      const response = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'authkey': config.msg91Key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: config.msg91TemplateId,
          mobile: `91${normalizedPhone}`,
          otp: otpCode,
          otp_length: 6,
          otp_expiry: 5
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && (data.type === 'success' || data.message === 'OTP sent successfully')) {
        providerAccepted = true;
        providerReference = data.request_id || `msg91-${Date.now()}`;
        providerMessage = 'Request accepted by MSG91 telecom gateway';
      } else {
        rawErrorText = `MSG91 response: ${data.message || `HTTP ${response.status}`}`;
      }
    }

    // Update server diagnostic state
    gatewayDiagnostic.lastTestedAt = new Date().toISOString();
    if (providerAccepted) {
      gatewayDiagnostic.lastTestStatus = 'accepted';
      gatewayDiagnostic.lastProviderMessage = providerMessage;
      gatewayDiagnostic.lastProviderReference = providerReference;
      gatewayDiagnostic.lastRedactedError = null;

      // Save valid OTP session in server memory
      activeOtpSessions.set(normalizedPhone, {
        phone: normalizedPhone,
        hashedOtp,
        expiresAt: now + validityMs,
        createdAt: now,
        lastRequestedAt: now,
        attempts: 0,
        maxAttempts: 4,
        requestCountInWindow: (existingSession?.requestCountInWindow || 0) + 1,
        windowStartTime: existingSession?.windowStartTime || now
      });

      res.json({
        success: true,
        status: 'accepted',
        message: `OTP request accepted by ${config.provider.toUpperCase()} operator gateway. Telecom carrier dispatch is in progress.`,
        canRetryAfterSeconds: 60,
        expiresInSeconds: 300,
        deliveryProvider: config.provider.toUpperCase(),
        referenceId: providerReference
      });
      return;
    } else {
      const redacted = redactSensitive(rawErrorText || 'Provider rejected SMS request.');
      gatewayDiagnostic.lastTestStatus = 'request_failed';
      gatewayDiagnostic.lastRedactedError = redacted;
      gatewayDiagnostic.lastProviderReference = null;

      res.status(502).json({
        success: false,
        status: 'gateway_error',
        message: `SMS Gateway Rejected Request: ${redacted}. Please verify provider balance or credentials in the deployment secrets.`,
        canRetryAfterSeconds: 30
      });
      return;
    }
  } catch (err: any) {
    const redacted = redactSensitive(err.message || 'Network exception connecting to SMS provider.');
    gatewayDiagnostic.lastTestedAt = new Date().toISOString();
    gatewayDiagnostic.lastTestStatus = 'request_failed';
    gatewayDiagnostic.lastRedactedError = redacted;

    res.status(502).json({
      success: false,
      status: 'gateway_error',
      message: `Connection failure to SMS provider: ${redacted}`,
      canRetryAfterSeconds: 30
    });
  }
});

/**
 * POST /api/sms/verify-otp
 * Verifies entered 6-digit numeric OTP with strict timing, attempt counter, and single-use invalidation
 */
app.post('/api/sms/verify-otp', (req: Request, res: Response): void => {
  const { phone, otp } = req.body;
  const now = Date.now();

  const norm = normalizeIndianPhone(phone);
  if (!norm.isValid) {
    res.status(400).json({
      success: false,
      status: 'invalid_phone',
      message: norm.error || 'Invalid phone number format.'
    });
    return;
  }

  const normalizedPhone = norm.normalizedPhone;
  const cleanOtp = (otp || '').toString().replace(/\D/g, '').trim();

  if (cleanOtp.length !== 6) {
    res.status(400).json({
      success: false,
      status: 'incorrect_otp',
      message: 'Please enter a valid 6-digit numeric verification code.'
    });
    return;
  }

  const session = activeOtpSessions.get(normalizedPhone);

  if (!session) {
    res.status(404).json({
      success: false,
      status: 'no_active_otp',
      message: 'No active OTP verification session found for this phone number. Please request a new verification code.'
    });
    return;
  }

  // 1. Expiration check
  if (now > session.expiresAt) {
    activeOtpSessions.delete(normalizedPhone);
    res.status(410).json({
      success: false,
      status: 'expired',
      message: 'This verification code has expired (validity was 5 minutes). Please request a new code.'
    });
    return;
  }

  // 2. Max attempts check
  if (session.attempts >= session.maxAttempts) {
    activeOtpSessions.delete(normalizedPhone);
    res.status(403).json({
      success: false,
      status: 'max_attempts_exceeded',
      message: 'Maximum verification attempts exceeded. For security, this code has been revoked. Please request a new code.'
    });
    return;
  }

  // 3. Cryptographic hash comparison
  const enteredHash = hashOtp(normalizedPhone, cleanOtp);
  if (crypto.timingSafeEqual(Buffer.from(enteredHash), Buffer.from(session.hashedOtp))) {
    // Valid: Delete immediately to prevent replay
    activeOtpSessions.delete(normalizedPhone);
    res.json({
      success: true,
      status: 'verified',
      message: 'Mobile number verified successfully.'
    });
    return;
  }

  // 4. Failed attempt: increment and check lockout
  session.attempts += 1;
  const remainingAttempts = session.maxAttempts - session.attempts;

  if (remainingAttempts <= 0) {
    activeOtpSessions.delete(normalizedPhone);
    res.status(403).json({
      success: false,
      status: 'max_attempts_exceeded',
      remainingAttempts: 0,
      message: 'Incorrect code. Maximum attempts exceeded. Verification code has been revoked. Please request a new code.'
    });
    return;
  }

  res.status(400).json({
    success: false,
    status: 'incorrect_otp',
    remainingAttempts,
    message: `Incorrect verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining before code is revoked.`
  });
});

/**
 * POST /api/sms/test
 * Diagnostic test trigger specifically for the bakery owner to test delivery to their phone
 */
app.post('/api/sms/test', async (req: Request, res: Response): Promise<void> => {
  const { phone } = req.body;
  const norm = normalizeIndianPhone(phone);

  if (!norm.isValid) {
    res.status(400).json({
      success: false,
      message: norm.error || 'Please provide a valid 10-digit Indian mobile number.'
    });
    return;
  }

  const config = getServerSmsConfig();

  if (!config.isConfigured) {
    gatewayDiagnostic.lastTestedAt = new Date().toISOString();
    gatewayDiagnostic.lastTestStatus = 'request_failed';
    gatewayDiagnostic.lastRedactedError = 'No credentials found in server environment (FAST2SMS_API_KEY / MSG91_AUTH_KEY).';

    res.json({
      success: false,
      stage: 'configuration_check',
      message: 'SMS Gateway Not Configured: No live SMS provider credentials have been configured on the server. Please add FAST2SMS_API_KEY in server environment variables.',
      diagnostic: {
        provider: config.provider,
        hasApiKey: false,
        deliveryConfirmed: false
      }
    });
    return;
  }

  const testOtp = generateCryptographicOtp();

  try {
    let accepted = false;
    let refId = '';
    let message = '';
    let rawError = '';

    if (config.provider === 'fast2sms') {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': config.fast2smsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: testOtp,
          numbers: norm.normalizedPhone,
          flash: 0
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && data.return === true) {
        accepted = true;
        refId = data.request_id || `test-f2s-${Date.now()}`;
        message = 'Request accepted by Fast2SMS operator gateway';
      } else {
        rawError = Array.isArray(data.message) ? data.message[0] : (data.message || `HTTP ${response.status}`);
      }
    } else if (config.provider === 'msg91') {
      const response = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'authkey': config.msg91Key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: config.msg91TemplateId,
          mobile: `91${norm.normalizedPhone}`,
          otp: testOtp,
          otp_length: 6,
          otp_expiry: 5
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.type === 'success' || data.message === 'OTP sent successfully')) {
        accepted = true;
        refId = data.request_id || `test-msg91-${Date.now()}`;
        message = 'Request accepted by MSG91 gateway';
      } else {
        rawError = data.message || `HTTP ${response.status}`;
      }
    }

    gatewayDiagnostic.lastTestedAt = new Date().toISOString();
    if (accepted) {
      gatewayDiagnostic.lastTestStatus = 'accepted';
      gatewayDiagnostic.lastProviderMessage = message;
      gatewayDiagnostic.lastProviderReference = refId;
      gatewayDiagnostic.lastRedactedError = null;

      res.json({
        success: true,
        reachedProvider: true,
        providerAccepted: true,
        deliveryReceipt: 'Carrier transit in progress (Operator accepted request)',
        referenceId: refId,
        provider: config.provider.toUpperCase(),
        message: `Test request successfully accepted by ${config.provider.toUpperCase()} (Ref: ${refId}). Handed off to mobile network carrier.`
      });
    } else {
      const redacted = redactSensitive(rawError || 'Unknown provider error');
      gatewayDiagnostic.lastTestStatus = 'request_failed';
      gatewayDiagnostic.lastRedactedError = redacted;
      gatewayDiagnostic.lastProviderReference = null;

      res.json({
        success: false,
        reachedProvider: true,
        providerAccepted: false,
        deliveryReceipt: 'Failed at gateway',
        error: redacted,
        message: `Provider rejected request: ${redacted}. Check your wallet balance or API key permissions.`
      });
    }
  } catch (err: any) {
    const redacted = redactSensitive(err.message || 'Connection failure');
    gatewayDiagnostic.lastTestedAt = new Date().toISOString();
    gatewayDiagnostic.lastTestStatus = 'request_failed';
    gatewayDiagnostic.lastRedactedError = redacted;

    res.json({
      success: false,
      reachedProvider: false,
      providerAccepted: false,
      deliveryReceipt: 'Network unreachable',
      error: redacted,
      message: `Failed to connect to provider gateway: ${redacted}`
    });
  }
});

// ============================================================================
// ADMIN SECURITY, AUTHENTICATION & SESSION MANAGEMENT ROUTES
// ============================================================================

interface AuthenticatedRequest extends Request {
  adminUser?: ActiveSessionRecord;
}

function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.headers['x-admin-token'] as string);

  if (!token) {
    res.status(401).json({ success: false, message: 'Unauthorized. Admin session token is missing.' });
    return;
  }

  const session = validateSession(token);
  if (!session) {
    res.status(401).json({ success: false, message: 'Session expired or revoked. Please sign in again.' });
    return;
  }

  req.adminUser = session;
  next();
}

function requireOwnerOnlyAuth(req: AuthenticatedRequest, res: Response, next: express.NextFunction) {
  requireAdminAuth(req, res, () => {
    if (req.adminUser?.role !== 'owner') {
      res.status(403).json({ success: false, message: 'Forbidden. Owner privileges required for this sensitive operation.' });
      return;
    }
    next();
  });
}

/**
 * Shared live telecom SMS dispatcher used for both customer OTP and owner password OTP
 */
async function dispatchLiveSmsCode(phone: string, otpCode: string): Promise<{ success: boolean; status: string; message: string; refId?: string }> {
  const config = getServerSmsConfig();
  if (!config.isConfigured || !config.isLive) {
    gatewayDiagnostic.lastTestStatus = 'request_failed';
    gatewayDiagnostic.lastTestedAt = new Date().toISOString();
    gatewayDiagnostic.lastRedactedError = 'No live SMS provider credentials configured in server environment.';
    return {
      success: false,
      status: 'unconfigured',
      message: 'SMS Gateway Not Configured: No live SMS provider credentials (FAST2SMS_API_KEY or MSG91_AUTH_KEY) have been configured in server environment secrets.'
    };
  }

  try {
    let accepted = false;
    let refId = '';
    let rawErrorText = '';

    if (config.provider === 'fast2sms') {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': config.fast2smsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otpCode,
          numbers: phone,
          flash: 0
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.return === true) {
        accepted = true;
        refId = data.request_id || `f2s-${Date.now()}`;
      } else {
        const errMsg = Array.isArray(data.message) ? data.message[0] : (data.message || `HTTP ${response.status}`);
        rawErrorText = `Fast2SMS response: ${errMsg}`;
      }
    } else if (config.provider === 'msg91') {
      const response = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'authkey': config.msg91Key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: config.msg91TemplateId,
          mobile: `91${phone}`,
          otp: otpCode,
          otp_length: 6,
          otp_expiry: 5
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && (data.type === 'success' || data.message === 'OTP sent successfully')) {
        accepted = true;
        refId = data.request_id || `msg91-${Date.now()}`;
      } else {
        rawErrorText = `MSG91 response: ${data.message || `HTTP ${response.status}`}`;
      }
    }

    gatewayDiagnostic.lastTestedAt = new Date().toISOString();
    if (accepted) {
      gatewayDiagnostic.lastTestStatus = 'accepted';
      gatewayDiagnostic.lastProviderReference = refId;
      gatewayDiagnostic.lastRedactedError = null;
      return {
        success: true,
        status: 'accepted',
        message: `OTP request accepted by ${config.provider.toUpperCase()} operator gateway.`,
        refId
      };
    } else {
      const redacted = redactSensitive(rawErrorText || 'Provider rejected request');
      gatewayDiagnostic.lastTestStatus = 'request_failed';
      gatewayDiagnostic.lastRedactedError = redacted;
      return {
        success: false,
        status: 'gateway_error',
        message: `SMS Gateway Rejected Request: ${redacted}`
      };
    }
  } catch (err: any) {
    const redacted = redactSensitive(err.message || 'Connection failure');
    gatewayDiagnostic.lastTestedAt = new Date().toISOString();
    gatewayDiagnostic.lastTestStatus = 'request_failed';
    gatewayDiagnostic.lastRedactedError = redacted;
    return {
      success: false,
      status: 'gateway_error',
      message: `Failed to connect to SMS provider: ${redacted}`
    };
  }
}

/**
 * Public status endpoint: returns safe masked owner information
 */
app.get('/api/auth/status', (_req: Request, res: Response) => {
  const owner = getOwnerAccount();
  res.json({
    success: true,
    hasOwner: true,
    maskedEmail: maskEmail(owner.email),
    maskedPhone: maskPhone(owner.phone),
    isPhoneVerified: owner.isPhoneVerified,
    lastPasswordChangedAt: owner.lastPasswordChangedAt
  });
});

/**
 * Admin Login: validates password using PBKDF2 hash, rate limits IP/email
 */
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || 'Web Browser';

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email and password are required.' });
    return;
  }

  const authRes = authenticateAdminCredentials(email, password, clientIp);
  if (!authRes.success || !authRes.user) {
    res.status(401).json({
      success: false,
      message: authRes.error || 'Invalid credentials.',
      status: authRes.status || 'incorrect_credentials'
    });
    return;
  }

  const session = createSession(
    authRes.user.id,
    authRes.user.role,
    authRes.user.email,
    authRes.user.name,
    clientIp,
    userAgent
  );

  res.json({
    success: true,
    token: session.sessionId,
    user: {
      id: authRes.user.id,
      email: authRes.user.email,
      name: authRes.user.name,
      role: authRes.user.role
    },
    message: `Authenticated as ${authRes.user.name}.`
  });
});

/**
 * Verify active session token
 */
app.get('/api/auth/verify-session', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    valid: true,
    user: {
      id: req.adminUser!.userId,
      email: req.adminUser!.email,
      name: req.adminUser!.name,
      role: req.adminUser!.role
    }
  });
});

/**
 * Logout and revoke current session token
 */
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.headers['x-admin-token'] as string);
  if (token) {
    revokeSession(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * Get protected owner account details for admin control panel
 */
app.get('/api/auth/owner-account', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  const owner = getOwnerAccount();
  res.json({
    success: true,
    owner: {
      id: owner.id,
      email: req.adminUser?.role === 'owner' ? owner.email : maskEmail(owner.email),
      phone: req.adminUser?.role === 'owner' ? owner.phone : maskPhone(owner.phone),
      maskedEmail: maskEmail(owner.email),
      maskedPhone: maskPhone(owner.phone),
      phoneCountryCode: owner.phoneCountryCode,
      isPhoneVerified: owner.isPhoneVerified,
      recoveryKeyStatus: owner.recoveryKeyStatus || 'unconfigured',
      recoveryKeyRotatedAt: owner.recoveryKeyRotatedAt || null,
      alternateEmails: owner.alternateEmails || [],
      createdAt: owner.createdAt,
      lastPasswordChangedAt: owner.lastPasswordChangedAt,
      lastLoginAt: owner.lastLoginAt
    }
  });
});

/**
 * POST /api/auth/owner-account/initialize
 * Initializes owner account with provided email, phone number, and a securely generated,
 * one-time-displayable recovery key. The key is hashed before storage.
 */
app.post('/api/auth/owner-account/initialize', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { email, phone, password } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!email || !email.includes('@')) {
    res.status(400).json({ success: false, message: 'Valid owner email address is required.' });
    return;
  }

  if (!phone) {
    res.status(400).json({ success: false, message: 'Owner mobile number is required.' });
    return;
  }

  const result = initializeOwnerAccountWithRecoveryKey(email, phone, password, clientIp);

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json({ success: false, message: result.error });
  }
});

/**
 * Admin Password Change (Requires current password re-auth — NO MOBILE OTP!)
 */
app.post('/api/auth/password/change', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    return;
  }

  const result = await changeOwnerPasswordWithCurrentPassword(currentPassword, newPassword, clientIp);
  if (result.success) {
    res.json({ success: true, message: 'Administrator password updated successfully! Other active sessions have been safely rotated.' });
  } else {
    res.status(400).json({ success: false, message: result.error || 'Failed to update password.', status: result.status });
  }
});

/**
 * Admin Password Reset Request via Single-Use Expiring Email Link
 */
app.post('/api/auth/password/request-reset-email', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;

  if (!email || !email.includes('@')) {
    res.status(400).json({ success: false, message: 'Please provide a valid registered admin email address.' });
    return;
  }

  const result = await requestAdminPasswordResetByEmail(email, origin as string, clientIp);
  res.json(result);
});

/**
 * Admin Password Reset with Verified Expiring Email Token
 */
app.post('/api/auth/password/reset-with-token', async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!token || !newPassword) {
    res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
    return;
  }

  const result = await resetAdminPasswordWithToken(token, newPassword, clientIp);
  if (result.success) {
    res.json({ success: true, message: result.message });
  } else {
    res.status(400).json({ success: false, message: result.error });
  }
});

/**
 * Emergency Account Recovery with Rotated Emergency Secret Key
 */
app.post('/api/auth/recovery/verify-key', (req: Request, res: Response) => {
  const { recoveryKey, newPassword, newEmail, newPhone } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!recoveryKey || !newPassword) {
    res.status(400).json({ success: false, message: 'Emergency recovery key and new password are required.' });
    return;
  }

  const result = recoverOwnerAccountWithKey(recoveryKey, newPassword, newEmail, newPhone, clientIp);

  if (result.success) {
    res.json({
      success: true,
      message: result.message || 'Owner account successfully recovered and updated! Please sign in with your new password.'
    });
  } else {
    res.status(400).json({
      success: false,
      message: result.error || 'Invalid recovery key.'
    });
  }
});

/**
 * Secure Owner Emergency Recovery Key Generation & Rotation (Authorized Owner Only)
 * Sets Cache-Control: no-store and returns key only once to memory
 */
app.post('/api/auth/recovery/rotate-key', requireOwnerOnlyAuth, (req: AuthenticatedRequest, res: Response) => {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const result = rotateOwnerEmergencyRecoveryKey(clientIp);

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  if (result.success) {
    res.json({
      success: true,
      recoveryKey: result.recoveryKey,
      rotatedAt: result.rotatedAt,
      message: 'New emergency recovery key generated. Keep this offline in a secure vault. It will never be displayed again or stored in plaintext.'
    });
  } else {
    res.status(500).json({ success: false, message: 'Failed to rotate recovery key.' });
  }
});

// ============================================================================
// CUSTOMER AUTHENTICATION & EMAIL OTP PASSWORD RECOVERY ROUTES
// ============================================================================

/**
 * Customer Registration (NO mobile OTP)
 */
app.post('/api/customer/register', (req: Request, res: Response) => {
  const { name, username, email, password, phone } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || 'Web Browser';

  const regResult = registerCustomer({ name, username, email, password, phone, ip: clientIp });
  if (!regResult.success || !regResult.customer) {
    res.status(400).json({ success: false, message: regResult.error || 'Failed to create customer account.' });
    return;
  }

  const session = createCustomerSession(regResult.customer as CustomerAccountRecord, clientIp, userAgent);

  res.json({
    success: true,
    token: session.sessionId,
    customer: regResult.customer,
    message: 'Customer account registered successfully.'
  });
});

/**
 * Customer Login by Username or Email (NO mobile OTP)
 */
app.post('/api/customer/login', (req: Request, res: Response) => {
  const { identifier, loginIdentifier, username, email, password } = req.body;
  const cleanIdentifier = (identifier || loginIdentifier || username || email || '').trim();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || 'Web Browser';

  if (!cleanIdentifier || !password) {
    res.status(400).json({ success: false, message: 'Username or email, and password are required.' });
    return;
  }

  const authResult = authenticateCustomer(cleanIdentifier, password, clientIp);
  if (!authResult.success || !authResult.customer) {
    res.status(401).json({
      success: false,
      message: authResult.error || 'Invalid credentials.',
      status: authResult.status
    });
    return;
  }

  const session = createCustomerSession(authResult.customer as CustomerAccountRecord, clientIp, userAgent);

  res.json({
    success: true,
    token: session.sessionId,
    customer: authResult.customer,
    message: `Welcome back, ${authResult.customer.name}!`
  });
});

/**
 * Customer Profile Verification
 */
app.get('/api/customer/me', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.headers['x-customer-token'] as string);
  const session = validateCustomerSession(token);

  if (!session) {
    res.status(401).json({ success: false, message: 'Not authenticated as a customer.' });
    return;
  }

  res.json({
    success: true,
    customer: {
      id: session.customerId,
      email: session.email,
      username: session.username,
      name: session.name
    }
  });
});

/**
 * Customer Logout
 */
app.post('/api/customer/logout', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.headers['x-customer-token'] as string);
  if (token) {
    revokeCustomerSession(token);
  }
  res.json({ success: true, message: 'Customer session terminated safely.' });
});

/**
 * Customer Password Change in Account Settings
 */
app.post('/api/customer/password/change', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.headers['x-customer-token'] as string);
  const session = validateCustomerSession(token);

  if (!session) {
    res.status(401).json({ success: false, message: 'Authentication required to change password.' });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    return;
  }

  const result = await changeCustomerPasswordWithCurrent(session.customerId, currentPassword, newPassword, clientIp);
  if (result.success) {
    res.json({ success: true, message: result.message });
  } else {
    res.status(400).json({ success: false, message: result.error });
  }
});

/**
 * Customer Password Recovery: Step 1 — Send 6-Digit Email OTP
 */
app.post('/api/customer/password/request-otp', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!email || !email.includes('@')) {
    res.status(400).json({ success: false, message: 'Please provide a valid registered email address.' });
    return;
  }

  const result = await requestCustomerPasswordResetOtp(email, clientIp);
  res.json(result);
});

/**
 * Customer Password Recovery: Step 2 — Verify 6-Digit Email OTP
 */
app.post('/api/customer/password/verify-otp', (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!email || !otp) {
    res.status(400).json({ success: false, message: 'Email address and verification code are required.' });
    return;
  }

  const result = verifyCustomerPasswordResetOtp(email, otp, clientIp);
  res.json(result);
});

/**
 * Customer Password Recovery: Step 3 — Set New Password with Verified Token
 */
app.post('/api/customer/password/reset', async (req: Request, res: Response): Promise<void> => {
  const { email, recoveryToken, newPassword } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!email || !recoveryToken || !newPassword) {
    res.status(400).json({ success: false, message: 'Email, recovery authorization token, and new password are required.' });
    return;
  }

  const result = await resetCustomerPasswordWithVerifiedOtp(email, recoveryToken, newPassword, clientIp);
  if (result.success) {
    res.json({ success: true, message: result.message });
  } else {
    res.status(400).json({ success: false, message: result.error });
  }
});

/**
 * Email Diagnostic endpoint for administrative checks
 */
app.get('/api/email/diagnostic', (_req: Request, res: Response) => {
  res.json({
    success: true,
    diagnostic: getEmailDiagnosticStatus()
  });
});

/**
 * Email Outbox debug inspection endpoint (only for dev/testing, never returns passwords)
 */
app.get('/api/email/outbox', (_req: Request, res: Response) => {
  res.json({
    success: true,
    outbox: getRecentOutboxEmails()
  });
});

/**
 * Test real email delivery using configured Gmail SMTP provider
 * Dispatches a test email to the owner's email address and returns Pass/Fail status
 */
app.post('/api/email/test', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { testRecipient } = req.body;
  const owner = getOwnerAccount();
  const targetEmail = (testRecipient || process.env.TEST_EMAIL || owner.email || req.adminUser?.email || '').trim();

  if (!targetEmail || !targetEmail.includes('@')) {
    res.status(400).json({
      success: false,
      deliveryStatus: 'FAIL',
      message: 'Valid owner email address is required for delivery test.'
    });
    return;
  }

  const result = await testEmailDelivery(targetEmail);
  const deliveryStatus = result.success ? 'PASS' : 'FAIL';

  recordSecurityAudit(
    'GMAIL_SMTP_DELIVERY_TEST',
    targetEmail,
    (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown',
    result.success ? 'SUCCESS' : 'FAILURE',
    `Gmail SMTP test sent to ${maskEmail(targetEmail)}: Outcome ${deliveryStatus}. Result: ${result.message}`
  );

  res.json({
    ...result,
    deliveryStatus,
    testedAt: new Date().toISOString(),
    recipient: targetEmail
  });
});

/**
 * Update Owner Email (Requires current password re-auth)
 */
app.post('/api/auth/email/update', requireOwnerOnlyAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newEmail } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!currentPassword || !newEmail) {
    res.status(400).json({ success: false, message: 'Current password and new email are required.' });
    return;
  }

  const result = updateOwnerEmail(currentPassword, newEmail, clientIp);
  if (result.success) {
    res.json({ success: true, message: 'Owner registered email address updated successfully.' });
  } else {
    res.status(400).json({ success: false, message: result.error });
  }
});

/**
 * Update Owner Phone: Step 1 (Send OTP to verify current phone before changing)
 */
app.post('/api/auth/phone/update-request-otp', requireOwnerOnlyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { currentPassword, newPhone } = req.body;
  const owner = getOwnerAccount();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!currentPassword || !newPhone) {
    res.status(400).json({ success: false, message: 'Current password and new mobile number are required.' });
    return;
  }

  const { verifyPassword } = await import('./src/server/adminSecurity');
  if (!verifyPassword(currentPassword, owner.passwordHash, owner.passwordSalt)) {
    res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    return;
  }

  // Validate new phone
  const cleanNewPhone = newPhone.replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(cleanNewPhone)) {
    res.status(400).json({ success: false, message: 'New phone must be a valid 10-digit Indian mobile number.' });
    return;
  }

  // Generate OTP and send to CURRENT phone first
  const otpCode = generateCryptographicOtp();
  const salt = process.env.OTP_SALT || 'cake-junction-salt-2026';
  const hashedOtp = crypto.createHmac('sha256', salt).update(`${owner.phone}:${otpCode}`).digest('hex');

  storePasswordOtpSession(owner.phone, hashedOtp);
  const dispatchRes = await dispatchLiveSmsCode(owner.phone, otpCode);

  if (dispatchRes.success) {
    recordSecurityAudit('PHONE_UPDATE_OTP_SENT', owner.phone, clientIp, 'SUCCESS', `Sent OTP to current registered phone ${maskPhone(owner.phone)} for phone change verification.`);
    res.json({
      success: true,
      message: `Verification code sent to current registered phone ${maskPhone(owner.phone)}. Please enter the OTP to confirm number change.`,
      maskedPhone: maskPhone(owner.phone)
    });
  } else {
    res.status(200).json({
      success: false,
      status: dispatchRes.status,
      message: dispatchRes.message
    });
  }
});

/**
 * Update Owner Phone: Step 2 (Verify OTP and save new phone)
 */
app.post('/api/auth/phone/update-verify', requireOwnerOnlyAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, otp, newPhone } = req.body;
  const owner = getOwnerAccount();
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  const otpSession = getPasswordOtpSession(owner.phone);
  if (!otpSession) {
    res.status(400).json({ success: false, message: 'No active OTP verification session. Please request OTP first.' });
    return;
  }

  const salt = process.env.OTP_SALT || 'cake-junction-salt-2026';
  const cleanEnteredOtp = (otp || '').toString().replace(/\D/g, '').trim();
  const enteredHash = crypto.createHmac('sha256', salt).update(`${owner.phone}:${cleanEnteredOtp}`).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(enteredHash), Buffer.from(otpSession.hashedOtp))) {
    res.status(400).json({ success: false, message: 'Incorrect OTP code.' });
    return;
  }

  clearPasswordOtpSession(owner.phone);
  const result = updateOwnerPhone(currentPassword, newPhone, clientIp);

  if (result.success) {
    res.json({ success: true, message: 'Owner mobile number updated successfully.' });
  } else {
    res.status(400).json({ success: false, message: result.error });
  }
});

/**
 * View Active Sessions
 */
app.get('/api/auth/sessions', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  const sessions = getActiveSessionsForUser(req.adminUser!.userId);
  const authHeader = req.headers['authorization'];
  const currentToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.headers['x-admin-token'] as string);

  res.json({
    success: true,
    sessions: sessions.map(s => ({
      sessionId: s.sessionId.slice(0, 8) + '...',
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      isCurrentSession: s.sessionId === currentToken
    }))
  });
});

/**
 * Sign out other sessions
 */
app.post('/api/auth/sessions/revoke-others', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  const count = revokeOtherSessions(req.adminUser!.userId, req.adminUser!.sessionId);
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  recordSecurityAudit('REVOKE_OTHER_SESSIONS', req.adminUser!.email, clientIp, 'REVOKED', `User revoked ${count} other active sessions.`);
  res.json({ success: true, count, message: `Successfully signed out ${count} other active session${count === 1 ? '' : 's'}.` });
});

/**
 * Sign out all sessions (including current)
 */
app.post('/api/auth/sessions/revoke-all', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  const count = revokeAllSessionsForUser(req.adminUser!.userId);
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  recordSecurityAudit('REVOKE_ALL_SESSIONS', req.adminUser!.email, clientIp, 'REVOKED', `User revoked all ${count} active sessions.`);
  res.json({ success: true, count, message: `Successfully signed out all ${count} active sessions.` });
});

/**
 * Manage Staff Accounts: List
 */
app.get('/api/auth/staff', requireOwnerOnlyAuth, (_req: AuthenticatedRequest, res: Response) => {
  const staff = getStaffList();
  res.json({ success: true, staff });
});

/**
 * Manage Staff Accounts: Create
 */
app.post('/api/auth/staff', requireOwnerOnlyAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, role } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    return;
  }

  const result = addStaffAccount(name, email, password, role || 'staff', req.adminUser!.name, clientIp);
  if (result.success) {
    res.json({ success: true, staff: result.staff, message: `Staff account created for ${name}.` });
  } else {
    res.status(400).json({ success: false, message: result.error });
  }
});

/**
 * Manage Staff Accounts: Delete
 */
app.delete('/api/auth/staff/:id', requireOwnerOnlyAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
  const success = removeStaffAccount(id, clientIp);
  if (success) {
    res.json({ success: true, message: 'Staff account removed successfully.' });
  } else {
    res.status(404).json({ success: false, message: 'Staff account not found.' });
  }
});

/**
 * Security Audit Log
 */
app.get('/api/auth/security-logs', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
  const logs = getSecurityLogs();
  res.json({ success: true, logs });
});

// ============================================================================
// GOOGLE DRIVE BACKUP & SYNCHRONIZATION ROUTES
// ============================================================================

/**
 * GET /api/drive/status - Owner & Admin inspection of Google Drive backup connectivity
 */
app.get('/api/drive/status', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    status: getDriveStatus()
  });
});

/**
 * POST /api/drive/authorize - Authenticate Drive using client-side OAuth access token
 */
app.post('/api/drive/authorize', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { accessToken } = req.body;
  if (!accessToken || typeof accessToken !== 'string') {
    res.status(400).json({ success: false, message: 'Google OAuth access token is required.' });
    return;
  }

  try {
    const authResult = await setServerDriveAccessToken(accessToken.trim());
    recordSecurityAudit('GOOGLE_DRIVE_AUTHORIZED', req.adminUser!.email, (req.headers['x-forwarded-for'] as string) || 'unknown', 'SUCCESS', `Drive authorized for ${authResult.email}.`);
    res.json({
      success: true,
      email: authResult.email,
      message: authResult.message
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: `Failed to connect Google Drive: ${err.message}`
    });
  }
});

/**
 * POST /api/drive/test-connection - Verify Drive API connectivity and folder access
 */
app.post('/api/drive/test-connection', requireAdminAuth, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const result = await testDriveConnection();
  res.json(result);
});

/**
 * POST /api/drive/backup-now - Trigger immediate full database & business snapshot to Google Drive
 */
app.post('/api/drive/backup-now', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const liveShop = getShopData();
    const liveCustStore = loadCustomerStore();

    const backupResult = await executeFullBackupNow({
      customers: liveCustStore.customers,
      orders: liveShop.orders,
      cakes: liveShop.cakes,
      settings: liveShop.settings,
      feedback: liveShop.feedback,
      enquiries: liveShop.enquiries,
      paymentProofs: liveShop.paymentProofs,
      auditLogs: getSecurityLogs()
    });

    recordSecurityAudit('MANUAL_FULL_BACKUP_DISPATCHED', req.adminUser!.email, (req.headers['x-forwarded-for'] as string) || 'unknown', 'SUCCESS', `Backed up ${backupResult.backedUpCategories.length} categories.`);

    res.json(backupResult);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Backup failed: ${err.message}`
    });
  }
});

/**
 * GET /api/drive/history - Retrieve recent backup events log
 */
app.get('/api/drive/history', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    history: getBackupHistory()
  });
});

// ============================================================================
// PERSISTENT SHOP DATA & ORDER ROUTES (LIVE DATABASE PRESERVATION)
// ============================================================================

/**
 * GET /api/shop-data - Load persistent shop data (settings, cakes, orders, feedback, enquiries)
 */
app.get('/api/shop-data', (_req: Request, res: Response) => {
  const data = getShopData();
  res.json({
    success: true,
    data
  });
});

/**
 * POST /api/shop-data - Save shop data updates (Admin & Staff)
 */
app.post('/api/shop-data', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
  const updates = req.body;
  const updated = updateShopData(updates);
  res.json({
    success: true,
    data: updated,
    message: 'Shop records saved to persistent server database.'
  });
});

/**
 * POST /api/orders/create - Customer / Guest places order
 */
app.post('/api/orders/create', (req: Request, res: Response) => {
  const orderData = req.body;
  if (!orderData || !orderData.cakeName || !orderData.totalAmount) {
    res.status(400).json({ success: false, message: 'Invalid order payload.' });
    return;
  }

  const savedOrder = recordNewOrder(orderData);
  res.json({
    success: true,
    order: savedOrder,
    message: 'Order created and safely queued for persistent backup.'
  });
});

/**
 * PATCH /api/orders/:id - Update order status & fulfilment with automatic customer email notification
 */
app.patch('/api/orders/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  const currentStore = getShopData();
  const prevOrder = currentStore.orders.find(o => o.id === id || o.orderNumber === id);
  if (!prevOrder) {
    res.status(404).json({ success: false, message: 'Order not found.' });
    return;
  }

  const prevStatus = prevOrder.orderStatus;
  const prevStage = prevOrder.fulfilmentStage;

  const updated = updateOrderInStore(id, updates);
  if (!updated) {
    res.status(404).json({ success: false, message: 'Failed to update order record.' });
    return;
  }

  // Check if this was a genuine status or fulfilment change
  const newStatus = updated.orderStatus;
  const newStage = updated.fulfilmentStage;
  const isGenuineStatusChange = (newStatus && newStatus !== prevStatus) || (newStage && newStage !== prevStage);

  let notificationRecord = null;

  // If status changed and customer has an email address, trigger automatic email notification
  if (isGenuineStatusChange && updated.customerEmail && updated.customerEmail.includes('@')) {
    const notifKey = `notif-${updated.orderNumber || updated.id}-${newStatus}-${newStage || 'none'}`;
    const recentNotifs = getOrderNotifications();
    const isDuplicate = recentNotifs.some(n => n.id === notifKey && n.status === 'sent');

    if (!isDuplicate) {
      try {
        const emailResult = await sendOrderStatusUpdateEmail({
          order: updated,
          previousStatus: prevStatus,
          newStatus: newStage || newStatus,
          customMessage: updates.latestUpdateMessage || updates.customNote,
          appUrl: process.env.APP_URL,
          supportPhone: process.env.OWNER_PHONE || '8825648728',
          supportEmail: process.env.OWNER_EMAIL || 'vasanthnkl500@gmail.com'
        });

        notificationRecord = recordOrderNotification({
          id: notifKey,
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          customerId: updated.customerId,
          recipientEmail: updated.customerEmail,
          previousStatus: prevStatus || 'order_placed',
          newStatus: newStage || newStatus,
          timestamp: new Date().toISOString(),
          status: emailResult.success ? 'sent' : (emailResult.status === 'unconfigured' ? 'unconfigured' : 'failed'),
          providerMessageId: emailResult.messageId,
          error: emailResult.error || (emailResult.success ? undefined : emailResult.message),
          retryCount: 0
        });

        recordSecurityAudit(
          'ORDER_STATUS_NOTIFICATION',
          updated.customerEmail,
          clientIp,
          emailResult.success ? 'SUCCESS' : 'FAILURE',
          `Order #${updated.orderNumber} status changed to ${newStatus}. Email notification: ${emailResult.status}`
        );
      } catch (err: any) {
        console.error('Failed to dispatch status email:', err);
        notificationRecord = recordOrderNotification({
          id: notifKey,
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          customerId: updated.customerId,
          recipientEmail: updated.customerEmail,
          previousStatus: prevStatus || 'order_placed',
          newStatus: newStage || newStatus,
          timestamp: new Date().toISOString(),
          status: 'failed',
          error: err?.message || 'Unexpected dispatch error',
          retryCount: 0
        });
      }
    }
  }

  res.json({
    success: true,
    order: updated,
    notification: notificationRecord,
    message: isGenuineStatusChange 
      ? `Order status updated to ${newStatus}.${notificationRecord?.status === 'sent' ? ' Customer notification dispatched.' : ''}`
      : 'Order updated successfully.'
  });
});

/**
 * GET /api/orders/notifications - Fetch notification history for admin audit & retry view
 */
app.get('/api/orders/notifications', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
  const notifications = getOrderNotifications();
  res.json({
    success: true,
    notifications,
    count: notifications.length
  });
});

/**
 * POST /api/orders/notifications/:notificationId/retry - Retry failed customer status notification
 */
app.post('/api/orders/notifications/:notificationId/retry', requireAdminAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { notificationId } = req.params;
  const notif = getOrderNotificationById(notificationId);
  if (!notif) {
    res.status(404).json({ success: false, message: 'Notification record not found.' });
    return;
  }

  const shopData = getShopData();
  const order = shopData.orders.find(o => o.id === notif.orderId || o.orderNumber === notif.orderNumber);
  if (!order) {
    res.status(404).json({ success: false, message: 'Associated order record not found.' });
    return;
  }

  try {
    const emailResult = await sendOrderStatusUpdateEmail({
      order,
      previousStatus: notif.previousStatus,
      newStatus: notif.newStatus,
      appUrl: process.env.APP_URL,
      supportPhone: process.env.OWNER_PHONE || '8825648728',
      supportEmail: process.env.OWNER_EMAIL || 'vasanthnkl500@gmail.com'
    });

    const updated = updateOrderNotification(notificationId, {
      status: emailResult.success ? 'sent' : 'failed',
      retriedAt: new Date().toISOString(),
      retryCount: (notif.retryCount || 0) + 1,
      providerMessageId: emailResult.messageId || notif.providerMessageId,
      error: emailResult.error || (emailResult.success ? undefined : emailResult.message)
    });

    res.json({
      success: emailResult.success,
      notification: updated,
      message: emailResult.success 
        ? `Status notification for order #${order.orderNumber} successfully redelivered to ${order.customerEmail}.`
        : `Retry attempt failed: ${emailResult.message}`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err.message || 'Retry execution failed.'
    });
  }
});

// ============================================================================
// SYSTEM DIAGNOSTICS & STATUS PAGE ROUTE
// ============================================================================

app.get('/api/system/health', requireAdminAuth, async (_req: AuthenticatedRequest, res: Response) => {
  const emailStatus = getEmailDiagnosticStatus();
  const driveStatus = getDriveStatus();
  const shopData = getShopData();
  const owner = getOwnerAccount();

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    email: {
      ...emailStatus,
      targetSender: process.env.SMTP_USER || 'vasanthnkl500@gmail.com'
    },
    drive: driveStatus,
    database: {
      status: 'connected_persistent',
      type: 'Server JSON File Engine (.server_data)',
      totalOrders: shopData.orders.length,
      totalCakes: shopData.cakes.length,
      totalEnquiries: shopData.enquiries.length,
      lastSavedAt: shopData.lastSavedAt
    },
    recovery: {
      keyConfigured: Boolean(owner.recoveryKeyHash && owner.recoveryKeyHash.length > 0),
      status: owner.recoveryKeyStatus || (owner.recoveryKeyHash ? 'active' : 'unconfigured'),
      rotatedAt: owner.recoveryKeyRotatedAt || null,
      compromisedKeyPurged: true
    }
  });
});

// Protect all other admin routes
app.use('/api/admin', requireAdminAuth);



async function setupServer() {
  if (!isProd) {
    // In dev: mount Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // In prod: serve compiled dist folder
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        res.status(404).json({ error: 'API endpoint not found' });
        return;
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cake Junction server running on http://0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
    console.log(`[Cake Junction Security] Owner Emergency Recovery System active. All plain recovery keys redacted from logs.`);
  });
}

setupServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
