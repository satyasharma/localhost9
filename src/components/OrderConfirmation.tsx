'use client';

import { CheckCircle } from 'lucide-react';

interface OrderConfirmationProps {
  isOpen: boolean;
  orderId: string;
  displayOrderId: string;
  onClose: () => void;
}

export default function OrderConfirmation({ isOpen, displayOrderId, onClose }: OrderConfirmationProps) {
  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayOrderId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-8 text-center shadow-2xl">
        <div className="mb-6 flex justify-center">
          <CheckCircle size={80} className="text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Order Placed!</h2>
        <p className="text-gray-600 mb-6">Your order has been received successfully.</p>

        <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 mb-6 border-2 border-orange-200">
          <p className="text-sm text-gray-600 mb-2 font-semibold">YOUR ORDER NUMBER</p>
          <p className="text-3xl font-bold text-orange-600 font-mono mb-3 break-all">{displayOrderId}</p>
          <button
            onClick={copyToClipboard}
            className="text-sm px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-semibold"
          >
            Copy Order Number
          </button>
        </div>

        <p className="text-gray-600 mb-8">Save this number for your records. We&apos;ll use it to track and confirm your order.</p>
        <button
          onClick={onClose}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors"
        >
          Continue Ordering
        </button>
      </div>
    </div>
  );
}
