import { NextRequest, NextResponse } from 'next/server';
import { executeLocalQuery } from '@/lib/db/local-db-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, action, data } = body;

    if (!query || !action) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const result = executeLocalQuery(query, action, data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing local db query via API:', error);
    return NextResponse.json({ data: null, error: { message: error.message } }, { status: 500 });
  }
}
