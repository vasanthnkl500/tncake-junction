import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerOrder } from '../types';
import { formatIndianCurrency } from '../utils/whatsapp';
import { 
  QrCode, 
  Copy, 
  Check, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Smartphone,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface UpiPaymentModalProps {
  order: CustomerOrder;
  onClose: () => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({ order, onClose }) => {
  const { settings, submitPaymentProof, t } = useApp();
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const payableAmount = order.outstandingBalance > 0 ? order.outstandingBalance : order.depositAmount;
  const upiId = settings.upiId || 'artisanbakery@upi';
  const payeeName = settings.payeeName || settings.shopName || 'Bakery';

  // Construct UPI deep-link intent for mobile devices
  // upi://pay?pa=address@bank&pn=PayeeName&am=Amount&cu=INR&tn=OrderRef
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${payableAmount}&cu=INR&tn=${encodeURIComponent(order.orderNumber)}`;

  // Default generated QR using quickchart/google charts if no custom QR image uploaded
  const qrDisplayUrl = settings.upiQrImageUrl || 
    `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiDeepLink)}`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Screenshot file size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setScreenshot(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!utr.trim() && !screenshot) {
      setErrorMsg('Please enter either your 12-digit UTR number or upload your payment confirmation screenshot.');
      return;
    }

    submitPaymentProof({
      orderId: order.id,
      enquiryId: order.enquiryId,
      utrNumber: utr.trim() || undefined,
      screenshotUrl: screenshot || undefined,
      paidAmount: payableAmount
    });

    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div 
        className="relative bg-[#FFF8EF] rounded-3xl max-w-xl w-full overflow-hidden border border-[#E8D5C8] shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#E8D5C8]/80 mb-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
              {t.payment_title}
            </h2>
            <p className="text-xs text-[#4B2E25]/70 mt-0.5">
              Order Ref: <span className="font-mono font-bold text-[#4B2E25]">{order.orderNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 bg-white border border-[#E8D5C8] rounded-xl hover:bg-[#F4D8D8]/30 font-medium"
          >
            Close
          </button>
        </div>

        {isSubmitted ? (
          /* Verification Pending Notice */
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <h3 className="font-serif text-2xl font-bold text-[#4B2E25]">
              Payment Proof Submitted
            </h3>

            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 py-1.5 px-3 rounded-lg border border-amber-200 inline-block">
              {t.proof_pending_status}
            </p>

            <p className="text-sm text-[#4B2E25]/80 max-w-md mx-auto leading-relaxed">
              Your payment reference has been recorded. Our accounts team will reconcile the transaction against our bank statement before marking your order confirmed.
            </p>

            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] rounded-xl hover:bg-[#38221B]"
            >
              Done & Return to Orders
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Amount Box */}
            <div className="p-4 bg-white rounded-2xl border border-[#E8D5C8] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#4B2E25]/70 block">Payable Balance</span>
                <span className="font-serif text-2xl font-bold text-[#4B2E25]">
                  {formatIndianCurrency(payableAmount)}
                </span>
              </div>
              <div className="text-right text-xs text-[#4B2E25]/70">
                <span className="block font-medium text-[#4B2E25]">{order.cakeName}</span>
                <span>{order.weight}</span>
              </div>
            </div>

            {/* QR Code and UPI copy card */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-white rounded-2xl border border-[#E8D5C8]">
              {/* QR Image */}
              <div className="w-40 h-40 shrink-0 bg-white p-2 rounded-xl border border-[#E8D5C8] flex items-center justify-center shadow-xs">
                <img 
                  src={qrDisplayUrl} 
                  alt="UPI QR Code" 
                  className="w-full h-full object-contain"
                />
              </div>

              {/* UPI details */}
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <span className="text-xs text-[#4B2E25]/60 uppercase tracking-wider font-semibold block">
                    Payee UPI ID
                  </span>
                  <div className="mt-1 flex items-center justify-center sm:justify-start gap-2">
                    <span className="font-mono text-sm font-bold text-[#4B2E25] bg-[#FFF8EF] px-2.5 py-1 rounded-lg border border-[#E8D5C8]">
                      {upiId}
                    </span>
                    <button
                      onClick={handleCopyUpi}
                      className="p-1.5 text-[#4B2E25] hover:text-[#C5A15A] transition-colors"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  {copiedUpi && <span className="text-[10px] text-emerald-700 font-medium">{t.upi_copied}</span>}
                </div>

                <div className="text-xs text-[#4B2E25]/80 space-y-1">
                  <p><strong>Payee:</strong> {payeeName}</p>
                  <p><strong>Note:</strong> Include order ref <code className="font-mono text-[#4B2E25]">{order.orderNumber}</code></p>
                </div>

                {/* Mobile Pay with UPI App Intent */}
                <div className="pt-1">
                  <a
                    href={upiDeepLink}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors shadow-xs"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{t.pay_with_upi} (Mobile)</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Proof submission form */}
            <form onSubmit={handleSubmitProof} className="pt-2 border-t border-[#E8D5C8]/70 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#4B2E25]">
                Step 2: Submit Payment Details for Reconciliation
              </h4>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#4B2E25]/75 mb-1">
                    12-Digit UTR / Transaction ID
                  </label>
                  <input
                    type="text"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="e.g. 403812984512"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8D5C8] text-xs font-mono text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4B2E25]/75 mb-1">
                    Payment Screenshot (Optional)
                  </label>
                  <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-dashed border-[#C5A15A] text-xs text-[#4B2E25] hover:bg-[#F4D8D8]/20">
                    <Upload className="w-3.5 h-3.5 text-[#C5A15A]" />
                    <span className="truncate">{screenshot ? 'Screenshot Attached ✓' : 'Upload Screenshot'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
              >
                {t.submit_proof}
              </button>

              <p className="text-[11px] text-center text-[#4B2E25]/60">
                Direct UPI transfers are manually verified against bank ledger entries prior to order confirmation.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
