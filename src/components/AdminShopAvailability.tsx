import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { verifyShopOrderAcceptance, DEFAULT_CLOSURE_MESSAGE } from '../data/shopSettingsSchema';
import { 
  Power, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Save, 
  Calendar, 
  Store, 
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Info
} from 'lucide-react';

export const AdminShopAvailability: React.FC = () => {
  const { settings, updateShopAvailability, showToast } = useApp();

  const currentIsOpen = settings.is_open !== false && settings.isOpen !== false;

  const [isOpen, setIsOpen] = useState<boolean>(currentIsOpen);
  const [closureMessage, setClosureMessage] = useState<string>(
    settings.closureMessage || DEFAULT_CLOSURE_MESSAGE
  );
  const [reopeningTimestamp, setReopeningTimestamp] = useState<string>(
    settings.reopeningTimestamp || ''
  );
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: 'allowed' | 'rejected';
    message: string;
    evaluatedAt: string;
  } | null>(null);

  // Sync state if external settings change
  React.useEffect(() => {
    setIsOpen(settings.is_open !== false && settings.isOpen !== false);
    if (settings.closureMessage) {
      setClosureMessage(settings.closureMessage);
    }
    if (settings.reopeningTimestamp) {
      setReopeningTimestamp(settings.reopeningTimestamp);
    }
  }, [settings.is_open, settings.isOpen, settings.closureMessage, settings.reopeningTimestamp]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    updateShopAvailability({
      is_open: isOpen,
      closureMessage: closureMessage.trim(),
      reopeningTimestamp: reopeningTimestamp ? reopeningTimestamp : null
    });

    setIsSavedNotice(true);
    showToast(
      isOpen 
        ? 'Shop status updated: OPEN (Accepting new orders)' 
        : 'Shop status updated: CLOSED (Orders paused)',
      isOpen ? 'success' : 'info'
    );
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  // Quick closure message presets
  const applyPresetMessage = (msg: string) => {
    setClosureMessage(msg);
  };

  // Quick reopening timestamp presets
  const applyPresetTimestamp = (type: '3hours' | 'tomorrow9' | 'tomorrow10' | 'nextMonday' | 'clear') => {
    if (type === 'clear') {
      setReopeningTimestamp('');
      return;
    }

    const now = new Date();
    if (type === '3hours') {
      now.setHours(now.getHours() + 3);
    } else if (type === 'tomorrow9') {
      now.setDate(now.getDate() + 1);
      now.setHours(9, 0, 0, 0);
    } else if (type === 'tomorrow10') {
      now.setDate(now.getDate() + 1);
      now.setHours(10, 0, 0, 0);
    } else if (type === 'nextMonday') {
      const day = now.getDay();
      const diff = (day === 0 ? 1 : 8 - day);
      now.setDate(now.getDate() + diff);
      now.setHours(10, 0, 0, 0);
    }

    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    setReopeningTimestamp(localISOTime);
  };

  const handleRunVerificationCheck = () => {
    const check = verifyShopOrderAcceptance({
      is_open: isOpen,
      isOpen: isOpen,
      closureMessage,
      reopeningTimestamp: reopeningTimestamp || null
    });

    const evaluatedAt = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (check.allowed) {
      setTestResult({
        status: 'allowed',
        message: 'Order Creation Status: PERMITTED. The shop is marked OPEN in the database schema. Direct orders and custom quote submissions will be processed and saved.',
        evaluatedAt
      });
    } else {
      setTestResult({
        status: 'rejected',
        message: `Order Creation Status: REJECTED. The backend order-creation verification failed. Any incoming order attempt will be rejected with: "${check.reason}". All existing customer orders remain safe and unaffected.`,
        evaluatedAt
      });
    }
  };

  return (
    <div className="py-6 space-y-8 animate-fade-in max-w-5xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#4B2E25] text-white">
              <Power className="w-5 h-5 text-[#C5A15A]" />
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
              Shop Availability & Order Intake Control
            </h2>
          </div>
          <p className="text-xs text-[#4B2E25]/70 mt-1 max-w-2xl">
            Master control switch for cake bookings. When the shop is closed, backend logic strictly rejects any new order attempts with your custom closure message, while keeping all existing orders completely intact.
          </p>
        </div>

        {isSavedNotice && (
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-3.5 py-2 rounded-xl border border-emerald-200 shadow-2xs flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Availability Saved!</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* SECTION 1: MASTER TOGGLE SWITCH CARD */}
        <div className={`p-6 sm:p-8 rounded-3xl border-2 transition-all shadow-sm ${
          isOpen 
            ? 'bg-emerald-50/60 border-emerald-300' 
            : 'bg-rose-50/70 border-rose-300'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isOpen 
                    ? 'bg-emerald-200/80 text-emerald-900 border border-emerald-300' 
                    : 'bg-rose-200/80 text-rose-900 border border-rose-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                  {isOpen ? 'STORE OPEN (ACCEPTING ORDERS)' : 'STORE CLOSED (ORDERS PAUSED)'}
                </span>

                <span className="text-xs text-[#4B2E25]/60 font-medium">
                  Database field: <code className="font-mono font-semibold">ShopSettings.is_open = {String(isOpen)}</code>
                </span>
              </div>

              <h3 className="font-serif text-2xl font-bold text-[#4B2E25]">
                {isOpen ? 'Cake Junction is Open for Orders' : 'Cake Junction is Closed for Orders'}
              </h3>

              <p className="text-xs text-[#4B2E25]/80 leading-relaxed max-w-2xl">
                {isOpen 
                  ? 'Customers can browse the gallery, choose weights, calculate pricing, and book delivery slots directly online.' 
                  : 'All new order submissions are halted. Visitors will be greeted with your custom closure notice and scheduled reopening timestamp.'}
              </p>
            </div>

            {/* Big Master Toggle Button */}
            <div className="flex flex-col items-center sm:items-end gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggle}
                className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isOpen 
                    ? 'bg-emerald-600 focus:ring-emerald-500' 
                    : 'bg-rose-600 focus:ring-rose-500'
                }`}
                aria-label="Toggle Shop Availability"
              >
                <span
                  className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out flex items-center justify-center ${
                    isOpen ? 'translate-x-13' : 'translate-x-1'
                  }`}
                >
                  <Power className={`w-5 h-5 ${isOpen ? 'text-emerald-600' : 'text-rose-600'}`} />
                </span>
              </button>

              <span className="text-[11px] font-semibold text-[#4B2E25]/70">
                Click switch to {isOpen ? 'Close Shop' : 'Open Shop'}
              </span>
            </div>

          </div>
        </div>

        {/* SECTION 2: CLOSURE MESSAGE CONFIGURATION */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#4B2E25] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#C5A15A]" />
                <span>Custom Closure Message</span>
              </h3>
              <p className="text-xs text-[#4B2E25]/70 mt-0.5">
                Displayed in notification banners, checkout pages, and returned in backend rejection errors when the shop is closed.
              </p>
            </div>
            <span className="text-xs text-[#4B2E25]/60 font-mono">
              {closureMessage.length} characters
            </span>
          </div>

          <div>
            <textarea
              rows={3}
              value={closureMessage}
              onChange={(e) => setClosureMessage(e.target.value)}
              placeholder="Enter message to display to customers when orders are paused..."
              className="w-full px-4 py-3 rounded-2xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-none focus:ring-2 focus:ring-[#C5A15A] bg-[#FFF8EF]/20"
            />
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4B2E25]/60 block">
              Quick Closure Message Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Kitchen Maintenance', msg: 'Cake Junction is closed today for routine kitchen sanitisation and oven maintenance. New orders are temporarily paused.' },
                { label: 'Fully Booked for Today', msg: 'Our baking slots for today are 100% fully booked! We are accepting pre-orders for tomorrow and future dates.' },
                { label: 'Festival / Holiday', msg: 'We are closed for festival celebration today. Pre-orders placed previously are being dispatched as scheduled.' },
                { label: 'Chef Private Event', msg: 'Our master cake decorator is currently catering a private destination wedding. Orders will resume shortly.' }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPresetMessage(preset.msg)}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[#E8D5C8] bg-white text-[#4B2E25] hover:bg-[#FFF8EF] transition-colors"
                >
                  + {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: REOPENING TIMESTAMP */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#4B2E25] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C5A15A]" />
                <span>Optional Reopening Timestamp</span>
              </h3>
              <p className="text-xs text-[#4B2E25]/70 mt-0.5">
                Set a target date and time when the shop will reopen. Shown alongside the closure message so customers know when to return.
              </p>
            </div>
            {reopeningTimestamp && (
              <button
                type="button"
                onClick={() => applyPresetTimestamp('clear')}
                className="text-xs text-rose-700 hover:underline font-semibold"
              >
                Clear Reopening Date
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                Reopening Date & Time
              </label>
              <input
                type="datetime-local"
                value={reopeningTimestamp}
                onChange={(e) => setReopeningTimestamp(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] focus:outline-none focus:ring-2 focus:ring-[#C5A15A]"
              />
            </div>

            <div className="p-3.5 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] text-xs">
              <span className="font-semibold text-[#4B2E25] block">Formatted Customer Display:</span>
              <span className="text-[#4B2E25]/80 mt-1 block">
                {reopeningTimestamp ? (
                  new Date(reopeningTimestamp).toLocaleString('en-IN', {
                    dateStyle: 'full',
                    timeStyle: 'short'
                  })
                ) : (
                  <span className="italic text-[#4B2E25]/50">No specific reopening time scheduled (indefinite closure notice).</span>
                )}
              </span>
            </div>
          </div>

          {/* Quick Schedule Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4B2E25]/60 block">
              Quick Schedule Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPresetTimestamp('3hours')}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[#E8D5C8] bg-white text-[#4B2E25] hover:bg-[#FFF8EF] transition-colors"
              >
                + In 3 Hours
              </button>
              <button
                type="button"
                onClick={() => applyPresetTimestamp('tomorrow9')}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[#E8D5C8] bg-white text-[#4B2E25] hover:bg-[#FFF8EF] transition-colors"
              >
                + Tomorrow at 09:00 AM
              </button>
              <button
                type="button"
                onClick={() => applyPresetTimestamp('tomorrow10')}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[#E8D5C8] bg-white text-[#4B2E25] hover:bg-[#FFF8EF] transition-colors"
              >
                + Tomorrow at 10:00 AM
              </button>
              <button
                type="button"
                onClick={() => applyPresetTimestamp('nextMonday')}
                className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[#E8D5C8] bg-white text-[#4B2E25] hover:bg-[#FFF8EF] transition-colors"
              >
                + Next Monday at 10:00 AM
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 4: LIVE PREVIEW & VERIFICATION TOOLS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Live Customer Preview */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C5A15A]" />
              <h4 className="font-serif text-sm font-bold text-[#4B2E25]">
                Live Customer Website Preview
              </h4>
            </div>

            <div className="p-4 rounded-2xl border border-[#E8D5C8] bg-[#FFF8EF]/50 space-y-3">
              <div className="text-[11px] font-semibold text-[#4B2E25]/60 uppercase tracking-wider">
                Website Announcement Banner:
              </div>

              {!isOpen ? (
                <div className="bg-amber-100 border border-amber-300 text-amber-950 p-3 rounded-xl text-xs flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0 mt-1" />
                  <div>
                    <strong>Shop Closed for New Orders:</strong> {closureMessage}
                    {reopeningTimestamp && (
                      <span className="block mt-1 font-semibold text-amber-900">
                        Reopening: {new Date(reopeningTimestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-950 p-3 rounded-xl text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  <span><strong>Accepting Orders:</strong> Fresh handcrafted celebration cakes baked daily to order.</span>
                </div>
              )}

              <div className="text-[11px] font-semibold text-[#4B2E25]/60 uppercase tracking-wider pt-2 border-t border-[#E8D5C8]/70">
                Checkout Button State:
              </div>

              <div className="w-full py-2.5 px-4 rounded-xl text-center text-xs font-semibold transition-all">
                {!isOpen ? (
                  <span className="inline-block w-full py-2 bg-neutral-200 text-neutral-600 rounded-lg border border-neutral-300">
                    Orders Paused — Shop Currently Closed (Disabled)
                  </span>
                ) : (
                  <span className="inline-block w-full py-2 bg-[#4B2E25] text-white rounded-lg shadow-xs">
                    Confirm Order & Book Slot (Active)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Backend Verification Simulator */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C5A15A]" />
                <h4 className="font-serif text-sm font-bold text-[#4B2E25]">
                  Backend Order-Creation Logic Verification
                </h4>
              </div>
            </div>

            <p className="text-xs text-[#4B2E25]/70">
              Test how the backend order-creation gate evaluates the current availability schema before writing to storage.
            </p>

            <button
              type="button"
              onClick={handleRunVerificationCheck}
              className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl border border-[#4B2E25] text-[#4B2E25] hover:bg-[#FFF8EF] transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run Backend Availability Verification</span>
            </button>

            {testResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                testResult.status === 'allowed'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span>{testResult.status === 'allowed' ? '✅ Verification Succeeded' : '🛑 Verification Rejection Active'}</span>
                  <span className="text-[10px] opacity-75 font-mono">{testResult.evaluatedAt}</span>
                </div>
                <p className="leading-relaxed">
                  {testResult.message}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* SECTION 5: ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E8D5C8]">
          <div className="text-xs text-[#4B2E25]/70 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#C5A15A] shrink-0" />
            <span>Changes persist immediately to database and local store. Existing orders remain completely safe.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 text-[#C5A15A]" />
              <span>Save Shop Availability</span>
            </button>
          </div>
        </div>

      </form>

    </div>
  );
};
