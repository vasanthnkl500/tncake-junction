import fs from 'fs';
import path from 'path';
import { 
  DEFAULT_SHOP_SETTINGS, 
  SAMPLE_CAKES, 
  INITIAL_APPROVED_REVIEWS, 
  INITIAL_ENQUIRIES, 
  INITIAL_ORDERS,
  DEFAULT_SLIDESHOW_SETTINGS,
  INITIAL_SLIDESHOW_SLIDES
} from '../data/mockData';
import { queueBackupEvent } from './driveBackupService';

export interface OrderNotificationRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId?: string;
  recipientEmail: string;
  previousStatus: string;
  newStatus: string;
  timestamp: string;
  status: 'sent' | 'failed' | 'pending' | 'unconfigured';
  providerMessageId?: string;
  error?: string;
  retriedAt?: string;
  retryCount: number;
}

export interface PersistentShopStore {
  settings: any;
  cakes: any[];
  orders: any[];
  enquiries: any[];
  feedback: any[];
  paymentProofs: any[];
  slideshowSettings: any;
  slideshowSlides: any[];
  auditLogs: any[];
  invoices: any[];
  orderNotifications: OrderNotificationRecord[];
  lastSavedAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), '.server_data');
const STORE_FILE = path.join(DATA_DIR, 'shop_data.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let memoryStore: PersistentShopStore | null = null;

export function loadShopStore(): PersistentShopStore {
  if (memoryStore) {
    return memoryStore;
  }

  if (fs.existsSync(STORE_FILE)) {
    try {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      memoryStore = {
        settings: parsed.settings || DEFAULT_SHOP_SETTINGS,
        cakes: parsed.cakes || SAMPLE_CAKES,
        orders: parsed.orders || INITIAL_ORDERS,
        enquiries: parsed.enquiries || INITIAL_ENQUIRIES,
        feedback: parsed.feedback || INITIAL_APPROVED_REVIEWS,
        paymentProofs: parsed.paymentProofs || [],
        slideshowSettings: parsed.slideshowSettings || DEFAULT_SLIDESHOW_SETTINGS,
        slideshowSlides: parsed.slideshowSlides || INITIAL_SLIDESHOW_SLIDES,
        auditLogs: parsed.auditLogs || [],
        invoices: parsed.invoices || [],
        orderNotifications: parsed.orderNotifications || [],
        lastSavedAt: parsed.lastSavedAt || new Date().toISOString()
      };
      return memoryStore!;
    } catch (e) {
      console.error('Failed to parse shop_data.json, preserving fallback data:', e);
    }
  }

  // Initial seed preserving all existing records
  const initialStore: PersistentShopStore = {
    settings: {
      ...DEFAULT_SHOP_SETTINGS,
      shopName: 'Cake Junction',
      phone: '+91 8825648728',
      whatsappNumber: '+91 8825648728'
    },
    cakes: [...SAMPLE_CAKES],
    orders: [...INITIAL_ORDERS],
    enquiries: [...INITIAL_ENQUIRIES],
    feedback: [...INITIAL_APPROVED_REVIEWS],
    paymentProofs: [],
    slideshowSettings: { ...DEFAULT_SLIDESHOW_SETTINGS },
    slideshowSlides: [...INITIAL_SLIDESHOW_SLIDES],
    auditLogs: [
      {
        id: `log-init-${Date.now()}`,
        action: 'System Boot',
        userEmail: 'system@cakejunction.internal',
        details: 'Store initialized with persistent cloud order tracking and verified UPI payments.',
        timestamp: new Date().toISOString()
      }
    ],
    invoices: [],
    orderNotifications: [],
    lastSavedAt: new Date().toISOString()
  };

  memoryStore = initialStore;
  saveShopStore(initialStore);
  return initialStore;
}

export function saveShopStore(store: PersistentShopStore): void {
  try {
    store.lastSavedAt = new Date().toISOString();
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
    memoryStore = store;
  } catch (e) {
    console.error('Failed to save shop_data.json:', e);
  }
}

export function getShopData(): PersistentShopStore {
  return loadShopStore();
}

export function updateShopData(partial: Partial<PersistentShopStore>): PersistentShopStore {
  const current = loadShopStore();
  const updated: PersistentShopStore = {
    ...current,
    ...partial,
    lastSavedAt: new Date().toISOString()
  };

  saveShopStore(updated);

  // If settings changed, queue backup
  if (partial.settings) {
    queueBackupEvent({
      category: 'Product_Settings',
      entityType: 'settings',
      entityId: 'shop-settings',
      action: 'update',
      data: updated.settings
    });
  }

  return updated;
}

export function recordNewOrder(order: any): any {
  const store = loadShopStore();
  store.orders.unshift(order);
  saveShopStore(store);

  // Automatic Google Drive backup event queueing
  queueBackupEvent({
    category: 'Orders',
    entityType: 'order',
    entityId: order.id || order.orderNumber,
    action: 'create',
    data: order
  });

  if (order.invoiceNumber) {
    queueBackupEvent({
      category: 'Invoices_Receipts',
      entityType: 'invoice',
      entityId: order.invoiceNumber,
      action: 'create',
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        totalAmount: order.totalAmount,
        customerName: order.customerName,
        createdAt: order.createdAt
      }
    });
  }

  return order;
}

export function updateOrderInStore(orderId: string, updates: any): any {
  const store = loadShopStore();
  const idx = store.orders.findIndex(o => o.id === orderId || o.orderNumber === orderId);
  if (idx >= 0) {
    store.orders[idx] = { ...store.orders[idx], ...updates, updatedAt: new Date().toISOString() };
    saveShopStore(store);

    queueBackupEvent({
      category: 'Orders',
      entityType: 'order',
      entityId: store.orders[idx].id,
      action: 'update',
      data: store.orders[idx]
    });

    return store.orders[idx];
  }
  return null;
}

export function recordOrderNotification(notification: OrderNotificationRecord): OrderNotificationRecord {
  const store = loadShopStore();
  if (!store.orderNotifications) {
    store.orderNotifications = [];
  }
  // Idempotency check: if an existing notification with same id exists, update it instead of duplicating
  const existingIdx = store.orderNotifications.findIndex(n => n.id === notification.id);
  if (existingIdx >= 0) {
    store.orderNotifications[existingIdx] = {
      ...store.orderNotifications[existingIdx],
      ...notification
    };
  } else {
    store.orderNotifications.unshift(notification);
  }
  // Keep last 250 notification logs
  if (store.orderNotifications.length > 250) {
    store.orderNotifications = store.orderNotifications.slice(0, 250);
  }
  saveShopStore(store);
  return notification;
}

export function getOrderNotifications(): OrderNotificationRecord[] {
  const store = loadShopStore();
  return store.orderNotifications || [];
}

export function getOrderNotificationById(id: string): OrderNotificationRecord | null {
  const store = loadShopStore();
  return store.orderNotifications?.find(n => n.id === id) || null;
}

export function updateOrderNotification(id: string, updates: Partial<OrderNotificationRecord>): OrderNotificationRecord | null {
  const store = loadShopStore();
  if (!store.orderNotifications) return null;
  const idx = store.orderNotifications.findIndex(n => n.id === id);
  if (idx >= 0) {
    store.orderNotifications[idx] = {
      ...store.orderNotifications[idx],
      ...updates
    };
    saveShopStore(store);
    return store.orderNotifications[idx];
  }
  return null;
}
