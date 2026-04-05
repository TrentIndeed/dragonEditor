import { NextRequest, NextResponse } from "next/server";
import { getDb, verifyToken } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ detail: "Token required" }, { status: 400 });
    }

    const db = await getDb();
    const username = verifyToken(token, db);

    if (!username) {
      return NextResponse.json({ detail: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json({ status: "ok", username });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || "Verify failed" }, { status: 500 });
  }
}
