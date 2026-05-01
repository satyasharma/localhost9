'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, UtensilsCrossed, Menu as MenuIcon } from 'lucide-react';
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

  // Check auth state on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setIsAuthenticated(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setIsAuthenticated(false);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load dishes when authenticated
  useEffect(() => {
    if (isAuthenticated) fetchDishes();
  }, [isAuthenticated]);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setIsAuthenticated(true);
    } else {
      // User exists in auth but not in users table yet (new user flow)
      setIsAuthenticated(true);
    }
  };

  const fetchDishes = async () => {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('available', true)
      .order('created_at', { ascending: true });

    if (!error) setDishes(data || []);
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
    delivery_address: string;
    notes: string;
    addressLabel?: string;
    paymentMode: 'cod' | 'razorpay';
  }) => {
    if (!profile) return;

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const summaryText = cart.map(item => `${item.name} ×${item.quantity}`).join(', ');

    // Save new address if label provided
    if (orderData.addressLabel?.trim()) {
      await supabase.from('user_addresses').insert([{
        user_id: profile.id,
        label: orderData.addressLabel,
        full_address: orderData.delivery_address,
      }]);
    }

    // Generate order ID: last 2 chars of user ID (uppercase) + random 5 digits
    const prefix = profile.id.slice(-2).toUpperCase();
    const random = Math.floor(10000 + Math.random() * 90000);
    const generatedDisplayId = `${prefix}${random}`;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        display_order_id: generatedDisplayId,
        user_id: profile.id,
        phone: profile.phone || '',
        delivery_address: orderData.delivery_address,
        total_amount: total,
        item_count: itemCount,
        summary_text: summaryText,
        status: orderData.paymentMode === 'razorpay' ? 'paid' : 'pending',
        notes: orderData.notes,
      }])
      .select('id')
      .single();

    if (orderError) {
      console.error('Order error:', orderError);
      alert('Failed to place order. Please try again.');
      return;
    }

    // Create order items
    const orderItems = cart.map(item => ({
      order_id: order.id,
      dish_id: item.id,
      dish_name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));

    await supabase.from('order_items').insert(orderItems);

    setDisplayOrderId(generatedDisplayId);
    setIsOrderFormOpen(false);
    setIsConfirmationOpen(true);
    setCart([]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setProfile(null);
    setCart([]);
    setIsSidebarOpen(false);
  };

  const handleCloseConfirmation = () => {
    setIsConfirmationOpen(false);
    setDisplayOrderId('');
  };

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Auth screen
  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) loadProfile(session.user.id);
      });
    }} />;
  }

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Open menu"
              >
                <MenuIcon size={24} className="text-gray-700" />
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

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Our Popular Dishes</h2>
          <p className="text-base sm:text-lg text-gray-600">Handpicked favorites that keep our customers coming back</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
          </div>
        ) : (
          <Menu dishes={dishes} cart={cart} onAddToCart={addToCart} onUpdateQuantity={updateQuantity} />
        )}
      </main>

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        profile={profile}
        onLogout={handleLogout}
      />

      {/* Cart */}
      <Cart
        cart={cart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onCheckout={handleCheckout}
      />

      {/* Order Form */}
      <OrderForm
        isOpen={isOrderFormOpen}
        onClose={() => setIsOrderFormOpen(false)}
        cart={cart}
        profile={profile}
        onSubmitOrder={handleSubmitOrder}
      />

      {/* Confirmation */}
      <OrderConfirmation
        isOpen={isConfirmationOpen}
        orderId=""
        displayOrderId={displayOrderId}
        onClose={handleCloseConfirmation}
      />

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg font-semibold mb-2">localHost9</p>
          <p className="text-gray-400">Root Access to Great Taste</p>
        </div>
      </footer>
    </div>
  );
}
