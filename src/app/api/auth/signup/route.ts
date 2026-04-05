import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, hashPassword, makeToken } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { username, password, email } = await req.json();

    if (!username?.trim() || !password) {
      return NextResponse.json({ detail: "Username and password required" }, { status: 400 });
    }
    if (password.length < 3) {
      return NextResponse.json({ detail: "Password must be at least 3 characters" }, { status: 400 });
    }

    const db = await getDb();

    // Check if user exists
    const existing = db.exec("SELECT id FROM users WHERE username = ?", [username.trim()]);
    if (existing.length && existing[0].values.length) {
      return NextResponse.json({ detail: "Username already taken" }, { status: 409 });
    }

    // Create user
    db.run("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)", [
      username.trim(),
      email || null,
      hashPassword(password),
    ]);
    saveDb();

    const token = makeToken(username.trim());
    return NextResponse.json({ token, status: "ok", username: username.trim() });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || "Signup failed" }, { status: 500 });
  }
}
