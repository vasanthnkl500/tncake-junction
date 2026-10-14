import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerOrder, FulfilmentStage } from '../types';
import { formatIndianCurrency, buildWhatsAppLink } from '../utils/whatsapp';
import { printOrderSummaryPdf } from '../utils/pdfInvoiceGenerator';
import { UpiPaymentModal } from './UpiPaymentModal';
import { useRealtimeOrderSubscription } from '../services/realtimeOrderSync';
import { OrderTrackingTimeline } from './OrderTrackingTimeline';
import { 
  ArrowLeft, 
  Home,
  CheckCircle2, 
  Clock, 
  CreditCard, 
  MapPin, 
  Phone, 
  User, 
  Sparkles, 
  AlertCircle, 
  MessageCircle, 
  Printer, 
  ShieldCheck, 
  Truck, 
  Cake as CakeIcon, 
  FileText,
  Gift,
  HelpCircle,
  Download,
  X
} from 'lucide-react';

interface OrderDetailsViewProps {
  orderId?: string;
}

export const OrderDetailsView: React.FC<OrderDetailsViewProps> = ({ orderId }) => {
  const { 
    orders, 
    settings, 
    currentUser, 
    isOrderAuthorized, 
    verifyOrderLookup, 
    acceptQuote, 
    requestOrderChange, 
    requestOrderCancellation,
    downloadOrderInvoice,
    navigateTo, 
    goBack 
  } = useApp();

  // Find order by ID or orderNumber
  const order = orders.find(o => o.id === orderId || o.orderNumber === orderId);

  // Verification state for direct URL access by customer
  const [verifyPhoneInput, setVerifyPhoneInput] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [, setRealtimeTick] = useState(0);

  // Real-time synchronisation subscription (subscribes only to this customer's authorized order)
  useRealtimeOrderSubscription(order?.id, () => {
    setRealtimeTick(t => t + 1);
  });

  // Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  if (!order) {
    return (
      <div className="py-20 px-4 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-[#C5A15A] mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">Order Not Found</h2>
        <p className="mt-2 text-xs text-[#4B2E25]/75">
          We could not locate this order reference. Please check your order number or sign in to your customer portal.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => navigateTo('home')}
            className="px-5 py-2.5 text-xs font-semibold text-[#4B2E25] bg-white hover:bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl shadow-2xs inline-flex items-center gap-1.5"
          >
            <Home className="w-4 h-4 text-[#C5A15A]" />
            <span>Home</span>
          </button>
          <button
            onClick={() => navigateTo('orders')}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] rounded-xl shadow-xs"
          >
            View My Orders
          </button>
        </div>
      </div>
    );
  }

  // Authorization check (Privacy protection for private reference images, address, and phone)
  const isAuthorized = isOrderAuthorized(order);

  const handlePhoneVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    const verified = verifyOrderLookup(order.orderNumber, verifyPhoneInput);
    if (!verified) {
      setVerifyError('The phone number provided does not match the customer record for this order.');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="py-16 px-4 sm:px-6 max-w-md mx-auto animate-fade-in">
        <div className="bg-white rounded-3xl p-8 border border-[#E8D5C8] shadow-sm text-center">
          <ShieldCheck className="w-12 h-12 text-[#C5A15A] mx-auto mb-3" />
          <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">Order Security Check</h2>
          <p className="mt-1 text-xs text-[#4B2E25]/70 leading-relaxed mb-6">
            To safeguard private delivery addresses and contact information for order <strong className="text-[#4B2E25] font-mono">{order.orderNumber}</strong>, please verify your registered 10-digit customer phone number.
          </p>

          <form onSubmit={handlePhoneVerification} className="space-y-4">
            <div>
              <input
                type="tel"
                maxLength={10}
                value={verifyPhoneInput}
                onChange={(e) => setVerifyPhoneInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 10-digit mobile number"
                className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] text-center font-medium focus:ring-2 focus:ring-[#C5A15A] focus:outline-hidden"
                required
              />
            </div>

            {verifyError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {verifyError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-all shadow-xs"
            >
              Verify & View Order
            </button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs">
            <button
              onClick={() => navigateTo('home')}
              className="text-[#4B2E25]/70 hover:text-[#4B2E25] inline-flex items-center gap-1 font-medium"
            >
              <Home className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>Home</span>
            </button>
            <span className="text-[#E8D5C8]">·</span>
            <button
              onClick={() => navigateTo('orders')}
              className="text-[#4B2E25]/60 hover:text-[#4B2E25]"
            >
              ← Return to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Terminal statuses
  const isTerminalRejected = order.orderStatus === 'rejected' || order.fulfilmentStage === 'rejected';
  const isTerminalCancelled = order.orderStatus === 'cancelled' || order.fulfilmentStage === 'cancelled';

  // Privacy protection: check if user is verified with phone OTP or staff/owner
  const isFullyOtpVerified = currentUser.role === 'admin' || currentUser.role === 'owner' || (currentUser.role === 'customer' && !!currentUser.phone);

  const getMaskedPhone = (ph?: string) => {
    if (!ph) return '';
    const digits = ph.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `+91 ****** ${digits.slice(-4)}`;
    }
    return '******';
  };

  const getMaskedAddress = (addr?: string) => {
    if (!addr) return 'Cake Junction Atelier Counter';
    const parts = addr.split(',');
    if (parts.length > 1) {
      return `[Private Building/Street Address Protected], ${parts.slice(1).join(',').trim()}`;
    }
    return `[Protected Location - Verify via OTP to view full address]`;
  };

  // WhatsApp link for this specific order
  const whatsappOrderMessage = `Hello ${settings.shopName || 'Cake Junction'}, I am inquiring regarding my Order #${order.orderNumber} for "${order.cakeName}".`;
  const whatsappUrl = buildWhatsAppLink(settings.whatsappNumber, whatsappOrderMessage);

  // Payment Badge styling
  const paymentBadgeStyle = (status: CustomerOrder['paymentStatus']) => {
    switch (status) {
      case 'fully_paid':
      case 'paid':
        return 'text-emerald-900 bg-emerald-50 border-emerald-300';
      case 'deposit_verified':
      case 'partially_paid':
        return 'text-blue-900 bg-blue-50 border-blue-300';
      case 'verification_pending':
        return 'text-amber-900 bg-amber-50 border-amber-300';
      case 'rejected_proof':
      case 'payment_failed':
        return 'text-red-900 bg-red-50 border-red-300';
      case 'refunded':
        return 'text-purple-900 bg-purple-50 border-purple-300';
      default:
        return 'text-neutral-900 bg-neutral-100 border-neutral-300';
    }
  };

  const handlePrintOrderSummary = () => {
    printOrderSummaryPdf(order, settings);
  };

  const handleAcceptQuote = () => {
    acceptQuote(order.id);
    setActionSuccessMsg('Quote accepted! Please scan our bakery UPI QR below to confirm your baking reservation.');
  };

  const handleSubmitChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeReason.trim()) return;
    requestOrderChange(order.id, changeReason.trim());
    setIsChangeModalOpen(false);
    setChangeReason('');
    setActionSuccessMsg('Change request submitted to the head baker for review.');
  };

  const handleSubmitCancellation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    requestOrderCancellation(order.id, cancelReason.trim());
    setIsCancelModalOpen(false);
    setCancelReason('');
    setActionSuccessMsg('Cancellation request submitted to management for review according to policy.');
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 animate-fade-in print:py-2">
      
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8D5C8]/80 print:hidden">
        <div className="flex items-center gap-2 self-start flex-wrap">
          <button
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B2E25]/80 hover:text-[#4B2E25] bg-white px-3.5 py-2 rounded-xl border border-[#E8D5C8] shadow-2xs transition-colors"
            title="Return to Home"
          >
            <Home className="w-4 h-4 text-[#C5A15A]" />
            <span>Home</span>
          </button>

          <button
            onClick={() => goBack('orders')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#4B2E25]/80 hover:text-[#4B2E25] bg-white px-3.5 py-2 rounded-xl border border-[#E8D5C8] shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#C5A15A]" />
            <span>My Orders</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
              <span>Contact Bakery</span>
            </a>
          )}

          <button
            onClick={() => downloadOrderInvoice(order.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#4B2E25] bg-white hover:bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl transition-colors shadow-2xs"
            title="Download official A4 PDF tax invoice & receipt"
          >
            <Download className="w-3.5 h-3.5 text-[#C5A15A]" />
            <span>Download Invoice</span>
          </button>

          <button
            onClick={handlePrintOrderSummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-2xs"
            title="Print Clean Official PDF Order Summary & Invoice"
          >
            <Printer className="w-3.5 h-3.5 text-[#C5A15A]" />
            <span>Print Order Summary</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Order Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-sm sm:text-base font-bold text-[#4B2E25]">
              {order.orderNumber}
            </span>
            <span className="text-xs text-[#4B2E25]/50">·</span>
            <span className="text-xs text-[#4B2E25]/70">
              Booked: {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {order.isCustomCakeQuote && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#FFF8EF] text-[#C5A15A] rounded-md border border-[#E8D5C8]">
                Bespoke Custom Tier
              </span>
            )}
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#4B2E25]">
            {order.cakeName}
          </h1>

          <p className="text-xs text-[#4B2E25]/75 mt-1">
            Fulfilment Window: <strong className="text-[#4B2E25]">{order.fulfilmentDate}</strong> ({order.fulfilmentTimeSlot || 'Afternoon'})
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="text-left md:text-right">
            <span className="text-[11px] text-[#4B2E25]/60 block uppercase font-medium">Order Status</span>
            <span className="px-3 py-1 text-xs font-semibold rounded-xl border bg-[#FFF8EF] border-[#E8D5C8] text-[#4B2E25] capitalize inline-block mt-0.5">
              {order.orderStatus.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="text-left md:text-right">
            <span className="text-[11px] text-[#4B2E25]/60 block uppercase font-medium">Payment Status</span>
            <span className={`px-3 py-1 text-xs font-semibold rounded-xl border capitalize inline-block mt-0.5 ${paymentBadgeStyle(order.paymentStatus)}`}>
              {order.paymentStatus.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* VISUAL REAL-TIME ORDER TRACKING TIMELINE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs">
        <OrderTrackingTimeline order={order} />
      </div>

      {/* PRIORITY 5: FINANCIAL BREAKDOWN & PAYMENT ACTIONS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8D5C8]/80">
          <div>
            <h2 className="font-serif text-lg font-bold text-[#4B2E25]">Payment & Financial Summary</h2>
            <p className="text-xs text-[#4B2E25]/70 mt-0.5">Direct UPI QR settlements and verified bakery receipts.</p>
          </div>

          {order.outstandingBalance > 0 && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
            >
              <CreditCard className="w-4 h-4 text-[#C5A15A]" />
              <span>Pay {formatIndianCurrency(order.outstandingBalance)} via UPI</span>
            </button>
          )}
        </div>

        {/* 4 Financial Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[#FFF8EF]/50 rounded-2xl border border-[#E8D5C8]">
            <span className="text-[11px] text-[#4B2E25]/60 block">Agreed Total</span>
            <strong className="font-serif text-xl font-bold text-[#4B2E25] block mt-0.5">
              {formatIndianCurrency(order.totalAmount)}
            </strong>
          </div>

          <div className="p-4 bg-[#FFF8EF]/50 rounded-2xl border border-[#E8D5C8]">
            <span className="text-[11px] text-[#4B2E25]/60 block">Required Deposit</span>
            <strong className="font-serif text-xl font-bold text-[#4B2E25] block mt-0.5">
              {formatIndianCurrency(order.depositAmount)}
            </strong>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
            <span className="text-[11px] text-emerald-800 block">Verified Paid</span>
            <strong className="font-serif text-xl font-bold text-emerald-900 block mt-0.5">
              {formatIndianCurrency(order.verifiedPaidAmount || 0)}
            </strong>
          </div>

          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
            <span className="text-[11px] text-amber-800 block">Outstanding Balance</span>
            <strong className="font-serif text-xl font-bold text-amber-950 block mt-0.5">
              {formatIndianCurrency(order.outstandingBalance)}
            </strong>
          </div>
        </div>

        {/* Customer Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          {/* Quote Acceptance if applicable */}
          {order.orderStatus === 'quote_sent' && (
            <button
              onClick={handleAcceptQuote}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors shadow-xs"
            >
              Accept Agreed Quote
            </button>
          )}

          {/* Submit Payment Reference */}
          {order.outstandingBalance > 0 && (
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-[#4B2E25] bg-white border border-[#E8D5C8] hover:bg-[#FFF8EF] rounded-xl transition-colors"
            >
              Submit 12-Digit UTR / Screenshot
            </button>
          )}

          {/* Request a change */}
          {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
            <button
              onClick={() => setIsChangeModalOpen(true)}
              className="px-4 py-2 text-xs font-medium text-[#4B2E25] hover:bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl transition-colors"
            >
              Request Design / Date Change
            </button>
          )}

          {/* Request cancellation */}
          {order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled' && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition-colors"
            >
              Request Cancellation
            </button>
          )}
        </div>
      </div>

      {/* IMMUTABLE AGREED SPECIFICATIONS SNAPSHOT */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
        <div>
          <h2 className="font-serif text-lg font-bold text-[#4B2E25]">Agreed Cake Specifications & Handover Details</h2>
          <p className="text-xs text-[#4B2E25]/70 mt-0.5">
            Immutable snapshot recorded upon order submission. Future catalogue updates will not alter this agreement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#4B2E25]/85">
          {/* Left Column: Cake Specs */}
          <div className="space-y-3 p-4 bg-[#FFF8EF]/30 rounded-2xl border border-[#E8D5C8]/70">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C5A15A] block">
              Cake Centerpiece Details
            </span>

            <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
              <span className="text-[#4B2E25]/60">Cake Variant:</span>
              <strong className="text-[#4B2E25]">{order.cakeName}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
              <span className="text-[#4B2E25]/60">Tier Weight:</span>
              <span className="font-medium text-[#4B2E25]">{order.weight}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
              <span className="text-[#4B2E25]/60">Signature Flavour:</span>
              <span className="font-medium text-[#4B2E25]">{order.flavour}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
              <span className="text-[#4B2E25]/60">Quantity:</span>
              <span className="font-medium text-[#4B2E25]">{order.quantity || 1} Tier</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
              <span className="text-[#4B2E25]/60">Dietary Formulation:</span>
              <span className="font-medium text-emerald-800">{order.isEggless ? '100% Eggless' : 'Regular Dairy Sponge'}</span>
            </div>

            {order.cakeMessage && (
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
                <span className="text-[#4B2E25]/60">Piped Message:</span>
                <span className="font-medium text-[#4B2E25]">"{order.cakeMessage}"</span>
              </div>
            )}

            {order.colourTheme && (
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
                <span className="text-[#4B2E25]/60">Colour Palette:</span>
                <span className="font-medium text-[#4B2E25]">{order.colourTheme}</span>
              </div>
            )}

            {order.specialInstructions && (
              <div className="pt-1">
                <span className="text-[#4B2E25]/60 block mb-0.5">Special Chef Instructions:</span>
                <p className="p-2 bg-white rounded-lg border border-[#E8D5C8]/70 text-[11px] text-[#4B2E25]">
                  {order.specialInstructions}
                </p>
              </div>
            )}

            {order.privateReferenceImages && order.privateReferenceImages.length > 0 && (
              <div className="pt-2">
                <span className="text-[#4B2E25]/60 block mb-1">Customer Private Reference Image:</span>
                <div className="flex gap-2">
                  {order.privateReferenceImages.map((url, idx) => (
                    <img key={idx} src={url} alt="Reference" className="w-16 h-16 rounded-xl object-cover border border-[#E8D5C8]" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Handover & Recipient */}
          <div className="space-y-3 p-4 bg-[#FFF8EF]/30 rounded-2xl border border-[#E8D5C8]/70">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C5A15A] block">
              Delivery / Pickup & Contact
            </span>

            <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
              <span className="text-[#4B2E25]/60">Method:</span>
              <strong className="text-[#4B2E25] capitalize">{order.deliveryOrPickup === 'delivery' ? 'Chilled Van Delivery' : 'Atelier Pickup'}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
              <span className="text-[#4B2E25]/60">Event Date:</span>
              <strong className="text-[#4B2E25]">{order.fulfilmentDate}</strong>
            </div>

            <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
              <span className="text-[#4B2E25]/60">Time Slot:</span>
              <span className="font-medium text-[#4B2E25]">{order.fulfilmentTimeSlot || 'Afternoon (1 PM - 5 PM)'}</span>
            </div>

            {!isFullyOtpVerified && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-tight">
                  <strong>Protected Privacy View:</strong> You accessed this order using reference lookup. Detailed street address and direct phone digits are shielded. Log in via verified phone OTP to access unmasked delivery records.
                </div>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
              <span className="text-[#4B2E25]/60">Customer Name:</span>
              <span className="font-medium text-[#4B2E25]">{order.customerName}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
              <span className="text-[#4B2E25]/60">Customer Phone:</span>
              <span className="font-mono text-[#4B2E25]">
                {isFullyOtpVerified ? order.customerPhone : getMaskedPhone(order.customerPhone)}
              </span>
            </div>

            {order.isGift && order.recipientName && (
              <div className="p-2.5 bg-white rounded-xl border border-[#E8D5C8]/80 text-[11px] space-y-1">
                <span className="font-bold text-[#4B2E25] flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-[#C5A15A]" />
                  Surprise Gift Delivery
                </span>
                <p>
                  Recipient: {order.recipientName} ({isFullyOtpVerified ? order.recipientPhone : getMaskedPhone(order.recipientPhone)})
                </p>
              </div>
            )}

            <div className="pt-1">
              <span className="text-[#4B2E25]/60 block mb-0.5">Destination Address:</span>
              <p className="p-2 bg-white rounded-lg border border-[#E8D5C8]/70 text-[11px] text-[#4B2E25]">
                {isFullyOtpVerified ? (order.deliveryAddress || 'Cake Junction Atelier Counter') : getMaskedAddress(order.deliveryAddress)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Direct UPI Payment Modal */}
      {isPaymentModalOpen && (
        <UpiPaymentModal
          order={order}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {/* Change Request Modal */}
      {isChangeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#FFF8EF] rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#E8D5C8] shadow-2xl relative">
            <button
              onClick={() => setIsChangeModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#4B2E25]/70 hover:text-[#4B2E25]"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-serif text-xl font-bold text-[#4B2E25]">Request Order Change</h3>
            <p className="text-xs text-[#4B2E25]/75 mt-1">
              Need to adjust your celebration date, message, or delivery address? Our bakery will review your request.
            </p>

            <form onSubmit={handleSubmitChange} className="mt-4 space-y-4">
              <textarea
                rows={4}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Describe your required change (e.g. please change delivery time to 4 PM, or change message to Happy 30th)..."
                className="w-full p-3 bg-white rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                required
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsChangeModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#4B2E25]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#4B2E25] rounded-xl hover:bg-[#38221B]"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Request Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#FFF8EF] rounded-3xl max-w-md w-full p-6 sm:p-8 border border-[#E8D5C8] shadow-2xl relative">
            <button
              onClick={() => setIsCancelModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#4B2E25]/70 hover:text-[#4B2E25]"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-serif text-xl font-bold text-red-900">Request Order Cancellation</h3>
            <p className="text-xs text-[#4B2E25]/75 mt-1">
              {settings.cancellationPolicy || 'Cancellations requested >48 hours prior to fulfilment receive 80% store credit or refund. Within 48 hours once baking has begun, cancellations cannot be guaranteed.'}
            </p>

            <form onSubmit={handleSubmitCancellation} className="mt-4 space-y-4">
              <textarea
                rows={4}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please state the reason for your cancellation request..."
                className="w-full p-3 bg-white rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-red-500"
                required
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#4B2E25]"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-red-700 rounded-xl hover:bg-red-800"
                >
                  Submit Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
