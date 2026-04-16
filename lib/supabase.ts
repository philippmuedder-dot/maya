import { createClient } from "@supabase/supabase-js";

export type MealLog = {
  id: string;
  user_id: string;
  photo_url: string | null;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack" | null;
  foods_identified: string[] | null;
  tags: string[] | null;
  rough_macros: Record<string, unknown> | null;
  ai_summary: string | null;
  ai_analysis: Record<string, unknown> | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Server-side only — uses service role key, bypasses RLS, no session persistence */
export function createServiceClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
