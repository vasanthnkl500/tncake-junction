import React from 'react';
import { Cake } from '../types';
import { useApp } from '../context/AppContext';
import { formatIndianCurrency } from '../utils/whatsapp';
import { Heart, ShoppingBag, Plus } from 'lucide-react';

interface CakeCardProps {
  cake: Cake;
  onSelect: () => void;
}

export const CakeCard: React.FC<CakeCardProps> = ({ cake, onSelect }) => {
  const { t, isWishlisted, toggleWishlist, addToCart, setIsCartOpen, settings } = useApp();

  const primaryImage = cake.images.find(img => img.isPrimary) || cake.images[0] || {
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    alt: cake.name
  };

  const startingPrice = cake.weightOptions && cake.weightOptions.length > 0
    ? cake.weightOptions[0].price
    : null;

  const availabilityText = {
    available_now: t.avail_available_now,
    made_to_order: t.avail_made_to_order,
    temporarily_unavailable: t.avail_temporarily_unavailable,
    sold_out: t.avail_sold_out
  }[cake.availability];

  const wishlisted = isWishlisted(cake.id);

  return (
    <div 
      onClick={onSelect}
      className="group cursor-pointer flex flex-col bg-white rounded-3xl overflow-hidden border border-[#E8D5C8]/80 shadow-xs card-hover-lift relative animate-fade-in"
    >
      {/* Visual Slot */}
      <div className="relative aspect-4/3 w-full bg-[#F4D8D8]/20 overflow-hidden">
        <img
          src={primaryImage.url}
          alt={primaryImage.alt || cake.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Wishlist Heart Icon (LocalStorage client state, no forced login) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWishlist(cake.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-xs ${
            wishlisted
              ? 'bg-red-50 text-red-600'
              : 'bg-white/80 text-[#4B2E25]/70 hover:bg-white hover:text-red-600'
          }`}
          title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-red-600' : ''}`} />
        </button>

        {/* Quiet status indicators */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
          {cake.availability === 'sold_out' && (
            <span className="px-2.5 py-0.5 bg-rose-700 text-white text-[10px] font-bold rounded-md shadow-xs uppercase tracking-wider">
              Sold Out
            </span>
          )}
          {cake.availability === 'temporarily_unavailable' && (
            <span className="px-2.5 py-0.5 bg-amber-700 text-white text-[10px] font-bold rounded-md shadow-xs uppercase tracking-wider">
              Currently Unavailable
            </span>
          )}
          {cake.isEgglessOption && (
            <span className="px-2 py-0.5 bg-white/90 backdrop-blur-xs text-emerald-800 text-[11px] font-semibold rounded-md shadow-xs">
              Eggless
            </span>
          )}
          {cake.isFeatured && (
            <span className="px-2 py-0.5 bg-[#4B2E25]/90 text-[#FFF8EF] text-[11px] font-medium rounded-md shadow-xs">
              Chef's Pick
            </span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex flex-col justify-between flex-1">
        <div>
          {/* Metadata with typographic separators - zero pill discipline */}
          <div className="flex items-center gap-2 text-xs text-[#4B2E25]/60 mb-1.5">
            <span>{cake.category}</span>
            <span aria-hidden="true">·</span>
            <span>{availabilityText}</span>
          </div>

          <h3 className="font-serif text-lg font-bold text-[#4B2E25] group-hover:text-[#C5A15A] transition-colors line-clamp-1">
            {cake.name}
          </h3>

          <p className="mt-1 text-xs text-[#4B2E25]/75 line-clamp-2 leading-relaxed">
            {cake.description}
          </p>
        </div>

        {/* Pricing baseline & Add to Cart */}
        <div className="mt-4 pt-3 border-t border-[#E8D5C8]/50 flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] text-[#4B2E25]/60 block leading-tight">
              {startingPrice ? t.from_price : ''}
            </span>
            <span className="text-sm font-bold font-mono tabular-nums text-[#4B2E25]">
              {startingPrice ? formatIndianCurrency(startingPrice) : t.contact_for_price}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {cake.isPublished !== false && cake.availability !== 'sold_out' && cake.availability !== 'temporarily_unavailable' && (settings.is_open !== false && settings.isOpen !== false) && startingPrice && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const firstOpt = cake.weightOptions[0] || { weight: '1.0 kg', price: startingPrice };
                  addToCart({
                    cakeId: cake.id,
                    cakeName: cake.name,
                    imageUrl: primaryImage.url,
                    category: cake.category,
                    weight: firstOpt.weight,
                    flavour: cake.flavours?.[0] || 'Signature Sponge',
                    unitPrice: firstOpt.price || startingPrice,
                    quantity: 1,
                    isEggless: cake.isEgglessOption ?? true
                  });
                  setIsCartOpen(true);
                }}
                className="p-2 rounded-xl bg-[#C5A15A] hover:bg-[#b08e48] text-white transition-colors shadow-2xs group/btn"
                title={`Add ${cake.name} to Cart`}
                aria-label={`Add ${cake.name} to Cart`}
              >
                <ShoppingBag className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              </button>
            )}

            <span className="text-xs font-semibold text-[#4B2E25] group-hover:underline whitespace-nowrap">
              View Details →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
