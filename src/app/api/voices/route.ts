import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json({
    voices: [],
    message: "AI voice generation requires additional integration.",
  });
}

export async function GET() {
  return NextResponse.json({ voices: [] });
}
