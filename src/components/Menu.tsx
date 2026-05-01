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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {dishes.map((dish) => {
        const cartItem = getCartItem(dish.id);
        const quantity = cartItem?.quantity || 0;

        return (
          <div
            key={dish.id}
            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
          >
            <div className="relative h-48 overflow-hidden">
              <Image
                src={dish.image_url}
                alt={dish.name}
                fill
                className="object-cover transform hover:scale-110 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{dish.name}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{dish.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-green-600">₹{dish.price.toFixed(2)}</span>
                {quantity === 0 ? (
                  <button
                    onClick={() => onAddToCart(dish)}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors duration-200"
                  >
                    <Plus size={20} />
                    Add
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-orange-100 rounded-lg p-1">
                    <button
                      onClick={() => onUpdateQuantity(dish.id, quantity - 1)}
                      className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="font-semibold text-gray-800 w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => onAddToCart(dish)}
                      className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus size={18} />
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
