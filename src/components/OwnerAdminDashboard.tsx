import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Cake, ShopSettings, CustomerFeedback, CustomerEnquiry, CustomerOrder, FAQItem, BehindTheScenesItem, CakeWeightOption, CakeSpecification, SmsGatewayConfig } from '../types';
import { formatIndianCurrency, buildWhatsAppLink } from '../utils/whatsapp';
import { AdminCakeEditorModal } from './AdminCakeEditorModal';
import { AdminOrdersManager } from './AdminOrdersManager';
import { AdminSlideshowManager } from './AdminSlideshowManager';
import { AdminShopAvailability } from './AdminShopAvailability';
import { InvoiceManager } from './InvoiceManager';
import { AdminAccountSecurity } from './AdminAccountSecurity';
import { AdminGoogleDriveBackup } from './AdminGoogleDriveBackup';
import { AdminSystemHealth } from './AdminSystemHealth';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  Store, 
  Cake as CakeIcon, 
  MessageSquare, 
  Inbox, 
  CreditCard, 
  History, 
  Plus, 
  Upload, 
  Trash2, 
  Edit2, 
  X, 
  Download,
  Calendar,
  MessageCircle,
  HelpCircle,
  Camera,
  Check,
  Copy,
  Layers,
  Sparkles,
  QrCode,
  Image as ImageIcon,
  ShoppingBag,
  ExternalLink,
  LogOut,
  Archive,
  Eye,
  Globe,
  Phone,
  Send,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Power,
  Receipt,
  FileText,
  Cloud,
  Activity,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutGrid
} from 'lucide-react';

const ADMIN_NAV_TABS = [
  { id: 'overview', label: 'Overview', icon: Store, description: 'Live Bakery Metrics, Revenue & Operations' },
  { id: 'drive', label: 'Google Drive Sync', icon: Cloud, description: 'Automated Cloud Backup & Authorization' },
  { id: 'health', label: 'System Health & Status', icon: Activity, description: 'Service Diagnostics & Gateway Health' },
  { id: 'availability', label: 'Shop Availability', icon: Power, description: 'Real-Time Store Status & Scheduling' },
  { id: 'slideshow', label: 'Homepage Cake Slideshow', icon: Sparkles, description: 'Front Hero Carousel & Feature Banners' },
  { id: 'cakes', label: 'Cake Menu & Photos', icon: CakeIcon, description: 'Catalogue, Flavours & Pricing Tiers' },
  { id: 'orders', label: 'Orders & Fulfilment', icon: ShoppingBag, description: 'Live Kitchen Pipeline & Stage Tracking' },
  { id: 'invoices', label: 'Invoices & Billing', icon: Receipt, description: 'Official A4 PDF Tax Invoices & Records' },
  { id: 'enquiries', label: 'Enquiries & CRM', icon: Inbox, description: 'Bespoke Custom Cake Consultations' },
  { id: 'payments', label: 'Payment Settings', icon: CreditCard, description: 'Direct Bakery UPI QR & Settlement Rules' },
  { id: 'security', label: 'Admin Account & Security', icon: ShieldCheck, description: 'Password Resets, Keys & Audit Logs' },
  { id: 'settings', label: 'Shop Settings', icon: Edit2, description: 'Contact, Address & Atelier Guidelines' },
  { id: 'feedback', label: 'Guest Feedback', icon: MessageSquare, description: 'Customer Testimonials & Moderation' },
  { id: 'faqs', label: 'FAQ Editor', icon: HelpCircle, description: 'Public Frequently Asked Questions' },
  { id: 'bts', label: 'Atelier Stories', icon: Camera, description: 'Behind the Scenes Artisan Photography' },
  { id: 'audit', label: 'Audit Log', icon: History, description: 'Administrative Traceability & Event History' },
] as const;

export const OwnerAdminDashboard: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    cakes, 
    addCake, 
    updateCake, 
    updateCakeAvailability,
    deleteCake, 
    publishCake,
    archiveCake,
    feedbackList, 
    updateFeedbackStatus, 
    enquiries, 
    updateEnquiryStatus, 
    convertEnquiryToOrder,
    orders, 
    paymentProofs, 
    verifyPaymentProof,
    auditLogs,
    analytics,
    navigateTo,
    logout,
    showToast,
    updateSmsGatewaySettings,
    requestCustomerOtp
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'drive' | 'health' | 'availability' | 'slideshow' | 'cakes' | 'orders' | 'invoices' | 'enquiries' | 'payments' | 'sms' | 'security' | 'settings' | 'feedback' | 'faqs' | 'bts' | 'audit'>('overview');

  // Navigation Scrolling & Dropdown State
  const menuScrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isAllMenuOpen, setIsAllMenuOpen] = useState(false);

  const checkScrollState = useCallback(() => {
    const el = menuScrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  const handleScrollMenu = (direction: 'left' | 'right') => {
    const el = menuScrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(el.clientWidth * 0.65, 220);
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const handleSelectTab = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    setIsAllMenuOpen(false);
    setTimeout(() => {
      const activeBtn = menuScrollRef.current?.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement | null;
      if (activeBtn && menuScrollRef.current) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 50);
  };

  useEffect(() => {
    const el = menuScrollRef.current;
    if (!el) return;
    checkScrollState();
    el.addEventListener('scroll', checkScrollState, { passive: true });
    window.addEventListener('resize', checkScrollState);
    return () => {
      el.removeEventListener('scroll', checkScrollState);
      window.removeEventListener('resize', checkScrollState);
    };
  }, [checkScrollState]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAllMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAllMenuOpen(false);
      }
    };
    if (isAllMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAllMenuOpen]);

  const [isCakeEditorOpen, setIsCakeEditorOpen] = useState(false);
  const [cakeToEdit, setCakeToEdit] = useState<Cake | null>(null);
  const [cakeFilter, setCakeFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');

  // Enquiries filtering
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState<string>('all');
  const [enquirySearchQuery, setEnquirySearchQuery] = useState('');

  // Form states for Cake creation / editing with Dynamic Weight (+) Rows & Specifications (+) Rows
  const [editingCake, setEditingCake] = useState<Cake | null>(null);
  const [isAddingCake, setIsAddingCake] = useState(false);
  
  const [cakeForm, setCakeForm] = useState<{
    name: string;
    slug: string;
    shortDescription: string;
    description: string;
    category: string;
    occasions: string;
    colourThemes: string;
    flavours: string;
    weightOptions: CakeWeightOption[];
    specifications: CakeSpecification[];
    isEgglessOption: boolean;
    allergens: string;
    leadTimeHours: number;
    availability: Cake['availability'];
    isFeatured: boolean;
    imageUrl: string;
    additionalImages: string[];
    isPublished: boolean;
  }>({
    name: '',
    slug: '',
    shortDescription: '',
    description: '',
    category: 'Birthday',
    occasions: 'Birthday, Anniversary',
    colourThemes: 'Blush Pink, Pastel Cream',
    flavours: 'Belgian Truffle, Vanilla Berry',
    weightOptions: [
      { id: 'w-1', weight: '0.5 kg', price: 850, description: 'Serves 4–6', isAvailable: true },
      { id: 'w-2', weight: '1.0 kg', price: 1600, description: 'Serves 8–10', isAvailable: true },
      { id: 'w-3', weight: '1.5 kg', price: 2350, description: 'Serves 12–15', isAvailable: true }
    ],
    specifications: [
      { id: 's-1', label: 'Filling', value: 'Whipped 64% Dark Couverture Ganache' },
      { id: 's-2', label: 'Shape', value: 'Classic Round Tier' }
    ],
    isEgglessOption: true,
    allergens: 'Dairy, Wheat Gluten',
    leadTimeHours: 24,
    availability: 'available_now',
    isFeatured: false,
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    additionalImages: [],
    isPublished: true
  });

  // Quotation form modal for Enquiries
  const [quotingEnquiry, setQuotingEnquiry] = useState<CustomerEnquiry | null>(null);
  const [quoteForm, setQuoteForm] = useState({
    totalAmount: 2800,
    depositRequired: 1400,
    deliveryCharge: 200,
    expiryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    notes: 'Includes bespoke packaging and chilled van transport.',
    reminderDate: ''
  });

  // Shop Settings local state
  const [settingsForm, setSettingsForm] = useState<ShopSettings>({ ...settings });
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  // Payment Settings local state
  const [paymentForm, setPaymentForm] = useState({
    upiId: settings.upiId || '',
    payeeName: settings.payeeName || '',
    upiQrImageUrl: settings.upiQrImageUrl || '',
    isUpiEnabled: settings.isUpiEnabled ?? true,
    paymentMode: settings.paymentMode || 'manual_upi',
    paymentInstructions: settings.paymentInstructions || 'Scan our official UPI QR or transfer to our verified UPI ID. Submit your 12-digit UTR transaction ID below.',
    paymentPurpose: settings.paymentPurpose || 'Advance Deposit (50%) or Full Order Settlement'
  });
  const [paymentSavedMessage, setPaymentSavedMessage] = useState(false);

  // SMS Gateway Settings local state
  const [smsForm, setSmsForm] = useState<SmsGatewayConfig>(() => {
    return settings.smsGateway || {
      provider: 'none',
      apiKey: '',
      senderId: 'CKJNCT',
      dltTemplateId: '',
      entityId: '',
      isLive: false,
      status: 'unconfigured',
      lastTestStatus: 'not_tested',
      lastTestMessage: 'No SMS gateway configured yet.'
    };
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [smsSavedMessage, setSmsSavedMessage] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSaveSmsSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSmsGatewaySettings(smsForm);
    setSmsSavedMessage(true);
    showToast('SMS Gateway settings updated.', 'success');
    setTimeout(() => setSmsSavedMessage(false), 3000);
  };

  const handleTestSmsConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    if (!testPhoneNumber) {
      setTestResult({ success: false, message: 'Please enter a 10-digit mobile number to test delivery.' });
      return;
    }
    setIsTestingSms(true);
    try {
      const res = await requestCustomerOtp(testPhoneNumber);
      setIsTestingSms(false);
      setTestResult({
        success: res.success,
        message: res.message
      });
      if (res.success) {
        showToast('Test OTP dispatched successfully!', 'success');
      }
    } catch (err: any) {
      setIsTestingSms(false);
      setTestResult({
        success: false,
        message: err.message || 'Error executing test request.'
      });
    }
  };

  // FAQ management local state
  const [newFaq, setNewFaq] = useState<{ question: string; answer: string; category: FAQItem['category'] }>({
    question: '',
    answer: '',
    category: 'Orders'
  });

  // Behind the scenes local state
  const [newBts, setNewBts] = useState<{ title: string; imageUrl: string; caption: string }>({
    title: '',
    imageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
    caption: ''
  });

  // Photo uploads
  const handleCakePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCakeForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPaymentForm(prev => ({ ...prev, upiQrImageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSettingsForm(prev => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Dynamic Weight-Price Rows Helper
  const handleAddWeightRow = () => {
    setCakeForm(prev => ({
      ...prev,
      weightOptions: [
        ...prev.weightOptions,
        { id: 'w-' + Date.now(), weight: '2.0 kg', price: 3000, description: 'Serves 15–18', isAvailable: true }
      ]
    }));
  };

  const handleRemoveWeightRow = (idx: number) => {
    setCakeForm(prev => ({
      ...prev,
      weightOptions: prev.weightOptions.filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateWeightRow = (idx: number, field: keyof CakeWeightOption, val: any) => {
    setCakeForm(prev => ({
      ...prev,
      weightOptions: prev.weightOptions.map((w, i) => i === idx ? { ...w, [field]: val } : w)
    }));
  };

  // Dynamic Specifications Rows Helper
  const handleAddSpecRow = () => {
    setCakeForm(prev => ({
      ...prev,
      specifications: [
        ...prev.specifications,
        { id: 's-' + Date.now(), label: 'Custom Note', value: 'Piped with 24k gold leaf foil' }
      ]
    }));
  };

  const handleRemoveSpecRow = (idx: number) => {
    setCakeForm(prev => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== idx)
    }));
  };

  const handleUpdateSpecRow = (idx: number, field: 'label' | 'value', val: string) => {
    setCakeForm(prev => ({
      ...prev,
      specifications: prev.specifications.map((s, i) => i === idx ? { ...s, [field]: val } : s)
    }));
  };

  const handleSaveCake = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedFlavours = cakeForm.flavours.split(',').map(f => f.trim()).filter(Boolean);
    const parsedOccasions = cakeForm.occasions.split(',').map(o => o.trim()).filter(Boolean);
    const parsedColours = cakeForm.colourThemes.split(',').map(c => c.trim()).filter(Boolean);

    const payload = {
      name: cakeForm.name,
      slug: cakeForm.slug || cakeForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      shortDescription: cakeForm.shortDescription,
      description: cakeForm.description,
      category: cakeForm.category,
      occasions: parsedOccasions,
      colourThemes: parsedColours,
      flavours: parsedFlavours,
      weightOptions: cakeForm.weightOptions.map(w => ({
        weight: w.weight,
        price: Number(w.price) || 0,
        description: w.description,
        isAvailable: w.isAvailable ?? true
      })),
      specifications: cakeForm.specifications,
      isEgglessOption: cakeForm.isEgglessOption,
      allergens: cakeForm.allergens,
      leadTimeHours: Number(cakeForm.leadTimeHours),
      availability: cakeForm.availability,
      isFeatured: cakeForm.isFeatured,
      isPortfolioOnly: false,
      images: [
        {
          url: cakeForm.imageUrl,
          alt: cakeForm.name,
          isPrimary: true
        }
      ],
      isPublished: cakeForm.isPublished
    };

    if (editingCake) {
      updateCake(editingCake.id, payload);
      setEditingCake(null);
    } else {
      addCake(payload);
      setIsAddingCake(false);
    }
  };

  const startEditCake = (cake: Cake) => {
    setEditingCake(cake);
    setCakeForm({
      name: cake.name,
      slug: cake.slug,
      shortDescription: cake.shortDescription || '',
      description: cake.description,
      category: cake.category,
      occasions: cake.occasions ? cake.occasions.join(', ') : 'Birthday',
      colourThemes: cake.colourThemes ? cake.colourThemes.join(', ') : 'Pastel Cream',
      flavours: cake.flavours.join(', '),
      weightOptions: cake.weightOptions.length > 0 ? cake.weightOptions : [
        { weight: '1.0 kg', price: 1500, description: 'Standard' }
      ],
      specifications: cake.specifications || [],
      isEgglessOption: cake.isEgglessOption,
      allergens: cake.allergens || '',
      leadTimeHours: cake.leadTimeHours,
      availability: cake.availability,
      isFeatured: cake.isFeatured,
      imageUrl: cake.images[0]?.url || '',
      additionalImages: [],
      isPublished: cake.isPublished
    });
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(settingsForm);
    setSettingsSavedMessage(true);
    setTimeout(() => setSettingsSavedMessage(false), 3000);
  };

  const handleSavePaymentSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      upiId: paymentForm.upiId,
      payeeName: paymentForm.payeeName,
      upiQrImageUrl: paymentForm.upiQrImageUrl,
      isUpiEnabled: paymentForm.isUpiEnabled,
      paymentMode: paymentForm.paymentMode as any,
      paymentInstructions: paymentForm.paymentInstructions,
      paymentPurpose: paymentForm.paymentPurpose
    });
    setPaymentSavedMessage(true);
    setTimeout(() => setPaymentSavedMessage(false), 3000);
  };

  const handleSendQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotingEnquiry) return;

    updateEnquiryStatus(
      quotingEnquiry.id,
      'quoted',
      quoteForm.notes,
      {
        totalAmount: Number(quoteForm.totalAmount),
        depositRequired: Number(quoteForm.depositRequired),
        deliveryCharge: Number(quoteForm.deliveryCharge),
        expiryDate: quoteForm.expiryDate,
        notes: quoteForm.notes
      },
      quoteForm.reminderDate || undefined
    );
    setQuotingEnquiry(null);
  };

  // CSV Export for authorized business records
  const exportEnquiriesCsv = () => {
    const headers = ['Reference', 'Customer', 'Phone', 'Occasion', 'Date', 'Flavour', 'Weight', 'Budget', 'Status'];
    const rows = enquiries.map(e => [
      e.referenceNumber,
      `"${e.customerName.replace(/"/g, '""')}"`,
      `"${e.phone}"`,
      `"${e.occasion || ''}"`,
      e.requiredDate,
      `"${e.flavour || ''}"`,
      e.selectedWeight || e.approximateWeight,
      e.budgetInr || 0,
      e.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bakery_enquiries_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E8D5C8]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A]">
            Owner Control Center
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#4B2E25]">
            {settings.shopName} Administration
          </h1>
        </div>

        {/* Action Controls: View Storefront & Sign Out */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#4B2E25] bg-white border border-[#E8D5C8] hover:bg-[#FFF8EF] rounded-xl transition-colors shadow-2xs"
            title="Open public website without signing out"
          >
            <Globe className="w-3.5 h-3.5 text-[#C5A15A]" />
            <span>View Public Website</span>
          </button>

          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-xl transition-colors shadow-2xs"
            title="Safely sign out from admin session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Admin Dashboard Menu Navigation Container with Horizontal Arrows & All Sections Dropdown */}
      <div className="relative mb-6 border-b border-[#E8D5C8]/80 pb-3" ref={dropdownRef}>
        <div className="flex items-center gap-2">
          
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => handleScrollMenu('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll admin menu previous"
            title="Scroll menu previous (‹)"
            className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-[#E8D5C8] transition-all ${
              canScrollLeft
                ? 'bg-white text-[#4B2E25] hover:bg-[#FFF8EF] hover:border-[#C5A15A] shadow-2xs active:scale-95 cursor-pointer'
                : 'bg-white/40 text-[#4B2E25]/30 border-dashed border-[#E8D5C8]/60 cursor-not-allowed opacity-35'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Horizontal Scrollable Menu Tabs */}
          <div
            ref={menuScrollRef}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto scroll-smooth scrollbar-none py-1 px-0.5"
            tabIndex={0}
            role="tablist"
            aria-label="Admin Navigation Sections"
          >
            {ADMIN_NAV_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-tab-id={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#4B2E25] text-white shadow-xs ring-2 ring-[#4B2E25]/20'
                      : 'bg-white text-[#4B2E25] border border-[#E8D5C8] hover:bg-[#FFF8EF] hover:border-[#C5A15A]/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#C5A15A]' : 'text-[#4B2E25]/70'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => handleScrollMenu('right')}
            disabled={!canScrollRight}
            aria-label="Scroll admin menu next"
            title="Scroll menu next (›)"
            className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-[#E8D5C8] transition-all ${
              canScrollRight
                ? 'bg-white text-[#4B2E25] hover:bg-[#FFF8EF] hover:border-[#C5A15A] shadow-2xs active:scale-95 cursor-pointer'
                : 'bg-white/40 text-[#4B2E25]/30 border-dashed border-[#E8D5C8]/60 cursor-not-allowed opacity-35'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* All Menu Sections Dropdown Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAllMenuOpen(!isAllMenuOpen)}
            aria-expanded={isAllMenuOpen}
            aria-haspopup="true"
            aria-label="Toggle all menu sections dropdown"
            title="View all 16 admin dashboard sections"
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
              isAllMenuOpen
                ? 'bg-[#4B2E25] text-white border-[#4B2E25] shadow-xs'
                : 'bg-white text-[#4B2E25] border-[#E8D5C8] hover:bg-[#FFF8EF] hover:border-[#C5A15A] shadow-2xs'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#C5A15A]" />
            <span className="hidden sm:inline">All Menu Sections</span>
            <span className="sm:hidden">All</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono leading-none ${
              isAllMenuOpen ? 'bg-white/20 text-[#FFF8EF]' : 'bg-[#FFF8EF] text-[#4B2E25] border border-[#E8D5C8]'
            }`}>
              {ADMIN_NAV_TABS.length}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isAllMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expandable Dropdown Panel */}
        {isAllMenuOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-full max-w-4xl bg-white rounded-2xl border border-[#E8D5C8] shadow-xl z-50 p-4 sm:p-5 animate-fade-in"
            role="menu"
            aria-label="All Admin Sections Menu"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E8D5C8]/80 mb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#C5A15A]" />
                <h3 className="font-serif text-sm font-bold text-[#4B2E25]">
                  All Administration Sections ({ADMIN_NAV_TABS.length})
                </h3>
              </div>
              <span className="text-[11px] text-[#4B2E25]/60">
                Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#FFF8EF] border border-[#E8D5C8] rounded">Esc</kbd> to close
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {ADMIN_NAV_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="menuitem"
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-[#4B2E25] text-white shadow-xs ring-1 ring-[#4B2E25]'
                        : 'bg-[#FFF8EF]/50 hover:bg-[#FFF8EF] text-[#4B2E25] border border-[#E8D5C8]/70 hover:border-[#C5A15A]'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      isActive ? 'bg-white/15 text-[#C5A15A]' : 'bg-white text-[#C5A15A] border border-[#E8D5C8]'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <strong className="text-xs font-semibold truncate block">
                          {tab.label}
                        </strong>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C5A15A] shrink-0" />
                        )}
                      </div>
                      <span className={`text-[11px] leading-tight block line-clamp-1 mt-0.5 ${
                        isActive ? 'text-white/75' : 'text-[#4B2E25]/60'
                      }`}>
                        {tab.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* TAB: GOOGLE DRIVE BACKUP */}
      {activeTab === 'drive' && (
        <div className="py-6 animate-fade-in">
          <AdminGoogleDriveBackup />
        </div>
      )}

      {/* TAB: SYSTEM HEALTH & CONFIGURATION STATUS */}
      {activeTab === 'health' && (
        <div className="py-6 animate-fade-in">
          <AdminSystemHealth />
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="py-8 space-y-8 animate-fade-in">
          {/* Shop Availability Quick Status Bar */}
          <div className={`p-5 rounded-3xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs ${
            (settings.is_open !== false && settings.isOpen !== false)
              ? 'bg-emerald-50/70 border-emerald-300'
              : 'bg-rose-50/80 border-rose-300'
          }`}>
            <div className="flex items-center gap-3.5">
              <span className={`p-3 rounded-2xl ${
                (settings.is_open !== false && settings.isOpen !== false) ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                <Power className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    (settings.is_open !== false && settings.isOpen !== false) ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'
                  }`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4B2E25]">
                    Order Intake Status: {(settings.is_open !== false && settings.isOpen !== false) ? 'Store Open for Orders' : 'Store Closed (Orders Paused)'}
                  </span>
                </div>
                <p className="text-xs text-[#4B2E25]/75 mt-0.5">
                  {(settings.is_open !== false && settings.isOpen !== false)
                    ? 'Customers can browse cakes, configure options, and place orders online.'
                    : `New orders are rejected. Closure message: "${settings.closureMessage || 'Store currently closed'}"`}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('availability')}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white text-[#4B2E25] border border-[#E8D5C8] hover:bg-[#FFF8EF] transition-colors shadow-2xs whitespace-nowrap"
            >
              Open Shop Availability →
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 bg-white rounded-3xl border border-[#E8D5C8] shadow-xs">
              <span className="text-xs text-[#4B2E25]/60 block font-medium">Published Cakes</span>
              <span className="font-serif text-3xl font-bold text-[#4B2E25] mt-1 block">
                {cakes.filter(c => c.isPublished).length}
              </span>
              <span className="text-[11px] text-[#4B2E25]/60 mt-1 block">
                {cakes.filter(c => !c.isPublished).length} drafts
              </span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-[#E8D5C8] shadow-xs">
              <span className="text-xs text-[#4B2E25]/60 block font-medium">Pending Enquiries</span>
              <span className="font-serif text-3xl font-bold text-[#4B2E25] mt-1 block">
                {enquiries.filter(e => e.status === 'new' || e.status === 'reviewing').length}
              </span>
              <span className="text-[11px] text-amber-800 mt-1 block font-medium">Requires owner quote/response</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-[#E8D5C8] shadow-xs">
              <span className="text-xs text-[#4B2E25]/60 block font-medium">UPI Payment Mode</span>
              <span className="font-serif text-xl font-bold text-[#4B2E25] mt-1 block capitalize">
                {settings.isUpiEnabled ? 'Active (Configured)' : 'Disabled'}
              </span>
              <span className="text-[11px] text-[#4B2E25]/60 mt-1 block">{settings.upiId || 'No UPI ID'}</span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-[#E8D5C8] shadow-xs">
              <span className="text-xs text-[#4B2E25]/60 block font-medium">Total Cake Views</span>
              <span className="font-serif text-3xl font-bold text-[#4B2E25] mt-1 block font-mono">
                {analytics.cakeViews}
              </span>
              <span className="text-[11px] text-emerald-800 mt-1 block font-medium">
                {analytics.whatsAppClicks} WhatsApp interactions
              </span>
            </div>
          </div>

          {/* Order Fulfilment & Status Control Summary Bar */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="p-3 bg-[#4B2E25] text-white rounded-2xl shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-serif text-base font-bold text-[#4B2E25]">
                  Order Fulfilment & Status Management ({orders.length} Total Orders)
                </h4>
                <p className="text-xs text-[#4B2E25]/75 mt-0.5">
                  {orders.filter(o => o.orderStatus === 'awaiting_confirmation' || o.fulfilmentStage === 'awaiting_confirmation').length > 0 ? (
                    <span className="text-amber-800 font-bold">
                      ⚠ {orders.filter(o => o.orderStatus === 'awaiting_confirmation' || o.fulfilmentStage === 'awaiting_confirmation').length} order(s) awaiting kitchen acceptance
                    </span>
                  ) : (
                    <span>All orders reviewed · Kitchen workflows active</span>
                  )}
                  {' · '}
                  <span>{orders.filter(o => ['preparing', 'baking', 'decorating', 'quality_check'].includes(o.fulfilmentStage || '')).length} in baking & prep</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('orders')}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-[#4B2E25] text-white hover:bg-[#38221B] transition-colors shadow-2xs whitespace-nowrap self-start sm:self-auto"
            >
              Open Orders & Status Panel →
            </button>
          </div>

          {/* Recharts Analytics: Daily and Monthly Order Volume Trends */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 bg-[#4B2E25]/10 text-[#4B2E25] rounded-xl">
                  <TrendingUp className="w-5 h-5 text-[#4B2E25]" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#4B2E25]">
                    Order Volume & Revenue Trends
                  </h3>
                  <p className="text-xs text-[#4B2E25]/70">
                    Live analytics powered by Recharts visualizing daily intake and monthly booking volume trends.
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-mono px-3 py-1 bg-white border border-[#E8D5C8] rounded-xl text-[#4B2E25]">
                {orders.length} lifetime orders
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Order Volume Trend (Last 14 Days) */}
              <div className="bg-white p-6 rounded-3xl border border-[#E8D5C8] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-[#4B2E25]">
                      Daily Order Volume (Last 14 Days)
                    </h4>
                    <p className="text-[11px] text-[#4B2E25]/60 mt-0.5">
                      New orders received per calendar day
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-[#C5A15A] bg-[#FFF8EF] px-2.5 py-1 rounded-lg border border-[#E8D5C8]">
                    Daily Trend
                  </span>
                </div>

                <div className="h-64 w-full">
                  {(() => {
                    const daysMap: Record<string, { label: string; count: number; revenue: number }> = {};
                    const now = new Date();
                    for (let i = 13; i >= 0; i--) {
                      const d = new Date(now);
                      d.setDate(d.getDate() - i);
                      const key = d.toISOString().split('T')[0];
                      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                      daysMap[key] = { label, count: 0, revenue: 0 };
                    }

                    orders.forEach(o => {
                      const dateKey = (o.createdAt || o.fulfilmentDate || '').split('T')[0];
                      if (daysMap[dateKey]) {
                        daysMap[dateKey].count += 1;
                        daysMap[dateKey].revenue += (o.totalAmount || 0);
                      }
                    });

                    const dailyData = Object.keys(daysMap).map(k => ({
                      date: daysMap[k].label,
                      orders: daysMap[k].count,
                      revenue: daysMap[k].revenue
                    }));

                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="orderVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#C5A15A" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#C5A15A" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F4EAE1" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="#7A5B51" 
                            fontSize={11} 
                            tickLine={false}
                            axisLine={{ stroke: '#E8D5C8' }}
                          />
                          <YAxis 
                            stroke="#7A5B51" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#4B2E25', 
                              borderRadius: '12px', 
                              border: 'none', 
                              color: '#FFF8EF', 
                              fontSize: '12px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}
                            itemStyle={{ color: '#C5A15A' }}
                            formatter={(value: any) => [`${value} orders`, 'Order Volume']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="orders" 
                            stroke="#4B2E25" 
                            strokeWidth={2.5} 
                            fillOpacity={1} 
                            fill="url(#orderVolumeGrad)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </div>

              {/* Monthly Order Volume Trend (Last 6 Months) */}
              <div className="bg-white p-6 rounded-3xl border border-[#E8D5C8] shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-sm text-[#4B2E25]">
                      Monthly Order Volume (Last 6 Months)
                    </h4>
                    <p className="text-[11px] text-[#4B2E25]/60 mt-0.5">
                      Cumulative bakery orders per month
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-[#4B2E25] bg-[#F4D8D8]/50 px-2.5 py-1 rounded-lg border border-[#E8D5C8]">
                    Monthly Trend
                  </span>
                </div>

                <div className="h-64 w-full">
                  {(() => {
                    const monthsMap: Record<string, { label: string; count: number; revenue: number }> = {};
                    const now = new Date();
                    for (let i = 5; i >= 0; i--) {
                      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
                      monthsMap[key] = { label, count: 0, revenue: 0 };
                    }

                    orders.forEach(o => {
                      const dateStr = o.createdAt || o.fulfilmentDate || '';
                      if (dateStr.length >= 7) {
                        const monthKey = dateStr.slice(0, 7);
                        if (monthsMap[monthKey]) {
                          monthsMap[monthKey].count += 1;
                          monthsMap[monthKey].revenue += (o.totalAmount || 0);
                        }
                      }
                    });

                    const monthlyData = Object.keys(monthsMap).map(k => ({
                      month: monthsMap[k].label,
                      orders: monthsMap[k].count,
                      revenue: monthsMap[k].revenue
                    }));

                    return (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F4EAE1" vertical={false} />
                          <XAxis 
                            dataKey="month" 
                            stroke="#7A5B51" 
                            fontSize={11} 
                            tickLine={false}
                            axisLine={{ stroke: '#E8D5C8' }}
                          />
                          <YAxis 
                            stroke="#7A5B51" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#4B2E25', 
                              borderRadius: '12px', 
                              border: 'none', 
                              color: '#FFF8EF', 
                              fontSize: '12px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}
                            itemStyle={{ color: '#C5A15A' }}
                            formatter={(value: any) => [`${value} orders`, 'Total Volume']}
                          />
                          <Bar 
                            dataKey="orders" 
                            fill="#4B2E25" 
                            radius={[6, 6, 0, 0]} 
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SHOP AVAILABILITY & MASTER ORDER INTAKE */}
      {activeTab === 'availability' && (
        <AdminShopAvailability />
      )}

      {/* TAB: HOMEPAGE CAKE SLIDESHOW DEDICATED MANAGEMENT */}
      {activeTab === 'slideshow' && (
        <div className="py-6 animate-fade-in">
          <AdminSlideshowManager />
        </div>
      )}

      {/* TAB 2: CAKE MENU & PHOTO MANAGEMENT STUDIO */}
      {activeTab === 'cakes' && (
        <div className="py-8 space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
                Cake Menu & Photo Studio ({cakes.length})
              </h2>
              <p className="text-xs text-[#4B2E25]/70">
                Upload photographs, manage variants, and publish or draft cakes directly to the public gallery.
              </p>
            </div>

            <button
              onClick={() => {
                setCakeToEdit(null);
                setIsCakeEditorOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-all shadow-md active:scale-98 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-[#C5A15A]" />
              <span>+ Add New Cake</span>
            </button>
          </div>

          {/* Status Filters: All, Published, Drafts, Archived */}
          <div className="flex items-center gap-2 border-b border-[#E8D5C8]/70 pb-3 overflow-x-auto">
            {[
              { id: 'all', label: `All Cakes (${cakes.length})` },
              { id: 'published', label: `Published (${cakes.filter(c => c.isPublished).length})` },
              { id: 'draft', label: `Drafts (${cakes.filter(c => !c.isPublished && c.status !== 'archived').length})` },
              { id: 'archived', label: `Archived (${cakes.filter(c => c.status === 'archived').length})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setCakeFilter(f.id as any)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
                  cakeFilter === f.id
                    ? 'bg-[#4B2E25] text-white shadow-2xs'
                    : 'bg-white text-[#4B2E25]/75 border border-[#E8D5C8] hover:bg-[#FFF8EF]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Form Modal / Drawer for Add or Edit */}
          {(isAddingCake || editingCake) && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-lg mb-8">
              <div className="flex items-center justify-between pb-4 border-b border-[#E8D5C8] mb-6">
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#4B2E25]">
                    {editingCake ? `Edit "${editingCake.name}"` : 'Create & Publish New Cake'}
                  </h3>
                  <span className="text-xs text-[#4B2E25]/60">Configure multiple weight tiers and custom specifications.</span>
                </div>
                <button
                  onClick={() => { setIsAddingCake(false); setEditingCake(null); }}
                  className="text-xs px-3 py-1.5 bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl hover:bg-white"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveCake} className="space-y-6">
                {/* Basic info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                      Cake Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Saffron Pistachio Royal Tier"
                      value={cakeForm.name}
                      onChange={(e) => setCakeForm({ ...cakeForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                      Category *
                    </label>
                    <select
                      value={cakeForm.category}
                      onChange={(e) => setCakeForm({ ...cakeForm, category: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                    >
                      <option value="Birthday">Birthday</option>
                      <option value="Wedding">Wedding</option>
                      <option value="Anniversary">Anniversary</option>
                      <option value="Custom Cakes">Custom Cakes</option>
                      <option value="Cupcakes">Cupcakes</option>
                      <option value="Eggless">Eggless</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                    Full Description & Flavour Nuances *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={cakeForm.description}
                    onChange={(e) => setCakeForm({ ...cakeForm, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                  />
                </div>

                {/* DYNAMIC WEIGHT & PRICE OPTIONS WITH (+) BUTTON */}
                <div className="p-4 sm:p-5 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-serif font-bold text-sm text-[#4B2E25]">
                        Multiple Weight & Price Tiers
                      </span>
                      <p className="text-[11px] text-[#4B2E25]/70">
                        Add individual pricing for each weight variant (e.g. 0.5 kg, 1 kg, 1.5 kg, 2 kg).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddWeightRow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4B2E25] bg-white border border-[#E8D5C8] rounded-xl hover:bg-[#F4D8D8]/30 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#C5A15A]" />
                      <span>+ Add Weight / Price</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {cakeForm.weightOptions.map((opt, idx) => (
                      <div key={opt.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white p-3 rounded-xl border border-[#E8D5C8] items-center">
                        <div className="sm:col-span-4">
                          <label className="text-[10px] text-[#4B2E25]/60 uppercase font-semibold block mb-0.5">Weight (kg/lbs)</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 1.0 kg"
                            value={opt.weight}
                            onChange={(e) => handleUpdateWeightRow(idx, 'weight', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E8D5C8]"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-[#4B2E25]/60 uppercase font-semibold block mb-0.5">Price in ₹</label>
                          <input
                            type="number"
                            required
                            min={0}
                            placeholder="1600"
                            value={opt.price}
                            onChange={(e) => handleUpdateWeightRow(idx, 'price', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-[#E8D5C8]"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="text-[10px] text-[#4B2E25]/60 uppercase font-semibold block mb-0.5">Portion / Serving Info</label>
                          <input
                            type="text"
                            placeholder="e.g. Serves 8-10 guests"
                            value={opt.description || ''}
                            onChange={(e) => handleUpdateWeightRow(idx, 'description', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E8D5C8]"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                          {cakeForm.weightOptions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveWeightRow(idx)}
                              className="p-1.5 text-red-700 hover:text-red-900"
                              title="Remove Weight Tier"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DYNAMIC ADDITIONAL SPECIFICATIONS WITH (+) BUTTON */}
                <div className="p-4 sm:p-5 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-serif font-bold text-sm text-[#4B2E25]">
                        Custom Specifications & Details
                      </span>
                      <p className="text-[11px] text-[#4B2E25]/70">
                        Add custom tags such as Filling, Shape, Decoration, Dietary Notes, or Special Instructions.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddSpecRow}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4B2E25] bg-white border border-[#E8D5C8] rounded-xl hover:bg-[#F4D8D8]/30 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#C5A15A]" />
                      <span>+ Add Specification</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {cakeForm.specifications.map((spec, idx) => (
                      <div key={spec.id || idx} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-[#E8D5C8]">
                        <input
                          type="text"
                          placeholder="Label (e.g. Filling, Shape)"
                          value={spec.label}
                          onChange={(e) => handleUpdateSpecRow(idx, 'label', e.target.value)}
                          className="w-1/3 px-2.5 py-1.5 text-xs rounded-lg border border-[#E8D5C8] font-semibold"
                        />
                        <input
                          type="text"
                          placeholder="Specification Details"
                          value={spec.value}
                          onChange={(e) => handleUpdateSpecRow(idx, 'value', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[#E8D5C8]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecRow(idx)}
                          className="p-1.5 text-red-700 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photo & Lead Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                      Cake Photograph
                    </label>
                    <div className="flex items-center gap-3">
                      <img src={cakeForm.imageUrl} alt="Preview" className="w-14 h-14 object-cover rounded-xl border border-[#E8D5C8]" />
                      <label className="cursor-pointer px-4 py-2 bg-[#FFF8EF] border border-dashed border-[#C5A15A] rounded-xl text-xs font-semibold text-[#4B2E25] hover:bg-[#F4D8D8]/30">
                        Upload Photograph
                        <input type="file" accept="image/*" onChange={handleCakePhotoUpload} className="hidden" />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                      Lead Time (Hours notice required)
                    </label>
                    <input
                      type="number"
                      value={cakeForm.leadTimeHours}
                      onChange={(e) => setCakeForm({ ...cakeForm, leadTimeHours: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                    />
                  </div>
                </div>

                {/* Availability & Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                      Availability Status
                    </label>
                    <select
                      value={cakeForm.availability}
                      onChange={(e) => setCakeForm({ ...cakeForm, availability: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                    >
                      <option value="available_now">Available Now</option>
                      <option value="made_to_order">Made to Order</option>
                      <option value="temporarily_unavailable">Temporarily Unavailable</option>
                      <option value="sold_out">Sold Out</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-4 pt-5">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cakeForm.isEgglessOption}
                        onChange={(e) => setCakeForm({ ...cakeForm, isEgglessOption: e.target.checked })}
                        className="accent-[#4B2E25]"
                      />
                      <span>Eggless Option Available</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-4 pt-5">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cakeForm.isFeatured}
                        onChange={(e) => setCakeForm({ ...cakeForm, isFeatured: e.target.checked })}
                        className="accent-[#4B2E25]"
                      />
                      <span>Show on Homepage Carousel</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
                  >
                    {editingCake ? 'Save Cake Changes' : 'Publish Cake to Menu'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingCake(false); setEditingCake(null); }}
                    className="px-5 py-3 text-xs font-medium text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List / Table of Cakes */}
          <div className="bg-white rounded-3xl overflow-hidden border border-[#E8D5C8] shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#4B2E25]">
                <thead className="bg-[#FFF8EF] border-b border-[#E8D5C8] uppercase font-semibold text-[#4B2E25]/70">
                  <tr>
                    <th className="px-6 py-4">Cake</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Weights & Prices</th>
                    <th className="px-6 py-4">Status & Availability</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8D5C8]/60">
                  {cakes
                    .filter(c => {
                      if (cakeFilter === 'all') return true;
                      if (cakeFilter === 'published') return c.isPublished;
                      if (cakeFilter === 'draft') return !c.isPublished && c.status !== 'archived';
                      if (cakeFilter === 'archived') return c.status === 'archived';
                      return true;
                    })
                    .map(cake => (
                    <tr key={cake.id} className="hover:bg-[#FFF8EF]/30 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <img 
                          src={cake.images[0]?.url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80'} 
                          alt={cake.name} 
                          className="w-12 h-12 rounded-xl object-cover border border-[#E8D5C8]" 
                        />
                        <div>
                          <strong className="font-serif text-sm block">{cake.name}</strong>
                          <span className="text-[#4B2E25]/60 text-[11px]">{cake.leadTimeHours}h notice · {cake.images?.length || 1} photos</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">{cake.category}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {cake.weightOptions.map((w, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-[#FFF8EF] rounded-md border border-[#E8D5C8] font-mono text-[11px]">
                              {w.weight}: ₹{w.price}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {/* Availability Selector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#4B2E25]/60 uppercase font-semibold w-16 shrink-0">Avail:</span>
                            <select
                              value={cake.availability}
                              onChange={(e) => updateCakeAvailability(cake.id, e.target.value as any)}
                              className={`px-2 py-1 text-[11px] font-bold rounded-lg border focus:ring-1 focus:ring-[#C5A15A] cursor-pointer ${
                                cake.availability === 'sold_out'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : cake.availability === 'temporarily_unavailable'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              <option value="available_now">Available Now</option>
                              <option value="made_to_order">Made to Order</option>
                              <option value="temporarily_unavailable">Temporarily Unavailable</option>
                              <option value="sold_out">Sold Out</option>
                            </select>
                          </div>

                          {/* Catalogue Publication Selector */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#4B2E25]/60 uppercase font-semibold w-16 shrink-0">Status:</span>
                            <select
                              value={cake.status || (cake.isPublished ? 'published' : 'draft')}
                              onChange={(e) => {
                                const newStatus = e.target.value as 'draft' | 'published' | 'archived';
                                updateCake(cake.id, {
                                  status: newStatus,
                                  isPublished: newStatus === 'published'
                                });
                                showToast(`"${cake.name}" set to ${newStatus}.`, 'success');
                              }}
                              className={`px-2 py-1 text-[11px] font-bold rounded-lg border focus:ring-1 focus:ring-[#C5A15A] cursor-pointer ${
                                cake.isPublished
                                  ? 'bg-emerald-100/70 text-emerald-900 border-emerald-300'
                                  : cake.status === 'archived'
                                  ? 'bg-zinc-100 text-zinc-700 border-zinc-300'
                                  : 'bg-amber-100/70 text-amber-900 border-amber-300'
                              }`}
                            >
                              <option value="published">● Published</option>
                              <option value="draft">○ Draft</option>
                              <option value="archived">■ Archived</option>
                            </select>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Publish / Unpublish Toggle */}
                          <button
                            onClick={() => {
                              publishCake(cake.id, !cake.isPublished);
                              showToast(cake.isPublished ? `"${cake.name}" moved to drafts.` : `"${cake.name}" published to live gallery!`, 'success');
                            }}
                            className={`p-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              cake.isPublished 
                                ? 'border-amber-200 text-amber-800 hover:bg-amber-50' 
                                : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                            }`}
                            title={cake.isPublished ? 'Unpublish to Draft' : 'Publish to Storefront'}
                          >
                            {cake.isPublished ? <Eye className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit via Comprehensive Photo Studio Modal */}
                          <button
                            onClick={() => {
                              setCakeToEdit(cake);
                              setIsCakeEditorOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-[#E8D5C8] text-[#4B2E25] hover:bg-[#FFF8EF] transition-colors"
                            title="Edit Cake & Photos"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Archive / Restore */}
                          <button
                            onClick={() => {
                              if (cake.status === 'archived') {
                                updateCake(cake.id, { status: 'draft', isPublished: false });
                                showToast(`"${cake.name}" restored from archive.`, 'info');
                              } else {
                                archiveCake(cake.id);
                                showToast(`"${cake.name}" archived.`, 'info');
                              }
                            }}
                            className="p-1.5 rounded-lg border border-[#E8D5C8] text-[#4B2E25]/60 hover:text-[#4B2E25] hover:bg-[#FFF8EF] transition-colors"
                            title={cake.status === 'archived' ? 'Restore Cake' : 'Archive Cake'}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to permanently delete "${cake.name}"? This action cannot be undone.`)) {
                                deleteCake(cake.id);
                                showToast(`Deleted "${cake.name}".`, 'info');
                              }
                            }}
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Cake"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS & FULFILMENT WORKFLOW */}
      {activeTab === 'orders' && (
        <div className="py-6 animate-fade-in">
          <AdminOrdersManager />
        </div>
      )}

      {/* TAB: INVOICE & BILLING MANAGEMENT */}
      {activeTab === 'invoices' && (
        <div className="py-6 animate-fade-in">
          <InvoiceManager />
        </div>
      )}

      {/* TAB 4: PAYMENT SETTINGS (CONFIGURABLE LATER) */}
      {activeTab === 'payments' && (
        <div className="py-8 space-y-6 animate-fade-in max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
                Configurable UPI & Payment Settings
              </h2>
              <p className="text-xs text-[#4B2E25]/70">
                Configure your official bank UPI ID and QR code whenever you are ready.
              </p>
            </div>

            {paymentSavedMessage && (
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg">
                Payment settings saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSavePaymentSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-sm space-y-6">
            {/* Enable / Disable toggle */}
            <div className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] flex items-center justify-between">
              <div>
                <strong className="text-xs text-[#4B2E25] block">Enable Public UPI Payments</strong>
                <span className="text-[11px] text-[#4B2E25]/70">
                  When disabled, customers will only be guided to WhatsApp discussions without displaying UPI credentials.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentForm.isUpiEnabled}
                  onChange={(e) => setPaymentForm({ ...paymentForm, isUpiEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-800" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Official UPI ID *
                </label>
                <input
                  type="text"
                  placeholder="e.g. bakeryname@icici"
                  value={paymentForm.upiId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, upiId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-mono text-[#4B2E25]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Payee Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Artisan Cake Studio"
                  value={paymentForm.payeeName}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payeeName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                />
              </div>
            </div>

            {/* Official QR Code Upload & Preview */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                Upload Official UPI QR Code Image
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8]">
                {paymentForm.upiQrImageUrl ? (
                  <img 
                    src={paymentForm.upiQrImageUrl} 
                    alt="Uploaded UPI QR" 
                    className="w-32 h-32 object-contain bg-white p-2 rounded-xl border border-[#E8D5C8]" 
                  />
                ) : (
                  <div className="w-32 h-32 rounded-xl border-2 border-dashed border-[#C5A15A] flex flex-col items-center justify-center text-[#4B2E25]/60 text-[10px] p-2 text-center bg-white">
                    <QrCode className="w-8 h-8 text-[#C5A15A] mb-1" />
                    <span>No QR uploaded yet</span>
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <p className="text-[#4B2E25]/80 text-[11px]">
                    Upload your printed bank QR code (PhonePe Business, Google Pay for Business, or ICICI/HDFC merchant QR).
                  </p>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E8D5C8] rounded-xl text-xs font-semibold text-[#4B2E25] hover:bg-[#F4D8D8]/30">
                    <Upload className="w-3.5 h-3.5 text-[#C5A15A]" />
                    <span>{paymentForm.upiQrImageUrl ? 'Replace QR Image' : 'Upload QR Image'}</span>
                    <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                Payment Instructions Shown to Customers
              </label>
              <textarea
                rows={2}
                value={paymentForm.paymentInstructions}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentInstructions: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                Supported Purpose / Policy
              </label>
              <input
                type="text"
                value={paymentForm.paymentPurpose}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentPurpose: e.target.value })}
                placeholder="Advance Deposit (50%) or Full Order Settlement"
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
            >
              Save Payment Settings
            </button>
          </form>
        </div>
      )}

      {/* TAB: SMS & OTP GATEWAY CONFIGURATION (Deprecated: Email only) */}
      {false && (activeTab as any) === 'sms' && (
        <div className="py-8 space-y-6 animate-fade-in max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
                Customer SMS & OTP Gateway Management
              </h2>
              <p className="text-xs text-[#4B2E25]/70">
                Configure live SMS delivery for customer mobile verification, order lookup, and baking milestone updates.
              </p>
            </div>

            {smsSavedMessage && (
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg animate-fade-in">
                SMS settings saved!
              </span>
            )}
          </div>

          {/* Current Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
            smsForm.provider !== 'none' && smsForm.apiKey && smsForm.isLive
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {smsForm.provider !== 'none' && smsForm.apiKey && smsForm.isLive ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <strong>
                {smsForm.provider !== 'none' && smsForm.apiKey && smsForm.isLive
                  ? `Active Gateway: ${smsForm.provider.toUpperCase()} (Live SMS Enabled)`
                  : 'SMS Gateway Currently Inactive / Unconfigured'}
              </strong>
              <p className="text-[11px] leading-relaxed opacity-90">
                {smsForm.provider !== 'none' && smsForm.apiKey && smsForm.isLive
                  ? `Customer OTPs are dispatched through ${smsForm.provider.toUpperCase()} to Indian mobile carriers. Cooldown timers (60s) and attempt limits (4) are active.`
                  : 'No SMS telecom gateway is connected with live credentials. The website prevents false success messages and clearly informs customers. Customers can still track orders directly using their Order ID & phone number.'}
              </p>
            </div>
          </div>

          {/* Root Cause & Diagnostic Note for Bakery Owner */}
          <div className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] text-xs text-[#4B2E25]/85 space-y-2">
            <div className="flex items-center gap-2 text-[#4B2E25] font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#C5A15A]" />
              <span>Root-Cause Diagnosis: Why Customer SMS Was Not Arriving</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#4B2E25]/80">
              The application previously had no external telecom gateway connected—it only simulated state in the browser. Real SMS delivery to mobile phones in India (+91) requires an active account with an Indian SMS provider. Configure <strong>Fast2SMS</strong> (fastest setup without prior DLT registration) or <strong>MSG91</strong> below to enable instant SMS delivery.
            </p>
          </div>

          {/* Gateway Settings Form */}
          <form onSubmit={handleSaveSmsSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-sm space-y-6">
            <h3 className="font-serif text-lg font-bold text-[#4B2E25]">Gateway Configuration</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  SMS Provider *
                </label>
                <select
                  value={smsForm.provider}
                  onChange={(e) => setSmsForm({ ...smsForm, provider: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] bg-white"
                >
                  <option value="none">Disabled / Offline (No SMS Gateway)</option>
                  <option value="fast2sms">Fast2SMS (Recommended for India - Quick OTP)</option>
                  <option value="msg91">MSG91 (India DLT Compliant Gateway)</option>
                  <option value="twilio">Twilio (International SMS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Live Dispatch Toggle
                </label>
                <div className="h-10 flex items-center">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsForm.isLive}
                      onChange={(e) => setSmsForm({ ...smsForm, isLive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-800" />
                    <span className="ml-3 text-xs font-medium text-[#4B2E25]">
                      {smsForm.isLive ? 'Live Dispatch Enabled' : 'Paused / Offline'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {smsForm.provider !== 'none' && (
              <div className="space-y-4 pt-2 border-t border-[#E8D5C8]/60">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                    API Key / Auth Token *
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={smsForm.apiKey || ''}
                      onChange={(e) => setSmsForm({ ...smsForm, apiKey: e.target.value })}
                      placeholder={smsForm.provider === 'fast2sms' ? 'Enter Fast2SMS API Key' : 'Enter MSG91 Auth Key'}
                      className="w-full pl-3.5 pr-20 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-mono text-[#4B2E25]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#4B2E25]/60 hover:text-[#4B2E25] px-2 py-1"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-[#4B2E25]/65">
                    Credentials are kept secure and never exposed in customer-facing code.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                      Sender ID / Header (DLT)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={smsForm.senderId || ''}
                      onChange={(e) => setSmsForm({ ...smsForm, senderId: e.target.value.toUpperCase() })}
                      placeholder="e.g. CKJNCT"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-mono uppercase text-[#4B2E25]"
                    />
                  </div>

                  {smsForm.provider === 'msg91' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                        DLT Content Template ID
                      </label>
                      <input
                        type="text"
                        value={smsForm.dltTemplateId || ''}
                        onChange={(e) => setSmsForm({ ...smsForm, dltTemplateId: e.target.value })}
                        placeholder="e.g. 120716..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-mono text-[#4B2E25]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
            >
              Save SMS Gateway Configuration
            </button>
          </form>

          {/* Test Live SMS Tool */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#4B2E25]">
              <Send className="w-4 h-4 text-[#C5A15A]" />
              <h3 className="font-serif text-lg font-bold">Test Live SMS Dispatch</h3>
            </div>
            <p className="text-xs text-[#4B2E25]/75">
              Enter your mobile number to send a test verification SMS and verify gateway responsiveness.
            </p>

            <form onSubmit={handleTestSmsConnection} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4B2E25]/60">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-[#E8D5C8] text-xs font-mono text-[#4B2E25]"
                  disabled={isTestingSms}
                />
              </div>

              <button
                type="submit"
                disabled={isTestingSms || !testPhoneNumber}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isTestingSms ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing Gateway...</span>
                  </>
                ) : (
                  <span>Send Test SMS</span>
                )}
              </button>
            </form>

            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                Boolean(testResult?.success)
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {testResult?.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <strong className="block">{testResult?.success ? 'Gateway Dispatch Confirmed' : 'Test Dispatch Failed'}</strong>
                  <p className="text-[11px] mt-0.5">{testResult?.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ADMIN ACCOUNT & SECURITY (PASSWORD CHANGE VIA OTP, SESSIONS, STAFF, AUDIT LOGS) */}
      {activeTab === 'security' && (
        <AdminAccountSecurity />
      )}

      {/* TAB 5: SHOP SETTINGS (ALL BUSINESS DETAILS EDITABLE) */}
      {activeTab === 'settings' && (
        <div className="py-8 space-y-8 animate-fade-in max-w-4xl">
          {/* Shop Availability Embedded Section */}
          <AdminShopAvailability />

          <div className="flex items-center justify-between pt-6 border-t border-[#E8D5C8]">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
                Storefront Details & Business Policies
              </h2>
              <p className="text-xs text-[#4B2E25]/70">
                All fields are editable. The public website immediately displays your saved information.
              </p>
            </div>

            {settingsSavedMessage && (
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg">
                Changes saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-sm space-y-6">
            
            {/* Logo Upload & Preview */}
            <div className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] flex flex-col sm:flex-row items-center gap-4">
              {settingsForm.logoUrl ? (
                <img src={settingsForm.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-full border border-[#E8D5C8] bg-white p-1" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#4B2E25] text-white flex items-center justify-center font-serif text-xl font-bold">
                  {settingsForm.shopName.charAt(0) || 'C'}
                </div>
              )}
              <div className="space-y-1 text-xs text-center sm:text-left">
                <strong className="block text-[#4B2E25]">Bakery Brand Logo</strong>
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8D5C8] rounded-xl text-xs font-semibold text-[#4B2E25] hover:bg-[#F4D8D8]/30">
                  <Upload className="w-3.5 h-3.5 text-[#C5A15A]" />
                  <span>Upload / Replace Logo</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Shop Name *
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.shopName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shopName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  WhatsApp Contact Number *
                </label>
                <input
                  type="tel"
                  required
                  value={settingsForm.whatsappNumber || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={settingsForm.email || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                  placeholder="contact@bakery.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Instagram URL
                </label>
                <input
                  type="text"
                  value={settingsForm.instagramUrl || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/mycakes"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                />
              </div>
            </div>

            {/* Address & City */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Physical Atelier Address
                </label>
                <input
                  type="text"
                  value={settingsForm.address || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  placeholder="Door No, Street Name, Locality"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  City & Postal Code
                </label>
                <input
                  type="text"
                  value={settingsForm.city || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                  placeholder="Chennai - 600028"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                Google Maps Directions URL
              </label>
              <input
                type="text"
                value={settingsForm.mapsUrl || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, mapsUrl: e.target.value })}
                placeholder="https://maps.google.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              />
            </div>

            {/* Opening Hours & Delivery Charges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Opening Hours
                </label>
                <input
                  type="text"
                  value={settingsForm.openingHours || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, openingHours: e.target.value })}
                  placeholder="Tue - Sun: 10:00 AM - 08:30 PM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                  Standard Delivery Charge (₹)
                </label>
                <input
                  type="number"
                  value={settingsForm.deliveryCharge || 150}
                  onChange={(e) => setSettingsForm({ ...settingsForm, deliveryCharge: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-sm text-[#4B2E25]"
                />
              </div>
            </div>

            {/* Policies */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                Cancellation & Refund Terms
              </label>
              <textarea
                rows={2}
                value={settingsForm.cancellationPolicy || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, cancellationPolicy: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                Privacy Policy
              </label>
              <textarea
                rows={2}
                value={settingsForm.privacyPolicy || ''}
                onChange={(e) => setSettingsForm({ ...settingsForm, privacyPolicy: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.isTamilEnabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, isTamilEnabled: e.target.checked })}
                  className="accent-[#4B2E25]"
                />
                <span>Enable Tamil Language Selector</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.isLaunched}
                  onChange={(e) => setSettingsForm({ ...settingsForm, isLaunched: e.target.checked })}
                  className="accent-[#4B2E25]"
                />
                <span>Public Website Launched</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
            >
              Save All Shop Settings
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: ENQUIRIES CRM */}
      {activeTab === 'enquiries' && (
        <div className="py-8 space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
                Customer Enquiries & Orders ({enquiries.length})
              </h2>
              <p className="text-xs text-[#4B2E25]/70">
                View private delivery addresses, contact customers via WhatsApp, and issue formal quotes.
              </p>
            </div>

            <button
              onClick={exportEnquiriesCsv}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#4B2E25] bg-white border border-[#E8D5C8] rounded-xl hover:bg-[#FFF8EF] shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="space-y-4">
            {enquiries.map(enq => {
              const waLink = buildWhatsAppLink(
                enq.phone,
                `Hello ${enq.customerName}, this is ${settings.shopName}. We received your order enquiry *${enq.referenceNumber}* for "${enq.cakeName}" on ${enq.requiredDate}!`
              );

              return (
                <div key={enq.id} className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8D5C8]/70">
                    <div>
                      <span className="font-mono text-sm font-bold text-[#4B2E25]">{enq.referenceNumber}</span>
                      <h3 className="font-serif text-lg font-bold text-[#4B2E25]">
                        {enq.customerName} ({enq.phone})
                      </h3>
                      <span className="text-xs font-medium text-[#C5A15A]">Cake: {enq.cakeName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#FFF8EF] border border-[#E8D5C8] capitalize">
                        Status: {enq.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-[#4B2E25]/80">
                    <div>
                      <span className="block text-[#4B2E25]/60">Required Date</span>
                      <strong>{enq.requiredDate} ({enq.preferredTime || 'Standard'})</strong>
                    </div>
                    <div>
                      <span className="block text-[#4B2E25]/60">Weight & Qty</span>
                      <strong>{enq.selectedWeight || enq.approximateWeight} ({enq.quantity || 1} qty)</strong>
                    </div>
                    <div>
                      <span className="block text-[#4B2E25]/60">Estimated Total</span>
                      <strong>{enq.budgetInr ? formatIndianCurrency(enq.budgetInr) : 'To be quoted'}</strong>
                    </div>
                    <div>
                      <span className="block text-[#4B2E25]/60">Handover Mode</span>
                      <strong className="capitalize">{enq.deliveryOrPickup}</strong>
                    </div>
                  </div>

                  {/* Private Delivery Address (Accessible ONLY to owner) */}
                  {enq.deliveryOrPickup === 'delivery' && enq.address && (
                    <div className="p-3 bg-[#FFF8EF] rounded-xl text-xs text-[#4B2E25] border border-[#E8D5C8]">
                      <strong className="block text-[11px] uppercase font-semibold text-[#4B2E25]/70 mb-0.5">
                        Private Delivery Address:
                      </strong>
                      <span>{enq.address}</span>
                    </div>
                  )}

                  {enq.cakeMessage && (
                    <p className="text-xs text-[#4B2E25]/85 italic">
                      Piped Cake Message: "{enq.cakeMessage}"
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat on WhatsApp</span>
                      </a>
                    )}

                    <button
                      onClick={() => setQuotingEnquiry(enq)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#4B2E25] bg-white border border-[#E8D5C8] hover:bg-[#F4D8D8]/30 rounded-lg"
                    >
                      {enq.quote ? 'Update Quote' : 'Issue Quote'}
                    </button>

                    <button
                      onClick={() => convertEnquiryToOrder(enq.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-lg"
                    >
                      Convert to Payable Order
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* OTHER TABS: Guest Feedback, FAQs, BTS, Audit */}
      {activeTab === 'feedback' && (
        <div className="py-8 space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">Guest Feedback Moderation</h2>
          {feedbackList.map(fb => (
            <div key={fb.id} className="bg-white p-5 rounded-2xl border border-[#E8D5C8]">
              <div className="flex justify-between items-center mb-2">
                <strong className="text-sm font-serif">{fb.customerName || 'Anonymous'}</strong>
                <span className="text-xs capitalize px-2 py-0.5 rounded-md bg-[#FFF8EF]">{fb.status}</span>
              </div>
              <p className="text-xs text-[#4B2E25]/80">"{fb.feedbackText}"</p>
              <div className="mt-3 flex gap-2">
                {fb.status !== 'approved' && (
                  <button onClick={() => updateFeedbackStatus(fb.id, 'approved', 'Thank you for choosing us!')} className="px-3 py-1 bg-emerald-800 text-white rounded-lg text-xs font-semibold">
                    Approve & Publish
                  </button>
                )}
                {fb.status !== 'rejected' && (
                  <button onClick={() => updateFeedbackStatus(fb.id, 'rejected')} className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-semibold">
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="py-8 space-y-4">
          <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">Security Audit Log</h2>
          <div className="bg-white rounded-2xl overflow-hidden border border-[#E8D5C8]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF8EF] border-b border-[#E8D5C8] font-semibold text-[#4B2E25]/70">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D5C8]/50">
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td className="px-4 py-2.5 font-mono text-[11px]">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-bold">{log.action}</td>
                    <td className="px-4 py-2.5">{log.userEmail}</td>
                    <td className="px-4 py-2.5">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Cake Photo Studio & Variant Modal */}
      <AdminCakeEditorModal
        isOpen={isCakeEditorOpen}
        cake={cakeToEdit}
        onClose={() => {
          setIsCakeEditorOpen(false);
          setCakeToEdit(null);
        }}
        onSave={(data, publishImmediately) => {
          if (cakeToEdit) {
            updateCake(cakeToEdit.id, {
              ...data,
              isPublished: publishImmediately,
              status: publishImmediately ? 'published' : (data.status || 'draft')
            });
            showToast(`Updated "${data.name}" successfully`, 'success');
          } else {
            addCake({
              ...data,
              isPublished: publishImmediately,
              status: publishImmediately ? 'published' : 'draft'
            });
            showToast(`Published "${data.name}" successfully to bakery menu`, 'success');
          }
          setIsCakeEditorOpen(false);
          setCakeToEdit(null);
        }}
      />

    </div>
  );
};
