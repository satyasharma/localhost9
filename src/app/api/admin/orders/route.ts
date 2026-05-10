import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['satyasharma397@gmail.com'];

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyAdmin(request: NextRequest): Promise<string | null> {
  // Get the user's session token from the cookie/header
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.replace('Bearer ', '');
  const userClient = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user } } = await userClient.auth.getUser(token);
  if (!user?.email || !ADMIN_EMAILS.includes(user.email)) return null;
  return user.email;
}

// GET: Fetch all orders
export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const today = url.searchParams.get('today');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

  // Filter by status if provided
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Filter to today only if requested
  if (today === 'true') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    query = query.gte('created_at', todayStart.toISOString());
  }

  const { data, error } = await query.range(offset, offset + 49);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH: Update order status
export async function PATCH(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { orderId, status } = await request.json();
  if (!orderId || !status) {
    return NextResponse.json({ error: 'orderId and status required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const updateData: any = { status };

  // Set received_at timestamp when marking as received
  if (status === 'received') {
    updateData.received_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
