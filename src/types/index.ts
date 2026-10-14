export type Currency = 'INR';

export interface CakeWeightOption {
  id?: string;
  weight: string; // e.g. "0.5", "1", "1.5", "2"
  unit?: 'kg' | 'grams' | 'pounds' | 'pieces'; // unit selector
  price: number; // in INR (stored as integer)
  description?: string; // e.g. "Serves 4-6 guests"
  isAvailable?: boolean; // availability status
}

export interface PaymentSettingsDocument {
  id: string;
  upiId: string;
  beneficiaryName: string;
  upiQrImageUrl?: string;
  isUpiEnabled: boolean;
  paymentMode: 'disabled' | 'manual_upi' | 'gateway';
  paymentInstructions?: string;
  paymentPurpose?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CakeSpecification {
  id: string;
  label: string; // e.g. "Filling", "Shape", "Decoration", "Allergen Note"
  value: string; // e.g. "Belgian Dark Ganache & Raspberry Gelee"
}

export interface CakeImage {
  url: string;
  alt: string;
  isPrimary?: boolean;
  label?: string; // e.g. "Exterior Tier", "Cross-Section Sponge", "Packaging"
}

export interface Cake {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  description: string;
  category: string;
  occasions: string[];
  colourThemes: string[];
  flavours: string[];
  weightOptions: CakeWeightOption[];
  specifications?: CakeSpecification[];
  isEgglessOption: boolean;
  allergens?: string;
  leadTimeHours: number;
  availability: 'available_now' | 'made_to_order' | 'temporarily_unavailable' | 'sold_out';
  isFeatured: boolean;
  isPortfolioOnly: boolean;
  images: CakeImage[];
  isPublished: boolean;
  status?: 'draft' | 'published' | 'archived';
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type FulfilmentStage = 
  | 'order_placed'
  | 'awaiting_confirmation'
  | 'confirmed' // Order Accepted
  | 'preparing'
  | 'baking'
  | 'decorating'
  | 'quality_check'
  | 'ready' // Packed and Ready
  | 'ready_for_pickup' // Pickup
  | 'out_for_delivery' // Delivery
  | 'delivered'
  | 'picked_up'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export type OrderGeneralStatus = 
  | 'order_placed'
  | 'awaiting_confirmation'
  | 'confirmed' // Order Accepted
  | 'preparing'
  | 'in_preparation'
  | 'baking'
  | 'decorating'
  | 'quality_check'
  | 'ready'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'picked_up'
  | 'completed'
  | 'rejected'
  | 'cancellation_requested'
  | 'cancelled'
  | 'enquiry_submitted'
  | 'awaiting_quote'
  | 'quote_sent'
  | 'awaiting_acceptance'
  | 'awaiting_payment'
  | 'verification_pending'
  | 'payment_failed'
  | 'refunded';

export type OrderPaymentStatus = 
  | 'unpaid'
  | 'not_requested'
  | 'awaiting_payment'
  | 'verification_pending'
  | 'deposit_verified'
  | 'partially_paid'
  | 'fully_paid'
  | 'paid'
  | 'rejected_proof'
  | 'payment_failed'
  | 'refund_pending'
  | 'refunded';

export interface FulfilmentUpdateEntry {
  id: string;
  stage: FulfilmentStage;
  timestamp: string;
  title: string;
  message?: string;
  updatedBy: string;
}

export interface OrderChangeRequest {
  id: string;
  type: 'change' | 'cancellation';
  requestedAt: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminResponse?: string;
  reviewedAt?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'Orders' | 'Delivery' | 'Dietary' | 'Payments';
}

export interface BehindTheScenesItem {
  id: string;
  title: string;
  imageUrl: string;
  caption: string;
}

export interface ShopAvailabilitySettings {
  is_open: boolean; // Master availability toggle: true = open for orders, false = closed
  isOpen?: boolean; // Backward compatibility alias
  closureMessage?: string; // Custom notice displayed when closed
  reopeningTimestamp?: string | null; // Optional ISO string for scheduled reopening
}

export type ShopSettingsSchema = ShopSettings;

export interface ShopSettings {
  // Shop Availability (Master Order Intake Control)
  is_open: boolean; // Master toggle: true = accepting orders, false = closed / orders paused
  isOpen?: boolean; // Backward compatibility alias
  closureMessage?: string; // Custom closure message displayed to customers
  reopeningTimestamp?: string | null; // Optional ISO datetime string when shop will reopen

  // Identity & branding
  shopName: string;
  tagline: string;
  story: string;
  bakerName: string;
  bakerBio: string;
  bakerImageUrl?: string;
  logoUrl?: string;
  logoAlt?: string;
  heroImageUrl?: string;
  heroHeadline: string;
  heroSubheadline: string;
  announcementBanner?: string;
  isAnnouncementActive: boolean;

  // Contact & Social
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  mapsUrl?: string;
  instagramUrl?: string;
  openingHours?: string; // or daily schedule
  dailyOpeningHours?: {
    [day: string]: string; // Monday: "Closed", Tuesday: "10:00 AM - 08:30 PM", etc.
  };
  deliveryAreas?: string;
  pickupInstructions?: string;
  deliveryCharge?: number;
  freeDeliveryThreshold?: number;

  // Business Policies & Times
  currency: Currency;
  minNoticeDays: number;
  isTamilEnabled: boolean;
  isLaunched: boolean;
  deliveryTerms?: string;
  cancellationPolicy?: string;
  privacyPolicy?: string;
  termsOfService?: string;

  // Payments
  paymentMode: 'disabled' | 'manual_upi' | 'gateway';
  isUpiEnabled: boolean; // toggle to show/hide UPI on website
  upiId?: string;
  payeeName?: string;
  upiQrImageUrl?: string;
  paymentInstructions?: string;
  paymentPurpose?: string; // e.g. "Advance Deposit (50%) or Full Settlement"

  // SMS Gateway & Phone OTP Settings
  smsGateway?: SmsGatewayConfig;

  // Invoice Configuration
  invoicePrefix?: string; // e.g. "INV"
  invoiceStartingNumber?: number; // e.g. 1001
  invoiceCurrentSequence?: number; // sequence counter
  includeYearInInvoice?: boolean; // e.g. true -> INV-2026-1001
  fssaiNumber?: string; // FSSAI Registration / License number
  gstinNumber?: string; // GST Identification Number
  invoiceTerms?: string; // Custom terms and conditions for receipts

  // FAQs and Behind-the-scenes
  faqs: FAQItem[];
  behindTheScenes: BehindTheScenesItem[];
}

export interface SmsGatewayConfig {
  provider: 'none' | 'fast2sms' | 'msg91' | 'twilio';
  apiKey?: string; // Stored securely; masked in UI
  senderId?: string; // e.g. CKJNCT or custom DLT header
  dltTemplateId?: string; // TRAI registered Content Template ID
  entityId?: string; // TRAI registered Principal Entity ID
  isLive: boolean; // toggle: true = attempt live delivery, false = inactive
  status: 'unconfigured' | 'active' | 'error';
  lastTestedAt?: string;
  lastTestStatus?: 'pass' | 'fail' | 'not_tested';
  lastTestMessage?: string;
}

export interface OtpRequestResult {
  success: boolean;
  message: string;
  status: 'accepted' | 'unconfigured' | 'rate_limited' | 'invalid_phone' | 'gateway_error';
  canRetryAfterSeconds?: number;
  expiresInSeconds?: number;
  deliveryProvider?: string;
  referenceId?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  message: string;
  status: 'verified' | 'incorrect_otp' | 'expired' | 'max_attempts_exceeded' | 'no_active_otp';
  remainingAttempts?: number;
}

export interface SmsGatewayDiagnostic {
  provider: 'fast2sms' | 'msg91' | 'none';
  selectedProvider?: 'fast2sms' | 'msg91';
  isConfigured: boolean;
  isLive: boolean;
  apiKeyConfigured: boolean;
  maskedApiKey: string;
  templateConfigured: boolean;
  templateId?: string;
  senderId?: string;
  missingEnvVars?: string[];
  lastTestedAt: string | null;
  lastTestStatus: 'accepted' | 'request_failed' | 'not_tested';
  lastProviderMessage: string | null;
  lastProviderReference: string | null;
  lastRedactedError: string | null;
  environmentKeys: Record<string, string>;
  deploymentInstructions?: {
    provider: string;
    requiredSecrets: string[];
    description: string;
  };
}

export interface SmsTestResult {
  success: boolean;
  stage?: string;
  deliveryStage?: string;
  reachedProvider?: boolean;
  providerAccepted?: boolean;
  deliveryReceipt?: string;
  referenceId?: string;
  provider?: string;
  error?: string;
  message: string;
  missingEnvVars?: string[];
}

export interface SlideshowSlide {
  id: string;
  imageUrl: string;
  title: string;
  caption?: string;
  altText: string;
  order: number;
  isEnabled: boolean;
  status: 'draft' | 'published';
  buttonLabel?: string; // e.g. "Explore Cakes", "Enquire on WhatsApp", "Custom Quote"
  buttonLink?: string; // e.g. "gallery", "configurator", "order", "whatsapp"
  uploadedAt: string;
  updatedAt: string;
  fileSizeBytes?: number;
}

export interface SlideshowSettings {
  isEnabled: boolean; // Section visibility toggle
  heading: string; // e.g. "A Glimpse of Our Sweet Creations"
  subtitle: string; // e.g. "Made fresh with love, for your special moments."
  autoplay: boolean;
  slideIntervalSeconds: number; // default 5 (range 3 - 15)
  transitionStyle: 'fade' | 'slide';
  transitionDurationMs: number; // default 600ms (range 300 - 1500)
  showArrows: boolean;
  showPaginationDots: boolean;
  showCaptions: boolean;
  showCounter: boolean;
  desktopLayout: 'featured_with_peek' | 'single_focus';
}

export interface CustomerEnquiry {
  id: string;
  referenceNumber: string;
  cakeId?: string;
  cakeName?: string;
  customerName: string;
  phone: string;
  occasion?: string;
  requiredDate: string;
  preferredTime?: string;
  quantity?: number;
  flavour?: string;
  selectedWeight?: string;
  approximateWeight?: string;
  selectedPrice?: number;
  filling?: string;
  shape?: string;
  colourTheme?: string;
  isEggless?: boolean;
  cakeMessage?: string;
  additionalSpecifications?: string;
  budgetInr?: number;
  message?: string;
  deliveryOrPickup: 'delivery' | 'pickup';
  address?: string; // Complete delivery address
  flatOrHouse?: string;
  streetAndLocality?: string;
  city?: string;
  postalCode?: string;
  landmark?: string;
  deliveryInstructions?: string;
  referenceImageUrls?: string[];
  status: 'new' | 'reviewing' | 'quoted' | 'confirmed' | 'completed' | 'cancelled';
  internalNotes?: string;
  followUpReminderDate?: string;
  quote?: {
    totalAmount: number;
    depositRequired: number;
    deliveryCharge: number;
    expiryDate: string;
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFeedback {
  id: string;
  customerName?: string;
  feedbackText?: string;
  rating?: number;
  cakeId?: string;
  cakeName?: string;
  imageUrls?: string[];
  status: 'pending' | 'approved' | 'rejected';
  publicReply?: string;
  consentToPublish: boolean;
  createdAt: string;
  approvedAt?: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  enquiryId?: string;
  cakeId?: string;
  cakeName: string;
  cakeThumbnail?: string;
  flavour: string;
  weight: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount: number;
  depositAmount: number;
  verifiedPaidAmount?: number;
  outstandingBalance: number;
  orderStatus: OrderGeneralStatus;
  fulfilmentStage?: FulfilmentStage;
  fulfilmentHistory?: FulfilmentUpdateEntry[];
  paymentStatus: OrderPaymentStatus;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  isEggless?: boolean;
  cakeMessage?: string;
  occasion?: string;
  colourTheme?: string;
  specialInstructions?: string;
  privateReferenceImages?: string[];
  isGift?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  fulfilmentDate: string;
  fulfilmentTimeSlot?: string;
  deliveryOrPickup: 'delivery' | 'pickup';
  deliveryAddress?: string;
  addressDetails?: {
    flatOrHouse?: string;
    streetAndLocality?: string;
    area?: string;
    city?: string;
    postalCode?: string;
    landmark?: string;
    deliveryInstructions?: string;
  };
  deliveryFee?: number;
  extras?: { name: string; price: number }[];
  changeRequests?: OrderChangeRequest[];
  customerFeedbackId?: string;
  latestUpdateMessage?: string;
  quoteDetails?: {
    quoteSentAt: string;
    validUntil: string;
    notes?: string;
    quotedBy?: string;
  };
  isCustomCakeQuote?: boolean;
  // Order Acceptance and Status Governance
  acceptanceStatus?: 'pending_confirmation' | 'accepted' | 'rejected' | 'cancelled';
  acceptedAt?: string;
  acceptedBy?: string;
  acceptanceNote?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  // Invoice & Billing Tracking
  invoiceNumber?: string;
  invoiceGeneratedAt?: string;
  invoiceSequence?: number;
  securityPin?: string; // 6-digit Order Security Verification PIN for identity verification
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  description: string;
  specs?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  paymentStatus: OrderPaymentStatus;
  orderStatus: OrderGeneralStatus;
  fulfilmentStage?: FulfilmentStage;
  generatedAt: string;
  generatedBy: string;
  items: InvoiceItem[];
}

export interface ManualPaymentProof {
  id: string;
  orderId: string;
  enquiryId?: string;
  utrNumber?: string;
  screenshotUrl?: string;
  paidAmount: number;
  submittedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  verifiedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  userEmail: string;
  details: string;
  timestamp: string;
}

export interface CartItem {
  id: string;
  cakeId: string;
  cakeName: string;
  imageUrl: string;
  category: string;
  weight: string;
  flavour: string;
  unitPrice: number;
  quantity: number;
  isEggless: boolean;
  cakeMessage?: string;
  selectedExtras?: Array<{ id: string; name: string; price: number }>;
  addedAt: string;
}
