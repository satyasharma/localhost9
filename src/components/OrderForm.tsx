'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Phone, FileText, Plus } from 'lucide-react';
import { CartItem, UserProfile, UserAddress } from '@/types';
import { supabase } from '@/lib/supabase';

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  profile: UserProfile | null;
  onSubmitOrder: (orderData: {
    address: string;
    phone: string;
    notes: string;
    addressLabel?: string;
  }) => void;
}

export default function OrderForm({ isOpen, onClose, cart, profile, onSubmitOrder }: OrderFormProps) {
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [addressLabel, setAddressLabel] = useState('');
  const [pincode, setPincode] = useState('');
  const [pincodeError, setPincodeError] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (isOpen && profile) {
      loadAddresses();
      // Pre-fill phone from profile if available
      if (profile.phone) {
        setPhone(profile.phone.replace('+91', ''));
      }
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
    setShowNewAddress(addrs.length === 0);
  };

  const handleSelectAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id);
    setAddress(addr.full_address);
    setAddressLabel(''); // Clear label so we don't create a duplicate
    // Auto-fill phone from the saved address
    if (addr.phone) {
      setPhone(addr.phone.replace('+91', ''));
    }
    setShowNewAddress(false);
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setPhone(digits);
    setPhoneError(digits.length > 0 && digits.length < 10 ? 'Phone must be 10 digits' : '');
  };

  const SERVICEABLE_PINCODES = [
    '560037', '560066', '560048', '560038', '560017',
    '560036', '560067', '560016', '560008', '560071', '560103',
  ];

  const handlePincodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setPincode(digits);
    if (digits.length === 6) {
      if (SERVICEABLE_PINCODES.includes(digits)) {
        setPincodeError('');
      } else {
        setPincodeError('This area is currently outside our service zone. We will be expanding soon!');
      }
    } else {
      setPincodeError('');
    }
  };

  const isPincodeValid = pincode.length === 6 && SERVICEABLE_PINCODES.includes(pincode);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setPhoneError('Phone must be 10 digits');
      return;
    }
    if (!isPincodeValid) {
      setPincodeError('Please enter a valid serviceable pin code');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmitOrder({
        address: `${address} - ${pincode}`,
        phone: `+91${phone}`,
        notes,
        addressLabel: showNewAddress ? (addressLabel || undefined) : undefined,
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
                  <span className="font-semibold">₹{(item.price * item.quantity) % 1 === 0 ? (item.price * item.quantity).toFixed(0) : (item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">₹{total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}</span>
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
                  <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
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
                        {addr.phone && (
                          <div className="text-xs text-gray-400 mt-1">📞 {addr.phone}</div>
                        )}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowNewAddress(true); setSelectedAddressId(''); setAddress(''); setAddressLabel(''); }}
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
                    <input
                      type="text"
                      value={addressLabel}
                      onChange={(e) => setAddressLabel(e.target.value)}
                      placeholder="Label (e.g., Home, Office)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <textarea
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter your complete delivery address"
                    rows={3}
                  />
                  <div className="mt-3">
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm ${
                        pincodeError ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="Pin code (6 digits)"
                      maxLength={6}
                    />
                    {pincodeError && (
                      <p className="text-red-500 text-xs mt-1">{pincodeError}</p>
                    )}
                    {isPincodeValid && (
                      <p className="text-green-600 text-xs mt-1">✓ We deliver to this area</p>
                    )}
                  </div>
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

            {/* Phone for this delivery */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Phone size={16} className="inline mr-2" />
                Contact Number (for delivery)
              </label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 bg-gray-100 rounded-lg text-gray-600 text-sm font-medium">+91</span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                    phoneError ? 'border-red-400' : 'border-gray-300'
                  }`}
                  placeholder="10-digit number"
                  maxLength={10}
                />
              </div>
              {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !address.trim() || phone.length !== 10 || !isPincodeValid}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-lg"
            >
              {isSubmitting ? 'Placing Order...' : `Place Order - ₹${total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
