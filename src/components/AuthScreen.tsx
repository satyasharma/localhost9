'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

declare global {
  interface Window {
    google?: any;
    handleGoogleSignIn?: (response: any) => void;
  }
}

function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashNonce(nonce: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(nonce);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nonceRef = useRef<string>('');
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rawNonce = generateNonce();
    nonceRef.current = rawNonce;

    // Set global callback
    window.handleGoogleSignIn = async (response: any) => {
      setLoading(true);
      setError('');
      try {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.credential,
          nonce: nonceRef.current,
        });
        if (error) throw error;
      } catch (err: any) {
        setError(err.message || 'Sign in failed. Please try again.');
        setLoading(false);
      }
    };

    const loadScript = async () => {
      const hashedNonce = await hashNonce(rawNonce);

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google && buttonRef.current) {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            callback: window.handleGoogleSignIn,
            nonce: hashedNonce,
            use_fedcm_for_prompt: true,
          });

          // Render Google's own button (guaranteed to work)
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: 300,
          });

          // Also try One Tap
          window.google.accounts.id.prompt();
        }
      };
      document.head.appendChild(script);
    };

    loadScript();

    return () => {
      delete window.handleGoogleSignIn;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">localHost9</h1>
          <p className="text-sm text-gray-500 mt-1">Root Access to Great Taste</p>
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : (
          <div className="flex justify-center">
            <div ref={buttonRef}></div>
          </div>
        )}
      </div>
    </div>
  );
}
