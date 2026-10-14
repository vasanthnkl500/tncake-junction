import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Cake, CakeWeightOption } from '../types';
import { formatIndianCurrency, buildWhatsAppLink } from '../utils/whatsapp';
import { 
  X, 
  Home,
  ShoppingBag,
  Plus,
  Minus,
  MessageCircle, 
  Clock, 
  AlertCircle, 
  Check, 
  Share2,
  Heart,
  Maximize2,
  Send,
  Upload,
  Calendar,
  CheckCircle2,
  MapPin,
  Sparkles
} from 'lucide-react';

interface CakeDetailModalProps {
  cake: Cake | null;
  onClose: () => void;
  onOpenCustomEnquiry: () => void;
  onSelectRelatedCake: (related: Cake) => void;
}

export const CakeDetailModal: React.FC<CakeDetailModalProps> = ({
  cake,
  onClose,
  onOpenCustomEnquiry,
  onSelectRelatedCake
}) => {
  const { 
    settings, 
    cakes, 
    t, 
    isWishlisted, 
    toggleWishlist, 
    submitEnquiry, 
    navigateTo,
    addToCart,
    setIsCartOpen,
    cartTotalCount
  } = useApp();
  
  // Gallery navigation states
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [selectedWeightIdx, setSelectedWeightIdx] = useState(0);
  const [selectedFlavour, setSelectedFlavour] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Embedded Direct Order Enquiry Form states
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [isEggless, setIsEggless] = useState(true);
  const [cakeMessage, setCakeMessage] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('Afternoon (2 PM - 5 PM)');
  const [deliveryOrPickup, setDeliveryOrPickup] = useState<'delivery' | 'pickup'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Delivery address granular fields
  const [flatOrHouse, setFlatOrHouse] = useState('');
  const [streetAndLocality, setStreetAndLocality] = useState('');
  const [city, setCity] = useState(settings.city || 'Chennai');
  const [postalCode, setPostalCode] = useState(settings.postalCode || '');
  const [landmark, setLandmark] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [refPhotos, setRefPhotos] = useState<string[]>([]);

  // Confirmation state
  const [submittedEnquiryRef, setSubmittedEnquiryRef] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!cake) return null;

  const currentWeightOpt: CakeWeightOption = cake.weightOptions[selectedWeightIdx] || cake.weightOptions[0] || { weight: '1.0 kg', price: 1500 };
  const baseItemPrice = currentWeightOpt.price || 0;
  const deliveryFee = deliveryOrPickup === 'delivery' ? (settings.deliveryCharge || 150) : 0;
  const estimatedTotal = (baseItemPrice * orderQuantity) + deliveryFee;

  const activeImage = cake.images[activePhotoIdx] || cake.images[0] || {
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    alt: cake.name
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `?cake=${cake.slug}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRefPhotos(prev => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitOrderEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim() || !customerPhone.trim() || !requiredDate) {
      setErrorMsg('Please provide your name, mobile number, and required event date.');
      return;
    }

    if (deliveryOrPickup === 'delivery' && (!flatOrHouse.trim() || !streetAndLocality.trim())) {
      setErrorMsg('Please provide your complete delivery address (flat/house no. and street).');
      return;
    }

    const fullDeliveryAddress = deliveryOrPickup === 'delivery'
      ? `${flatOrHouse}, ${streetAndLocality}, ${city} ${postalCode ? '- ' + postalCode : ''}${landmark ? ' (Landmark: ' + landmark + ')' : ''}`
      : undefined;

    const created = submitEnquiry({
      cakeId: cake.id,
      cakeName: cake.name,
      customerName,
      phone: customerPhone,
      requiredDate,
      preferredTime,
      quantity: orderQuantity,
      flavour: selectedFlavour || cake.flavours[0] || 'Signature Sponge',
      selectedWeight: currentWeightOpt.weight,
      selectedPrice: baseItemPrice,
      isEggless,
      cakeMessage: cakeMessage.trim() || undefined,
      budgetInr: estimatedTotal,
      deliveryOrPickup,
      address: fullDeliveryAddress,
      flatOrHouse,
      streetAndLocality,
      city,
      postalCode,
      landmark,
      deliveryInstructions: deliveryNotes,
      referenceImageUrls: refPhotos,
      message: `Direct Cake Order for "${cake.name}" (${currentWeightOpt.weight} x ${orderQuantity}). Msg: "${cakeMessage || 'None'}". Preferred Time: ${preferredTime}. ${deliveryNotes}`
    });

    setSubmittedEnquiryRef(created.referenceNumber);
  };

  const displayedPrice = formatIndianCurrency(currentWeightOpt.price * orderQuantity);
  const directWhatsAppMessage = `Hello ${settings.shopName || 'Cake Junction'}, I would like to order this cake:\n\n` +
    `🎂 *Cake Name:* ${cake.name}\n` +
    `🍰 *Selected Flavour:* ${selectedFlavour || cake.flavours[0] || 'Signature Sponge'}\n` +
    `⚖️ *Size / Weight:* ${currentWeightOpt?.weight}\n` +
    `🔢 *Quantity:* ${orderQuantity}\n` +
    `💰 *Displayed Price:* ${displayedPrice} (${formatIndianCurrency(currentWeightOpt.price)} each)\n` +
    (isEggless ? `🌱 *Dietary Preference:* 100% Eggless\n` : '') +
    (cakeMessage.trim() ? `✍️ *Piped Message:* "${cakeMessage.trim()}"\n` : '') +
    (requiredDate ? `📅 *Needed Date:* ${requiredDate}\n` : '') +
    `\nPlease verify baker availability and booking confirmation.`;

  const whatsappDirectUrl = buildWhatsAppLink(settings.whatsappNumber, directWhatsAppMessage);

  const whatsappSubmittedUrl = submittedEnquiryRef
    ? buildWhatsAppLink(
        settings.whatsappNumber,
        `Hello ${settings.shopName}, I have placed an order enquiry for *${cake.name}*!\n` +
        `• Ref: *${submittedEnquiryRef}*\n` +
        `• Weight: ${currentWeightOpt.weight} (${orderQuantity} qty)\n` +
        `• Date: ${requiredDate}\n` +
        `• Total Estimate: ₹${estimatedTotal}\n` +
        `Please confirm baker availability.`
      )
    : null;

  const wishlisted = isWishlisted(cake.id);
  const relatedCakes = cakes.filter(c => c.isPublished && c.id !== cake.id && c.category === cake.category).slice(0, 3);

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
        <div 
          className="relative bg-[#FFF8EF] rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-[#E8D5C8] shadow-2xl transition-all animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Action Controls: Home, Cart, Close */}
          <div className="sticky top-4 right-4 float-right z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-full border border-[#E8D5C8] shadow-xs">
            <button
              onClick={() => {
                onClose();
                navigateTo('home');
              }}
              className="p-1.5 text-[#4B2E25]/70 hover:text-[#4B2E25] hover:bg-[#FFF8EF] rounded-full transition-colors"
              title="Return to Homepage"
              aria-label="Return to Homepage"
            >
              <Home className="w-4 h-4 text-[#C5A15A]" />
            </button>

            <button
              onClick={() => {
                onClose();
                setIsCartOpen(true);
              }}
              className="relative p-1.5 text-[#4B2E25]/70 hover:text-[#4B2E25] hover:bg-[#FFF8EF] rounded-full transition-colors"
              title="Open Shopping Cart"
              aria-label={`Open Cart (${cartTotalCount} items)`}
            >
              <ShoppingBag className="w-4 h-4 text-[#4B2E25]" />
              {cartTotalCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 rounded-full bg-[#4B2E25] text-white text-[9px] font-mono font-bold flex items-center justify-center leading-none">
                  {cartTotalCount}
                </span>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#4B2E25]/70 hover:text-[#4B2E25] hover:bg-[#FFF8EF] rounded-full transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {submittedEnquiryRef ? (
            /* Confirmation screen */
            <div className="p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h2 className="font-serif text-3xl font-bold text-[#4B2E25]">
                Order Enquiry Received!
              </h2>

              <div className="p-4 bg-white rounded-2xl border border-[#E8D5C8] inline-block text-center">
                <span className="text-[11px] uppercase font-semibold text-[#4B2E25]/60 tracking-wider">
                  Enquiry Reference
                </span>
                <p className="font-mono text-2xl font-bold text-[#4B2E25] mt-0.5">
                  {submittedEnquiryRef}
                </p>
              </div>

              <div className="text-left bg-amber-50 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1">
                <strong>Next Steps:</strong>
                <p>
                  This submission is an enquiry, not an automatically confirmed order. Our head chef will review your date ({requiredDate}) and cake specifications before issuing an official quote or UPI payment request.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                {whatsappSubmittedUrl && (
                  <a
                    href={whatsappSubmittedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send Order to WhatsApp</span>
                  </a>
                )}

                <button
                  onClick={onClose}
                  className="px-5 py-3 text-xs font-medium text-[#4B2E25] bg-white border border-[#E8D5C8] rounded-xl hover:bg-[#F4D8D8]/30"
                >
                  Return to Menu
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2">
              
              {/* Left Column: Visual Gallery & Related */}
              <div className="p-6 sm:p-8 flex flex-col justify-between bg-white border-b md:border-b-0 md:border-r border-[#E8D5C8]/80">
                <div>
                  <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-[#F4D8D8]/20 border border-[#E8D5C8]">
                    <img
                      src={activeImage.url}
                      alt={activeImage.alt || cake.name}
                      className="w-full h-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => setFullScreenImage(activeImage.url)}
                      className="absolute bottom-3 right-3 p-2 bg-white/90 hover:bg-white rounded-xl shadow-xs text-[#4B2E25]"
                      title="View Full Resolution"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>

                    {cake.isEgglessOption && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-xs rounded-full border border-emerald-600/30 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        {t.eggless_available}
                      </div>
                    )}
                  </div>

                  {/* Multi-photo thumbnails */}
                  {cake.images && cake.images.length > 1 && (
                    <div className="flex gap-2.5 mt-4 overflow-x-auto pb-1">
                      {cake.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePhotoIdx(idx)}
                          className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                            activePhotoIdx === idx ? 'border-[#4B2E25] ring-2 ring-[#C5A15A]' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img.url} alt={img.alt || 'View'} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Specifications and details */}
                  {cake.specifications && cake.specifications.length > 0 && (
                    <div className="mt-5 p-3.5 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] text-xs space-y-1.5">
                      <span className="font-semibold text-[#4B2E25] uppercase tracking-wider text-[10px] block mb-1">
                        Chef Specifications
                      </span>
                      {cake.specifications.map(s => (
                        <div key={s.id} className="flex justify-between text-[#4B2E25]/80">
                          <span className="text-[#4B2E25]/60">{s.label}:</span>
                          <span className="font-medium text-right">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Related cakes */}
                {relatedCakes.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[#E8D5C8]/60">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4B2E25]/60 block mb-2">
                      Related Creations
                    </span>
                    <div className="flex gap-2.5">
                      {relatedCakes.map(rel => (
                        <div
                          key={rel.id}
                          onClick={() => {
                            onSelectRelatedCake(rel);
                            setActivePhotoIdx(0);
                            setIsOrderFormOpen(false);
                          }}
                          className="flex-1 cursor-pointer bg-[#FFF8EF] p-2 rounded-xl border border-[#E8D5C8] hover:border-[#4B2E25] transition-all"
                        >
                          <img 
                            src={rel.images[0]?.url} 
                            alt={rel.name} 
                            className="w-full h-12 object-cover rounded-lg mb-1" 
                          />
                          <span className="text-[10px] font-semibold text-[#4B2E25] block truncate">
                            {rel.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Dynamic Price Selection & Complete Order Form */}
              <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#4B2E25]/70 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span>{cake.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{cake.availability.replace('_', ' ')}</span>
                    </div>

                    <button
                      onClick={() => toggleWishlist(cake.id)}
                      className="flex items-center gap-1 text-xs text-[#4B2E25]/75 hover:text-red-600 transition-colors"
                    >
                      <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-red-600 text-red-600' : ''}`} />
                      <span>{wishlisted ? 'Saved' : 'Wishlist'}</span>
                    </button>
                  </div>

                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#4B2E25] leading-snug">
                    {cake.name}
                  </h2>

                  <p className="mt-2 text-xs sm:text-sm text-[#4B2E25]/80 leading-relaxed">
                    {cake.description}
                  </p>

                  {/* Multiple Weight & Price Options Selector */}
                  {cake.weightOptions && cake.weightOptions.length > 0 && (
                    <div className="mt-5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-2">
                        Select Weight Option
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {cake.weightOptions.map((opt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedWeightIdx(idx)}
                            className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                              selectedWeightIdx === idx
                                ? 'bg-[#4B2E25] text-white border-[#4B2E25] shadow-xs'
                                : 'bg-white text-[#4B2E25] border-[#E8D5C8] hover:bg-[#F4D8D8]/30'
                            }`}
                          >
                            <span className="block font-bold">{opt.weight}</span>
                            <span className="font-mono text-[11px] block mt-0.5">
                              {formatIndianCurrency(opt.price)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flavours selection */}
                  {cake.flavours && cake.flavours.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1.5">
                        Choose Sponge / Flavour
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {cake.flavours.map((flavour, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedFlavour(flavour)}
                            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                              selectedFlavour === flavour
                                ? 'bg-[#C5A15A] text-white border-[#C5A15A]'
                                : 'bg-white/80 text-[#4B2E25]/80 border-[#E8D5C8] hover:bg-white'
                            }`}
                          >
                            {flavour}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lead Time & Allergens info */}
                  <div className="mt-4 pt-3 border-t border-[#E8D5C8]/60 space-y-1.5 text-xs text-[#4B2E25]/75">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#C5A15A]" />
                      <span>
                        Lead Time: <strong className="text-[#4B2E25]">{cake.leadTimeHours} {t.hours}</strong> advance booking
                      </span>
                    </div>
                    {cake.allergens && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                        <span>Allergens: {cake.allergens}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Enquiry Expansion Form */}
                {isOrderFormOpen ? (
                  <form onSubmit={handleSubmitOrderEnquiry} className="pt-4 border-t border-[#E8D5C8] space-y-4 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-[#4B2E25]">
                        Enquiry & Delivery Information
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsOrderFormOpen(false)}
                        className="text-[11px] text-[#4B2E25]/60 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>

                    {errorMsg && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {/* Customer Contact */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#4B2E25]/70 mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Radhika"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-[#E8D5C8]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#4B2E25]/70 mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-[#E8D5C8]"
                        />
                      </div>
                    </div>

                    {/* Date and Quantity */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold text-[#4B2E25]/70 mb-1">
                          Required Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={requiredDate}
                          onChange={(e) => setRequiredDate(e.target.value)}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-[#E8D5C8]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#4B2E25]/70 mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={orderQuantity}
                          onChange={(e) => setOrderQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-[#E8D5C8]"
                        />
                      </div>
                    </div>

                    {/* Handover Preference */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4B2E25]/70 mb-1">
                        Handover Preference
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="handoverMode"
                            checked={deliveryOrPickup === 'delivery'}
                            onChange={() => setDeliveryOrPickup('delivery')}
                            className="accent-[#4B2E25]"
                          />
                          <span>Doorstep Delivery (+₹{settings.deliveryCharge || 150})</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="handoverMode"
                            checked={deliveryOrPickup === 'pickup'}
                            onChange={() => setDeliveryOrPickup('pickup')}
                            className="accent-[#4B2E25]"
                          />
                          <span>Bakery Pickup (Free)</span>
                        </label>
                      </div>
                    </div>

                    {/* Delivery Address fields - ONLY when delivery is selected */}
                    {deliveryOrPickup === 'delivery' && (
                      <div className="p-3 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] space-y-2.5">
                        <span className="font-semibold text-[11px] text-[#4B2E25] block">
                          Delivery Destination Details
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Flat / House / Villa No. *"
                            value={flatOrHouse}
                            onChange={(e) => setFlatOrHouse(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#E8D5C8]"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Street / Locality *"
                            value={streetAndLocality}
                            onChange={(e) => setStreetAndLocality(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#E8D5C8]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="City"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#E8D5C8]"
                          />
                          <input
                            type="text"
                            placeholder="Postal Code"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#E8D5C8]"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Landmark (Optional)"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-[#E8D5C8]"
                        />
                      </div>
                    )}

                    {/* Cake Message */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#4B2E25]/70 mb-1">
                        Piped Cake Message (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Happy 10th Birthday Aanya"
                        value={cakeMessage}
                        onChange={(e) => setCakeMessage(e.target.value)}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-[#E8D5C8]"
                      />
                    </div>

                    {/* Estimated Total Calculation */}
                    <div className="p-3 bg-white rounded-xl border border-[#E8D5C8] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#4B2E25]/60 block uppercase font-semibold">
                          Estimated Order Total
                        </span>
                        <span className="font-serif text-lg font-bold text-[#4B2E25]">
                          {formatIndianCurrency(estimatedTotal)}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#4B2E25]/60">
                        ({currentWeightOpt.weight} x {orderQuantity} {deliveryOrPickup === 'delivery' ? '+ Delivery' : ''})
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5 text-[#C5A15A]" />
                      <span>Submit Order Enquiry to Bakery</span>
                    </button>
                  </form>
                ) : (
                  /* Bottom Action Strip */
                  <div className="pt-4 border-t border-[#E8D5C8] space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-[#4B2E25]/70 block">Starting from</span>
                        <span className="font-serif text-2xl font-bold text-[#4B2E25]">
                          {formatIndianCurrency(currentWeightOpt.price)}
                        </span>
                      </div>
                      <span className="text-xs text-[#4B2E25]/60">
                        {currentWeightOpt.weight}
                      </span>
                    </div>

                    {/* Unavailable / Sold Out Banner */}
                    {(cake.availability === 'sold_out' || cake.availability === 'temporarily_unavailable' || cake.isPublished === false) && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          <strong>{cake.availability === 'sold_out' ? 'Sold Out' : 'Currently Unavailable'}:</strong> Online booking is paused for this creation. Please select an available design or contact us for bespoke dates.
                        </span>
                      </div>
                    )}

                    {/* Customization options: Quantity, Eggless, Piped Message */}
                    <div className="p-3.5 bg-white rounded-2xl border border-[#E8D5C8] space-y-3 text-xs">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-semibold text-[#4B2E25]">Quantity:</span>
                        <div className="flex items-center border border-[#E8D5C8] rounded-xl bg-[#FFF8EF]">
                          <button
                            type="button"
                            onClick={() => setOrderQuantity(q => Math.max(1, q - 1))}
                            className="p-1.5 hover:bg-[#E8D5C8]/40 rounded-l-lg transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5 text-[#4B2E25]" />
                          </button>
                          <span className="px-3 py-1 font-mono font-bold text-xs text-[#4B2E25]">
                            {orderQuantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setOrderQuantity(q => Math.min(10, q + 1))}
                            className="p-1.5 hover:bg-[#E8D5C8]/40 rounded-r-lg transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#4B2E25]" />
                          </button>
                        </div>
                      </div>

                      {cake.isEgglessOption && (
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isEggless}
                            onChange={(e) => setIsEggless(e.target.checked)}
                            className="w-4 h-4 text-[#C5A15A] rounded border-[#E8D5C8] focus:ring-[#C5A15A]"
                          />
                          <span className="font-medium text-[#4B2E25]">
                            100% Pure Eggless Bake (No gelatin or animal rennet)
                          </span>
                        </label>
                      )}

                      <div>
                        <label className="block text-[11px] font-semibold text-[#4B2E25]/70 mb-1">
                          Piped Message on Cake (Optional):
                        </label>
                        <input
                          type="text"
                          maxLength={60}
                          placeholder="e.g. Happy Birthday Aanya"
                          value={cakeMessage}
                          onChange={(e) => setCakeMessage(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Add to Cart button */}
                      <button
                        disabled={cake.availability === 'sold_out' || cake.availability === 'temporarily_unavailable' || cake.isPublished === false || (settings.is_open === false || settings.isOpen === false)}
                        onClick={() => {
                          if (cake.availability === 'sold_out' || cake.availability === 'temporarily_unavailable' || cake.isPublished === false) return;
                          addToCart({
                            cakeId: cake.id,
                            cakeName: cake.name,
                            imageUrl: activeImage.url,
                            category: cake.category,
                            weight: currentWeightOpt.weight,
                            flavour: selectedFlavour || cake.flavours[0] || 'Signature Sponge',
                            unitPrice: baseItemPrice,
                            quantity: orderQuantity,
                            isEggless,
                            cakeMessage: cakeMessage.trim() || undefined
                          });
                          setIsCartOpen(true);
                        }}
                        className={`flex-1 py-3 text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                          cake.availability === 'sold_out' || cake.availability === 'temporarily_unavailable' || cake.isPublished === false || (settings.is_open === false || settings.isOpen === false)
                            ? 'bg-neutral-300 text-neutral-600 cursor-not-allowed border border-neutral-300'
                            : 'text-white bg-[#C5A15A] hover:bg-[#b08e48]'
                        }`}
                        title="Add to Shopping Cart"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Add to Cart ({formatIndianCurrency(baseItemPrice * orderQuantity)})</span>
                      </button>

                      {/* Buy Now / Checkout button */}
                      <button
                        disabled={cake.availability === 'sold_out' || cake.availability === 'temporarily_unavailable' || cake.isPublished === false || (settings.is_open === false || settings.isOpen === false)}
                        onClick={() => {
                          if (cake.availability === 'sold_out' || cake.availability === 'temporarily_unavailable' || cake.isPublished === false) return;
                          onClose();
                          navigateTo('order', { cakeId: cake.id });
                        }}
                        className={`py-3 px-4 text-xs font-semibold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 ${
                          cake.availability === 'sold_out' || cake.availability === 'temporarily_unavailable' || cake.isPublished === false || (settings.is_open === false || settings.isOpen === false)
                            ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                            : 'text-white bg-[#4B2E25] hover:bg-[#38221B]'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#C5A15A]" />
                        <span>Buy Now</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsOrderFormOpen(true)}
                        className="px-3.5 py-3 text-xs font-medium text-[#4B2E25] bg-white border border-[#E8D5C8] hover:bg-[#FFF8EF] rounded-xl transition-colors"
                      >
                        Quick Enquiry
                      </button>

                      {whatsappDirectUrl && (
                        <a
                          href={whatsappDirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-3 text-xs font-semibold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                          title="Order via WhatsApp directly with prefilled cake details"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-800" />
                          <span>Order via WhatsApp</span>
                        </a>
                      )}

                      <button
                        onClick={handleCopyLink}
                        className="p-3 text-[#4B2E25] bg-white hover:bg-[#F4D8D8]/40 border border-[#E8D5C8] rounded-xl transition-colors"
                        title="Share / Copy Link"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                      </button>
                    </div>

                    <p className="mt-2 text-[10px] text-[#4B2E25]/60 text-center">
                      Note: Clicking WhatsApp opens a pre-filled chat with our bakery. You review and send the message yourself. Orders are confirmed only upon baker acceptance.
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen image viewer */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setFullScreenImage(null)}
        >
          <img 
            src={fullScreenImage} 
            alt="Enlarged Cake View" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
          />
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-6 right-6 p-2 text-white bg-white/20 hover:bg-white/40 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </>
  );
};
