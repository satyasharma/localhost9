import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, clientIp } from './rateLimit';

const ADMIN_EMAILS = ['satyasharma397@gmail.com'];

// The admin page polls once a minute plus occasional manual actions, so a
// normal admin stays well under 10 requests/minute. 30/min leaves headroom.
const ADMIN_RATE_LIMIT = 30;
const ADMIN_RATE_WINDOW_MS = 60_000;

export function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyAdmin(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();

  // Cheap shape check: a Supabase access token is a JWT (three base64url
  // segments). Junk tokens are rejected here without spending a Supabase
  // Auth API call on them.
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;

  const userClient = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await userClient.auth.getUser(token);
  if (!user?.email || !ADMIN_EMAILS.includes(user.email)) return null;
  return user.email;
}

type AdminGuardResult =
  | { admin: string; response?: never }
  | { admin?: never; response: NextResponse };

// Runs the cheap checks first: per-IP rate limit, then token shape, then the
// Supabase Auth validation. Attack traffic with junk tokens is stopped before
// it can cost Auth API calls.
export async function guardAdmin(request: NextRequest): Promise<AdminGuardResult> {
  const rl = rateLimit(`admin:${clientIp(request)}`, ADMIN_RATE_LIMIT, ADMIN_RATE_WINDOW_MS);
  if (!rl.ok) {
    return {
      response: NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      ),
    };
  }

  const admin = await verifyAdmin(request);
  if (!admin) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { admin };
}
