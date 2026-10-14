import React, { useState, useMemo } from 'react';
import { 
  HelpCircle, 
  Search, 
  Sparkles, 
  ChefHat, 
  Truck, 
  ChevronDown, 
  MessageCircle, 
  Cake as CakeIcon,
  ShieldCheck,
  CheckCircle2,
  Phone
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { buildWhatsAppLink } from '../utils/whatsapp';

export type FaqCategory = 'all' | 'custom_orders' | 'ingredients' | 'delivery';

interface FaqEntry {
  id: string;
  category: 'custom_orders' | 'ingredients' | 'delivery';
  categoryLabel: string;
  question: string;
  answer: string;
  highlights?: string[];
}

const FAQ_ENTRIES: FaqEntry[] = [
  // --- CUSTOM ORDERS ---
  {
    id: 'faq-lead-time',
    category: 'custom_orders',
    categoryLabel: 'Custom Orders',
    question: 'What is the required lead time for custom celebration and wedding cakes?',
    answer: 'For our signature gallery cakes (such as the Belgian Truffle or Tiramisu Gateau), a lead time of 24 hours is ideal. For bespoke custom creations, 2-tier and 3-tier wedding centerpieces, or intricate sugar-sculpted themes, we kindly request 48 to 72 hours. This ensures sponges can cure naturally, ganaches set smoothly, and botanical detailing is completed without rushing.',
    highlights: ['Gallery Cakes: 24 hours', 'Custom & Multi-Tier: 48–72 hours', 'Emergency requests accepted based on atelier baking capacity']
  },
  {
    id: 'faq-reference-photos',
    category: 'custom_orders',
    categoryLabel: 'Custom Orders',
    question: 'Can I upload reference pictures or Pinterest moodboards for custom designs?',
    answer: 'Absolutely! You can upload high-resolution reference images, colour swatches, and specific dietary notes directly through our Custom Cake Configurator or send them to our pastry chef via WhatsApp. Our design team will assess structural feasibility and suggest organic edible flowers, textured buttercreams, or delicate gold leaf accents to bring your vision to life.',
    highlights: ['Upload via Online Configurator', 'Direct WhatsApp chef consultation', 'Instant estimates & formal digital quotations']
  },
  {
    id: 'faq-eggless-modifications',
    category: 'custom_orders',
    categoryLabel: 'Custom Orders',
    question: 'Are eggless options truly baked in separate hygienic conditions?',
    answer: 'Yes, 100%. We take dietary traditions and vegetarian choices very seriously. All eggless cakes are baked with dedicated bakeware, separate silicone spatulas, and plant-based leavening agents (such as cultured buttermilk, condensed milk, and organic fruit pectin). The crumb texture remains exceptionally moist, light, and airy.',
    highlights: ['Dedicated vegetarian bakeware & storage', 'Zero cross-contact protocols', 'Available across all sponge flavours']
  },
  {
    id: 'faq-portion-sizing',
    category: 'custom_orders',
    categoryLabel: 'Custom Orders',
    question: 'How do I choose the correct cake size and weight for my guest count?',
    answer: 'As a trusted standard for celebration desserts: 0.5 kg comfortably serves 3–4 guests; 1.0 kg serves 6–8 guests; 2.0 kg serves 14–16 guests; and multi-tier confections (3.0 kg to 5.0 kg) cater to 25 to 45 guests. For wedding reception dinner banquets where guests enjoy full plated slices, we recommend sizing up slightly.',
    highlights: ['0.5 kg: 3–4 guests', '1.0 kg: 6–8 guests', '2.0 kg: 14–16 guests', '3.0–5.0 kg Multi-tier: 25–45 guests']
  },

  // --- INGREDIENT SOURCING ---
  {
    id: 'faq-chocolate-butter',
    category: 'ingredients',
    categoryLabel: 'Ingredient Sourcing',
    question: 'What kind of chocolate, butter, and creams do you use in baking?',
    answer: 'We exclusively bake with authentic Callebaut Belgian couverture chocolate (crafted from 54% to 70% pure cocoa butter rather than cheap vegetable fats). Our butter is 100% pure unsalted cultured dairy butter, and our ganaches use fresh full-cream dairy. We strictly ban hydrogenated fats, vanaspati, and palm oil stabilizers from our kitchen.',
    highlights: ['Pure Belgian Couverture (Callebaut)', '100% Cultured Unsalted Dairy Butter', 'Zero Hydrogenated Palm Oils or Vanaspati']
  },
  {
    id: 'faq-vanilla-fruits',
    category: 'ingredients',
    categoryLabel: 'Ingredient Sourcing',
    question: 'Do you use real fruits and natural vanilla, or artificial syrups?',
    answer: 'Our vanilla sponges are infused with genuine whole Madagascar Bourbon vanilla bean pods and pure vanilla extract. All fruit fillings—such as our raspberry gelee, passionfruit curd, and Alphonso mango confit—are made in-house by simmering real hand-selected seasonal fruits, retaining their natural tartness and botanical aroma.',
    highlights: ['Madagascar Bourbon Vanilla Pods', 'House-simmered real fruit compotes & gelees', 'Zero synthetic chemical essence syrups']
  },
  {
    id: 'faq-gelatin-preservatives',
    category: 'ingredients',
    categoryLabel: 'Ingredient Sourcing',
    question: 'Are there chemical preservatives or animal gelatin in your mousses?',
    answer: 'Never. We do not use chemical shelf-life extenders or artificial preservatives. All cakes are meant to be consumed fresh within 48 to 72 hours of baking. For setting mousses and glossy cake glazes in our vegetarian menu, we utilize agar-agar (red algae sea vegetable) rather than animal-derived gelatin.',
    highlights: ['100% Vegetarian Agar-Agar alternatives', 'Zero artificial preservatives or mould inhibitors', 'Baked fresh on order day']
  },

  // --- DELIVERY LOGISTICS ---
  {
    id: 'faq-chilled-delivery',
    category: 'delivery',
    categoryLabel: 'Delivery Logistics',
    question: 'How are delicate celebration and tiered cakes transported safely in warm weather?',
    answer: 'Cakes are packaged on heavy reinforced food-grade cake drums inside rigid double-walled insulated boxes. For deliveries across town, our transport partner utilizes air-conditioned and chilled vans with non-slip floor mats. Tiered cakes feature food-safe internal wooden center dowels to guarantee absolute stability across transit.',
    highlights: ['Chilled temperature-controlled vans', 'Double-walled insulated packaging', 'Food-safe internal stabilizing dowels for tiers']
  },
  {
    id: 'faq-delivery-time-slots',
    category: 'delivery',
    categoryLabel: 'Delivery Logistics',
    question: 'What delivery windows are available, and can I schedule a surprise delivery?',
    answer: 'We offer three daily fulfilment windows: Morning (09:30 AM – 01:00 PM), Afternoon (01:00 PM – 05:00 PM), and Evening (05:00 PM – 08:30 PM). If you are orchestrating a surprise birthday or anniversary delivery, you can specify direct venue handover notes, and our driver will deliver directly to the recipient without spoiling the surprise.',
    highlights: ['Three convenient daily time windows', 'Surprise delivery coordination supported', 'Real-time phone/SMS status updates']
  },
  {
    id: 'faq-atelier-pickup',
    category: 'delivery',
    categoryLabel: 'Delivery Logistics',
    question: 'Can I pick up my cake in person directly from the atelier?',
    answer: 'Yes! Self-pickup from our bakery counter is completely free of charge. Your cake will be boxed and pre-chilled for travel. When picking up, we recommend placing the box flat on the level car floor (avoiding slanted car seats) with the car air conditioning set to cool.',
    highlights: ['Complimentary atelier counter collection', 'Secure flat-base transport packing', 'Pre-chilled handoff for maximum freshness']
  }
];

export const AboutFaqSection: React.FC = () => {
  const { settings, navigateTo, trackWhatsAppClick } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIds, setOpenFaqIds] = useState<string[]>(['faq-lead-time', 'faq-chocolate-butter', 'faq-chilled-delivery']);

  const toggleFaq = (id: string) => {
    setOpenFaqIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_ENTRIES.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.question.toLowerCase().includes(q) || 
        item.answer.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.highlights?.some(h => h.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const whatsappInquiryUrl = buildWhatsAppLink(
    settings.whatsappNumber || settings.phone || '8825648728',
    `Hello ${settings.shopName || 'Cake Junction'}, I have a question regarding custom cake ordering and ingredients!`
  ) || undefined;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E8D5C8] shadow-xs space-y-8 animate-fade-in">
      
      {/* Header & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#E8D5C8]/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-[#FFF8EF] text-[#C5A15A] border border-[#E8D5C8]">
              <HelpCircle className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A]">
              Frequently Asked Questions
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#4B2E25]">
            Custom Orders, Pure Ingredients &amp; Delivery Logistics
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-[#4B2E25]/75 max-w-2xl leading-relaxed">
            Everything you need to know about our fresh-baked philosophy, Belgian couverture chocolate sourcing, bespoke tier craftsmanship, and temperature-controlled logistics.
          </p>
        </div>

        <a
          href={whatsappInquiryUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackWhatsAppClick()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs shrink-0 self-start md:self-auto"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Ask Chef on WhatsApp</span>
        </a>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative max-w-lg">
          <Search className="w-4 h-4 text-[#4B2E25]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions (e.g. eggless, lead time, Callebaut, pickup)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8D5C8] bg-[#FFF8EF]/40 text-xs font-medium text-[#4B2E25] placeholder:text-[#4B2E25]/45 focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B2E25]/50 hover:text-[#4B2E25]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {[
            { id: 'all', label: 'All Queries', icon: HelpCircle },
            { id: 'custom_orders', label: 'Custom Orders & Tiers', icon: Sparkles },
            { id: 'ingredients', label: 'Artisanal Ingredients', icon: ChefHat },
            { id: 'delivery', label: 'Delivery & Logistics', icon: Truck },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as FaqCategory)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#4B2E25] text-white shadow-xs'
                    : 'bg-[#FFF8EF]/60 text-[#4B2E25] border border-[#E8D5C8] hover:bg-white hover:border-[#C5A15A]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#C5A15A]' : 'text-[#4B2E25]/60'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="p-8 text-center bg-[#FFF8EF]/50 rounded-2xl border border-dashed border-[#E8D5C8]">
            <HelpCircle className="w-8 h-8 text-[#C5A15A] mx-auto mb-2 opacity-60" />
            <p className="text-xs font-semibold text-[#4B2E25]">No questions matched your search query.</p>
            <p className="text-[11px] text-[#4B2E25]/60 mt-0.5">Try searching with different keywords or chat with us on WhatsApp.</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="mt-3 text-xs font-semibold text-[#C5A15A] hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = openFaqIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className={`rounded-2xl border transition-all ${
                  isOpen 
                    ? 'bg-[#FFF8EF]/40 border-[#C5A15A]/60 shadow-2xs' 
                    : 'bg-white border-[#E8D5C8] hover:border-[#C5A15A]/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full py-4 px-4 sm:px-6 flex items-start justify-between gap-4 text-left cursor-pointer"
                >
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-white border border-[#E8D5C8] text-[#C5A15A]">
                      {faq.categoryLabel}
                    </span>
                    <h3 className="font-serif text-sm sm:text-base font-bold text-[#4B2E25] leading-snug">
                      {faq.question}
                    </h3>
                  </div>
                  <div className={`p-1.5 rounded-lg border shrink-0 transition-transform duration-200 mt-1 ${
                    isOpen 
                      ? 'bg-[#4B2E25] text-white border-[#4B2E25] rotate-180' 
                      : 'bg-white text-[#4B2E25]/70 border-[#E8D5C8]'
                  }`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 sm:px-6 pb-5 pt-1 space-y-3 animate-fade-in border-t border-[#E8D5C8]/60 mt-1">
                    <p className="text-xs sm:text-sm text-[#4B2E25]/85 leading-relaxed">
                      {faq.answer}
                    </p>

                    {faq.highlights && faq.highlights.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {faq.highlights.map((h, i) => (
                          <div 
                            key={i} 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white border border-[#E8D5C8] text-[#4B2E25]"
                          >
                            <CheckCircle2 className="w-3 h-3 text-[#C5A15A] shrink-0" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Still Have Questions CTA Card */}
      <div className="bg-[#FFF8EF] rounded-2xl p-5 sm:p-6 border border-[#E8D5C8] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#E8D5C8] text-[#C5A15A] flex items-center justify-center shrink-0 shadow-2xs">
            <CakeIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif text-sm sm:text-base font-bold text-[#4B2E25]">
              Planning a personalized cake celebration?
            </h4>
            <p className="text-xs text-[#4B2E25]/70">
              Our master bakers are happy to curate flavours, provide custom quotes, and guide dietary adaptations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => navigateTo('configurator')}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#4B2E25] hover:bg-[#38221B] text-white text-xs font-semibold rounded-xl transition-all shadow-xs text-center"
          >
            Design Custom Cake
          </button>
          <a
            href={whatsappInquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppClick()}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-[#FFF8EF] text-[#4B2E25] border border-[#E8D5C8] text-xs font-semibold rounded-xl transition-all shadow-2xs text-center inline-flex items-center justify-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-700" />
            <span>Chat With Us</span>
          </a>
        </div>
      </div>

    </div>
  );
};
