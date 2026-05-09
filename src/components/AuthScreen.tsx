'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    google?: any;
  }
}

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const initializeGoogle = () => {
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });

    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
        shape: 'rectangular',
      }
    );
  };

  const handleGoogleResponse = async (response: any) => {
    setLoading(true);
    setError('');

    try {
      // Sign in to Supabase using the Google ID token
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (error) throw error;
      // Auth state change listener in page.tsx will handle the rest
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">localHost9</h1>
          <p className="text-sm text-gray-500 mt-1">Root Access to Great Taste</p>
        </div>

        <p className="text-center text-gray-600 mb-6">Sign in to get started</p>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : (
          <div className="flex justify-center">
            <div id="google-signin-btn"></div>
          </div>
        )}
      </div>
    </div>
  );
}
