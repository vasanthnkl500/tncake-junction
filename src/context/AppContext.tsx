import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  ShopSettings, 
  Cake, 
  CustomerFeedback, 
  CustomerEnquiry, 
  CustomerOrder, 
  ManualPaymentProof, 
  AuditLogEntry,
  FulfilmentStage,
  OrderGeneralStatus,
  OrderPaymentStatus,
  FulfilmentUpdateEntry,
  OrderChangeRequest,
  SlideshowSlide,
  SlideshowSettings,
  SmsGatewayConfig,
  OtpRequestResult,
  OtpVerifyResult,
  InvoiceRecord,
  CartItem
} from '../types';
import { 
  generateInvoiceNumber, 
  generateOrderInvoiceDoc, 
  createInvoiceRecordFromOrder 
} from '../utils/pdfInvoiceGenerator';
import { validateAndNormalizeIndianPhone } from '../utils/phoneAuth';
import { dispatchOtpRequest, verifyOtpCode } from '../services/smsOtpService';
import { 
  DEFAULT_SHOP_SETTINGS, 
  SAMPLE_CAKES, 
  INITIAL_APPROVED_REVIEWS, 
  INITIAL_ENQUIRIES, 
  INITIAL_ORDERS,
  DEFAULT_SLIDESHOW_SETTINGS,
  INITIAL_SLIDESHOW_SLIDES
} from '../data/mockData';
import { enTranslations, taTranslations } from '../utils/i18n';
import { PageRoute, RouteState, parseRouteFromLocation, buildRouteUrl } from '../utils/router';
import { normalizeShopSettingsSchema, verifyShopOrderAcceptance } from '../data/shopSettingsSchema';
import { broadcastOrderUpdate } from '../services/realtimeOrderSync';

interface AnalyticsData {
  cakeViews: number;
  whatsAppClicks: number;
  enquiriesSubmitted: number;
}

export interface OrderDraftFormData {
  cakeId?: string;
  flavour?: string;
  weight?: string;
  quantity?: number;
  isEggless?: boolean;
  cakeMessage?: string;
  occasion?: string;
  colourTheme?: string;
  specialInstructions?: string;
  privateReferenceImages?: string[];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  isGift?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  fulfilmentType?: 'delivery' | 'pickup';
  requiredDate?: string;
  timeSlot?: string;
  flatOrHouse?: string;
  streetAndLocality?: string;
  area?: string;
  city?: string;
  postalCode?: string;
  landmark?: string;
  deliveryInstructions?: string;
  selectedExtras?: string[];
}

interface AppContextType {
  // Localization
  lang: 'en' | 'ta';
  setLang: (lang: 'en' | 'ta') => void;
  t: typeof enTranslations;

  // Routing and History
  route: RouteState;
  navigateTo: (page: PageRoute, params?: Record<string, string>, replace?: boolean) => void;
  goBack: (fallbackPage?: PageRoute) => void;

  // Shop Settings
  settings: ShopSettings;
  updateSettings: (newSettings: Partial<ShopSettings>) => void;
  updateShopAvailability: (availability: { is_open: boolean; closureMessage?: string; reopeningTimestamp?: string | null }) => void;
  checkShopOpenStatus: () => { allowed: boolean; reason?: string };
  resetToDefaultSettings: () => void;

  // Customer Wishlist
  wishlist: string[];
  toggleWishlist: (cakeId: string) => void;
  isWishlisted: (cakeId: string) => boolean;

  // Analytics
  analytics: AnalyticsData;
  trackCakeView: (cakeId: string) => void;
  trackWhatsAppClick: () => void;

  // Toast Notification System
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;

  // Auth & Permissions
  currentUser: {
    uid: string;
    phone?: string;
    email?: string;
    role: 'guest' | 'customer' | 'admin' | 'owner';
    name?: string;
  };
  authToken: string | null;
  isStaffOrOwner: boolean;
  loginAsAdmin: (email: string, password: string) => Promise<{ success: boolean; message: string; status?: string }>;
  loginAsCustomerPhone: (phone: string, otp: string) => Promise<OtpVerifyResult>;
  requestCustomerOtp: (phone: string) => Promise<OtpRequestResult>;
  logout: () => Promise<void>;
  updateSmsGatewaySettings: (gatewayConfig: Partial<SmsGatewayConfig>) => void;

  // Customer Email & Password Authentication (NO MOBILE OTP)
  registerCustomerAccount: (params: { name: string; username: string; email: string; password: string; phone?: string }) => Promise<{ success: boolean; message: string; customer?: any }>;
  loginCustomerAccount: (identifier: string, password: string) => Promise<{ success: boolean; message: string; customer?: any; status?: string }>;
  logoutCustomerAccount: () => Promise<void>;
  requestCustomerPasswordOtp: (email: string) => Promise<{ success: boolean; status?: string; message: string; cooldownSeconds?: number }>;
  verifyCustomerPasswordOtp: (email: string, otp: string) => Promise<{ success: boolean; status?: string; message: string; remainingAttempts?: number; recoveryToken?: string }>;
  resetCustomerPasswordWithOtp: (email: string, recoveryToken: string, newPassword: string) => Promise<{ success: boolean; message: string; error?: string }>;
  changeCustomerPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;

  // Admin Account & Security Operations (NO MOBILE OTP)
  changeAdminPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  requestAdminPasswordResetLink: (email: string) => Promise<{ success: boolean; status?: string; message: string }>;
  resetAdminPasswordWithToken: (token: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  requestPasswordChangeOtp: (currentPassword: string) => Promise<OtpRequestResult>;
  changePasswordWithOtp: (currentPassword: string, otp: string, newPassword: string) => Promise<{ success: boolean; message: string; status?: string }>;
  fetchOwnerAccount: () => Promise<any>;
  updateOwnerEmail: (currentPassword: string, newEmail: string) => Promise<{ success: boolean; message: string }>;
  updateOwnerPhoneRequestOtp: (currentPassword: string, newPhone: string) => Promise<{ success: boolean; message: string }>;
  updateOwnerPhoneVerify: (currentPassword: string, otp: string, newPhone: string) => Promise<{ success: boolean; message: string }>;
  fetchActiveSessions: () => Promise<any>;
  revokeOtherSessions: () => Promise<any>;
  revokeAllSessions: () => Promise<any>;
  fetchStaffAccounts: () => Promise<any>;
  addStaffAccount: (name: string, email: string, password: string, role: string) => Promise<any>;
  removeStaffAccount: (id: string) => Promise<any>;
  fetchSecurityAuditLogs: () => Promise<any>;
  recoverAccountWithKey: (key: string, newPassword: string, newEmail?: string, newPhone?: string) => Promise<any>;
  initializeOwnerAccount: (email: string, phone: string, password?: string) => Promise<any>;
  testOwnerEmailDelivery: (recipient?: string) => Promise<any>;

  // Authorized Order IDs in current session (e.g. freshly placed or verified)
  sessionAuthorizedOrders: string[];
  authorizeOrderInSession: (orderId: string) => void;
  isOrderAuthorized: (order: CustomerOrder) => boolean;
  verifyOrderLookup: (orderNumber: string, phone: string) => CustomerOrder | null;

  // Cakes Management
  cakes: Cake[];
  addCake: (cake: Omit<Cake, 'id' | 'createdAt' | 'updatedAt'>) => Cake;
  updateCake: (id: string, updates: Partial<Cake>) => void;
  updateCakeAvailability: (cakeId: string, availability: Cake['availability'], status?: Cake['status']) => void;
  deleteCake: (id: string) => void;
  publishCake: (id: string, publish: boolean) => void;
  archiveCake: (id: string) => void;

  // Order Placement Form Preservation
  orderFormData: OrderDraftFormData;
  setOrderFormData: React.Dispatch<React.SetStateAction<OrderDraftFormData>>;
  clearOrderFormData: () => void;

  // Feedback Management
  feedbackList: CustomerFeedback[];
  submitFeedback: (feedback: Omit<CustomerFeedback, 'id' | 'createdAt' | 'status'>) => void;
  updateFeedbackStatus: (id: string, status: 'approved' | 'rejected', reply?: string) => void;

  // Enquiries & Quotes
  enquiries: CustomerEnquiry[];
  submitEnquiry: (enquiry: Omit<CustomerEnquiry, 'id' | 'referenceNumber' | 'status' | 'createdAt' | 'updatedAt'>) => CustomerEnquiry;
  updateEnquiryStatus: (id: string, status: CustomerEnquiry['status'], notes?: string, quote?: CustomerEnquiry['quote'], reminderDate?: string) => void;
  convertEnquiryToOrder: (enquiryId: string) => CustomerOrder | null;

  // Orders Management & Fulfilment Tracking
  orders: CustomerOrder[];
  createDirectOrder: (orderData: Omit<CustomerOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => CustomerOrder;
  acceptCustomerOrder: (orderId: string, note?: string) => void;
  rejectCustomerOrder: (orderId: string, reason: string) => void;
  cancelCustomerOrder: (orderId: string, reason: string) => void;
  updateOrderStatus: (id: string, status: OrderGeneralStatus, message?: string) => void;
  updateOrderFulfilmentStage: (id: string, stage: FulfilmentStage, title: string, message?: string, exceptionReason?: string) => void;
  updateOrderPaymentStatus: (id: string, status: OrderPaymentStatus, verifiedAmount?: number) => void;
  acceptQuote: (orderId: string) => void;
  requestOrderChange: (orderId: string, reason: string) => void;
  requestOrderCancellation: (orderId: string, reason: string) => void;
  reviewOrderChangeRequest: (orderId: string, requestId: string, approved: boolean, responseNote?: string) => void;

  // Manual UPI Payments
  paymentProofs: ManualPaymentProof[];
  submitPaymentProof: (proof: Omit<ManualPaymentProof, 'id' | 'submittedAt' | 'status'>) => void;
  verifyPaymentProof: (id: string, verified: boolean, reason?: string) => void;

  // Audit Logs
  auditLogs: AuditLogEntry[];
  addAuditLog: (action: string, details: string) => void;

  // Homepage Cake Slideshow
  slideshowSettings: SlideshowSettings;
  updateSlideshowSettings: (settings: Partial<SlideshowSettings>) => void;
  slideshowSlides: SlideshowSlide[];
  addSlideshowSlide: (slide: Omit<SlideshowSlide, 'id' | 'uploadedAt' | 'updatedAt'>) => SlideshowSlide;
  updateSlideshowSlide: (id: string, updates: Partial<SlideshowSlide>) => void;
  deleteSlideshowSlide: (id: string) => void;
  reorderSlideshowSlides: (reorderedIds: string[]) => void;

  // Invoices & Billing Operations
  generateOrderInvoice: (orderId: string) => { invoiceNumber: string; download: () => void; getBlob: () => Blob; getDataUri: () => string };
  downloadOrderInvoice: (orderId: string) => string;
  updateInvoiceSettings: (settingsUpdates: Partial<ShopSettings>) => void;
  assignInvoiceNumberToOrder: (orderId: string, customInvoiceNum?: string) => string;
  getAllInvoices: () => InvoiceRecord[];

  // Shopping Cart System
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartItemQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotalCount: number;
  cartSubtotal: number;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY_PREFIX = 'cake_junction_v3_';

function safeStorageGet<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (err) {
    console.warn(`Failed to read localStorage key ${key}:`, err);
    return fallback;
  }
}

function safeStorageSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to write localStorage key ${key} (storage quota exceeded?):`, err);
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Localization
  const [lang, setLangState] = useState<'en' | 'ta'>('en');

  // Router State
  const [route, setRoute] = useState<RouteState>(() => parseRouteFromLocation());

  // Listen to browser popstate (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      setRoute(parseRouteFromLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = useCallback((page: PageRoute, params: Record<string, string> = {}, replace = false) => {
    const nextRoute: RouteState = { page, params };
    const url = buildRouteUrl(page, params);
    if (replace) {
      window.history.replaceState({ page, params }, '', url);
    } else {
      window.history.pushState({ page, params }, '', url);
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goBack = useCallback((fallbackPage: PageRoute = 'home') => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigateTo(fallbackPage);
    }
  }, [navigateTo]);

  // Shop Settings
  const [settings, setSettings] = useState<ShopSettings>(() => {
    const saved = safeStorageGet(STORAGE_KEY_PREFIX + 'settings', DEFAULT_SHOP_SETTINGS);
    const normalized = normalizeShopSettingsSchema(saved, DEFAULT_SHOP_SETTINGS);
    if (!normalized.shopName || normalized.shopName === 'The Artisan Cake Studio') {
      normalized.shopName = 'Cake Junction';
    }
    // Update and persistently configure the verified Business WhatsApp number
    if (!normalized.whatsappNumber || normalized.whatsappNumber === '+91 98765 43210' || normalized.whatsappNumber === '9876543210') {
      normalized.whatsappNumber = '+91 8825648728';
    }
    if (!normalized.phone || normalized.phone === '+91 98765 43210' || normalized.phone === '9876543210') {
      normalized.phone = '+91 8825648728';
    }
    return normalized;
  });

  // Admin Session Token (Server authoritative)
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('cj_admin_token') || null;
    } catch {
      return null;
    }
  });

  // Current User
  const [currentUser, setCurrentUser] = useState<{
    uid: string;
    phone?: string;
    email?: string;
    role: 'guest' | 'customer' | 'admin' | 'owner';
    name?: string;
  }>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'user', { uid: 'guest-1', role: 'guest' });
  });

  // Verify server-side session on mount
  useEffect(() => {
    const checkServerSession = async () => {
      const storedToken = localStorage.getItem('cj_admin_token');
      if (storedToken) {
        try {
          const res = await fetch('/api/auth/verify-session', {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          const data = await res.json();
          if (res.ok && data.success && data.user) {
            setAuthToken(storedToken);
            setCurrentUser({
              uid: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role
            });
            return;
          }
        } catch (err) {
          console.warn('Server session verification error:', err);
        }
        // Token invalid, expired, or server rejected
        localStorage.removeItem('cj_admin_token');
        setAuthToken(null);
        setCurrentUser(prev => (prev.role === 'admin' || prev.role === 'owner') ? { uid: 'guest-1', role: 'guest' } : prev);
      }
    };
    checkServerSession();
  }, []);

  const isStaffOrOwner = currentUser.role === 'owner' || currentUser.role === 'admin';

  // Session authorized orders (orders placed or verified in current session)
  const [sessionAuthorizedOrders, setSessionAuthorizedOrders] = useState<string[]>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'session_orders', []);
  });

  // Order Placement Form state (preserves inputs on back/forward or validation correction)
  const [orderFormData, setOrderFormData] = useState<OrderDraftFormData>(() => {
    try {
      const saved = sessionStorage.getItem('cj_order_draft');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('cj_order_draft', JSON.stringify(orderFormData));
    } catch {}
  }, [orderFormData]);

  const clearOrderFormData = useCallback(() => {
    setOrderFormData({});
    try {
      sessionStorage.removeItem('cj_order_draft');
    } catch {}
  }, []);

  // Customer Wishlist
  const [wishlist, setWishlist] = useState<string[]>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'wishlist', []);
  });

  // Analytics
  const [analytics, setAnalytics] = useState<AnalyticsData>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'analytics', { cakeViews: 920, whatsAppClicks: 165, enquiriesSubmitted: 42 });
  });

  // Cakes
  const [cakes, setCakes] = useState<Cake[]>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'cakes', SAMPLE_CAKES);
  });

  // Feedback
  const [feedbackList, setFeedbackList] = useState<CustomerFeedback[]>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'feedback', INITIAL_APPROVED_REVIEWS);
  });

  // Enquiries
  const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'enquiries', INITIAL_ENQUIRIES);
  });

  // Orders
  const [orders, setOrders] = useState<CustomerOrder[]>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'orders', INITIAL_ORDERS);
  });

  // Payment proofs
  const [paymentProofs, setPaymentProofs] = useState<ManualPaymentProof[]>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'paymentProofs', []);
  });

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'auditLogs', [
      {
        id: 'log-1',
        action: 'System Boot',
        userEmail: 'system@cakejunction.internal',
        details: 'Store initialized with persistent cloud order tracking and verified UPI payments.',
        timestamp: new Date().toISOString()
      }
    ]);
  });

  // Homepage Cake Slideshow state
  const [slideshowSettings, setSlideshowSettings] = useState<SlideshowSettings>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'slideshow_settings', DEFAULT_SLIDESHOW_SETTINGS);
  });

  const [slideshowSlides, setSlideshowSlides] = useState<SlideshowSlide[]>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'slideshow_slides', INITIAL_SLIDESHOW_SLIDES);
  });

  // Shopping Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    return safeStorageGet(STORAGE_KEY_PREFIX + 'cart', []);
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // LocalStorage Sync
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'settings', settings); }, [settings]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'user', currentUser); }, [currentUser]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'wishlist', wishlist); }, [wishlist]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'analytics', analytics); }, [analytics]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'cakes', cakes); }, [cakes]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'feedback', feedbackList); }, [feedbackList]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'enquiries', enquiries); }, [enquiries]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'orders', orders); }, [orders]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'paymentProofs', paymentProofs); }, [paymentProofs]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'auditLogs', auditLogs); }, [auditLogs]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'session_orders', sessionAuthorizedOrders); }, [sessionAuthorizedOrders]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'slideshow_settings', slideshowSettings); }, [slideshowSettings]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'slideshow_slides', slideshowSlides); }, [slideshowSlides]);
  useEffect(() => { safeStorageSet(STORAGE_KEY_PREFIX + 'cart', cart); }, [cart]);

  const setLang = (newLang: 'en' | 'ta') => {
    setLangState(newLang);
  };

  const t = lang === 'ta' && settings.isTamilEnabled ? taTranslations : enTranslations;

  const toggleWishlist = (cakeId: string) => {
    setWishlist(prev => 
      prev.includes(cakeId) ? prev.filter(id => id !== cakeId) : [...prev, cakeId]
    );
  };

  const isWishlisted = (cakeId: string) => wishlist.includes(cakeId);

  const trackCakeView = (cakeId: string) => {
    setAnalytics(prev => ({ ...prev, cakeViews: prev.cakeViews + 1 }));
    setCakes(prev => prev.map(c => c.id === cakeId ? { ...c, viewCount: (c.viewCount || 0) + 1 } : c));
  };

  const trackWhatsAppClick = () => {
    setAnalytics(prev => ({ ...prev, whatsAppClicks: prev.whatsAppClicks + 1 }));
  };

  const addAuditLog = (action: string, details: string) => {
    const entry: AuditLogEntry = {
      id: 'log-' + Date.now(),
      action,
      userEmail: currentUser.email || currentUser.phone || 'admin@cakejunction.owner',
      details,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [entry, ...prev.slice(0, 199)]);
  };

  const updateSettings = (newSettings: Partial<ShopSettings>) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Settings Alteration Blocked', `User ${currentUser.uid} (${currentUser.role}) attempted to alter settings`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can update shop settings.');
    }
    setSettings(prev => {
      const isOpen = newSettings.is_open !== undefined 
        ? Boolean(newSettings.is_open) 
        : (newSettings.isOpen !== undefined ? Boolean(newSettings.isOpen) : prev.is_open);
      const updated: ShopSettings = { 
        ...prev, 
        ...newSettings,
        is_open: isOpen,
        isOpen: isOpen
      };
      addAuditLog('Settings Updated', `Modified shop settings: ${Object.keys(newSettings).join(', ')}`);
      return updated;
    });
  };

  const updateShopAvailability = (availability: { is_open: boolean; closureMessage?: string; reopeningTimestamp?: string | null }) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Shop Availability Alteration Blocked', `User ${currentUser.uid} (${currentUser.role}) attempted to alter availability`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can update shop availability.');
    }
    setSettings(prev => {
      const updated: ShopSettings = {
        ...prev,
        is_open: Boolean(availability.is_open),
        isOpen: Boolean(availability.is_open),
        closureMessage: availability.closureMessage !== undefined ? availability.closureMessage : prev.closureMessage,
        reopeningTimestamp: availability.reopeningTimestamp !== undefined ? availability.reopeningTimestamp : prev.reopeningTimestamp,
      };
      addAuditLog(
        availability.is_open ? 'Shop Opened' : 'Shop Closed',
        `Master availability changed to ${availability.is_open ? 'OPEN (Accepting new orders)' : 'CLOSED (New orders paused)'}.`
      );
      return updated;
    });
  };

  const checkShopOpenStatus = (): { allowed: boolean; reason?: string } => {
    return verifyShopOrderAcceptance(settings);
  };

  const resetToDefaultSettings = () => {
    setSettings(DEFAULT_SHOP_SETTINGS);
    addAuditLog('Settings Reset', 'Reset shop settings to initial defaults.');
  };

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? null : prev);
    }, 4000);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Shopping Cart Operations
  const addToCart = useCallback((item: Omit<CartItem, 'id' | 'addedAt'>) => {
    if (settings.is_open === false || settings.isOpen === false) {
      showToast(settings.closureMessage || 'Cake Junction is currently closed for new orders.', 'error');
      return;
    }

    setCart(prev => {
      const existingIdx = prev.findIndex(ci => 
        ci.cakeId === item.cakeId &&
        ci.weight === item.weight &&
        ci.flavour === item.flavour &&
        ci.isEggless === item.isEggless &&
        (ci.cakeMessage || '') === (item.cakeMessage || '')
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: Math.min(10, updated[existingIdx].quantity + item.quantity)
        };
        return updated;
      }

      const newItem: CartItem = {
        ...item,
        id: `cart-${item.cakeId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        addedAt: new Date().toISOString()
      };
      return [...prev, newItem];
    });

    showToast(`Added ${item.cakeName} (${item.weight}) to your cart!`, 'success');
  }, [settings, showToast]);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart(prev => prev.filter(ci => ci.id !== cartItemId));
    showToast('Item removed from cart', 'info');
  }, [showToast]);

  const updateCartItemQuantity = useCallback((cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(prev => prev.map(ci => ci.id === cartItemId ? { ...ci, quantity: Math.min(10, Math.max(1, quantity)) } : ci));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  // Real Server-Authoritative Admin Login
  const loginAsAdmin = async (email: string, password: string): Promise<{ success: boolean; message: string; status?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success && data.token) {
        localStorage.setItem('cj_admin_token', data.token);
        setAuthToken(data.token);
        setCurrentUser({
          uid: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role
        });
        addAuditLog('Admin Login', `${data.user.name} authenticated via verified credentials.`);
        showToast(`Welcome! Logged in as ${data.user.name}.`, 'success');
        return { success: true, message: data.message || 'Login successful.' };
      } else {
        return {
          success: false,
          message: data.message || 'Invalid email or password. Please verify credentials.',
          status: data.status || 'incorrect_credentials'
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Network error connecting to authentication server.'
      };
    }
  };

  // Customer Email & Password Authentication (NO MOBILE OTP)
  const registerCustomerAccount = async (params: { name: string; username: string; email: string; password: string; phone?: string }): Promise<{ success: boolean; message: string; customer?: any }> => {
    try {
      const response = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success && data.token) {
        localStorage.setItem('cj_cust_token', data.token);
        setCurrentUser({
          uid: data.customer.id,
          email: data.customer.email,
          name: data.customer.name,
          phone: data.customer.phone,
          role: 'customer'
        });
        showToast(`Welcome to Cake Junction, ${data.customer.name}!`, 'success');
        return { success: true, message: data.message || 'Registration successful.', customer: data.customer };
      } else {
        return { success: false, message: data.message || 'Failed to create customer account.' };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error connecting to registration server.' };
    }
  };

  const loginCustomerAccount = async (identifier: string, password: string): Promise<{ success: boolean; message: string; customer?: any; status?: string }> => {
    try {
      const response = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success && data.token) {
        localStorage.setItem('cj_cust_token', data.token);
        setCurrentUser({
          uid: data.customer.id,
          email: data.customer.email,
          name: data.customer.name,
          phone: data.customer.phone,
          role: 'customer'
        });
        showToast(`Welcome back, ${data.customer.name}!`, 'success');
        return { success: true, message: data.message || 'Login successful.', customer: data.customer };
      } else {
        return { success: false, message: data.message || 'Invalid username/email or password.', status: data.status };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error connecting to customer portal.' };
    }
  };

  const logoutCustomerAccount = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('cj_cust_token');
      if (token) {
        await fetch('/api/customer/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('cj_cust_token');
      setCurrentUser({ uid: 'guest-1', role: 'guest' });
      showToast('You have been logged out safely.', 'info');
    }
  };

  const requestCustomerPasswordOtp = async (email: string): Promise<{ success: boolean; status?: string; message: string; cooldownSeconds?: number }> => {
    try {
      const response = await fetch('/api/customer/password/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to request verification code.' };
    }
  };

  const verifyCustomerPasswordOtp = async (email: string, otp: string): Promise<{ success: boolean; status?: string; message: string; remainingAttempts?: number; recoveryToken?: string }> => {
    try {
      const response = await fetch('/api/customer/password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Error verifying code.' };
    }
  };

  const resetCustomerPasswordWithOtp = async (email: string, recoveryToken: string, newPassword: string): Promise<{ success: boolean; message: string; error?: string }> => {
    try {
      const response = await fetch('/api/customer/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recoveryToken, newPassword })
      });
      const data = await response.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Error resetting password.' };
    }
  };

  const changeCustomerPassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const token = localStorage.getItem('cj_cust_token');
      const response = await fetch('/api/customer/password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Error updating password.' };
    }
  };

  // Admin Email-based Password Operations (NO MOBILE OTP)
  const changeAdminPassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to change administrator password.' };
    }
  };

  const requestAdminPasswordResetLink = async (email: string): Promise<{ success: boolean; status?: string; message: string }> => {
    try {
      const response = await fetch('/api/auth/password/request-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to dispatch password reset link.' };
    }
  };

  const resetAdminPasswordWithToken = async (token: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch('/api/auth/password/reset-with-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await response.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to reset password.' };
    }
  };

  // Admin Account & Security Operations
  const requestPasswordChangeOtp = async (currentPassword: string): Promise<OtpRequestResult> => {
    try {
      const response = await fetch('/api/auth/password/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        },
        body: JSON.stringify({ currentPassword })
      });

      const data = await response.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      return {
        success: false,
        status: 'gateway_error',
        message: err.message || 'Failed to request password verification OTP.'
      };
    }
  };

  const changePasswordWithOtp = async (currentPassword: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string; status?: string }> => {
    try {
      const response = await fetch('/api/auth/password/change-with-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        },
        body: JSON.stringify({ currentPassword, otp, newPassword })
      });

      const data = await response.json().catch(() => ({}));
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to change password.'
      };
    }
  };

  const fetchOwnerAccount = async () => {
    try {
      const response = await fetch('/api/auth/owner-account', {
        headers: {
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateOwnerEmail = async (currentPassword: string, newEmail: string) => {
    try {
      const response = await fetch('/api/auth/email/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        },
        body: JSON.stringify({ currentPassword, newEmail })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateOwnerPhoneRequestOtp = async (currentPassword: string, newPhone: string) => {
    try {
      const response = await fetch('/api/auth/phone/update-request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        },
        body: JSON.stringify({ currentPassword, newPhone })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const updateOwnerPhoneVerify = async (currentPassword: string, otp: string, newPhone: string) => {
    try {
      const response = await fetch('/api/auth/phone/update-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        },
        body: JSON.stringify({ currentPassword, otp, newPhone })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, sessions: [] };
    }
  };

  const revokeOtherSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions/revoke-others', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const revokeAllSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions/revoke-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const fetchStaffAccounts = async () => {
    try {
      const response = await fetch('/api/auth/staff', {
        headers: {
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, staff: [] };
    }
  };

  const addStaffAccount = async (name: string, email: string, password: string, role: string) => {
    try {
      const response = await fetch('/api/auth/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        },
        body: JSON.stringify({ name, email, password, role })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const removeStaffAccount = async (id: string) => {
    try {
      const response = await fetch(`/api/auth/staff/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const fetchSecurityAuditLogs = async () => {
    try {
      const response = await fetch('/api/auth/security-logs', {
        headers: {
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        }
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, logs: [] };
    }
  };

  const recoverAccountWithKey = async (recoveryKey: string, newPassword: string, newEmail?: string, newPhone?: string) => {
    try {
      const response = await fetch('/api/auth/recovery/verify-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recoveryKey, newPassword, newEmail, newPhone })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const initializeOwnerAccount = async (email: string, phone: string, password?: string) => {
    try {
      const response = await fetch('/api/auth/owner-account/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        },
        body: JSON.stringify({ email, phone, password })
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to initialize owner account.' };
    }
  };

  const testOwnerEmailDelivery = async (recipient?: string) => {
    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || localStorage.getItem('cj_admin_token')}`
        },
        body: JSON.stringify({ testRecipient: recipient })
      });
      return await response.json();
    } catch (err: any) {
      return {
        success: false,
        deliveryStatus: 'FAIL' as const,
        status: 'failed' as const,
        message: err.message || 'Network error while executing delivery test.'
      };
    }
  };

  const requestCustomerOtp = async (phone: string): Promise<OtpRequestResult> => {
    const validation = validateAndNormalizeIndianPhone(phone);
    if (!validation.isValid || !validation.normalizedPhone) {
      const err = validation.errorMessage || 'Please enter a valid 10-digit Indian mobile number.';
      addAuditLog('OTP Request Failed', `Validation error for phone "${phone}": ${err}`);
      return {
        success: false,
        status: 'invalid_phone',
        message: err
      };
    }

    const res = await dispatchOtpRequest(phone, settings.smsGateway);
    if (res.success) {
      addAuditLog('OTP Dispatched', `SMS OTP dispatched to ${validation.displayPhone} via ${res.deliveryProvider || 'gateway'}. Reference: ${res.referenceId || 'N/A'}`);
    } else {
      addAuditLog('OTP Request Unfulfilled', `OTP request for ${validation.displayPhone}: [${res.status}] ${res.message}`);
    }
    return res;
  };

  const loginAsCustomerPhone = async (phone: string, otp: string): Promise<OtpVerifyResult> => {
    const validation = validateAndNormalizeIndianPhone(phone);
    if (!validation.isValid || !validation.normalizedPhone) {
      return {
        success: false,
        status: 'no_active_otp',
        message: validation.errorMessage || 'Please enter a valid 10-digit mobile number.'
      };
    }

    const res = await verifyOtpCode(phone, otp);
    if (res.success) {
      const user = {
        uid: 'cust-' + validation.normalizedPhone,
        phone: validation.displayPhone || `+91 ${validation.normalizedPhone}`,
        role: 'customer' as const,
        name: 'Guest Customer (' + validation.normalizedPhone.slice(-4) + ')'
      };
      setCurrentUser(user);
      addAuditLog('Customer Login', `Customer authenticated via verified OTP (${validation.displayPhone})`);
      showToast(`Welcome! Logged in as ${validation.displayPhone}`, 'success');
    } else {
      addAuditLog('OTP Verification Failed', `Failed OTP verification for ${validation.displayPhone}: ${res.status} (${res.message})`);
    }
    return res;
  };

  const updateSmsGatewaySettings = (gatewayConfig: Partial<SmsGatewayConfig>) => {
    setSettings(prev => {
      const updatedSms: SmsGatewayConfig = {
        ...(prev.smsGateway || {
          provider: 'none',
          apiKey: '',
          senderId: 'CKJNCT',
          dltTemplateId: '',
          entityId: '',
          isLive: false,
          status: 'unconfigured',
          lastTestStatus: 'not_tested'
        }),
        ...gatewayConfig
      };
      const updated = { ...prev, smsGateway: updatedSms };
      addAuditLog('SMS Settings Updated', `Updated SMS gateway provider: ${updatedSms.provider}, live: ${updatedSms.isLive}`);
      return updated;
    });
  };

  const logout = async () => {
    try {
      const token = authToken || localStorage.getItem('cj_admin_token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {});
      }
    } catch {}
    localStorage.removeItem('cj_admin_token');
    setAuthToken(null);
    setCurrentUser({ uid: 'guest-' + Date.now(), role: 'guest' });
    clearOrderFormData();
    setSessionAuthorizedOrders([]);
    safeStorageSet(STORAGE_KEY_PREFIX + 'user', { uid: 'guest-1', role: 'guest' });
    showToast('Signed out safely.', 'info');
    navigateTo('home', {}, true);
  };

  const authorizeOrderInSession = (orderId: string) => {
    setSessionAuthorizedOrders(prev => prev.includes(orderId) ? prev : [...prev, orderId]);
  };

  const isOrderAuthorized = (order: CustomerOrder): boolean => {
    if (currentUser.role === 'admin' || currentUser.role === 'owner') return true;
    if (sessionAuthorizedOrders.includes(order.id) || sessionAuthorizedOrders.includes(order.orderNumber)) return true;
    if (currentUser.email && order.customerEmail && currentUser.email.toLowerCase().trim() === order.customerEmail.toLowerCase().trim()) return true;
    if (currentUser.phone) {
      const cleanCust = currentUser.phone.replace(/\D/g, '').slice(-10);
      const cleanOrderPhone = order.customerPhone.replace(/\D/g, '').slice(-10);
      if (cleanCust && cleanOrderPhone && cleanCust === cleanOrderPhone) return true;
    }
    return false;
  };

  const verifyOrderLookup = (orderNumber: string, emailOrPhone: string): CustomerOrder | null => {
    const cleanInput = emailOrPhone.trim().toLowerCase();
    const cleanPhone = emailOrPhone.replace(/\D/g, '').slice(-10);
    const order = orders.find(o => {
      const matchesNum = (o.orderNumber.toLowerCase() === orderNumber.trim().toLowerCase() || o.id === orderNumber.trim());
      if (!matchesNum) return false;
      if (o.customerEmail && o.customerEmail.toLowerCase() === cleanInput) return true;
      if (cleanPhone && cleanPhone.length === 10 && o.customerPhone.replace(/\D/g, '').slice(-10) === cleanPhone) return true;
      return false;
    });
    if (order) {
      authorizeOrderInSession(order.id);
      authorizeOrderInSession(order.orderNumber);
    }
    return order || null;
  };

  // Cakes Management
  const addCake = (cakeData: Omit<Cake, 'id' | 'createdAt' | 'updatedAt'>): Cake => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Cake Creation', `User ${currentUser.uid} (${currentUser.role}) attempted to create a cake`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can add cakes.');
    }
    const id = 'cake-' + Date.now();
    const isPub = cakeData.status ? cakeData.status === 'published' : (cakeData.isPublished ?? true);
    const newCake: Cake = {
      ...cakeData,
      id,
      isPublished: isPub,
      status: cakeData.status || (isPub ? 'published' : 'draft'),
      viewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCakes(prev => [newCake, ...prev]);
    addAuditLog('Cake Created', `Added cake '${newCake.name}' (${newCake.category}, ${newCake.status})`);
    return newCake;
  };

  const updateCake = (id: string, updates: Partial<Cake>) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Cake Edit', `User ${currentUser.uid} (${currentUser.role}) attempted to edit cake ${id}`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can update cakes.');
    }
    setCakes(prev => prev.map(c => {
      if (c.id === id) {
        const isPub = updates.status !== undefined 
          ? updates.status === 'published' 
          : (updates.isPublished !== undefined ? updates.isPublished : c.isPublished);
        return { 
          ...c, 
          ...updates, 
          isPublished: isPub,
          status: updates.status || (isPub ? 'published' : c.status || 'draft'),
          updatedAt: new Date().toISOString() 
        };
      }
      return c;
    }));
    addAuditLog('Cake Modified', `Updated cake id ${id}`);
  };

  const updateCakeAvailability = (cakeId: string, availability: Cake['availability'], status?: Cake['status']) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Cake Availability Change', `User ${currentUser.uid} (${currentUser.role}) attempted to change availability for ${cakeId}`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can update cake availability.');
    }

    setCakes(prev => prev.map(c => {
      if (c.id === cakeId) {
        const nextStatus = status || c.status || 'published';
        const isPub = nextStatus === 'published' && availability !== 'sold_out';
        return {
          ...c,
          availability,
          status: nextStatus,
          isPublished: isPub,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    }));
    addAuditLog('Cake Availability Changed', `Cake ${cakeId} availability updated to ${availability}`);
    showToast(`Cake status updated to ${availability.replace('_', ' ')}.`, 'success');
  };

  const deleteCake = (id: string) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Cake Deletion', `User ${currentUser.uid} (${currentUser.role}) attempted to delete cake ${id}`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can delete cakes.');
    }
    setCakes(prev => prev.filter(c => c.id !== id));
    addAuditLog('Cake Removed', `Deleted cake id ${id}`);
  };

  const publishCake = (id: string, publish: boolean) => {
    if (!isStaffOrOwner) {
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can change cake publication.');
    }
    updateCake(id, { 
      isPublished: publish, 
      status: publish ? 'published' : 'draft' 
    });
    addAuditLog('Cake Status Changed', `Cake ${id} set to ${publish ? 'Published' : 'Draft'}`);
  };

  const archiveCake = (id: string) => {
    if (!isStaffOrOwner) {
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can archive cakes.');
    }
    updateCake(id, { 
      isPublished: false, 
      status: 'archived' 
    });
    addAuditLog('Cake Archived', `Cake ${id} moved to archive`);
  };

  // Feedback Management
  const submitFeedback = (fbData: Omit<CustomerFeedback, 'id' | 'createdAt' | 'status'>) => {
    const newFeedback: CustomerFeedback = {
      ...fbData,
      id: 'rev-' + Date.now(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setFeedbackList(prev => [newFeedback, ...prev]);
    addAuditLog('Feedback Submitted', `Review submitted by ${fbData.customerName || 'Anonymous'}`);
  };

  const updateFeedbackStatus = (id: string, status: 'approved' | 'rejected', reply?: string) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Feedback Moderation', `User ${currentUser.uid} (${currentUser.role}) attempted to moderate review ${id}`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can moderate customer reviews.');
    }
    setFeedbackList(prev => prev.map(f => {
      if (f.id === id) {
        return {
          ...f,
          status,
          publicReply: reply !== undefined ? reply : f.publicReply,
          approvedAt: status === 'approved' ? new Date().toISOString() : undefined
        };
      }
      return f;
    }));
    addAuditLog('Feedback Moderated', `Review ${id} status set to ${status}`);
  };

  // Enquiries & Quotes
  const submitEnquiry = (enqData: Omit<CustomerEnquiry, 'id' | 'referenceNumber' | 'status' | 'createdAt' | 'updatedAt'>): CustomerEnquiry => {
    const count = enquiries.length + 1;
    const ref = `ENQ-2026-${String(count).padStart(3, '0')}`;
    const newEnq: CustomerEnquiry = {
      ...enqData,
      id: 'enq-' + Date.now(),
      referenceNumber: ref,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEnquiries(prev => [newEnq, ...prev]);
    setAnalytics(prev => ({ ...prev, enquiriesSubmitted: prev.enquiriesSubmitted + 1 }));
    addAuditLog('Custom Enquiry Received', `New enquiry ${ref} from ${enqData.customerName}`);
    return newEnq;
  };

  const updateEnquiryStatus = (
    id: string, 
    status: CustomerEnquiry['status'], 
    notes?: string, 
    quote?: CustomerEnquiry['quote'],
    reminderDate?: string
  ) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Enquiry Status Alteration', `User ${currentUser.uid} (${currentUser.role}) attempted to change enquiry ${id}`);
      throw new Error('Unauthorized: Only authorized admin or owner can update enquiry status.');
    }
    setEnquiries(prev => prev.map(e => {
      if (e.id === id) {
        return {
          ...e,
          status,
          internalNotes: notes !== undefined ? notes : e.internalNotes,
          quote: quote !== undefined ? quote : e.quote,
          followUpReminderDate: reminderDate !== undefined ? reminderDate : e.followUpReminderDate,
          updatedAt: new Date().toISOString()
        };
      }
      return e;
    }));
    addAuditLog('Enquiry Status Changed', `Enquiry ${id} updated to ${status}`);
  };

  const convertEnquiryToOrder = (enquiryId: string): CustomerOrder | null => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Order Conversion', `User ${currentUser.uid} (${currentUser.role}) attempted to convert enquiry ${enquiryId}`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can convert enquiries into orders.');
    }
    // 1. Verify shop's is_open status before converting and creating order
    const acceptance = verifyShopOrderAcceptance(settings);
    if (!acceptance.allowed) {
      addAuditLog('Order Conversion Blocked (Shop Closed)', `Blocked converting enquiry ${enquiryId} to order - shop is marked closed.`);
      throw new Error(`Order Conversion Rejected: ${acceptance.reason}`);
    }

    const enq = enquiries.find(e => e.id === enquiryId);
    if (!enq) return null;

    const total = enq.quote ? enq.quote.totalAmount : (enq.budgetInr || 2500);
    const deposit = enq.quote ? enq.quote.depositRequired : Math.round(total * 0.5);

    const initialHistory: FulfilmentUpdateEntry[] = [
      {
        id: 'fh-' + Date.now(),
        stage: 'confirmed',
        timestamp: new Date().toISOString(),
        title: 'Quote Accepted & Order Confirmed',
        message: 'Bespoke cake order initiated from custom enquiry. Scheduled for production.',
        updatedBy: 'Chef Ananya R.'
      }
    ];

    const newOrder: CustomerOrder = {
      id: 'ord-' + Date.now(),
      orderNumber: `ORD-2026-${Math.floor(100 + Math.random() * 900)}`,
      enquiryId: enq.id,
      cakeId: enq.cakeId,
      cakeName: enq.cakeName || `${enq.occasion || 'Custom'} Bespoke Cake`,
      flavour: enq.flavour || 'Artisan Vanilla Bean',
      weight: enq.selectedWeight || '1.5 kg',
      quantity: enq.quantity || 1,
      unitPrice: total,
      totalAmount: total,
      depositAmount: deposit,
      verifiedPaidAmount: 0,
      outstandingBalance: total,
      orderStatus: 'confirmed',
      fulfilmentStage: 'confirmed',
      fulfilmentHistory: initialHistory,
      paymentStatus: 'awaiting_payment',
      customerName: enq.customerName,
      customerPhone: enq.phone,
      isEggless: enq.isEggless,
      cakeMessage: enq.cakeMessage,
      occasion: enq.occasion,
      colourTheme: enq.colourTheme,
      specialInstructions: enq.message,
      privateReferenceImages: enq.referenceImageUrls,
      fulfilmentDate: enq.requiredDate,
      fulfilmentTimeSlot: enq.preferredTime || 'Afternoon (01:00 PM - 05:00 PM)',
      deliveryOrPickup: enq.deliveryOrPickup,
      deliveryAddress: enq.address,
      deliveryFee: enq.quote ? enq.quote.deliveryCharge : 0,
      latestUpdateMessage: 'Quote Accepted & Order Confirmed. Production scheduled.',
      isCustomCakeQuote: true,
      quoteDetails: enq.quote ? {
        quoteSentAt: enq.updatedAt,
        validUntil: enq.quote.expiryDate,
        notes: enq.quote.notes,
        quotedBy: 'Head Chef'
      } : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setOrders(prev => [newOrder, ...prev]);
    authorizeOrderInSession(newOrder.id);
    authorizeOrderInSession(newOrder.orderNumber);
    updateEnquiryStatus(enquiryId, 'confirmed', 'Converted to order ' + newOrder.orderNumber);
    addAuditLog('Order Created from Enquiry', `Generated order ${newOrder.orderNumber} for ${enq.customerName}`);
    return newOrder;
  };

  // Direct Orders Management & Fulfilment Tracking
  const createDirectOrder = (orderData: Omit<CustomerOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): CustomerOrder => {
    // 1. Verify shop's is_open status before saving any new order
    const acceptance = verifyShopOrderAcceptance(settings);
    if (!acceptance.allowed) {
      addAuditLog('Order Rejected (Shop Closed)', `Blocked order attempt for ${orderData.customerName} - shop is marked closed.`);
      throw new Error(acceptance.reason || 'Cake Junction is currently closed and not accepting new orders at this time.');
    }

    // 2. Verify cake availability (Prevent orders for sold out, unavailable, draft or archived cakes)
    if (orderData.cakeId) {
      const targetCake = cakes.find(c => c.id === orderData.cakeId);
      if (targetCake) {
        if (targetCake.availability === 'sold_out') {
          throw new Error(`Order Rejected: "${targetCake.name}" is currently Sold Out.`);
        }
        if (targetCake.availability === 'temporarily_unavailable') {
          throw new Error(`Order Rejected: "${targetCake.name}" is Temporarily Unavailable.`);
        }
        if (targetCake.status === 'archived' || targetCake.status === 'draft' || targetCake.isPublished === false) {
          throw new Error(`Order Rejected: "${targetCake.name}" is not currently available in the active catalogue.`);
        }
      }
    }

    const id = 'ord-' + Date.now();
    const orderNumber = `ORD-2026-${Math.floor(100 + Math.random() * 900)}`;

    const initialHistory: FulfilmentUpdateEntry[] = orderData.fulfilmentHistory && orderData.fulfilmentHistory.length > 0
      ? orderData.fulfilmentHistory
      : [
          {
            id: 'fh-' + Date.now(),
            stage: 'awaiting_confirmation',
            timestamp: new Date().toISOString(),
            title: 'Order Placed — Awaiting Confirmation',
            message: 'Your cake reservation has been submitted. The bakery owner will review and accept your order into production.',
            updatedBy: 'Customer Checkout'
          }
        ];

    const newOrder: CustomerOrder = {
      ...orderData,
      id,
      orderNumber,
      fulfilmentHistory: initialHistory,
      fulfilmentStage: 'awaiting_confirmation',
      orderStatus: 'awaiting_confirmation',
      acceptanceStatus: 'pending_confirmation',
      latestUpdateMessage: orderData.latestUpdateMessage || initialHistory[0]?.message,
      verifiedPaidAmount: orderData.verifiedPaidAmount || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setOrders(prev => [newOrder, ...prev]);
    authorizeOrderInSession(id);
    authorizeOrderInSession(orderNumber);
    addAuditLog('Direct Order Submitted', `Order ${orderNumber} submitted by ${newOrder.customerName} (₹${newOrder.totalAmount}). Pending owner acceptance.`);

    // Broadcast to real-time sync channel
    broadcastOrderUpdate({
      orderId: id,
      orderNumber,
      newStatus: 'awaiting_confirmation',
      newStage: 'awaiting_confirmation',
      timestamp: newOrder.createdAt,
      title: 'Order Placed — Awaiting Confirmation',
      message: initialHistory[0]?.message,
      updatedBy: 'Customer Checkout'
    });

    return newOrder;
  };

  const acceptCustomerOrder = (id: string, note?: string) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Order Acceptance', `User ${currentUser.uid} (${currentUser.role}) attempted to accept order ${id}`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can accept orders.');
    }

    const target = orders.find(o => o.id === id);
    if (!target) return;

    const acceptedTitle = 'Order Accepted & Production Scheduled';
    const acceptedMsg = note?.trim() || 'Head baker accepted order into the kitchen baking queue.';
    const entry: FulfilmentUpdateEntry = {
      id: 'fh-' + Date.now(),
      stage: 'confirmed',
      timestamp: new Date().toISOString(),
      title: acceptedTitle,
      message: acceptedMsg,
      updatedBy: currentUser.name || 'Bakery Owner'
    };

    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          orderStatus: 'confirmed',
          fulfilmentStage: 'confirmed',
          acceptanceStatus: 'accepted',
          acceptedAt: new Date().toISOString(),
          acceptedBy: currentUser.name || currentUser.email || 'Bakery Owner',
          acceptanceNote: acceptedMsg,
          latestUpdateMessage: acceptedMsg,
          fulfilmentHistory: [...(o.fulfilmentHistory || []), entry],
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));

    addAuditLog('Order Accepted', `Order ${target.orderNumber} accepted by ${currentUser.name || 'Owner'}`);
    broadcastOrderUpdate({
      orderId: target.id,
      orderNumber: target.orderNumber,
      newStatus: 'confirmed',
      newStage: 'confirmed',
      timestamp: entry.timestamp,
      title: acceptedTitle,
      message: acceptedMsg,
      updatedBy: entry.updatedBy
    });

    // Backend sync: updates persistent store and dispatches automatic customer email notification
    fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      body: JSON.stringify({ orderStatus: 'confirmed', fulfilmentStage: 'confirmed', latestUpdateMessage: acceptedMsg })
    }).catch(e => console.warn('Order acceptance backend sync:', e));

    showToast(`Order ${target.orderNumber} accepted successfully!`, 'success');
  };

  const rejectCustomerOrder = (id: string, reason: string) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Order Rejection', `User ${currentUser.uid} (${currentUser.role}) attempted to reject order ${id}`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can reject orders.');
    }
    if (!reason?.trim()) {
      throw new Error('A recorded rejection reason is required to reject an order.');
    }

    const target = orders.find(o => o.id === id);
    if (!target) return;

    const rejectedTitle = 'Order Rejected';
    const rejectedMsg = `Order could not be accepted: ${reason.trim()}`;
    const entry: FulfilmentUpdateEntry = {
      id: 'fh-' + Date.now(),
      stage: 'rejected',
      timestamp: new Date().toISOString(),
      title: rejectedTitle,
      message: rejectedMsg,
      updatedBy: currentUser.name || 'Bakery Owner'
    };

    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          orderStatus: 'rejected',
          fulfilmentStage: 'rejected',
          acceptanceStatus: 'rejected',
          rejectionReason: reason.trim(),
          rejectedAt: new Date().toISOString(),
          rejectedBy: currentUser.name || currentUser.email || 'Bakery Owner',
          latestUpdateMessage: rejectedMsg,
          fulfilmentHistory: [...(o.fulfilmentHistory || []), entry],
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));

    addAuditLog('Order Rejected', `Order ${target.orderNumber} rejected. Reason: ${reason.trim()}`);
    broadcastOrderUpdate({
      orderId: target.id,
      orderNumber: target.orderNumber,
      newStatus: 'rejected',
      newStage: 'rejected',
      timestamp: entry.timestamp,
      title: rejectedTitle,
      message: rejectedMsg,
      updatedBy: entry.updatedBy,
      rejectionReason: reason.trim()
    });

    // Backend sync: updates persistent store and dispatches automatic customer email notification
    fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      body: JSON.stringify({ orderStatus: 'rejected', fulfilmentStage: 'rejected', rejectionReason: reason.trim(), latestUpdateMessage: rejectedMsg })
    }).catch(e => console.warn('Order rejection backend sync:', e));

    showToast(`Order ${target.orderNumber} rejected.`, 'info');
  };

  const cancelCustomerOrder = (id: string, reason: string) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Order Cancellation', `User ${currentUser.uid} (${currentUser.role}) attempted to cancel order ${id}`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can cancel orders.');
    }
    if (!reason?.trim()) {
      throw new Error('A recorded cancellation reason is required to cancel an order.');
    }

    const target = orders.find(o => o.id === id);
    if (!target) return;

    const cancelledTitle = 'Order Cancelled';
    const cancelledMsg = `Order cancelled by atelier: ${reason.trim()}`;
    const entry: FulfilmentUpdateEntry = {
      id: 'fh-' + Date.now(),
      stage: 'cancelled',
      timestamp: new Date().toISOString(),
      title: cancelledTitle,
      message: cancelledMsg,
      updatedBy: currentUser.name || 'Bakery Owner'
    };

    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          orderStatus: 'cancelled',
          fulfilmentStage: 'cancelled',
          acceptanceStatus: 'cancelled',
          cancellationReason: reason.trim(),
          cancelledAt: new Date().toISOString(),
          cancelledBy: currentUser.name || currentUser.email || 'Bakery Owner',
          latestUpdateMessage: cancelledMsg,
          fulfilmentHistory: [...(o.fulfilmentHistory || []), entry],
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));

    addAuditLog('Order Cancelled', `Order ${target.orderNumber} cancelled by admin. Reason: ${reason.trim()}`);
    broadcastOrderUpdate({
      orderId: target.id,
      orderNumber: target.orderNumber,
      newStatus: 'cancelled',
      newStage: 'cancelled',
      timestamp: entry.timestamp,
      title: cancelledTitle,
      message: cancelledMsg,
      updatedBy: entry.updatedBy,
      cancellationReason: reason.trim()
    });

    // Backend sync: updates persistent store and dispatches automatic customer email notification
    fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      body: JSON.stringify({ orderStatus: 'cancelled', fulfilmentStage: 'cancelled', cancellationReason: reason.trim(), latestUpdateMessage: cancelledMsg })
    }).catch(e => console.warn('Order cancellation backend sync:', e));

    showToast(`Order ${target.orderNumber} marked cancelled.`, 'info');
  };

  const updateOrderStatus = (id: string, status: OrderGeneralStatus, message?: string) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Status Change Blocked', `User ${currentUser.uid} (${currentUser.role}) attempted to alter order ${id}`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can update order status.');
    }

    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        return {
          ...o,
          orderStatus: status,
          latestUpdateMessage: message || o.latestUpdateMessage,
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));
    addAuditLog('Order Status Update', `Order ${id} changed to ${status}`);

    const target = orders.find(o => o.id === id);
    if (target) {
      broadcastOrderUpdate({
        orderId: target.id,
        orderNumber: target.orderNumber,
        newStatus: status,
        newStage: target.fulfilmentStage || 'confirmed',
        timestamp: new Date().toISOString(),
        title: `Status Updated to ${status}`,
        message,
        updatedBy: currentUser.name || 'Bakery Staff'
      });
    }

    // Backend sync: updates persistent store and dispatches automatic customer email notification
    fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json', 
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) 
      },
      body: JSON.stringify({ 
        orderStatus: status, 
        latestUpdateMessage: message 
      })
    }).then(res => res.json()).then(data => {
      if (data?.notification?.status === 'sent') {
        showToast('Status email dispatched to customer.', 'success');
      }
    }).catch(err => {
      console.warn('Backend order status sync warning:', err);
    });
  };

  const updateOrderFulfilmentStage = (id: string, stage: FulfilmentStage, title: string, message?: string, exceptionReason?: string) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Stage Change Blocked', `User ${currentUser.uid} (${currentUser.role}) attempted to advance stage for order ${id}`);
      throw new Error('Unauthorized: Only the bakery owner or authorized admin can advance fulfillment stages.');
    }

    const targetOrder = orders.find(o => o.id === id);
    if (!targetOrder) return;

    const currentStage = targetOrder.fulfilmentStage || 'awaiting_confirmation';

    // Transition validation: non-sequential jump requires exceptionReason
    const standardFlow: FulfilmentStage[] = [
      'order_placed',
      'awaiting_confirmation',
      'confirmed',
      'preparing',
      'baking',
      'decorating',
      'quality_check',
      'ready',
      targetOrder.deliveryOrPickup === 'delivery' ? 'out_for_delivery' : 'ready_for_pickup',
      targetOrder.deliveryOrPickup === 'delivery' ? 'delivered' : 'picked_up',
      'completed'
    ];

    const currentIdx = standardFlow.indexOf(currentStage);
    const targetIdx = standardFlow.indexOf(stage);

    if (currentIdx !== -1 && targetIdx !== -1 && targetIdx > currentIdx + 1 && stage !== 'cancelled' && stage !== 'rejected') {
      if (!exceptionReason?.trim()) {
        throw new Error(`Exceptional transition from "${currentStage}" to "${stage}" requires an explicit recorded reason.`);
      }
      addAuditLog('Exceptional Stage Jump Authorized', `Order ${targetOrder.orderNumber} jumped from ${currentStage} to ${stage}. Reason: ${exceptionReason.trim()}`);
    }

    let calculatedStatus: OrderGeneralStatus = targetOrder.orderStatus;
    if (stage === 'completed' || stage === 'delivered' || stage === 'picked_up') calculatedStatus = 'completed';
    else if (stage === 'out_for_delivery') calculatedStatus = 'out_for_delivery';
    else if (stage === 'ready' || stage === 'ready_for_pickup') calculatedStatus = 'ready';
    else if (stage === 'baking' || stage === 'decorating' || stage === 'preparing' || stage === 'quality_check') calculatedStatus = 'in_preparation';
    else if (stage === 'confirmed') calculatedStatus = 'confirmed';
    else if (stage === 'rejected') calculatedStatus = 'rejected';
    else if (stage === 'cancelled') calculatedStatus = 'cancelled';

    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        const newEntry: FulfilmentUpdateEntry = {
          id: 'fh-' + Date.now(),
          stage,
          timestamp: new Date().toISOString(),
          title,
          message: message || (exceptionReason ? `Jumped stage with exception note: ${exceptionReason}` : ''),
          updatedBy: currentUser.name || 'Bakery Staff'
        };

        return {
          ...o,
          fulfilmentStage: stage,
          orderStatus: calculatedStatus,
          latestUpdateMessage: message || title,
          fulfilmentHistory: [...(o.fulfilmentHistory || []), newEntry],
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));

    addAuditLog('Fulfilment Stage Advanced', `Order ${id} advanced to stage: ${stage}`);

    broadcastOrderUpdate({
      orderId: targetOrder.id,
      orderNumber: targetOrder.orderNumber,
      newStatus: calculatedStatus,
      newStage: stage,
      timestamp: new Date().toISOString(),
      title,
      message,
      updatedBy: currentUser.name || 'Bakery Staff'
    });

    // Backend sync: updates persistent store and dispatches automatic customer email notification
    fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json', 
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) 
      },
      body: JSON.stringify({ 
        orderStatus: calculatedStatus, 
        fulfilmentStage: stage,
        latestUpdateMessage: message || title 
      })
    }).then(res => res.json()).then(data => {
      if (data?.notification?.status === 'sent') {
        showToast(`Milestone email dispatched to customer.`, 'success');
      }
    }).catch(err => {
      console.warn('Backend fulfilment stage sync warning:', err);
    });
  };

  const updateOrderPaymentStatus = (id: string, status: OrderPaymentStatus, verifiedAmount?: number) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Payment Status Alteration', `User ${currentUser.uid} (${currentUser.role}) attempted to change payment for ${id}`);
      throw new Error('Unauthorized: Only authorized admin or owner can modify payment status.');
    }

    setOrders(prev => prev.map(o => {
      if (o.id === id) {
        const isFullyPaid = status === 'fully_paid' || status === 'paid';
        const isDepositPaid = status === 'deposit_verified' || status === 'partially_paid';

        let newPaid = o.verifiedPaidAmount || 0;
        if (verifiedAmount !== undefined) {
          newPaid = verifiedAmount;
        } else if (isFullyPaid) {
          newPaid = o.totalAmount;
        } else if (isDepositPaid && newPaid < o.depositAmount) {
          newPaid = o.depositAmount;
        }

        const newBalance = Math.max(0, o.totalAmount - newPaid);

        return {
          ...o,
          paymentStatus: status,
          verifiedPaidAmount: newPaid,
          outstandingBalance: newBalance,
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));
    addAuditLog('Payment Status Update', `Order ${id} payment set to ${status}`);
  };

  const acceptQuote = (orderId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const entry: FulfilmentUpdateEntry = {
          id: 'fh-' + Date.now(),
          stage: 'confirmed',
          timestamp: new Date().toISOString(),
          title: 'Quote Accepted by Customer',
          message: 'Customer accepted the bakery quote. Awaiting payment deposit.',
          updatedBy: o.customerName
        };
        return {
          ...o,
          orderStatus: 'awaiting_payment',
          paymentStatus: 'awaiting_payment',
          fulfilmentHistory: [...(o.fulfilmentHistory || []), entry],
          latestUpdateMessage: 'Quote accepted. Please complete the advance deposit to begin baking.',
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));
    addAuditLog('Quote Accepted', `Order ${orderId} quote accepted by customer.`);
  };

  const requestOrderChange = (orderId: string, reason: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const req: OrderChangeRequest = {
          id: 'cr-' + Date.now(),
          type: 'change',
          requestedAt: new Date().toISOString(),
          reason,
          status: 'pending'
        };
        return {
          ...o,
          changeRequests: [...(o.changeRequests || []), req],
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));
    addAuditLog('Change Requested', `Customer requested change for order ${orderId}: ${reason}`);
  };

  const requestOrderCancellation = (orderId: string, reason: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const req: OrderChangeRequest = {
          id: 'cr-' + Date.now(),
          type: 'cancellation',
          requestedAt: new Date().toISOString(),
          reason,
          status: 'pending'
        };
        return {
          ...o,
          orderStatus: 'cancellation_requested',
          changeRequests: [...(o.changeRequests || []), req],
          latestUpdateMessage: 'Cancellation review request submitted to Cake Junction atelier.',
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));
    addAuditLog('Cancellation Requested', `Customer requested cancellation for order ${orderId}: ${reason}`);
  };

  const reviewOrderChangeRequest = (orderId: string, requestId: string, approved: boolean, responseNote?: string) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Change Request Review', `User ${currentUser.uid} (${currentUser.role}) attempted to review change request for ${orderId}`);
      throw new Error('Unauthorized: Only authorized bakery owner or staff can review order change requests.');
    }
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updatedRequests = (o.changeRequests || []).map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: (approved ? 'approved' : 'rejected') as 'approved' | 'rejected',
              adminResponse: responseNote,
              reviewedAt: new Date().toISOString()
            };
          }
          return r;
        });

        const targetReq = (o.changeRequests || []).find(r => r.id === requestId);
        let updatedStatus = o.orderStatus;
        if (targetReq?.type === 'cancellation' && approved) {
          updatedStatus = 'cancelled';
        }

        return {
          ...o,
          orderStatus: updatedStatus,
          changeRequests: updatedRequests,
          latestUpdateMessage: responseNote || (approved ? 'Request approved by bakery.' : 'Request declined.'),
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));
    addAuditLog('Request Reviewed', `Order ${orderId} request ${requestId} was ${approved ? 'Approved' : 'Rejected'}`);
  };

  // Manual payment proofs
  const submitPaymentProof = (proofData: Omit<ManualPaymentProof, 'id' | 'submittedAt' | 'status'>) => {
    const newProof: ManualPaymentProof = {
      ...proofData,
      id: 'proof-' + Date.now(),
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    setPaymentProofs(prev => [newProof, ...prev]);
    // Customer submits proof; advance order to verification_pending directly
    setOrders(prev => prev.map(o => {
      if (o.id === proofData.orderId) {
        return {
          ...o,
          paymentStatus: 'verification_pending',
          latestUpdateMessage: `Payment proof submitted (UTR: ${proofData.utrNumber || 'Received'}). Awaiting bakery verification.`,
          updatedAt: new Date().toISOString()
        };
      }
      return o;
    }));
    addAuditLog('Payment Proof Uploaded', `UTR ${proofData.utrNumber || 'N/A'} submitted for order ${proofData.orderId}`);
  };

  const verifyPaymentProof = (id: string, verified: boolean, reason?: string) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Payment Proof Verification', `User ${currentUser.uid} (${currentUser.role}) attempted to verify payment proof ${id}`);
      throw new Error('Unauthorized: Only authorized bakery owner or staff can verify payment proofs.');
    }
    const proof = paymentProofs.find(p => p.id === id);
    if (!proof) return;

    setPaymentProofs(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: verified ? 'verified' : 'rejected',
          rejectionReason: reason,
          verifiedAt: new Date().toISOString()
        };
      }
      return p;
    }));

    if (verified) {
      const order = orders.find(o => o.id === proof.orderId);
      const isFull = order ? (order.verifiedPaidAmount || 0) + proof.paidAmount >= order.totalAmount : true;
      updateOrderPaymentStatus(proof.orderId, isFull ? 'fully_paid' : 'deposit_verified', (order?.verifiedPaidAmount || 0) + proof.paidAmount);
      addAuditLog('Payment Verified', `UTR ${proof.utrNumber || 'N/A'} of ₹${proof.paidAmount} confirmed by owner.`);
    } else {
      updateOrderPaymentStatus(proof.orderId, 'rejected_proof');
      addAuditLog('Payment Rejected', `Payment proof ${id} rejected: ${reason || 'Bank statement reconciliation failed'}`);
    }
  };

  // Slideshow Handlers
  const updateSlideshowSettings = (newSettings: Partial<SlideshowSettings>) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Slideshow Settings Update', `User ${currentUser.uid} (${currentUser.role}) attempted to alter slideshow settings`);
      throw new Error('Unauthorized: Only authorized bakery owner or staff can update slideshow settings.');
    }
    setSlideshowSettings(prev => {
      const updated = { ...prev, ...newSettings };
      return updated;
    });
    addAuditLog('Updated Slideshow Settings', 'Updated homepage slideshow configuration and timing.');
    showToast('Slideshow settings updated successfully', 'success');
  };

  const addSlideshowSlide = (slideData: Omit<SlideshowSlide, 'id' | 'uploadedAt' | 'updatedAt'>): SlideshowSlide => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Slide Creation', `User ${currentUser.uid} (${currentUser.role}) attempted to add slide`);
      throw new Error('Unauthorized: Only authorized bakery owner or staff can add slideshow slides.');
    }
    const newSlide: SlideshowSlide = {
      ...slideData,
      id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setSlideshowSlides(prev => [...prev, newSlide]);
    addAuditLog('Added Slideshow Slide', `Added new slide "${newSlide.title}" with status: ${newSlide.status}`);
    showToast('Slide added to gallery successfully', 'success');
    return newSlide;
  };

  const updateSlideshowSlide = (id: string, updates: Partial<SlideshowSlide>) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Slide Update', `User ${currentUser.uid} (${currentUser.role}) attempted to edit slide ${id}`);
      throw new Error('Unauthorized: Only authorized bakery owner or staff can edit slideshow slides.');
    }
    setSlideshowSlides(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    }));
    addAuditLog('Updated Slideshow Slide', `Updated slide ${id}`);
    showToast('Slide updated successfully', 'success');
  };

  const deleteSlideshowSlide = (id: string) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Slide Deletion', `User ${currentUser.uid} (${currentUser.role}) attempted to delete slide ${id}`);
      throw new Error('Unauthorized: Only authorized bakery owner or staff can delete slideshow slides.');
    }
    const slide = slideshowSlides.find(s => s.id === id);
    setSlideshowSlides(prev => prev.filter(s => s.id !== id));
    addAuditLog('Deleted Slideshow Slide', `Removed slide ${slide?.title || id} from slideshow library`);
    showToast('Slide removed successfully', 'info');
  };

  const reorderSlideshowSlides = (reorderedIds: string[]) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Slide Reordering', `User ${currentUser.uid} (${currentUser.role}) attempted to reorder slides`);
      throw new Error('Unauthorized: Only authorized bakery owner or staff can reorder slideshow slides.');
    }
    setSlideshowSlides(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      const nextList: SlideshowSlide[] = [];
      reorderedIds.forEach((id, index) => {
        const item = map.get(id);
        if (item) {
          nextList.push({ ...item, order: index, updatedAt: new Date().toISOString() });
          map.delete(id);
        }
      });
      // Append any remaining
      map.forEach(item => {
        nextList.push({ ...item, order: nextList.length, updatedAt: new Date().toISOString() });
      });
      return nextList;
    });
    addAuditLog('Reordered Slideshow Slides', 'Updated slide sequence for homepage carousel');
  };

  // Invoices & Billing Operations
  const generateOrderInvoice = (orderId: string) => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) {
      throw new Error(`Order ${orderId} not found.`);
    }

    let invoiceNumber = targetOrder.invoiceNumber;
    let seqNum = targetOrder.invoiceSequence;

    // If order does not have an invoice number yet, generate and persist one
    if (!invoiceNumber) {
      const currentSeq = settings.invoiceCurrentSequence || settings.invoiceStartingNumber || 1001;
      invoiceNumber = generateInvoiceNumber(targetOrder, settings, currentSeq);
      seqNum = currentSeq;

      const now = new Date().toISOString();
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            invoiceNumber,
            invoiceGeneratedAt: now,
            invoiceSequence: seqNum,
            updatedAt: now,
          };
        }
        return o;
      }));

      // Increment sequence in settings
      setSettings(prev => ({
        ...prev,
        invoiceCurrentSequence: currentSeq + 1,
      }));

      addAuditLog('Invoice Generated', `Generated invoice ${invoiceNumber} for order ${targetOrder.orderNumber}`);
    }

    const doc = generateOrderInvoiceDoc(targetOrder, settings, invoiceNumber);

    return {
      invoiceNumber,
      download: () => {
        doc.save(`Invoice-${invoiceNumber}.pdf`);
      },
      getBlob: () => doc.output('blob'),
      getDataUri: () => doc.output('datauristring'),
    };
  };

  const downloadOrderInvoice = (orderId: string): string => {
    const inv = generateOrderInvoice(orderId);
    inv.download();
    showToast(`Invoice ${inv.invoiceNumber} downloaded (A4 PDF)`, 'success');
    return inv.invoiceNumber;
  };

  const updateInvoiceSettings = (newInvoiceSettings: Partial<ShopSettings>) => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Invoice Settings Update', `User ${currentUser.uid} (${currentUser.role}) attempted to alter invoice settings`);
      throw new Error('Unauthorized: Only authorized admin or owner can update invoice sequence settings.');
    }

    setSettings(prev => ({
      ...prev,
      ...newInvoiceSettings,
    }));

    addAuditLog('Invoice Settings Updated', `Updated invoice prefix: ${newInvoiceSettings.invoicePrefix ?? settings.invoicePrefix}, start: ${newInvoiceSettings.invoiceStartingNumber ?? settings.invoiceStartingNumber}`);
    showToast('Invoice sequence & billing settings updated', 'success');
  };

  const assignInvoiceNumberToOrder = (orderId: string, customInvoiceNum?: string): string => {
    if (!isStaffOrOwner) {
      addAuditLog('Security Alert: Unauthorized Invoice Number Assignment', `User ${currentUser.uid} attempted to assign invoice number`);
      throw new Error('Unauthorized: Only authorized staff or owner can assign invoice numbers.');
    }

    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) throw new Error('Order not found');

    const seq = settings.invoiceCurrentSequence || 1001;
    const invNum = customInvoiceNum?.trim() || generateInvoiceNumber(targetOrder, settings, seq);
    const now = new Date().toISOString();

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          invoiceNumber: invNum,
          invoiceGeneratedAt: now,
          invoiceSequence: seq,
          updatedAt: now,
        };
      }
      return o;
    }));

    if (!customInvoiceNum) {
      setSettings(prev => ({
        ...prev,
        invoiceCurrentSequence: seq + 1,
      }));
    }

    addAuditLog('Invoice Assigned', `Assigned invoice ${invNum} to order ${targetOrder.orderNumber}`);
    showToast(`Assigned ${invNum} to order ${targetOrder.orderNumber}`, 'success');
    return invNum;
  };

  const getAllInvoices = (): InvoiceRecord[] => {
    return orders
      .filter(o => o.orderStatus !== 'rejected' && o.orderStatus !== 'cancelled')
      .map(o => createInvoiceRecordFromOrder(o, settings, 'Bakery Administration'));
  };

  return (
    <AppContext.Provider value={{
      lang,
      setLang,
      t,
      route,
      navigateTo,
      goBack,
      settings,
      updateSettings,
      updateShopAvailability,
      checkShopOpenStatus,
      resetToDefaultSettings,
      wishlist,
      toggleWishlist,
      isWishlisted,
      analytics,
      trackCakeView,
      trackWhatsAppClick,
      toast,
      showToast,
      hideToast,
      currentUser,
      authToken,
      loginAsAdmin,
      loginAsCustomerPhone,
      requestCustomerOtp,
      registerCustomerAccount,
      loginCustomerAccount,
      logoutCustomerAccount,
      requestCustomerPasswordOtp,
      verifyCustomerPasswordOtp,
      resetCustomerPasswordWithOtp,
      changeCustomerPassword,
      changeAdminPassword,
      requestAdminPasswordResetLink,
      resetAdminPasswordWithToken,
      logout,
      updateSmsGatewaySettings,
      requestPasswordChangeOtp,
      changePasswordWithOtp,
      fetchOwnerAccount,
      updateOwnerEmail,
      updateOwnerPhoneRequestOtp,
      updateOwnerPhoneVerify,
      fetchActiveSessions,
      revokeOtherSessions,
      revokeAllSessions,
      fetchStaffAccounts,
      addStaffAccount,
      removeStaffAccount,
      fetchSecurityAuditLogs,
      recoverAccountWithKey,
      initializeOwnerAccount,
      testOwnerEmailDelivery,
      sessionAuthorizedOrders,
      authorizeOrderInSession,
      isOrderAuthorized,
      verifyOrderLookup,
      cakes,
      addCake,
      updateCake,
      updateCakeAvailability,
      deleteCake,
      publishCake,
      archiveCake,
      orderFormData,
      setOrderFormData,
      clearOrderFormData,
      feedbackList,
      submitFeedback,
      updateFeedbackStatus,
      enquiries,
      submitEnquiry,
      updateEnquiryStatus,
      convertEnquiryToOrder,
      orders,
      createDirectOrder,
      acceptCustomerOrder,
      rejectCustomerOrder,
      cancelCustomerOrder,
      updateOrderStatus,
      updateOrderFulfilmentStage,
      updateOrderPaymentStatus,
      acceptQuote,
      requestOrderChange,
      requestOrderCancellation,
      reviewOrderChangeRequest,
      paymentProofs,
      submitPaymentProof,
      verifyPaymentProof,
      auditLogs,
      addAuditLog,
      isStaffOrOwner,
      slideshowSettings,
      updateSlideshowSettings,
      slideshowSlides,
      addSlideshowSlide,
      updateSlideshowSlide,
      deleteSlideshowSlide,
      reorderSlideshowSlides,
      generateOrderInvoice,
      downloadOrderInvoice,
      updateInvoiceSettings,
      assignInvoiceNumberToOrder,
      getAllInvoices,
      cart,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      removeFromCart,
      updateCartItemQuantity,
      clearCart,
      cartTotalCount,
      cartSubtotal
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
