'use client';

import { CheckCircle } from 'lucide-react';

interface OrderConfirmationProps {
  isOpen: boolean;
  displayOrderId: string;
  onClose: () => void;
}

export default function OrderConfirmation({ isOpen, displayOrderId, onClose }: OrderConfirmationProps) {
  if (!isOpen) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayOrderId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]">
      <div className="bg-white rounded-xl max-w-md w-full p-8 text-center shadow-2xl animate-[scaleIn_200ms_ease-out]">
        <div className="mb-6 flex justify-center">
          <CheckCircle size={80} className="text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-ink mb-4">Order Placed!</h2>
        <p className="text-muted mb-6">Your order has been placed successfully.</p>

        <div className="bg-brand-soft rounded-lg p-6 mb-6 border-2 border-line">
          <p className="text-sm text-muted mb-2 font-semibold">YOUR ORDER NUMBER</p>
          <p className="text-3xl font-bold text-brand font-mono mb-3 break-all">{displayOrderId}</p>
          <button
            onClick={copyToClipboard}
            className="text-sm px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg transition-colors font-semibold"
          >
            Copy Order Number
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-brand hover:bg-brand-hover text-white py-3 rounded-lg font-semibold transition-colors"
        >
          Continue Ordering
        </button>
      </div>
    </div>
  );
}
