import { NextResponse } from "next/server";

// Phase 3 — File upload handling (Apple Health XML, bloodwork PDF)
export async function POST() {
  return NextResponse.json({ message: "Upload API — Phase 3" });
}
