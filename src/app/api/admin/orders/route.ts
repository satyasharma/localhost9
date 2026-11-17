import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, getServiceClient } from '@/lib/admin';

// Statuses the admin page can set (forward, back one step, or reject).
const ALLOWED_STATUSES = ['pending', 'accepted', 'delivered', 'rejected'];

// GET: Fetch all orders
export async function GET(request: NextRequest) {
  const guard = await guardAdmin(request);
  if (guard.response) return guard.response;

  const supabase = getServiceClient();
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const today = url.searchParams.get('today');
  const parsedOffset = parseInt(url.searchParams.get('offset') || '0', 10);
  const offset = Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;

  let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

  // Filter by status if provided
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Filter to today only (IST — business operates in India)
  if (today === 'true') {
    // Get current time in IST and find midnight IST in UTC
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffsetMs);
    // Midnight IST today in UTC
    const midnightIST_UTC = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - istOffsetMs);
    query = query.gte('created_at', midnightIST_UTC.toISOString());
  }

  const { data, error } = await query.range(offset, offset + 49);

  if (error) {
    console.error('admin orders GET failed:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH: Update order status
export async function PATCH(request: NextRequest) {
  const guard = await guardAdmin(request);
  if (guard.response) return guard.response;

  let body: { orderId?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { orderId, status } = body;
  if (typeof orderId !== 'string' || !orderId || typeof status !== 'string' || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const updateData: any = { status };

  // Set received_at timestamp when marking as received
  if (status === 'accepted') {
    updateData.received_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (error) {
    console.error('admin orders PATCH failed:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
