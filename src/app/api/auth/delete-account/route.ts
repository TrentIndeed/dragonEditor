import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDb, hashPassword } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ detail: "Username and password required" }, { status: 400 });
    }

    const db = await getDb();
    const rows = db.exec("SELECT password_hash FROM users WHERE username = ?", [username]);
    if (!rows.length || !rows[0].values.length) {
      return NextResponse.json({ detail: "User not found" }, { status: 404 });
    }

    if (rows[0].values[0][0] !== hashPassword(password)) {
      return NextResponse.json({ detail: "Incorrect password" }, { status: 401 });
    }

    db.run("DELETE FROM users WHERE username = ?", [username]);
    saveDb();

    return NextResponse.json({ status: "ok", message: "Account deleted" });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: 500 });
  }
}
