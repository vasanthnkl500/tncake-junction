import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  ShieldCheck, 
  KeyRound, 
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  User,
  Loader2,
  Clock,
  RotateCw,
  MessageCircle,
  ShieldAlert,
  Lock,
  Phone
} from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsapp';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAdmin?: boolean;
  onSuccessRedirect?: () => void;
}

type AuthMode = 
  | 'customer_login'
  | 'customer_register'
  | 'customer_forgot_email'
  | 'customer_forgot_otp'
  | 'customer_forgot_new_pw'
  | 'admin_login'
  | 'admin_forgot_email'
  | 'admin_reset_token'
  | 'admin_recovery_key';

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  defaultAdmin = false,
  onSuccessRedirect 
}) => {
  const { 
    loginAsAdmin, 
    loginCustomerAccount,
    registerCustomerAccount,
    requestCustomerPasswordOtp,
    verifyCustomerPasswordOtp,
    resetCustomerPasswordWithOtp,
    requestAdminPasswordResetLink,
    resetAdminPasswordWithToken,
    recoverAccountWithKey,
    navigateTo, 
    settings, 
    trackWhatsAppClick,
    showToast
  } = useApp();

  const [mode, setMode] = useState<AuthMode>(defaultAdmin ? 'admin_login' : 'customer_login');

  // Customer Login Form State
  const [custIdentifier, setCustIdentifier] = useState('');
  const [custPassword, setCustPassword] = useState('');
  const [showCustPassword, setShowCustPassword] = useState(false);

  // Customer Registration State
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Customer Password Recovery (Email OTP) State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [newCustPassword, setNewCustPassword] = useState('');
  const [confirmCustPassword, setConfirmCustPassword] = useState('');
  const [showNewCustPw, setShowNewCustPw] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Admin Auth State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminResetEmail, setAdminResetEmail] = useState('');
  const [adminResetToken, setAdminResetToken] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminNewPw, setShowAdminNewPw] = useState(false);

  // Emergency Recovery Key State
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recNewPassword, setRecNewPassword] = useState('');
  const [recConfirmPassword, setRecConfirmPassword] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isEmailUnconfigured, setIsEmailUnconfigured] = useState(false);

  // Check URL query parameters for reset links on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const action = params.get('action');
      const token = params.get('token');
      const email = params.get('email');

      if (action === 'reset-admin-password' && token) {
        setAdminResetToken(token);
        if (email) setAdminResetEmail(email);
        setMode('admin_reset_token');
      }
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // HANDLERS: Customer Flows (No Mobile OTP)
  // --------------------------------------------------------------------------

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    if (!custIdentifier.trim() || !custPassword) {
      setErrorMsg('Please enter your username or registered email, and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginCustomerAccount(custIdentifier.trim(), custPassword);
      setIsLoading(false);
      if (res.success) {
        onClose();
        if (onSuccessRedirect) onSuccessRedirect();
      } else {
        setErrorMsg(res.message || 'Invalid username/email or password.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Login failed.');
    }
  };

  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    if (!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg('Please fill in all required registration fields.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    if (regPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerCustomerAccount({
        name: regName.trim(),
        username: regUsername.trim().toLowerCase(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim() || undefined,
        password: regPassword
      });
      setIsLoading(false);

      if (res.success) {
        onClose();
        if (onSuccessRedirect) onSuccessRedirect();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Registration failed.');
    }
  };

  const handleCustomerRequestEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);
    setIsEmailUnconfigured(false);

    if (!recoveryEmail.trim() || !recoveryEmail.includes('@')) {
      setErrorMsg('Please enter a valid registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestCustomerPasswordOtp(recoveryEmail.trim());
      setIsLoading(false);

      if (res.status === 'unconfigured') {
        setIsEmailUnconfigured(true);
        setErrorMsg(res.message);
        return;
      }

      if (res.status === 'cooldown' && res.cooldownSeconds) {
        setCooldownSeconds(res.cooldownSeconds);
        setErrorMsg(res.message);
        return;
      }

      if (res.success) {
        setSuccessNotice(res.message);
        setCooldownSeconds(60);
        setMode('customer_forgot_otp');
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to dispatch verification code.');
    }
  };

  const handleCustomerVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    const cleanOtp = recoveryOtp.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit code sent to your email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyCustomerPasswordOtp(recoveryEmail.trim(), cleanOtp);
      setIsLoading(false);

      if (res.success && res.recoveryToken) {
        setRecoveryToken(res.recoveryToken);
        setSuccessNotice('Email verified successfully! Please enter your new password.');
        setMode('customer_forgot_new_pw');
      } else {
        setErrorMsg(res.message);
        if (res.remainingAttempts !== undefined) {
          setAttemptsRemaining(res.remainingAttempts);
        }
        if (res.status === 'max_attempts_exceeded' || res.status === 'expired') {
          setRecoveryOtp('');
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Error verifying code.');
    }
  };

  const handleCustomerResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newCustPassword || !confirmCustPassword) {
      setErrorMsg('Please enter and confirm your new password.');
      return;
    }

    if (newCustPassword !== confirmCustPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    if (newCustPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (!recoveryToken) {
      setErrorMsg('Missing verification session. Please request a new code.');
      setMode('customer_forgot_email');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetCustomerPasswordWithOtp(recoveryEmail.trim(), recoveryToken, newCustPassword);
      setIsLoading(false);

      if (res.success) {
        showToast('Your password has been reset successfully! Please sign in.', 'success');
        setSuccessNotice('Your password has been reset successfully. Please sign in with your new password.');
        setMode('customer_login');
        setCustIdentifier(recoveryEmail);
        setCustPassword('');
        setRecoveryOtp('');
        setRecoveryToken(null);
      } else {
        setErrorMsg(res.error || res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to update password.');
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS: Admin Flows (No Mobile OTP)
  // --------------------------------------------------------------------------

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!adminEmail.trim() || !adminPassword) {
      setErrorMsg('Please enter your registered admin email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginAsAdmin(adminEmail.trim(), adminPassword);
      setIsLoading(false);

      if (res.success) {
        onClose();
        if (onSuccessRedirect) onSuccessRedirect();
      } else {
        setErrorMsg(res.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Error authenticating credentials.');
    }
  };

  const handleAdminRequestResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    if (!adminResetEmail.trim() || !adminResetEmail.includes('@')) {
      setErrorMsg('Please enter a valid administrator email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestAdminPasswordResetLink(adminResetEmail.trim());
      setIsLoading(false);

      if (res.status === 'unconfigured') {
        setIsEmailUnconfigured(true);
        setErrorMsg(res.message);
        return;
      }

      setSuccessNotice(res.message || 'If this email belongs to an authorized administrator, an expiring reset link has been dispatched to your inbox.');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to dispatch reset link.');
    }
  };

  const handleAdminResetWithTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!adminNewPassword || !adminConfirmPassword) {
      setErrorMsg('Please enter and confirm your new administrator password.');
      return;
    }

    if (adminNewPassword !== adminConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (adminNewPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetAdminPasswordWithToken(adminResetToken, adminNewPassword);
      setIsLoading(false);

      if (res.success) {
        showToast('Administrator password reset successfully! Please sign in.', 'success');
        setSuccessNotice('Administrator password reset successfully. Please sign in with your new password.');
        setMode('admin_login');
        setAdminEmail(adminResetEmail);
        setAdminPassword('');
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to update administrator password.');
    }
  };

  const handleEmergencyRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!recoveryKey.trim()) {
      setErrorMsg('Please enter your offline Emergency Recovery Key.');
      return;
    }

    if (recNewPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (recNewPassword !== recConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await recoverAccountWithKey(recoveryKey.trim(), recNewPassword);
      setIsLoading(false);

      if (res.success) {
        showToast('Account recovered successfully! Please sign in.', 'success');
        setSuccessNotice('Owner account successfully recovered and rotated! Please sign in with your new password.');
        setMode('admin_login');
        setRecoveryKey('');
        setRecNewPassword('');
        setRecConfirmPassword('');
      } else {
        setErrorMsg(res.message || 'Invalid emergency recovery key.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Recovery failed.');
    }
  };

  const whatsappHelpUrl = buildWhatsAppLink(
    settings.whatsappNumber,
    `Hello ${settings.shopName}, I need assistance checking my cake order status.`
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div 
        className="relative bg-[#FFF8EF] rounded-3xl max-w-md w-full overflow-hidden border border-[#E8D5C8] shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#4B2E25]/70 hover:text-[#4B2E25] bg-white rounded-full border border-[#E8D5C8] shadow-xs transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Role Selector (Customer vs Owner Admin) */}
        {!mode.startsWith('customer_forgot') && mode !== 'admin_forgot_email' && mode !== 'admin_reset_token' && mode !== 'admin_recovery_key' && (
          <div className="flex bg-white/70 p-1 rounded-2xl border border-[#E8D5C8] mb-6">
            <button
              onClick={() => { setMode('customer_login'); setErrorMsg(null); setSuccessNotice(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode.startsWith('customer')
                  ? 'bg-[#4B2E25] text-white shadow-xs'
                  : 'text-[#4B2E25]/70 hover:text-[#4B2E25]'
              }`}
            >
              Customer Portal
            </button>
            <button
              onClick={() => { setMode('admin_login'); setErrorMsg(null); setSuccessNotice(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'admin_login'
                  ? 'bg-[#4B2E25] text-white shadow-xs'
                  : 'text-[#4B2E25]/70 hover:text-[#4B2E25]'
              }`}
            >
              Owner Administration
            </button>
          </div>
        )}

        {/* Success Banner */}
        {successNotice && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="font-medium">{successNotice}</p>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{errorMsg}</p>
              {isEmailUnconfigured && (
                <p className="text-[11px] text-red-700 mt-1">
                  Server SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) need to be configured in server environment variables to dispatch live emails.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 1: CUSTOMER LOGIN (USERNAME / EMAIL + PASSWORD — NO MOBILE OTP)  */}
        {/* ==================================================================== */}
        {mode === 'customer_login' && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
              Customer Sign In
            </h2>
            <p className="text-xs text-[#4B2E25]/70 mt-1 mb-5">
              Access your order history, receipts, and live baking tracking with your password.
            </p>

            <form onSubmit={handleCustomerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Username or Registered Email *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
                  <input
                    type="text"
                    value={custIdentifier}
                    onChange={(e) => setCustIdentifier(e.target.value)}
                    placeholder="Enter your username or email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:ring-2 focus:ring-[#C5A15A]"
                    required
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('customer_forgot_email'); setErrorMsg(null); setSuccessNotice(null); }}
                    className="text-[11px] text-[#C5A15A] hover:underline font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
                  <input
                    type={showCustPassword ? 'text' : 'password'}
                    value={custPassword}
                    onChange={(e) => setCustPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:ring-2 focus:ring-[#C5A15A]"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCustPassword(!showCustPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4B2E25]/50 hover:text-[#4B2E25]"
                  >
                    {showCustPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#4B2E25] hover:bg-[#38221B] text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Customer Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-[#E8D5C8]/60 text-center">
                <span className="text-xs text-[#4B2E25]/70">Don't have an account yet? </span>
                <button
                  type="button"
                  onClick={() => { setMode('customer_register'); setErrorMsg(null); setSuccessNotice(null); }}
                  className="text-xs font-semibold text-[#4B2E25] hover:text-[#C5A15A] underline"
                >
                  Create Customer Account
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: CUSTOMER REGISTRATION                                        */}
        {/* ==================================================================== */}
        {mode === 'customer_register' && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
              Create Customer Account
            </h2>
            <p className="text-xs text-[#4B2E25]/70 mt-1 mb-4">
              Register with your email and password. No mobile OTP required.
            </p>

            <form onSubmit={handleCustomerRegister} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-0.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Anitha Raman"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-0.5">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                    placeholder="e.g. anitha_r"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-0.5">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="For delivery updates"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-0.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. anitha@example.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-0.5">
                  Password * (Min 8 characters)
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full pl-3.5 pr-9 py-2 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B2E25]/50"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-0.5">
                  Confirm Password *
                </label>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-[#4B2E25] hover:bg-[#38221B] text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" /> : <span>Create Account</span>}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('customer_login'); setErrorMsg(null); }}
                  className="text-xs text-[#4B2E25] hover:text-[#C5A15A] underline"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 3: CUSTOMER FORGOT PASSWORD — STEP A: ENTER REGISTERED EMAIL     */}
        {/* ==================================================================== */}
        {mode === 'customer_forgot_email' && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
              Customer Password Recovery
            </h2>
            <p className="text-xs text-[#4B2E25]/75 mt-1 mb-5 leading-relaxed">
              Enter your registered email address. We will send a secure 6-digit verification code to reset your password. (No mobile SMS required).
            </p>

            <form onSubmit={handleCustomerRequestEmailOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="Enter your account email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#4B2E25] hover:bg-[#38221B] text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" />
                    <span>Sending Verification Code...</span>
                  </>
                ) : (
                  <span>Send Verification Code</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('customer_login'); setErrorMsg(null); }}
                  className="text-xs text-[#4B2E25] hover:text-[#C5A15A] underline"
                >
                  ← Back to Customer Login
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 4: CUSTOMER FORGOT PASSWORD — STEP B: ENTER 6-DIGIT EMAIL OTP   */}
        {/* ==================================================================== */}
        {mode === 'customer_forgot_otp' && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
              Enter Email Verification Code
            </h2>
            <p className="text-xs text-[#4B2E25]/75 mt-1 mb-5 leading-relaxed">
              We sent a 6-digit code to <strong className="text-[#4B2E25]">{recoveryEmail}</strong>. Code expires in <strong>10 minutes</strong>.
            </p>

            <form onSubmit={handleCustomerVerifyEmailOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  6-Digit Verification Code *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={recoveryOtp}
                  onChange={(e) => setRecoveryOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full py-3 text-center text-2xl font-mono font-bold tracking-widest rounded-xl border border-[#E8D5C8] text-[#4B2E25] bg-white"
                  required
                  autoFocus
                />
                {attemptsRemaining !== null && (
                  <p className="mt-1 text-[11px] text-amber-700 text-center">
                    {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining before code is invalidated.
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMode('customer_forgot_email'); setErrorMsg(null); }}
                  className="flex-1 py-2.5 px-3 bg-white border border-[#E8D5C8] text-[#4B2E25] text-xs font-medium rounded-xl hover:bg-[#FFF8EF]"
                >
                  Change Email
                </button>
                <button
                  type="submit"
                  disabled={isLoading || recoveryOtp.length !== 6}
                  className="flex-1 py-2.5 px-3 bg-[#4B2E25] hover:bg-[#38221B] text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" /> : <span>Verify Code</span>}
                </button>
              </div>

              <div className="pt-2 text-center border-t border-[#E8D5C8]/60">
                {cooldownSeconds > 0 ? (
                  <span className="text-[11px] text-[#4B2E25]/65 inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#C5A15A]" />
                    Resend code in <strong className="text-[#4B2E25]">{cooldownSeconds}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleCustomerRequestEmailOtp}
                    disabled={isLoading}
                    className="text-[11px] font-semibold text-[#4B2E25] hover:text-[#C5A15A] inline-flex items-center gap-1 underline"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Didn't receive email? Resend code</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 5: CUSTOMER FORGOT PASSWORD — STEP C: ENTER NEW PASSWORD        */}
        {/* ==================================================================== */}
        {mode === 'customer_forgot_new_pw' && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
              Set New Password
            </h2>
            <p className="text-xs text-[#4B2E25]/70 mt-1 mb-4">
              Enter and confirm your new password for <strong className="text-[#4B2E25]">{recoveryEmail}</strong>.
            </p>

            <form onSubmit={handleCustomerResetPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewCustPw ? 'text' : 'password'}
                    value={newCustPassword}
                    onChange={(e) => setNewCustPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewCustPw(!showNewCustPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4B2E25]/50"
                  >
                    {showNewCustPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={showNewCustPw ? 'text' : 'password'}
                  value={confirmCustPassword}
                  onChange={(e) => setConfirmCustPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-[#4B2E25] hover:bg-[#38221B] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" /> : <span>Reset Password</span>}
              </button>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 6: OWNER ADMIN LOGIN                                            */}
        {/* ==================================================================== */}
        {mode === 'admin_login' && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-[#C5A15A]" />
              <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
                Owner Administration
              </h2>
            </div>
            <p className="text-xs text-[#4B2E25]/70 mb-5">
              Secure authentication for bakery owner and authorized staff to manage orders, cakes, and settings.
            </p>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70">
                    Account Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('admin_forgot_email'); setErrorMsg(null); setSuccessNotice(null); }}
                    className="text-[11px] text-[#C5A15A] hover:underline font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4B2E25]/50"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#4B2E25] hover:bg-[#38221B] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#C5A15A]" />
                    <span>Enter Owner Dashboard</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-[#E8D5C8]/60 text-xs">
                <button
                  type="button"
                  onClick={() => { setMode('admin_recovery_key'); setErrorMsg(null); }}
                  className="text-[11px] text-[#7A5B51] hover:underline"
                >
                  Offline Emergency Recovery Key
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 7: ADMIN FORGOT PASSWORD — DISPATCH EMAIL RESET LINK             */}
        {/* ==================================================================== */}
        {mode === 'admin_forgot_email' && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
              Administrator Password Reset
            </h2>
            <p className="text-xs text-[#4B2E25]/75 mt-1 mb-5 leading-relaxed">
              Enter your registered administrator email address. We will dispatch a single-use, 30-minute expiring reset link to your inbox.
            </p>

            <form onSubmit={handleAdminRequestResetEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Registered Admin Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
                  <input
                    type="email"
                    value={adminResetEmail}
                    onChange={(e) => setAdminResetEmail(e.target.value)}
                    placeholder="e.g. owner@cakejunction.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#8C2F2F] hover:bg-[#722626] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Dispatch Reset Link</span>}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('admin_login'); setErrorMsg(null); }}
                  className="text-xs text-[#4B2E25] hover:text-[#C5A15A] underline"
                >
                  ← Back to Administrator Sign In
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 8: ADMIN RESET PASSWORD VIA TOKEN                                */}
        {/* ==================================================================== */}
        {mode === 'admin_reset_token' && (
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
              Reset Administrator Password
            </h2>
            <p className="text-xs text-[#4B2E25]/70 mt-1 mb-4">
              Choose a strong replacement password for your administrator account.
            </p>

            <form onSubmit={handleAdminResetWithTokenSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  New Admin Password * (Min 8 characters)
                </label>
                <div className="relative">
                  <input
                    type={showAdminNewPw ? 'text' : 'password'}
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    placeholder="Enter new administrator password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminNewPw(!showAdminNewPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4B2E25]/50"
                  >
                    {showAdminNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={showAdminNewPw ? 'text' : 'password'}
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-[#4B2E25] hover:bg-[#38221B] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" /> : <span>Update Administrator Password</span>}
              </button>
            </form>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 9: OFFLINE EMERGENCY RECOVERY KEY                                */}
        {/* ==================================================================== */}
        {mode === 'admin_recovery_key' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-700" />
              <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
                Emergency Account Recovery
              </h2>
            </div>
            <p className="text-xs text-[#4B2E25]/75 leading-relaxed">
              If you forgot your password or cannot access your registered email, enter your server Emergency Recovery Key to restore owner access safely.
            </p>

            <form onSubmit={handleEmergencyRecoverySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Emergency Recovery Secret Key *
                </label>
                <input
                  type="text"
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  placeholder="CJ-XXXX-XXXX-XXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-mono font-bold text-[#4B2E25] bg-white uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={recNewPassword}
                  onChange={(e) => setRecNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={recConfirmPassword}
                  onChange={(e) => setRecConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-rose-800 hover:bg-rose-900 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span>Restore Account Access</span>}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setMode('admin_login'); setErrorMsg(null); }}
                  className="text-xs text-[#4B2E25] hover:text-[#C5A15A] underline"
                >
                  ← Back to Administrator Sign In
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
