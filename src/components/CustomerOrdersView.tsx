import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatIndianCurrency } from '../utils/whatsapp';
import { CustomerOrder } from '../types';
import { 
  ShoppingBag, 
  Home,
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard,
  Phone,
  Search,
  ArrowRight,
  ShieldCheck,
  Eye,
  Filter,
  Loader2,
  RotateCw,
  Sparkles,
  Download,
  FileText,
  Mail
} from 'lucide-react';
import { validateAndNormalizeIndianPhone, formatLivePhoneInput } from '../utils/phoneAuth';
import { useRealtimeOrderSubscription } from '../services/realtimeOrderSync';
import { OrderTrackingTimeline } from './OrderTrackingTimeline';

export const CustomerOrdersView: React.FC = () => {
  const { 
    orders, 
    currentUser, 
    sessionAuthorizedOrders, 
    loginAsCustomerPhone, 
    requestCustomerOtp, 
    verifyOrderLookup, 
    navigateTo,
    downloadOrderInvoice,
    setIsCartOpen,
    cartTotalCount,
    t 
  } = useApp();

  const [, setRealtimeTick] = useState(0);

  // Subscribe to real-time order synchronisation across all session authorized orders
  useRealtimeOrderSubscription(
    sessionAuthorizedOrders.length > 0 ? sessionAuthorizedOrders[0] : (orders[0]?.id || 'global'),
    () => {
      setRealtimeTick(t => t + 1);
    }
  );

  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('active');
  
  // Verification form states for guest visitors
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [isUnconfigured, setIsUnconfigured] = useState(false);

  // Quick order number lookup with multi-factor identity verification
  const [orderNumberLookup, setOrderNumberLookup] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [matchedOrder, setMatchedOrder] = useState<CustomerOrder | null>(null);
  const [verificationFactorType, setVerificationFactorType] = useState<'email' | 'security_pin' | 'sms_otp'>('email');
  const [verificationFactorValue, setVerificationFactorValue] = useState('');
  const [verificationFactorError, setVerificationFactorError] = useState<string | null>(null);
  const [isVerifyingFactor, setIsVerifyingFactor] = useState(false);
  const [lookupSmsSent, setLookupSmsSent] = useState(false);
  const [lookupSmsOtp, setLookupSmsOtp] = useState('');
  const [lookupSmsNotice, setLookupSmsNotice] = useState<string | null>(null);
  const [lookupSmsCooldown, setLookupSmsCooldown] = useState(0);
  const [expandedTimelineOrderId, setExpandedTimelineOrderId] = useState<string | null>(null);

  // Cooldown countdown
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Determine authorized orders
  const isCustomerLoggedIn = currentUser.role === 'customer' && (!!currentUser.phone || !!currentUser.email);
  const cleanCustomerPhone = currentUser.phone ? currentUser.phone.replace(/\D/g, '').slice(-10) : '';
  const cleanCustomerEmail = currentUser.email ? currentUser.email.trim().toLowerCase() : '';

  const visibleOrders = orders.filter(o => {
    if (currentUser.role === 'admin' || currentUser.role === 'owner') return true;
    if (sessionAuthorizedOrders.includes(o.id) || sessionAuthorizedOrders.includes(o.orderNumber)) return true;
    if (isCustomerLoggedIn) {
      if (cleanCustomerPhone && o.customerPhone.replace(/\D/g, '').slice(-10) === cleanCustomerPhone) return true;
      if (cleanCustomerEmail && o.customerEmail && o.customerEmail.trim().toLowerCase() === cleanCustomerEmail) return true;
    }
    return false;
  });

  // Filter based on tab
  const filteredOrders = visibleOrders.filter(order => {
    if (activeTabFilter === 'all') return true;
    if (activeTabFilter === 'completed') {
      return order.orderStatus === 'completed';
    }
    if (activeTabFilter === 'cancelled') {
      return order.orderStatus === 'cancelled' || order.paymentStatus === 'refunded';
    }
    if (activeTabFilter === 'active') {
      return order.orderStatus !== 'completed' && order.orderStatus !== 'cancelled';
    }
    return true;
  });

  const phoneValidation = validateAndNormalizeIndianPhone(phoneInput);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setSuccessNotice(null);
    setIsUnconfigured(false);

    if (!phoneValidation.isValid) {
      setAuthError(phoneValidation.errorMessage || 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await requestCustomerOtp(phoneInput);
      setIsLoading(false);

      if (res.success) {
        setOtpSent(true);
        setSuccessNotice(res.message);
        setCooldownSeconds(res.canRetryAfterSeconds || 60);
        setAttemptsRemaining(4);
      } else {
        if (res.status === 'unconfigured') {
          setIsUnconfigured(true);
        }
        setAuthError(res.message);
        if (res.canRetryAfterSeconds && res.canRetryAfterSeconds > 0) {
          setCooldownSeconds(res.canRetryAfterSeconds);
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setAuthError(err.message || 'Network error requesting OTP.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanOtp = otpInput.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      setAuthError('Please enter the full 6-digit numeric verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginAsCustomerPhone(phoneInput, cleanOtp);
      setIsLoading(false);

      if (!res.success) {
        setAuthError(res.message);
        if (res.remainingAttempts !== undefined) {
          setAttemptsRemaining(res.remainingAttempts);
        }
        if (res.status === 'max_attempts_exceeded' || res.status === 'expired') {
          setOtpInput('');
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setAuthError(err.message || 'Error verifying OTP code.');
    }
  };

  const handleOrderLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    if (!orderNumberLookup.trim() || !lookupPhone.trim()) {
      setLookupError('Please provide both your order reference and registered email or phone number.');
      return;
    }
    const found = verifyOrderLookup(orderNumberLookup.trim(), lookupPhone.trim());
    if (found) {
      navigateTo('order-detail', { orderId: found.id });
    } else {
      setLookupError('No matching order found for this combination.');
    }
  };

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
      default:
        return 'text-neutral-900 bg-neutral-100 border-neutral-300';
    }
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      
      {/* View Header with Home and Cart Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => navigateTo('home')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4B2E25] bg-white hover:bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl shadow-2xs transition-colors"
              title="Return to Home"
            >
              <Home className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>Home</span>
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4B2E25] bg-white hover:bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl shadow-2xs transition-colors"
              title="Open Shopping Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>Cart</span>
              {cartTotalCount > 0 && (
                <span className="font-mono text-[#C5A15A] font-bold">({cartTotalCount})</span>
              )}
            </button>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#4B2E25]">
            My Orders & Tracking
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#4B2E25]/75">
            Monitor real-time baking milestones, view invoices, and submit UPI payments.
          </p>
        </div>

        {currentUser.role === 'customer' && (
          <div className="text-xs text-[#4B2E25]/80 bg-white px-3.5 py-2 rounded-xl border border-[#E8D5C8] shadow-2xs self-start sm:self-auto">
            Logged in as: <strong className="text-[#4B2E25] font-mono">{currentUser.email || currentUser.phone || currentUser.name}</strong>
          </div>
        )}
      </div>

      {/* Guest Authentication / Verification Prompt (if not logged in and has 0 session orders) */}
      {!isCustomerLoggedIn && visibleOrders.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option A: Customer Account Sign In (Email / Phone) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 text-[#C5A15A]">
              <Mail className="w-5 h-5 text-[#C5A15A]" />
              <h3 className="font-serif text-lg font-bold text-[#4B2E25]">Customer Account Sign In</h3>
            </div>
            <p className="text-xs text-[#4B2E25]/75">
              Sign in with your customer email or mobile number to view and manage your complete order history.
            </p>

            {!otpSent ? (
              <form onSubmit={(e) => handleSendOtp(e)} className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4B2E25]/60">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={14}
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(formatLivePhoneInput(e.target.value))}
                    placeholder="98765 43210"
                    className="w-full pl-11 pr-3 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs font-mono text-[#4B2E25] focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                    required
                    disabled={isLoading}
                  />
                </div>
                {phoneInput.length > 0 && phoneValidation.displayPhone && (
                  <p className="text-[11px] text-[#4B2E25]/65">
                    Target: <span className="font-mono font-semibold text-[#4B2E25]">{phoneValidation.displayPhone}</span>
                  </p>
                )}
                {authError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-[11px] rounded-xl flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p>{authError}</p>
                      {isUnconfigured && (
                        <p className="mt-1 font-medium text-red-700">
                          Tip: Use <strong>Option B (Direct Order Lookup)</strong> below to track with Order ID & phone immediately.
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading || (cooldownSeconds > 0)}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5A15A]" />
                      <span>Requesting OTP...</span>
                    </>
                  ) : cooldownSeconds > 0 ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-[#C5A15A]" />
                      <span>Resend in {cooldownSeconds}s</span>
                    </>
                  ) : (
                    <span>Send OTP Verification Code</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3 animate-fade-in">
                {successNotice && (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    {successNotice}
                  </p>
                )}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-[#4B2E25]/70">Enter 6-Digit Code</label>
                    {attemptsRemaining !== null && (
                      <span className="text-[10px] text-[#4B2E25]/60">{attemptsRemaining} attempts left</span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25] text-center font-mono font-bold tracking-widest focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                  <p className="mt-1 text-[10px] text-[#4B2E25]/60 text-center">
                    Code expires in 5 minutes.
                  </p>
                </div>
                {authError && (
                  <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">{authError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpInput(''); setAuthError(null); }}
                    className="flex-1 py-2 text-xs font-medium text-[#4B2E25] bg-neutral-100 hover:bg-neutral-200 rounded-xl"
                  >
                    Change Number
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || otpInput.length !== 6}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Verify & Access</span>}
                  </button>
                </div>

                {/* Resend button */}
                <div className="text-center pt-1">
                  {cooldownSeconds > 0 ? (
                    <span className="text-[10px] text-[#4B2E25]/60">Resend code available in {cooldownSeconds}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      className="text-[10px] text-[#4B2E25] font-semibold underline hover:text-[#C5A15A] inline-flex items-center gap-1"
                    >
                      <RotateCw className="w-2.5 h-2.5" />
                      <span>Resend OTP SMS</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Option B: Direct Single Order Lookup */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 text-[#C5A15A]">
              <Search className="w-5 h-5" />
              <h3 className="font-serif text-lg font-bold text-[#4B2E25]">Direct Order Lookup</h3>
            </div>
            <p className="text-xs text-[#4B2E25]/75">
              Have a specific order number (e.g. ORD-2026-801)? Look it up directly.
            </p>

            <form onSubmit={handleOrderLookup} className="space-y-3">
              <input
                type="text"
                value={orderNumberLookup}
                onChange={(e) => setOrderNumberLookup(e.target.value)}
                placeholder="Order Number (e.g. ORD-2026-801)"
                className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] uppercase font-mono"
                required
              />
              <input
                type="text"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                placeholder="Your registered email or 10-digit mobile number"
                className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                required
              />
              {lookupError && <p className="text-xs text-red-600">{lookupError}</p>}
              <button
                type="submit"
                className="w-full py-2.5 text-xs font-semibold text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] hover:bg-white rounded-xl transition-colors"
              >
                Find My Order
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Filter Tabs (Active, Completed, Cancelled, All) */}
      {visibleOrders.length > 0 && (
        <div className="flex items-center gap-2 border-b border-[#E8D5C8]/80 pb-3 overflow-x-auto">
          {[
            { id: 'active', label: 'Active Orders' },
            { id: 'completed', label: 'Completed' },
            { id: 'cancelled', label: 'Cancelled' },
            { id: 'all', label: 'All Orders' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabFilter(tab.id as typeof activeTabFilter)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
                activeTabFilter === tab.id
                  ? 'bg-[#4B2E25] text-white shadow-xs'
                  : 'bg-white text-[#4B2E25]/75 hover:bg-[#FFF8EF] border border-[#E8D5C8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <div 
              key={order.id}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-4 hover:shadow-sm transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8D5C8]/70">
                <div className="flex items-start gap-4">
                  {order.cakeThumbnail && (
                    <img
                      src={order.cakeThumbnail}
                      alt={order.cakeName}
                      className="w-16 h-16 rounded-2xl object-cover border border-[#E8D5C8]/80 shrink-0"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm font-bold text-[#4B2E25]">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-[#4B2E25]/50">·</span>
                      <span className="text-xs text-[#4B2E25]/70">
                        Target Date: <strong>{order.fulfilmentDate}</strong>
                      </span>
                    </div>

                    <h3 className="font-serif text-lg sm:text-xl font-bold text-[#4B2E25] mt-1">
                      {order.cakeName}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  {order.invoiceNumber && (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-lg border bg-amber-50/70 border-amber-200 text-amber-900 inline-flex items-center gap-1 font-mono">
                      <FileText className="w-3 h-3 text-[#C5A15A]" />
                      <span>{order.invoiceNumber}</span>
                    </span>
                  )}
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border capitalize ${paymentBadgeStyle(order.paymentStatus)}`}>
                    Payment: {order.paymentStatus.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2.5 py-1 text-xs font-medium rounded-lg border bg-[#FFF8EF] border-[#E8D5C8] text-[#4B2E25] capitalize">
                    Stage: {(order.fulfilmentStage || order.orderStatus).replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Order specifics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-xs text-[#4B2E25]/80">
                <div>
                  <span className="block text-[#4B2E25]/60">Tier Flavour</span>
                  <strong className="text-[#4B2E25]">{order.flavour}</strong>
                </div>
                <div>
                  <span className="block text-[#4B2E25]/60">Weight</span>
                  <strong className="text-[#4B2E25]">{order.weight}</strong>
                </div>
                <div>
                  <span className="block text-[#4B2E25]/60">Total Amount</span>
                  <strong className="text-[#4B2E25]">{formatIndianCurrency(order.totalAmount)}</strong>
                </div>
                <div>
                  <span className="block text-[#4B2E25]/60">Outstanding Balance</span>
                  <strong className={order.outstandingBalance > 0 ? "text-amber-900" : "text-emerald-900"}>
                    {formatIndianCurrency(order.outstandingBalance)}
                  </strong>
                </div>
              </div>

              {/* Action bar */}
              <div className="pt-4 border-t border-[#E8D5C8]/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <span className="text-xs text-[#4B2E25]/70">
                  {order.deliveryOrPickup === 'delivery' ? 'Doorstep Chilled Van' : 'Atelier Pickup'} · {order.customerName}
                </span>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => downloadOrderInvoice(order.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-[#4B2E25] bg-white border border-[#E8D5C8] hover:bg-[#FFF8EF] rounded-xl transition-colors shadow-2xs"
                    title="Download official A4 PDF tax invoice & receipt"
                  >
                    <Download className="w-3.5 h-3.5 text-[#C5A15A]" />
                    <span>Download Invoice (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedTimelineOrderId(prev => prev === order.id ? null : order.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-[#4B2E25] bg-white border border-[#E8D5C8] hover:bg-[#FFF8EF] rounded-xl transition-colors shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A15A]" />
                    <span>{expandedTimelineOrderId === order.id ? 'Hide Live Timeline' : 'Track Live Timeline'}</span>
                  </button>

                  <button
                    onClick={() => navigateTo('order-detail', { orderId: order.id })}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
                  >
                    <Eye className="w-4 h-4 text-[#C5A15A]" />
                    <span>Full Details & Receipt</span>
                  </button>
                </div>
              </div>

              {/* Expandable Real-time Progress Timeline */}
              {expandedTimelineOrderId === order.id && (
                <div className="mt-4 pt-4 border-t border-[#E8D5C8]/80 bg-[#FFF8EF]/50 rounded-2xl p-4 sm:p-6 animate-fade-in">
                  <OrderTrackingTimeline order={order} />
                </div>
              )}
            </div>
          ))
        ) : visibleOrders.length > 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-[#E8D5C8] p-8">
            <ShoppingBag className="w-10 h-10 text-[#C5A15A] mx-auto mb-3" />
            <h3 className="font-serif text-lg font-bold text-[#4B2E25]">No Orders in "{activeTabFilter}"</h3>
            <p className="mt-1 text-xs text-[#4B2E25]/70 max-w-sm mx-auto">
              You do not have any orders matching the selected filter.
            </p>
          </div>
        ) : null}
      </div>

    </div>
  );
};
