import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PageRoute } from '../utils/router';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { 
  Menu, 
  X, 
  Home,
  MessageCircle, 
  ShoppingBag, 
  User, 
  ShieldCheck, 
  ChevronDown,
  ExternalLink,
  LogOut,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openLoginModal: (asAdmin?: boolean) => void;
  onSelectCategoryFilter?: (category: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentTab, 
  setCurrentTab,
  openLoginModal,
  onSelectCategoryFilter
}) => {
  const { 
    settings, 
    lang, 
    setLang, 
    t, 
    currentUser, 
    logout, 
    navigateTo,
    cartTotalCount,
    setIsCartOpen
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cakesDropdownOpen, setCakesDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

  const whatsappUrl = buildWhatsAppLink(
    settings.whatsappNumber,
    `Hello ${settings.shopName || 'Cake Junction'}, I would like to enquire about ordering a handcrafted cake!`
  );

  const cakeCategories = [
    { label: 'All Signature Cakes', id: 'all' },
    { label: 'Birthday Cakes', id: 'Birthday' },
    { label: 'Wedding Tiers', id: 'Wedding' },
    { label: 'Anniversary Cakes', id: 'Anniversary' },
    { label: 'Bespoke Custom Tiers', id: 'Custom Cakes' },
    { label: '100% Eggless Bakes', id: 'Eggless' },
  ];

  const handleNavClick = (tabId: PageRoute) => {
    navigateTo(tabId);
    setMobileMenuOpen(false);
    setCakesDropdownOpen(false);
    setAdminDropdownOpen(false);
  };

  const handleCategoryClick = (catId: string) => {
    if (onSelectCategoryFilter) {
      onSelectCategoryFilter(catId);
    }
    navigateTo('gallery', { category: catId });
    setMobileMenuOpen(false);
    setCakesDropdownOpen(false);
  };

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'owner';

  return (
    <>
      {/* Unobtrusive Admin Shortcut Banner for authenticated owner on public website */}
      {isAdmin && currentTab !== 'admin' && (
        <div className="bg-[#4B2E25] text-[#FFF8EF] py-1.5 px-4 text-xs font-medium border-b border-[#38221B] flex items-center justify-between z-50">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A15A]" />
              <span>Owner Mode Active · You are viewing the public storefront</span>
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNavClick('admin')}
                className="inline-flex items-center gap-1 text-[#C5A15A] hover:underline font-semibold"
              >
                <span>Return to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={logout}
                className="text-white/70 hover:text-white text-[11px]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[#FFF8EF]/95 backdrop-blur-md border-b border-[#E8D5C8]/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-6">
            
            {/* Zone 1: Brand Logo / Wordmark */}
            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={() => handleNavClick('home')}
                className="flex items-center gap-2.5 text-left group transition-transform active:scale-98"
                aria-label="Return to Cake Junction Homepage"
              >
                {settings.logoUrl ? (
                  <img 
                    src={settings.logoUrl} 
                    alt={settings.logoAlt || settings.shopName || 'Cake Junction'} 
                    className="h-11 w-11 object-contain rounded-full border border-[#E8D5C8]"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-[#4B2E25] text-[#FFF8EF] flex items-center justify-center font-serif text-lg font-bold shadow-xs">
                    CJ
                  </div>
                )}
                <div>
                  <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#4B2E25] whitespace-nowrap block leading-tight">
                    {settings.shopName || 'Cake Junction'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[#C5A15A] font-semibold block">
                    Made Fresh for You
                  </span>
                </div>
              </button>
            </div>

            {/* Zone 2: Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/85">
              <button
                onClick={() => handleNavClick('home')}
                className={`whitespace-nowrap transition-colors relative py-1.5 inline-flex items-center gap-1.5 ${
                  currentTab === 'home' ? 'text-[#4B2E25] font-bold' : 'text-[#4B2E25]/75 hover:text-[#4B2E25]'
                }`}
                title="Return to Homepage"
              >
                <Home className="w-3.5 h-3.5 text-[#C5A15A]" />
                <span>Home</span>
                {currentTab === 'home' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C5A15A] rounded-full" />}
              </button>

              {/* Cakes Menu with Categories Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setCakesDropdownOpen(true)}
                onMouseLeave={() => setCakesDropdownOpen(false)}
              >
                <button
                  onClick={() => handleCategoryClick('all')}
                  className={`whitespace-nowrap transition-colors inline-flex items-center gap-1 py-1.5 ${
                    currentTab === 'gallery' ? 'text-[#4B2E25] font-bold' : 'text-[#4B2E25]/75 hover:text-[#4B2E25]'
                  }`}
                >
                  <span>Cakes & Menus</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#C5A15A]" />
                  {currentTab === 'gallery' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C5A15A] rounded-full" />}
                </button>

                {cakesDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-2xl shadow-xl border border-[#E8D5C8] p-2 space-y-1 animate-fade-in z-50">
                    {cakeCategories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id)}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-[#4B2E25] hover:bg-[#FFF8EF] rounded-xl transition-colors block"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleNavClick('configurator')}
                className={`whitespace-nowrap transition-colors relative py-1.5 ${
                  currentTab === 'configurator' ? 'text-[#4B2E25] font-bold' : 'text-[#4B2E25]/75 hover:text-[#4B2E25]'
                }`}
              >
                Custom Enquiry
                {currentTab === 'configurator' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C5A15A] rounded-full" />}
              </button>

              <button
                onClick={() => handleNavClick('reviews')}
                className={`whitespace-nowrap transition-colors relative py-1.5 ${
                  currentTab === 'reviews' ? 'text-[#4B2E25] font-bold' : 'text-[#4B2E25]/75 hover:text-[#4B2E25]'
                }`}
              >
                Guest Reviews
                {currentTab === 'reviews' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C5A15A] rounded-full" />}
              </button>

              <button
                onClick={() => handleNavClick('about')}
                className={`whitespace-nowrap transition-colors relative py-1.5 ${
                  currentTab === 'about' ? 'text-[#4B2E25] font-bold' : 'text-[#4B2E25]/75 hover:text-[#4B2E25]'
                }`}
              >
                About & Contact
                {currentTab === 'about' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C5A15A] rounded-full animate-fade-in" />}
              </button>

              <button
                onClick={() => handleNavClick('orders')}
                className={`whitespace-nowrap transition-colors relative py-1.5 ${
                  currentTab === 'orders' ? 'text-[#4B2E25] font-bold' : 'text-[#4B2E25]/75 hover:text-[#4B2E25]'
                }`}
              >
                My Orders
                {currentTab === 'orders' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C5A15A] rounded-full animate-fade-in" />}
              </button>
            </nav>

            {/* Zone 3: Desktop Actions Bar */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              {/* Shopping Cart Button with Animated Counter Badge */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#4B2E25] bg-white hover:bg-[#FFF8EF] rounded-xl border border-[#E8D5C8] transition-all shadow-2xs hover:shadow-xs group active:scale-97"
                aria-label={`Open shopping cart (${cartTotalCount} items)`}
                title="View Shopping Cart"
              >
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 text-[#C5A15A] group-hover:scale-110 transition-transform duration-200" />
                  {cartTotalCount > 0 && (
                    <span 
                      key={cartTotalCount}
                      className="absolute -top-2 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#4B2E25] text-white text-[10px] font-mono font-bold flex items-center justify-center leading-none animate-badge-bounce shadow-xs"
                    >
                      {cartTotalCount}
                    </span>
                  )}
                </div>
                <span>Cart</span>
                {cartTotalCount > 0 && (
                  <span className="text-[11px] font-mono font-bold text-[#C5A15A] animate-fade-in">
                    ({cartTotalCount})
                  </span>
                )}
              </button>

              {/* Direct WhatsApp Action */}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-950 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-700" />
                  <span>WhatsApp</span>
                </a>
              )}

              {/* User / Owner Authentication Button */}
              {isAdmin ? (
                <div 
                  className="relative"
                  onMouseEnter={() => setAdminDropdownOpen(true)}
                  onMouseLeave={() => setAdminDropdownOpen(false)}
                >
                  <button
                    onClick={() => handleNavClick('admin')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-all shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C5A15A]" />
                    <span>Dashboard</span>
                    <ChevronDown className="w-3 h-3 text-[#C5A15A]" />
                  </button>

                  {adminDropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-[#E8D5C8] p-2 space-y-1 animate-fade-in z-50">
                      <button
                        onClick={() => handleNavClick('admin')}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-[#4B2E25] hover:bg-[#FFF8EF] rounded-xl transition-colors flex items-center gap-2"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#C5A15A]" />
                        <span>Owner Dashboard</span>
                      </button>
                      <button
                        onClick={() => handleNavClick('home')}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-[#4B2E25] hover:bg-[#FFF8EF] rounded-xl transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#4B2E25]/60" />
                        <span>View Storefront</span>
                      </button>
                      <button
                        onClick={logout}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-600" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : currentUser.role === 'customer' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNavClick('orders')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#4B2E25] bg-white rounded-xl border border-[#E8D5C8] shadow-2xs hover:bg-[#FFF8EF]"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-[#C5A15A]" />
                    <span>My Orders</span>
                  </button>
                  <button
                    onClick={logout}
                    className="px-2.5 py-1.5 text-xs text-[#4B2E25]/70 hover:text-red-700"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openLoginModal(false)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#4B2E25] bg-white hover:bg-[#FFF8EF] rounded-xl border border-[#E8D5C8] transition-colors shadow-2xs"
                  >
                    <User className="w-3.5 h-3.5 text-[#4B2E25]/80" />
                    <span>Sign In</span>
                  </button>

                  <button
                    onClick={() => openLoginModal(true)}
                    className="px-2.5 py-2 text-[11px] font-medium text-[#4B2E25]/60 hover:text-[#4B2E25] transition-colors"
                    title="Bakery Owner / Admin Login"
                  >
                    Admin
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Actions: Home, Cart with badge, and Hamburger */}
            <div className="flex items-center gap-1 sm:gap-2 lg:hidden">
              {/* Mobile Home Button */}
              <button
                onClick={() => handleNavClick('home')}
                className={`p-2 rounded-xl transition-colors ${
                  currentTab === 'home' ? 'bg-[#4B2E25] text-white shadow-xs' : 'text-[#4B2E25] hover:bg-[#E8D5C8]/40'
                }`}
                title="Go to Home"
                aria-label="Go to Home"
              >
                <Home className="w-5 h-5" />
              </button>

              {/* Mobile Cart Button with Live Badge */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-[#4B2E25] hover:bg-[#E8D5C8]/40 rounded-xl transition-colors"
                title="Shopping Cart"
                aria-label={`Open shopping cart (${cartTotalCount} items)`}
              >
                <ShoppingBag className="w-5 h-5" />
                {cartTotalCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-[#4B2E25] text-white text-[10px] font-mono font-bold flex items-center justify-center leading-none shadow-xs">
                    {cartTotalCount}
                  </span>
                )}
              </button>

              {/* Mobile Hamburger Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-[#4B2E25] hover:bg-[#E8D5C8]/40 rounded-xl transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-[#E8D5C8] bg-[#FFF8EF] px-4 pt-3 pb-6 space-y-4 animate-fade-in shadow-xl">
            <div className="flex flex-col space-y-1">
              <button
                onClick={() => handleNavClick('home')}
                className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                  currentTab === 'home' ? 'bg-[#F4D8D8]/60 text-[#4B2E25]' : 'text-[#4B2E25]/80'
                }`}
              >
                <Home className="w-4 h-4 text-[#C5A15A]" />
                <span>Home</span>
              </button>

              {/* Cart link in Mobile Drawer */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsCartOpen(true);
                }}
                className="text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-[#4B2E25]/80 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#C5A15A]" />
                  <span>My Cart</span>
                </span>
                {cartTotalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#4B2E25] text-white font-mono text-[11px] font-bold">
                    {cartTotalCount}
                  </span>
                )}
              </button>

              {/* Expandable Categories in Mobile */}
              <div className="pl-3 py-1 space-y-1 border-l-2 border-[#E8D5C8]/60 my-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A15A] block px-2 mb-1">
                  Cake Categories
                </span>
                {cakeCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className="w-full text-left px-2 py-2 text-xs text-[#4B2E25]/85 hover:text-[#4B2E25] block rounded-lg hover:bg-white/50"
                  >
                    • {cat.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleNavClick('configurator')}
                className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider ${
                  currentTab === 'configurator' ? 'bg-[#F4D8D8]/60 text-[#4B2E25]' : 'text-[#4B2E25]/80'
                }`}
              >
                Custom Cake Enquiry
              </button>

              <button
                onClick={() => handleNavClick('reviews')}
                className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider ${
                  currentTab === 'reviews' ? 'bg-[#F4D8D8]/60 text-[#4B2E25]' : 'text-[#4B2E25]/80'
                }`}
              >
                Guest Reviews
              </button>

              <button
                onClick={() => handleNavClick('about')}
                className={`text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider ${
                  currentTab === 'about' ? 'bg-[#F4D8D8]/60 text-[#4B2E25]' : 'text-[#4B2E25]/80'
                }`}
              >
                About Us & Contact
              </button>
            </div>

            <div className="pt-3 border-t border-[#E8D5C8] flex flex-col gap-2">
              {isAdmin ? (
                <div className="space-y-2">
                  <button
                    onClick={() => handleNavClick('admin')}
                    className="flex items-center justify-center gap-2 w-full py-3 text-xs font-semibold text-white bg-[#4B2E25] rounded-xl shadow-xs"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#C5A15A]" />
                    <span>Owner Admin Dashboard</span>
                  </button>
                  <button
                    onClick={logout}
                    className="w-full text-center text-xs py-2 text-red-700"
                  >
                    Sign Out
                  </button>
                </div>
              ) : currentUser.role === 'customer' ? (
                <div className="space-y-2">
                  <button
                    onClick={() => handleNavClick('orders')}
                    className="flex items-center justify-center gap-2 w-full py-3 text-xs font-medium text-[#4B2E25] bg-white border border-[#E8D5C8] rounded-xl shadow-2xs"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#C5A15A]" />
                    <span>My Orders & UPI Status</span>
                  </button>
                  <button
                    onClick={logout}
                    className="w-full text-center text-xs py-2 text-red-700"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setMobileMenuOpen(false); openLoginModal(false); }}
                    className="flex-1 py-2.5 text-xs font-semibold text-[#4B2E25] bg-white border border-[#E8D5C8] rounded-xl text-center shadow-2xs"
                  >
                    Customer Login
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); openLoginModal(true); }}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] rounded-xl"
                  >
                    Admin Login
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
};
