'use client';

import { useState } from 'react';
import { X, MapPin, Phone, User, FileText, Plus, CreditCard, Banknote } from 'lucide-react';
import { CartItem, SavedAddress } from '@/types';
import { supabase } from '@/lib/supabase';

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onSubmitOrder: (orderData: {
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    notes: string;
    addressNickname?: string;
    paymentMode: 'cod' | 'razorpay';
  }) => void;
}

export default function OrderForm({ isOpen, onClose, cart, onSubmitOrder }: OrderFormProps) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    notes: '',
  });
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(true);
  const [addressNickname, setAddressNickname] = useState('');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cod' | 'razorpay'>('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasRazorpay = !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  const loadCustomerAddresses = async (phone: string) => {
    if (!phone) {
      setSavedAddresses([]);
      setSelectedAddressId('');
      return;
    }

    setIsLoadingAddresses(true);
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (customer) {
      const { data: addresses } = await supabase
        .from('customer_addresses')
        .select('id, nickname, full_address')
        .eq('customer_id', customer.id);
      setSavedAddresses(addresses || []);
      if (addresses && addresses.length > 0) {
        setShowNewAddress(false);
      }
    } else {
      setSavedAddresses([]);
    }
    setIsLoadingAddresses(false);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value;
    setFormData(prev => ({ ...prev, customer_phone: phone, customer_address: '' }));
    setSelectedAddressId('');
    setAddressNickname('');
    loadCustomerAddresses(phone);
  };

  const handleSelectSavedAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    setFormData(prev => ({ ...prev, customer_address: address.full_address }));
    setShowNewAddress(false);
  };

  const handleAddNewAddress = () => {
    setShowNewAddress(true);
    setSelectedAddressId('');
    setAddressNickname('');
    setFormData(prev => ({ ...prev, customer_address: '' }));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmitOrder({
        ...formData,
        addressNickname: addressNickname || undefined,
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
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <User size={16} className="inline mr-2" />
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Phone size={16} className="inline mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.customer_phone}
                onChange={handlePhoneChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
              {isLoadingAddresses && (
                <p className="text-xs text-gray-500 mt-1">Loading saved addresses...</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <MapPin size={16} className="inline mr-2" />
                Delivery Address
              </label>

              {savedAddresses.length > 0 && !showNewAddress && (
                <div className="mb-4">
                  <div className="space-y-2 mb-3">
                    {savedAddresses.map((address) => (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => handleSelectSavedAddress(address)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedAddressId === address.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-300 hover:border-gray-400 bg-white'
                        }`}
                      >
                        <div className="font-semibold text-gray-800">{address.nickname}</div>
                        <div className="text-sm text-gray-600">{address.full_address}</div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewAddress}
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
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Address Nickname</label>
                    <input
                      type="text"
                      value={addressNickname}
                      onChange={(e) => setAddressNickname(e.target.value)}
                      placeholder="e.g., Home Kallappa Layout, Office bagmane"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <textarea
                    required
                    value={formData.customer_address}
                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
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
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                    paymentMode === 'cod'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Banknote size={24} className={paymentMode === 'cod' ? 'text-orange-500' : 'text-gray-500'} />
                  <span className="font-semibold text-sm">Cash on Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('razorpay')}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                    paymentMode === 'razorpay'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-300 hover:border-gray-400'
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
              disabled={isSubmitting}
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
