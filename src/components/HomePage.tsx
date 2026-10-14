import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Cake } from '../types';
import { CakeCard } from './CakeCard';
import { HomepageSlideshow } from './HomepageSlideshow';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { 
  Sparkles, 
  MessageCircle, 
  ArrowRight, 
  ChevronRight, 
  ShieldCheck, 
  Clock, 
  Truck, 
  Award,
  ChevronDown,
  Camera,
  Star
} from 'lucide-react';

interface HomePageProps {
  onNavigateTab: (tab: string) => void;
  onSelectCake: (cake: Cake) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateTab, onSelectCake }) => {
  const { settings, cakes, feedbackList, trackWhatsAppClick } = useApp();
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const publishedCakes = cakes.filter(c => c.isPublished && c.status !== 'archived' && c.status !== 'draft');
  const featuredCakes = publishedCakes.filter(c => c.isFeatured).slice(0, 4);
  const latestCakes = [...publishedCakes].reverse().slice(0, 3);
  const approvedFeedback = feedbackList.filter(f => f.status === 'approved').slice(0, 3);

  const whatsappHeroUrl = buildWhatsAppLink(
    settings.whatsappNumber,
    `Hello ${settings.shopName}, I would like to chat about ordering a custom celebration cake!`
  );

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      
      {/* Announcement Banner (Optional, Owner managed) */}
      {settings.isAnnouncementActive && settings.announcementBanner && (
        <div className="bg-[#4B2E25] text-[#FFF8EF] py-2 px-4 text-center text-xs font-medium tracking-wide">
          {settings.announcementBanner}
        </div>
      )}

      {/* 1. CINEMATIC HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Text Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur-xs rounded-full border border-[#E8D5C8] text-xs font-semibold text-[#4B2E25] shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>Boutique Atelier · Fresh Baked Daily</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#4B2E25] tracking-tight text-balance leading-tight">
              {settings.heroHeadline}
            </h1>

            <p className="text-base sm:text-lg text-[#4B2E25]/80 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              {settings.heroSubheadline}
            </p>

            {/* Hero CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <button
                onClick={() => onNavigateTab('gallery')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-all shadow-xs active:scale-98"
              >
                <span>Explore Cake Gallery</span>
                <ArrowRight className="w-4 h-4 text-[#C5A15A]" />
              </button>

              <button
                onClick={() => onNavigateTab('configurator')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-semibold text-[#4B2E25] bg-[#F4D8D8]/70 hover:bg-[#F4D8D8] border border-[#E8D5C8] rounded-xl transition-all active:scale-98"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#4B2E25]" />
                <span>Custom Cake Configurator</span>
              </button>

              {whatsappHeroUrl && (
                <a
                  href={whatsappHeroUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={trackWhatsAppClick}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 text-xs font-semibold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-800" />
                  <span>WhatsApp Chat</span>
                </a>
              )}
            </div>

            {/* Trust metrics bar */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-[#4B2E25]/75">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#C5A15A]" />
                <span>Min {settings.minNoticeDays} Days Notice</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-[#C5A15A]" />
                <span>Chilled Van Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#C5A15A]" />
                <span>100% Pure Dairy Butter</span>
              </div>
            </div>
          </div>

          {/* Right Column: Genuine Artisan Cake Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden aspect-4/3 sm:aspect-square bg-[#FFF8EF] border border-[#E8D5C8] shadow-md group">
              <img
                src={settings.heroImageUrl || publishedCakes[0]?.images[0]?.url || 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=1200&q=80'}
                alt="Artisan Celebration Cake by Cake Junction"
                className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white pointer-events-none">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-[#FDEBD0] block">
                    Handcrafted Daily
                  </span>
                  <p className="font-serif text-sm sm:text-base font-bold drop-shadow-xs">
                    Signature Artisanal Tiers
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-medium text-white shadow-xs">
                  Made Fresh
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Category Quick Navigation Chips */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-10 animate-slide-up">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-[#E8D5C8] shadow-xs flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#C5A15A] px-2 shrink-0 hidden sm:inline">
            Explore Menu:
          </span>
          <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap">
            {[
              { label: 'All Bakes', icon: '🍰', filter: 'all' },
              { label: 'Wedding & Tiers', icon: '💍', filter: 'Wedding' },
              { label: 'Birthday Gateaux', icon: '🎉', filter: 'Birthday' },
              { label: 'Signature Truffles', icon: '🍫', filter: 'Signature' },
              { label: 'Eggless Bakes', icon: '🌱', filter: 'Eggless' },
              { label: 'Custom Sculptures', icon: '✨', filter: 'Custom Cakes' }
            ].map((cat, idx) => (
              <button
                key={idx}
                onClick={() => onNavigateTab('gallery')}
                className="whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold text-[#4B2E25] bg-[#FFF8EF] hover:bg-[#F4D8D8]/50 border border-[#E8D5C8] transition-all hover:scale-102 active:scale-97 flex items-center gap-1.5 shadow-2xs"
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. BOUTIQUE CAKE GALLERY SLIDESHOW */}
      <HomepageSlideshow onNavigateTab={onNavigateTab} />

      {/* CUSTOMER BENEFITS & CRAFTSMANSHIP PILLARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            {
              title: '100% Belgian Couverture',
              desc: 'Pure Callebaut cocoa butter. Zero cheap hydrogenated fats or palm oil.',
              icon: Award,
              badge: 'Purity'
            },
            {
              title: 'Baked Fresh to Order',
              desc: 'Every tier cured and finished from scratch. Never frozen or pre-stored sponges.',
              icon: Clock,
              badge: 'Fresh Daily'
            },
            {
              title: 'Chilled Transit Vans',
              desc: 'Dedicated climate-controlled vehicles with food-grade center dowels for tiers.',
              icon: Truck,
              badge: 'Safe Transport'
            },
            {
              title: 'Direct Chef Consultation',
              desc: 'Personalized flavour pairing and bespoke tier designs via WhatsApp & phone.',
              icon: MessageCircle,
              badge: 'Bespoke Care'
            }
          ].map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div 
                key={idx} 
                className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs card-hover-lift flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#FFF8EF] border border-[#E8D5C8] flex items-center justify-center text-[#C5A15A]">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A15A] bg-[#FFF8EF] px-2.5 py-0.5 rounded-full border border-[#E8D5C8]">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-[#4B2E25] mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#4B2E25]/75 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. OCCASION-BASED CURATED COLLECTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A]">
            Curated Occasions
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#4B2E25] mt-1">
            Bespoke Confections for Every Milestone
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: 'Weddings & Engagements', img: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=80', cat: 'Wedding' },
            { title: 'Birthday Celebrations', img: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80', cat: 'Birthday' },
            { title: 'Milestone Anniversaries', img: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=600&q=80', cat: 'Anniversary' },
            { title: 'Bespoke Theme Sculptures', img: 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=600&q=80', cat: 'Custom Cakes' },
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => onNavigateTab('gallery')}
              className="group cursor-pointer relative rounded-3xl overflow-hidden aspect-3/4 border border-[#E8D5C8] shadow-xs"
            >
              <img 
                src={item.img} 
                alt={item.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4 text-white">
                <span className="text-xs font-medium uppercase tracking-wider text-[#C5A15A]">Explore</span>
                <strong className="font-serif text-base font-bold leading-snug">{item.title}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. FEATURED CAKES CAROUSEL / SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A]">
              Chef's Signatures
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#4B2E25] mt-1">
              Featured Creations
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('gallery')}
            className="text-xs font-semibold text-[#4B2E25] hover:text-[#C5A15A] transition-colors inline-flex items-center gap-1"
          >
            <span>View All Bakes</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredCakes.map(cake => (
            <CakeCard 
              key={cake.id} 
              cake={cake} 
              onSelect={() => onSelectCake(cake)} 
            />
          ))}
        </div>
      </section>

      {/* 4. MEET THE BAKER & ATELIER STORY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8D5C8] shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 relative aspect-square rounded-2xl overflow-hidden border border-[#E8D5C8]">
            <img
              src={settings.bakerImageUrl || 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80'}
              alt={settings.bakerName || 'Head Baker'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A]">
              Behind the Rolling Pin
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#4B2E25]">
              Meet {settings.bakerName || 'Head Baker'}
            </h2>
            <p className="text-sm text-[#4B2E25]/80 leading-relaxed">
              {settings.bakerBio}
            </p>
            <p className="text-sm text-[#4B2E25]/80 leading-relaxed">
              {settings.story}
            </p>
            <div className="pt-3">
              <button
                onClick={() => onNavigateTab('configurator')}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl shadow-xs"
              >
                Discuss a Custom Creation with Chef
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BEHIND-THE-SCENES ATELIER GALLERY */}
      {settings.behindTheScenes && settings.behindTheScenes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A]">
              Craftsmanship & Ingredients
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#4B2E25] mt-1">
              Inside Our Confectionery Atelier
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {settings.behindTheScenes.map(bts => (
              <div key={bts.id} className="bg-white rounded-3xl overflow-hidden border border-[#E8D5C8] shadow-xs">
                <div className="aspect-4/3 w-full overflow-hidden">
                  <img src={bts.imageUrl} alt={bts.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <strong className="font-serif text-base text-[#4B2E25] block mb-1">{bts.title}</strong>
                  <p className="text-xs text-[#4B2E25]/75 leading-relaxed">{bts.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. APPROVED CUSTOMER REVIEWS */}
      {approvedFeedback.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A]">
                Guest Experiences
              </span>
              <h2 className="font-serif text-3xl font-bold text-[#4B2E25] mt-1">
                Sweet Words from Real Celebrations
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('reviews')}
              className="text-xs font-semibold text-[#4B2E25] hover:text-[#C5A15A] transition-colors"
            >
              All Reviews ({approvedFeedback.length}) →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {approvedFeedback.map(fb => (
              <div key={fb.id} className="bg-white rounded-3xl p-6 border border-[#E8D5C8] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-[#C5A15A] mb-3">
                    {Array.from({ length: fb.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[#C5A15A]" />
                    ))}
                  </div>
                  <p className="text-xs text-[#4B2E25]/85 leading-relaxed italic">
                    "{fb.feedbackText}"
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E8D5C8]/50">
                  <strong className="font-serif text-xs text-[#4B2E25] block">{fb.customerName || 'Guest'}</strong>
                  {fb.cakeName && <span className="text-[10px] text-[#4B2E25]/60">{fb.cakeName}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      {settings.faqs && settings.faqs.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A]">
              Frequently Asked Questions
            </span>
            <h2 className="font-serif text-3xl font-bold text-[#4B2E25] mt-1">
              Everything You Need to Know
            </h2>
          </div>

          <div className="space-y-3">
            {settings.faqs.map(faq => {
              const isOpen = openFaqId === faq.id;
              return (
                <div 
                  key={faq.id} 
                  className="bg-white rounded-2xl border border-[#E8D5C8] overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-serif text-sm sm:text-base font-bold text-[#4B2E25]"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown className={`w-4 h-4 text-[#C5A15A] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-[#4B2E25]/80 leading-relaxed border-t border-[#E8D5C8]/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
};
