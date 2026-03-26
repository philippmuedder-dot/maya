"use client";

import { useEffect, useRef, useState } from "react";

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
    genes: ["APOE", "ACE", "NOS3"],
    description: "Heart health, blood pressure, lipid metabolism",
  },
  {
    label: "Athletic",
    genes: ["ACTN3", "ACE"],
    description: "Power vs endurance profile, recovery capacity",
  },
  {
    label: "Sleep",
    genes: ["PER3", "ADORA2A"],
    description: "Circadian rhythm, sleep quality, caffeine sensitivity",
  },
  {
    label: "Antioxidant",
    genes: ["SOD2", "VDR"],
    description: "Oxidative stress defence, mitochondrial health, Vitamin D",
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

export default function GeneticsPage() {
  const [variants, setVariants] = useState<GeneticVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/genetics/variants")
      .then((r) => (r.ok ? r.json() : []))
      .then(setVariants)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  // Group variants by category
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
          Upload your raw DNA data to extract health-relevant SNPs. Supports 23andMe, AncestryDNA (.txt, .csv, .vcf).
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
              Raw data file from 23andMe or AncestryDNA
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-sm rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {uploading ? "Analyzing…" : "Choose file"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.vcf"
          onChange={handleFileChange}
          className="hidden"
        />

        {uploading && (
          <p className="text-xs text-neutral-400 animate-pulse mt-2">
            Extracting SNPs with Claude… this may take 10–20 seconds
          </p>
        )}
        {uploadError && (
          <p className="text-xs text-red-500 mt-2">{uploadError}</p>
        )}
        {uploadSuccess && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            {variants.length} variants extracted successfully.
          </p>
        )}

        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-3">
          Your raw data is stored privately. Only the target SNPs are sent to Claude for analysis — not your full genome.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-neutral-400 animate-pulse">Loading variants…</div>
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
        <div className="flex gap-3 mb-6">
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
        </div>
      )}

      {/* Grouped by category */}
      <div className="space-y-8">
        {grouped.map((cat) => (
          <CategorySection key={cat.label} label={cat.label} description={cat.description} items={cat.items} />
        ))}

        {ungrouped.length > 0 && (
          <CategorySection label="Other" description="Additional SNPs found" items={ungrouped} />
        )}
      </div>
    </div>
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
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          {label}
        </h2>
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
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${config.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
        </div>
      </div>
    </div>
  );
}
