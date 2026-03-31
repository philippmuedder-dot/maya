import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

// GET — list all bloodwork results for user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("bloodwork_results")
    .select("*")
    .eq("user_id", session.user.email)
    .order("test_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST — save a confirmed bloodwork result (called after user reviews + sets date)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { markers, test_date, lab_name, file_path } = body;

  if (!markers) {
    return NextResponse.json({ error: "markers are required." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: row, error: dbError } = await supabase
    .from("bloodwork_results")
    .insert({
      user_id: session.user.email,
      test_date: test_date || null,
      lab_name: lab_name || null,
      markers,
      file_path: file_path || null,
    })
    .select()
    .single();

  if (dbError) {
    console.error("[bloodwork/results] POST error:", dbError);
    return NextResponse.json({ error: "Failed to save results." }, { status: 500 });
  }

  return NextResponse.json(row, { status: 201 });
}
