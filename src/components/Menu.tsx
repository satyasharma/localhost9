'use client';

import { Plus, Minus } from 'lucide-react';
import Image from 'next/image';
import { Dish, CartItem } from '@/types';

interface MenuProps {
  dishes: Dish[];
  cart: CartItem[];
  onAddToCart: (dish: Dish) => void;
  onUpdateQuantity: (dishId: string, quantity: number) => void;
}

export default function Menu({ dishes, cart, onAddToCart, onUpdateQuantity }: MenuProps) {
  const getCartItem = (dishId: string) => cart.find(item => item.id === dishId);
  const MAX_ITEM_QTY = 10;

  return (
    <div className="flex flex-wrap justify-center gap-6">
      {dishes.map((dish, index) => {
        const cartItem = getCartItem(dish.id);
        const quantity = cartItem?.quantity || 0;

        return (
          <div
            key={dish.id}
            className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 w-full max-w-sm hover:-translate-y-1 animate-slide-up stagger-${Math.min(index + 1, 6)}`}
          >
            <div className="relative aspect-[5/3] overflow-hidden">
              <Image
                src={dish.image_url}
                alt={dish.name}
                fill
                className="object-cover transform hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              {!dish.available && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-white/90 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">Currently Unavailable</span>
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-gray-800 mb-1">{dish.name}</h3>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">{dish.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">₹{dish.price % 1 === 0 ? dish.price.toFixed(0) : dish.price.toFixed(2)}</span>
                {quantity === 0 ? (
                  <button
                    onClick={() => onAddToCart(dish)}
                    disabled={!dish.available}
                    className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 font-medium ${
                      dish.available
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:shadow-lg hover:shadow-orange-200 text-white active:scale-95'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Plus size={18} />
                    Add
                  </button>
                ) : (
                  <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-xl p-1">
                    <button
                      onClick={() => onUpdateQuantity(dish.id, quantity - 1)}
                      className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-lg transition-all active:scale-90"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-bold text-gray-800 w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => onAddToCart(dish)}
                      disabled={quantity >= MAX_ITEM_QTY}
                      className={`p-2 rounded-lg transition-all active:scale-90 ${
                        quantity >= MAX_ITEM_QTY
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                      aria-label="Increase quantity"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
