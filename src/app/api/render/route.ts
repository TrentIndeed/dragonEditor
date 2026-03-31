import { NextResponse } from "next/server";

/**
 * POST /api/render — Video render endpoint
 * Stub — real rendering requires FFmpeg. No external API keys needed.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const renderId = `render-${Date.now()}`;
    return NextResponse.json({
      render: { id: renderId, status: "PENDING", progress: 0 },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    render: { status: "COMPLETED", progress: 100 },
  });
}
