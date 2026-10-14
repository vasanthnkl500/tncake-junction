import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatIndianCurrency, buildWhatsAppLink } from '../utils/whatsapp';
import { 
  Sparkles, 
  Send, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  X,
  Home,
  ShoppingBag
} from 'lucide-react';

interface ConfiguratorProps {
  onSuccessDone?: () => void;
}

const OCCASIONS = [
  'Birthday',
  'Wedding Reception',
  'Engagement',
  'Silver / Golden Anniversary',
  'Baby Shower / Gender Reveal',
  'Milestone Corporate Event'
];

const FLAVOURS = [
  { name: 'Belgian Couverture Truffle 64%', basePricePerKg: 1600, tag: 'Bestseller' },
  { name: 'Rose Water & Persian Pistachio Velvet', basePricePerKg: 1800, tag: 'Signature' },
  { name: 'Madagascar Vanilla Bean & Wild Berry Compote', basePricePerKg: 1500, tag: 'Classic' },
  { name: 'Salted Butter Caramel & Roasted Pecan', basePricePerKg: 1700, tag: 'Gourmet' },
  { name: 'Mango Saffron & Whipped Cardamom Cream', basePricePerKg: 1750, tag: 'Seasonal' },
  { name: 'Arabica Espresso Ladyfinger Tiramisu', basePricePerKg: 1650, tag: 'Coffee Infused' }
];

const WEIGHTS = [
  { weight: '1.0 kg', serves: 'Serves 6–8 guests', multiplier: 1.0 },
  { weight: '1.5 kg', serves: 'Serves 10–12 guests', multiplier: 1.5 },
  { weight: '2.0 kg', serves: 'Serves 15–18 guests', multiplier: 2.0 },
  { weight: '3.0 kg (Two-Tier)', serves: 'Serves 22–26 guests', multiplier: 3.0 },
  { weight: '5.0 kg (Grand Tiers)', serves: 'Serves 40+ guests', multiplier: 5.0 }
];

const SHAPES = [
  { id: 'round', label: 'Classic Round Tier', desc: 'Timeless cylindrical shape with crisp sharp ganache edges.' },
  { id: 'heart', label: 'Vintage Lambeth Heart', desc: 'Romantic heart silhouette with vintage ruffled piping.' },
  { id: 'square', label: 'Modern Square Block', desc: 'Architectural clean lines with geometric elegance.' },
  { id: 'tiered', label: 'Multi-Tiered Architectural', desc: 'Doweled layered tiers for weddings and grand galas.' }
];

const COLOUR_THEMES = [
  { name: 'Blush Pink & Ivory', hex: '#F4D8D8', border: '#E8D5C8' },
  { name: 'Warm Cream & 24k Gold', hex: '#FFF8EF', border: '#C5A15A' },
  { name: 'Rich Belgian Dark Chocolate', hex: '#4B2E25', border: '#38221B' },
  { name: 'Sage Botanical & White Flora', hex: '#D1E0D7', border: '#A3BFA8' },
  { name: 'Pastel Lilac & Lavender', hex: '#E6E0F8', border: '#C5BAE8' }
];

export const CustomCakeConfigurator: React.FC<ConfiguratorProps> = ({ onSuccessDone }) => {
  const { settings, submitEnquiry, navigateTo, setIsCartOpen, cartTotalCount } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form selections
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [flavour, setFlavour] = useState(FLAVOURS[0].name);
  const [weight, setWeight] = useState(WEIGHTS[1].weight);
  const [shape, setShape] = useState(SHAPES[0].id);
  const [colourTheme, setColourTheme] = useState(COLOUR_THEMES[0].name);
  const [isEggless, setIsEggless] = useState(true);
  const [cakeMessage, setCakeMessage] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [deliveryPref, setDeliveryPref] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [referencePhotos, setReferencePhotos] = useState<string[]>([]);

  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calculate estimated price based strictly on configured options
  const selectedFlavourObj = FLAVOURS.find(f => f.name === flavour) || FLAVOURS[0];
  const selectedWeightObj = WEIGHTS.find(w => w.weight === weight) || WEIGHTS[1];
  const estimatedBasePrice = Math.round(selectedFlavourObj.basePricePerKg * selectedWeightObj.multiplier);

  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Reference picture must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReferencePhotos(prev => [...prev, reader.result as string]);
        setErrorMsg(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim() || !customerPhone.trim() || !requiredDate) {
      setErrorMsg('Please enter your name, mobile number, and event date.');
      return;
    }

    // Minimum notice validation
    const dateObj = new Date(requiredDate);
    const now = new Date();
    const diffDays = Math.ceil((dateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < (settings.minNoticeDays || 2)) {
      setErrorMsg(`We require at least ${settings.minNoticeDays} days advance notice for custom handcrafted creations.`);
      return;
    }

    const newEnq = submitEnquiry({
      customerName,
      phone: customerPhone,
      occasion,
      requiredDate,
      flavour,
      approximateWeight: weight,
      shape: SHAPES.find(s => s.id === shape)?.label,
      colourTheme,
      isEggless,
      cakeMessage: cakeMessage.trim() || undefined,
      budgetInr: estimatedBasePrice,
      message: `${specialNotes}\n[Configured Shape: ${shape}, Colour: ${colourTheme}, Cake Message: "${cakeMessage || 'None'}"]`,
      deliveryOrPickup: deliveryPref,
      address: deliveryAddress,
      referenceImageUrls: referencePhotos
    });

    setSubmittedRef(newEnq.referenceNumber);
  };

  const directConfiguratorWhatsApp = buildWhatsAppLink(
    settings.whatsappNumber,
    `Hello ${settings.shopName || 'Cake Junction'}, I would like to order a bespoke custom cake:\n\n` +
    `🎂 *Custom Tier Request*\n` +
    `🎉 *Occasion:* ${occasion}\n` +
    `🍰 *Selected Flavour:* ${flavour}\n` +
    `⚖️ *Size / Weight:* ${weight}\n` +
    `📐 *Silhouette Shape:* ${SHAPES.find(s => s.id === shape)?.label || shape}\n` +
    `🎨 *Colour Theme:* ${colourTheme}\n` +
    (isEggless ? `🌱 *Dietary Preference:* 100% Eggless\n` : '') +
    (cakeMessage.trim() ? `✍️ *Piped Message:* "${cakeMessage.trim()}"\n` : '') +
    (requiredDate ? `📅 *Needed Date:* ${requiredDate}\n` : '') +
    `💰 *Estimated Baseline Price:* ${formatIndianCurrency(estimatedBasePrice)}\n` +
    `\nPlease verify baker availability and confirm quotation.`
  );

  const whatsappUrl = submittedRef
    ? buildWhatsAppLink(
        settings.whatsappNumber,
        `Hello ${settings.shopName || 'Cake Junction'}, I have submitted a bespoke cake enquiry!\n\n` +
        `• Ref: *${submittedRef}*\n` +
        `• Occasion: ${occasion}\n` +
        `• Flavour: ${flavour} (${weight})\n` +
        `• Date: ${requiredDate}\n` +
        `• Estimated Quote: ${formatIndianCurrency(estimatedBasePrice)}\n` +
        `Please confirm baker availability.`
      )
    : null;

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      {/* Top Navigation Row: Home, Cart, Title */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-[#E8D5C8]/80">
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
          Bespoke Custom Cake Configurator & Design Enquiry
        </span>
      </div>

      {submittedRef ? (
        /* Final Success & WhatsApp Confirmation */
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8D5C8] shadow-sm text-center max-w-2xl mx-auto animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="font-serif text-3xl font-bold text-[#4B2E25]">
            Custom Cake Enquiry Received!
          </h2>

          <div className="my-5 p-4 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8] inline-block">
            <span className="text-xs text-[#4B2E25]/70 uppercase font-semibold">Your Reference Code</span>
            <p className="font-mono text-2xl font-bold text-[#4B2E25] mt-0.5">{submittedRef}</p>
          </div>

          <p className="text-xs text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 mb-6 text-left">
            <strong>Important:</strong> This submission is an enquiry, not an automatic confirmation. Our head baker will verify sponge baking schedules and deliver a binding quote via WhatsApp.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Notify Baker on WhatsApp</span>
              </a>
            )}

            <button
              onClick={() => {
                setSubmittedRef(null);
                setStep(1);
                if (onSuccessDone) onSuccessDone();
              }}
              className="px-5 py-3 text-xs font-medium text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl hover:bg-[#F4D8D8]/30"
            >
              Start New Cake
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Configurator Wizard (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#E8D5C8] shadow-sm">
            
            {/* Step Indicators */}
            <div className="flex items-center justify-between pb-6 border-b border-[#E8D5C8]/70 mb-6">
              {[
                { num: 1, label: 'Occasion & Flavour' },
                { num: 2, label: 'Shape & Weight' },
                { num: 3, label: 'Theme & Message' },
                { num: 4, label: 'Date & Delivery' }
              ].map(s => (
                <div key={s.num} className="flex flex-col items-center">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s.num
                      ? 'bg-[#4B2E25] text-white'
                      : step > s.num
                      ? 'bg-[#C5A15A] text-white'
                      : 'bg-[#FFF8EF] text-[#4B2E25]/60 border border-[#E8D5C8]'
                  }`}>
                    {step > s.num ? '✓' : s.num}
                  </span>
                  <span className="text-[10px] text-[#4B2E25]/70 mt-1 hidden sm:block whitespace-nowrap">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {errorMsg && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: Occasion & Flavour */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-2">
                    1. Select Celebration Occasion
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {OCCASIONS.map(occ => (
                      <button
                        key={occ}
                        type="button"
                        onClick={() => setOccasion(occ)}
                        className={`p-3 text-left rounded-xl text-xs font-medium border transition-colors ${
                          occasion === occ
                            ? 'bg-[#4B2E25] text-white border-[#4B2E25]'
                            : 'bg-[#FFF8EF]/50 text-[#4B2E25] border-[#E8D5C8] hover:bg-white'
                        }`}
                      >
                        {occ}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-2">
                    2. Artisanal Flavour Recipe
                  </label>
                  <div className="space-y-2">
                    {FLAVOURS.map(f => (
                      <div
                        key={f.name}
                        onClick={() => setFlavour(f.name)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          flavour === f.name
                            ? 'bg-[#FFF8EF] border-[#4B2E25] shadow-xs'
                            : 'bg-white border-[#E8D5C8] hover:bg-[#FFF8EF]/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-xs text-[#4B2E25]">{f.name}</strong>
                            <span className="text-[10px] px-1.5 py-0.5 bg-[#F4D8D8]/70 text-[#4B2E25] rounded-md font-semibold">
                              {f.tag}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#4B2E25]/60 block mt-0.5">
                            ₹{f.basePricePerKg} / kg base
                          </span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          flavour === f.name ? 'border-[#4B2E25] bg-[#4B2E25]' : 'border-[#E8D5C8]'
                        }`}>
                          {flavour === f.name && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-[#4B2E25] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEggless}
                      onChange={(e) => setIsEggless(e.target.checked)}
                      className="accent-[#4B2E25] w-4 h-4"
                    />
                    <span>Bake as 100% Eggless (Organic condensed milk & flax emulsion)</span>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: Shape & Weight */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-2">
                    3. Cake Silhouette & Tier Structure
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SHAPES.map(s => (
                      <div
                        key={s.id}
                        onClick={() => setShape(s.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          shape === s.id
                            ? 'bg-[#FFF8EF] border-[#4B2E25] shadow-xs'
                            : 'bg-white border-[#E8D5C8] hover:bg-[#FFF8EF]/30'
                        }`}
                      >
                        <strong className="text-xs text-[#4B2E25] block">{s.label}</strong>
                        <p className="text-[11px] text-[#4B2E25]/70 mt-1 leading-snug">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-2">
                    4. Weight & Guest Serving Scale
                  </label>
                  <div className="space-y-2">
                    {WEIGHTS.map(w => (
                      <div
                        key={w.weight}
                        onClick={() => setWeight(w.weight)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          weight === w.weight
                            ? 'bg-[#FFF8EF] border-[#4B2E25]'
                            : 'bg-white border-[#E8D5C8] hover:bg-[#FFF8EF]/30'
                        }`}
                      >
                        <div>
                          <strong className="text-xs text-[#4B2E25]">{w.weight}</strong>
                          <span className="text-[11px] text-[#4B2E25]/60 ml-2">({w.serves})</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-[#4B2E25]">
                          {formatIndianCurrency(Math.round(selectedFlavourObj.basePricePerKg * w.multiplier))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Theme & Message */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-2">
                    5. Exterior Buttercream Colour Palette
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {COLOUR_THEMES.map(theme => (
                      <div
                        key={theme.name}
                        onClick={() => setColourTheme(theme.name)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          colourTheme === theme.name
                            ? 'bg-[#FFF8EF] border-[#4B2E25] shadow-xs'
                            : 'bg-white border-[#E8D5C8]'
                        }`}
                      >
                        <span 
                          className="w-5 h-5 rounded-full border shadow-2xs" 
                          style={{ backgroundColor: theme.hex, borderColor: theme.border }} 
                        />
                        <span className="text-xs font-medium text-[#4B2E25]">{theme.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                    6. Hand-Piped Cake Message (Optional)
                  </label>
                  <input
                    type="text"
                    value={cakeMessage}
                    onChange={(e) => setCakeMessage(e.target.value)}
                    placeholder="e.g. Happy 25th Anniversary Mom & Dad"
                    maxLength={50}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] placeholder:text-[#4B2E25]/40"
                  />
                  <span className="text-[10px] text-[#4B2E25]/50 block mt-1">
                    Piped with edible chocolate or gold acrylic topper.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                    7. Upload Inspiration Reference Photos (Optional)
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-[#FFF8EF] border border-dashed border-[#C5A15A] rounded-xl text-xs font-medium text-[#4B2E25] hover:bg-[#F4D8D8]/30">
                      <Upload className="w-3.5 h-3.5 text-[#C5A15A]" />
                      <span>Attach Photo (PNG/JPG)</span>
                      <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                    </label>

                    {referencePhotos.map((img, i) => (
                      <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#E8D5C8]">
                        <img src={img} alt="Ref" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setReferencePhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Date & Handover Details */}
            {step === 4 && (
              <form onSubmit={handleFinalSubmit} className="space-y-5 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                      Your Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Meenakshi Raman"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                      Mobile Number (WhatsApp) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={requiredDate}
                      onChange={(e) => setRequiredDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                    />
                    <span className="text-[10px] text-[#4B2E25]/60 mt-1 block">
                      Min {settings.minNoticeDays} days advance notice required.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                      Handover Mode
                    </label>
                    <div className="flex gap-4 pt-2">
                      <label className="flex items-center gap-1.5 text-xs text-[#4B2E25] cursor-pointer">
                        <input
                          type="radio"
                          name="confDelivery"
                          checked={deliveryPref === 'delivery'}
                          onChange={() => setDeliveryPref('delivery')}
                          className="accent-[#4B2E25]"
                        />
                        <span>Doorstep Delivery</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-[#4B2E25] cursor-pointer">
                        <input
                          type="radio"
                          name="confDelivery"
                          checked={deliveryPref === 'pickup'}
                          onChange={() => setDeliveryPref('pickup')}
                          className="accent-[#4B2E25]"
                        />
                        <span>Bakery Pickup</span>
                      </label>
                    </div>
                  </div>
                </div>

                {deliveryPref === 'delivery' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                      Delivery Address & City
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Door No, Building Name, Street & Landmark"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/70 mb-1">
                    Special Decor Instructions / Baker Notes
                  </label>
                  <textarea
                    rows={2}
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    placeholder="Specify flowers, textures, dietary intolerances..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 text-[#C5A15A]" />
                  <span>Submit Custom Cake Enquiry to Atelier</span>
                </button>
              </form>
            )}

            {/* Wizard Navigation Buttons */}
            <div className="mt-8 pt-4 border-t border-[#E8D5C8]/70 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((step - 1) as any)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#4B2E25] bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl hover:bg-[#F4D8D8]/30"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              ) : <div />}

              {step < 4 && (
                <button
                  type="button"
                  onClick={() => setStep((step + 1) as any)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl shadow-xs"
                >
                  <span>Continue to Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C5A15A]" />
                </button>
              )}
            </div>

          </div>

          {/* Live Order Summary & Composited Preview (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-[#E8D5C8] shadow-xs sticky top-24">
            <h3 className="font-serif text-lg font-bold text-[#4B2E25] pb-3 border-b border-[#E8D5C8]/70 mb-4">
              Live Custom Cake Summary
            </h3>

            {/* Illustrative Composited Visual Preview */}
            <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-[#FFF8EF] border border-[#E8D5C8] mb-5 flex flex-col items-center justify-center p-4 text-center">
              <div 
                className="w-28 h-28 rounded-full border-4 shadow-md flex items-center justify-center transition-all duration-300"
                style={{ 
                  backgroundColor: COLOUR_THEMES.find(c => c.name === colourTheme)?.hex || '#FFF8EF',
                  borderColor: COLOUR_THEMES.find(c => c.name === colourTheme)?.border || '#C5A15A'
                }}
              >
                <div className="text-center px-2">
                  <span className="font-serif text-[11px] font-bold text-[#4B2E25] block leading-tight">
                    {flavour.split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-[#4B2E25]/70 block mt-0.5">
                    {weight}
                  </span>
                </div>
              </div>

              {cakeMessage && (
                <span className="mt-2.5 px-2.5 py-1 bg-white/90 backdrop-blur-xs rounded-full border border-[#E8D5C8] font-serif italic text-[11px] text-[#4B2E25] shadow-xs">
                  "{cakeMessage}"
                </span>
              )}

              <span className="absolute bottom-2 right-2 text-[9px] text-[#4B2E25]/50 bg-white/80 px-2 py-0.5 rounded-md">
                Illustrative Mockup
              </span>
            </div>

            {/* Selected Spec Sheet */}
            <div className="space-y-2 text-xs text-[#4B2E25]/85">
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
                <span className="text-[#4B2E25]/60">Occasion:</span>
                <strong>{occasion}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
                <span className="text-[#4B2E25]/60">Flavour:</span>
                <strong className="text-right max-w-[180px] truncate">{flavour}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
                <span className="text-[#4B2E25]/60">Tier / Weight:</span>
                <strong>{weight}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
                <span className="text-[#4B2E25]/60">Silhouette:</span>
                <strong>{SHAPES.find(s => s.id === shape)?.label}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
                <span className="text-[#4B2E25]/60">Dietary:</span>
                <strong>{isEggless ? '100% Eggless' : 'Traditional Pastry'}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8D5C8]/50">
                <span className="text-[#4B2E25]/60">Colour Theme:</span>
                <strong>{colourTheme}</strong>
              </div>
            </div>

            {/* Estimated Price Baseline */}
            <div className="mt-5 p-4 bg-[#FFF8EF] rounded-2xl border border-[#E8D5C8]">
              <span className="text-[11px] text-[#4B2E25]/60 block uppercase tracking-wider font-semibold">
                Estimated Price Baseline
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-serif text-2xl font-bold text-[#4B2E25]">
                  {formatIndianCurrency(estimatedBasePrice)}
                </span>
                <span className="text-[10px] text-[#4B2E25]/60">
                  (Final quote issued by chef)
                </span>
              </div>
            </div>

            {directConfiguratorWhatsApp && (
              <a
                href={directConfiguratorWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full py-3 px-4 text-xs font-semibold rounded-2xl transition-all shadow-xs border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>Order via WhatsApp ({formatIndianCurrency(estimatedBasePrice)})</span>
              </a>
            )}

            <p className="mt-2 text-[10px] text-center text-[#4B2E25]/60">
              Note: Opens WhatsApp with +91 8825648728 with your custom tier specs pre-filled. You review and send the message yourself.
            </p>
          </div>

        </div>
      )}
    </div>
  );
};
