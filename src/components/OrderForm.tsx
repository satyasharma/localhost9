'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, FileText, Plus, CreditCard, Banknote } from 'lucide-react';
import { CartItem, UserProfile, UserAddress } from '@/types';
import { supabase } from '@/lib/supabase';

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  profile: UserProfile | null;
  onSubmitOrder: (orderData: {
    delivery_address: string;
    notes: string;
    addressLabel?: string;
    paymentMode: 'cod' | 'razorpay';
  }) => void;
}

export default function OrderForm({ isOpen, onClose, cart, profile, onSubmitOrder }: OrderFormProps) {
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cod' | 'razorpay'>('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasRazorpay = !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  useEffect(() => {
    if (isOpen && profile) {
      loadAddresses();
    }
  }, [isOpen, profile]);

  const loadAddresses = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', profile.id);

    const addrs = data || [];
    setSavedAddresses(addrs);
    if (addrs.length === 0) {
      setShowNewAddress(true);
    } else {
      setShowNewAddress(false);
    }
  };

  const handleSelectAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id);
    setAddress(addr.full_address);
    setShowNewAddress(false);
  };

  const handleNewAddress = () => {
    setShowNewAddress(true);
    setSelectedAddressId('');
    setAddress('');
    setAddressLabel('');
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmitOrder({
        delivery_address: address,
        notes,
        addressLabel: addressLabel || undefined,
        paymentMode,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-orange-500 text-white p-6 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-2xl font-bold">Complete Your Order</h2>
          <button onClick={onClose} className="hover:bg-orange-600 p-2 rounded-full transition-colors" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Order Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Delivery Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <MapPin size={16} className="inline mr-2" />
                Delivery Address
              </label>

              {savedAddresses.length > 0 && !showNewAddress && (
                <div className="mb-4">
                  <div className="space-y-2 mb-3">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => handleSelectAddress(addr)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedAddressId === addr.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-300 hover:border-gray-400 bg-white'
                        }`}
                      >
                        <div className="font-semibold text-gray-800">{addr.label}</div>
                        <div className="text-sm text-gray-600">{addr.full_address}</div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleNewAddress}
                    className="w-full py-2 px-4 border border-orange-500 text-orange-500 rounded-lg hover:bg-orange-50 font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus size={18} />
                    Add New Address
                  </button>
                </div>
              )}

              {(showNewAddress || savedAddresses.length === 0) && (
                <>
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Address Label</label>
                    <input
                      type="text"
                      value={addressLabel}
                      onChange={(e) => setAddressLabel(e.target.value)}
                      placeholder="e.g., Home, Office"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <textarea
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter your complete address"
                    rows={3}
                  />
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNewAddress(false)}
                      className="text-sm text-orange-500 font-semibold mt-1 hover:underline"
                    >
                      Use saved address instead
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FileText size={16} className="inline mr-2" />
                Special Instructions (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Any special requests?"
                rows={2}
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMode('cod')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                    paymentMode === 'cod' ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Banknote size={24} className={paymentMode === 'cod' ? 'text-orange-500' : 'text-gray-500'} />
                  <span className="font-semibold text-sm">Cash on Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('razorpay')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                    paymentMode === 'razorpay' ? 'border-orange-500 bg-orange-50' : 'border-gray-300 hover:border-gray-400'
                  } ${!hasRazorpay ? 'opacity-50' : ''}`}
                  disabled={!hasRazorpay}
                >
                  <CreditCard size={24} className={paymentMode === 'razorpay' ? 'text-orange-500' : 'text-gray-500'} />
                  <span className="font-semibold text-sm">Pay Online</span>
                  {!hasRazorpay && <span className="text-xs text-gray-400">Coming soon</span>}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !address.trim()}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-lg"
            >
              {isSubmitting ? 'Placing Order...' : `Place Order — ₹${total.toFixed(2)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
