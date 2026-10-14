import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Cake, CakeWeightOption } from '../types';
import { formatIndianCurrency, buildWhatsAppLink } from '../utils/whatsapp';
import { 
  ArrowLeft, 
  Home,
  Sparkles, 
  Clock, 
  Check, 
  AlertCircle, 
  Upload, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  Gift, 
  ShieldCheck, 
  ShoppingBag,
  Trash2,
  FileText,
  MessageCircle,
  Truck
} from 'lucide-react';

interface PlaceOrderViewProps {
  cakeId?: string;
}

const OCCASIONS = [
  'Birthday',
  'Wedding Reception',
  'Anniversary Milestone',
  'Engagement',
  'Baby Shower / Gender Reveal',
  'Farewell / Graduation',
  'Festival / Holiday',
  'Just Because / Dessert Party'
];

const COLOUR_THEMES = [
  'Bakery Signature (As Pictured)',
  'Pastel Blush Pink & Ivory',
  'Warm Cream & 24k Gold',
  'Rich Belgian Dark Chocolate',
  'Sage Botanical & Eucalyptus Green',
  'Lilac Mist & Lavender',
  'Custom Palette (Specified in Notes)'
];

const EXTRAS_CATALOG = [
  { id: 'ex-1', name: 'Sparkling Candle Pack (6 Pcs)', price: 90 },
  { id: 'ex-2', name: 'Golden Acrylic "Happy Birthday" Topper', price: 150 },
  { id: 'ex-3', name: 'Gourmet Wooden Cake Server & Knife Set', price: 120 },
  { id: 'ex-4', name: 'Handwritten Artisan Calligraphy Message Card', price: 80 }
];

const TIME_SLOTS = [
  'Morning Slot (10:00 AM - 01:00 PM)',
  'Afternoon Slot (01:00 PM - 05:00 PM)',
  'Evening Slot (05:00 PM - 08:30 PM)'
];

export const PlaceOrderView: React.FC<PlaceOrderViewProps> = ({ cakeId }) => {
  const { 
    cakes, 
    settings, 
    currentUser, 
    orderFormData, 
    setOrderFormData, 
    clearOrderFormData, 
    createDirectOrder, 
    submitEnquiry, 
    navigateTo, 
    goBack,
    setIsCartOpen,
    cartTotalCount
  } = useApp();

  // Find target cake
  const targetCakeId = cakeId || orderFormData.cakeId || cakes[0]?.id;
  const currentCake = cakes.find(c => c.id === targetCakeId) || cakes[0];

  const isShopOpen = settings.is_open !== false && settings.isOpen !== false;

  // Weight options
  const weightOptions: CakeWeightOption[] = currentCake?.weightOptions && currentCake.weightOptions.length > 0
    ? currentCake.weightOptions
    : [{ weight: '1.0 kg', price: 1500, description: 'Serves 6–8' }];

  // Initial form values from preserved orderFormData or defaults
  const [selectedWeightIdx, setSelectedWeightIdx] = useState<number>(() => {
    if (orderFormData.weight) {
      const idx = weightOptions.findIndex(w => w.weight === orderFormData.weight);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const [selectedFlavour, setSelectedFlavour] = useState<string>(() => {
    return orderFormData.flavour || currentCake?.flavours?.[0] || 'Artisan Vanilla Bean';
  });

  const [quantity, setQuantity] = useState<number>(orderFormData.quantity || 1);
  const [isEggless, setIsEggless] = useState<boolean>(orderFormData.isEggless ?? (currentCake?.isEgglessOption ?? true));
  const [cakeMessage, setCakeMessage] = useState<string>(orderFormData.cakeMessage || '');
  const [occasion, setOccasion] = useState<string>(orderFormData.occasion || OCCASIONS[0]);
  const [colourTheme, setColourTheme] = useState<string>(orderFormData.colourTheme || COLOUR_THEMES[0]);
  const [specialInstructions, setSpecialInstructions] = useState<string>(orderFormData.specialInstructions || '');
  const [privateRefImages, setPrivateRefImages] = useState<string[]>(orderFormData.privateReferenceImages || []);

  // Customer contact info
  const [customerName, setCustomerName] = useState<string>(orderFormData.customerName || currentUser.name || '');
  const [customerPhone, setCustomerPhone] = useState<string>(() => {
    if (orderFormData.customerPhone) return orderFormData.customerPhone;
    if (currentUser.phone) return currentUser.phone.replace(/\D/g, '').slice(-10);
    return '';
  });
  const [customerEmail, setCustomerEmail] = useState<string>(orderFormData.customerEmail || currentUser.email || '');

  // Recipient details (gifting)
  const [isGift, setIsGift] = useState<boolean>(orderFormData.isGift || false);
  const [recipientName, setRecipientName] = useState<string>(orderFormData.recipientName || '');
  const [recipientPhone, setRecipientPhone] = useState<string>(orderFormData.recipientPhone || '');

  // Fulfilment type & scheduling
  const [fulfilmentType, setFulfilmentType] = useState<'delivery' | 'pickup'>(orderFormData.fulfilmentType || 'delivery');
  
  // Calculate earliest selectable date based on cake leadTimeHours or shop minNoticeDays
  const minNoticeHours = Math.max(currentCake?.leadTimeHours || 24, (settings.minNoticeDays || 2) * 24);
  const minDateObj = new Date(Date.now() + minNoticeHours * 3600 * 1000);
  const minDateString = minDateObj.toISOString().split('T')[0];

  const [requiredDate, setRequiredDate] = useState<string>(orderFormData.requiredDate || minDateString);
  const [timeSlot, setTimeSlot] = useState<string>(orderFormData.timeSlot || TIME_SLOTS[1]);

  // Delivery address fields
  const [flatOrHouse, setFlatOrHouse] = useState<string>(orderFormData.flatOrHouse || '');
  const [streetAndLocality, setStreetAndLocality] = useState<string>(orderFormData.streetAndLocality || '');
  const [area, setArea] = useState<string>(orderFormData.area || '');
  const [city, setCity] = useState<string>(orderFormData.city || settings.city || 'Chennai');
  const [postalCode, setPostalCode] = useState<string>(orderFormData.postalCode || settings.postalCode || '');
  const [landmark, setLandmark] = useState<string>(orderFormData.landmark || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>(orderFormData.deliveryInstructions || '');

  // Extras
  const [selectedExtras, setSelectedExtras] = useState<string[]>(orderFormData.selectedExtras || []);

  // State management
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceabilityWarning, setServiceabilityWarning] = useState<string | null>(null);

  // Preserve form state changes to Context & SessionStorage
  useEffect(() => {
    setOrderFormData({
      cakeId: currentCake?.id,
      flavour: selectedFlavour,
      weight: weightOptions[selectedWeightIdx]?.weight,
      quantity,
      isEggless,
      cakeMessage,
      occasion,
      colourTheme,
      specialInstructions,
      privateReferenceImages: privateRefImages,
      customerName,
      customerPhone,
      customerEmail,
      isGift,
      recipientName,
      recipientPhone,
      fulfilmentType,
      requiredDate,
      timeSlot,
      flatOrHouse,
      streetAndLocality,
      area,
      city,
      postalCode,
      landmark,
      deliveryInstructions,
      selectedExtras
    });
  }, [
    currentCake?.id,
    selectedFlavour,
    selectedWeightIdx,
    quantity,
    isEggless,
    cakeMessage,
    occasion,
    colourTheme,
    specialInstructions,
    privateRefImages,
    customerName,
    customerPhone,
    customerEmail,
    isGift,
    recipientName,
    recipientPhone,
    fulfilmentType,
    requiredDate,
    timeSlot,
    flatOrHouse,
    streetAndLocality,
    area,
    city,
    postalCode,
    landmark,
    deliveryInstructions,
    selectedExtras,
    setOrderFormData,
    weightOptions
  ]);

  // Delivery check against owner-configured delivery terms
  useEffect(() => {
    if (fulfilmentType === 'delivery' && postalCode.trim()) {
      const cleanPin = postalCode.trim();
      if (cleanPin.length === 6) {
        if (settings.deliveryAreas && settings.deliveryAreas.includes('600') && !cleanPin.startsWith('600')) {
          setServiceabilityWarning(`Notice: PIN ${cleanPin} is outside our direct primary delivery zone (${settings.city || 'Chennai'}). Chilled van courier surcharge may apply.`);
        } else {
          setServiceabilityWarning(null);
        }
      }
    } else {
      setServiceabilityWarning(null);
    }
  }, [postalCode, fulfilmentType, settings.deliveryAreas, settings.city]);

  if (!currentCake) {
    return (
      <div className="py-20 px-4 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-[#C5A15A] mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">Cake Not Found</h2>
        <p className="mt-2 text-xs text-[#4B2E25]/70">Please select a cake from our artisanal gallery.</p>
        <button
          onClick={() => navigateTo('gallery')}
          className="mt-6 px-6 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] rounded-xl"
        >
          Browse Gallery
        </button>
      </div>
    );
  }

  const selectedWeightOpt = weightOptions[selectedWeightIdx] || weightOptions[0];
  const unitPrice = selectedWeightOpt.price || 0;
  const itemsSubtotal = unitPrice * quantity;

  // Extras total
  const extrasTotal = selectedExtras.reduce((sum, extId) => {
    const item = EXTRAS_CATALOG.find(e => e.id === extId);
    return sum + (item ? item.price : 0);
  }, 0);

  // Delivery fee calculation
  const freeThreshold = settings.freeDeliveryThreshold || 4000;
  const baseDeliveryCharge = settings.deliveryCharge || 150;
  const deliveryFee = fulfilmentType === 'delivery' 
    ? (itemsSubtotal >= freeThreshold ? 0 : baseDeliveryCharge) 
    : 0;

  const totalCalculated = itemsSubtotal + extrasTotal + deliveryFee;

  // Is this cake requiring a custom quote?
  const isCustomQuoteCake = currentCake.isPortfolioOnly || currentCake.category.toLowerCase().includes('custom') || currentCake.availability === 'made_to_order';

  const whatsappOrderDetails = `Hello ${settings.shopName || 'Cake Junction'}, I would like to order via WhatsApp:\n\n` +
    `🎂 *Cake Name:* ${currentCake.name}\n` +
    `🍰 *Selected Flavour:* ${selectedFlavour}\n` +
    `⚖️ *Size / Weight:* ${selectedWeightOpt.weight}\n` +
    `🔢 *Quantity:* ${quantity}\n` +
    `💰 *Displayed Total:* ${formatIndianCurrency(totalCalculated)} (${formatIndianCurrency(unitPrice)} each)\n` +
    `🎉 *Occasion:* ${occasion}\n` +
    `🎨 *Theme:* ${colourTheme}\n` +
    (isEggless ? `🌱 *Dietary:* 100% Eggless\n` : '') +
    (cakeMessage.trim() ? `✍️ *Piped Message:* "${cakeMessage.trim()}"\n` : '') +
    (selectedExtras.length > 0 ? `✨ *Extras:* ${selectedExtras.map(id => EXTRAS_CATALOG.find(e => e.id === id)?.name).filter(Boolean).join(', ')}\n` : '') +
    `🚚 *Fulfilment:* ${fulfilmentType.toUpperCase()} on ${requiredDate || 'Pending confirmation'}\n` +
    (customerName.trim() ? `👤 *Customer:* ${customerName.trim()}\n` : '') +
    (customerPhone.trim() ? `📞 *Phone:* ${customerPhone.trim()}\n` : '') +
    `\nPlease review availability and confirm order booking.`;

  const whatsappCheckoutUrl = buildWhatsAppLink(settings.whatsappNumber, whatsappOrderDetails);

  const handleExtraToggle = (extId: string) => {
    setSelectedExtras(prev => 
      prev.includes(extId) ? prev.filter(id => id !== extId) : [...prev, extId]
    );
  };

  const handleUploadReferenceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Reference photo must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPrivateRefImages(prev => [...prev, reader.result as string]);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (idx: number) => {
    setPrivateRefImages(prev => prev.filter((_, i) => i !== idx));
  };

  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      setErrorMsg('Please enter your full name.');
      return false;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Please provide a valid 10-digit mobile number.');
      return false;
    }
    if (!requiredDate) {
      setErrorMsg('Please choose your required event celebration date.');
      return false;
    }
    if (fulfilmentType === 'delivery') {
      if (!flatOrHouse.trim() || !streetAndLocality.trim()) {
        setErrorMsg('Please provide your complete delivery street and house/flat address.');
        return false;
      }
      if (!postalCode.trim() || postalCode.replace(/\D/g, '').length !== 6) {
        setErrorMsg('Please provide a valid 6-digit postal PIN code.');
        return false;
      }
    }
    if (isGift && (!recipientName.trim() || recipientPhone.replace(/\D/g, '').length < 10)) {
      setErrorMsg('Please provide recipient name and 10-digit phone number for the gift delivery.');
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isShopOpen) {
      const reopenMsg = settings.reopeningTimestamp
        ? ` Reopening scheduled for: ${new Date(settings.reopeningTimestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`
        : '';
      setErrorMsg(`${settings.closureMessage || 'Cake Junction is currently closed and not accepting new orders at this time.'}${reopenMsg}`);
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);

    const fullDeliveryAddress = fulfilmentType === 'delivery'
      ? `${flatOrHouse.trim()}, ${streetAndLocality.trim()}${area.trim() ? ', ' + area.trim() : ''}, ${city.trim()} - ${postalCode.trim()}${landmark.trim() ? ' (Landmark: ' + landmark.trim() + ')' : ''}`
      : undefined;

    const extrasSelectedObjects = EXTRAS_CATALOG.filter(e => selectedExtras.includes(e.id)).map(e => ({
      name: e.name,
      price: e.price
    }));

    if (isCustomQuoteCake) {
      // Submit as formal quotation enquiry
      const enq = submitEnquiry({
        cakeId: currentCake.id,
        cakeName: currentCake.name,
        customerName: customerName.trim(),
        phone: customerPhone.trim().startsWith('+91') ? customerPhone.trim() : '+91 ' + customerPhone.replace(/\D/g, '').slice(-10),
        occasion,
        requiredDate,
        preferredTime: timeSlot,
        quantity,
        flavour: selectedFlavour,
        selectedWeight: selectedWeightOpt.weight,
        selectedPrice: unitPrice,
        isEggless,
        cakeMessage: cakeMessage.trim() || undefined,
        colourTheme,
        budgetInr: totalCalculated,
        deliveryOrPickup: fulfilmentType,
        address: fullDeliveryAddress,
        flatOrHouse,
        streetAndLocality,
        city,
        postalCode,
        landmark,
        deliveryInstructions,
        referenceImageUrls: privateRefImages,
        message: `Custom Quote Request for ${currentCake.name}. Flavour: ${selectedFlavour}, Theme: ${colourTheme}. Notes: ${specialInstructions || 'None'}`
      });

      clearOrderFormData();
      setIsSubmitting(false);
      // Navigate to order details screen directly
      navigateTo('orders');
    } else {
      // Standard fixed-price cake booking
      try {
        const newOrder = createDirectOrder({
          cakeId: currentCake.id,
          cakeName: currentCake.name,
          cakeThumbnail: currentCake.images[0]?.url,
          flavour: selectedFlavour,
          weight: selectedWeightOpt.weight,
          quantity,
          unitPrice,
          totalAmount: totalCalculated,
          depositAmount: Math.round(totalCalculated * 0.5),
          verifiedPaidAmount: 0,
          outstandingBalance: totalCalculated,
          orderStatus: 'confirmed',
          fulfilmentStage: 'confirmed',
          paymentStatus: 'awaiting_payment',
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim().startsWith('+91') ? customerPhone.trim() : '+91 ' + customerPhone.replace(/\D/g, '').slice(-10),
          customerEmail: customerEmail.trim() || undefined,
          isEggless,
          cakeMessage: cakeMessage.trim() || undefined,
          occasion,
          colourTheme,
          specialInstructions: specialInstructions.trim() || undefined,
          privateReferenceImages: privateRefImages,
          isGift,
          recipientName: isGift ? recipientName.trim() : undefined,
          recipientPhone: isGift ? recipientPhone.trim() : undefined,
          fulfilmentDate: requiredDate,
          fulfilmentTimeSlot: timeSlot,
          deliveryOrPickup: fulfilmentType,
          deliveryAddress: fullDeliveryAddress,
          addressDetails: fulfilmentType === 'delivery' ? {
            flatOrHouse,
            streetAndLocality,
            area,
            city,
            postalCode,
            landmark,
            deliveryInstructions
          } : undefined,
          deliveryFee,
          extras: extrasSelectedObjects,
          latestUpdateMessage: 'Order Registered. Please complete your advance deposit via UPI to begin baking.'
        });

        clearOrderFormData();
        setIsSubmitting(false);
        // Navigate directly to the new order details screen!
        navigateTo('order-detail', { orderId: newOrder.id });
      } catch (err: any) {
        setIsSubmitting(false);
        setErrorMsg(err.message || 'The shop is currently closed. We are unable to accept new orders at this time.');
      }
    }
  };

  const primaryPhoto = currentCake.images.find(img => img.isPrimary) || currentCake.images[0] || {
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    alt: currentCake.name
  };

  return (
    <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in">
      
      {/* Top Breadcrumb & Navigation Controls */}
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B2E25]/80 hover:text-[#4B2E25] bg-white px-3.5 py-2 rounded-xl border border-[#E8D5C8] shadow-2xs transition-colors"
            title="Return to Home"
          >
            <Home className="w-4 h-4 text-[#C5A15A]" />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => goBack('gallery')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#4B2E25]/80 hover:text-[#4B2E25] bg-white px-3.5 py-2 rounded-xl border border-[#E8D5C8] shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#C5A15A]" />
            <span>Back to Cakes</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4B2E25]/80 hover:text-[#4B2E25] bg-white px-3.5 py-2 rounded-xl border border-[#E8D5C8] shadow-2xs transition-colors"
            title="Open Shopping Cart"
          >
            <ShoppingBag className="w-4 h-4 text-[#C5A15A]" />
            <span>Cart</span>
            {cartTotalCount > 0 && (
              <span className="font-mono text-[#C5A15A] font-bold">({cartTotalCount})</span>
            )}
          </button>
        </div>

        <span className="text-xs text-[#4B2E25]/60 font-medium hidden sm:inline">
          {isCustomQuoteCake ? 'Step 1 of 2 · Custom Cake Quotation Request' : 'Step 1 of 2 · Place Handcrafted Cake Order'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Form Fields (7 Cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Selected Cake Summary Header */}
          {!isShopOpen && (
            <div className="p-5 bg-amber-50/90 rounded-3xl border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-amber-200/90 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-800" />
              </div>
              <div className="flex-1 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping inline-block" />
                  <h4 className="font-bold text-amber-950 text-sm">Shop Is Currently Closed For Orders</h4>
                </div>
                <p className="text-amber-900/90 leading-relaxed">
                  {settings.closureMessage || 'Cake Junction is currently closed and not accepting new orders at this time.'}
                </p>
                {settings.reopeningTimestamp && (
                  <p className="text-amber-950 font-semibold pt-0.5">
                    Reopening scheduled for: {new Date(settings.reopeningTimestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img 
              src={primaryPhoto.url} 
              alt={primaryPhoto.alt || currentCake.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border border-[#E8D5C8]/80 shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-[#4B2E25]/60 mb-1">
                <span className="capitalize">{currentCake.category}</span>
                <span>·</span>
                <span className="text-emerald-800 font-semibold">{currentCake.isEgglessOption ? 'Eggless Option Available' : 'Regular Bake'}</span>
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-[#4B2E25] truncate">
                {currentCake.name}
              </h1>
              <p className="text-xs text-[#4B2E25]/75 line-clamp-1 mt-0.5">
                {currentCake.shortDescription || currentCake.description}
              </p>
            </div>
          </div>

          {/* Section 2: Size, Flavour & Quantity */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#4B2E25]">1. Weight, Flavour & Dietary</h2>
              <p className="text-xs text-[#4B2E25]/70 mt-0.5">Select your preferred tiered size and signature filling.</p>
            </div>

            {/* Weight Options Grid */}
            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-2">Weight / Serving Size</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {weightOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedWeightIdx(idx)}
                    className={`p-3 text-left rounded-2xl border transition-all ${
                      selectedWeightIdx === idx
                        ? 'bg-[#FFF8EF] border-[#C5A15A] ring-2 ring-[#C5A15A]/30 shadow-2xs'
                        : 'bg-white border-[#E8D5C8]/80 hover:border-[#C5A15A]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-[#4B2E25]">{opt.weight}</span>
                      {selectedWeightIdx === idx && <Check className="w-4 h-4 text-[#C5A15A]" />}
                    </div>
                    <span className="block text-xs font-bold text-[#C5A15A] mt-1">{formatIndianCurrency(opt.price)}</span>
                    {opt.description && <span className="block text-[11px] text-[#4B2E25]/60 mt-0.5">{opt.description}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Flavour Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-2">Signature Flavour</label>
              <select
                value={selectedFlavour}
                onChange={(e) => setSelectedFlavour(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] font-medium focus:ring-2 focus:ring-[#C5A15A] focus:outline-hidden"
              >
                {currentCake.flavours.map((flv, idx) => (
                  <option key={idx} value={flv}>{flv}</option>
                ))}
              </select>
            </div>

            {/* Quantity and Eggless toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E8D5C8]/60">
              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 rounded-xl border border-[#E8D5C8] bg-white text-[#4B2E25] font-bold text-sm flex items-center justify-center hover:bg-[#FFF8EF]"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-sm text-[#4B2E25] w-6 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 rounded-xl border border-[#E8D5C8] bg-white text-[#4B2E25] font-bold text-sm flex items-center justify-center hover:bg-[#FFF8EF]"
                  >
                    +
                  </button>
                </div>
              </div>

              {currentCake.isEgglessOption && (
                <div>
                  <label className="block text-xs font-semibold text-[#4B2E25] mb-2">Dietary Preparation</label>
                  <label className="flex items-center gap-2.5 p-2 bg-[#FFF8EF]/40 rounded-xl border border-[#E8D5C8] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEggless}
                      onChange={(e) => setIsEggless(e.target.checked)}
                      className="w-4 h-4 text-[#C5A15A] rounded-sm focus:ring-[#C5A15A]"
                    />
                    <span className="text-xs text-[#4B2E25] font-medium">100% Pure Eggless Bake</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Customization, Message & Private Reference Photo */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#4B2E25]">2. Cake Message & Design Theme</h2>
              <p className="text-xs text-[#4B2E25]/70 mt-0.5">Personalize piping messages and upload optional private references.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">Occasion</label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] font-medium focus:ring-2 focus:ring-[#C5A15A] focus:outline-hidden"
                >
                  {OCCASIONS.map((occ, idx) => (
                    <option key={idx} value={occ}>{occ}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">Colour Palette</label>
                <select
                  value={colourTheme}
                  onChange={(e) => setColourTheme(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] font-medium focus:ring-2 focus:ring-[#C5A15A] focus:outline-hidden"
                >
                  {COLOUR_THEMES.map((theme, idx) => (
                    <option key={idx} value={theme}>{theme}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">
                Hand-Piped Cake Message <span className="text-[#4B2E25]/50 font-normal">(Optional, max 45 chars)</span>
              </label>
              <input
                type="text"
                maxLength={45}
                value={cakeMessage}
                onChange={(e) => setCakeMessage(e.target.value)}
                placeholder="e.g. Happy 25th Anniversary Mom & Dad!"
                className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] font-medium placeholder:text-[#4B2E25]/40 focus:ring-2 focus:ring-[#C5A15A] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">
                Special Chef Instructions <span className="text-[#4B2E25]/50 font-normal">(Allergens, colour tweaks)</span>
              </label>
              <textarea
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Please reduce sugar slightly; keep flowers blush and avoid nuts."
                className="w-full px-4 py-2 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] placeholder:text-[#4B2E25]/40 focus:ring-2 focus:ring-[#C5A15A] focus:outline-hidden"
              />
            </div>

            {/* Private Reference Image Upload */}
            <div className="pt-2 border-t border-[#E8D5C8]/60">
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">
                Upload Private Reference Photo <span className="text-[#4B2E25]/50 font-normal">(Kept strictly private)</span>
              </label>
              <p className="text-[11px] text-[#4B2E25]/60 mb-3">
                Have a Pinterest inspiration or invitation palette? Our pastry artist will follow it.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl cursor-pointer hover:bg-white transition-colors">
                  <Upload className="w-4 h-4 text-[#C5A15A]" />
                  <span>Choose Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadReferenceImage}
                    className="hidden"
                  />
                </label>

                {privateRefImages.map((imgUrl, idx) => (
                  <div key={idx} className="relative w-14 h-14 rounded-xl border border-[#E8D5C8] overflow-hidden group">
                    <img src={imgUrl} alt="Private reference" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Date, Time & Fulfilment */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#4B2E25]">3. Date, Time & Delivery</h2>
              <p className="text-xs text-[#4B2E25]/70 mt-0.5">We bake fresh to order. Please observe our advance preparation window.</p>
            </div>

            {/* Fulfilment Toggle: Delivery vs Pickup */}
            <div className="flex bg-[#FFF8EF] p-1.5 rounded-2xl border border-[#E8D5C8]">
              <button
                type="button"
                onClick={() => setFulfilmentType('delivery')}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  fulfilmentType === 'delivery'
                    ? 'bg-[#4B2E25] text-white shadow-xs'
                    : 'text-[#4B2E25]/70 hover:text-[#4B2E25]'
                }`}
              >
                <Truck className="w-4 h-4 text-[#C5A15A]" />
                <span>Doorstep Delivery (Chilled Van)</span>
              </button>

              <button
                type="button"
                onClick={() => setFulfilmentType('pickup')}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  fulfilmentType === 'pickup'
                    ? 'bg-[#4B2E25] text-white shadow-xs'
                    : 'text-[#4B2E25]/70 hover:text-[#4B2E25]'
                }`}
              >
                <MapPin className="w-4 h-4 text-[#C5A15A]" />
                <span>Bakery Pickup (Free)</span>
              </button>
            </div>

            {/* Date and Time Slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">Required Event Date</label>
                <input
                  type="date"
                  min={minDateString}
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] font-medium focus:ring-2 focus:ring-[#C5A15A] focus:outline-hidden"
                  required
                />
                <span className="block text-[11px] text-[#4B2E25]/60 mt-1">Earliest available: {minDateString}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">Preferred Time Window</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] font-medium focus:ring-2 focus:ring-[#C5A15A] focus:outline-hidden"
                >
                  {TIME_SLOTS.map((slot, idx) => (
                    <option key={idx} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Delivery Address fields (Only if Delivery selected) */}
            {fulfilmentType === 'delivery' && (
              <div className="p-4 sm:p-5 bg-[#FFF8EF]/40 rounded-2xl border border-[#E8D5C8] space-y-4">
                <span className="text-xs font-bold text-[#4B2E25] uppercase tracking-wider block">
                  Delivery Destination Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#4B2E25] mb-1">House / Flat / Door Number *</label>
                    <input
                      type="text"
                      value={flatOrHouse}
                      onChange={(e) => setFlatOrHouse(e.target.value)}
                      placeholder="e.g. Villa 12, Tower B"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-[#E8D5C8] text-xs text-[#4B2E25]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4B2E25] mb-1">Street / Apartment Name *</label>
                    <input
                      type="text"
                      value={streetAndLocality}
                      onChange={(e) => setStreetAndLocality(e.target.value)}
                      placeholder="e.g. Blossom Avenue, 2nd Cross"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-[#E8D5C8] text-xs text-[#4B2E25]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4B2E25] mb-1">Area / Locality</label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Adyar / ECR"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-[#E8D5C8] text-xs text-[#4B2E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4B2E25] mb-1">PIN Code *</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 600028"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-[#E8D5C8] text-xs text-[#4B2E25]"
                      required
                    />
                  </div>
                </div>

                {serviceabilityWarning && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{serviceabilityWarning}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#4B2E25] mb-1">Landmark (Optional)</label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Opposite Park gate"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-[#E8D5C8] text-xs text-[#4B2E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#4B2E25] mb-1">Driver Instructions</label>
                    <input
                      type="text"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      placeholder="e.g. Call before arrival, keep level"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-[#E8D5C8] text-xs text-[#4B2E25]"
                    />
                  </div>
                </div>
              </div>
            )}

            {fulfilmentType === 'pickup' && (
              <div className="p-4 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] text-xs text-[#4B2E25]/85 space-y-1">
                <strong className="block text-[#4B2E25]">Atelier Pickup Point:</strong>
                <p>{settings.address || 'Shop 4, Rosewood Pavilion, Blossom Avenue, Chennai'}</p>
                <p className="text-[11px] text-[#4B2E25]/60 mt-1">{settings.pickupInstructions || 'Free pickup between 11 AM - 7 PM.'}</p>
              </div>
            )}
          </div>

          {/* Section 5: Customer Contact & Recipient */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-6">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#4B2E25]">4. Customer Contact Information</h2>
              <p className="text-xs text-[#4B2E25]/70 mt-0.5">Used exclusively to send order updates and delivery notifications.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1">Your Full Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Vasanth Kumar"
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1">Mobile Number (10 digits) *</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9876543210"
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1">
                Email Address <span className="text-[#4B2E25]/50 font-normal">(Optional, for invoice copy)</span>
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. yourname@example.com"
                className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
              />
            </div>

            {/* Gift option */}
            <div className="pt-2 border-t border-[#E8D5C8]/60">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGift}
                  onChange={(e) => setIsGift(e.target.checked)}
                  className="w-4 h-4 text-[#C5A15A] rounded-sm focus:ring-[#C5A15A]"
                />
                <span className="text-xs font-medium text-[#4B2E25] flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-[#C5A15A]" />
                  This is a surprise gift / ordering for someone else
                </span>
              </label>

              {isGift && (
                <div className="mt-4 p-4 bg-[#FFF8EF]/40 rounded-2xl border border-[#E8D5C8] grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-medium text-[#4B2E25] mb-1">Recipient Name *</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Ananya Roy"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-[#E8D5C8] text-xs text-[#4B2E25]"
                      required={isGift}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#4B2E25] mb-1">Recipient Phone *</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 9444123456"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-[#E8D5C8] text-xs text-[#4B2E25]"
                      required={isGift}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Optional Celebration Extras */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-xs space-y-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#4B2E25]">5. Celebration Accessories & Extras</h2>
              <p className="text-xs text-[#4B2E25]/70 mt-0.5">Complement your centerpiece with artisanal candle sets and toppers.</p>
            </div>

            <div className="space-y-2.5">
              {EXTRAS_CATALOG.map(ext => (
                <label
                  key={ext.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                    selectedExtras.includes(ext.id)
                      ? 'bg-[#FFF8EF] border-[#C5A15A]'
                      : 'bg-white border-[#E8D5C8]/70 hover:bg-[#FFF8EF]/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedExtras.includes(ext.id)}
                      onChange={() => handleExtraToggle(ext.id)}
                      className="w-4 h-4 text-[#C5A15A] rounded-sm focus:ring-[#C5A15A]"
                    />
                    <span className="text-xs font-medium text-[#4B2E25]">{ext.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#C5A15A]">+{formatIndianCurrency(ext.price)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mobile Submit Button (Visible on small screens) */}
          <div className="lg:hidden space-y-2.5">
            <button
              type="submit"
              disabled={!isShopOpen || isSubmitting}
              className={`w-full py-4 px-6 text-sm font-semibold rounded-2xl transition-all shadow-md active:scale-98 ${
                !isShopOpen
                  ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed border border-neutral-300'
                  : 'text-white bg-[#4B2E25] hover:bg-[#38221B]'
              }`}
            >
              {!isShopOpen 
                ? 'Orders Paused — Shop Currently Closed' 
                : (isCustomQuoteCake ? 'Submit Custom Quote Request' : `Place Order · ${formatIndianCurrency(totalCalculated)}`)}
            </button>

            {whatsappCheckoutUrl && (
              <a
                href={whatsappCheckoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-6 text-xs font-semibold rounded-2xl transition-all shadow-xs border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>Order via WhatsApp ({formatIndianCurrency(totalCalculated)})</span>
              </a>
            )}

            <p className="text-[10px] text-[#4B2E25]/60 text-center px-2">
              Note: Clicking WhatsApp opens your chat with +91 8825648728 with your customized order pre-filled. You review and send the message yourself.
            </p>
          </div>

        </form>

        {/* Right Column: Order Review & Policy Summary (5 Cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-sm space-y-6">
            
            <div className="pb-4 border-b border-[#E8D5C8]/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A] block">
                Order Review Summary
              </span>
              <h3 className="font-serif text-xl font-bold text-[#4B2E25] mt-1">
                {currentCake.name}
              </h3>
              <span className="text-xs text-[#4B2E25]/70 block mt-0.5">
                {selectedWeightOpt.weight} · {selectedFlavour} · Qty {quantity}
              </span>
            </div>

            {/* Customization Details */}
            <div className="space-y-2 text-xs text-[#4B2E25]/85">
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/40">
                <span className="text-[#4B2E25]/60">Occasion:</span>
                <span className="font-medium text-[#4B2E25]">{occasion}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/40">
                <span className="text-[#4B2E25]/60">Theme:</span>
                <span className="font-medium text-[#4B2E25]">{colourTheme}</span>
              </div>
              {cakeMessage && (
                <div className="flex justify-between py-1 border-b border-[#E8D5C8]/40">
                  <span className="text-[#4B2E25]/60">Message:</span>
                  <span className="font-medium text-[#4B2E25] truncate max-w-[200px]">"{cakeMessage}"</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/40">
                <span className="text-[#4B2E25]/60">Dietary:</span>
                <span className="font-medium text-[#4B2E25]">{isEggless ? '100% Eggless' : 'Regular Sponge'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/40">
                <span className="text-[#4B2E25]/60">Fulfilment:</span>
                <span className="font-medium text-[#4B2E25] capitalize">{fulfilmentType} ({requiredDate})</span>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="pt-4 border-t border-[#E8D5C8]/80 space-y-2 text-xs">
              <div className="flex justify-between text-[#4B2E25]/80">
                <span>Cake Base ({selectedWeightOpt.weight} x {quantity})</span>
                <span>{formatIndianCurrency(itemsSubtotal)}</span>
              </div>

              {extrasTotal > 0 && (
                <div className="flex justify-between text-[#4B2E25]/80">
                  <span>Accessories & Extras ({selectedExtras.length})</span>
                  <span>+{formatIndianCurrency(extrasTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-[#4B2E25]/80">
                <span>
                  Delivery Charges 
                  {fulfilmentType === 'delivery' && itemsSubtotal >= freeThreshold && (
                    <span className="text-emerald-700 font-semibold ml-1">(Free above ₹{freeThreshold})</span>
                  )}
                </span>
                <span>
                  {fulfilmentType === 'delivery' 
                    ? (deliveryFee === 0 ? 'FREE' : formatIndianCurrency(deliveryFee)) 
                    : '₹0 (Self Pickup)'}
                </span>
              </div>

              {/* Total Calculation */}
              <div className="pt-3 border-t border-[#E8D5C8] flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-bold text-[#4B2E25] block">Total Amount</span>
                  <span className="text-[11px] text-[#4B2E25]/60">50% Advance deposit required to bake</span>
                </div>
                <div className="text-right">
                  <span className="font-serif text-2xl font-bold text-[#4B2E25]">
                    {formatIndianCurrency(totalCalculated)}
                  </span>
                </div>
              </div>
            </div>

            {/* Policy Notes */}
            <div className="p-3.5 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8]/80 space-y-2 text-[11px] text-[#4B2E25]/80">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C5A15A] shrink-0 mt-0.5" />
                <p>
                  <strong>Freshly Baked Guarantee:</strong> Our pastry atelier never freezes sponges. Every tier is baked on the scheduled morning.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#C5A15A] shrink-0 mt-0.5" />
                <p>
                  <strong>Cancellations:</strong> Cancellations made &gt;48 hours prior to fulfilment receive 80% store credit or refund.
                </p>
              </div>
            </div>

            {/* Desktop Submission Button */}
            <div className="space-y-2.5 hidden lg:block">
              <button
                onClick={handleSubmit}
                disabled={!isShopOpen || isSubmitting}
                className={`w-full py-4 px-6 text-xs font-semibold rounded-2xl transition-all shadow-md active:scale-98 ${
                  !isShopOpen
                    ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed border border-neutral-300'
                    : 'text-white bg-[#4B2E25] hover:bg-[#38221B]'
                }`}
              >
                {!isShopOpen 
                  ? 'Orders Paused — Shop Currently Closed' 
                  : (isCustomQuoteCake ? 'Submit Custom Quote Request' : `Confirm Order & Book Slot (${formatIndianCurrency(totalCalculated)})`)}
              </button>

              {whatsappCheckoutUrl && (
                <a
                  href={whatsappCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-6 text-xs font-semibold rounded-2xl transition-all shadow-xs border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-700" />
                  <span>Order via WhatsApp ({formatIndianCurrency(totalCalculated)})</span>
                </a>
              )}

              <p className="text-[10px] text-[#4B2E25]/60 text-center">
                Note: Clicking WhatsApp opens chat with +91 8825648728 with your exact cake selection prefilled. You review and send the message yourself.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
