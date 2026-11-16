'use client';

import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, User, MapPin, Clock, Banknote } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cleanInput } from '@/lib/sanitize';
import { Dish, CartItem, UserProfile } from '@/types';
import AuthScreen from '@/components/AuthScreen';
import Sidebar from '@/components/Sidebar';
import Menu from '@/components/Menu';
import Cart from '@/components/Cart';
import OrderForm from '@/components/OrderForm';
import OrderConfirmation from '@/components/OrderConfirmation';

type Category = 'all' | 'sweets' | 'meals' | 'farm_produce';
// Fixed chip order. Categories with no dishes get no chip.
const CATEGORIES: [Category, string][] = [
  ['sweets', 'Sweets'],
  ['meals', 'Meals'],
  ['farm_produce', 'Farm Produce'],
];
const GOOD_TO_KNOW = [
  { Icon: MapPin, title: 'Where we deliver', text: 'Marathahalli, Whitefield, Mahadevpura, Indiranagar & HAL' },
  { Icon: Clock, title: 'Hours & delivery time', text: 'Everyday, 9 AM – 9 PM. Delivered within about an hour of your order being accepted.' },
  { Icon: Banknote, title: 'Pay on delivery', text: 'Cash on delivery. UPI coming soon. Cancel anytime before delivery.' },
];

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // Which account signedIn() has already handled. A ref (not state) so the
  // auth listener always sees the current value and skips repeat events.
  const signedInUserIdRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lh9_cart');
        return saved ? JSON.parse(saved) : [];
      } catch { return []; }
    }
    return [];
  });

  // Persist cart to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('lh9_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [displayOrderId, setDisplayOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authIntent, setAuthIntent] = useState<'checkout' | 'general'>('general');
  const [orderError, setOrderError] = useState('');
  const [toast, setToast] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    // Fetch dishes immediately (public, doesn't need auth)
    fetchDishes();

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        signedIn(session.user);
      } else {
        setIsAuthenticated(false);
      }
    });

    // Listen for auth changes (new sign-in or sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        signedIn(session.user);
      } else if (event === 'SIGNED_OUT') {
        signedInUserIdRef.current = null;
        setIsAuthenticated(false);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signedIn = (user: any) => {
    // Prevent double-processing: Supabase fires SIGNED_IN again on tab focus
    // and token refresh. Only run once per account.
    if (signedInUserIdRef.current === user.id) return;
    signedInUserIdRef.current = user.id;

    // Build profile from Google metadata — no DB call needed
    const p: UserProfile = {
      id: user.id,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      email: user.email || null,
      phone: null,
      created_at: user.created_at || '',
    };
    setProfile(p);
    setIsAuthenticated(true);

    // Silently ensure user exists in DB (for orders to reference)
    supabase.from('users').upsert({
      id: user.id,
      name: p.name,
      email: user.email,
    }, { onConflict: 'id' }).then(() => {});

    // Pre-fetch saved addresses
    fetchSavedAddresses(user.id);
  };
  const fetchSavedAddresses = (userId: string) => {
    supabase.from('user_addresses').select('*').eq('user_id', userId).order('created_at', { ascending: false }).then(({ data }) => {
      setSavedAddresses(data || []);
    });
  };

  const fetchDishes = async () => {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      setToast('Something went wrong. Please try again later.');
    }
    setDishes(data || []);
    setIsLoading(false);
  };

  const MAX_ITEM_QTY = 10;

  const addToCart = (dish: Dish) => {
    const existing = cart.find(item => item.id === dish.id);
    if (existing) {
      if (existing.quantity >= MAX_ITEM_QTY) return;
      setCart(cart.map(item =>
        item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...dish, quantity: 1 }]);
    }
  };

  const updateQuantity = (dishId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== dishId));
    } else if (quantity > MAX_ITEM_QTY) {
      return;
    } else {
      setCart(cart.map(item =>
        item.id === dishId ? { ...item, quantity } : item
      ));
    }
  };

  const removeItem = (dishId: string) => {
    setCart(cart.filter(item => item.id !== dishId));
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      setAuthIntent('checkout');
      setShowAuthModal(true);
      return;
    }
    setIsCartOpen(false);
    setIsOrderFormOpen(true);
  };

  const handleSubmitOrder = async (orderData: {
    address: string;
    phone: string;
    notes: string;
    addressLabel?: string;
  }) => {
    if (!profile) return;

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const summaryText = cart.map(item => `${item.name} ×${item.quantity}`).join(', ');

    // Single atomic database call — address + order + items in one transaction
    const { data: result, error: orderError } = await supabase.rpc('place_order', {
      p_user_id: profile.id,
      p_phone: orderData.phone,
      p_address: cleanInput(orderData.address),
      p_total: total,
      p_item_count: itemCount,
      p_summary: summaryText,
      p_notes: cleanInput(orderData.notes),
      p_address_label: orderData.addressLabel ? cleanInput(orderData.addressLabel) : null,
      p_address_phone: orderData.phone,
      p_items: JSON.stringify(cart.map(item => ({
        dish_id: item.id,
        dish_name: item.name,
        quantity: item.quantity,
        price: item.price,
      }))),
    });

    if (orderError) {
      console.error('Order error:', orderError);
      if (orderError.code === '42501') {
        setOrderError('You have placed too many orders recently. Please wait a while and try again.');
      } else if (orderError.code === 'P0001') {
        setOrderError('One or more items in your cart are no longer available. Please refresh and try again.');
        setCart([]);
        try { localStorage.removeItem('lh9_cart'); } catch {}
      } else {
        setOrderError('Failed to place order. Please try again.');
      }
      return;
    }

    setDisplayOrderId(result?.[0]?.display_order_id || '');
    setIsOrderFormOpen(false);
    setIsConfirmationOpen(true);
    setCart([]);
    try { localStorage.removeItem('lh9_cart'); } catch {}
    // place_order saved a new address if a label was given; refresh the list
    // so it shows up on the next order without a page reload.
    if (orderData.addressLabel?.trim()) fetchSavedAddresses(profile.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    signedInUserIdRef.current = null;
    setProfile(null);
    setCart([]);
    setIsSidebarOpen(false);
    setIsAuthenticated(false);
    try { localStorage.removeItem('lh9_cart'); } catch {}
  };

  // Loading — only show spinner briefly for initial session check
  if (isAuthenticated === null && !dishes.length) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand" />
      </div>
    );
  }

  // Main app
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // Only categories that have dishes get a chip. Dishes keep their fixed order.
  const usedCategories = CATEGORIES.filter(([key]) => dishes.some(d => d.category === key));
  const visibleDishes = activeCategory === 'all' ? dishes : dishes.filter(d => d.category === activeCategory);
  const showCartBar = cartItemCount > 0 && !isCartOpen && !isOrderFormOpen && !isConfirmationOpen;

  return (
    <div className={`min-h-screen bg-cream text-ink ${showCartBar ? 'pb-24' : ''}`}>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-line">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex flex-col leading-none">
            <span className="text-[22px] font-extrabold tracking-tight text-ink">localHost<span className="text-brand">9</span></span>
            <span className="hidden sm:block text-xs text-muted mt-1">Fresh from Kitchen &amp; Farm</span>
          </div>
          <div className="flex items-center gap-1">
            {isAuthenticated ? (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="h-11 min-w-[44px] px-2 rounded-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-ink hover:bg-sand transition-colors"
                aria-label="Open account menu"
              >
                <span className="w-8 h-8 rounded-full bg-brand text-white inline-flex items-center justify-center font-bold text-sm">
                  {profile?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
                <span className="hidden sm:inline">{profile?.name?.split(' ')[0]}</span>
              </button>
            ) : (
              <button
                onClick={() => { setAuthIntent('general'); setShowAuthModal(true); }}
                className="h-11 min-w-[44px] px-2.5 rounded-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-ink hover:bg-sand transition-colors"
                aria-label="Sign in"
              >
                <User size={24} strokeWidth={2} aria-hidden="true" />
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative h-11 min-w-[44px] px-2.5 rounded-full inline-flex items-center justify-center gap-2 text-sm font-semibold text-ink hover:bg-sand transition-colors"
              aria-label={`Open cart, ${cartItemCount} ${cartItemCount === 1 ? 'item' : 'items'}`}
            >
              <ShoppingBag size={24} strokeWidth={2} aria-hidden="true" />
              <span className="hidden sm:inline">Cart</span>
              {cartItemCount > 0 && (
                <span className="absolute top-0.5 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[11px] font-bold inline-flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <section className="text-center pt-7 pb-4 md:pt-11 md:pb-6 px-4">
        <h1 className="font-extrabold tracking-tight leading-tight text-[clamp(28px,7vw,42px)]">
          Homemade. <span className="text-brand">Fresh.</span>
        </h1>
      </section>

      {/* Category chips: filter the menu; centred, scroll sideways if they overflow */}
      {usedCategories.length > 0 && (
        <nav aria-label="Menu categories" className="sticky top-16 z-30 bg-cream/95 backdrop-blur-sm border-b border-line">
          <div className="overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-2 w-max mx-auto">
              {([['all', 'All'], ...usedCategories] as [Category, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  aria-pressed={activeCategory === key}
                  className={`h-[38px] px-[18px] rounded-full text-sm font-semibold border transition-colors ${
                    activeCategory === key
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-ink border-line hover:border-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-6xl mx-auto px-4 md:px-8 pt-6 pb-12">
        {isLoading ? (
          <div className="grid gap-5 grid-cols-1 sm:[grid-template-columns:repeat(auto-fit,minmax(300px,340px))] sm:justify-center" aria-label="Loading menu">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-sand" />
                <div className="px-3.5 pt-3 pb-3.5 space-y-2">
                  <div className="h-4 bg-sand rounded w-2/3" />
                  <div className="h-3 bg-sand rounded w-full" />
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-5 bg-sand rounded w-14" />
                    <div className="h-10 bg-sand rounded-full w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visibleDishes.length > 0 ? (
          <Menu dishes={visibleDishes} cart={cart} onAddToCart={addToCart} onUpdateQuantity={updateQuantity} />
        ) : (
          <p className="text-center text-muted mt-12 text-lg">More items coming soon.</p>
        )}

        {/* Good to know */}
        <section aria-labelledby="good-title" className="mt-11">
          <h2 id="good-title" className="text-center text-[21px] font-bold tracking-tight mb-3.5">Good to know</h2>
          <div className="flex flex-wrap justify-center gap-3.5">
            {GOOD_TO_KNOW.map(({ Icon, title, text }) => (
              <div key={title} className="flex-[1_1_280px] max-w-[340px] bg-white border border-line rounded-2xl p-4 flex gap-3.5 items-start">
                <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center flex-none">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold">{title}</h3>
                  <p className="text-[13.5px] text-muted mt-0.5">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        profile={profile}
        onLogout={handleLogout}
      />

      <Cart
        cart={cart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onCheckout={handleCheckout}
      />

      <OrderForm
        isOpen={isOrderFormOpen}
        onClose={() => setIsOrderFormOpen(false)}
        cart={cart}
        profile={profile}
        savedAddresses={savedAddresses}
        onSubmitOrder={handleSubmitOrder}
      />

      <OrderConfirmation
        isOpen={isConfirmationOpen}
        displayOrderId={displayOrderId}
        onClose={() => { setIsConfirmationOpen(false); setDisplayOrderId(''); }}
      />

      {/* Error Popup */}
      {orderError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center shadow-2xl">
            <p className="text-ink font-medium mb-6">{orderError}</p>
            <button
              onClick={() => setOrderError('')}
              className="bg-brand hover:bg-brand-hover text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed ${showCartBar ? 'bottom-24' : 'bottom-6'} left-1/2 -translate-x-1/2 z-50 animate-[fadeIn_200ms_ease-out]`}>
          <div className="bg-ink text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 max-w-sm">
            <span className="text-sm">{toast}</span>
            <button onClick={() => setToast('')} className="text-white/80 hover:text-white text-lg leading-none" aria-label="Dismiss">&times;</button>
          </div>
        </div>
      )}

      <footer className="bg-footer text-footer-text">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col leading-none">
              <span className="text-[22px] font-extrabold tracking-tight">localHost<span className="text-gold">9</span></span>
              <span className="text-[13px] text-footer-muted mt-1.5">Root Access to Great Taste</span>
            </div>
            <div className="flex gap-2.5">
              <a
                href="https://wa.me/918618725442"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/15 inline-flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/local_host9/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/15 inline-flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-3 text-[13px] leading-5 text-footer-muted">
            <span>© {new Date().getFullYear()} localHost9</span>
            <button
              onClick={() => setShowTerms(true)}
              className="text-[13px] leading-5 text-footer-text underline underline-offset-[3px] py-3 -my-3"
            >
              Terms &amp; Privacy
            </button>
          </div>
        </div>
      </footer>

      {/* Sticky "View cart" bar once something is in the cart */}
      <div
        aria-live="polite"
        className={`fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-[520px] h-[60px] rounded-2xl bg-brand text-white shadow-[0_10px_30px_rgba(43,27,18,.25)] flex items-center justify-between pl-[18px] pr-2 transition-transform duration-200 ${
          showCartBar ? 'translate-y-0' : 'translate-y-[140%] pointer-events-none'
        }`}
      >
        <div className="leading-tight">
          <b className="block text-[15px]">{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</b>
          <span className="text-[12.5px] opacity-90">₹{cartTotal % 1 === 0 ? cartTotal.toFixed(0) : cartTotal.toFixed(2)} · Cash on delivery</span>
        </div>
        <button
          onClick={() => setIsCartOpen(true)}
          tabIndex={showCartBar ? 0 : -1}
          className="h-11 px-4 rounded-xl bg-white/15 hover:bg-white/25 font-bold text-[15px] inline-flex items-center gap-1.5 transition-colors"
        >
          View cart <span aria-hidden="true">→</span>
        </button>
      </div>

      {/* Terms & Privacy Popup */}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-[scaleIn_200ms_ease-out]">
            <div className="sticky top-0 bg-white border-b border-line px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Terms & Privacy</h2>
              <button onClick={() => setShowTerms(false)} className="text-muted hover:text-muted text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-4 text-sm text-ink space-y-4 leading-relaxed">
              <section>
                <h3 className="font-bold text-ink mb-1">Orders & Delivery</h3>
                <p>Orders accepted during service hours (Everyday, 9 AM – 9 PM). Delivery within 1 hour of acceptance. Available in Marathahalli, Whitefield, Mahadevpura, Indiranagar, and HAL areas only.</p>
              </section>
              <section>
                <h3 className="font-bold text-ink mb-1">Payment</h3>
                <p>Cash on Delivery available. Online payment (UPI) coming soon.</p>
              </section>
              <section>
                <h3 className="font-bold text-ink mb-1">Cancellation</h3>
                <p>Orders can be cancelled anytime before delivery. If your order is already being prepared, cancellation is still possible but we appreciate early notice.</p>
              </section>
              <section>
                <h3 className="font-bold text-ink mb-1">Food Safety</h3>
                <p>Prepared in a clean, hygienic kitchen. Please mention allergies in special instructions.</p>
              </section>
              <section>
                <h3 className="font-bold text-ink mb-1">Privacy</h3>
                <p>We collect your name, email (via Google), phone, and address for order fulfillment only. We do not sell, share, or use your data for marketing. Your data is stored securely.</p>
              </section>
              <section>
                <h3 className="font-bold text-ink mb-1">Data Retention</h3>
                <p>Order history is stored for 30 days only. After 30 days, order records are permanently deleted from our system.</p>
              </section>
              <section>
                <h3 className="font-bold text-ink mb-1">Contact</h3>
                <p>WhatsApp: +91 8618725442</p>
              </section>
              <p className="text-xs text-muted">Last updated: May 2026</p>
            </div>
            <div className="sticky bottom-0 bg-white border-t px-6 py-4">
              <button
                onClick={() => setShowTerms(false)}
                className="w-full bg-brand hover:bg-brand-hover text-white py-3 rounded-lg font-semibold transition-colors"
              >
                I Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal — shown when user tries to checkout without signing in */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-2 relative animate-[scaleIn_200ms_ease-out]">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-3 right-3 text-muted hover:text-muted text-2xl leading-none z-10"
              aria-label="Close"
            >
              &times;
            </button>
            <AuthScreen onSuccess={() => {
              setShowAuthModal(false);
              if (authIntent === 'checkout') {
                setIsCartOpen(false);
                setIsOrderFormOpen(true);
              }
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
