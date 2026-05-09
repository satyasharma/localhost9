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
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const nonceRef = useRef<string>('');
  const hiddenBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rawNonce = generateNonce();
    nonceRef.current = rawNonce;

    window.handleGoogleSignIn = async (response: any) => {
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
      }
    };

    const loadScript = async () => {
      const hashedNonce = await hashNonce(rawNonce);
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google && hiddenBtnRef.current) {
          window.google.accounts.id.initialize({
            client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            callback: window.handleGoogleSignIn,
            nonce: hashedNonce,
            use_fedcm_for_prompt: true,
          });
          // Render hidden Google button (needed for the popup to work)
          window.google.accounts.id.renderButton(hiddenBtnRef.current, {
            type: 'standard',
            size: 'large',
            width: 300,
          });
          setReady(true);
          // Try One Tap
          window.google.accounts.id.prompt();
        }
      };
      document.head.appendChild(script);
    };

    loadScript();
    return () => { delete window.handleGoogleSignIn; };
  }, []);

  const handleClick = () => {
    // Click the hidden Google button to trigger the popup
    const googleBtn = hiddenBtnRef.current?.querySelector('[role="button"]') as HTMLElement;
    if (googleBtn) {
      googleBtn.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">localHost9</h1>
          <p className="text-sm text-gray-500 mt-1">Root Access to Great Taste</p>
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

        {/* Hidden Google button (needed for auth to work) */}
        <div ref={hiddenBtnRef} className="hidden" />

        {/* Our clean custom button */}
        <button
          onClick={handleClick}
          disabled={!ready}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 py-3 px-4 rounded-lg font-medium text-gray-700 transition-colors disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
