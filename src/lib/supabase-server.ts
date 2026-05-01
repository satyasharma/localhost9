import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client (for API routes)
export function createServerSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
}
