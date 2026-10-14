import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  Mail, 
  Cloud, 
  Database, 
  KeyRound, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Loader2, 
  Copy, 
  Download, 
  Check, 
  Clock, 
  Server, 
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react';

export const AdminSystemHealth: React.FC = () => {
  const { authToken, showToast } = useApp();

  const [healthData, setHealthData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Test email state
  const [testEmailAddress, setTestEmailAddress] = useState('vasanthnkl500@gmail.com');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string; status?: string } | null>(null);

  // Recovery Key rotation modal state
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [generatedSecretKey, setGeneratedSecretKey] = useState<string | null>(null);
  const [hasCopiedSecret, setHasCopiedSecret] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const fetchHealth = async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/system/health', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHealthData(data);
      }
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [authToken]);

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      showToast('Please enter a valid test recipient email address.', 'error');
      return;
    }

    setIsSendingTestEmail(true);
    setEmailTestResult(null);

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ testRecipient: testEmailAddress })
      });
      const data = await res.json();
      setEmailTestResult(data);

      if (data.success) {
        showToast(`Test email successfully delivered to ${testEmailAddress}!`, 'success');
      } else {
        showToast(data.message || 'Test email delivery failed.', 'error');
      }
      await fetchHealth();
    } catch (err: any) {
      setEmailTestResult({
        success: false,
        message: err.message || 'Connection error to test endpoint.'
      });
      showToast('Failed to trigger test email delivery.', 'error');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleRotateRecoveryKey = async () => {
    if (!authToken) return;
    setIsRotatingKey(true);
    try {
      const res = await fetch('/api/auth/recovery/rotate-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();

      if (res.ok && data.success && data.recoveryKey) {
        setGeneratedSecretKey(data.recoveryKey);
        setShowKeyModal(true);
        setHasCopiedSecret(false);
        showToast('Emergency recovery key generated! Please save it offline immediately.', 'success');
        await fetchHealth();
      } else {
        showToast(data.message || 'Failed to rotate recovery key.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Rotation failed', 'error');
    } finally {
      setIsRotatingKey(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedSecretKey) return;
    navigator.clipboard.writeText(generatedSecretKey);
    setHasCopiedSecret(true);
    showToast('Secret key copied to clipboard!', 'success');
    setTimeout(() => setHasCopiedSecret(false), 3000);
  };

  const downloadKeyFile = () => {
    if (!generatedSecretKey) return;
    const content = `================================================================================
CAKE JUNCTION — OWNER EMERGENCY ACCOUNT RECOVERY SECRET KEY
Generated: ${new Date().toISOString()}
================================================================================
EMERGENCY RECOVERY KEY: ${generatedSecretKey}

IMPORTANT INSTRUCTIONS:
- Store this file in a secure password manager or offline encrypted storage.
- Never share this key with customers or staff.
- This key is strictly single-use and will be invalidated after recovery.
================================================================================\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cakejunction_recovery_key_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Offline key file downloaded successfully.', 'success');
  };

  const emailInfo = healthData?.email;
  const driveInfo = healthData?.drive;
  const dbInfo = healthData?.database;
  const recInfo = healthData?.recovery;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A]">
              System Health &amp; Security Status
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25] mt-1">
              Owner Configuration &amp; Services Diagnostic
            </h2>
            <p className="text-xs text-[#4B2E25]/75 mt-1 max-w-2xl leading-relaxed">
              Real-time server telemetry for Gmail SMTP delivery, Google Drive automated backup synchronization, single-use recovery key protection, and local database persistence.
            </p>
          </div>

          <button
            onClick={() => {
              setIsLoading(true);
              fetchHealth();
            }}
            disabled={isLoading}
            className="px-4 py-2.5 bg-[#FFF8EF] hover:bg-[#F4D8D8]/50 border border-[#E8D5C8] text-[#4B2E25] text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Grid of the 4 Core Subsystems */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. EMAIL PROVIDER & GMAIL SMTP */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#FFF8EF] border border-[#E8D5C8] text-[#4B2E25]">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#4B2E25]">Gmail SMTP Delivery</h3>
                <p className="text-[11px] text-[#4B2E25]/70">Verified Sender: <strong>{emailInfo?.senderEmail || 'vasanthnkl500@gmail.com'}</strong></p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              emailInfo?.hasPasswordConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {emailInfo?.hasPasswordConfigured ? 'Credentials Active' : 'App Password Required'}
            </span>
          </div>

          <div className="bg-[#FFF8EF] p-4 rounded-2xl border border-[#E8D5C8] space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Host &amp; Port:</span>
              <span className="font-mono font-semibold text-[#4B2E25]">{emailInfo?.smtpHost || 'smtp.gmail.com'}:{emailInfo?.smtpPort || 587}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Sender Account:</span>
              <span className="font-mono font-semibold text-[#4B2E25]">{emailInfo?.smtpUser || 'vasanthnkl500@gmail.com'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Server Secret Status:</span>
              <span className={`font-semibold ${emailInfo?.hasPasswordConfigured ? 'text-emerald-700' : 'text-amber-800'}`}>
                {emailInfo?.hasPasswordConfigured ? 'Configured (Server Env)' : 'Pending SMTP_PASS in secrets'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Last Delivery Test:</span>
              <span className="font-semibold text-[#4B2E25]">
                {emailInfo?.lastTestTimestamp ? new Date(emailInfo.lastTestTimestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Never tested'}
              </span>
            </div>
          </div>

          {/* Test Email Action */}
          <form onSubmit={handleSendTestEmail} className="space-y-3 pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/80">
              Dispatch Verification Test Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                required
                disabled={isSendingTestEmail}
              />
              <button
                type="submit"
                disabled={isSendingTestEmail}
                className="px-4 py-2.5 bg-[#4B2E25] hover:bg-[#38221B] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {isSendingTestEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Test</span>
              </button>
            </div>

            {emailTestResult && (
              <div className={`p-4 rounded-2xl border-2 text-xs flex items-start gap-3 ${
                emailTestResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}>
                {emailTestResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      emailTestResult.success ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                    }`}>
                      DELIVERY STATUS: {emailTestResult.success ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-95">{emailTestResult.message}</p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* 2. GOOGLE DRIVE BACKUP & SYNCHRONIZATION */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#FFF8EF] border border-[#E8D5C8] text-[#4B2E25]">
                <Cloud className="w-5 h-5 text-[#4285F4]" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#4B2E25]">Google Drive Sync</h3>
                <p className="text-[11px] text-[#4B2E25]/70">Folder: <strong>Cake Junction Secure Backups</strong></p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              driveInfo?.isAuthorized ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {driveInfo?.isAuthorized ? 'Authorized' : 'Action Required'}
            </span>
          </div>

          <div className="bg-[#FFF8EF] p-4 rounded-2xl border border-[#E8D5C8] space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Authorized Account:</span>
              <span className="font-mono font-semibold text-[#4B2E25]">{driveInfo?.authorizedEmail || 'vasanthnkl500@gmail.com'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Last Successful Backup:</span>
              <span className="font-semibold text-[#4B2E25]">
                {driveInfo?.lastBackupTimestamp ? new Date(driveInfo.lastBackupTimestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Pending Queue Events:</span>
              <span className="font-semibold text-[#4B2E25]">{driveInfo?.pendingEventsCount || 0} records queued</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Backup History Runs:</span>
              <span className="font-semibold text-[#4B2E25]">{driveInfo?.backupHistoryCount || 0} entries</span>
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-[#4B2E25]/80 space-y-1">
            <p className="font-semibold text-[#4B2E25]">Fault Tolerance &amp; Retention:</p>
            <p className="text-[11px] leading-relaxed">
              If Google Drive is unavailable, customer accounts and orders are queued in persistent storage with zero data loss. Passwords, hashes, and OTPs are strictly excluded.
            </p>
          </div>
        </div>

        {/* 3. OWNER EMERGENCY RECOVERY KEY */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#FFF8EF] border border-[#E8D5C8] text-[#4B2E25]">
                <KeyRound className="w-5 h-5 text-rose-800" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#4B2E25]">Emergency Recovery Key</h3>
                <p className="text-[11px] text-[#4B2E25]/70">Single-use disaster recovery protection</p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              recInfo?.keyConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-800'
            }`}>
              {recInfo?.keyConfigured ? 'Hashed & Configured' : 'Unconfigured'}
            </span>
          </div>

          <div className="bg-[#FFF8EF] p-4 rounded-2xl border border-[#E8D5C8] space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Key Storage State:</span>
              <span className="font-semibold text-emerald-800">Only SHA-256 Hash on Server</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Plaintext File Exposure:</span>
              <span className="font-semibold text-emerald-800">Purged &amp; Prohibited</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Compromised Key Status:</span>
              <span className="font-semibold text-emerald-800">Permanently Blacklisted</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Last Rotated:</span>
              <span className="font-semibold text-[#4B2E25]">
                {recInfo?.rotatedAt ? new Date(recInfo.rotatedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Pending owner generation'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleRotateRecoveryKey}
              disabled={isRotatingKey}
              className="w-full py-3 px-4 bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isRotatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Generate / Rotate Emergency Recovery Key</span>
            </button>
            <p className="text-[10px] text-[#4B2E25]/60 text-center mt-2">
              Generates a new single-use secret key in memory. Displayed only once for offline saving.
            </p>
          </div>
        </div>

        {/* 4. PERSISTENT DATABASE & SHOP RECORDS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#FFF8EF] border border-[#E8D5C8] text-[#4B2E25]">
                <Database className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#4B2E25]">Persistent Database</h3>
                <p className="text-[11px] text-[#4B2E25]/70">Local Authority: <code>.server_data/shop_data.json</code></p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Active &amp; Persistent
            </span>
          </div>

          <div className="bg-[#FFF8EF] p-4 rounded-2xl border border-[#E8D5C8] space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Live Orders Preserved:</span>
              <span className="font-semibold text-[#4B2E25]">{dbInfo?.totalOrders || 0} orders</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Active Catalogue Cakes:</span>
              <span className="font-semibold text-[#4B2E25]">{dbInfo?.totalCakes || 0} items</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Customer Enquiries:</span>
              <span className="font-semibold text-[#4B2E25]">{dbInfo?.totalEnquiries || 0} entries</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#4B2E25]/70">Last Server Sync:</span>
              <span className="font-semibold text-[#4B2E25]">
                {dbInfo?.lastSavedAt ? new Date(dbInfo.lastSavedAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Bootstrapped'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-[#4B2E25]/80 space-y-1">
            <p className="font-semibold text-[#4B2E25]">Browser Storage Safeguard:</p>
            <p className="text-[11px] leading-relaxed">
              Browser local storage is restricted strictly to non-sensitive preferences (e.g. language). All customer accounts, orders, invoices, and prices reside safely on the server.
            </p>
          </div>
        </div>

      </div>

      {/* ONE-TIME RECOVERY KEY DISPLAY MODAL */}
      {showKeyModal && generatedSecretKey && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-rose-300 shadow-2xl space-y-5 animate-scale-in">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[#4B2E25]">
                New Emergency Recovery Key Generated
              </h3>
              <p className="text-xs text-rose-900 leading-relaxed font-medium">
                Save this key in an offline vault immediately. For your security, this key is only displayed right now and is <strong>never stored in plaintext on the server or in Google Drive</strong>.
              </p>
            </div>

            <div className="bg-[#FFF8EF] p-4 rounded-2xl border-2 border-dashed border-[#C5A15A] text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4B2E25]/70">
                Your Secret Recovery Key
              </span>
              <div className="font-mono text-2xl font-bold tracking-widest text-[#4B2E25] selection:bg-[#C5A15A] selection:text-white">
                {generatedSecretKey}
              </div>
              <p className="text-[10px] text-[#4B2E25]/60">
                Format: Single-use CJ-XXXX-XXXX-XXXX
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={copyToClipboard}
                className="flex-1 py-3 px-4 bg-[#FFF8EF] hover:bg-[#F4D8D8]/50 border border-[#E8D5C8] text-[#4B2E25] text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {hasCopiedSecret ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                <span>{hasCopiedSecret ? 'Copied to Clipboard' : 'Copy Key'}</span>
              </button>
              <button
                onClick={downloadKeyFile}
                className="flex-1 py-3 px-4 bg-[#4B2E25] hover:bg-[#38221B] text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Keyfile (.txt)</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[#E8D5C8]">
              <button
                onClick={() => {
                  setGeneratedSecretKey(null);
                  setShowKeyModal(false);
                }}
                className="w-full py-2.5 text-xs font-semibold text-[#4B2E25]/70 hover:text-[#4B2E25] transition-colors"
              >
                I have securely stored my key offline (Close)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
