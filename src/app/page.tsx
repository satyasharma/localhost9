'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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

  useEffect(() => {
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
      if (event === 'SIGNED_IN' && session?.user) {
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
    fetchDishes();

    // Silently ensure user exists in DB (for orders to reference)
    supabase.from('users').upsert({
      id: user.id,
      name: p.name,
      email: user.email,
    }, { onConflict: 'id' }).then(() => {});
  };

  const fetchDishes = async () => {
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .eq('available', true)
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

    // Save new address with phone if label provided
    if (orderData.addressLabel?.trim()) {
      await supabase.from('user_addresses').insert([{
        user_id: profile.id,
        label: orderData.addressLabel,
        full_address: orderData.address,
        phone: orderData.phone,
      }]);
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: profile.id,
        phone: orderData.phone,
        delivery_address: orderData.address,
        total_amount: total,
        item_count: itemCount,
        summary_text: summaryText,
        status: 'pending',
        notes: orderData.notes,
      }])
      .select('id, display_order_id')
      .single();

    if (orderError) {
      console.error('Order error:', orderError);
      alert('Failed to place order. Please try again.');
      return;
    }

    // Save order items
    const orderItems = cart.map(item => ({
      order_id: order.id,
      dish_id: item.id,
      dish_name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));
    await supabase.from('order_items').insert(orderItems);

    setDisplayOrderId(order.display_order_id);
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
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
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
        onSubmitOrder={handleSubmitOrder}
      />

      <OrderConfirmation
        isOpen={isConfirmationOpen}
        displayOrderId={displayOrderId}
        onClose={() => { setIsConfirmationOpen(false); setDisplayOrderId(''); }}
      />

      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg font-semibold mb-2">localHost9</p>
          <p className="text-gray-400">Root Access to Great Taste</p>
        </div>
      </footer>
    </div>
  );
}
