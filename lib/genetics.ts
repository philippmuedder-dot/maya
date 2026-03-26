import { createServiceClient } from "@/lib/supabase";

/**
 * Fetches risk-level genetic variants for a user and returns a formatted
 * string to append to Claude system prompts. Returns empty string on error.
 */
export async function getGeneticContext(userId: string): Promise<string> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("genetic_variants")
      .select("gene, rsid, genotype, trait, impact, recommendation")
      .eq("user_id", userId)
      .in("impact", ["risk", "positive"])
      .order("impact", { ascending: true }); // risk first

    if (!data || data.length === 0) return "";

    const lines = data.map(
      (v: {
        gene: string;
        rsid: string;
        genotype: string;
        trait: string;
        impact: string;
        recommendation: string;
      }) =>
        `[${v.impact.toUpperCase()}] ${v.gene} (${v.rsid} ${v.genotype}): ${v.trait} — ${v.recommendation}`
    );
    return "\n\n## Genetic variants:\n" + lines.join("\n");
  } catch {
    return "";
  }
}
