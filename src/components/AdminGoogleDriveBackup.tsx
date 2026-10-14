import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  connectGoogleDriveAccount, 
  getDriveStatusFromServer, 
  testDriveConnectionApi, 
  triggerDriveBackupNowApi, 
  fetchDriveHistoryApi 
} from '../services/googleDriveClient';
import { 
  Cloud, 
  CloudCheck, 
  CloudOff, 
  FolderLock, 
  RefreshCw, 
  ShieldCheck, 
  FileCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  ExternalLink, 
  History, 
  Layers, 
  Lock,
  ArrowRight
} from 'lucide-react';

export const AdminGoogleDriveBackup: React.FC = () => {
  const { authToken, showToast } = useApp();

  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadStatus = async () => {
    if (!authToken) return;
    try {
      const res = await getDriveStatusFromServer(authToken);
      if (res && res.success) {
        setStatus(res.status);
      }
    } catch (err) {
      console.error('Failed to load drive status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 15000);
    return () => clearInterval(interval);
  }, [authToken]);

  const handleConnect = async () => {
    if (!authToken) return;
    setIsConnecting(true);
    try {
      const res = await connectGoogleDriveAccount(authToken);
      if (res.success) {
        showToast(res.message, 'success');
        await loadStatus();
      } else {
        showToast(res.message || 'Google Drive authorization failed.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to connect Google Drive.', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!authToken) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testDriveConnectionApi(authToken);
      setTestResult(res);
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message || 'Connection test failed.', 'error');
      }
      await loadStatus();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Test failed' });
      showToast('Connection test request error', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleBackupNow = async () => {
    if (!authToken) return;
    setIsBackingUp(true);
    try {
      const res = await triggerDriveBackupNowApi(authToken);
      if (res.success) {
        showToast(res.message, 'success');
        await loadStatus();
      } else {
        showToast(res.message || 'Backup failed.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Backup failed.', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleViewHistory = async () => {
    if (!authToken) return;
    try {
      const res = await fetchDriveHistoryApi(authToken);
      if (res && res.success) {
        setHistory(res.history || []);
        setShowHistoryModal(true);
      }
    } catch (err) {
      showToast('Failed to load backup history.', 'error');
    }
  };

  const isConnected = Boolean(status?.isAuthorized);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A]">
                Automated Cloud Synchronization
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`} />
                {isConnected ? 'Google Drive Connected' : 'Authorization Required'}
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25] mt-1">
              Google Drive Backup &amp; Synchronization
            </h2>
            <p className="text-xs text-[#4B2E25]/75 mt-1 max-w-2xl leading-relaxed">
              Automatic, incremental backups of customer registrations, login audit logs, orders, invoices, and product data directly to your private Google Drive account (<code className="font-semibold text-[#4B2E25]">vasanthnkl500@gmail.com</code>).
            </p>
          </div>

          {/* Connect / Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full sm:w-auto px-5 py-3 bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting Google Drive...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Connect Google Drive</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2.5 bg-[#FFF8EF] hover:bg-[#F4D8D8]/50 border border-[#E8D5C8] text-[#4B2E25] text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
                >
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Test Connection</span>
                </button>
                <button
                  onClick={handleBackupNow}
                  disabled={isBackingUp}
                  className="px-4 py-2.5 bg-[#4B2E25] hover:bg-[#38221B] text-[#FFF8EF] text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  {isBackingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className="w-3.5 h-3.5" />}
                  <span>Back Up Now</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div className={`mt-4 p-3 rounded-xl border text-xs flex items-start gap-2 ${
            testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold">{testResult.success ? 'Connection Test Passed' : 'Connection Test Failed'}</p>
              <p className="text-[11px] mt-0.5 opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Metrics & Operational Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8D5C8] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B2E25]/60 flex items-center gap-1">
            <Cloud className="w-3.5 h-3.5 text-[#C5A15A]" /> Account Status
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-sm font-bold text-[#4B2E25] truncate" title={status?.authorizedEmail || 'vasanthnkl500@gmail.com'}>
              {status?.authorizedEmail || 'vasanthnkl500@gmail.com'}
            </span>
          </div>
          <p className="text-[11px] text-[#4B2E25]/70 mt-1">
            {isConnected ? 'Authorized via Google OAuth' : 'Pending Authorization'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8D5C8] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B2E25]/60 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#C5A15A]" /> Last Backup
          </span>
          <div className="mt-2">
            <span className="text-sm font-bold text-[#4B2E25]">
              {status?.lastBackupTimestamp ? new Date(status.lastBackupTimestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
            </span>
          </div>
          <p className="text-[11px] text-[#4B2E25]/70 mt-1">
            Status: <span className="font-semibold uppercase text-emerald-700">{status?.lastBackupStatus || 'Idle'}</span>
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8D5C8] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B2E25]/60 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#C5A15A]" /> Queued Events
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-serif text-[#4B2E25]">
              {status?.pendingEventsCount || 0}
            </span>
            <span className="text-[11px] text-[#4B2E25]/60">pending flush</span>
          </div>
          <p className="text-[11px] text-[#4B2E25]/70 mt-1">
            Deduplicated &amp; persistent across restarts
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8D5C8] shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B2E25]/60 flex items-center gap-1">
            <FolderLock className="w-3.5 h-3.5 text-[#C5A15A]" /> Target Folder
          </span>
          <div className="mt-2">
            <span className="text-sm font-bold text-[#4B2E25] truncate block">
              Cake Junction Secure Backups
            </span>
          </div>
          <button
            onClick={handleViewHistory}
            className="mt-1 text-[11px] font-semibold text-[#C5A15A] hover:underline flex items-center gap-1"
          >
            <span>View Backup History</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Synchronization Architecture & Privacy Assurance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-bold text-[#4B2E25] flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-[#C5A15A]" />
              Automated Backup Categories
            </h3>
            <span className="text-[10px] font-bold uppercase bg-[#FFF8EF] px-2 py-0.5 rounded-md text-[#4B2E25]/70 border border-[#E8D5C8]">
              Private Folder
            </span>
          </div>

          <div className="divide-y divide-[#E8D5C8]/50 text-xs text-[#4B2E25]">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#4B2E25]">Customer_Account_Exports</p>
                <p className="text-[11px] text-[#4B2E25]/65">IDs, email addresses, registration dates (strictly no passwords or hashes)</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">Active</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#4B2E25]">Login_Audit_Logs</p>
                <p className="text-[11px] text-[#4B2E25]/65">Timestamps, actions, outcomes, and IP addresses (credentials omitted)</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">Active</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#4B2E25]">Orders &amp; Invoices_Receipts</p>
                <p className="text-[11px] text-[#4B2E25]/65">Custom cake specs, fulfilment history, invoices, and payment receipts</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">Active</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#4B2E25]">COD_Reports</p>
                <p className="text-[11px] text-[#4B2E25]/65">Cash on delivery reconciliation statements and daily payment collection</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">Active</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#4B2E25]">Product_Settings &amp; Database_Backups</p>
                <p className="text-[11px] text-[#4B2E25]/65">Catalogue settings, price tiers, and full AES-256-GCM encrypted database snapshots</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold">Encrypted</span>
            </div>
          </div>
        </div>

        {/* Security & Reliability Controls */}
        <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs space-y-4">
          <h3 className="font-serif text-base font-bold text-[#4B2E25] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Security &amp; Fault Tolerance Controls
          </h3>

          <div className="space-y-3 text-xs text-[#4B2E25]/85">
            <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#E8D5C8]/80 space-y-1">
              <p className="font-semibold text-[#4B2E25]">Zero-Secret Sanitization Guarantee</p>
              <p className="text-[11px] text-[#4B2E25]/70 leading-relaxed">
                Plaintext passwords, PBKDF2 hashes, salt strings, OTP verification codes, session tokens, SMTP credentials, and emergency recovery keys are strictly filtered before transmission to Google Drive.
              </p>
            </div>

            <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#E8D5C8]/80 space-y-1">
              <p className="font-semibold text-[#4B2E25]">Persistent Queue &amp; Non-Blocking Operations</p>
              <p className="text-[11px] text-[#4B2E25]/70 leading-relaxed">
                Customer registrations, orders, and logins remain instant and completely independent of Google Drive availability. If Google Drive is unreachable or in transient network failure, records are queued in <code>.server_data/drive_backup_queue.json</code> with automatic retry.
              </p>
            </div>

            <div className="p-3 bg-[#FFF8EF] rounded-xl border border-[#E8D5C8]/80 space-y-1">
              <p className="font-semibold text-[#4B2E25]">Live Source of Truth Preserved</p>
              <p className="text-[11px] text-[#4B2E25]/70 leading-relaxed">
                The local database is the authoritative source of truth. Google Drive functions strictly as a non-destructive mirror. No customer records or orders are modified or deleted from Drive without explicit retention procedures.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 border border-[#E8D5C8] shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8D5C8]">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#4B2E25]">
                  Google Drive Backup History
                </h3>
                <p className="text-xs text-[#4B2E25]/70">
                  Recent synchronization runs and verified Drive file receipts
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-2 text-[#4B2E25]/60 hover:text-[#4B2E25] hover:bg-[#FFF8EF] rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto py-4 flex-1">
              {history.length === 0 ? (
                <div className="text-center py-10 text-xs text-[#4B2E25]/60">
                  No backup runs recorded yet. Click &quot;Back Up Now&quot; to perform your first upload.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#4B2E25]">{item.category}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status}
                          </span>
                          {item.encrypted && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> AES-256
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-[#4B2E25]/75">{item.fileName}</p>
                        {item.notes && <p className="text-[11px] text-[#4B2E25]/70">{item.notes}</p>}
                      </div>

                      <div className="text-right sm:shrink-0 text-[11px] text-[#4B2E25]/70">
                        <p className="font-semibold text-[#4B2E25]">
                          {new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                        <p className="font-mono text-[10px]">
                          {item.sizeBytes ? `${(item.sizeBytes / 1024).toFixed(1)} KB` : 'Verified'} · ID: {item.driveFileId?.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#E8D5C8] flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2.5 bg-[#4B2E25] text-white text-xs font-semibold rounded-xl hover:bg-[#38221B]"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
