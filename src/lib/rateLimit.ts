import type { NextRequest } from 'next/server';

// Fixed-window, per-key rate limiter.
//
// This is in-memory, so on Vercel each warm serverless instance keeps its own
// counters. That still stops a single attacker hammering one instance (the
// common case) and costs nothing to run. If you ever need a strict global
// limit shared across all instances, swap this for Upstash Ratelimit —
// the call sites won't change shape.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Bound memory: sweep expired buckets when the map grows large.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfterSec: 0 };
}

// Best-effort client IP. Vercel sets x-forwarded-for; the first entry is the
// original client. Falls back to 'unknown' (all unknowns share one bucket).
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}
