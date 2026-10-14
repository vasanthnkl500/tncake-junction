import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './components/HomePage';
import { CakeGallery } from './components/CakeGallery';
import { CustomCakeConfigurator } from './components/CustomCakeConfigurator';
import { ReviewsView } from './components/ReviewsView';
import { CustomerOrdersView } from './components/CustomerOrdersView';
import { PlaceOrderView } from './components/PlaceOrderView';
import { OrderDetailsView } from './components/OrderDetailsView';
import { OwnerAdminDashboard } from './components/OwnerAdminDashboard';
import { CakeDetailModal } from './components/CakeDetailModal';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { Toast } from './components/Toast';
import { AboutFaqSection } from './components/AboutFaqSection';
import { Cake } from './types';
import { buildWhatsAppLink } from './utils/whatsapp';
import { 
  MessageCircle, 
  MapPin, 
  Phone, 
  Clock, 
  Instagram, 
  ShieldCheck, 
  Sparkles,
  Heart,
  Home,
  ShoppingBag
} from 'lucide-react';

export default function App() {
  const { 
    settings, 
    lang, 
    setLang, 
    t, 
    currentUser, 
    wishlist, 
    route, 
    navigateTo, 
    goBack, 
    toast, 
    hideToast, 
    cakes,
    setIsCartOpen,
    cartTotalCount,
    trackWhatsAppClick
  } = useApp();

  const [selectedCake, setSelectedCake] = useState<Cake | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultAdmin, setAuthDefaultAdmin] = useState(false);

  // Deep-link cake handling and cart route handling
  useEffect(() => {
    if (route.page === 'cart') {
      setIsCartOpen(true);
    }

    if ((route.page === 'cake' || route.params.cakeId) && cakes.length > 0) {
      const targetId = route.params.cakeId;
      if (targetId) {
        const found = cakes.find(c => c.id === targetId || c.slug === targetId);
        if (found) {
          setSelectedCake(found);
        }
      }
    }
  }, [route.page, route.params.cakeId, cakes, setIsCartOpen]);

  const stickyWhatsAppUrl = buildWhatsAppLink(
    settings.whatsappNumber,
    `Hello ${settings.shopName || 'Cake Junction'}, I would like to enquire about ordering a cake!`
  );

  const handleOpenLogin = (asAdmin = false) => {
    setAuthDefaultAdmin(asAdmin);
    setIsAuthModalOpen(true);
  };

  const handleCategoryNav = (cat: string) => {
    navigateTo('gallery', { category: cat });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8EF] text-[#4B2E25]">
      
      {/* Toast Notification Container */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* Primary Navigation with working Category Submenu */}
      <Navbar
        currentTab={route.page}
        setCurrentTab={(tab) => navigateTo(tab as any)}
        openLoginModal={() => handleOpenLogin(false)}
        onSelectCategoryFilter={handleCategoryNav}
      />

      {/* Store Closed Global Notification Banner */}
      {(settings.is_open === false || settings.isOpen === false) && (
        <div className="bg-amber-100/95 border-b border-amber-300 text-amber-950 px-4 py-2.5 text-xs text-center font-medium shadow-2xs flex flex-wrap items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse shrink-0 inline-block" />
          <span>
            <strong>Store Notice:</strong> {settings.closureMessage || 'Cake Junction is currently closed for new orders.'}
            {settings.reopeningTimestamp && (
              <span className="ml-1.5 font-bold text-amber-900">
                · Reopening scheduled for: {new Date(settings.reopeningTimestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {route.page === 'home' && (
          <HomePage
            onNavigateTab={(tab) => navigateTo(tab as any)}
            onSelectCake={(cake) => setSelectedCake(cake)}
          />
        )}

        {route.page === 'gallery' && (
          <CakeGallery
            onSelectCake={(cake) => setSelectedCake(cake)}
            onOpenCustomEnquiry={() => navigateTo('configurator')}
          />
        )}

        {route.page === 'cake' && (
          <CakeGallery
            onSelectCake={(cake) => setSelectedCake(cake)}
            onOpenCustomEnquiry={() => navigateTo('configurator')}
          />
        )}

        {route.page === 'order' && (
          <PlaceOrderView
            cakeId={route.params.cakeId}
          />
        )}

        {route.page === 'orders' && (
          <CustomerOrdersView />
        )}

        {route.page === 'order-detail' && (
          <OrderDetailsView
            orderId={route.params.orderId}
          />
        )}

        {route.page === 'configurator' && (
          <CustomCakeConfigurator
            onSuccessDone={() => navigateTo('home')}
          />
        )}

        {route.page === 'reviews' && (
          <ReviewsView />
        )}

        {route.page === 'admin' && (
          (currentUser.role === 'admin' || currentUser.role === 'owner') ? (
            <OwnerAdminDashboard />
          ) : (
            <div className="py-20 px-4 text-center max-w-md mx-auto">
              <ShieldCheck className="w-12 h-12 text-[#C5A15A] mx-auto mb-4" />
              <h2 className="font-serif text-2xl font-bold text-[#4B2E25]">
                Restricted Owner Area
              </h2>
              <p className="mt-2 text-xs text-[#4B2E25]/75 leading-relaxed">
                Please authenticate as the bakery owner or head pastry chef to manage cakes, reviews, orders, and payment configuration.
              </p>
              <button
                onClick={() => handleOpenLogin(true)}
                className="mt-6 px-6 py-3 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
              >
                Sign In as Owner
              </button>
            </div>
          )
        )}

        {route.page === 'about' && (
          <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Page Navigation Row */}
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-[#E8D5C8]/80 flex-wrap">
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
                Atelier Heritage & Fresh Baking Philosophy
              </span>
            </div>

            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#E8D5C8] shadow-xs">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A]">
                Our Philosophy
              </span>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#4B2E25] mt-1 mb-4">
                About {settings.shopName}
              </h1>
              <p className="text-sm text-[#4B2E25]/85 leading-relaxed mb-4">
                {settings.story}
              </p>
              <p className="text-sm text-[#4B2E25]/85 leading-relaxed">
                Every tier is baked fresh from scratch upon booking. We never freeze sponges, never compromise on Belgian chocolate purity, and work directly with families to capture the emotion of your celebratory milestones.
              </p>

              {/* Atelier contact and address info */}
              <div className="mt-8 pt-8 border-t border-[#E8D5C8]/70 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-[#4B2E25]/80">
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-[#C5A15A] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[#4B2E25]">Atelier Location</strong>
                      <span>{settings.address || 'Address configured in admin'}</span>
                      {settings.city && <span className="block text-[#4B2E25]/60">{settings.city} {settings.postalCode ? '- ' + settings.postalCode : ''}</span>}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-[#C5A15A] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[#4B2E25]">Opening Hours</strong>
                      <span>{settings.openingHours || 'Tue - Sun: 10:00 AM - 08:30 PM'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-[#C5A15A] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[#4B2E25]">Phone & WhatsApp</strong>
                      <span>{settings.whatsappNumber || settings.phone || 'Configured in admin'}</span>
                    </div>
                  </div>

                  {settings.instagramUrl && (
                    <div className="flex items-start gap-2.5">
                      <Instagram className="w-4 h-4 text-[#C5A15A] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[#4B2E25]">Instagram Portfolio</strong>
                        <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[#C5A15A] hover:underline">
                          Follow our cake decorating stories
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dedicated Customer FAQ Component */}
            <AboutFaqSection />

            {/* Bakery Policies Section */}
            <div className="bg-white rounded-3xl p-8 border border-[#E8D5C8] shadow-xs space-y-4 text-xs text-[#4B2E25]/80">
              <h2 className="font-serif text-xl font-bold text-[#4B2E25]">
                Ordering, Transport & Refund Policies
              </h2>
              <div>
                <strong className="text-[#4B2E25] block mb-1">Temperature-Controlled Transport:</strong>
                <p>{settings.deliveryTerms}</p>
              </div>
              <div>
                <strong className="text-[#4B2E25] block mb-1">Cancellation & Store Credit:</strong>
                <p>{settings.cancellationPolicy}</p>
              </div>
              <div>
                <strong className="text-[#4B2E25] block mb-1">Privacy & Data Protection:</strong>
                <p>{settings.privacyPolicy}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Accessible Sticky WhatsApp Floating Action Button */}
      {stickyWhatsAppUrl && (
        <a
          href={stickyWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 group"
          aria-label="Direct WhatsApp Enquiry"
        >
          <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">Order via WhatsApp</span>
        </a>
      )}

      {/* Accessible Cake Details Dialog with Direct Order Enquiry Form */}
      <CakeDetailModal
        cake={selectedCake}
        onClose={() => setSelectedCake(null)}
        onOpenCustomEnquiry={() => {
          setSelectedCake(null);
          navigateTo('configurator');
        }}
        onSelectRelatedCake={(related) => setSelectedCake(related)}
      />

      {/* Global Interactive Shopping Cart Drawer */}
      <CartDrawer />

      {/* Customer Phone OTP & Admin Master Login Dialog */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultAdmin={authDefaultAdmin}
        onSuccessRedirect={() => {
          if (authDefaultAdmin) {
            navigateTo('admin');
          } else {
            navigateTo('orders');
          }
        }}
      />

      {/* Floating Cart Trigger when customer has active items */}
      {cartTotalCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2.5 px-4 py-3 bg-[#4B2E25] hover:bg-[#38221B] text-white rounded-2xl shadow-xl transition-all hover:scale-105 border border-[#C5A15A]/40 animate-fade-in group"
          title={`View Cart (${cartTotalCount} items)`}
          aria-label={`Open shopping cart (${cartTotalCount} items)`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-[#C5A15A]" />
            <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#C5A15A] text-[#4B2E25] text-[10px] font-mono font-bold flex items-center justify-center leading-none">
              {cartTotalCount}
            </span>
          </div>
          <span className="text-xs font-semibold">View Cart</span>
        </button>
      )}

      {/* Floating WhatsApp Action on Customer Pages (Positioned at bottom-left so it never blocks checkout) */}
      {route.page !== 'admin' && stickyWhatsAppUrl && (
        <a
          href={stickyWhatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackWhatsAppClick}
          className="fixed bottom-6 left-6 z-40 inline-flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl transition-all hover:scale-105 border border-emerald-400/40 animate-fade-in group active:scale-95"
          title="Chat directly with our head baker on WhatsApp"
          aria-label="Chat with Bakery on WhatsApp"
        >
          <MessageCircle className="w-5 h-5 text-emerald-100 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold hidden sm:inline">WhatsApp Baker</span>
        </a>
      )}

      {/* Universal Footer */}
      <footer className="bg-[#4B2E25] text-[#FFF8EF] py-14 px-4 sm:px-6 lg:px-8 border-t border-[#38221B]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3">
            <span className="font-serif text-2xl font-bold block">{settings.shopName}</span>
            <p className="text-xs text-[#FFF8EF]/75 leading-relaxed">
              {settings.tagline}
            </p>
            <p className="text-[11px] text-[#C5A15A]">
              100% Pure Dairy Butter · Zero Artificial Additives
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A] block mb-3">
              Explore Atelier
            </span>
            <ul className="space-y-2 text-xs text-[#FFF8EF]/80">
              <li>
                <button onClick={() => navigateTo('gallery')} className="hover:text-white">
                  Signature Cakes
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('configurator')} className="hover:text-white">
                  Custom Cake Configurator
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('reviews')} className="hover:text-white">
                  Guest Reviews
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('about')} className="hover:text-white">
                  About the Baker & Atelier
                </button>
              </li>
            </ul>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A] block mb-3">
              Atelier Hours & Location
            </span>
            <p className="text-xs text-[#FFF8EF]/80 leading-relaxed">
              {settings.address || 'Address configured in owner dashboard'}
            </p>
            <p className="text-xs text-[#FFF8EF]/80 mt-2">
              {settings.openingHours}
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A] block mb-3">
              Direct Inquiries
            </span>
            <p className="text-xs text-[#FFF8EF]/80">
              WhatsApp: {settings.whatsappNumber || 'Configure in admin'}
            </p>
            <div className="pt-3">
              <button
                onClick={() => handleOpenLogin(true)}
                className="text-[11px] text-[#C5A15A] hover:underline flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Owner Dashboard Login</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-[#FFF8EF]/15 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#FFF8EF]/60 gap-4">
          <span>© 2026 {settings.shopName}. All rights reserved. Handcrafted with passion.</span>
          <div className="flex gap-4">
            <button onClick={() => navigateTo('about')} className="hover:underline">Privacy Policy</button>
            <button onClick={() => navigateTo('about')} className="hover:underline">Cancellation Terms</button>
            <button onClick={() => navigateTo('about')} className="hover:underline">Delivery Guidelines</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
