import { NextRequest, NextResponse } from "next/server";
import { getDb, hashPassword, makeToken } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username?.trim() || !password) {
      return NextResponse.json({ detail: "Username and password required" }, { status: 400 });
    }

    const db = await getDb();

    const rows = db.exec("SELECT password_hash FROM users WHERE username = ?", [username.trim()]);
    if (!rows.length || !rows[0].values.length) {
      return NextResponse.json({ detail: "Invalid username or password" }, { status: 401 });
    }

    const storedHash = rows[0].values[0][0] as string;
    if (storedHash !== hashPassword(password)) {
      return NextResponse.json({ detail: "Invalid username or password" }, { status: 401 });
    }

    const token = makeToken(username.trim());
    return NextResponse.json({ token, status: "ok", username: username.trim() });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || "Login failed" }, { status: 500 });
  }
}
