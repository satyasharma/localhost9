'use client';

import { useState } from 'react';
import { Phone, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CompleteProfileProps {
  userId: string;
  userName: string;
  userEmail: string;
  onComplete: () => void;
}

export default function CompleteProfile({ userId, userName, userEmail, onComplete }: CompleteProfileProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      setError('Phone number must be 10 digits');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.from('users').insert([{
        id: userId,
        name: userName,
        email: userEmail,
        phone: `+91${phone}`,
      }]);
      if (error) throw error;
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Welcome, {userName}!</h1>
          <p className="text-sm text-gray-500 mt-1">One last thing — your phone number for delivery updates.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <Phone size={16} className="inline mr-2" />
              Phone Number
            </label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 bg-gray-100 rounded-lg text-gray-600 text-sm font-medium">+91</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  setError('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="10-digit number"
                maxLength={10}
              />
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || phone.length !== 10}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : <>Start Ordering <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
