'use client';

import { useEffect } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { CartItem } from '@/types';

interface CartProps {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateQuantity: (dishId: string, quantity: number) => void;
  onRemoveItem: (dishId: string) => void;
  onCheckout: () => void;
}

const formatPrice = (n: number) => `₹${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;

export default function Cart({ cart, isOpen, onClose, onUpdateQuantity, onRemoveItem, onCheckout }: CartProps) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Close with Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-ink/45 z-50 transition-opacity duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Phones: bottom sheet. Laptops: side panel. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        aria-hidden={!isOpen}
        className={`fixed z-50 bg-white flex flex-col shadow-2xl transition-transform duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none
          inset-x-0 bottom-0 max-h-[86vh] rounded-t-3xl
          md:inset-x-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-[420px] md:rounded-none
          ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-xl font-bold text-ink">Your cart{itemCount > 0 ? ` (${itemCount})` : ''}</h2>
          <button onClick={onClose} className="w-11 h-11 inline-flex items-center justify-center rounded-full text-ink hover:bg-sand transition-colors" aria-label="Close cart">
            <X size={24} />
          </button>
        </div>

        {cart.length === 0 ? (
          <p className="flex-1 flex items-center justify-center text-muted py-12">Your cart is empty.</p>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-3.5 border-b border-line last:border-b-0">
                  <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-sand">
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" sizes="56px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink truncate">{item.name}</h3>
                    <p className="text-[13px] text-muted">{formatPrice(item.price)} each · {formatPrice(item.price * item.quantity)}</p>
                  </div>
                  <div className="h-10 min-w-[100px] rounded-full bg-brand text-white inline-flex items-center justify-between overflow-hidden text-sm font-bold">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="w-9 h-10 inline-flex items-center justify-center hover:bg-brand-hover transition-colors"
                      aria-label={`Remove one ${item.name}`}
                    >
                      <Minus size={16} strokeWidth={2.5} />
                    </button>
                    <span className="min-w-[24px] text-center">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= 10}
                      className="w-9 h-10 inline-flex items-center justify-center hover:bg-brand-hover transition-colors disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      aria-label={`Add one more ${item.name}`}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="w-10 h-10 inline-flex items-center justify-center rounded-full text-muted hover:text-brand-hover hover:bg-sand transition-colors"
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-line bg-cream px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="flex justify-between text-sm text-muted mb-1.5"><span>Payment</span><span>Cash on delivery</span></div>
              <div className="flex justify-between items-center text-lg font-bold text-ink mt-2 mb-3.5">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full py-3.5 bg-brand hover:bg-brand-hover text-white rounded-2xl font-bold text-base transition-colors"
              >
                Proceed to checkout
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
