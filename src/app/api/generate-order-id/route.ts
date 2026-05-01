import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { customerId } = await request.json();

    if (!customerId) {
      return NextResponse.json(
        { error: 'Missing required field: customerId' },
        { status: 400 }
      );
    }

    // Last 2 chars of customer ID, uppercased
    const prefix = customerId.slice(-2).toUpperCase();

    // Random 5-digit number (10000–99999)
    const random = Math.floor(10000 + Math.random() * 90000);

    const displayOrderId = `${prefix}${random}`;

    return NextResponse.json({ displayOrderId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
