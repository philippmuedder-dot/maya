import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { getValidWhoopToken, fetchWhoopData } from "@/lib/whoop";
import Anthropic from "@anthropic-ai/sdk";

// GET — return cached analysis
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("genetics_analysis")
    .select("analysis, updated_at")
    .eq("user_id", session.user.email)
    .single();

  if (!data) {
    return NextResponse.json({ analysis: null });
  }

  return NextResponse.json({ analysis: data.analysis, updated_at: data.updated_at });
}

// POST — generate or regenerate analysis
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch all context data in parallel
  const [
    { data: variants },
    { data: bloodworkRows },
    { data: supplements },
    { data: recentCheckins },
    whoopData,
  ] = await Promise.all([
    supabase
      .from("genetic_variants")
      .select("gene, rsid, genotype, trait, impact, recommendation")
      .eq("user_id", session.user.email)
      .order("impact", { ascending: true }),
    supabase
      .from("bloodwork_results")
      .select("test_date, markers")
      .eq("user_id", session.user.email)
      .order("test_date", { ascending: false })
      .limit(1),
    supabase
      .from("supplements")
      .select("name, dose, unit, timing, purpose")
      .eq("user_id", session.user.email)
      .eq("active", true),
    supabase
      .from("whoop_daily_data")
      .select("date, recovery_score, hrv, sleep_hours, sleep_quality")
      .eq("user_id", session.user.email)
      .order("date", { ascending: false })
      .limit(14),
    getValidWhoopToken(session.user.email)
      .then((token) => (token ? fetchWhoopData(token) : null))
      .catch(() => null),
  ]);

  if (!variants || variants.length === 0) {
    return NextResponse.json(
      { error: "No genetic variants found. Upload your DNA file first." },
      { status: 422 }
    );
  }

  const latestBloodwork = bloodworkRows?.[0] ?? null;
  const supplementList = supplements ?? [];
  const whoopHistory = recentCheckins ?? [];

  // Summarise Whoop trends
  let whoopSummary = "No Whoop data available.";
  if (whoopHistory.length >= 3) {
    const avgRecovery =
      whoopHistory.reduce((s: number, d: { recovery_score: number | null }) => s + (d.recovery_score ?? 0), 0) /
      whoopHistory.length;
    const avgHrv =
      whoopHistory.reduce((s: number, d: { hrv: number | null }) => s + (d.hrv ?? 0), 0) /
      whoopHistory.length;
    const avgSleep =
      whoopHistory.reduce((s: number, d: { sleep_hours: number | null }) => s + (d.sleep_hours ?? 0), 0) /
      whoopHistory.length;
    whoopSummary = `${whoopHistory.length}-day averages: recovery ${avgRecovery.toFixed(0)}%, HRV ${avgHrv.toFixed(0)}ms, sleep ${avgSleep.toFixed(1)}hrs`;
  }
  if (whoopData?.recovery?.score) {
    const r = whoopData.recovery.score;
    whoopSummary += ` | Today: recovery ${r.recovery_score}%, HRV ${r.hrv_rmssd_milli}ms, RHR ${r.resting_heart_rate}bpm`;
  }

  const prompt = `Based on these genetic variants, bloodwork, supplements and health data, provide a comprehensive nutrigenomic analysis.

GENETIC VARIANTS:
${JSON.stringify(variants, null, 2)}

CURRENT SUPPLEMENTS:
${supplementList.length > 0 ? JSON.stringify(supplementList, null, 2) : "None logged"}

LATEST BLOODWORK:
${latestBloodwork ? JSON.stringify(latestBloodwork.markers, null, 2) : "No bloodwork uploaded"}

WHOOP / RECOVERY DATA:
${whoopSummary}

Provide analysis with these sections. Return ONLY valid JSON, no markdown:
{
  "top5": [
    {
      "rank": 1,
      "gene": "gene name",
      "rsid": "rsid",
      "finding": "what the variant means in plain language",
      "why_it_matters": "why this is specifically relevant for longevity, muscle building, mental clarity, or stress resilience",
      "action": "specific actionable step to take right now"
    }
  ],
  "supplements": {
    "add": ["supplement — reason based on genetics"],
    "remove": ["supplement — reason"],
    "adjust": ["supplement dose or timing change — reason"],
    "notes": "overall supplement strategy based on genetics"
  },
  "training": {
    "profile": "power-dominant | endurance-dominant | balanced",
    "explanation": "what ACTN3, ACE, PPARGC1A say about their athletic genetics",
    "optimal_type": "specific training recommendation",
    "recovery_time": "genetic recovery window between hard sessions",
    "advice": "key training principle for this genetic profile"
  },
  "chronotype": {
    "genetic_window": "e.g. 23:00–07:30",
    "type": "morning lark | evening owl | intermediate",
    "fighting_chronotype": true or false,
    "explanation": "what PER3, CLOCK say about their circadian genetics",
    "advice": "specific sleep timing and scheduling advice"
  },
  "stress": {
    "profile": "warrior | worrier | mixed",
    "comt_type": "fast metaboliser | slow metaboliser",
    "explanation": "what COMT, SLC6A4, BDNF say about stress handling",
    "strengths": "cognitive advantages of this profile",
    "vulnerabilities": "situations that challenge this profile",
    "advice": "specific stress management strategy for this genotype"
  },
  "longevity": {
    "apoe_status": "e2/e2 | e2/e3 | e3/e3 | e3/e4 | e4/e4 — or unknown",
    "key_risks": ["specific risk to monitor"],
    "priorities": ["specific longevity action ranked by impact"],
    "monitoring": "what biomarkers to track given this genetic profile"
  },
  "nutrition": {
    "caffeine_metabolism": "fast | slow | very slow",
    "cyp1a2_advice": "specific caffeine timing and dose recommendation",
    "fto_type": "risk allele present | no risk allele",
    "metabolism_notes": "how FTO affects their metabolism and what to do about it",
    "il6_inflammation": "high sensitivity | normal",
    "anti_inflammatory_priority": "dietary approach given IL6 status"
  }
}

Rules:
- Top 5 must be ranked by actionability and personal relevance — not just risk level
- Be specific with doses, times, and recommendations — no vague advice
- Reference the actual genotypes found, not just the genes
- If bloodwork data is available, cross-reference with genetic predispositions
- If a variant was not found in their data, acknowledge the missing data gracefully`;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system:
        "You are an expert in nutrigenomics and personalized medicine. Analyze this person's genetic variants in context of their bloodwork, supplements, and health data. Be specific and actionable. This person's goal stack in priority order: longevity, muscle building, mental clarity, stress resilience.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const analysis = JSON.parse(text);

    // Cache in genetics_analysis table
    const now = new Date().toISOString();
    await supabase.from("genetics_analysis").upsert(
      {
        user_id: session.user.email,
        analysis,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ analysis, updated_at: now });
  } catch (err) {
    console.error("[genetics/insights] Claude API error:", err);
    return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 });
  }
}
