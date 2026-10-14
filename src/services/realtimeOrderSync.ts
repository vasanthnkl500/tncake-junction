import { useEffect, useRef } from 'react';
import { CustomerOrder, FulfilmentStage, OrderGeneralStatus } from '../types';

/**
 * Real-time Order Synchronisation Engine for Cake Junction
 * Supports:
 * 1. BroadcastChannel for instant cross-tab / cross-window messaging
 * 2. Window CustomEvent for immediate in-page memory synchronization
 * 3. StorageEvent fallback for multi-window state synchronization
 * 4. Safe authoritative polling heartbeat (3s) to handle reconnects, tab sleep, and mobile resume
 */

const CHANNEL_NAME = 'cake_junction_realtime_orders';
const CUSTOM_EVENT_NAME = 'cake_junction_order_status_sync';

export interface OrderRealtimeEvent {
  orderId: string;
  orderNumber: string;
  newStatus: OrderGeneralStatus;
  newStage: FulfilmentStage;
  timestamp: string;
  title: string;
  message?: string;
  updatedBy: string;
  rejectionReason?: string;
  cancellationReason?: string;
}

// Global broadcast channel instance (with fallback if browser environment does not support it)
let globalBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    globalBroadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    globalBroadcastChannel = null;
  }
}

/**
 * Broadcasts an authoritative status update committed by Owner or Admin
 */
export function broadcastOrderUpdate(event: OrderRealtimeEvent): void {
  if (typeof window === 'undefined') return;

  // 1. Send through BroadcastChannel (cross-tab)
  if (globalBroadcastChannel) {
    try {
      globalBroadcastChannel.postMessage(event);
    } catch {
      // fallback handled below
    }
  }

  // 2. Dispatch local CustomEvent (in-memory, immediate same-window)
  try {
    const customEvt = new CustomEvent(CUSTOM_EVENT_NAME, { detail: event });
    window.dispatchEvent(customEvt);
  } catch {
    // ignore
  }

  // 3. Update localStorage signal timestamp to trigger StorageEvent in any tab without BroadcastChannel
  try {
    localStorage.setItem('cj_last_order_update_signal', JSON.stringify({
      orderId: event.orderId,
      time: Date.now()
    }));
  } catch {
    // ignore
  }
}

/**
 * Subscribes a listener to status updates for a specific authorized order
 * Privacy Guarantee: Customer only receives events matching their authorized orderId
 */
export function subscribeToOrder(
  authorizedOrderId: string,
  onUpdate: (event: OrderRealtimeEvent) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. BroadcastChannel listener
  const handleBcMessage = (msg: MessageEvent) => {
    const event = msg.data as OrderRealtimeEvent;
    if (event && (event.orderId === authorizedOrderId || event.orderNumber === authorizedOrderId)) {
      onUpdate(event);
    }
  };

  if (globalBroadcastChannel) {
    globalBroadcastChannel.addEventListener('message', handleBcMessage);
  }

  // 2. Local CustomEvent listener
  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent<OrderRealtimeEvent>;
    if (customEvt.detail && (customEvt.detail.orderId === authorizedOrderId || customEvt.detail.orderNumber === authorizedOrderId)) {
      onUpdate(customEvt.detail);
    }
  };
  window.addEventListener(CUSTOM_EVENT_NAME, handleCustomEvent);

  // Return unsubscribe cleanup function
  return () => {
    if (globalBroadcastChannel) {
      globalBroadcastChannel.removeEventListener('message', handleBcMessage);
    }
    window.removeEventListener(CUSTOM_EVENT_NAME, handleCustomEvent);
  };
}

/**
 * React Hook for Customer Order Real-time Tracking
 * Automatically synchronizes order state live without requiring manual refresh.
 * Includes safe 3-second heartbeat to handle background tab wake and reconnects.
 */
export function useRealtimeOrderSubscription(
  orderId: string | undefined,
  onAuthoritativeRefresh: () => void
) {
  const refreshRef = useRef(onAuthoritativeRefresh);
  refreshRef.current = onAuthoritativeRefresh;

  useEffect(() => {
    if (!orderId) return;

    // Real-time listener for pushed events
    const unsubscribe = subscribeToOrder(orderId, () => {
      refreshRef.current();
    });

    // Storage event listener (fallback across browser windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cake_junction_orders' || e.key === 'cj_last_order_update_signal') {
        refreshRef.current();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Authoritative 3-second heartbeat to guarantee synchronization on mobile/reconnect
    const interval = setInterval(() => {
      refreshRef.current();
    }, 3000);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [orderId]);
}
