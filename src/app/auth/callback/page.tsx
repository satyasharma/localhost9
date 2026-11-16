'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  useEffect(() => {
    // The URL contains the auth tokens in the hash fragment
    // Supabase client automatically detects and processes them
    // We just need to wait briefly then redirect

    const redirect = () => {
      window.location.href = '/';
    };

    // Try to get session immediately (tokens might already be processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirect();
        return;
      }

      // Listen for sign-in event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          subscription.unsubscribe();
          redirect();
        }
      });

      // Force redirect after 3 seconds regardless
      setTimeout(redirect, 3000);
    });
  }, []);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand mb-4" />
        <p className="text-muted">Signing you in...</p>
      </div>
    </div>
  );
}
