import { NextRequest, NextResponse } from 'next/server';
import { guardAdmin, getServiceClient } from '@/lib/admin';

// GET: Fetch all dishes (including unavailable)
export async function GET(request: NextRequest) {
  const guard = await guardAdmin(request);
  if (guard.response) return guard.response;

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
  const guard = await guardAdmin(request);
  if (guard.response) return guard.response;

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
