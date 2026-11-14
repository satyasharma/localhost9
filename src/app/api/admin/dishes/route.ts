import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['satyasharma397@gmail.com'];

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  const userClient = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await userClient.auth.getUser(token);
  return !!(user?.email && ADMIN_EMAILS.includes(user.email));
}

// GET: Fetch all dishes (including unavailable)
export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getServiceClient();
  const { data, error } = await supabase.from('dishes').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('admin dishes GET failed:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
  return NextResponse.json(data);
}

// PATCH: Toggle dish availability
export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: { dishId?: unknown; available?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { dishId, available } = body;
  if (typeof dishId !== 'string' || !dishId || typeof available !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const supabase = getServiceClient();
  const { error } = await supabase.from('dishes').update({ available }).eq('id', dishId);
  if (error) {
    console.error('admin dishes PATCH failed:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
