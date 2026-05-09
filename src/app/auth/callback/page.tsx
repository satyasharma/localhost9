'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Supabase automatically picks up the tokens from the URL hash/params
    // We just need to wait for the session to be established then redirect
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session) {
        router.replace('/');
        return;
      }

      // If no session yet, listen for the auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe();
          router.replace('/');
        }
      });

      // Timeout fallback — if nothing happens in 5s, redirect home anyway
      setTimeout(() => {
        router.replace('/');
      }, 5000);
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4" />
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}
