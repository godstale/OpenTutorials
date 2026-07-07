import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ orphanedCourses: [] });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true, cleanedCount: 0 });
}
