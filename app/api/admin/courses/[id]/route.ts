import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  return NextResponse.json({ error: 'Course not found (deprecated)' }, { status: 404 });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: 'Course not found (deprecated)' }, { status: 404 });
}
