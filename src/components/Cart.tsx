'use client';

import { ShoppingBag, Minus, Plus, Trash2, X } from 'lucide-react';
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

export default function Cart({ cart, isOpen, onClose, onUpdateQuantity, onRemoveItem, onCheckout }: CartProps) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div className={`fixed top-0 right-0 w-full max-w-md h-full bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="sticky top-0 bg-orange-500 text-white p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <ShoppingBag size={24} />
            <h2 className="text-xl font-bold">Your Cart ({itemCount})</h2>
          </div>
          <button onClick={onClose} className="hover:bg-orange-600 p-2 rounded-full transition-colors" aria-label="Close cart">
            <X size={24} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
            <ShoppingBag size={64} className="mb-4" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-4 flex-1">
              {cart.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-4 flex gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover rounded-lg"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-green-600 font-bold">₹{item.price % 1 === 0 ? item.price.toFixed(0) : item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="bg-gray-200 hover:bg-gray-300 p-1 rounded transition-colors"
                        aria-label="Decrease"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-semibold w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= 10}
                        className={`p-1 rounded transition-colors ${
                          item.quantity >= 10
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                        aria-label="Increase"
                      >
                        <Plus size={16} />
                      </button>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="ml-auto text-red-500 hover:text-red-700 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 space-y-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total:</span>
                <span className="text-green-600">₹{total % 1 === 0 ? total.toFixed(0) : total.toFixed(2)}</span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
