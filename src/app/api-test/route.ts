import { NextResponse } from "next/server";

// Test endpoint - simple health check
export async function POST(request: Request) {
  return NextResponse.json(
    {
      message: 'Test endpoint working',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}
