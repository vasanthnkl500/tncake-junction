import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { SlideshowSlide } from '../types';
import { buildWhatsAppLink } from '../utils/whatsapp';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Pause,
  Play
} from 'lucide-react';

interface HomepageSlideshowProps {
  onNavigateTab?: (tab: string) => void;
}

export const HomepageSlideshow: React.FC<HomepageSlideshowProps> = ({ onNavigateTab }) => {
  const { slideshowSettings, slideshowSlides, settings, navigateTo, trackWhatsAppClick } = useApp();

  // Strict rule: Display only images explicitly selected and published for the slideshow
  const activeSlides = slideshowSlides
    .filter(slide => slide.isEnabled && slide.status === 'published')
    .sort((a, b) => a.order - b.order);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Check reduced-motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Clamp current index if slides change
  useEffect(() => {
    if (activeSlides.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= activeSlides.length) {
      setCurrentIndex(0);
    }
  }, [activeSlides.length, currentIndex]);

  const handleNext = useCallback(() => {
    if (activeSlides.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % activeSlides.length);
  }, [activeSlides.length]);

  const handlePrev = useCallback(() => {
    if (activeSlides.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  // Autoplay timer
  useEffect(() => {
    const shouldAutoplay =
      slideshowSettings.autoplay &&
      activeSlides.length > 1 &&
      !isHovered &&
      !isUserInteracting &&
      !isPausedByUser &&
      !prefersReducedMotion;

    if (!shouldAutoplay) return;

    const intervalMs = Math.max(3, Math.min(15, slideshowSettings.slideIntervalSeconds || 5)) * 1000;
    const timer = setInterval(() => {
      handleNext();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    slideshowSettings.autoplay,
    slideshowSettings.slideIntervalSeconds,
    activeSlides.length,
    isHovered,
    isUserInteracting,
    isPausedByUser,
    prefersReducedMotion,
    handleNext
  ]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsUserInteracting(true);
    setTouchStartX(e.touches[0].clientX);
    setTouchDeltaX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    setTouchDeltaX(currentX - touchStartX);
  };

  const handleTouchEnd = () => {
    if (touchStartX !== null) {
      const swipeThreshold = 45;
      if (touchDeltaX < -swipeThreshold) {
        handleNext();
      } else if (touchDeltaX > swipeThreshold) {
        handlePrev();
      }
    }
    setTouchStartX(null);
    setTouchDeltaX(0);
    setTimeout(() => setIsUserInteracting(false), 500);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  // If section is disabled or no published slides exist, return clean owner fallback or null
  if (!slideshowSettings.isEnabled) {
    return null;
  }

  if (activeSlides.length === 0) {
    return null;
  }

  const currentSlide = activeSlides[currentIndex];

  const handleButtonClick = (slide: SlideshowSlide) => {
    if (!slide.buttonLink) return;
    if (slide.buttonLink === 'whatsapp') {
      const whatsappMsg = `Hello ${settings.shopName}, I am admiring your "${slide.title}" on the homepage gallery and would like to enquire about ordering!`;
      const url = buildWhatsAppLink(settings.whatsappNumber, whatsappMsg);
      if (url) {
        trackWhatsAppClick();
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } else {
      if (onNavigateTab) {
        onNavigateTab(slide.buttonLink);
      } else {
        navigateTo(slide.buttonLink as any);
      }
    }
  };

  const nextIndex = (currentIndex + 1) % activeSlides.length;
  const nextSlide = activeSlides[nextIndex];

  return (
    <section
      aria-label="Sweet Creations Gallery Slideshow"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
    >
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF8EF] border border-[#E8D5C8] text-[#C5A15A] text-xs font-semibold tracking-wider uppercase mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Atelier Showcase</span>
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#4B2E25] tracking-tight">
          {slideshowSettings.heading || 'A Glimpse of Our Sweet Creations'}
        </h2>
        {slideshowSettings.subtitle && (
          <p className="mt-1.5 text-xs sm:text-sm text-[#4B2E25]/80 font-normal">
            {slideshowSettings.subtitle}
          </p>
        )}
      </div>

      {/* Main Slideshow Container */}
      <div
        ref={containerRef}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Cake Junction Sweets Showcase"
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative bg-[#FFF8EF]/60 rounded-3xl p-3 sm:p-5 border border-[#E8D5C8] shadow-sm overflow-hidden select-none focus:outline-none focus:ring-2 focus:ring-[#C5A15A]/40"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center">
          
          {/* Main Featured Slide Stage */}
          <div className="lg:col-span-8 relative rounded-2xl overflow-hidden aspect-16/10 sm:aspect-16/9 bg-[#4B2E25]/5 border border-[#E8D5C8]/80 shadow-xs">
            {activeSlides.map((slide, idx) => {
              const isActive = idx === currentIndex;
              const isSlideTransition = slideshowSettings.transitionStyle === 'slide';

              return (
                <div
                  key={slide.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${idx + 1} of ${activeSlides.length}: ${slide.title}`}
                  aria-hidden={!isActive}
                  className={`absolute inset-0 w-full h-full transition-all duration-${slideshowSettings.transitionDurationMs || 600} ease-out ${
                    isActive
                      ? 'opacity-100 z-10 scale-100 translate-x-0'
                      : isSlideTransition
                      ? idx < currentIndex
                        ? 'opacity-0 -translate-x-8 z-0 pointer-events-none'
                        : 'opacity-0 translate-x-8 z-0 pointer-events-none'
                      : 'opacity-0 scale-98 z-0 pointer-events-none'
                  }`}
                  style={{
                    transitionDuration: prefersReducedMotion ? '0ms' : `${slideshowSettings.transitionDurationMs || 600}ms`
                  }}
                >
                  <img
                    src={slide.imageUrl}
                    alt={slide.altText || slide.title}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    className="w-full h-full object-cover rounded-2xl"
                  />

                  {/* Gradient Overlay for Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#261510]/85 via-[#261510]/30 to-transparent pointer-events-none" />

                  {/* Floating Content / Caption on Image */}
                  {slideshowSettings.showCaptions && (
                    <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-3 pointer-events-auto">
                      <div className="space-y-1 max-w-lg">
                        <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-medium tracking-wide uppercase text-[#FDEBD0] border border-white/20">
                          Handcrafted Atelier Bake
                        </div>
                        <h3 className="font-serif text-lg sm:text-xl md:text-2xl font-bold text-white drop-shadow-xs">
                          {slide.title}
                        </h3>
                        {slide.caption && (
                          <p className="text-xs sm:text-sm text-white/90 line-clamp-2 leading-relaxed drop-shadow-xs">
                            {slide.caption}
                          </p>
                        )}
                      </div>

                      {/* Optional Action Button */}
                      {slide.buttonLabel && (
                        <div className="shrink-0 pt-1 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => handleButtonClick(slide)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-5 sm:py-2.5 text-xs font-semibold text-[#4B2E25] bg-[#FFF8EF] hover:bg-white rounded-xl shadow-xs transition-all active:scale-95 border border-[#E8D5C8]"
                          >
                            {slide.buttonLink === 'whatsapp' ? (
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-[#C5A15A]" />
                            )}
                            <span>{slide.buttonLabel}</span>
                            <ArrowRight className="w-3 h-3 text-[#4B2E25]/70" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Navigation Arrows on Slide */}
            {slideshowSettings.showArrows && activeSlides.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous cake slide"
                  onClick={handlePrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs flex items-center justify-center transition-all border border-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next cake slide"
                  onClick={handleNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-xs flex items-center justify-center transition-all border border-white/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </>
            )}

            {/* Slide Counter Overlay */}
            {slideshowSettings.showCounter && (
              <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-xs text-[11px] font-medium text-white/95 border border-white/20 tracking-wider">
                {currentIndex + 1} / {activeSlides.length}
              </div>
            )}
          </div>

          {/* Desktop Right Column: Subtle Preview Peek & Thumbnail List (4 Cols) */}
          <div className="hidden lg:flex lg:col-span-4 flex-col justify-between h-full space-y-3">
            {slideshowSettings.desktopLayout === 'featured_with_peek' && nextSlide && (
              <div 
                onClick={handleNext}
                className="group cursor-pointer bg-white rounded-2xl p-3 border border-[#E8D5C8] shadow-2xs hover:border-[#C5A15A] transition-all"
              >
                <div className="flex items-center justify-between text-xs text-[#4B2E25]/60 mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px] text-[#C5A15A]">Up Next</span>
                  <span className="text-[11px] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 text-[#4B2E25]">
                    Peek <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="relative rounded-xl overflow-hidden aspect-16/9 bg-[#F4D8D8]/20 border border-[#E8D5C8]">
                  <img
                    src={nextSlide.imageUrl}
                    alt={nextSlide.altText || nextSlide.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5 text-white">
                    <p className="font-serif text-xs font-bold truncate">{nextSlide.title}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Thumbnail Pills List */}
            <div className="bg-white/80 rounded-2xl p-3 border border-[#E8D5C8] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#4B2E25] uppercase tracking-wider">
                  Featured Bakes ({activeSlides.length})
                </span>
                {slideshowSettings.autoplay && (
                  <button
                    type="button"
                    onClick={() => setIsPausedByUser(!isPausedByUser)}
                    aria-label={isPausedByUser ? "Resume autoplay" : "Pause autoplay"}
                    className="p-1 rounded-md text-[#4B2E25]/60 hover:text-[#4B2E25] hover:bg-[#FFF8EF] transition-colors"
                  >
                    {isPausedByUser ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {activeSlides.map((slide, idx) => {
                  const isSelected = idx === currentIndex;
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-full text-left flex items-center gap-2 p-1.5 rounded-xl text-xs transition-all ${
                        isSelected
                          ? 'bg-[#4B2E25] text-white font-medium shadow-2xs'
                          : 'bg-[#FFF8EF]/50 hover:bg-[#FFF8EF] text-[#4B2E25]/80'
                      }`}
                    >
                      <img
                        src={slide.imageUrl}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-black/10"
                      />
                      <span className="truncate flex-1 text-[11px]">{slide.title}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C5A15A] shrink-0 mr-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Navigation Bar: Pagination Dots and Controls */}
        <div className="mt-3 sm:mt-4 flex items-center justify-between px-1">
          {/* Pause indicator / Hover feedback */}
          <div className="text-[11px] text-[#4B2E25]/60 flex items-center gap-1.5">
            {isHovered ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#C5A15A] font-medium">
                <Pause className="w-2.5 h-2.5" /> Autoplay paused on hover
              </span>
            ) : isPausedByUser ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                <Pause className="w-2.5 h-2.5" /> Paused
              </span>
            ) : prefersReducedMotion ? (
              <span className="text-[10px] text-[#4B2E25]/50">Static (Reduced Motion)</span>
            ) : (
              <span className="text-[10px] text-[#4B2E25]/50">Autoplays every {slideshowSettings.slideIntervalSeconds || 5}s</span>
            )}
          </div>

          {/* Pagination Dots */}
          {slideshowSettings.showPaginationDots && activeSlides.length > 1 && (
            <div
              role="tablist"
              aria-label="Slideshow pagination"
              className="flex items-center gap-1.5"
            >
              {activeSlides.map((slide, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={slide.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-1 focus:ring-[#4B2E25] ${
                      isActive
                        ? 'w-6 bg-[#4B2E25]'
                        : 'w-2 bg-[#4B2E25]/25 hover:bg-[#4B2E25]/50'
                    }`}
                  />
                );
              })}
            </div>
          )}

          {/* Quick Counter for mobile */}
          <div className="text-[11px] font-medium text-[#4B2E25]/70 lg:hidden">
            {currentIndex + 1} / {activeSlides.length}
          </div>
        </div>
      </div>
    </section>
  );
};
