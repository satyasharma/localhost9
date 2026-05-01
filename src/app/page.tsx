'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Dish, CartItem } from '@/types';
import Menu from '@/components/Menu';
import Cart from '@/components/Cart';
import OrderForm from '@/components/OrderForm';
import OrderConfirmation from '@/components/OrderConfirmation';
import WhatsAppButton from '@/components/WhatsAppButton';

export default function Home() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [orderId, setOrderId] = useState('');
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

    if (error) {
      console.error('Error fetching dishes:', error);
    } else {
      setDishes(data || []);
    }
    setIsLoading(false);
  };

  const addToCart = (dish: Dish) => {
    const existingItem = cart.find(item => item.id === dish.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...dish, quantity: 1 }]);
    }
  };

  const updateQuantity = (dishId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(dishId);
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
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    notes: string;
    addressNickname?: string;
    paymentMode: 'cod' | 'razorpay';
  }) => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 1. Find or create customer
    let customerId: string | null = null;

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', orderData.customer_phone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert([{ name: orderData.customer_name, phone: orderData.customer_phone }])
        .select('id')
        .single();

      if (customerError) {
        console.error('Error creating customer:', customerError);
        alert('Failed to place order. Please try again.');
        return;
      }
      customerId = newCustomer.id;
    }

    if (!customerId) {
      alert('Failed to create customer record. Please try again.');
      return;
    }

    // 2. Save address if nickname provided
    if (orderData.addressNickname?.trim()) {
      await supabase
        .from('customer_addresses')
        .insert([{
          customer_id: customerId,
          nickname: orderData.addressNickname,
          full_address: orderData.customer_address,
        }]);
    }

    // 3. Generate display order ID (prefix from customer ID + random 5 digits)
    let generatedDisplayId = '';
    try {
      const res = await fetch('/api/generate-order-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      generatedDisplayId = data.displayOrderId;
    } catch (error) {
      console.error('Error generating display ID:', error);
      alert('Failed to generate order ID. Please try again.');
      return;
    }

    // 4. Handle payment
    if (orderData.paymentMode === 'razorpay') {
      try {
        const payRes = await fetch('/api/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            orderId: generatedDisplayId,
            customerName: orderData.customer_name,
            customerPhone: orderData.customer_phone,
          }),
        });
        const payData = await payRes.json();

        if (payData.mode === 'razorpay') {
          // Open Razorpay checkout
          const paid = await openRazorpayCheckout({
            keyId: payData.keyId,
            amount: payData.amount,
            currency: payData.currency,
            razorpayOrderId: payData.razorpayOrderId,
            customerName: orderData.customer_name,
            customerPhone: orderData.customer_phone,
          });

          if (!paid) {
            alert('Payment was cancelled or failed.');
            return;
          }
        }
        // If mode is 'cod', Razorpay not configured — proceed as COD
      } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed. Please try again.');
        return;
      }
    }

    // 5. Create order in database
    const newOrderId = crypto.randomUUID();

    const { error: orderError } = await supabase
      .from('orders')
      .insert([{
        id: newOrderId,
        customer_id: customerId,
        display_order_id: generatedDisplayId,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_address: orderData.customer_address,
        notes: orderData.notes,
        total_amount: total,
        status: orderData.paymentMode === 'razorpay' ? 'paid' : 'pending',
      }]);

    if (orderError) {
      console.error('Error creating order:', orderError);
      alert('Failed to place order. Please try again.');
      return;
    }

    const orderItems = cart.map(item => ({
      order_id: newOrderId,
      dish_id: item.id,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
    }

    setOrderId(newOrderId);
    setDisplayOrderId(generatedDisplayId);
    setIsOrderFormOpen(false);
    setIsConfirmationOpen(true);
    setCart([]);
  };

  const handleCloseConfirmation = () => {
    setIsConfirmationOpen(false);
    setOrderId('');
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

      {/* Modals */}
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
        onSubmitOrder={handleSubmitOrder}
      />

      <OrderConfirmation
        isOpen={isConfirmationOpen}
        orderId={orderId}
        displayOrderId={displayOrderId}
        onClose={handleCloseConfirmation}
      />

      {/* WhatsApp floating button */}
      <WhatsAppButton />

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

// Razorpay checkout helper
function openRazorpayCheckout(opts: {
  keyId: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  customerName: string;
  customerPhone: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    // Load Razorpay script if not already loaded
    if (!(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => doOpen();
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    } else {
      doOpen();
    }

    function doOpen() {
      const rzp = new (window as any).Razorpay({
        key: opts.keyId,
        amount: opts.amount,
        currency: opts.currency,
        name: 'localHost9',
        description: 'Food Order',
        order_id: opts.razorpayOrderId,
        prefill: {
          name: opts.customerName,
          contact: opts.customerPhone,
        },
        theme: { color: '#f97316' },
        handler: async function (response: any) {
          // Verify payment on server
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            resolve(verifyData.verified === true);
          } catch {
            resolve(false);
          }
        },
        modal: {
          ondismiss: () => resolve(false),
        },
      });
      rzp.open();
    }
  });
}
