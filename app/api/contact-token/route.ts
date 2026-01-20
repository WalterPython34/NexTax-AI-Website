import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const ts = Date.now().toString();
  const secret = process.env.CONTACT_TOKEN_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "Missing CONTACT_TOKEN_SECRET" }, { status: 500 });
  }

  const sig = crypto.createHmac("sha256", secret).update(ts).digest("hex");
  const token = `${ts}.${sig}`;

  return NextResponse.json({ token });
}
