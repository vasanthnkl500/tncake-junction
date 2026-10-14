/**
 * Production-Grade SMS OTP Gateway Service for Cake Junction
 * Communicates with secure server-side proxy routes (/api/sms/*)
 * 
 * Key Principles:
 * - Credentials (FAST2SMS_API_KEY, MSG91_AUTH_KEY) reside exclusively on backend
 * - Real telecom dispatch with Fast2SMS (Indian Quick OTP) & MSG91 (DLT compliant)
 * - Zero fake delivery states: "Accepted" means telecom gateway accepted the dispatch
 * - Honest unconfigured reporting when secrets are not yet configured in environment
 * - Strict 60s cooldown, 5m cryptographic expiration, max 4 attempts lockout
 * - Preserves secure Order ID + registered phone fallback lookup
 */

import { SmsGatewayConfig, OtpRequestResult, OtpVerifyResult, SmsGatewayDiagnostic, SmsTestResult } from '../types';
import { validateAndNormalizeIndianPhone } from '../utils/phoneAuth';

interface ClientOtpSessionMeta {
  normalizedPhone: string;
  expiresAt: number;
  lastRequestedAt: number;
  cooldownUntil: number;
  attemptsRemaining: number;
}

const CLIENT_STORAGE_KEY = 'cj_otp_session_meta';

function loadClientMeta(): Record<string, ClientOtpSessionMeta> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(CLIENT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveClientMeta(meta: Record<string, ClientOtpSessionMeta>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // Ignore quota errors
  }
}

/**
 * Dispatches an OTP request through the backend SMS proxy
 */
export async function dispatchOtpRequest(
  rawPhone: string,
  _legacyConfig?: SmsGatewayConfig
): Promise<OtpRequestResult> {
  const validation = validateAndNormalizeIndianPhone(rawPhone);

  if (!validation.isValid || !validation.normalizedPhone) {
    return {
      success: false,
      status: 'invalid_phone',
      message: validation.errorMessage || 'Please enter a valid 10-digit Indian mobile number.'
    };
  }

  const normalizedPhone = validation.normalizedPhone;
  const now = Date.now();

  try {
    const response = await fetch('/api/sms/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: normalizedPhone
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      // Save client metadata for countdown displays
      const meta = loadClientMeta();
      meta[normalizedPhone] = {
        normalizedPhone,
        expiresAt: now + (data.expiresInSeconds || 300) * 1000,
        lastRequestedAt: now,
        cooldownUntil: now + (data.canRetryAfterSeconds || 60) * 1000,
        attemptsRemaining: 4
      };
      saveClientMeta(meta);

      return {
        success: true,
        status: 'accepted',
        message: data.message || `OTP dispatch accepted by ${data.deliveryProvider || 'operator'} gateway. Operator carrier dispatch in progress.`,
        canRetryAfterSeconds: data.canRetryAfterSeconds || 60,
        expiresInSeconds: data.expiresInSeconds || 300,
        deliveryProvider: data.deliveryProvider,
        referenceId: data.referenceId
      };
    } else {
      // Gateway error, unconfigured, or rate-limited
      const status = data.status || (response.status === 429 ? 'rate_limited' : 'gateway_error');
      
      // Update cooldown if provided
      if (data.canRetryAfterSeconds) {
        const meta = loadClientMeta();
        if (meta[normalizedPhone]) {
          meta[normalizedPhone].cooldownUntil = now + data.canRetryAfterSeconds * 1000;
          saveClientMeta(meta);
        }
      }

      return {
        success: false,
        status,
        message: data.message || 'Unable to dispatch OTP. Please check provider configuration.',
        canRetryAfterSeconds: data.canRetryAfterSeconds || 0
      };
    }
  } catch (err: any) {
    return {
      success: false,
      status: 'gateway_error',
      message: `Unable to connect to SMS service: ${err.message || 'Network error'}. Please try again shortly.`,
      canRetryAfterSeconds: 15
    };
  }
}

/**
 * Securely verifies an entered OTP code against the backend session
 */
export async function verifyOtpCode(
  rawPhone: string,
  enteredOtp: string
): Promise<OtpVerifyResult> {
  const validation = validateAndNormalizeIndianPhone(rawPhone);
  if (!validation.isValid || !validation.normalizedPhone) {
    return {
      success: false,
      status: 'no_active_otp',
      message: 'Invalid phone number format.'
    };
  }

  const normalizedPhone = validation.normalizedPhone;
  const cleanEnteredOtp = (enteredOtp || '').replace(/\D/g, '').trim();

  if (cleanEnteredOtp.length !== 6) {
    return {
      success: false,
      status: 'incorrect_otp',
      message: 'Please enter a valid 6-digit numeric verification code.'
    };
  }

  try {
    const response = await fetch('/api/sms/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        otp: cleanEnteredOtp
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      // Clean up client session meta
      const meta = loadClientMeta();
      delete meta[normalizedPhone];
      saveClientMeta(meta);

      return {
        success: true,
        status: 'verified',
        message: data.message || 'Mobile number verified successfully.'
      };
    } else {
      const status = data.status || 'incorrect_otp';
      const remainingAttempts = data.remainingAttempts ?? undefined;

      const meta = loadClientMeta();
      if (meta[normalizedPhone] && remainingAttempts !== undefined) {
        meta[normalizedPhone].attemptsRemaining = remainingAttempts;
        saveClientMeta(meta);
      }

      return {
        success: false,
        status,
        remainingAttempts,
        message: data.message || 'Incorrect verification code. Please check and try again.'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      status: 'no_active_otp',
      message: `Failed to verify code: ${err.message || 'Connection error'}`
    };
  }
}

/**
 * Fetches the live server-side gateway diagnostic state
 */
export async function fetchSmsGatewayDiagnostic(): Promise<SmsGatewayDiagnostic> {
  try {
    const response = await fetch('/api/sms/diagnostic');
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.error('Failed to fetch SMS diagnostic:', err);
  }

  // Fallback defaults if server cannot be reached
  return {
    provider: 'none',
    isConfigured: false,
    isLive: false,
    apiKeyConfigured: false,
    maskedApiKey: 'Not configured (Server offline or missing)',
    templateConfigured: false,
    lastTestedAt: null,
    lastTestStatus: 'not_tested',
    lastProviderMessage: null,
    lastProviderReference: null,
    lastRedactedError: 'Unable to communicate with /api/sms/diagnostic endpoint',
    environmentKeys: {
      FAST2SMS_API_KEY: 'Missing',
      MSG91_AUTH_KEY: 'Missing'
    }
  };
}

/**
 * Triggers a live owner test dispatch from the diagnostic console
 */
export async function testOwnerSmsDispatch(phone: string): Promise<SmsTestResult> {
  try {
    const response = await fetch('/api/sms/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone })
    });

    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      reachedProvider: false,
      providerAccepted: false,
      deliveryReceipt: 'Network Error',
      error: err.message,
      message: `Failed to execute live test: ${err.message}`
    };
  }
}

/**
 * Helper to get active session details (cooldown and expiry) for UI countdowns
 */
export function getActiveOtpSessionInfo(rawPhone: string): {
  hasActiveSession: boolean;
  cooldownRemainingSeconds: number;
  expiryRemainingSeconds: number;
  attemptsRemaining: number;
} {
  const validation = validateAndNormalizeIndianPhone(rawPhone);
  if (!validation.isValid || !validation.normalizedPhone) {
    return { hasActiveSession: false, cooldownRemainingSeconds: 0, expiryRemainingSeconds: 0, attemptsRemaining: 4 };
  }

  const meta = loadClientMeta();
  const session = meta[validation.normalizedPhone];
  if (!session) {
    return { hasActiveSession: false, cooldownRemainingSeconds: 0, expiryRemainingSeconds: 0, attemptsRemaining: 4 };
  }

  const now = Date.now();
  const cooldownRemaining = Math.max(0, Math.ceil((session.cooldownUntil - now) / 1000));
  const expiryRemaining = Math.max(0, Math.ceil((session.expiresAt - now) / 1000));
  const attemptsRemaining = Math.max(0, session.attemptsRemaining ?? 4);

  return {
    hasActiveSession: expiryRemaining > 0,
    cooldownRemainingSeconds: cooldownRemaining,
    expiryRemainingSeconds: expiryRemaining,
    attemptsRemaining
  };
}
