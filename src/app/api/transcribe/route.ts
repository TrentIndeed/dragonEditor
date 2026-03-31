import { NextResponse } from "next/server";

/**
 * POST /api/transcribe — Transcription endpoint
 * Stub — real transcription needs Whisper/Deepgram integration.
 * No external API keys needed.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      id: `transcribe-${Date.now()}`,
      status: "COMPLETED",
      message: "Transcription requires Whisper integration. Use the AI Pipeline for mock transcript.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
