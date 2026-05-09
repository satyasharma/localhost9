'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Dish, CartItem } from '@/types';
import Menu from '@/components/Menu';
import Cart from '@/components/Cart';
import OrderForm from '@/components/OrderForm';
import OrderConfirmation from '@/components/OrderConfirmation';

export default function Home() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [displayOrderId, setDisplayOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDishes();
  }, []);

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
    name: string;
    phone: string;
    address: string;
    notes: string;
  }) => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const summaryText = cart.map(item => `${item.name} ×${item.quantity}`).join(', ');

    // Generate simple order ID: last 2 chars of phone (uppercase hex-safe) + random 5 digits
    const prefix = orderData.phone.slice(-2).toUpperCase();
    const random = Math.floor(10000 + Math.random() * 90000);
    const generatedDisplayId = `${prefix}${random}`;

    // Save to database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        display_order_id: generatedDisplayId,
        user_id: null,
        phone: orderData.phone,
        delivery_address: orderData.address,
        total_amount: total,
        item_count: itemCount,
        summary_text: summaryText,
        status: 'pending',
        notes: orderData.notes,
      }])
      .select('id')
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

    // Save customer info to localStorage for auto-fill next time
    localStorage.setItem('localhost9_customer', JSON.stringify({
      name: orderData.name,
      phone: orderData.phone,
      address: orderData.address,
    }));

    setDisplayOrderId(generatedDisplayId);
    setIsOrderFormOpen(false);
    setIsConfirmationOpen(true);
    setCart([]);
  };

  const handleCloseConfirmation = () => {
    setIsConfirmationOpen(false);
    setDisplayOrderId('');
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UtensilsCrossed size={32} className="text-orange-500" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">localHost9</h1>
                <p className="text-xs sm:text-sm text-gray-600">Your Daily Favorites, Delivered Fresh</p>
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
        onSubmitOrder={handleSubmitOrder}
      />

      {/* Confirmation */}
      <OrderConfirmation
        isOpen={isConfirmationOpen}
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
