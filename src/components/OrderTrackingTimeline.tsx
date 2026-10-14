import React, { useState } from 'react';
import { CustomerOrder, FulfilmentStage, OrderGeneralStatus } from '../types';
import { useRealtimeOrderSubscription } from '../services/realtimeOrderSync';
import { 
  ShoppingBag, 
  CheckCircle2, 
  ChefHat, 
  Package, 
  Truck, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Sparkles, 
  MessageCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { buildWhatsAppLink } from '../utils/whatsapp';

export interface OrderTrackingTimelineProps {
  order: CustomerOrder;
  className?: string;
  showHistoryList?: boolean;
}

interface TimelineStageConfig {
  id: 'order_received' | 'baking' | 'decorating' | 'quality_check' | 'out_for_delivery';
  title: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
}

const FIVE_STAGES: TimelineStageConfig[] = [
  {
    id: 'order_received',
    title: 'Order Received',
    shortLabel: 'Order Received',
    description: 'Booking confirmed & slot reserved',
    icon: ShoppingBag,
  },
  {
    id: 'baking',
    title: 'Baking',
    shortLabel: 'Baking',
    description: 'Fresh artisanal sponges in oven',
    icon: ChefHat,
  },
  {
    id: 'decorating',
    title: 'Decorating',
    shortLabel: 'Decorating',
    description: 'Ganache layering & hand-piped detailing',
    icon: Sparkles,
  },
  {
    id: 'quality_check',
    title: 'Quality Check',
    shortLabel: 'Quality Check',
    description: 'Chef inspection & chilled setting',
    icon: ShieldCheck,
  },
  {
    id: 'out_for_delivery',
    title: 'Out for Delivery',
    shortLabel: 'Out for Delivery',
    description: 'Chilled van transit or ready for pickup',
    icon: Truck,
  },
];

/**
 * Calculates current step index (0-4) based on fulfilmentStage and orderStatus.
 */
function getStageIndex(order: CustomerOrder): number {
  const current = (order.fulfilmentStage || order.orderStatus) as string;

  if (['completed', 'delivered', 'picked_up'].includes(current)) {
    return 4;
  }
  if (['out_for_delivery', 'ready', 'ready_for_pickup'].includes(current)) {
    return 4;
  }
  if (['quality_check'].includes(current)) {
    return 3;
  }
  if (['decorating'].includes(current)) {
    return 2;
  }
  if (['baking', 'preparing', 'in_preparation'].includes(current)) {
    return 1;
  }
  // Default to 0 (order_placed, awaiting_confirmation, confirmed)
  return 0;
}

/**
 * Extracts best matching timestamp from history or order metadata for each stage.
 */
function getStageTimestamp(order: CustomerOrder, stageId: TimelineStageConfig['id']): string | null {
  const history = order.fulfilmentHistory || [];

  if (stageId === 'order_received') {
    const entry = history.find(h => ['order_placed', 'awaiting_confirmation', 'confirmed'].includes(h.stage));
    return entry?.timestamp || order.acceptedAt || order.createdAt || null;
  }

  if (stageId === 'baking') {
    const entry = history.find(h => ['baking', 'preparing', 'in_preparation'].includes(h.stage));
    return entry?.timestamp || null;
  }

  if (stageId === 'decorating') {
    const entry = history.find(h => ['decorating'].includes(h.stage));
    return entry?.timestamp || null;
  }

  if (stageId === 'quality_check') {
    const entry = history.find(h => ['quality_check', 'ready'].includes(h.stage));
    return entry?.timestamp || null;
  }

  if (stageId === 'out_for_delivery') {
    const entry = history.find(h => ['out_for_delivery', 'ready_for_pickup', 'delivered', 'picked_up', 'completed'].includes(h.stage));
    return entry?.timestamp || null;
  }

  return null;
}

export const OrderTrackingTimeline: React.FC<OrderTrackingTimelineProps> = ({
  order,
  className = '',
  showHistoryList = true,
}) => {
  const [, setRealtimeCounter] = useState(0);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Subscribe to real-time order status broadcasts from database / session
  useRealtimeOrderSubscription(order?.id, () => {
    setRealtimeCounter(c => c + 1);
  });

  const isRejected = order.orderStatus === 'rejected' || order.fulfilmentStage === 'rejected';
  const isCancelled = order.orderStatus === 'cancelled' || order.fulfilmentStage === 'cancelled';
  const isCancellationRequested = order.orderStatus === 'cancellation_requested';

  const currentStageIndex = getStageIndex(order);
  const isOrderFulfilled = currentStageIndex === 4;

  const currentSubStageLabel = (() => {
    const stage = order.fulfilmentStage || order.orderStatus;
    if (stage === 'baking') return 'Sponges in Baking Oven';
    if (stage === 'decorating') return 'Hand-Piping & Ganache Masking';
    if (stage === 'quality_check') return 'Pastry Chef Final Quality Check';
    if (stage === 'ready_for_pickup') return 'Ready for Atelier Counter Handover';
    if (stage === 'out_for_delivery') return 'Dispatched in Dedicated Chilled Van';
    if (stage === 'picked_up') return 'Handed Over at Bakery Counter';
    if (stage === 'delivered') return 'Safely Delivered to Venue';
    return null;
  })();

  const whatsappDirectHelp = buildWhatsAppLink(
    undefined,
    `Hello Cake Junction, I am enquiring regarding my order #${order.orderNumber}.`
  );

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Live Sync Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8D5C8]/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-lg font-bold text-[#4B2E25] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C5A15A]" />
              <span>Order Tracking Timeline</span>
            </h3>
            
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>Live Synced</span>
            </span>
          </div>
          <p className="text-xs text-[#4B2E25]/70 mt-0.5">
            Real-time kitchen milestones recorded by Cake Junction pastry chefs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-xs font-medium text-[#4B2E25] bg-[#FFF8EF] px-3 py-1.5 rounded-xl border border-[#E8D5C8]">
            Fulfilment: <strong className="font-semibold">{order.fulfilmentDate}</strong>
            {order.fulfilmentTimeSlot ? ` (${order.fulfilmentTimeSlot})` : ''}
          </div>
        </div>
      </div>

      {/* TERMINAL STATE: REJECTED BANNER */}
      {isRejected && (
        <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-3xl text-rose-950 space-y-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Order Not Accepted by Bakery</span>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
            <strong className="block text-rose-950">Recorded Rejection Reason:</strong>
            <p className="leading-relaxed">
              {order.rejectionReason || 'Kitchen slot capacity reached for requested preparation date.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-rose-900/80 pt-1">
            <span>
              {order.rejectedBy ? `Recorded by ${order.rejectedBy}` : 'Processed by Bakery Head Baker'}
              {order.rejectedAt && ` · ${new Date(order.rejectedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`}
            </span>
            {whatsappDirectHelp && (
              <a
                href={whatsappDirectHelp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-rose-950 hover:underline"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chat with Head Baker</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* TERMINAL STATE: CANCELLED BANNER */}
      {isCancelled && (
        <div className="p-5 bg-neutral-100 border-2 border-neutral-300 rounded-3xl text-neutral-900 space-y-3 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2 text-neutral-800 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-neutral-600 shrink-0" />
            <span>Order Cancelled</span>
          </div>

          <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 text-xs text-neutral-800 space-y-1">
            <strong className="block text-neutral-900">Recorded Cancellation Reason:</strong>
            <p className="leading-relaxed">
              {order.cancellationReason || 'Order cancelled per customer request or bakery policy.'}
            </p>
          </div>

          <div className="text-[11px] text-neutral-600">
            {order.cancelledBy ? `Recorded by ${order.cancelledBy}` : 'Processed by Cake Junction'}
            {order.cancelledAt && ` · ${new Date(order.cancelledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`}
          </div>
        </div>
      )}

      {/* CANCELLATION REQUESTED NOTICE */}
      {isCancellationRequested && !isCancelled && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Cancellation Review Pending:</strong> Your request to cancel this order has been submitted and is currently being reviewed by our head baker.
          </div>
        </div>
      )}

      {/* MAIN 5-STAGE VISUAL TIMELINE TRACKER (DESKTOP / TABLET HORIZONTAL) */}
      {!isRejected && !isCancelled && (
        <div className="space-y-4">
          
          {/* Desktop/Tablet Horizontal Steps */}
          <div className="hidden md:block">
            <div className="grid grid-cols-5 gap-2 relative">
              
              {FIVE_STAGES.map((stage, idx) => {
                const isCompleted = idx < currentStageIndex || (idx === currentStageIndex && isOrderFulfilled);
                const isCurrent = idx === currentStageIndex && !isOrderFulfilled;
                const isPending = idx > currentStageIndex;
                const timestamp = getStageTimestamp(order, stage.id);
                const IconComponent = stage.icon;

                return (
                  <div key={stage.id} className="relative flex flex-col items-center text-center">
                    
                    {/* Connecting Bar (Between Steps) */}
                    {idx > 0 && (
                      <div 
                        className={`absolute top-5 right-1/2 left-[-50%] h-1 -z-0 transition-colors duration-500 ${
                          idx <= currentStageIndex ? 'bg-emerald-500' : 'bg-[#E8D5C8]/60'
                        }`} 
                      />
                    )}

                    {/* Step Icon Circle */}
                    <div className="relative z-10 mb-2">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isCurrent
                            ? 'bg-[#4B2E25] text-white ring-4 ring-[#C5A15A]/30 shadow-md scale-105'
                            : 'bg-white text-[#4B2E25]/40 border border-[#E8D5C8]'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-100" />
                        ) : (
                          <IconComponent className="w-5 h-5" />
                        )}
                      </div>

                      {/* Active Pulse Tag */}
                      {isCurrent && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#C5A15A] rounded-full animate-ping" />
                      )}
                    </div>

                    {/* Stage Label */}
                    <span className={`text-xs font-bold leading-tight block mb-0.5 ${
                      isCurrent 
                        ? 'text-[#4B2E25]' 
                        : isCompleted 
                          ? 'text-emerald-900' 
                          : 'text-[#4B2E25]/50'
                    }`}>
                      {stage.shortLabel}
                    </span>

                    {/* Stage Subtitle */}
                    <span className="text-[10px] text-[#4B2E25]/65 leading-tight px-1 line-clamp-2">
                      {isCurrent && currentSubStageLabel ? currentSubStageLabel : stage.description}
                    </span>

                    {/* Timestamp */}
                    {timestamp && (
                      <span className="text-[9px] text-[#4B2E25]/60 mt-1.5 font-mono bg-[#FFF8EF] px-1.5 py-0.5 rounded-md border border-[#E8D5C8]/60">
                        {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}

                    {/* Badge */}
                    <div className="mt-1">
                      {isCompleted && (
                        <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
                          Done
                        </span>
                      )}
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-[#C5A15A] text-white rounded-md shadow-2xs">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Vertical Steps (Clean, Stacked Layout) */}
          <div className="md:hidden space-y-3">
            {FIVE_STAGES.map((stage, idx) => {
              const isCompleted = idx < currentStageIndex || (idx === currentStageIndex && isOrderFulfilled);
              const isCurrent = idx === currentStageIndex && !isOrderFulfilled;
              const isPending = idx > currentStageIndex;
              const timestamp = getStageTimestamp(order, stage.id);
              const IconComponent = stage.icon;

              return (
                <div
                  key={stage.id}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-[#FFF8EF] border-[#C5A15A] ring-2 ring-[#C5A15A]/30 shadow-xs'
                      : isCompleted
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-white border-[#E8D5C8]/60 opacity-60'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                        ? 'bg-[#4B2E25] text-white ring-2 ring-[#C5A15A]'
                        : 'bg-[#E8D5C8]/40 text-[#4B2E25]/60'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <IconComponent className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <strong className={`text-xs ${isCurrent ? 'text-[#4B2E25]' : isCompleted ? 'text-emerald-950' : 'text-[#4B2E25]/60'}`}>
                        {idx + 1}. {stage.title}
                      </strong>

                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-[#C5A15A] text-white rounded-md shrink-0">
                          Active
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[10px] font-semibold text-emerald-700 shrink-0">
                          Completed
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#4B2E25]/75 mt-0.5">
                      {isCurrent && currentSubStageLabel ? currentSubStageLabel : stage.description}
                    </p>

                    {timestamp && (
                      <span className="text-[10px] text-[#4B2E25]/55 block mt-1 font-mono">
                        {new Date(timestamp).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current Active Kitchen Status Card */}
          <div className="p-4 bg-gradient-to-r from-[#FFF8EF] to-white rounded-2xl border border-[#E8D5C8] shadow-xs flex items-start gap-3.5">
            <Clock className="w-5 h-5 text-[#C5A15A] shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4B2E25]">
                  Current Atelier Status: {FIVE_STAGES[currentStageIndex]?.title}
                </span>
                <span className="text-[10px] text-[#4B2E25]/60 font-mono">
                  Order Type: {order.deliveryOrPickup === 'delivery' ? 'Dedicated Chilled Delivery' : 'Atelier Pickup'}
                </span>
              </div>
              <p className="text-xs text-[#4B2E25]/80 leading-relaxed">
                {order.latestUpdateMessage || FIVE_STAGES[currentStageIndex]?.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED AUDIT HISTORY LIST */}
      {showHistoryList && order.fulfilmentHistory && order.fulfilmentHistory.length > 0 && (
        <div className="pt-2 border-t border-[#E8D5C8]/70">
          <button
            type="button"
            onClick={() => setShowAllHistory(prev => !prev)}
            className="w-full flex items-center justify-between text-xs font-semibold text-[#4B2E25] hover:text-[#C5A15A] py-2 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span>View Kitchen Audit Log ({order.fulfilmentHistory.length} milestone{order.fulfilmentHistory.length > 1 ? 's' : ''})</span>
            </span>
            {showAllHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAllHistory && (
            <div className="space-y-2 pt-2 animate-fade-in">
              {order.fulfilmentHistory.map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 text-xs p-3 bg-[#FFF8EF]/60 rounded-xl border border-[#E8D5C8]/70"
                >
                  <div className="w-2 h-2 rounded-full bg-[#C5A15A] mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-[#4B2E25]">{item.title}</strong>
                      <span className="text-[10px] text-[#4B2E25]/60 font-mono shrink-0">
                        {new Date(item.timestamp).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {item.message && <p className="text-[#4B2E25]/80 mt-0.5">{item.message}</p>}
                    <span className="text-[10px] text-[#4B2E25]/50 block mt-0.5">Authorised by {item.updatedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
