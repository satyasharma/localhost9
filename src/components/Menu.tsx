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

// Add, the quantity stepper and Sold out share one size/font so they line up.
const PILL = 'h-10 min-w-[96px] rounded-full inline-flex items-center justify-center gap-1.5 text-sm font-bold leading-none';

const formatPrice = (price: number) => `₹${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;

export default function Menu({ dishes, cart, onAddToCart, onUpdateQuantity }: MenuProps) {
  const getCartItem = (dishId: string) => cart.find(item => item.id === dishId);
  const MAX_ITEM_QTY = 10;

  // Dishes are rendered in the order given (the order they were added in /admin).
  // Sold-out dishes never move; only their button changes.
  return (
    <div className="grid gap-5 grid-cols-1 sm:[grid-template-columns:repeat(auto-fit,minmax(300px,340px))] sm:justify-center">
      {dishes.map((dish, index) => {
        const quantity = getCartItem(dish.id)?.quantity || 0;

        return (
          <article
            key={dish.id}
            className="bg-white rounded-2xl overflow-hidden flex flex-col shadow-[0_1px_2px_rgba(43,27,18,.06),0_6px_18px_rgba(43,27,18,.08)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(43,27,18,.06),0_12px_28px_rgba(43,27,18,.12)]"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-sand">
              <Image
                src={dish.image_url}
                alt={dish.name}
                fill
                priority={index === 0}
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 340px"
              />
            </div>
            <div className="flex flex-col flex-1 px-3.5 pt-3 pb-3.5">
              <h3 className="text-base font-bold leading-tight tracking-tight text-ink">{dish.name}</h3>
              <p className="mt-0.5 text-[13px] leading-[1.45] text-muted line-clamp-2">{dish.description}</p>
              <div className="flex items-center justify-between mt-auto pt-2.5">
                <span className="text-[17px] font-bold tracking-tight text-ink">{formatPrice(dish.price)}</span>
                {!dish.available ? (
                  <button
                    type="button"
                    disabled
                    aria-label={`${dish.name} is sold out`}
                    className={`${PILL} px-4 bg-sand text-muted cursor-not-allowed`}
                  >
                    Sold out
                  </button>
                ) : quantity === 0 ? (
                  <button
                    type="button"
                    onClick={() => onAddToCart(dish)}
                    aria-label={`Add ${dish.name} to cart`}
                    className={`${PILL} px-4 border-[1.5px] border-brand text-brand bg-white hover:bg-brand hover:text-white transition-colors`}
                  >
                    Add <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
                  </button>
                ) : (
                  <div role="group" aria-label={`${dish.name} quantity`} className={`${PILL} min-w-[104px] justify-between overflow-hidden bg-brand text-white`}>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(dish.id, quantity - 1)}
                      className="w-9 h-10 inline-flex items-center justify-center hover:bg-brand-hover transition-colors"
                      aria-label={`Remove one ${dish.name}`}
                    >
                      <Minus size={16} strokeWidth={2.5} />
                    </button>
                    <span className="min-w-[26px] text-center" aria-live="polite">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => onAddToCart(dish)}
                      disabled={quantity >= MAX_ITEM_QTY}
                      className="w-9 h-10 inline-flex items-center justify-center hover:bg-brand-hover transition-colors disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      aria-label={`Add one more ${dish.name}`}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
