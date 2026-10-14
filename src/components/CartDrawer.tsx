import React from 'react';
import { useApp } from '../context/AppContext';
import { formatIndianCurrency } from '../utils/whatsapp';
import { 
  X, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  Home, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const { 
    cart, 
    isCartOpen, 
    setIsCartOpen, 
    updateCartItemQuantity, 
    removeFromCart, 
    clearCart, 
    cartTotalCount, 
    cartSubtotal,
    settings,
    navigateTo,
    setOrderFormData
  } = useApp();

  if (!isCartOpen) return null;

  const isShopOpen = settings.is_open !== false && settings.isOpen !== false;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsCartOpen(false);

    // Prepopulate the order draft form with the primary cart item details
    const firstItem = cart[0];
    setOrderFormData(prev => ({
      ...prev,
      cakeId: firstItem.cakeId,
      weight: firstItem.weight,
      flavour: firstItem.flavour,
      quantity: firstItem.quantity,
      isEggless: firstItem.isEggless,
      cakeMessage: firstItem.cakeMessage || prev.cakeMessage,
      specialInstructions: cart.length > 1 
        ? `Cart includes ${cart.length} creations:\n` + cart.map((item, idx) => `${idx + 1}. ${item.cakeName} (${item.weight}, ${item.flavour}, Qty: ${item.quantity}${item.isEggless ? ', Eggless' : ''}${item.cakeMessage ? ', Msg: ' + item.cakeMessage : ''})`).join('\n')
        : prev.specialInstructions
    }));

    navigateTo('order', { cakeId: firstItem.cakeId });
  };

  const handleGoHome = () => {
    setIsCartOpen(false);
    navigateTo('home');
  };

  const handleBrowseCakes = () => {
    setIsCartOpen(false);
    navigateTo('gallery');
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={() => setIsCartOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart Drawer"
    >
      <div 
        className="fixed inset-y-0 right-0 max-w-full flex pl-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-screen max-w-md bg-[#FFF8EF] border-l border-[#E8D5C8] shadow-2xl flex flex-col justify-between">
          
          {/* Header */}
          <div className="p-5 sm:p-6 bg-white border-b border-[#E8D5C8] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FFF8EF] border border-[#E8D5C8] text-[#4B2E25]">
                <ShoppingBag className="w-5 h-5 text-[#C5A15A]" />
              </div>
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#4B2E25] flex items-center gap-2">
                  <span>Your Cart</span>
                  {cartTotalCount > 0 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-[#4B2E25] text-white font-mono font-semibold">
                      {cartTotalCount}
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-[#4B2E25]/60 mt-0.5">
                  Handcrafted fresh to order · Cake Junction
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleGoHome}
                className="p-2 text-[#4B2E25]/70 hover:text-[#4B2E25] hover:bg-[#FFF8EF] rounded-xl transition-colors"
                title="Go to Homepage"
                aria-label="Go to Homepage"
              >
                <Home className="w-5 h-5 text-[#C5A15A]" />
              </button>

              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-[#4B2E25]/70 hover:text-[#4B2E25] hover:bg-[#FFF8EF] rounded-xl transition-colors"
                title="Close Cart"
                aria-label="Close Cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            
            {/* Store Closed Warning Banner if applicable */}
            {!isShopOpen && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Orders Currently Paused:</strong>
                  <span>{settings.closureMessage || 'Our bakery is currently not accepting new bookings.'}</span>
                </div>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white border border-[#E8D5C8] flex items-center justify-center mx-auto text-[#C5A15A] shadow-xs">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-bold text-[#4B2E25]">
                    Your Cart is Empty
                  </h3>
                  <p className="text-xs text-[#4B2E25]/70 max-w-xs mx-auto leading-relaxed">
                    Explore our artisanal sponge tiers, bespoke celebration cakes, and seasonal creations.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    onClick={handleBrowseCakes}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-2xs"
                  >
                    Browse Signature Cakes
                  </button>
                  <button
                    onClick={handleGoHome}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-[#4B2E25] bg-white hover:bg-[#FFF8EF] border border-[#E8D5C8] rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Home className="w-3.5 h-3.5 text-[#C5A15A]" />
                    <span>Return Home</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#4B2E25]/70 pb-2 border-b border-[#E8D5C8]/70">
                  <span>Items ({cartTotalCount})</span>
                  <button
                    onClick={clearCart}
                    className="text-red-700 hover:text-red-900 text-[11px] font-medium transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                {cart.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-white rounded-2xl p-3.5 border border-[#E8D5C8] shadow-xs flex gap-3.5 items-start"
                  >
                    <img 
                      src={item.imageUrl} 
                      alt={item.cakeName} 
                      className="w-16 h-16 object-cover rounded-xl border border-[#E8D5C8]/80 shrink-0" 
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-serif text-sm font-bold text-[#4B2E25] truncate">
                          {item.cakeName}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-[#4B2E25]/50 hover:text-red-700 transition-colors p-1"
                          title="Remove item"
                          aria-label={`Remove ${item.cakeName} from cart`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-[#4B2E25]/70">
                        <span className="font-medium bg-[#FFF8EF] px-1.5 py-0.5 rounded border border-[#E8D5C8]">
                          {item.weight}
                        </span>
                        <span>·</span>
                        <span>{item.flavour}</span>
                        {item.isEggless && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-800 font-semibold">Eggless</span>
                          </>
                        )}
                      </div>

                      {item.cakeMessage && (
                        <p className="mt-1 text-[11px] text-[#4B2E25]/80 italic bg-[#FFF8EF]/80 px-2 py-0.5 rounded border border-[#E8D5C8]/60 line-clamp-1">
                          "{item.cakeMessage}"
                        </p>
                      )}

                      <div className="mt-2.5 pt-2 border-t border-[#E8D5C8]/50 flex items-center justify-between">
                        <div className="flex items-center border border-[#E8D5C8] rounded-lg bg-[#FFF8EF]">
                          <button
                            onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-[#E8D5C8]/40 rounded-l-md transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3 text-[#4B2E25]" />
                          </button>
                          <span className="px-2 text-xs font-mono font-semibold text-[#4B2E25]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-[#E8D5C8]/40 rounded-r-md transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3 text-[#4B2E25]" />
                          </button>
                        </div>

                        <span className="font-mono text-xs font-bold text-[#4B2E25]">
                          {formatIndianCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {cart.length > 0 && (
            <div className="p-5 sm:p-6 bg-white border-t border-[#E8D5C8] space-y-4">
              <div className="space-y-1.5 text-xs text-[#4B2E25]">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold text-base text-[#4B2E25]">
                    {formatIndianCurrency(cartSubtotal)}
                  </span>
                </div>
                <p className="text-[11px] text-[#4B2E25]/60">
                  Temperature-controlled chilled delivery / pickup verified at checkout.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  disabled={!isShopOpen}
                  onClick={handleCheckout}
                  className={`w-full py-3.5 text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 ${
                    isShopOpen
                      ? 'text-white bg-[#4B2E25] hover:bg-[#38221B]'
                      : 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#C5A15A]" />
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <button
                    onClick={handleBrowseCakes}
                    className="flex-1 py-2 text-center text-[#4B2E25]/80 hover:text-[#4B2E25] border border-[#E8D5C8] rounded-xl hover:bg-[#FFF8EF] transition-colors"
                  >
                    + Add More Cakes
                  </button>

                  <button
                    onClick={handleGoHome}
                    className="flex-1 py-2 text-center text-[#4B2E25]/80 hover:text-[#4B2E25] border border-[#E8D5C8] rounded-xl hover:bg-[#FFF8EF] transition-colors inline-flex items-center justify-center gap-1"
                  >
                    <Home className="w-3.5 h-3.5 text-[#C5A15A]" />
                    <span>Home</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
