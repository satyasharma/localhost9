'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cleanInput } from '@/lib/sanitize';
import { Dish, CartItem, UserProfile } from '@/types';
import AuthScreen from '@/components/AuthScreen';
import Sidebar from '@/components/Sidebar';
import Menu from '@/components/Menu';
import Cart from '@/components/Cart';
import OrderForm from '@/components/OrderForm';
import OrderConfirmation from '@/components/OrderConfirmation';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [displayOrderId, setDisplayOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [orderError, setOrderError] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

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
        setIsAuthenticated(false);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signedIn = (user: any) => {
    // Prevent double-processing
    if (isAuthenticated) return;

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
    supabase.from('user_addresses').select('*').eq('user_id', user.id).then(({ data }) => {
      setSavedAddresses(data || []);
    });
  };

  const fetchDishes = async () => {
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .order('created_at', { ascending: true });
    setDishes(data || []);
    setIsLoading(false);
  };

  const addToCart = (dish: Dish) => {
    const existing = cart.find(item => item.id === dish.id);
    if (existing) {
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
      } else {
        setOrderError('Failed to place order. Please try again.');
      }
      return;
    }

    setDisplayOrderId(result?.[0]?.display_order_id || '');
    setIsOrderFormOpen(false);
    setIsConfirmationOpen(true);
    setCart([]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setCart([]);
    setIsSidebarOpen(false);
    setIsAuthenticated(false);
  };

  // Loading
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Not signed in
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Main app
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-9 h-9 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm hover:bg-orange-600 transition-colors"
                aria-label="Open menu"
              >
                {profile?.name?.charAt(0).toUpperCase() || 'U'}
              </button>
              <UtensilsCrossed size={28} className="text-orange-500" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">localHost9</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Your Daily Favorites, Delivered Fresh</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full transition-colors shadow-lg"
              aria-label={`Cart with ${cartItemCount} items`}
            >
              <ShoppingBag size={24} />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Our Popular Dishes</h2>
        </div>

        {isLoading ? (
          <div className="flex flex-wrap justify-center gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden w-full max-w-sm animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-6 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-2/3" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-7 bg-gray-200 rounded w-16" />
                    <div className="h-10 bg-gray-200 rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <Menu dishes={dishes} cart={cart} onAddToCart={addToCart} onUpdateQuantity={updateQuantity} />
            <p className="text-center text-gray-400 mt-12 text-lg">Many more items coming soon ✨</p>
          </>
        )}
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
            <p className="text-gray-700 font-medium mb-6">{orderError}</p>
            <button
              onClick={() => setOrderError('')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold text-gray-300 mb-1">Service Hours</p>
              <p className="text-sm text-gray-400">Saturday & Sunday</p>
              <p className="text-sm text-gray-400">9:00 AM – 9:00 PM</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">localHost9</p>
              <p className="text-gray-400 text-sm">Root Access to Great Taste</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-sm font-semibold text-gray-300 mb-1">Contact</p>
              <a
                href="https://wa.me/918618725442"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
