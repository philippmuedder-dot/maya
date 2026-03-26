"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface GeneticVariant {
  id: string;
  rsid: string;
  gene: string;
  genotype: string;
  trait: string;
  impact: "positive" | "neutral" | "risk";
  recommendation: string;
  created_at: string;
}

interface Top5Item {
  rank: number;
  gene: string;
  rsid: string;
  finding: string;
  why_it_matters: string;
  action: string;
}

interface GeneticAnalysis {
  top5: Top5Item[];
  supplements: {
    add: string[];
    remove: string[];
    adjust: string[];
    notes: string;
  };
  training: {
    profile: string;
    explanation: string;
    optimal_type: string;
    recovery_time: string;
    advice: string;
  };
  chronotype: {
    genetic_window: string;
    type: string;
    fighting_chronotype: boolean;
    explanation: string;
    advice: string;
  };
  stress: {
    profile: string;
    comt_type: string;
    explanation: string;
    strengths: string;
    vulnerabilities: string;
    advice: string;
  };
  longevity: {
    apoe_status: string;
    key_risks: string[];
    priorities: string[];
    monitoring: string;
  };
  nutrition: {
    caffeine_metabolism: string;
    cyp1a2_advice: string;
    fto_type: string;
    metabolism_notes: string;
    il6_inflammation: string;
    anti_inflammatory_priority: string;
  };
}

type Category = {
  label: string;
  genes: string[];
  description: string;
};

const CATEGORIES: Category[] = [
  {
    label: "Methylation",
    genes: ["MTHFR"],
    description: "Folate metabolism, detoxification, cardiovascular health",
  },
  {
    label: "Neurotransmitters",
    genes: ["COMT", "SLC6A4", "BDNF"],
    description: "Dopamine & serotonin regulation, mood, cognitive function",
  },
  {
    label: "Cardiovascular",
    genes: ["APOE", "ACE", "NOS3", "IL6"],
    description: "Heart health, blood pressure, lipid metabolism, inflammation",
  },
  {
    label: "Athletic",
    genes: ["ACTN3", "ACE", "PPARGC1A"],
    description: "Power vs endurance profile, mitochondrial capacity, recovery",
  },
  {
    label: "Sleep & Circadian",
    genes: ["PER3", "ADORA2A", "CLOCK"],
    description: "Chronotype, circadian rhythm, sleep quality, caffeine sensitivity",
  },
  {
    label: "Antioxidant & Vitamin D",
    genes: ["SOD2", "VDR"],
    description: "Oxidative stress defence, mitochondrial health, Vitamin D",
  },
  {
    label: "Metabolism & Nutrition",
    genes: ["FTO", "CYP1A2"],
    description: "Metabolic rate, obesity risk, caffeine processing speed",
  },
];

const IMPACT_CONFIG = {
  risk: {
    label: "Risk variant",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    dot: "bg-red-500",
  },
  positive: {
    label: "Beneficial",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    dot: "bg-green-500",
  },
  neutral: {
    label: "Neutral",
    badge: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    dot: "bg-neutral-400",
  },
};

const INSIGHT_SECTIONS = [
  { key: "supplements", label: "Supplement Optimisation", emoji: "💊" },
  { key: "training", label: "Training Profile", emoji: "🏋️" },
  { key: "chronotype", label: "Chronotype & Sleep", emoji: "🌙" },
  { key: "stress", label: "Stress & Mental Resilience", emoji: "🧠" },
  { key: "longevity", label: "Longevity Priorities", emoji: "❤️" },
  { key: "nutrition", label: "Caffeine & Nutrition", emoji: "☕" },
];

export default function GeneticsPage() {
  const [variants, setVariants] = useState<GeneticVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [analysis, setAnalysis] = useState<GeneticAnalysis | null>(null);
  const [analysisUpdatedAt, setAnalysisUpdatedAt] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAnalysis = useCallback(async () => {
    const res = await fetch("/api/genetics/insights");
    if (res.ok) {
      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
        setAnalysisUpdatedAt(data.updated_at ?? null);
      }
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/genetics/variants")
        .then((r) => (r.ok ? r.json() : []))
        .then(setVariants)
        .catch(() => {}),
      fetchAnalysis(),
    ]).finally(() => setLoading(false));
  }, [fetchAnalysis]);

  async function generateAnalysis() {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const res = await fetch("/api/genetics/insights", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(data.error ?? "Failed to generate analysis");
        return;
      }
      setAnalysis(data.analysis);
      setAnalysisUpdatedAt(data.updated_at ?? null);
    } catch {
      setAnalysisError("Network error — please try again");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/genetics/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
        return;
      }

      setVariants(data.variants ?? []);
      setUploadSuccess(true);
      // Auto-generate analysis after successful upload
      generateAnalysis();
    } catch {
      setUploadError("Network error — please try again");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: variants.filter((v) => cat.genes.includes(v.gene)),
  })).filter((cat) => cat.items.length > 0);

  const ungrouped = variants.filter(
    (v) => !CATEGORIES.some((c) => c.genes.includes(v.gene))
  );

  const riskCount = variants.filter((v) => v.impact === "risk").length;
  const positiveCount = variants.filter((v) => v.impact === "positive").length;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Genetics
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Upload your raw DNA data to extract health-relevant SNPs and generate a personalised nutrigenomic analysis.
        </p>
      </div>

      {/* Upload section */}
      <div className="mb-8 p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {variants.length > 0 ? "Re-upload genetic data" : "Upload genetic data"}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              23andMe or AncestryDNA raw data (.txt, .csv, .vcf)
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || analysisLoading}
            className="px-4 py-2 text-sm rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {uploading ? "Extracting SNPs…" : "Choose file"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.vcf"
          onChange={handleFileChange}
          className="hidden"
        />

        {(uploading || analysisLoading) && (
          <p className="text-xs text-neutral-400 animate-pulse mt-2">
            {uploading
              ? "Extracting SNPs with Claude… 10–20 seconds"
              : "Generating comprehensive analysis… 20–30 seconds"}
          </p>
        )}
        {uploadError && (
          <p className="text-xs text-red-500 mt-2">{uploadError}</p>
        )}
        {uploadSuccess && !analysisLoading && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            {variants.length} variants extracted. Analysis generated below.
          </p>
        )}

        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-3">
          Only target SNP lines are sent to Claude — not your full genome.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-neutral-400 animate-pulse">Loading…</div>
      )}

      {!loading && variants.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🧬</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No genetic data yet. Upload your raw DNA file to get started.
          </p>
        </div>
      )}

      {/* Summary bar */}
      {variants.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-neutral-700 dark:text-neutral-300">
              {riskCount} risk {riskCount === 1 ? "variant" : "variants"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-neutral-700 dark:text-neutral-300">
              {positiveCount} beneficial
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            <span className="text-xs text-neutral-700 dark:text-neutral-300">
              {variants.length - riskCount - positiveCount} neutral
            </span>
          </div>
          <div className="flex-1" />
          {!analysis && !analysisLoading && variants.length > 0 && (
            <button
              onClick={generateAnalysis}
              className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Generate analysis
            </button>
          )}
          {analysis && !analysisLoading && (
            <button
              onClick={generateAnalysis}
              className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Regenerate
            </button>
          )}
        </div>
      )}

      {/* Analysis loading state */}
      {analysisLoading && (
        <div className="mb-8 p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          <p className="text-sm text-neutral-400 animate-pulse">
            Generating comprehensive genetic analysis… this may take 20–30 seconds
          </p>
        </div>
      )}

      {analysisError && (
        <div className="mb-6 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-600 dark:text-red-400">{analysisError}</p>
        </div>
      )}

      {/* ─── ANALYSIS DASHBOARD ─── */}
      {analysis && !analysisLoading && (
        <div className="mb-10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Genetic Analysis
            </h2>
            {analysisUpdatedAt && (
              <span className="text-xs text-neutral-400">
                Updated{" "}
                {new Date(analysisUpdatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
          </div>

          {/* Top 5 Findings */}
          {analysis.top5 && analysis.top5.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                Top {analysis.top5.length} Highest-Impact Findings
              </p>
              <div className="space-y-3">
                {analysis.top5.map((item, i) => (
                  <Top5Card key={i} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Expandable sections */}
          <div className="space-y-2 mt-2">
            {INSIGHT_SECTIONS.map(({ key, label, emoji }) => {
              const sectionData = analysis[key as keyof GeneticAnalysis];
              if (!sectionData) return null;
              const isOpen = expandedSection === key;
              return (
                <div
                  key={key}
                  className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedSection(isOpen ? null : key)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{emoji}</span>
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {label}
                      </span>
                    </div>
                    <ChevronIcon open={isOpen} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      <SectionBody sectionKey={key} data={sectionData} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── VARIANT CARDS ─── */}
      {variants.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Your Variants
          </h2>
          <div className="space-y-8">
            {grouped.map((cat) => (
              <CategorySection
                key={cat.label}
                label={cat.label}
                description={cat.description}
                items={cat.items}
              />
            ))}
            {ungrouped.length > 0 && (
              <CategorySection
                label="Other"
                description="Additional SNPs found"
                items={ungrouped}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function Top5Card({ item }: { item: Top5Item }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3"
      >
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center mt-0.5">
            {item.rank}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {item.gene}
              </span>
              {item.rsid && (
                <span className="text-xs text-neutral-400 font-mono">{item.rsid}</span>
              )}
            </div>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5 leading-snug">
              {item.finding}
            </p>
          </div>
          <ChevronIcon open={expanded} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-3">
          {item.why_it_matters && (
            <div>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Why it matters
              </p>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">
                {item.why_it_matters}
              </p>
            </div>
          )}
          {item.action && (
            <div className="px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                Action
              </p>
              <p className="text-sm text-neutral-900 dark:text-neutral-100 font-medium leading-snug">
                {item.action}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionBody({
  sectionKey,
  data,
}: {
  sectionKey: string;
  data: unknown;
}) {
  if (sectionKey === "supplements") {
    const d = data as GeneticAnalysis["supplements"];
    return (
      <div className="space-y-3 text-sm">
        {d.add?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Add</p>
            <ul className="space-y-1">
              {d.add.map((s, i) => (
                <li key={i} className="text-neutral-700 dark:text-neutral-300 leading-snug">
                  + {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {d.remove?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-red-500 mb-1">Consider removing</p>
            <ul className="space-y-1">
              {d.remove.map((s, i) => (
                <li key={i} className="text-neutral-700 dark:text-neutral-300 leading-snug">
                  − {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {d.adjust?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-1">Adjust</p>
            <ul className="space-y-1">
              {d.adjust.map((s, i) => (
                <li key={i} className="text-neutral-700 dark:text-neutral-300 leading-snug">
                  ↕ {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {d.notes && (
          <p className="text-neutral-500 dark:text-neutral-400 text-xs border-t border-neutral-100 dark:border-neutral-800 pt-2">
            {d.notes}
          </p>
        )}
      </div>
    );
  }

  if (sectionKey === "training") {
    const d = data as GeneticAnalysis["training"];
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Profile</span>
          <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 capitalize">
            {d.profile}
          </span>
        </div>
        {d.explanation && <p className="text-neutral-700 dark:text-neutral-300 leading-snug">{d.explanation}</p>}
        {d.optimal_type && (
          <InfoRow label="Optimal type" value={d.optimal_type} />
        )}
        {d.recovery_time && (
          <InfoRow label="Recovery window" value={d.recovery_time} />
        )}
        {d.advice && (
          <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">{d.advice}</p>
          </div>
        )}
      </div>
    );
  }

  if (sectionKey === "chronotype") {
    const d = data as GeneticAnalysis["chronotype"];
    return (
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-2">
          {d.type && (
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 capitalize">
              {d.type}
            </span>
          )}
          {d.genetic_window && (
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-mono text-neutral-700 dark:text-neutral-300">
              {d.genetic_window}
            </span>
          )}
          {d.fighting_chronotype && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-xs font-medium text-yellow-700 dark:text-yellow-300">
              Fighting chronotype
            </span>
          )}
        </div>
        {d.explanation && (
          <p className="text-neutral-700 dark:text-neutral-300 leading-snug">{d.explanation}</p>
        )}
        {d.advice && (
          <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">{d.advice}</p>
          </div>
        )}
      </div>
    );
  }

  if (sectionKey === "stress") {
    const d = data as GeneticAnalysis["stress"];
    return (
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-2">
          {d.profile && (
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 capitalize">
              {d.profile}
            </span>
          )}
          {d.comt_type && (
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 capitalize">
              COMT: {d.comt_type}
            </span>
          )}
        </div>
        {d.explanation && (
          <p className="text-neutral-700 dark:text-neutral-300 leading-snug">{d.explanation}</p>
        )}
        {d.strengths && <InfoRow label="Strengths" value={d.strengths} />}
        {d.vulnerabilities && <InfoRow label="Watch for" value={d.vulnerabilities} />}
        {d.advice && (
          <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">{d.advice}</p>
          </div>
        )}
      </div>
    );
  }

  if (sectionKey === "longevity") {
    const d = data as GeneticAnalysis["longevity"];
    return (
      <div className="space-y-2 text-sm">
        {d.apoe_status && (
          <InfoRow label="APOE status" value={d.apoe_status} />
        )}
        {d.key_risks?.length > 0 && (
          <div>
            <p className="text-xs text-neutral-500 mb-1">Key risks to address</p>
            <ul className="space-y-1">
              {d.key_risks.map((r, i) => (
                <li key={i} className="text-neutral-700 dark:text-neutral-300 leading-snug flex gap-1.5">
                  <span className="text-red-400 flex-shrink-0">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
        )}
        {d.priorities?.length > 0 && (
          <div>
            <p className="text-xs text-neutral-500 mb-1">Priorities</p>
            <ul className="space-y-1">
              {d.priorities.map((p, i) => (
                <li key={i} className="text-neutral-700 dark:text-neutral-300 leading-snug flex gap-1.5">
                  <span className="text-green-500 flex-shrink-0">{i + 1}.</span> {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {d.monitoring && (
          <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-xs text-neutral-500 mb-0.5">What to monitor</p>
            <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">{d.monitoring}</p>
          </div>
        )}
      </div>
    );
  }

  if (sectionKey === "nutrition") {
    const d = data as GeneticAnalysis["nutrition"];
    return (
      <div className="space-y-2 text-sm">
        {d.caffeine_metabolism && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Caffeine metabolism</span>
            <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 capitalize">
              {d.caffeine_metabolism}
            </span>
          </div>
        )}
        {d.cyp1a2_advice && (
          <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-xs text-neutral-500 mb-0.5">Caffeine advice</p>
            <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">{d.cyp1a2_advice}</p>
          </div>
        )}
        {d.fto_type && <InfoRow label="FTO type" value={d.fto_type} />}
        {d.metabolism_notes && (
          <p className="text-neutral-700 dark:text-neutral-300 leading-snug">{d.metabolism_notes}</p>
        )}
        {d.il6_inflammation && (
          <InfoRow label="IL6 inflammation sensitivity" value={d.il6_inflammation} />
        )}
        {d.anti_inflammatory_priority && (
          <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <p className="text-xs text-neutral-500 mb-0.5">Dietary priority</p>
            <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-snug">
              {d.anti_inflammatory_priority}
            </p>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs text-neutral-500 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">{value}</span>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-neutral-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
    </svg>
  );
}

function CategorySection({
  label,
  description,
  items,
}: {
  label: string;
  description: string;
  items: GeneticVariant[];
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          {label}
        </h3>
        <p className="text-xs text-neutral-400 mt-0.5">{description}</p>
      </div>
      <div className="space-y-2">
        {items.map((v) => (
          <VariantCard key={v.id} variant={v} />
        ))}
      </div>
    </div>
  );
}

function VariantCard({ variant }: { variant: GeneticVariant }) {
  const config = IMPACT_CONFIG[variant.impact];

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {variant.gene}
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              {variant.rsid}
            </span>
            <span className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
              {variant.genotype}
            </span>
          </div>
          {variant.trait && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {variant.trait}
            </p>
          )}
          {variant.recommendation && (
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-2 leading-snug">
              {variant.recommendation}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${config.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}
