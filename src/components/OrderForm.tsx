'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Phone, FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { CartItem, UserProfile, UserAddress } from '@/types';
import { supabase } from '@/lib/supabase';

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  profile: UserProfile | null;
  savedAddresses: UserAddress[];
  // Keeps the page's copy of saved addresses in sync after an edit or delete.
  onSavedAddressesChange?: (addresses: UserAddress[]) => void;
  onSubmitOrder: (orderData: {
    address: string;
    phone: string;
    notes: string;
    addressLabel?: string;
  }) => void;
}

// Same limits the database enforces for saved addresses.
const MAX_LABEL = 100;
const MAX_FULL_ADDRESS = 1000;
const ADDRESS_ERROR = 'Couldn’t save. Please try again.';

export default function OrderForm({ isOpen, onClose, cart, profile, savedAddresses: prefetchedAddresses, onSavedAddressesChange, onSubmitOrder }: OrderFormProps) {
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
  // Saved-address edit / delete
  const [editingId, setEditingId] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editError, setEditError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSavedAddresses(prefetchedAddresses);
      setShowNewAddress(prefetchedAddresses.length === 0);
      // Pre-fill phone from profile if available
      if (profile?.phone) {
        setPhone(profile.phone.replace('+91', ''));
      }
    }
  }, [isOpen, prefetchedAddresses, profile]);

  // Close any open edit / delete prompt whenever the form is opened or closed.
  useEffect(() => {
    setEditingId('');
    setConfirmDeleteId('');
    setEditError('');
    setRowError(null);
    setBusyId('');
  }, [isOpen]);

  const updateAddressList = (next: UserAddress[]) => {
    setSavedAddresses(next);
    onSavedAddressesChange?.(next);
    if (next.length === 0) setShowNewAddress(true);
  };

  const startEdit = (addr: UserAddress) => {
    setConfirmDeleteId('');
    setRowError(null);
    setEditError('');
    setEditingId(addr.id);
    setEditLabel(addr.label);
    setEditAddress(addr.full_address);
    setEditPhone((addr.phone || '').replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10));
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditError('');
  };

  const saveEdit = async (addr: UserAddress) => {
    if (!profile || busyId) return;
    const label = editLabel.trim();
    const fullAddress = editAddress.trim();
    if (!label || label.length > MAX_LABEL) { setEditError('Please enter a label (up to 100 characters).'); return; }
    if (!fullAddress || fullAddress.length > MAX_FULL_ADDRESS) { setEditError('Please enter the full address (up to 1000 characters).'); return; }
    if (editPhone.length !== 10) { setEditError('Phone must be 10 digits.'); return; }
    setBusyId(addr.id);
    setEditError('');
    const { data, error } = await supabase
      .from('user_addresses')
      .update({ label, full_address: fullAddress, phone: `+91${editPhone}` })
      .eq('id', addr.id)
      .eq('user_id', profile.id)
      .select('*');
    setBusyId('');
    if (error || !data || data.length !== 1) {
      setEditError(ADDRESS_ERROR);
      return;
    }
    const updated = data[0] as UserAddress;
    updateAddressList(savedAddresses.map(a => (a.id === addr.id ? updated : a)));
    if (selectedAddressId === addr.id) {
      setAddress(updated.full_address);
      setPhone(editPhone);
    }
    setEditingId('');
  };

  const addressToDelete = savedAddresses.find(a => a.id === confirmDeleteId) || null;

  const closeDeletePrompt = () => {
    setConfirmDeleteId('');
    setRowError(null);
  };

  // Escape closes the delete popup (unless a delete is in progress).
  useEffect(() => {
    if (!confirmDeleteId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busyId) closeDeletePrompt(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmDeleteId, busyId]);

  const deleteAddress = async (addr: UserAddress) => {
    if (!profile || busyId) return;
    setBusyId(addr.id);
    setRowError(null);
    const { data, error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', addr.id)
      .eq('user_id', profile.id)
      .select('id');
    setBusyId('');
    if (error || !data || data.length !== 1) {
      setRowError({ id: addr.id, message: 'Couldn’t delete. Please try again.' });
      return;
    }
    setConfirmDeleteId('');
    if (selectedAddressId === addr.id) {
      setSelectedAddressId('');
      setAddress('');
    }
    updateAddressList(savedAddresses.filter(a => a.id !== addr.id));
  };

  // Enter inside an edit field saves the edit instead of submitting the order.
  const onEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, addr: UserAddress) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(addr);
    }
  };

  const loadAddresses = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
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

  const handlePincodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setPincode(digits);
    setPincodeError('');
  };

  const handlePincodeBlur = () => {
    if (pincode.length > 0 && pincode.length !== 6) {
      setPincodeError('Pin code must be 6 digits');
    } else {
      setPincodeError('');
    }
  };

  const isPincodeValid = pincode.length === 6;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId || busyId) return; // finish or cancel the address edit first
    if (phone.length !== 10) {
      setPhoneError('Phone must be 10 digits');
      return;
    }
    if (showNewAddress && !isPincodeValid) {
      setPincodeError('Please enter a valid 6-digit pin code');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmitOrder({
        address: showNewAddress ? `${address} - ${pincode}` : address,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-[scaleIn_200ms_ease-out]">
        <div className="sticky top-0 bg-brand text-white p-6 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-2xl font-bold">Complete Your Order</h2>
          <button onClick={onClose} className="hover:bg-brand-hover p-2 rounded-full transition-colors" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Order Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
            <div className="bg-cream rounded-lg p-4 space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-semibold">₹{(item.price * item.quantity) % 1 === 0 ? (item.price * item.quantity).toFixed(0) : (item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-ink">₹{total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Delivery Address */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-3">
                <MapPin size={16} className="inline mr-2" />
                Delivery Address
              </label>

              {savedAddresses.length > 0 && !showNewAddress && (
                <div className="mb-4">
                  <div className={`space-y-2 mb-3 ${editingId ? '' : 'max-h-72 overflow-y-auto'}`}>
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      const isBusy = busyId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          className={`rounded-lg border-2 transition-colors ${
                            isSelected ? 'border-brand bg-brand-soft' : 'border-line bg-white'
                          }`}
                        >
                          {editingId === addr.id ? (
                            <div className="p-3 space-y-2">
                              <input
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onKeyDown={(e) => onEditKeyDown(e, addr)}
                                maxLength={MAX_LABEL}
                                placeholder="Label (e.g., Home, Office)"
                                aria-label="Address label"
                                className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-sm bg-white"
                              />
                              <textarea
                                value={editAddress}
                                onChange={(e) => setEditAddress(e.target.value)}
                                maxLength={MAX_FULL_ADDRESS}
                                rows={3}
                                placeholder="Full address with pin code"
                                aria-label="Full address"
                                className="w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-sm bg-white"
                              />
                              <div className="flex gap-2">
                                <span className="flex-none flex items-center px-3 bg-sand rounded-lg text-muted text-sm font-medium">+91</span>
                                <input
                                  type="tel"
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                  onKeyDown={(e) => onEditKeyDown(e, addr)}
                                  maxLength={10}
                                  placeholder="10-digit number"
                                  aria-label="Phone for this address"
                                  className="flex-1 min-w-0 w-full px-3 py-2 border border-line rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-sm bg-white"
                                />
                              </div>
                              {editError && <p className="text-red-500 text-xs" role="alert">{editError}</p>}
                              <p className="text-xs text-muted">Changes apply to future orders only.</p>
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  disabled={isBusy}
                                  className="h-10 px-4 rounded-lg border border-line text-ink text-sm font-semibold hover:bg-cream disabled:opacity-50 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveEdit(addr)}
                                  disabled={isBusy}
                                  className="h-10 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-bold disabled:opacity-60 transition-colors"
                                >
                                  {isBusy ? 'Saving…' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start">
                              <button
                                type="button"
                                onClick={() => handleSelectAddress(addr)}
                                aria-pressed={isSelected}
                                className="flex-1 min-w-0 text-left p-3"
                              >
                                <div className="font-semibold text-ink break-words">{addr.label}</div>
                                <div className="text-sm text-muted break-words">{addr.full_address}</div>
                                {addr.phone && (
                                  <div className="text-xs text-muted mt-1">📞 {addr.phone}</div>
                                )}
                              </button>
                              <div className="flex-none flex gap-1 p-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEdit(addr)}
                                  disabled={!!busyId}
                                  aria-label={`Edit ${addr.label}`}
                                  className="w-10 h-10 inline-flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-sand disabled:opacity-50 transition-colors"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setEditingId(''); setRowError(null); setConfirmDeleteId(addr.id); }}
                                  disabled={!!busyId}
                                  aria-label={`Delete ${addr.label}`}
                                  className="w-10 h-10 inline-flex items-center justify-center rounded-full text-muted hover:text-brand-hover hover:bg-sand disabled:opacity-50 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowNewAddress(true); setSelectedAddressId(''); setAddress(''); setAddressLabel(''); }}
                    className="w-full py-2 px-4 border border-brand text-brand rounded-lg hover:bg-brand-soft font-semibold flex items-center justify-center gap-2 transition-colors"
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
                      maxLength={100}
                      placeholder="Label (e.g., Home, Office)"
                      className="w-full px-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
                    />
                  </div>
                  <textarea
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={990}
                    className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                    placeholder="Enter your complete delivery address"
                    rows={3}
                  />
                  <div className="mt-3">
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      onBlur={handlePincodeBlur}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent text-sm ${
                        pincodeError ? 'border-red-400' : 'border-line'
                      }`}
                      placeholder="Pin code (6 digits)"
                      maxLength={6}
                    />
                    {pincodeError && (
                      <p className="text-red-500 text-xs mt-1">{pincodeError}</p>
                    )}
                  </div>
                  {savedAddresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNewAddress(false)}
                      className="text-sm text-brand font-semibold mt-1 hover:underline"
                    >
                      Use saved address instead
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Phone for this delivery */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                <Phone size={16} className="inline mr-2" />
                Contact Number (for delivery)
              </label>
              <div className="flex gap-2">
                <span className="flex-none flex items-center px-3 bg-sand rounded-lg text-muted text-sm font-medium">+91</span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={`flex-1 min-w-0 w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent ${
                    phoneError ? 'border-red-400' : 'border-line'
                  }`}
                  placeholder="10-digit number"
                  maxLength={10}
                />
              </div>
              {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                <FileText size={16} className="inline mr-2" />
                Special Instructions (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                className="w-full px-4 py-3 border border-line rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent"
                placeholder="Any special requests?"
                rows={2}
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-3">Payment Method</label>
              <div className="flex gap-3">
                <div className="flex-1 p-4 rounded-lg border-2 border-brand bg-brand-soft flex items-center justify-center text-center">
                  <p className="text-sm font-semibold text-ink">Cash on Delivery</p>
                </div>
                <div className="flex-1 p-4 rounded-lg border-2 border-line bg-cream opacity-50 flex items-center justify-center text-center">
                  <p className="text-sm font-semibold text-muted">UPI · Coming soon</p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !!editingId || !!busyId || !address.trim() || phone.length !== 10 || (showNewAddress && !isPincodeValid)}
              className="w-full bg-brand hover:bg-brand-hover disabled:bg-brand/40 text-white py-4 rounded-lg font-bold text-lg transition-colors shadow-lg"
            >
              {isSubmitting ? 'Placing order…' : `Place order · ₹${total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}`}
            </button>
            {editingId && (
              <p className="text-xs text-muted text-center -mt-2">Save or cancel the address edit to place your order.</p>
            )}
          </form>
        </div>
      </div>

      {/* Delete-address confirmation popup (sits above the order form) */}
      {addressToDelete && (
        <div
          className="fixed inset-0 z-[60] bg-ink/45 flex items-center justify-center p-4 animate-[fadeIn_150ms_ease-out]"
          onClick={() => { if (!busyId) closeDeletePrompt(); }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-address-title"
            aria-describedby="delete-address-text"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-[scaleIn_150ms_ease-out]"
          >
            <h3 id="delete-address-title" className="text-lg font-bold text-ink">Delete this address?</h3>
            <div id="delete-address-text" className="mt-2 rounded-lg bg-cream border border-line p-3">
              <div className="font-semibold text-ink break-words">{addressToDelete.label}</div>
              <div className="text-sm text-muted break-words line-clamp-3">{addressToDelete.full_address}</div>
            </div>
            <p className="text-xs text-muted mt-2">Your past orders won’t change.</p>
            {rowError?.id === addressToDelete.id && (
              <p className="text-red-500 text-sm mt-2" role="alert">{rowError.message}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                autoFocus
                onClick={closeDeletePrompt}
                disabled={!!busyId}
                className="flex-1 h-11 rounded-lg border border-line text-ink text-sm font-semibold hover:bg-cream disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteAddress(addressToDelete)}
                disabled={!!busyId}
                className="flex-1 h-11 rounded-lg bg-brand-hover hover:bg-ink text-white text-sm font-bold disabled:opacity-60 transition-colors"
              >
                {busyId === addressToDelete.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
