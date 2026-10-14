import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  KeyRound, 
  Phone, 
  Mail, 
  Users, 
  Laptop, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  RotateCw, 
  Lock, 
  Eye, 
  EyeOff, 
  UserPlus, 
  Trash2, 
  LogOut, 
  ShieldAlert, 
  HelpCircle,
  Check,
  X,
  Sparkles,
  Send,
  Copy,
  Download,
  AlertTriangle
} from 'lucide-react';
import { validateAndNormalizeIndianPhone, formatLivePhoneInput } from '../utils/phoneAuth';

export const AdminAccountSecurity: React.FC = () => {
  const { 
    currentUser, 
    showToast, 
    changeAdminPassword,
    fetchOwnerAccount,
    updateOwnerEmail,
    updateOwnerPhoneRequestOtp,
    updateOwnerPhoneVerify,
    fetchActiveSessions,
    revokeOtherSessions,
    revokeAllSessions,
    fetchStaffAccounts,
    addStaffAccount,
    removeStaffAccount,
    fetchSecurityAuditLogs,
    recoverAccountWithKey,
    initializeOwnerAccount,
    testOwnerEmailDelivery
  } = useApp();

  const isOwner = currentUser.role === 'owner';

  // Navigation tab within security center
  const [securitySection, setSecuritySection] = useState<
    'initialize' | 'test_email' | 'password' | 'phone' | 'email' | 'staff' | 'sessions' | 'audit' | 'recovery'
  >('initialize');

  // Account details
  const [ownerData, setOwnerData] = useState<{
    email: string;
    phone: string;
    maskedEmail: string;
    maskedPhone: string;
    isPhoneVerified: boolean;
    recoveryKeyStatus?: string;
    recoveryKeyRotatedAt?: string;
    alternateEmails?: string[];
    createdAt?: string;
    lastPasswordChangedAt?: string;
  } | null>(null);

  const [isLoadingAccount, setIsLoadingAccount] = useState(true);

  // Status message
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // --------------------------------------------------------------------------
  // SECTION 1: CHANGE PASSWORD (NO MOBILE OTP)
  // --------------------------------------------------------------------------
  const [pwCurrentPassword, setPwCurrentPassword] = useState('');
  const [pwShowCurrent, setPwShowCurrent] = useState(false);
  const [pwNewPassword, setPwNewPassword] = useState('');
  const [pwConfirmPassword, setPwConfirmPassword] = useState('');
  const [pwShowNew, setPwShowNew] = useState(false);
  const [pwIsSubmitting, setPwIsSubmitting] = useState(false);
  const [pwSuccessMessage, setPwSuccessMessage] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // SECTION 2: UPDATE REGISTERED MOBILE NUMBER
  // --------------------------------------------------------------------------
  const [phoneCurrentPw, setPhoneCurrentPw] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneIsSubmitting, setPhoneIsSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // SECTION 3: UPDATE REGISTERED EMAIL
  // --------------------------------------------------------------------------
  const [emailCurrentPw, setEmailCurrentPw] = useState('');
  const [newEmailAddress, setNewEmailAddress] = useState('');
  const [emailIsSubmitting, setEmailIsSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // SECTION 4: MANAGE AUTHORISED STAFF
  // --------------------------------------------------------------------------
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; email: string; role: string; createdAt: string }>>([]);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'staff' | 'manager'>('staff');
  const [staffIsSubmitting, setStaffIsSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // SECTION 5: ACTIVE SESSIONS
  // --------------------------------------------------------------------------
  const [sessions, setSessions] = useState<Array<{ sessionId: string; ip: string; userAgent: string; createdAt: number; lastActiveAt: number; isCurrentSession: boolean }>>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // --------------------------------------------------------------------------
  // SECTION 6: RECENT SECURITY AUDIT LOGS
  // --------------------------------------------------------------------------
  const [auditRecords, setAuditRecords] = useState<Array<{ id: string; timestamp: string; action: string; userIdentifier: string; ip: string; outcome: string; details: string }>>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // --------------------------------------------------------------------------
  // SECTION 7: EMERGENCY ACCOUNT RECOVERY
  // --------------------------------------------------------------------------
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recNewPassword, setRecNewPassword] = useState('');
  const [recConfirmPassword, setRecConfirmPassword] = useState('');
  const [recNewEmail, setRecNewEmail] = useState('');
  const [recNewPhone, setRecNewPhone] = useState('');
  const [recoveryIsSubmitting, setRecoveryIsSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // SECTION: INITIALIZE OWNER ACCOUNT & ONE-TIME RECOVERY KEY
  // --------------------------------------------------------------------------
  const [initEmail, setInitEmail] = useState('vasanthnkl500@gmail.com');
  const [initPhone, setInitPhone] = useState('8825648728');
  const [initPassword, setInitPassword] = useState('');
  const [initShowPassword, setInitShowPassword] = useState(false);
  const [initIsSubmitting, setInitIsSubmitting] = useState(false);
  const [revealedOneTimeKey, setRevealedOneTimeKey] = useState<string | null>(null);
  const [hasCopiedKey, setHasCopiedKey] = useState(false);

  // --------------------------------------------------------------------------
  // SECTION: GMAIL SMTP DELIVERY TEST (PASS / FAIL)
  // --------------------------------------------------------------------------
  const [testEmailRecipient, setTestEmailRecipient] = useState('vasanthnkl500@gmail.com');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestReport, setEmailTestReport] = useState<{
    deliveryStatus: 'PASS' | 'FAIL';
    message: string;
    testedAt: string;
    recipient: string;
    details?: string;
  } | null>(null);

  // Load account data
  const loadAccountDetails = async () => {
    setIsLoadingAccount(true);
    try {
      const res = await fetchOwnerAccount();
      if (res && res.owner) {
        setOwnerData(res.owner);
        if (res.owner.email) {
          setInitEmail(res.owner.email);
          setTestEmailRecipient(res.owner.email);
        }
        if (res.owner.phone) {
          setInitPhone(res.owner.phone);
        }
      }
    } catch (e) {
      console.error('Failed to load owner account details:', e);
    } finally {
      setIsLoadingAccount(false);
    }
  };

  useEffect(() => {
    loadAccountDetails();
  }, []);


  // Load section-specific data
  useEffect(() => {
    if (securitySection === 'staff' && isOwner) {
      fetchStaffAccounts().then((res: any) => setStaffList(res.staff || []));
    } else if (securitySection === 'sessions') {
      setIsLoadingSessions(true);
      fetchActiveSessions()
        .then((res: any) => setSessions(res.sessions || []))
        .finally(() => setIsLoadingSessions(false));
    } else if (securitySection === 'audit') {
      setIsLoadingLogs(true);
      fetchSecurityAuditLogs()
        .then((res: any) => setAuditRecords(res.logs || []))
        .finally(() => setIsLoadingLogs(false));
    }
  }, [securitySection]);

  // Password Strength validation helper
  const calculatePasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const pwStrength = calculatePasswordStrength(pwNewPassword);

  // --------------------------------------------------------------------------
  // WORKFLOW: SECURE PASSWORD CHANGE (REQUIRES CURRENT PASSWORD — NO MOBILE OTP)
  // --------------------------------------------------------------------------
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setPwSuccessMessage(null);

    if (!pwCurrentPassword) {
      setNotice({ type: 'error', message: 'Please enter your current password to verify authorization.' });
      return;
    }

    if (pwNewPassword.length < 8) {
      setNotice({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }

    if (pwNewPassword !== pwConfirmPassword) {
      setNotice({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    if (pwStrength < 3) {
      setNotice({ type: 'error', message: 'Password is too weak. Please include uppercase, lowercase, numbers, and special characters.' });
      return;
    }

    setPwIsSubmitting(true);
    try {
      const res = await changeAdminPassword(pwCurrentPassword, pwNewPassword);
      setPwIsSubmitting(false);

      if (res.success) {
        setPwSuccessMessage('Administrator password updated successfully! All other active sessions have been safely rotated, and a security confirmation email has been dispatched to your registered address.');
        setPwCurrentPassword('');
        setPwNewPassword('');
        setPwConfirmPassword('');
        showToast('Password updated securely!', 'success');
        loadAccountDetails();
      } else {
        setNotice({ type: 'error', message: res.message || 'Failed to update password.' });
      }
    } catch (err: any) {
      setPwIsSubmitting(false);
      setNotice({ type: 'error', message: err.message || 'Error updating password.' });
    }
  };

  // --------------------------------------------------------------------------
  // WORKFLOW: UPDATE REGISTERED PHONE
  // --------------------------------------------------------------------------
  const handleRequestPhoneUpdateOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const norm = validateAndNormalizeIndianPhone(newPhoneNumber);
    if (!norm.isValid || !norm.normalizedPhone) {
      setNotice({ type: 'error', message: norm.errorMessage || 'Please enter a valid 10-digit Indian mobile number.' });
      return;
    }

    setPhoneIsSubmitting(true);
    try {
      const res = await updateOwnerPhoneRequestOtp(phoneCurrentPw, norm.normalizedPhone);
      setPhoneIsSubmitting(false);

      if (res.success) {
        setPhoneOtpSent(true);
        setNotice({ type: 'success', message: res.message });
      } else {
        setNotice({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setPhoneIsSubmitting(false);
      setNotice({ type: 'error', message: err.message || 'Error requesting phone change.' });
    }
  };

  const handleVerifyPhoneUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const norm = validateAndNormalizeIndianPhone(newPhoneNumber);
    if (!norm.isValid || !norm.normalizedPhone) {
      setNotice({ type: 'error', message: 'Invalid phone format.' });
      return;
    }

    setPhoneIsSubmitting(true);
    try {
      const res = await updateOwnerPhoneVerify(phoneCurrentPw, phoneOtp, norm.normalizedPhone);
      setPhoneIsSubmitting(false);

      if (res.success) {
        setNotice({ type: 'success', message: 'Registered mobile number updated successfully!' });
        showToast('Mobile number updated!', 'success');
        setPhoneCurrentPw('');
        setNewPhoneNumber('');
        setPhoneOtp('');
        setPhoneOtpSent(false);
        loadAccountDetails();
      } else {
        setNotice({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setPhoneIsSubmitting(false);
      setNotice({ type: 'error', message: err.message });
    }
  };

  // --------------------------------------------------------------------------
  // WORKFLOW: UPDATE EMAIL
  // --------------------------------------------------------------------------
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!newEmailAddress || !newEmailAddress.includes('@')) {
      setNotice({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setEmailIsSubmitting(true);
    try {
      const res = await updateOwnerEmail(emailCurrentPw, newEmailAddress);
      setEmailIsSubmitting(false);

      if (res.success) {
        setNotice({ type: 'success', message: 'Owner registered email address updated successfully.' });
        showToast('Email address updated!', 'success');
        setEmailCurrentPw('');
        setNewEmailAddress('');
        loadAccountDetails();
      } else {
        setNotice({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setEmailIsSubmitting(false);
      setNotice({ type: 'error', message: err.message });
    }
  };

  // --------------------------------------------------------------------------
  // WORKFLOW: STAFF MANAGEMENT
  // --------------------------------------------------------------------------
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!newStaffName || !newStaffEmail || !newStaffPassword) {
      setNotice({ type: 'error', message: 'All fields are required.' });
      return;
    }

    setStaffIsSubmitting(true);
    try {
      const res = await addStaffAccount(newStaffName, newStaffEmail, newStaffPassword, newStaffRole);
      setStaffIsSubmitting(false);

      if (res.success) {
        showToast(`Staff account for ${newStaffName} created.`, 'success');
        setNewStaffName('');
        setNewStaffEmail('');
        setNewStaffPassword('');
        setIsAddingStaff(false);
        const updated = await fetchStaffAccounts();
        setStaffList(updated.staff || []);
      } else {
        setNotice({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setStaffIsSubmitting(false);
      setNotice({ type: 'error', message: err.message });
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to revoke access for this staff member? All active sessions will be terminated immediately.')) {
      return;
    }

    try {
      const res = await removeStaffAccount(staffId);
      if (res.success) {
        showToast('Staff account revoked.', 'success');
        setStaffList(prev => prev.filter(s => s.id !== staffId));
      } else {
        setNotice({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  // --------------------------------------------------------------------------
  // WORKFLOW: SESSIONS REVOCATION
  // --------------------------------------------------------------------------
  const handleRevokeOtherSessions = async () => {
    try {
      const res = await revokeOtherSessions();
      if (res.success) {
        showToast(res.message, 'success');
        const updated = await fetchActiveSessions();
        setSessions(updated.sessions || []);
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Signing out all sessions will also log you out on this device. Do you want to proceed?')) {
      return;
    }
    try {
      await revokeAllSessions();
      window.location.reload();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message });
    }
  };

  // --------------------------------------------------------------------------
  // WORKFLOW: EMERGENCY ACCOUNT RECOVERY
  // --------------------------------------------------------------------------
  const handleEmergencyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!recoveryKey.trim()) {
      setNotice({ type: 'error', message: 'Please enter your Emergency Recovery Key.' });
      return;
    }

    if (recNewPassword.length < 8) {
      setNotice({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }

    if (recNewPassword !== recConfirmPassword) {
      setNotice({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setRecoveryIsSubmitting(true);
    try {
      const res = await recoverAccountWithKey(recoveryKey.trim(), recNewPassword, recNewEmail, recNewPhone);
      setRecoveryIsSubmitting(false);

      if (res.success) {
        setNotice({ type: 'success', message: 'Account recovered successfully! The emergency recovery key has been rotated for security.' });
        showToast('Account recovered successfully!', 'success');
        setRecoveryKey('');
        setRecNewPassword('');
        setRecConfirmPassword('');
        setRecNewEmail('');
        setRecNewPhone('');
        loadAccountDetails();
      } else {
        setNotice({ type: 'error', message: res.message || 'Recovery failed.' });
      }
    } catch (err: any) {
      setRecoveryIsSubmitting(false);
      setNotice({ type: 'error', message: err.message });
    }
  };

  // --------------------------------------------------------------------------
  // WORKFLOW: INITIALIZE OWNER ACCOUNT & GENERATE RECOVERY KEY
  // --------------------------------------------------------------------------
  const handleInitializeOwnerAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!initEmail.trim() || !initEmail.includes('@')) {
      setNotice({ type: 'error', message: 'Please provide a valid owner email address.' });
      return;
    }

    const cleanDigits = initPhone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
      setNotice({ type: 'error', message: 'Please provide a valid 10-digit Indian mobile number.' });
      return;
    }

    if (initPassword && initPassword.length < 8) {
      setNotice({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    setInitIsSubmitting(true);
    try {
      const res = await initializeOwnerAccount(initEmail.trim(), initPhone.trim(), initPassword || undefined);
      setInitIsSubmitting(false);

      if (res.success && res.oneTimeRecoveryKey) {
        setRevealedOneTimeKey(res.oneTimeRecoveryKey);
        setHasCopiedKey(false);
        setNotice({
          type: 'success',
          message: 'Owner account successfully initialized! An irreversible SHA-256 hash was saved to the server. Your one-time recovery key is displayed below.'
        });
        showToast('Owner account initialized & emergency recovery key generated!', 'success');
        setInitPassword('');
        await loadAccountDetails();
      } else {
        setNotice({ type: 'error', message: res.message || 'Failed to initialize owner account.' });
      }
    } catch (err: any) {
      setInitIsSubmitting(false);
      setNotice({ type: 'error', message: err.message || 'Network error during initialization.' });
    }
  };

  const handleCopyOneTimeKey = () => {
    if (!revealedOneTimeKey) return;
    navigator.clipboard.writeText(revealedOneTimeKey);
    setHasCopiedKey(true);
    showToast('Emergency Recovery Key copied to clipboard!', 'success');
    setTimeout(() => setHasCopiedKey(false), 3000);
  };

  const handleDownloadOneTimeKeyFile = () => {
    if (!revealedOneTimeKey) return;
    const content = `================================================================================
CAKE JUNCTION — OWNER EMERGENCY RECOVERY SECRET KEY
================================================================================
Generated At: ${new Date().toISOString()}
Owner Email:  ${initEmail || ownerData?.email || 'vasanthnkl500@gmail.com'}
Owner Mobile: ${initPhone || ownerData?.phone || '8825648728'}

EMERGENCY RECOVERY KEY:
${revealedOneTimeKey}

CRITICAL SECURITY NOTICE:
- This key is single-use and only stored as an irreversible SHA-256 hash on the server.
- Store this key offline in a secure password manager or encrypted drive.
- Never share this key with customers or staff.
================================================================================\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cakejunction_emergency_recovery_key_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Emergency recovery key file downloaded!', 'success');
  };

  // --------------------------------------------------------------------------
  // WORKFLOW: GMAIL SMTP DELIVERY TEST (PASS / FAIL)
  // --------------------------------------------------------------------------
  const handleRunEmailDeliveryTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const recipient = (testEmailRecipient.trim() || ownerData?.email || currentUser.email || 'vasanthnkl500@gmail.com').trim();
    setIsTestingEmail(true);
    setNotice(null);

    try {
      const res = await testOwnerEmailDelivery(recipient);
      setIsTestingEmail(false);
      const isPass = res.deliveryStatus === 'PASS' || res.success;

      setEmailTestReport({
        deliveryStatus: isPass ? 'PASS' : 'FAIL',
        message: res.message || (isPass ? 'Test email successfully transmitted through Gmail SMTP gateway.' : 'Delivery test unfulfilled.'),
        testedAt: res.testedAt || new Date().toISOString(),
        recipient,
        details: res.error || (res.messageId ? `Gmail Gateway Message ID: ${res.messageId}` : undefined)
      });

      if (isPass) {
        showToast(`Gmail SMTP Test PASSED: Delivered to ${recipient}`, 'success');
      } else {
        showToast(`Gmail SMTP Test FAILED: ${res.message}`, 'error');
      }
    } catch (err: any) {
      setIsTestingEmail(false);
      setEmailTestReport({
        deliveryStatus: 'FAIL',
        message: err.message || 'Connection failure while triggering SMTP test.',
        testedAt: new Date().toISOString(),
        recipient
      });
      showToast('Delivery test failed.', 'error');
    }
  };

  return (
    <div className="py-6 space-y-8 animate-fade-in">
      
      {/* Overview Banner: Account Details & Security Status */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E8D5C8]/80">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#4B2E25] text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6 text-[#C5A15A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
                  Admin Account & Security Center
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  {currentUser.role === 'owner' ? 'Owner Account' : 'Authorized Staff'}
                </span>
              </div>
              <p className="text-xs text-[#4B2E25]/70 mt-1">
                Manage owner credentials, password policies, authorized kitchen staff, active sessions, and security audit logs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8]/80">
              <span className="text-[10px] uppercase font-bold text-[#4B2E25]/60 block">Registered Email</span>
              <span className="font-mono font-semibold text-[#4B2E25] mt-0.5 block">
                {ownerData?.maskedEmail || 'owner@cakejunction.com'}
              </span>
            </div>
            <div className="p-3 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8]/80">
              <span className="text-[10px] uppercase font-bold text-[#4B2E25]/60 block">Registered Mobile</span>
              <span className="font-mono font-semibold text-[#4B2E25] mt-0.5 block flex items-center gap-1">
                {ownerData?.maskedPhone || '+91 88*** **728'}
                {ownerData?.isPhoneVerified && (
                  <span title="Verified Mobile Number" className="inline-flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Buttons for Security Options */}
        <div className="flex items-center gap-2 overflow-x-auto pt-5 scrollbar-none">
          {[
            { id: 'initialize', label: 'Setup Owner & Recovery Key', icon: Sparkles, ownerOnly: true },
            { id: 'test_email', label: 'Gmail SMTP Test (Pass/Fail)', icon: Send, ownerOnly: true },
            { id: 'password', label: 'Change Password', icon: KeyRound },
            { id: 'email', label: 'Update Email Address', icon: Mail },
            { id: 'recovery', label: 'Emergency Recovery Key', icon: ShieldAlert },
            { id: 'staff', label: 'Authorised Staff', icon: Users, ownerOnly: true },
            { id: 'sessions', label: 'Active Sessions', icon: Laptop },
            { id: 'audit', label: 'Security Activity Log', icon: History }
          ]
            .filter(tab => !tab.ownerOnly || isOwner)
            .map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSecuritySection(tab.id as any);
                    setNotice(null);
                    setPwSuccessMessage(null);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                    securitySection === tab.id
                      ? 'bg-[#4B2E25] text-white shadow-xs'
                      : 'bg-[#FFF8EF] text-[#4B2E25] border border-[#E8D5C8] hover:bg-[#F4D8D8]/30'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Dynamic Alerts Banner */}
      {notice && (
        <div className={`p-4 rounded-2xl text-xs flex items-start gap-3 animate-fade-in ${
          notice.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : notice.type === 'warning'
            ? 'bg-amber-50 border border-amber-200 text-amber-900'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : notice.type === 'warning' ? (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-medium leading-relaxed">{notice.message}</p>
          </div>
          <button onClick={() => setNotice(null)} className="text-current opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 0A: INITIALIZE OWNER ACCOUNT & GENERATE RECOVERY KEY         */}
      {/* ==================================================================== */}
      {securitySection === 'initialize' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Owner Initialization &amp; Vault Key
              </span>
              <h3 className="font-serif text-xl font-bold text-[#4B2E25] mt-0.5">
                Initialize Owner Account &amp; Generate Recovery Key
              </h3>
              <p className="text-xs text-[#4B2E25]/75 mt-1 max-w-2xl leading-relaxed">
                Configure your verified email address, mobile number, and securely generate a one-time-displayable emergency recovery key. The key is cryptographically hashed using SHA-256 before disk storage.
              </p>
            </div>

            <div className="px-3.5 py-2 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs shrink-0">
              <span className="font-bold flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Key Status: {ownerData?.recoveryKeyStatus === 'active' ? 'Active & Hashed' : 'Ready to Initialize'}
              </span>
            </div>
          </div>

          {/* ONE-TIME RECOVERY KEY DISPLAY VAULT BANNER (REVEALED ONCE) */}
          {revealedOneTimeKey && (
            <div className="p-6 bg-gradient-to-br from-[#FFF8EF] to-[#FCEEE2] rounded-3xl border-2 border-[#C5A15A] shadow-md space-y-4 animate-fade-in">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#4B2E25] text-[#C5A15A] flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-bold text-[#4B2E25]">
                      Emergency Recovery Key (One-Time View)
                    </h4>
                    <p className="text-[11px] text-[#4B2E25]/70">
                      Displayed only ONCE right now. Hashed before storage on the server.
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
                  Do Not Lose This Key
                </span>
              </div>

              {/* The Key Display Monospace Box */}
              <div className="p-4 bg-white rounded-2xl border border-[#E8D5C8] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A5B51] block mb-0.5">
                    Offline Emergency Secret Key
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-[#8C2F2F] select-all">
                    {revealedOneTimeKey}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyOneTimeKey}
                    className="px-3.5 py-2 bg-[#4B2E25] hover:bg-[#38221B] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                  >
                    {hasCopiedKey ? <Check className="w-3.5 h-3.5 text-[#C5A15A]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadOneTimeKeyFile}
                    className="px-3.5 py-2 bg-white hover:bg-[#FFF8EF] border border-[#E8D5C8] text-[#4B2E25] text-xs font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-[#C5A15A]" />
                    <span>Download .txt</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Strict Security Policy:</strong> This key has been stored on disk exclusively as an irreversible SHA-256 cryptographic hash. The plaintext string shown above will disappear once you navigate away or dismiss this notice.
                </p>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setRevealedOneTimeKey(null)}
                  className="px-4 py-2 bg-[#4B2E25]/10 hover:bg-[#4B2E25]/20 text-[#4B2E25] text-xs font-semibold rounded-xl transition-colors"
                >
                  I Have Securely Saved This Key (Dismiss)
                </button>
              </div>
            </div>
          )}

          {/* Initialization Form */}
          <form onSubmit={handleInitializeOwnerAccount} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/80 mb-1">
                Owner Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
                <input
                  type="email"
                  value={initEmail}
                  onChange={(e) => setInitEmail(e.target.value)}
                  placeholder="e.g. vasanthnkl500@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                  required
                  disabled={initIsSubmitting}
                />
              </div>
              <span className="text-[10px] text-[#4B2E25]/60 mt-1 block">
                Primary address for receiving security alerts, customer notifications, and password recovery.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/80 mb-1">
                Owner Mobile Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
                <input
                  type="tel"
                  maxLength={14}
                  value={initPhone}
                  onChange={(e) => setInitPhone(formatLivePhoneInput(e.target.value))}
                  placeholder="88256 48728"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-mono font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                  required
                  disabled={initIsSubmitting}
                />
              </div>
              <span className="text-[10px] text-[#4B2E25]/60 mt-1 block">
                Standard 10-digit Indian mobile number for administrative contact.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/80 mb-1">
                Account Password <span className="font-normal text-[#4B2E25]/50">(Optional — leave blank to keep current password)</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
                <input
                  type={initShowPassword ? 'text' : 'password'}
                  value={initPassword}
                  onChange={(e) => setInitPassword(e.target.value)}
                  placeholder="Leave empty or enter new password (min 8 chars)"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                  disabled={initIsSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setInitShowPassword(!initShowPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4B2E25]/50"
                >
                  {initShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={initIsSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-[#4B2E25] hover:bg-[#38221B] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {initIsSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" />
                    <span>Hashing Key &amp; Initializing Account...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#C5A15A]" />
                    <span>Initialize Account &amp; Generate Recovery Key</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 0B: GMAIL SMTP DELIVERY TESTING INTERFACE (PASS / FAIL)      */}
      {/* ==================================================================== */}
      {securitySection === 'test_email' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Live Diagnostic Telemetry
              </span>
              <h3 className="font-serif text-xl font-bold text-[#4B2E25] mt-0.5">
                Gmail SMTP Delivery Testing Interface
              </h3>
              <p className="text-xs text-[#4B2E25]/75 mt-1 max-w-2xl leading-relaxed">
                Dispatches a verification test email using the configured server SMTP transporter (<strong>smtp.gmail.com:587</strong>) directly to the owner's email address and reports immediate <strong>PASS / FAIL</strong> status.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRunEmailDeliveryTest()}
                disabled={isTestingEmail}
                className="px-4 py-2.5 bg-[#4B2E25] hover:bg-[#38221B] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isTestingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A15A]" /> : <Send className="w-3.5 h-3.5 text-[#C5A15A]" />}
                <span>Send Test to Owner</span>
              </button>
            </div>
          </div>

          {/* Config Telemetry Status Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#4B2E25]/60 block">SMTP Host &amp; Port</span>
              <span className="font-mono font-semibold text-[#4B2E25] mt-0.5 block">smtp.gmail.com:587 (TLS)</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#4B2E25]/60 block">Configured Sender</span>
              <span className="font-mono font-semibold text-[#4B2E25] mt-0.5 block">vasanthnkl500@gmail.com</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#4B2E25]/60 block">Target Owner Email</span>
              <span className="font-mono font-semibold text-[#4B2E25] mt-0.5 block">{ownerData?.email || 'vasanthnkl500@gmail.com'}</span>
            </div>
          </div>

          {/* REAL-TIME DELIVERY STATUS BADGE (PASS / FAIL) */}
          {emailTestReport && (
            <div className={`p-6 rounded-3xl border-2 space-y-3 animate-fade-in ${
              emailTestReport.deliveryStatus === 'PASS'
                ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950'
                : 'bg-rose-50/80 border-rose-400 text-rose-950'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    emailTestReport.deliveryStatus === 'PASS' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {emailTestReport.deliveryStatus === 'PASS' ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-widest uppercase ${
                        emailTestReport.deliveryStatus === 'PASS' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                      }`}>
                        DELIVERY STATUS: {emailTestReport.deliveryStatus}
                      </span>
                    </div>
                    <p className="text-xs font-semibold mt-1">
                      {emailTestReport.message}
                    </p>
                  </div>
                </div>

                <span className="text-[11px] opacity-75 font-mono shrink-0">
                  {new Date(emailTestReport.testedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)
                </span>
              </div>

              {emailTestReport.details && (
                <div className="p-3 bg-white/80 rounded-xl border border-current/20 font-mono text-[11px] leading-relaxed break-all">
                  {emailTestReport.details}
                </div>
              )}

              {emailTestReport.deliveryStatus === 'FAIL' && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-xs space-y-1">
                  <span className="font-bold flex items-center gap-1.5 text-amber-900">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-700" /> Resolution Guidance for Gmail SMTP:
                  </span>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Google requires a dedicated <strong>16-character App Password</strong> rather than your standard account password. Generate one at:
                    <br />
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">myaccount.google.com &rarr; Security &rarr; 2-Step Verification &rarr; App Passwords</code>
                    <br />
                    Then add it to your server deployment secrets as <code className="font-mono font-bold">SMTP_PASS</code>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Custom Recipient Test Form */}
          <form onSubmit={handleRunEmailDeliveryTest} className="space-y-3 pt-2 max-w-lg">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/80">
              Or Dispatch Test to Specific Recipient:
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmailRecipient}
                onChange={(e) => setTestEmailRecipient(e.target.value)}
                placeholder="owner@yourdomain.com"
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                required
                disabled={isTestingEmail}
              />
              <button
                type="submit"
                disabled={isTestingEmail || !testEmailRecipient}
                className="px-5 py-2.5 bg-[#4B2E25] hover:bg-[#38221B] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {isTestingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A15A]" /> : <Send className="w-3.5 h-3.5" />}
                <span>Dispatch Test</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 1: SECURE PASSWORD CHANGE (REQUIRES CURRENT PASSWORD)        */}
      {/* ==================================================================== */}
      {securitySection === 'password' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A]">
                Cryptographic Reauthentication
              </span>
              <h3 className="font-serif text-xl font-bold text-[#4B2E25] mt-0.5">
                Change Administrator Password
              </h3>
              <p className="text-xs text-[#4B2E25]/75 mt-1 leading-relaxed">
                Provide your current password to authenticate, then select a strong replacement password. Registered admin email: <strong className="font-mono text-[#4B2E25]">{ownerData?.maskedEmail || 'owner@cakejunction.com'}</strong>.
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs hidden sm:block max-w-xs">
              <span className="font-bold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Session Rotation
              </span>
              <p className="text-[11px] text-amber-800 mt-1 leading-tight">
                Updating your password rotates cryptographic salts, invalidates all other active sessions, and alerts your registered email.
              </p>
            </div>
          </div>

          {pwSuccessMessage ? (
            <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-200 text-emerald-900 text-center space-y-3 animate-fade-in">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-serif text-lg font-bold">Password Successfully Updated</h4>
              <p className="text-xs max-w-md mx-auto leading-relaxed">
                {pwSuccessMessage}
              </p>
              <button
                type="button"
                onClick={() => setPwSuccessMessage(null)}
                className="mt-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-lg">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
                  <input
                    type={pwShowCurrent ? 'text' : 'password'}
                    value={pwCurrentPassword}
                    onChange={(e) => setPwCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                    required
                    disabled={pwIsSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setPwShowCurrent(!pwShowCurrent)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4B2E25]/50 hover:text-[#4B2E25]"
                  >
                    {pwShowCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
                  <input
                    type={pwShowNew ? 'text' : 'password'}
                    value={pwNewPassword}
                    onChange={(e) => setPwNewPassword(e.target.value)}
                    placeholder="Min 8 characters, uppercase, lowercase, numbers, symbol"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                    required
                    disabled={pwIsSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setPwShowNew(!pwShowNew)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4B2E25]/50 hover:text-[#4B2E25]"
                  >
                    {pwShowNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {pwNewPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden flex gap-1">
                      <div className={`h-full flex-1 rounded-full ${pwStrength >= 1 ? 'bg-red-500' : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 rounded-full ${pwStrength >= 2 ? 'bg-amber-500' : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 rounded-full ${pwStrength >= 3 ? 'bg-yellow-500' : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 rounded-full ${pwStrength >= 4 ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 rounded-full ${pwStrength >= 5 ? 'bg-emerald-600' : 'bg-transparent'}`} />
                    </div>
                    <span className="text-[10px] text-[#4B2E25]/70 block font-medium">
                      Strength: {pwStrength < 3 ? 'Weak (needs mixed case, number, symbol)' : pwStrength === 3 ? 'Fair' : pwStrength === 4 ? 'Strong' : 'Very Strong'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={pwShowNew ? 'text' : 'password'}
                  value={pwConfirmPassword}
                  onChange={(e) => setPwConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                  required
                  disabled={pwIsSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={pwIsSubmitting || !pwCurrentPassword || pwNewPassword.length < 8 || pwNewPassword !== pwConfirmPassword}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#4B2E25] hover:bg-[#38221B] text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {pwIsSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" />
                    <span>Verifying & Updating Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-[#C5A15A]" />
                    <span>Update Administrator Password</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 2: UPDATE REGISTERED MOBILE NUMBER (Disabled: Email only) */}
      {/* ==================================================================== */}
      {false && (securitySection as any) === 'phone' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A]">
              Owner Mobile Authentication
            </span>
            <h3 className="font-serif text-xl font-bold text-[#4B2E25] mt-0.5">
              Update Registered Mobile Number
            </h3>
            <p className="text-xs text-[#4B2E25]/75 mt-1 leading-relaxed">
              Current registered phone: <strong className="font-mono text-[#4B2E25]">{ownerData?.maskedPhone || '+91 88*** **728'}</strong>. Updating this number requires password re-authentication and verification on your existing number to prevent unauthorized account takeover.
            </p>
          </div>

          {!phoneOtpSent ? (
            <form onSubmit={handleRequestPhoneUpdateOtp} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Re-enter Current Password *
                </label>
                <input
                  type="password"
                  value={phoneCurrentPw}
                  onChange={(e) => setPhoneCurrentPw(e.target.value)}
                  placeholder="Required for security"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                  required
                  disabled={phoneIsSubmitting}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  New Indian Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4B2E25]/60">+91</span>
                  <input
                    type="tel"
                    maxLength={14}
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(formatLivePhoneInput(e.target.value))}
                    placeholder="88256 48728"
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-mono font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                    required
                    disabled={phoneIsSubmitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={phoneIsSubmitting || !phoneCurrentPw || !newPhoneNumber}
                className="px-6 py-3 bg-[#4B2E25] hover:bg-[#38221B] text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                {phoneIsSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" /> : <Phone className="w-4 h-4 text-[#C5A15A]" />}
                <span>Verify Current Number & Continue</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPhoneUpdate} className="space-y-4 max-w-lg animate-fade-in">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
                A verification code was dispatched to your current phone <strong className="font-mono">{ownerData?.maskedPhone}</strong>. Enter it below to authorize replacing it with <strong className="font-mono">{newPhoneNumber}</strong>.
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Enter 6-Digit Verification Code *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-base text-[#4B2E25] font-mono tracking-widest text-center font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                  required
                  autoFocus
                  disabled={phoneIsSubmitting}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPhoneOtpSent(false)}
                  className="px-4 py-2.5 bg-white border border-[#E8D5C8] text-[#4B2E25] text-xs font-medium rounded-xl hover:bg-[#FFF8EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={phoneIsSubmitting || phoneOtp.length !== 6}
                  className="flex-1 py-2.5 px-4 bg-[#4B2E25] hover:bg-[#38221B] text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {phoneIsSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" /> : <span>Confirm & Update Mobile Number</span>}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 3: UPDATE REGISTERED EMAIL */}
      {/* ==================================================================== */}
      {securitySection === 'email' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A]">
              Owner Credentials
            </span>
            <h3 className="font-serif text-xl font-bold text-[#4B2E25] mt-0.5">
              Update Registered Owner Email
            </h3>
            <p className="text-xs text-[#4B2E25]/75 mt-1 leading-relaxed">
              Current login email: <strong className="font-mono text-[#4B2E25]">{ownerData?.maskedEmail || 'owner@cakejunction.com'}</strong>. This email is strictly private and never exposed to customers.
            </p>
          </div>

          <form onSubmit={handleUpdateEmail} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                Current Password (Reauthentication) *
              </label>
              <input
                type="password"
                value={emailCurrentPw}
                onChange={(e) => setEmailCurrentPw(e.target.value)}
                placeholder="Enter current owner password"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                required
                disabled={emailIsSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                New Owner Email Address *
              </label>
              <input
                type="email"
                value={newEmailAddress}
                onChange={(e) => setNewEmailAddress(e.target.value)}
                placeholder="owner@yourdomain.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                required
                disabled={emailIsSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={emailIsSubmitting || !emailCurrentPw || !newEmailAddress}
              className="px-6 py-3 bg-[#4B2E25] hover:bg-[#38221B] text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {emailIsSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" /> : <Mail className="w-4 h-4 text-[#C5A15A]" />}
              <span>Update Email Address</span>
            </button>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 4: MANAGE AUTHORISED STAFF */}
      {/* ==================================================================== */}
      {securitySection === 'staff' && isOwner && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A]">
                Role-Based Access Control
              </span>
              <h3 className="font-serif text-xl font-bold text-[#4B2E25] mt-0.5">
                Authorised Bakery Staff
              </h3>
              <p className="text-xs text-[#4B2E25]/75 mt-1 leading-relaxed">
                Staff members can manage kitchen orders and preparation timelines, but cannot alter owner passwords, payment details, or access the recovery key.
              </p>
            </div>

            <button
              onClick={() => setIsAddingStaff(!isAddingStaff)}
              className="px-4 py-2 text-xs font-semibold bg-[#4B2E25] hover:bg-[#38221B] text-white rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>{isAddingStaff ? 'Cancel' : 'Add Staff Member'}</span>
            </button>
          </div>

          {/* Add Staff Form Modal / Inline */}
          {isAddingStaff && (
            <form onSubmit={handleCreateStaff} className="p-5 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] space-y-4 animate-fade-in max-w-lg">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4B2E25]">New Staff Credentials</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B2E25]/70 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Ramesh K."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8D5C8] bg-white text-[#4B2E25]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B2E25]/70 mb-1">Staff Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8D5C8] bg-white text-[#4B2E25]"
                  >
                    <option value="staff">Kitchen Operations (Staff)</option>
                    <option value="manager">Assistant Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#4B2E25]/70 mb-1">Staff Login Email *</label>
                <input
                  type="email"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="ramesh.kitchen@cakejunction.com"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8D5C8] bg-white text-[#4B2E25]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#4B2E25]/70 mb-1">Initial Password * (Min 8 chars, 1 uppercase, 1 symbol)</label>
                <input
                  type="password"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  placeholder="Temporary password for staff member"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8D5C8] bg-white text-[#4B2E25]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={staffIsSubmitting}
                className="w-full py-2.5 bg-[#4B2E25] text-white text-xs font-semibold rounded-xl hover:bg-[#38221B] disabled:opacity-50"
              >
                {staffIsSubmitting ? 'Creating Account...' : 'Create Staff Account'}
              </button>
            </form>
          )}

          {/* Staff List Table */}
          {staffList.length === 0 ? (
            <div className="py-8 text-center bg-[#FFF8EF]/50 rounded-2xl border border-dashed border-[#E8D5C8] text-xs text-[#4B2E25]/60">
              No additional staff accounts provisioned yet. Only the bakery owner currently has access.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FFF8EF] border-b border-[#E8D5C8] text-[#4B2E25]/70 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Staff Name</th>
                    <th className="py-2.5 px-3">Login Email</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Created</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D5C8]/50 text-[#4B2E25]">
                  {staffList.map(s => (
                    <tr key={s.id} className="hover:bg-[#FFF8EF]/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold">{s.name}</td>
                      <td className="py-2.5 px-3 font-mono">{s.email}</td>
                      <td className="py-2.5 px-3 capitalize">
                        <span className="px-2 py-0.5 bg-neutral-100 rounded-md text-[10px] font-semibold text-neutral-700">
                          {s.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#4B2E25]/60">
                        {new Date(s.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleRemoveStaff(s.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Revoke access"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 5: ACTIVE SESSIONS */}
      {/* ==================================================================== */}
      {securitySection === 'sessions' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A]">
                Device Access
              </span>
              <h3 className="font-serif text-xl font-bold text-[#4B2E25] mt-0.5">
                Active Administrator Sessions
              </h3>
              <p className="text-xs text-[#4B2E25]/75 mt-1 leading-relaxed">
                Review all active browser sessions logged into the bakery owner control panel. Sign out unrecognized sessions immediately.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRevokeOtherSessions}
                className="px-3.5 py-2 text-xs font-semibold text-[#4B2E25] bg-white border border-[#E8D5C8] hover:bg-[#FFF8EF] rounded-xl transition-colors shadow-2xs"
              >
                Sign Out Other Sessions
              </button>
              <button
                onClick={handleRevokeAllSessions}
                className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors shadow-2xs"
              >
                Sign Out All Sessions
              </button>
            </div>
          </div>

          {isLoadingSessions ? (
            <div className="py-10 text-center text-xs text-[#4B2E25]/60 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" />
              <span>Checking active sessions...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    s.isCurrentSession ? 'bg-emerald-50/70 border-emerald-300' : 'bg-[#FFF8EF] border-[#E8D5C8]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Laptop className="w-5 h-5 text-[#4B2E25] shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#4B2E25]">
                          {s.userAgent}
                        </span>
                        {s.isCurrentSession && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-600 text-white uppercase tracking-wider">
                            Current Device
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#4B2E25]/65 mt-0.5">
                        <span>IP: <strong className="font-mono text-[#4B2E25]">{s.ip}</strong></span>
                        <span>Signed In: {new Date(s.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        <span>Last Active: {new Date(s.lastActiveAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 6: RECENT SECURITY AUDIT LOG */}
      {/* ==================================================================== */}
      {securitySection === 'audit' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A]">
                Immutable Audit Trail
              </span>
              <h3 className="font-serif text-xl font-bold text-[#4B2E25] mt-0.5">
                Recent Security Activity
              </h3>
              <p className="text-xs text-[#4B2E25]/75 mt-1 leading-relaxed">
                Protected audit log recording admin login attempts, password changes, security notifications, and session revocations.
              </p>
            </div>

            <button
              onClick={() => {
                setIsLoadingLogs(true);
                fetchSecurityAuditLogs().then((res: any) => setAuditRecords(res.logs || [])).finally(() => setIsLoadingLogs(false));
              }}
              className="p-2 text-[#4B2E25] hover:bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl transition-colors"
              title="Refresh security log"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {isLoadingLogs ? (
            <div className="py-10 text-center text-xs text-[#4B2E25]/60 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#C5A15A]" />
              <span>Fetching audit entries...</span>
            </div>
          ) : auditRecords.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#4B2E25]/60 bg-[#FFF8EF] rounded-2xl border border-dashed border-[#E8D5C8]">
              No security events recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FFF8EF] border-b border-[#E8D5C8] text-[#4B2E25]/70 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Outcome</th>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">IP</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D5C8]/50 text-[#4B2E25]">
                  {auditRecords.map(r => (
                    <tr key={r.id} className="hover:bg-[#FFF8EF]/40 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-[11px] text-[#4B2E25]/70 font-mono">
                        {new Date(r.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#4B2E25]">{r.action}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          r.outcome === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.outcome === 'BLOCKED'
                            ? 'bg-rose-100 text-rose-800'
                            : r.outcome === 'REVOKED'
                            ? 'bg-neutral-200 text-neutral-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.outcome}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">{r.userIdentifier}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#4B2E25]/60">{r.ip}</td>
                      <td className="py-2.5 px-3 text-[11px] text-[#4B2E25]/80 max-w-xs truncate" title={r.details}>
                        {r.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 7: EMERGENCY ACCOUNT RECOVERY & ROTATION GUIDE */}
      {/* ==================================================================== */}
      {securitySection === 'recovery' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Emergency Procedures
            </span>
            <h3 className="font-serif text-xl font-bold text-[#4B2E25] mt-0.5">
              Emergency Owner Account Recovery &amp; Key Rotation
            </h3>
            <p className="text-xs text-[#4B2E25]/75 mt-1 leading-relaxed">
              If you ever lose access to your registered credentials, use your single-use Emergency Recovery Key below to reset owner access. For maximum security, keys are never stored in plaintext on disk or in Google Drive.
            </p>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-2">
            <span className="font-bold flex items-center gap-1.5 text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-700" /> Hardened Credential Policy
            </span>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90 leading-relaxed">
              <li>Any previously logged or exposed recovery keys have been permanently revoked and blacklisted.</li>
              <li>Only cryptographically secure SHA-256 hashes are preserved on the server.</li>
              <li>Emergency recovery keys are <strong>strictly single-use</strong> and invalidated immediately upon successful account recovery.</li>
              <li>To rotate or generate a fresh key, visit the <strong>System Health &amp; Status</strong> tab or use the rotation action.</li>
            </ul>
          </div>

          <form onSubmit={handleEmergencyRecovery} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                Emergency Recovery Key *
              </label>
              <input
                type="text"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value.toUpperCase())}
                placeholder="CJ-XXXX-XXXX-XXXX"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-mono font-bold tracking-wider text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                required
                disabled={recoveryIsSubmitting}
              />
              <span className="text-[10px] text-[#4B2E25]/60 mt-1 block">
                Single-use secret key from your offline vault (CJ-XXXX-XXXX-XXXX)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={recNewPassword}
                  onChange={(e) => setRecNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                  required
                  disabled={recoveryIsSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={recConfirmPassword}
                  onChange={(e) => setRecConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                  required
                  disabled={recoveryIsSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Optional New Owner Email
                </label>
                <input
                  type="email"
                  value={recNewEmail}
                  onChange={(e) => setRecNewEmail(e.target.value)}
                  placeholder="owner@yourdomain.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-medium text-[#4B2E25] bg-white"
                  disabled={recoveryIsSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Optional New Mobile Number
                </label>
                <input
                  type="tel"
                  maxLength={14}
                  value={recNewPhone}
                  onChange={(e) => setRecNewPhone(formatLivePhoneInput(e.target.value))}
                  placeholder="88256 48728"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-mono text-[#4B2E25] bg-white"
                  disabled={recoveryIsSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={recoveryIsSubmitting || !recoveryKey || !recNewPassword || recNewPassword !== recConfirmPassword}
              className="w-full py-3.5 px-6 bg-rose-800 hover:bg-rose-900 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {recoveryIsSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Recovery Key & Resetting...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Recover Account & Rotate Key</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
