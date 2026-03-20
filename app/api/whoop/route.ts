import { NextResponse } from "next/server";

// Phase 2 — Whoop OAuth + data fetch
export async function GET() {
  return NextResponse.json({ message: "Whoop API — Phase 2" });
}
