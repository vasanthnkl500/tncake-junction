import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Cake } from '../types';
import { CakeCard } from './CakeCard';
import { Search, Heart, Sparkles, Filter } from 'lucide-react';

interface CakeGalleryProps {
  onSelectCake: (cake: Cake) => void;
  onOpenCustomEnquiry: () => void;
}

export const CakeGallery: React.FC<CakeGalleryProps> = ({
  onSelectCake,
  onOpenCustomEnquiry
}) => {
  const { cakes, wishlist, t, route } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return route.params.category || 'all';
  });
  const [selectedOccasion, setSelectedOccasion] = useState<string>('all');
  const [selectedColour, setSelectedColour] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest');
  const [showOnlyWishlist, setShowOnlyWishlist] = useState(false);

  // Sync when route params change (e.g. clicking category in navbar or footer)
  React.useEffect(() => {
    if (route.params.category) {
      setSelectedCategory(route.params.category);
    }
  }, [route.params.category]);

  // Filter taxonomies
  const categories = ['all', 'Birthday', 'Wedding', 'Anniversary', 'Custom Cakes', 'Cupcakes', 'Eggless'];
  const occasions = ['all', 'Birthday', 'Wedding', 'Anniversary', 'Engagement', 'Baby Shower'];
  const colours = ['all', 'Blush Pink', 'Pastel Cream', 'Royal Gold', 'Dark Chocolate'];

  const publishedCakes = cakes.filter(c => c.isPublished && c.status !== 'archived' && c.status !== 'draft');

  const filteredCakes = publishedCakes.filter(cake => {
    if (showOnlyWishlist && !wishlist.includes(cake.id)) return false;

    const matchesCategory = selectedCategory === 'all' || cake.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesOccasion = selectedOccasion === 'all' || cake.occasions?.some(o => o.toLowerCase() === selectedOccasion.toLowerCase());
    const matchesColour = selectedColour === 'all' || cake.colourThemes?.some(c => c.toLowerCase() === selectedColour.toLowerCase());

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      cake.name.toLowerCase().includes(query) ||
      cake.description.toLowerCase().includes(query) ||
      cake.flavours.some(f => f.toLowerCase().includes(query)) ||
      cake.category.toLowerCase().includes(query);

    return matchesCategory && matchesOccasion && matchesColour && matchesSearch;
  });

  const sortedCakes = [...filteredCakes].sort((a, b) => {
    if (sortBy === 'price_asc') {
      const priceA = a.weightOptions[0]?.price || 0;
      const priceB = b.weightOptions[0]?.price || 0;
      return priceA - priceB;
    }
    if (sortBy === 'price_desc') {
      const priceA = a.weightOptions[0]?.price || 0;
      const priceB = b.weightOptions[0]?.price || 0;
      return priceB - priceA;
    }
    if (sortBy === 'popular') {
      return (b.viewCount || 0) - (a.viewCount || 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Title & Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#4B2E25] tracking-tight text-balance">
          Our Handcrafted Cake Collection
        </h1>
        <p className="mt-3 text-[#4B2E25]/75 text-base sm:text-lg">
          Explore artisanal recipes filtered by occasion, bespoke flavours, and colour palettes.
        </p>
      </div>

      {/* Search, Filter Bar and Wishlist Toggle */}
      <div className="space-y-4 mb-10">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B2E25]/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, chocolate, rose, pistachio, eggless..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-[#E8D5C8] text-xs sm:text-sm text-[#4B2E25] placeholder:text-[#4B2E25]/45 focus:outline-hidden focus:ring-2 focus:ring-[#C5A15A]"
            />
          </div>

          {/* Right controls: Wishlist & Sort */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* Wishlist filter toggle */}
            <button
              onClick={() => setShowOnlyWishlist(!showOnlyWishlist)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                showOnlyWishlist
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-white text-[#4B2E25] border-[#E8D5C8] hover:bg-[#FFF8EF]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${showOnlyWishlist ? 'fill-red-600' : ''}`} />
              <span>Wishlist ({wishlist.length})</span>
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white text-xs font-medium text-[#4B2E25] py-2 px-3 border border-[#E8D5C8] rounded-xl focus:outline-hidden"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#4B2E25] text-white shadow-xs'
                  : 'bg-white/80 text-[#4B2E25]/75 hover:bg-white border border-[#E8D5C8]'
              }`}
            >
              {cat === 'all' ? t.filter_all : cat}
            </button>
          ))}
        </div>

        {/* Secondary Occasion & Colour Theme Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#4B2E25]/70">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[#4B2E25]">Occasion:</span>
            <select
              value={selectedOccasion}
              onChange={(e) => setSelectedOccasion(e.target.value)}
              className="bg-white/80 text-xs px-2 py-1 rounded-lg border border-[#E8D5C8]"
            >
              {occasions.map(o => (
                <option key={o} value={o}>{o === 'all' ? 'All Occasions' : o}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-medium text-[#4B2E25]">Colour Theme:</span>
            <select
              value={selectedColour}
              onChange={(e) => setSelectedColour(e.target.value)}
              className="bg-white/80 text-xs px-2 py-1 rounded-lg border border-[#E8D5C8]"
            >
              {colours.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All Palettes' : c}</option>
              ))}
            </select>
          </div>

          {(selectedCategory !== 'all' || selectedOccasion !== 'all' || selectedColour !== 'all' || searchQuery || showOnlyWishlist) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedOccasion('all');
                setSelectedColour('all');
                setSearchQuery('');
                setShowOnlyWishlist(false);
              }}
              className="text-xs text-[#C5A15A] hover:underline ml-auto font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Grid of Cakes */}
      {sortedCakes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {sortedCakes.map(cake => (
            <CakeCard 
              key={cake.id} 
              cake={cake} 
              onSelect={() => onSelectCake(cake)} 
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-white/60 rounded-3xl border border-[#E8D5C8] p-8 max-w-lg mx-auto">
          <p className="font-serif text-lg font-semibold text-[#4B2E25]">No matching cakes found</p>
          <p className="mt-1 text-xs text-[#4B2E25]/70">
            {showOnlyWishlist 
              ? 'Your wishlist is currently empty. Tap the heart on any cake to save it!' 
              : 'Try relaxing your filter criteria or use our custom cake configurator.'}
          </p>
          <button
            onClick={onOpenCustomEnquiry}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C5A15A]" />
            <span>Design Custom Cake in Configurator</span>
          </button>
        </div>
      )}
    </div>
  );
};
