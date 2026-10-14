import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerOrder, FulfilmentStage, OrderGeneralStatus, OrderPaymentStatus } from '../types';
import { formatIndianCurrency, buildWhatsAppLink } from '../utils/whatsapp';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChefHat, 
  Package, 
  Truck, 
  ShoppingBag, 
  X, 
  Send, 
  UserCheck, 
  Ban, 
  Sparkles, 
  MessageCircle, 
  CreditCard, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  RotateCcw,
  Check,
  ShieldCheck,
  FileText
} from 'lucide-react';

export interface OrderStatusManagementPanelProps {
  order: CustomerOrder;
  onOrderUpdated?: (order: CustomerOrder) => void;
  onClose?: () => void;
  isCompact?: boolean;
}

const PRESET_REJECTION_REASONS = [
  'Kitchen baking capacity full for required delivery date',
  'Requested custom flavour or exotic ingredients out of stock',
  'Delivery venue outside temperature-controlled van perimeter',
  'Customer requested cancellation before production commenced',
  'Advance deposit verification period expired without confirmation',
  'Short lead time: artisanal creation requires min. 24 hours notice'
];

const PRESET_CANCELLATION_REASONS = [
  'Customer requested cancellation via phone / WhatsApp',
  'Customer celebration postponed / venue change',
  'Duplicate order reference submitted by customer',
  'Mutual agreement with customer per bakery terms',
  'Payment reconciliation unfulfilled / invalid transaction UTR'
];

export const OrderStatusManagementPanel: React.FC<OrderStatusManagementPanelProps> = ({
  order,
  onOrderUpdated,
  onClose,
  isCompact = false
}) => {
  const { 
    orders,
    acceptCustomerOrder, 
    rejectCustomerOrder, 
    cancelCustomerOrder, 
    updateOrderStatus, 
    updateOrderFulfilmentStage, 
    updateOrderPaymentStatus,
    showToast 
  } = useApp();

  // Fresh snapshot from state
  const liveOrder = orders.find(o => o.id === order.id) || order;

  // Active inputs
  const [customNote, setCustomNote] = useState('');
  const [actionType, setActionType] = useState<'none' | 'reject' | 'cancel'>('none');
  const [recordedReason, setRecordedReason] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPaymentControls, setShowPaymentControls] = useState(false);

  // Exception transition state
  const [exceptionStage, setExceptionStage] = useState<{ stage: FulfilmentStage; title: string } | null>(null);
  const [exceptionReasonInput, setExceptionReasonInput] = useState('');

  const currentStage = liveOrder.fulfilmentStage || liveOrder.orderStatus;
  const isAwaitingAcceptance = 
    liveOrder.orderStatus === 'awaiting_confirmation' || 
    liveOrder.fulfilmentStage === 'awaiting_confirmation' || 
    liveOrder.acceptanceStatus === 'pending_confirmation';
  const isRejected = liveOrder.orderStatus === 'rejected' || liveOrder.fulfilmentStage === 'rejected';
  const isCancelled = liveOrder.orderStatus === 'cancelled' || liveOrder.fulfilmentStage === 'cancelled';

  // Helper to trigger callback
  const notifyUpdated = () => {
    setTimeout(() => {
      const refreshed = orders.find(o => o.id === liveOrder.id);
      if (refreshed && onOrderUpdated) {
        onOrderUpdated(refreshed);
      }
    }, 50);
  };

  // 1. Accept Order Handler
  const handleAccept = () => {
    setIsSubmitting(true);
    try {
      acceptCustomerOrder(liveOrder.id, customNote.trim() || undefined);
      setCustomNote('');
      notifyUpdated();
    } catch (err: any) {
      showToast(err.message || 'Error accepting order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Reject Order Handler (records reason on backend)
  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordedReason.trim()) {
      showToast('A recorded rejection reason is required.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      rejectCustomerOrder(liveOrder.id, recordedReason.trim());
      setRecordedReason('');
      setActionType('none');
      notifyUpdated();
    } catch (err: any) {
      showToast(err.message || 'Error rejecting order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Cancel Order Handler (records reason on backend)
  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordedReason.trim()) {
      showToast('A recorded cancellation reason is required.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      cancelCustomerOrder(liveOrder.id, recordedReason.trim());
      setRecordedReason('');
      setActionType('none');
      notifyUpdated();
    } catch (err: any) {
      showToast(err.message || 'Error cancelling order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Advance Stage Handler
  const handleStageTransition = (stage: FulfilmentStage, title: string) => {
    setIsSubmitting(true);
    try {
      updateOrderFulfilmentStage(liveOrder.id, stage, title, customNote.trim() || undefined);
      setCustomNote('');
      notifyUpdated();
      showToast(`Order #${liveOrder.orderNumber} updated: ${title}`, 'success');
    } catch (err: any) {
      if (err.message && err.message.includes('Exceptional transition')) {
        setExceptionStage({ stage, title });
      } else {
        showToast(err.message || 'Error updating stage', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Confirm Exception Stage Jump Handler
  const handleConfirmExceptionJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exceptionStage) return;
    if (!exceptionReasonInput.trim()) {
      showToast('Please provide an explicit reason for skipping sequential stages.', 'error');
      return;
    }
    try {
      updateOrderFulfilmentStage(
        liveOrder.id, 
        exceptionStage.stage, 
        exceptionStage.title, 
        customNote.trim() || undefined,
        exceptionReasonInput.trim()
      );
      setExceptionStage(null);
      setExceptionReasonInput('');
      setCustomNote('');
      notifyUpdated();
      showToast(`Stage jump authorized for #${liveOrder.orderNumber}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update stage', 'error');
    }
  };

  // 6. Payment Status Handler
  const handlePaymentChange = (status: OrderPaymentStatus) => {
    try {
      updateOrderPaymentStatus(liveOrder.id, status);
      notifyUpdated();
      showToast(`Payment status updated to ${status.replace(/_/g, ' ')}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating payment status', 'error');
    }
  };

  const whatsappNotificationUrl = buildWhatsAppLink(
    liveOrder.customerPhone,
    `Hello ${liveOrder.customerName}, update regarding your Cake Junction order #${liveOrder.orderNumber}: Status is "${(liveOrder.fulfilmentStage || liveOrder.orderStatus).replace(/_/g, ' ')}". ${liveOrder.latestUpdateMessage || ''}`
  );

  return (
    <div className={`bg-[#FFF8EF] rounded-3xl border border-[#E8D5C8] p-5 sm:p-6 space-y-6 shadow-xs ${isCompact ? 'text-xs' : ''}`}>
      
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8D5C8]/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-[#4B2E25] text-white">
              Status Control Panel
            </span>
            <span className="font-mono font-bold text-sm text-[#4B2E25]">
              #{liveOrder.orderNumber}
            </span>
            <span className="text-xs text-[#4B2E25]/60">· {liveOrder.customerName}</span>
          </div>
          <p className="text-xs text-[#4B2E25]/70 mt-1">
            Authoritative owner control. Status changes immediately broadcast to the customer live tracker and update database records.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {whatsappNotificationUrl && (
            <a
              href={whatsappNotificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl transition-colors shadow-2xs"
              title="Notify Customer via WhatsApp"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700" />
            </a>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-[#4B2E25]/70 hover:text-[#4B2E25] bg-white rounded-full border border-[#E8D5C8]"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Current Status Badge Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded-2xl border border-[#E8D5C8]/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B2E25]/60 block mb-0.5">
            Fulfilment Stage
          </span>
          <span className="font-bold text-xs text-[#4B2E25] capitalize">
            {(liveOrder.fulfilmentStage || liveOrder.orderStatus).replace(/_/g, ' ')}
          </span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-[#E8D5C8]/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B2E25]/60 block mb-0.5">
            Acceptance State
          </span>
          <span className={`font-bold text-xs capitalize ${
            isAwaitingAcceptance 
              ? 'text-amber-800 font-bold' 
              : isRejected 
                ? 'text-rose-800' 
                : isCancelled 
                  ? 'text-neutral-700' 
                  : 'text-emerald-800'
          }`}>
            {liveOrder.acceptanceStatus ? liveOrder.acceptanceStatus.replace(/_/g, ' ') : (isAwaitingAcceptance ? 'Pending Confirmation' : 'Accepted')}
          </span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-[#E8D5C8]/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B2E25]/60 block mb-0.5">
            Payment Status
          </span>
          <span className="font-bold text-xs text-[#4B2E25] capitalize">
            {liveOrder.paymentStatus.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-[#E8D5C8]/80 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B2E25]/60 block mb-0.5">
            Delivery Method
          </span>
          <span className="font-bold text-xs text-[#4B2E25]">
            {liveOrder.deliveryOrPickup === 'delivery' ? 'Chilled Van' : 'Atelier Pickup'}
          </span>
        </div>
      </div>

      {/* RECORDED REJECTION ALERT (IF REJECTED) */}
      {isRejected && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-rose-900">
            <Ban className="w-4 h-4 text-rose-600 shrink-0" />
            <span>TERMINAL STATUS: ORDER REJECTED BY ATELIER</span>
          </div>
          <p className="text-xs text-rose-900/90 leading-relaxed">
            <strong>Recorded Rejection Reason:</strong> {liveOrder.rejectionReason || 'Bakery slot could not be accommodated.'}
          </p>
          <div className="text-[10px] text-rose-800/80 font-mono">
            Recorded by: {liveOrder.rejectedBy || 'Bakery Owner'} {liveOrder.rejectedAt ? `on ${new Date(liveOrder.rejectedAt).toLocaleString('en-IN')}` : ''}
          </div>
        </div>
      )}

      {/* RECORDED CANCELLATION ALERT (IF CANCELLED) */}
      {isCancelled && (
        <div className="p-4 bg-neutral-100 border-2 border-neutral-300 rounded-2xl text-neutral-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-neutral-800">
            <AlertCircle className="w-4 h-4 text-neutral-600 shrink-0" />
            <span>TERMINAL STATUS: ORDER CANCELLED</span>
          </div>
          <p className="text-xs text-neutral-800 leading-relaxed">
            <strong>Recorded Cancellation Reason:</strong> {liveOrder.cancellationReason || 'Order cancelled per customer request or bakery policy.'}
          </p>
          <div className="text-[10px] text-neutral-600 font-mono">
            Recorded by: {liveOrder.cancelledBy || 'Bakery Owner'} {liveOrder.cancelledAt ? `on ${new Date(liveOrder.cancelledAt).toLocaleString('en-IN')}` : ''}
          </div>
        </div>
      )}

      {/* SECTION 1: PRIMARY ORDER ACCEPTANCE (FOR NEW ORDERS) */}
      {isAwaitingAcceptance && !isRejected && !isCancelled && (
        <div className="bg-amber-50 rounded-2xl p-4 sm:p-5 border-2 border-amber-300 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
            <Clock className="w-4 h-4 text-amber-700" />
            <span>Pending Kitchen Review & Acceptance</span>
          </div>
          <p className="text-xs text-amber-900/90">
            Verify ingredients and prep capacity for {liveOrder.fulfilmentDate}. Accepting reserves an official baking slot.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleAccept}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>Accept Order & Schedule Production</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActionType('reject');
                setSelectedPreset('');
                setRecordedReason('');
              }}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              <span>Reject Order with Recorded Reason</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: STAGE PROGRESSION CONTROLS (IF ACTIVE) */}
      {!isRejected && !isCancelled && (
        <div className="bg-white rounded-2xl p-5 border border-[#E8D5C8] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8D5C8]/60">
            <div>
              <h4 className="font-serif text-sm font-bold text-[#4B2E25]">Kitchen Stage Progression</h4>
              <p className="text-xs text-[#4B2E25]/60">Click any stage to update the backend and trigger live customer sync.</p>
            </div>
            <span className="text-[11px] text-[#4B2E25] bg-[#FFF8EF] px-2.5 py-1 rounded-lg border border-[#C5A15A]">
              Current: <strong className="capitalize">{currentStage.replace(/_/g, ' ')}</strong>
            </span>
          </div>

          {/* Quick Stage Progression Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            
            {/* Step 1: Placed / Confirmed */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleStageTransition('confirmed', 'Order Confirmed & Baking Scheduled')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                currentStage === 'confirmed' 
                  ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300' 
                  : 'bg-[#FFF8EF]/50 hover:bg-[#FFF8EF] border-[#E8D5C8] text-[#4B2E25]'
              }`}
            >
              <span className="text-[10px] font-bold block text-[#C5A15A] uppercase">Stage 1</span>
              <strong className="text-xs block">Confirmed</strong>
              <span className="text-[10px] text-[#4B2E25]/60 block mt-0.5">Baking Scheduled</span>
            </button>

            {/* Step 2: Preparing */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleStageTransition('preparing', 'Mise en Place & Ingredients Preparation')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                currentStage === 'preparing' 
                  ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300' 
                  : 'bg-[#FFF8EF]/50 hover:bg-[#FFF8EF] border-[#E8D5C8] text-[#4B2E25]'
              }`}
            >
              <span className="text-[10px] font-bold block text-[#C5A15A] uppercase">Stage 2</span>
              <strong className="text-xs block">Mise en Place</strong>
              <span className="text-[10px] text-[#4B2E25]/60 block mt-0.5">Prep Ingredients</span>
            </button>

            {/* Step 3: Baking */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleStageTransition('baking', 'Sponges in Baking Oven')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                currentStage === 'baking' 
                  ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300' 
                  : 'bg-[#FFF8EF]/50 hover:bg-[#FFF8EF] border-[#E8D5C8] text-[#4B2E25]'
              }`}
            >
              <span className="text-[10px] font-bold block text-[#C5A15A] uppercase">Stage 3</span>
              <strong className="text-xs block">In Oven</strong>
              <span className="text-[10px] text-[#4B2E25]/60 block mt-0.5">Baking Sponges</span>
            </button>

            {/* Step 4: Decorating */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleStageTransition('decorating', 'Hand-Piping & Ganache Masking')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                currentStage === 'decorating' 
                  ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300' 
                  : 'bg-[#FFF8EF]/50 hover:bg-[#FFF8EF] border-[#E8D5C8] text-[#4B2E25]'
              }`}
            >
              <span className="text-[10px] font-bold block text-[#C5A15A] uppercase">Stage 4</span>
              <strong className="text-xs block">Decorating</strong>
              <span className="text-[10px] text-[#4B2E25]/60 block mt-0.5">Hand-Piping & Art</span>
            </button>

            {/* Step 5: Quality Check */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleStageTransition('quality_check', 'Pastry Chef Final Quality Check')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                currentStage === 'quality_check' 
                  ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300' 
                  : 'bg-[#FFF8EF]/50 hover:bg-[#FFF8EF] border-[#E8D5C8] text-[#4B2E25]'
              }`}
            >
              <span className="text-[10px] font-bold block text-[#C5A15A] uppercase">Stage 5</span>
              <strong className="text-xs block">Quality Inspection</strong>
              <span className="text-[10px] text-[#4B2E25]/60 block mt-0.5">Chamber Inspection</span>
            </button>

            {/* Step 6: Ready */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleStageTransition('ready', 'Chilled & Packed in Presentation Box')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                currentStage === 'ready' 
                  ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300' 
                  : 'bg-[#FFF8EF]/50 hover:bg-[#FFF8EF] border-[#E8D5C8] text-[#4B2E25]'
              }`}
            >
              <span className="text-[10px] font-bold block text-[#C5A15A] uppercase">Stage 6</span>
              <strong className="text-xs block">Packed & Ready</strong>
              <span className="text-[10px] text-[#4B2E25]/60 block mt-0.5">Temperature-Safe Box</span>
            </button>

            {/* Step 7: Out for delivery / Ready for pickup */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleStageTransition(
                liveOrder.deliveryOrPickup === 'pickup' ? 'ready_for_pickup' : 'out_for_delivery',
                liveOrder.deliveryOrPickup === 'pickup' ? 'Ready for Counter Handover' : 'Dispatched in Dedicated Chilled Van'
              )}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                currentStage === 'out_for_delivery' || currentStage === 'ready_for_pickup'
                  ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300' 
                  : 'bg-[#FFF8EF]/50 hover:bg-[#FFF8EF] border-[#E8D5C8] text-[#4B2E25]'
              }`}
            >
              <span className="text-[10px] font-bold block text-[#C5A15A] uppercase">Stage 7</span>
              <strong className="text-xs block">
                {liveOrder.deliveryOrPickup === 'pickup' ? 'Ready for Pickup' : 'Out for Delivery'}
              </strong>
              <span className="text-[10px] text-[#4B2E25]/60 block mt-0.5">
                {liveOrder.deliveryOrPickup === 'pickup' ? 'At Atelier Counter' : 'Chilled Van En Route'}
              </span>
            </button>

            {/* Step 8: Completed */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleStageTransition('completed', 'Order Completed Successfully')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                currentStage === 'completed' || currentStage === 'delivered' || currentStage === 'picked_up'
                  ? 'bg-emerald-800 border-emerald-900 text-white shadow-xs' 
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900'
              }`}
            >
              <span className="text-[10px] font-bold block text-emerald-600 uppercase">Stage 8</span>
              <strong className="text-xs block">Mark Completed</strong>
              <span className="text-[10px] opacity-75 block mt-0.5">Delivered / Handed Over</span>
            </button>

          </div>

          {/* Custom Baker Note */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-[#4B2E25] mb-1">
              Custom Baker Note for Customer (Optional):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="e.g. Sponges layered with Belgian ganache, now resting in conditioning chamber."
                className="flex-1 px-3.5 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] bg-[#FFF8EF]/40 focus:ring-2 focus:ring-[#C5A15A]"
              />
              {customNote.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    updateOrderStatus(liveOrder.id, liveOrder.orderStatus, customNote.trim());
                    setCustomNote('');
                    notifyUpdated();
                    showToast('Customer update note recorded', 'success');
                  }}
                  className="px-3 py-2 bg-[#4B2E25] text-white rounded-xl text-xs font-semibold hover:bg-[#38221B] shadow-2xs"
                >
                  Send Note
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: REJECTION & CANCELLATION PANEL (RECORD REASON IN BACKEND) */}
      {actionType !== 'none' ? (
        <form 
          onSubmit={actionType === 'reject' ? handleConfirmReject : handleConfirmCancel}
          className="bg-rose-50/90 rounded-2xl p-5 border-2 border-rose-300 space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-950 font-bold text-xs">
              <Ban className="w-4 h-4 text-rose-700" />
              <span>
                {actionType === 'reject' ? 'Record Order Rejection Reason' : 'Record Order Cancellation Reason'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActionType('none');
                setRecordedReason('');
                setSelectedPreset('');
              }}
              className="text-rose-700 hover:text-rose-950 text-xs font-medium"
            >
              Dismiss
            </button>
          </div>

          <p className="text-xs text-rose-900/90">
            This reason will be securely saved into the database order record, logged in the audit trail, and displayed on the customer's order tracking page.
          </p>

          {/* Quick Preset Reason Chips */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-950 mb-1.5">
              Select Preset Reason:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(actionType === 'reject' ? PRESET_REJECTION_REASONS : PRESET_CANCELLATION_REASONS).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset);
                    setRecordedReason(preset);
                  }}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border transition-colors ${
                    selectedPreset === preset
                      ? 'bg-rose-700 text-white border-rose-700 font-semibold'
                      : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Reason Textarea */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-950 mb-1">
              Authoritative Reason (Editable):
            </label>
            <textarea
              rows={2}
              value={recordedReason}
              onChange={(e) => setRecordedReason(e.target.value)}
              placeholder="Provide clear explanation for the customer..."
              className="w-full px-3.5 py-2 rounded-xl border border-rose-300 text-xs text-rose-950 bg-white focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting || !recordedReason.trim()}
              className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" />
              <span>
                {actionType === 'reject' ? 'Trigger Rejection & Save Reason' : 'Trigger Cancellation & Save Reason'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActionType('none');
                setRecordedReason('');
              }}
              className="px-4 py-2.5 bg-white text-rose-900 border border-rose-300 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* Action Strip to open Reject/Cancel forms if not already terminal */
        !isRejected && !isCancelled && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8D5C8]/60 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActionType('reject');
                  setSelectedPreset('');
                  setRecordedReason('');
                }}
                className="text-rose-700 hover:text-rose-900 font-semibold underline"
              >
                Reject Order (Record Reason)
              </button>
              <span className="text-[#4B2E25]/30">·</span>
              <button
                type="button"
                onClick={() => {
                  setActionType('cancel');
                  setSelectedPreset('');
                  setRecordedReason('');
                }}
                className="text-neutral-700 hover:text-neutral-900 font-semibold underline"
              >
                Cancel Order (Record Reason)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPaymentControls(p => !p)}
              className="text-[#4B2E25] font-semibold hover:underline inline-flex items-center gap-1"
            >
              <CreditCard className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>Manage Payment Status ({liveOrder.paymentStatus})</span>
              {showPaymentControls ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        )
      )}

      {/* SECTION 4: PAYMENT STATUS MANAGEMENT */}
      {showPaymentControls && (
        <div className="p-4 bg-white rounded-2xl border border-[#E8D5C8] space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h5 className="font-serif text-xs font-bold text-[#4B2E25]">Payment Reconciliation Control</h5>
            <span className="font-mono text-xs font-bold text-[#4B2E25]">
              Total: {formatIndianCurrency(liveOrder.totalAmount)} · Balance: {formatIndianCurrency(liveOrder.outstandingBalance)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'unpaid', label: 'Mark Unpaid' },
              { id: 'verification_pending', label: 'Verification Pending' },
              { id: 'deposit_verified', label: 'Deposit Verified' },
              { id: 'fully_paid', label: 'Fully Paid (UPI / Online)' },
              { id: 'paid', label: 'COD Cash Collected' },
              { id: 'refunded', label: 'Mark Refunded' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePaymentChange(p.id as OrderPaymentStatus)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  liveOrder.paymentStatus === p.id
                    ? 'bg-[#4B2E25] text-white border-[#4B2E25]'
                    : 'bg-[#FFF8EF] text-[#4B2E25] border-[#E8D5C8] hover:bg-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: AUDIT LOG & HISTORICAL MILESTONES */}
      {liveOrder.fulfilmentHistory && liveOrder.fulfilmentHistory.length > 0 && (
        <div className="pt-2 border-t border-[#E8D5C8]/70">
          <button
            type="button"
            onClick={() => setShowHistory(p => !p)}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#4B2E25] hover:text-[#C5A15A] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>Authoritative History ({liveOrder.fulfilmentHistory.length} event{liveOrder.fulfilmentHistory.length > 1 ? 's' : ''})</span>
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="space-y-2 pt-3 max-h-48 overflow-y-auto pr-1 animate-fade-in">
              {liveOrder.fulfilmentHistory.map((entry, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-white rounded-xl border border-[#E8D5C8]/70 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#C5A15A] mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-[#4B2E25]">{entry.title}</strong>
                      <span className="text-[10px] text-[#4B2E25]/60 font-mono">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {entry.message && <p className="text-[#4B2E25]/80 mt-0.5">{entry.message}</p>}
                    <span className="text-[10px] text-[#4B2E25]/50 block mt-0.5">Authorised by {entry.updatedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EXCEPTION STAGE MODAL */}
      {exceptionStage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleConfirmExceptionJump}
            className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E8D5C8] space-y-4 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Authorize Non-Sequential Stage Jump</span>
            </div>
            <p className="text-xs text-[#4B2E25]/80 leading-relaxed">
              Jumping from <strong>{currentStage.replace(/_/g, ' ')}</strong> directly to <strong>{exceptionStage.title}</strong> bypasses intermediate milestones. A recorded explanation is required for governance.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">
                Reason for Stage Jump:
              </label>
              <textarea
                rows={2}
                value={exceptionReasonInput}
                onChange={(e) => setExceptionReasonInput(e.target.value)}
                placeholder="e.g. Express same-day counter pickup with pre-baked base."
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExceptionStage(null)}
                className="px-4 py-2 text-xs font-medium text-[#4B2E25] border border-[#E8D5C8] rounded-xl hover:bg-[#FFF8EF]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#4B2E25] rounded-xl hover:bg-[#38221B]"
              >
                Confirm Jump
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
