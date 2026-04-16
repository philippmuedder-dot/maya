import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? "";
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageBase64, mimeType, analysis, logged_at } = await req.json();

    if (!analysis) {
      return NextResponse.json({ error: "analysis is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    let photoUrl: string | null = null;

    // Upload image if provided
    if (imageBase64 && mimeType) {
      const bytes = Buffer.from(imageBase64, "base64");
      const timestamp = Date.now();
      const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const path = `${userEmail}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("meal-photos")
        .upload(path, bytes, { contentType: mimeType, upsert: false });

      if (uploadError) {
        console.error("[meals/save] storage upload error:", uploadError);
      } else {
        const { data: urlData } = supabase.storage.from("meal-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("meal_logs")
      .insert({
        user_id: userEmail,
        photo_url: photoUrl,
        meal_type: analysis.meal_type ?? null,
        foods_identified: analysis.foods_identified ?? [],
        tags: analysis.tags ?? [],
        rough_macros: analysis.rough_macros ?? null,
        ai_summary: analysis.ai_summary ?? null,
        ai_analysis: analysis,
        logged_at: logged_at ?? new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[meals/save] insert error:", error);
      return NextResponse.json({ error: "Failed to save meal." }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("[meals/save] error:", err);
    return NextResponse.json({ error: "Failed to save meal." }, { status: 500 });
  }
}
