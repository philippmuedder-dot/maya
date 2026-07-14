"use client";

import { useEffect, useRef, useState } from "react";

const MONO = { fontFamily: "'JetBrains Mono', monospace" } as const;
const TIMINGS = ["morning", "afternoon", "evening", "night"];
const cap = (s: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

interface Supplement {
  id: string;
  name: string;
  product_name: string | null;
  dose: number | null;
  unit: string | null;
  timing: string | null;
  purpose: string | null;
  active: boolean;
}
interface ParsedItem { name: string; dose: number | null; unit: string | null; timing?: string | null; purpose: string | null; }
interface Insight { supplement: string; correlation: string; confidence: "low" | "medium" | "high"; suggestion: "continue" | "stop" | "adjust" | "restart"; reason: string; }

const SUGGESTION_STYLE: Record<Insight["suggestion"], { tag: string; color: string; bg: string; icon: string }> = {
  continue: { tag: "KEEP", color: "#4fd99a", bg: "rgba(79,217,154,0.12)", icon: "ph-fill ph-trend-up" },
  stop: { tag: "STOP", color: "#d9b45f", bg: "rgba(217,180,95,0.12)", icon: "ph-fill ph-minus-circle" },
  adjust: { tag: "ADJUST", color: "#9fb8ac", bg: "rgba(159,184,172,0.12)", icon: "ph-fill ph-sliders" },
  restart: { tag: "RESTART", color: "#4fd99a", bg: "rgba(79,217,154,0.12)", icon: "ph-fill ph-arrow-counter-clockwise" },
};

const field: React.CSSProperties = {
  ...MONO, fontSize: 13, padding: "10px 12px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.03)",
  color: "#eef0ee", width: "100%", outline: "none",
};
const primaryBtn: React.CSSProperties = {
  fontSize: 14, color: "#06231e", padding: "12px", borderRadius: 11, border: "none",
  background: "linear-gradient(135deg, #4fd99a, #1e8d63)", cursor: "pointer",
  fontFamily: "'Sora', sans-serif", fontWeight: 500,
};

interface Group { key: string; productName: string | null; items: Supplement[]; }

function buildGroups(supps: Supplement[]): Group[] {
  const byProduct = new Map<string, Supplement[]>();
  const solo: Group[] = [];
  for (const s of supps) {
    if (s.product_name) {
      const arr = byProduct.get(s.product_name) ?? [];
      arr.push(s); byProduct.set(s.product_name, arr);
    } else solo.push({ key: `solo:${s.id}`, productName: null, items: [s] });
  }
  const products = Array.from(byProduct.entries()).map(([name, items]) => ({ key: `product:${name}`, productName: name, items }));
  return [...products, ...solo];
}

function Checkbox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 24, height: 24, borderRadius: 7, flex: "none", cursor: "pointer", background: checked ? "#4fd99a" : "transparent", border: checked ? "none" : "1px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {checked && <i className="ph-bold ph-check" style={{ fontSize: 14, color: "#06231e" }} />}
    </button>
  );
}
function IconBtn({ icon, onClick, title, color = "#7d837d" }: { icon: string; onClick: () => void; title: string; color?: string }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 28, height: 28, borderRadius: 8, flex: "none", cursor: "pointer", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <i className={icon} style={{ fontSize: 14, color }} />
    </button>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, maxHeight: "88vh", overflowY: "auto", background: "#0c0e0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 26 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 400, fontSize: 20, color: "#eef0ee", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7d837d" }}><i className="ph ph-x" style={{ fontSize: 20 }} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function TimingPicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      {TIMINGS.map((t) => {
        const active = value === t;
        return <button key={t} onClick={() => onChange(t)} style={{ ...MONO, fontSize: 12, padding: "9px 14px", borderRadius: 10, cursor: "pointer", border: `1px solid ${active ? "#4fd99a" : "rgba(255,255,255,0.12)"}`, background: active ? "rgba(79,217,154,0.13)" : "transparent", color: active ? "#4fd99a" : "rgba(255,255,255,0.5)" }}>{t}</button>;
      })}
    </div>
  );
}

// ── Add single supplement ─────────────────────────────────────────────────────
function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(""); const [productName, setProductName] = useState("");
  const [dose, setDose] = useState(""); const [unit, setUnit] = useState("mg");
  const [timing, setTiming] = useState("morning"); const [purpose, setPurpose] = useState("");
  const [saving, setSaving] = useState(false); const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) { setErr("Name is required."); return; }
    setSaving(true); setErr(null);
    try {
      const res = await fetch("/api/supplements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), product_name: productName.trim() || null, dose: dose ? Number(dose) : null, unit: unit || null, timing, purpose: purpose.trim() || null, active: true }) });
      if (!res.ok) throw new Error("Failed to save");
      onSaved(); onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); } finally { setSaving(false); }
  }

  return (
    <ModalShell title="Add supplement" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input style={field} placeholder="Name (e.g. Magnesium Glycinate)" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input style={field} placeholder="Product name (optional — groups ingredients)" value={productName} onChange={(e) => setProductName(e.target.value)} />
        <div style={{ display: "flex", gap: 10 }}>
          <input style={{ ...field, flex: 2 }} placeholder="Dose" inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} />
          <input style={{ ...field, flex: 1 }} placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <TimingPicker value={timing} onChange={setTiming} />
        <input style={field} placeholder="Purpose (optional)" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        {err && <p style={{ fontSize: 12, color: "#e0807f", margin: 0 }}>{err}</p>}
        <button onClick={save} disabled={saving} style={{ ...primaryBtn, marginTop: 4, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Save supplement"}</button>
      </div>
    </ModalShell>
  );
}

// ── Scan label / paste list → parse → confirm → save all ──────────────────────
function ParseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<"photo" | "text">("photo");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<ParsedItem[] | null>(null);
  const [productName, setProductName] = useState("");
  const [timing, setTiming] = useState("morning");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function parseImage(file: File) {
    setParsing(true); setErr(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/supplements/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't read the label.");
      setItems(data.ingredients ?? []);
      setProductName(data.product_name ?? "");
      setTiming(data.timing_suggestion ?? "morning");
    } catch (e) { setErr(e instanceof Error ? e.message : "Parse failed."); } finally { setParsing(false); }
  }

  async function parseTextInput() {
    if (!text.trim()) return;
    setParsing(true); setErr(null);
    try {
      const res = await fetch("/api/supplements/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed.");
      setItems(data.supplements ?? (Array.isArray(data) ? data : []));
      setProductName("");
    } catch (e) { setErr(e instanceof Error ? e.message : "Parse failed."); } finally { setParsing(false); }
  }

  async function saveAll() {
    if (!items || items.length === 0) return;
    setSaving(true); setErr(null);
    try {
      for (const it of items) {
        await fetch("/api/supplements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: it.name, product_name: productName.trim() || null, dose: it.dose ?? null, unit: it.unit ?? null, timing: it.timing ?? timing, purpose: it.purpose ?? null, active: true }) });
      }
      onSaved(); onClose();
    } catch { setErr("Some items failed to save."); } finally { setSaving(false); }
  }

  return (
    <ModalShell title="Scan a supplement" onClose={onClose}>
      {!items ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["photo", "text"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} style={{ ...MONO, fontSize: 12, padding: "9px 16px", borderRadius: 10, cursor: "pointer", flex: 1, border: `1px solid ${mode === m ? "#4fd99a" : "rgba(255,255,255,0.12)"}`, background: mode === m ? "rgba(79,217,154,0.13)" : "transparent", color: mode === m ? "#4fd99a" : "rgba(255,255,255,0.5)" }}>
                {m === "photo" ? "Photo of label" : "Paste list"}
              </button>
            ))}
          </div>

          {mode === "photo" ? (
            <>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) parseImage(f); }} />
              <button onClick={() => fileRef.current?.click()} disabled={parsing} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "36px 20px", borderRadius: 14, border: "1px dashed rgba(79,217,154,0.35)", background: "rgba(79,217,154,0.04)", cursor: parsing ? "default" : "pointer" }}>
                <i className="ph-duotone ph-camera" style={{ fontSize: 30, color: "#4fd99a" }} />
                <span style={{ fontSize: 13.5, color: "#cdd2cd" }}>{parsing ? "Reading label…" : "Tap to upload a photo of the ingredients"}</span>
                <span style={{ ...MONO, fontSize: 10, color: "#7d837d" }}>Maya reads it and sorts the ingredients</span>
              </button>
            </>
          ) : (
            <>
              <textarea style={{ ...field, minHeight: 120, resize: "vertical" }} placeholder="Paste an ingredient list or type supplements, one per line…" value={text} onChange={(e) => setText(e.target.value)} />
              <button onClick={parseTextInput} disabled={parsing || !text.trim()} style={{ ...primaryBtn, opacity: parsing || !text.trim() ? 0.6 : 1 }}>{parsing ? "Reading…" : "Parse list"}</button>
            </>
          )}
          {err && <p style={{ fontSize: 12, color: "#e0807f", margin: 0 }}>{err}</p>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input style={field} placeholder="Product name (groups these ingredients)" value={productName} onChange={(e) => setProductName(e.target.value)} />
          <div>
            <div style={{ ...MONO, fontSize: 10, color: "#7d837d", marginBottom: 6 }}>DEFAULT TIMING</div>
            <TimingPicker value={timing} onChange={setTiming} />
          </div>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase", marginTop: 4 }}>{items.length} found</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 13, color: "#eef0ee", flex: 1 }}>{it.name}</span>
                {it.dose != null && <span style={{ ...MONO, fontSize: 11, color: "#7d837d" }}>{it.dose}{it.unit}</span>}
                <button onClick={() => setItems(items.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7d837d" }}><i className="ph ph-x" style={{ fontSize: 13 }} /></button>
              </div>
            ))}
          </div>
          {err && <p style={{ fontSize: 12, color: "#e0807f", margin: 0 }}>{err}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setItems(null)} style={{ ...MONO, fontSize: 12, padding: "12px 16px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#cdd2cd", cursor: "pointer" }}>Back</button>
            <button onClick={saveAll} disabled={saving || items.length === 0} style={{ ...primaryBtn, flex: 1, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : `Save all ${items.length}`}</button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ── Edit / pause / delete a single supplement ─────────────────────────────────
function EditModal({ supplement, onClose, onSaved }: { supplement: Supplement; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(supplement.name);
  const [dose, setDose] = useState(supplement.dose != null ? String(supplement.dose) : "");
  const [unit, setUnit] = useState(supplement.unit ?? "");
  const [timing, setTiming] = useState(supplement.timing ?? "morning");
  const [purpose, setPurpose] = useState(supplement.purpose ?? "");
  const [active, setActive] = useState(supplement.active);
  const [saving, setSaving] = useState(false); const [err, setErr] = useState<string | null>(null);

  async function save() {
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/supplements/${supplement.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), product_name: supplement.product_name, dose: dose ? Number(dose) : null, unit: unit || null, timing, purpose: purpose.trim() || null, notes: null, active }) });
      if (!res.ok) throw new Error("Failed to save");
      onSaved(); onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to save"); } finally { setSaving(false); }
  }
  async function remove() {
    if (!confirm(`Delete ${supplement.name}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/supplements/${supplement.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      onSaved(); onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed to delete"); setSaving(false); }
  }

  return (
    <ModalShell title="Edit supplement" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input style={field} value={name} onChange={(e) => setName(e.target.value)} />
        <div style={{ display: "flex", gap: 10 }}>
          <input style={{ ...field, flex: 2 }} placeholder="Dose" inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} />
          <input style={{ ...field, flex: 1 }} placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        </div>
        <TimingPicker value={timing} onChange={setTiming} />
        <input style={field} placeholder="Purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        <button onClick={() => setActive((v) => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", cursor: "pointer" }}>
          <span style={{ fontSize: 13, color: "#cdd2cd" }}>{active ? "Active" : "Paused"}</span>
          <div style={{ width: 40, height: 22, borderRadius: 999, background: active ? "#4fd99a" : "rgba(255,255,255,0.15)", position: "relative", transition: "background 0.15s" }}>
            <div style={{ position: "absolute", top: 2, left: active ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#06231e", transition: "left 0.15s" }} />
          </div>
        </button>
        {err && <p style={{ fontSize: 12, color: "#e0807f", margin: 0 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={remove} disabled={saving} style={{ ...MONO, fontSize: 12, padding: "12px 16px", borderRadius: 11, border: "1px solid rgba(224,128,127,0.35)", background: "rgba(224,128,127,0.08)", color: "#e0807f", cursor: "pointer" }}>Delete</button>
          <button onClick={save} disabled={saving} style={{ ...primaryBtn, flex: 1, opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>
    </ModalShell>
  );
}

function ProductRow({ group, takenSet, onToggleGroup, onToggleOne, onEdit }: {
  group: Group; takenSet: Set<string>;
  onToggleGroup: (ids: string[], makeTaken: boolean) => void;
  onToggleOne: (id: string, makeTaken: boolean) => void;
  onEdit: (s: Supplement) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isProduct = group.productName != null && group.items.length > 1;
  const allTaken = group.items.every((s) => takenSet.has(s.id));
  const timeLabel = Array.from(new Set(group.items.map((s) => s.timing).filter(Boolean))).map((t) => cap(t as string)).join(", ");

  if (!isProduct) {
    const s = group.items[0];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, background: "rgba(255,255,255,0.015)" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(79,217,154,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><i className="ph-duotone ph-pill" style={{ fontSize: 19, color: "#4fd99a" }} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, color: "#eef0ee", fontWeight: 500 }}>{s.name}{s.dose != null && <span style={{ ...MONO, fontSize: 12, color: "#7d837d", fontWeight: 400 }}> {s.dose}{s.unit}</span>}</div>
          <div style={{ fontSize: 12, color: "#868d86", marginTop: 2 }}>{cap(s.timing)}{s.purpose ? ` · ${s.purpose}` : ""}</div>
        </div>
        <IconBtn icon="ph ph-pencil-simple" title="Edit" onClick={() => onEdit(s)} />
        <Checkbox checked={takenSet.has(s.id)} onClick={() => onToggleOne(s.id, !takenSet.has(s.id))} />
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, background: "rgba(255,255,255,0.015)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(79,217,154,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><i className="ph-duotone ph-package" style={{ fontSize: 19, color: "#4fd99a" }} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, color: "#eef0ee", fontWeight: 500 }}>{group.productName}</div>
          <div style={{ fontSize: 12, color: "#868d86", marginTop: 2 }}>{group.items.length} ingredients{timeLabel ? ` · ${timeLabel}` : ""}</div>
        </div>
        <button onClick={() => setExpanded((v) => !v)} style={{ ...MONO, fontSize: 10, color: "#7d837d", padding: "5px 10px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          {expanded ? "hide" : "ingredients"}<i className="ph ph-caret-down" style={{ fontSize: 11, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>
        <Checkbox checked={allTaken} onClick={() => onToggleGroup(group.items.map((s) => s.id), !allTaken)} />
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {group.items.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px 11px 22px", borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#cdd2cd" }}>{s.name}{s.dose != null && <span style={{ ...MONO, fontSize: 11, color: "#7d837d" }}> {s.dose}{s.unit}</span>}</div>
                {s.purpose && <div style={{ fontSize: 11, color: "#868d86", marginTop: 1 }}>{s.purpose}</div>}
              </div>
              <IconBtn icon="ph ph-pencil-simple" title="Edit ingredient" onClick={() => onEdit(s)} />
              <Checkbox checked={takenSet.has(s.id)} onClick={() => onToggleOne(s.id, !takenSet.has(s.id))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [takenToday, setTakenToday] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [modal, setModal] = useState<null | "add" | "scan">(null);
  const [editing, setEditing] = useState<Supplement | null>(null);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insufficient, setInsufficient] = useState(false);
  const [daysCollected, setDaysCollected] = useState(0);
  const [daysNeeded, setDaysNeeded] = useState(14);

  async function loadStack() {
    const supps: Supplement[] = await fetch("/api/supplements").then((r) => (r.ok ? r.json() : [])).catch(() => []);
    const list = Array.isArray(supps) ? supps : [];
    const taken = new Set(list.filter((s) => s.active).map((s) => s.id));
    try {
      const logs = await fetch("/api/supplements/logs").then((r) => (r.ok ? r.json() : { taken: [], skipped: [] }));
      (logs.skipped ?? []).forEach((id: string) => taken.delete(id));
      (logs.taken ?? []).forEach((id: string) => taken.add(id));
    } catch {}
    setSupplements(list); setTakenToday(taken); setLoaded(true);
  }

  useEffect(() => {
    loadStack();
    fetch("/api/insights/supplements").then((r) => r.json()).then((data) => {
      setInsights(data.insights ?? []); setInsufficient(data.insufficient_data ?? false);
      setDaysCollected(data.days_collected ?? 0); setDaysNeeded(data.days_needed ?? 14);
    }).catch(() => {}).finally(() => setInsightsLoading(false));
  }, []);

  function persist(id: string, makeTaken: boolean) {
    fetch("/api/supplements/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplement_id: id, taken: makeTaken }) }).catch(() => {});
  }
  function toggleOne(id: string, makeTaken: boolean) {
    setTakenToday((prev) => { const n = new Set(prev); if (makeTaken) n.add(id); else n.delete(id); return n; });
    persist(id, makeTaken);
  }
  function toggleGroup(ids: string[], makeTaken: boolean) {
    setTakenToday((prev) => { const n = new Set(prev); ids.forEach((id) => (makeTaken ? n.add(id) : n.delete(id))); return n; });
    ids.forEach((id) => persist(id, makeTaken));
  }

  const activeGroups = buildGroups(supplements.filter((s) => s.active));
  const pausedGroups = buildGroups(supplements.filter((s) => !s.active));
  const groupsTaken = activeGroups.filter((g) => g.items.every((s) => takenToday.has(s.id))).length;

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -180, left: "30%", width: 680, height: 460, background: "radial-gradient(ellipse at center, rgba(79,217,154,0.08), rgba(79,217,154,0) 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "34px 44px 56px" }}>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 30, flexWrap: "wrap" }}>
          <div>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: "2px", color: "#7d837d", textTransform: "uppercase", marginBottom: 8 }}>Stack · learning engine</div>
            <h1 style={{ fontWeight: 300, fontSize: 32, color: "#eef0ee", margin: 0, letterSpacing: "-0.4px" }}>Supplements</h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setModal("scan")} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#cdd2cd", padding: "11px 16px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", cursor: "pointer", fontFamily: "'Sora', sans-serif" }}>
              <i className="ph ph-camera" style={{ fontSize: 16, color: "#4fd99a" }} />Scan label
            </button>
            <button onClick={() => setModal("add")} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: "#06231e", padding: "11px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg, #4fd99a, #1e8d63)", cursor: "pointer", fontFamily: "'Sora', sans-serif", fontWeight: 500 }}>
              <i className="ph-bold ph-plus" style={{ fontSize: 16 }} />Add
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_372px]" style={{ gap: 18, alignItems: "start" }}>
          <div>
            <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1.5px", color: "#7d837d", textTransform: "uppercase" }}>Today&apos;s stack</span>
                <span style={{ ...MONO, fontSize: 11, color: "#4fd99a" }}>{groupsTaken} of {activeGroups.length} taken</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {!loaded ? (
                  [0, 1, 2].map((i) => <div key={i} style={{ height: 68, borderRadius: 12, background: "rgba(255,255,255,0.03)", animation: "mayaBreathe 4s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />)
                ) : activeGroups.length === 0 ? (
                  <div style={{ padding: "28px 16px", textAlign: "center" }}>
                    <p style={{ fontSize: 13.5, color: "#868d86", margin: "0 0 14px" }}>No active supplements yet.</p>
                    <button onClick={() => setModal("scan")} style={{ ...MONO, fontSize: 12, padding: "9px 16px", borderRadius: 10, border: "1px solid #4fd99a", background: "rgba(79,217,154,0.13)", color: "#4fd99a", cursor: "pointer" }}>Scan a label to start</button>
                  </div>
                ) : (
                  activeGroups.map((g) => <ProductRow key={g.key} group={g} takenSet={takenToday} onToggleGroup={toggleGroup} onToggleOne={toggleOne} onEdit={setEditing} />)
                )}
                {pausedGroups.map((g) => (
                  <div key={g.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px dashed rgba(217,180,95,0.3)", borderRadius: 12, background: "rgba(217,180,95,0.03)", opacity: 0.85 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(217,180,95,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><i className="ph-duotone ph-pause" style={{ fontSize: 18, color: "#d9b45f" }} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, color: "#cdd2cd", fontWeight: 500 }}>{g.productName ?? g.items[0].name}</div>
                      <div style={{ fontSize: 12, color: "#a08a55", marginTop: 2 }}>Paused{g.productName ? ` · ${g.items.length} ingredients` : ""}</div>
                    </div>
                    <IconBtn icon="ph ph-pencil-simple" title="Edit" onClick={() => setEditing(g.items[0])} color="#d9b45f" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ border: "1px solid rgba(79,217,154,0.2)", borderRadius: 16, background: "linear-gradient(160deg, rgba(79,217,154,0.06), rgba(79,217,154,0))", padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <i className="ph-duotone ph-brain" style={{ fontSize: 17, color: "#4fd99a" }} />
                <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#4fd99a", textTransform: "uppercase" }}>What Maya has learned</span>
              </div>
              {insightsLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{[0, 1, 2].map((i) => <div key={i} style={{ height: 36, borderRadius: 8, background: "rgba(255,255,255,0.03)", animation: "mayaBreathe 4s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />)}</div>
              ) : insufficient ? (
                <div>
                  <p style={{ fontSize: 13, color: "#868d86", margin: "0 0 12px", lineHeight: 1.5 }}>Building your supplement profile — {daysCollected} of {daysNeeded} days collected. Keep logging to unlock correlations with your recovery data.</p>
                  <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, (daysCollected / Math.max(1, daysNeeded)) * 100)}%`, background: "#4fd99a", borderRadius: 999 }} /></div>
                </div>
              ) : insights.length === 0 ? (
                <p style={{ fontSize: 13, color: "#868d86", margin: 0, lineHeight: 1.5 }}>No clear correlations yet. Keep logging — patterns surface over time.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {insights.map((ins, idx) => {
                    const st = SUGGESTION_STYLE[ins.suggestion] ?? SUGGESTION_STYLE.continue;
                    return (
                      <div key={idx}>
                        {idx > 0 && <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />}
                        <div style={{ display: "flex", gap: 11 }}>
                          <i className={st.icon} style={{ fontSize: 16, color: st.color, marginTop: 2, flex: "none" }} />
                          <div>
                            <p style={{ margin: 0, fontSize: 13.5, color: "#dfe3df", lineHeight: 1.5 }}><span style={{ color: "#eef0ee", fontWeight: 500 }}>{ins.supplement}</span> — {ins.correlation}</p>
                            <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#7d837d" }}>{ins.confidence} confidence · {ins.reason}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!insightsLoading && insights.length > 0 && (
              <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, background: "rgba(255,255,255,0.02)", padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <i className="ph ph-arrows-clockwise" style={{ fontSize: 16, color: "#4fd99a" }} />
                  <span style={{ ...MONO, fontSize: 10, letterSpacing: "1px", color: "#7d837d", textTransform: "uppercase" }}>Monthly review</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {insights.map((ins, idx) => {
                    const st = SUGGESTION_STYLE[ins.suggestion] ?? SUGGESTION_STYLE.continue;
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ ...MONO, fontSize: 9, color: st.color, padding: "3px 8px", borderRadius: 6, background: st.bg, flex: "none" }}>{st.tag}</span>
                        <span style={{ fontSize: 12.5, color: "#cdd2cd" }}>{ins.supplement} — {ins.reason}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {modal === "add" && <AddModal onClose={() => setModal(null)} onSaved={loadStack} />}
      {modal === "scan" && <ParseModal onClose={() => setModal(null)} onSaved={loadStack} />}
      {editing && <EditModal supplement={editing} onClose={() => setEditing(null)} onSaved={loadStack} />}
    </div>
  );
}
