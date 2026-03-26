import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

// Target rsids we care about
const TARGET_RSIDS = [
  "rs1801133", "rs1801131", // MTHFR
  "rs4680",                  // COMT
  "rs2228570",               // VDR
  "rs429358", "rs7412",      // APOE
  "rs1815739",               // ACTN3
  "rs3027172",               // PER3
  "rs5751876",               // ADORA2A
  "rs4795541",               // SLC6A4
  "rs6265",                  // BDNF
  "rs1799752",               // ACE
  "rs4880",                  // SOD2
  "rs1799983",               // NOS3
  "rs8192678",               // PPARGC1A (mitochondrial biogenesis)
  "rs9939609",               // FTO (metabolism / obesity risk)
  "rs1800795",               // IL6 (inflammation)
  "rs762551",                // CYP1A2 (caffeine metabolism)
  "rs1801260",               // CLOCK (circadian rhythm)
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let fileContent: string;
  let fileName: string;
  let fileBuffer: ArrayBuffer;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [".txt", ".csv", ".vcf"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return NextResponse.json(
        { error: "Only .txt, .csv, and .vcf files are supported" },
        { status: 400 }
      );
    }

    fileName = file.name;
    fileBuffer = await file.arrayBuffer();
    fileContent = new TextDecoder("utf-8").decode(fileBuffer);
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 400 });
  }

  // Upload raw file to Supabase Storage
  const supabase = createServiceClient();
  const timestamp = Date.now();
  const storagePath = `${session.user.email}/${timestamp}-${fileName}`;

  try {
    await supabase.storage
      .from("genetics")
      .upload(storagePath, fileBuffer, { contentType: "text/plain", upsert: false });
  } catch {
    // Non-fatal — storage might not exist yet; continue with extraction
  }

  // Extract only lines containing target rsids to keep Claude prompt small
  const lines = fileContent.split("\n");
  const relevantLines = lines.filter((line) =>
    TARGET_RSIDS.some((rsid) => line.toLowerCase().includes(rsid.toLowerCase()))
  );

  if (relevantLines.length === 0) {
    return NextResponse.json({
      error: "No target SNPs found in this file. Make sure it is a valid 23andMe, AncestryDNA, or VCF raw data file.",
    }, { status: 422 });
  }

  // Also include header line (first non-comment line) for column context
  const headerLine = lines.find((l) => !l.startsWith("#") && l.trim().length > 0) ?? "";
  const snpData = [headerLine, ...relevantLines].join("\n");

  const prompt = `Extract health-relevant SNPs from this raw genetic data. The data format is tab or comma separated.

Raw genetic data (filtered to target SNPs only):
${snpData}

Extract these specific SNPs if present and return JSON:
{"snps": [{"gene": "string", "rsid": "string", "genotype": "string", "trait": "string", "impact": "positive"|"neutral"|"risk", "recommendation": "string"}]}

Target SNPs and their genes:
- MTHFR: rs1801133, rs1801131 (Methylation — C677T and A1298C variants)
- COMT: rs4680 (Dopamine metabolism — Val158Met)
- VDR: rs2228570 (Vitamin D receptor)
- APOE: rs429358, rs7412 (Alzheimer's / cardiovascular risk)
- ACTN3: rs1815739 (Athletic power vs endurance)
- PER3: rs3027172 (Circadian rhythm / sleep)
- ADORA2A: rs5751876 (Caffeine sensitivity / sleep)
- SLC6A4: rs4795541 (Serotonin transporter)
- BDNF: rs6265 (Brain-derived neurotrophic factor / neuroplasticity)
- ACE: rs1799752 (Blood pressure / endurance)
- SOD2: rs4880 (Antioxidant / mitochondrial)
- NOS3: rs1799983 (Nitric oxide / cardiovascular)
- PPARGC1A: rs8192678 (Mitochondrial biogenesis / endurance)
- FTO: rs9939609 (Metabolism / obesity risk)
- IL6: rs1800795 (Inflammation / immune response)
- CYP1A2: rs762551 (Caffeine metabolism — fast vs slow metaboliser)
- CLOCK: rs1801260 (Circadian rhythm / chronotype)

For each found SNP:
- Set impact based on the genotype: "risk" for clinically significant risk variants, "positive" for beneficial variants, "neutral" for common/benign variants
- Write recommendation as a specific, actionable health suggestion (1-2 sentences)
- If a SNP is not found in the data, omit it entirely

Respond with ONLY valid JSON. No markdown.`;

  let extracted: { gene: string; rsid: string; genotype: string; trait: string; impact: string; recommendation: string }[] = [];

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: "You are a genetic analysis expert. Extract health-relevant SNPs from raw genetic data files and provide evidence-based interpretations.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const result = JSON.parse(text);
    extracted = Array.isArray(result.snps) ? result.snps : [];
  } catch (err) {
    console.error("[genetics/upload] Claude API error:", err);
    return NextResponse.json({ error: "Failed to analyze genetic data" }, { status: 500 });
  }

  if (extracted.length === 0) {
    return NextResponse.json({ variants: [], message: "No recognized SNPs could be extracted." });
  }

  // Delete old variants for this user and insert fresh ones
  await supabase.from("genetic_variants").delete().eq("user_id", session.user.email);

  const validImpacts = ["positive", "neutral", "risk"];
  const rows = extracted
    .filter((v) => v.rsid && v.genotype && validImpacts.includes(v.impact))
    .map((v) => ({
      user_id: session.user?.email ?? "",
      rsid: v.rsid,
      gene: v.gene ?? null,
      genotype: v.genotype,
      trait: v.trait ?? null,
      impact: v.impact,
      recommendation: v.recommendation ?? null,
    }));

  const { data: inserted, error } = await supabase
    .from("genetic_variants")
    .insert(rows)
    .select();

  if (error) {
    console.error("[genetics/upload] DB insert error:", error);
    return NextResponse.json({ error: "Failed to save variants" }, { status: 500 });
  }

  return NextResponse.json({ variants: inserted ?? [], count: rows.length });
}
