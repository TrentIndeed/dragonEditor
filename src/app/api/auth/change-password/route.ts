import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, hashPassword } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { username, current_password, new_password } = await req.json();

    if (!username || !current_password || !new_password) {
      return NextResponse.json({ detail: "All fields required" }, { status: 400 });
    }
    if (new_password.length < 3) {
      return NextResponse.json({ detail: "Password must be at least 3 characters" }, { status: 400 });
    }

    const db = await getDb();
    const rows = db.exec("SELECT password_hash FROM users WHERE username = ?", [username]);
    if (!rows.length || !rows[0].values.length) {
      return NextResponse.json({ detail: "User not found" }, { status: 404 });
    }

    if (rows[0].values[0][0] !== hashPassword(current_password)) {
      return NextResponse.json({ detail: "Current password is incorrect" }, { status: 401 });
    }

    db.run("UPDATE users SET password_hash = ? WHERE username = ?", [hashPassword(new_password), username]);
    saveDb();

    return NextResponse.json({ status: "ok", message: "Password changed" });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: 500 });
  }
}
