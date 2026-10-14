import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerOrder, FulfilmentStage, OrderGeneralStatus } from '../types';
import { formatIndianCurrency, buildWhatsAppLink } from '../utils/whatsapp';
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Phone, 
  Search, 
  ArrowRight, 
  ChevronRight, 
  Truck, 
  MapPin, 
  X, 
  Printer, 
  FileText, 
  Sparkles, 
  MessageCircle,
  Eye,
  Check,
  Send,
  Gift,
  ShieldCheck,
  RotateCcw,
  Ban,
  UserCheck,
  Sliders,
  ChevronDown,
  ChevronUp,
  Download,
  Mail,
  RotateCw,
  Loader2
} from 'lucide-react';
import { OrderStatusManagementPanel } from './OrderStatusManagementPanel';

export const AdminOrdersManager: React.FC = () => {
  const { 
    orders, 
    settings, 
    acceptCustomerOrder,
    rejectCustomerOrder,
    cancelCustomerOrder,
    updateOrderStatus, 
    updateOrderFulfilmentStage, 
    updateOrderPaymentStatus, 
    reviewOrderChangeRequest, 
    downloadOrderInvoice,
    addAuditLog,
    showToast 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Stage advancement form inside modal
  const [customStageNote, setCustomStageNote] = useState('');
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Rejection modal state
  const [rejectModalOrder, setRejectModalOrder] = useState<CustomerOrder | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Cancellation modal state
  const [cancelModalOrder, setCancelModalOrder] = useState<CustomerOrder | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  // Exception transition reason modal
  const [exceptionJumpStage, setExceptionJumpStage] = useState<{ stage: FulfilmentStage; title: string } | null>(null);
  const [exceptionReasonInput, setExceptionReasonInput] = useState('');

  // Acceptance note state
  const [acceptanceNoteInput, setAcceptanceNoteInput] = useState('');
  const [isAcceptingOrder, setIsAcceptingOrder] = useState(false);

  // Notification history modal state
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [retryingNotifId, setRetryingNotifId] = useState<string | null>(null);

  const fetchNotificationHistory = async () => {
    setIsLoadingNotifs(true);
    try {
      const token = localStorage.getItem('cj_admin_token');
      const res = await fetch('/api/orders/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotificationHistory(data.notifications);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  const handleOpenNotificationModal = () => {
    setIsNotifModalOpen(true);
    fetchNotificationHistory();
  };

  const handleRetryNotification = async (notifId: string) => {
    setRetryingNotifId(notifId);
    try {
      const token = localStorage.getItem('cj_admin_token');
      const res = await fetch(`/api/orders/notifications/${encodeURIComponent(notifId)}/retry`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Notification retried successfully!', 'success');
        fetchNotificationHistory();
      } else {
        showToast(data.message || 'Failed to retry notification', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Retry request failed', 'error');
    } finally {
      setRetryingNotifId(null);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(q) ||
      order.customerName.toLowerCase().includes(q) ||
      order.customerPhone.includes(q) ||
      order.cakeName.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'awaiting_confirmation') {
      return order.orderStatus === 'awaiting_confirmation' || order.fulfilmentStage === 'awaiting_confirmation' || order.acceptanceStatus === 'pending_confirmation';
    }
    if (statusFilter === 'confirmed') {
      return order.orderStatus === 'confirmed' && (order.fulfilmentStage === 'confirmed' || !order.fulfilmentStage);
    }
    if (statusFilter === 'in_preparation') {
      return order.orderStatus === 'in_preparation' || order.fulfilmentStage === 'preparing' || order.fulfilmentStage === 'baking' || order.fulfilmentStage === 'decorating' || order.fulfilmentStage === 'quality_check';
    }
    if (statusFilter === 'ready') {
      return order.fulfilmentStage === 'ready' || order.fulfilmentStage === 'ready_for_pickup' || order.fulfilmentStage === 'out_for_delivery';
    }
    if (statusFilter === 'completed') {
      return order.orderStatus === 'completed' || order.fulfilmentStage === 'completed' || order.fulfilmentStage === 'delivered' || order.fulfilmentStage === 'picked_up';
    }
    if (statusFilter === 'rejected') {
      return order.orderStatus === 'rejected' || order.fulfilmentStage === 'rejected';
    }
    if (statusFilter === 'cancelled') {
      return order.orderStatus === 'cancelled' || order.fulfilmentStage === 'cancelled';
    }
    return order.orderStatus === statusFilter;
  });

  const handleAcceptOrder = (order: CustomerOrder) => {
    try {
      acceptCustomerOrder(order.id, acceptanceNoteInput);
      setAcceptanceNoteInput('');
      setIsAcceptingOrder(false);
      // Refresh local selectedOrder snapshot
      const updated = orders.find(o => o.id === order.id);
      if (updated) setSelectedOrder(updated);
    } catch (err: any) {
      showToast(err.message || 'Error accepting order', 'error');
    }
  };

  const handleConfirmRejectOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalOrder) return;
    if (!rejectionReasonInput.trim()) {
      showToast('Please enter a rejection reason.', 'error');
      return;
    }
    try {
      rejectCustomerOrder(rejectModalOrder.id, rejectionReasonInput.trim());
      setRejectModalOrder(null);
      setRejectionReasonInput('');
      if (selectedOrder && selectedOrder.id === rejectModalOrder.id) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Error rejecting order', 'error');
    }
  };

  const handleConfirmCancelOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalOrder) return;
    if (!cancelReasonInput.trim()) {
      showToast('Please enter a cancellation reason.', 'error');
      return;
    }
    try {
      cancelCustomerOrder(cancelModalOrder.id, cancelReasonInput.trim());
      setCancelModalOrder(null);
      setCancelReasonInput('');
      if (selectedOrder && selectedOrder.id === cancelModalOrder.id) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Error cancelling order', 'error');
    }
  };

  const handleAdvanceStage = (stage: FulfilmentStage, title: string) => {
    if (!selectedOrder) return;
    setIsAdvancing(true);

    try {
      const message = customStageNote.trim() || `Order status updated to ${title}`;
      updateOrderFulfilmentStage(selectedOrder.id, stage, title, message);
      
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated) {
        setSelectedOrder({
          ...updated,
          fulfilmentStage: stage,
          latestUpdateMessage: message
        });
      }

      setCustomStageNote('');
    } catch (err: any) {
      // Check if exception jump prompt required
      if (err.message && err.message.includes('requires an explicit recorded reason')) {
        setExceptionJumpStage({ stage, title });
      } else {
        showToast(err.message || 'Error advancing stage', 'error');
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleConfirmExceptionJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !exceptionJumpStage) return;
    if (!exceptionReasonInput.trim()) {
      showToast('Please provide an exception reason.', 'error');
      return;
    }
    try {
      updateOrderFulfilmentStage(
        selectedOrder.id, 
        exceptionJumpStage.stage, 
        exceptionJumpStage.title, 
        customStageNote.trim(), 
        exceptionReasonInput.trim()
      );
      setExceptionJumpStage(null);
      setExceptionReasonInput('');
      setCustomStageNote('');
      const updated = orders.find(o => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    } catch (err: any) {
      showToast(err.message || 'Error executing transition', 'error');
    }
  };

  const handleVerifyPayment = (order: CustomerOrder) => {
    try {
      updateOrderPaymentStatus(order.id, 'fully_paid', order.totalAmount);
      addAuditLog('Payment Verified', `Owner verified payment of ₹${order.totalAmount} for order ${order.orderNumber}`);
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(prev => prev ? { ...prev, paymentStatus: 'fully_paid', outstandingBalance: 0, verifiedPaidAmount: order.totalAmount } : null);
      }
      showToast('Payment verified successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error verifying payment', 'error');
    }
  };

  const handleRejectPayment = (order: CustomerOrder) => {
    const reason = 'Bank statement reconciliation mismatch';
    try {
      updateOrderPaymentStatus(order.id, 'rejected_proof');
      addAuditLog('Payment Rejected', `Owner rejected payment proof for ${order.orderNumber}: ${reason}`);
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder(prev => prev ? { ...prev, paymentStatus: 'rejected_proof' } : null);
      }
      showToast('Payment marked as rejected proof.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Error rejecting payment', 'error');
    }
  };

  const handleReviewRequest = (requestId: string, approve: boolean) => {
    if (!selectedOrder) return;
    reviewOrderChangeRequest(selectedOrder.id, requestId, approve, approve ? 'Request approved by head baker.' : 'Unable to accommodate due to production stage.');
    const updated = orders.find(o => o.id === selectedOrder.id);
    if (updated) setSelectedOrder(updated);
  };

  const buildCustomerNotificationWhatsApp = (order: CustomerOrder): string => {
    const text = `Hello ${order.customerName}, update from Cake Junction regarding your cake order #${order.orderNumber}: Current status is "${(order.fulfilmentStage || order.orderStatus).replace(/_/g, ' ')}". ${order.latestUpdateMessage || ''}`;
    return buildWhatsAppLink(order.customerPhone, text) || '';
  };

  const printKitchenTicket = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#4B2E25]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID, customer, phone, cake..."
            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] focus:ring-2 focus:ring-[#C5A15A] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: `All (${orders.length})` },
            { id: 'awaiting_confirmation', label: `Awaiting Acceptance (${orders.filter(o => o.orderStatus === 'awaiting_confirmation' || o.fulfilmentStage === 'awaiting_confirmation' || o.acceptanceStatus === 'pending_confirmation').length})` },
            { id: 'confirmed', label: 'Accepted' },
            { id: 'in_preparation', label: 'Baking & Prep' },
            { id: 'ready', label: 'Ready / Dispatch' },
            { id: 'completed', label: 'Completed' },
            { id: 'rejected', label: `Rejected (${orders.filter(o => o.orderStatus === 'rejected').length})` },
            { id: 'cancelled', label: `Cancelled (${orders.filter(o => o.orderStatus === 'cancelled').length})` }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors ${
                statusFilter === f.id
                  ? 'bg-[#4B2E25] text-white shadow-2xs'
                  : 'bg-white text-[#4B2E25]/75 border border-[#E8D5C8] hover:bg-[#FFF8EF]'
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Email Notification Logs & Retry Action Button */}
          <button
            type="button"
            onClick={handleOpenNotificationModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-[#4B2E25] border border-[#E8D5C8] hover:bg-[#FFF8EF] hover:border-[#C5A15A] transition-all shadow-2xs whitespace-nowrap shrink-0"
            title="Inspect customer order status email logs and retry"
          >
            <Mail className="w-3.5 h-3.5 text-[#C5A15A]" />
            <span>Email Logs &amp; Retries</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl overflow-hidden border border-[#E8D5C8] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#4B2E25]">
            <thead className="bg-[#FFF8EF] border-b border-[#E8D5C8] uppercase font-semibold text-[#4B2E25]/70">
              <tr>
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Customer & Phone</th>
                <th className="px-5 py-3.5">Target Date</th>
                <th className="px-5 py-3.5">Acceptance & Fulfilment</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Total / Balance</th>
                <th className="px-5 py-3.5 text-right">Owner Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8D5C8]/60">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => {
                  const isAwaitingAcceptance = order.orderStatus === 'awaiting_confirmation' || order.fulfilmentStage === 'awaiting_confirmation' || order.acceptanceStatus === 'pending_confirmation';
                  const isRejected = order.orderStatus === 'rejected' || order.fulfilmentStage === 'rejected';
                  const isCancelled = order.orderStatus === 'cancelled' || order.fulfilmentStage === 'cancelled';
                  const hasPendingRequest = order.changeRequests?.some(r => r.status === 'pending');

                  return (
                    <React.Fragment key={order.id}>
                      <tr 
                        className={`hover:bg-[#FFF8EF]/40 transition-colors ${
                          selectedOrder?.id === order.id || expandedOrderId === order.id ? 'bg-[#FFF8EF]/60' : ''
                        }`}
                      >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {order.cakeThumbnail && (
                            <img src={order.cakeThumbnail} alt={order.cakeName} className="w-10 h-10 rounded-xl object-cover border border-[#E8D5C8]" />
                          )}
                          <div>
                            <span className="font-mono font-bold block">{order.orderNumber}</span>
                            <span className="font-serif font-medium text-xs block truncate max-w-[150px]">{order.cakeName}</span>
                            <span className="text-[10px] text-[#4B2E25]/60">{order.weight} · {order.flavour}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <strong className="block">{order.customerName}</strong>
                        <span className="font-mono text-[#4B2E25]/70">{order.customerPhone}</span>
                      </td>

                      <td className="px-5 py-4">
                        <strong className="block">{order.fulfilmentDate}</strong>
                        <span className="text-[10px] text-[#4B2E25]/60">{order.deliveryOrPickup === 'delivery' ? 'Chilled Van' : 'Atelier Pickup'}</span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border capitalize ${
                            isAwaitingAcceptance 
                              ? 'bg-amber-100 text-amber-900 border-amber-300' 
                              : isRejected
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : isCancelled
                              ? 'bg-neutral-100 text-neutral-800 border-neutral-300'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                          }`}>
                            {(order.fulfilmentStage || order.orderStatus).replace(/_/g, ' ')}
                          </span>

                          {hasPendingRequest && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-500 text-white rounded-md">
                              Change Req
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border capitalize ${
                          order.paymentStatus === 'fully_paid' || order.paymentStatus === 'paid'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : order.paymentStatus === 'verification_pending'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-neutral-50 text-neutral-800 border-neutral-200'
                        }`}>
                          {order.paymentStatus.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <strong className="block">{formatIndianCurrency(order.totalAmount)}</strong>
                        <span className="text-[11px] text-[#4B2E25]/60">
                          Bal: {formatIndianCurrency(order.outstandingBalance)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Dedicated Status Management Panel Toggle */}
                          <button
                            onClick={() => setExpandedOrderId(prev => prev === order.id ? null : order.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all inline-flex items-center gap-1.5 ${
                              expandedOrderId === order.id
                                ? 'bg-[#4B2E25] text-white border-[#4B2E25] shadow-xs'
                                : 'bg-[#FFF8EF] text-[#4B2E25] border-[#E8D5C8] hover:bg-white'
                            }`}
                            title="Open Status Management Panel for this order"
                          >
                            <Sliders className="w-3.5 h-3.5 text-[#C5A15A]" />
                            <span>Status Panel</span>
                            {expandedOrderId === order.id ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#4B2E25]/60" />
                            )}
                          </button>

                          {isAwaitingAcceptance ? (
                            <>
                              <button
                                onClick={() => handleAcceptOrder(order)}
                                className="px-2.5 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-2xs"
                                title="Accept Order & Schedule Production"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => {
                                  setRejectModalOrder(order);
                                  setRejectionReasonInput('');
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 border border-rose-300 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
                                title="Reject Order with Recorded Reason"
                              >
                                Reject
                              </button>
                            </>
                          ) : null}

                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-3 py-1.5 bg-[#4B2E25] text-white rounded-xl text-xs font-semibold hover:bg-[#38221B] shadow-2xs transition-colors"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                      <tr className="bg-[#FFF8EF]/40 animate-fade-in">
                        <td colSpan={7} className="p-4 sm:p-6 border-b-2 border-[#E8D5C8]">
                          <OrderStatusManagementPanel 
                            order={order} 
                            onClose={() => setExpandedOrderId(null)}
                          />
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[#4B2E25]/60">
                    No orders matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ORDER MANAGEMENT DRAWER / MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in print:p-0">
          <div 
            className="relative bg-[#FFF8EF] rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-[#E8D5C8] shadow-2xl p-6 sm:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E8D5C8]/80">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A]">
                  Authorised Order Control & Fulfilment Studio
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#4B2E25] flex items-center gap-2">
                  <span>{selectedOrder.orderNumber}</span>
                  <span className="text-sm font-normal text-[#4B2E25]/60">· {selectedOrder.cakeName}</span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={buildCustomerNotificationWhatsApp(selectedOrder)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-emerald-800 bg-emerald-100 rounded-xl border border-emerald-300 shadow-2xs hover:bg-emerald-200"
                  title="Notify Customer on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-700" />
                </a>

                <button
                  onClick={() => downloadOrderInvoice(selectedOrder.id)}
                  className="p-2 text-[#4B2E25] bg-white rounded-xl border border-[#E8D5C8] shadow-2xs hover:bg-[#FFF8EF]"
                  title="Download Official A4 PDF Invoice"
                >
                  <Download className="w-4 h-4 text-[#C5A15A]" />
                </button>

                <button
                  onClick={printKitchenTicket}
                  className="p-2 text-[#4B2E25] bg-white rounded-xl border border-[#E8D5C8] shadow-2xs hover:bg-[#FFF8EF]"
                  title="Print Kitchen Ticket"
                >
                  <Printer className="w-4 h-4 text-[#C5A15A]" />
                </button>

                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-[#4B2E25]/70 hover:text-[#4B2E25] bg-white rounded-full border border-[#E8D5C8] shadow-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* INTEGRATED STATUS MANAGEMENT PANEL */}
            <OrderStatusManagementPanel 
              order={selectedOrder} 
              onOrderUpdated={(updated) => setSelectedOrder(updated)} 
            />

            {/* RECORDED STATUS & TIMELINE HISTORY */}
            {selectedOrder.fulfilmentHistory && selectedOrder.fulfilmentHistory.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4B2E25]/80 block">
                  Authoritative Status Change History ({selectedOrder.fulfilmentHistory.length} events)
                </span>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {selectedOrder.fulfilmentHistory.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-xs p-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8]/70">
                      <div className="w-2 h-2 rounded-full bg-[#C5A15A] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-[#4B2E25]">{item.title}</strong>
                          <span className="text-[10px] text-[#4B2E25]/60 font-mono">
                            {new Date(item.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        {item.message && <p className="text-[#4B2E25]/75 mt-0.5">{item.message}</p>}
                        <span className="text-[10px] text-[#4B2E25]/50 block mt-0.5">Authorised by {item.updatedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CUSTOMER & DELIVERY SUMMARY */}
            <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#4B2E25]">
              <div className="space-y-2">
                <strong className="text-xs font-bold text-[#C5A15A] block uppercase">Customer Details</strong>
                <p><strong>Name:</strong> {selectedOrder.customerName}</p>
                <p><strong>Phone:</strong> {selectedOrder.customerPhone}</p>
                {selectedOrder.customerEmail && <p><strong>Email:</strong> {selectedOrder.customerEmail}</p>}
                {selectedOrder.cakeMessage && <p><strong>Cake Message:</strong> "{selectedOrder.cakeMessage}"</p>}
                {selectedOrder.specialInstructions && <p><strong>Notes:</strong> {selectedOrder.specialInstructions}</p>}
              </div>

              <div className="space-y-2">
                <strong className="text-xs font-bold text-[#C5A15A] block uppercase">Handover & Destination</strong>
                <p><strong>Type:</strong> {selectedOrder.deliveryOrPickup === 'delivery' ? 'Doorstep Delivery' : 'Atelier Pickup'}</p>
                <p><strong>Required Date:</strong> {selectedOrder.fulfilmentDate} ({selectedOrder.fulfilmentTimeSlot})</p>
                <p><strong>Address:</strong> {selectedOrder.deliveryAddress || 'Store Pickup'}</p>
              </div>

              {selectedOrder.privateReferenceImages && selectedOrder.privateReferenceImages.length > 0 && (
                <div className="sm:col-span-2 pt-3 border-t border-[#E8D5C8]/60">
                  <strong className="text-xs font-bold text-[#C5A15A] block uppercase mb-2">Private Reference Images</strong>
                  <div className="flex gap-3">
                    {selectedOrder.privateReferenceImages.map((url, idx) => (
                      <img key={idx} src={url} alt="Reference" className="w-20 h-20 rounded-2xl object-cover border border-[#E8D5C8]" />
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleConfirmRejectOrder}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-rose-200 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-rose-900 font-bold text-base">
              <Ban className="w-5 h-5 text-rose-600" />
              <span>Reject Order {rejectModalOrder.orderNumber}</span>
            </div>
            <p className="text-xs text-[#4B2E25]/75">
              Please enter the official reason for rejecting this order. The customer tracker will immediately update with this recorded reason.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">
                Recorded Rejection Reason *
              </label>
              <textarea
                required
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Baking slots fully booked for the requested celebration date."
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-xs text-[#4B2E25] focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CANCELLATION REASON MODAL */}
      {cancelModalOrder && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleConfirmCancelOrder}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-neutral-300 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-neutral-900 font-bold text-base">
              <AlertCircle className="w-5 h-5 text-neutral-600" />
              <span>Cancel Order {cancelModalOrder.orderNumber}</span>
            </div>
            <p className="text-xs text-[#4B2E25]/75">
              Enter the reason for cancelling this order per bakery policy. The invoice and transaction history will be preserved.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">
                Recorded Cancellation Reason *
              </label>
              <textarea
                required
                rows={3}
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="e.g. Customer requested cancellation >48 hrs in advance per store policy."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-[#4B2E25] focus:outline-none focus:ring-2 focus:ring-[#C5A15A]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl hover:bg-white"
              >
                Go Back
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-neutral-800 hover:bg-neutral-900 rounded-xl shadow-xs"
              >
                Confirm Cancellation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXCEPTIONAL TRANSITION JUMP REASON MODAL */}
      {exceptionJumpStage && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleConfirmExceptionJump}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-amber-300 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-amber-950 font-bold text-base">
              <AlertCircle className="w-5 h-5 text-amber-700" />
              <span>Exceptional Stage Jump Authorization</span>
            </div>
            <p className="text-xs text-[#4B2E25]/80">
              You are skipping intermediate production milestones to jump directly to <strong>"{exceptionJumpStage.title}"</strong>. An authoritative reason must be recorded in the audit trail.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">
                Recorded Exception Reason *
              </label>
              <textarea
                required
                rows={3}
                value={exceptionReasonInput}
                onChange={(e) => setExceptionReasonInput(e.target.value)}
                placeholder="e.g. Fast-tracked urgent VIP order; baking & decoration completed concurrently by head chef."
                className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 text-xs text-[#4B2E25] focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setExceptionJumpStage(null)}
                className="px-4 py-2 text-xs font-semibold text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl shadow-xs"
              >
                Authorize & Advance
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EMAIL NOTIFICATIONS HISTORY & RETRY MODAL */}
      {isNotifModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full border border-[#E8D5C8] shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D5C8]/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#FFF8EF] rounded-xl border border-[#E8D5C8] text-[#C5A15A]">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#4B2E25]">
                    Customer Order Status Email Logs &amp; Retries
                  </h3>
                  <p className="text-xs text-[#4B2E25]/70">
                    Automated Gmail delivery records triggered on admin status changes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchNotificationHistory}
                  disabled={isLoadingNotifs}
                  className="p-2 text-xs font-semibold text-[#4B2E25] bg-[#FFF8EF] hover:bg-white border border-[#E8D5C8] rounded-xl transition-all cursor-pointer"
                  title="Refresh logs"
                >
                  <RotateCw className={`w-4 h-4 ${isLoadingNotifs ? 'animate-spin text-[#C5A15A]' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsNotifModalOpen(false)}
                  className="p-2 text-[#4B2E25]/60 hover:text-[#4B2E25] rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification logs list */}
            <div className="flex-1 overflow-y-auto pr-1">
              {isLoadingNotifs && notificationHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#4B2E25]/70 flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#C5A15A]" />
                  <span>Loading email dispatch logs...</span>
                </div>
              ) : notificationHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#4B2E25]/70 bg-[#FFF8EF]/50 rounded-2xl border border-dashed border-[#E8D5C8]">
                  <Mail className="w-8 h-8 text-[#C5A15A] mx-auto mb-2 opacity-60" />
                  <p className="font-semibold text-[#4B2E25]">No notification records logged yet.</p>
                  <p className="text-[11px] text-[#4B2E25]/60 mt-0.5">
                    Whenever an authorized admin changes an order status, the delivery event is logged here with retry controls.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notificationHistory.map((notif: any) => {
                    const isSent = notif.status === 'sent';
                    const isUnconfigured = notif.status === 'unconfigured';

                    return (
                      <div
                        key={notif.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSent 
                            ? 'bg-emerald-50/40 border-emerald-200' 
                            : isUnconfigured
                              ? 'bg-amber-50/40 border-amber-200'
                              : 'bg-rose-50/40 border-rose-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#4B2E25]">
                                {notif.orderNumber || notif.orderId}
                              </span>
                              <span className="text-[11px] text-[#4B2E25]/60">&rarr;</span>
                              <span className="text-xs font-medium text-[#4B2E25]">
                                {notif.recipientEmail}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                isSent 
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                                  : isUnconfigured 
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                              }`}>
                                {notif.status}
                              </span>
                            </div>

                            <div className="text-[11px] text-[#4B2E25]/75">
                              Milestone: <strong className="capitalize">{notif.newStatus?.replace(/_/g, ' ')}</strong>
                              {notif.previousStatus && (
                                <span> (from <span className="capitalize">{notif.previousStatus.replace(/_/g, ' ')}</span>)</span>
                              )}
                              {notif.retryCount > 0 && (
                                <span className="ml-2 font-mono text-[10px] text-[#C5A15A]">
                                  (Retried {notif.retryCount}x)
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                            <span className="text-[10px] text-[#4B2E25]/60 font-mono">
                              {new Date(notif.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>

                            {(!isSent) && (
                              <button
                                type="button"
                                disabled={retryingNotifId === notif.id}
                                onClick={() => handleRetryNotification(notif.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#4B2E25] hover:bg-[#38221B] text-white rounded-lg transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                                title="Resend status update email to customer"
                              >
                                {retryingNotifId === notif.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-[#C5A15A]" />
                                ) : (
                                  <RotateCw className="w-3 h-3 text-[#C5A15A]" />
                                )}
                                <span>Retry</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {notif.error && (
                          <div className="mt-2 p-2 bg-white rounded-xl border border-rose-200 text-[11px] text-rose-900 font-mono">
                            {notif.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#E8D5C8]/80 flex justify-between items-center text-xs text-[#4B2E25]/70">
              <span>{notificationHistory.length} notification event(s) recorded</span>
              <button
                type="button"
                onClick={() => setIsNotifModalOpen(false)}
                className="px-4 py-2 bg-[#4B2E25] text-white font-semibold rounded-xl text-xs hover:bg-[#38221B] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
