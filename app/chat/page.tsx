"use client";

import { useEffect, useRef, useState } from "react";

const MONO = { fontFamily: "'JetBrains Mono', monospace" } as const;

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  const nodes = parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
    ));
  });
  return <>{nodes}</>;
}

const suggestions = [
  "Why do I feel frustrated today?",
  "What should I focus on this afternoon?",
  "Plan my deep-work block",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Message[]) => setMessages(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) throw new Error();
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (typeof parsed.text === "string") {
                  fullText += parsed.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: "assistant", content: fullText };
                    return updated;
                  });
                }
              } catch { /* skip */ }
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Something went wrong. Please try again." };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Aura */}
      <div style={{ position: "absolute", top: -160, left: "35%", width: 600, height: 400, background: "radial-gradient(ellipse at center, rgba(79,217,154,0.08), rgba(79,217,154,0) 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1, flex: "none", padding: "22px 36px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 13 }}>
        <div style={{ position: "relative", width: 34, height: 34, flex: "none" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #4fd99a, #176b4a)", animation: "mayaBreathe 4s ease-in-out infinite", boxShadow: "0 0 20px rgba(79,217,154,0.45)" }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Maya</div>
          <div style={{ ...MONO, fontSize: 10, color: "#4fd99a", letterSpacing: "0.5px" }}>coach · knows your design</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "flex-end", maxWidth: 440 }}>
          {["Whoop 68%", "calendar", "bloodwork"].map((tag) => (
            <span key={tag} style={{ ...MONO, fontSize: 9.5, color: "#7d837d", padding: "5px 10px", borderRadius: 999, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>{tag}</span>
          ))}
          <span style={{ ...MONO, fontSize: 9.5, color: "#4fd99a", padding: "5px 10px", borderRadius: 999, background: "rgba(79,217,154,0.08)", border: "1px solid rgba(79,217,154,0.2)" }}>3/5 Generator</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ position: "relative", zIndex: 1, flex: 1, overflowY: "auto", padding: "28px 36px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ textAlign: "center", ...MONO, fontSize: 10, letterSpacing: "1px", color: "#4d524d", textTransform: "uppercase" }}>Thursday · June 18</div>

        {loading && (
          <div style={{ ...MONO, fontSize: 10, color: "#5e645e" }}>Loading conversation…</div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ display: "flex", gap: 13, maxWidth: 760 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #4fd99a, #176b4a)", flex: "none", boxShadow: "0 0 12px rgba(79,217,154,0.35)", marginTop: 2 }} />
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px 16px 16px 16px", padding: "15px 18px" }}>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "#dfe3df" }}>
                Morning. Recovery&apos;s at 68 and climbing — three days of rising HRV. Today&apos;s a good day to <span style={{ color: "#4fd99a" }}>respond to creative work</span>, not force it. What&apos;s on your mind?
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              gap: msg.role === "assistant" ? 13 : 0,
              maxWidth: 760,
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "radial-gradient(circle at 38% 32%, #4fd99a, #176b4a)", flex: "none", boxShadow: "0 0 12px rgba(79,217,154,0.35)", marginTop: 2 }} />
            )}
            <div
              style={{
                background: msg.role === "user" ? "rgba(79,217,154,0.1)" : "rgba(255,255,255,0.03)",
                border: msg.role === "user" ? "1px solid rgba(79,217,154,0.2)" : "1px solid rgba(255,255,255,0.06)",
                borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                padding: "15px 18px",
              }}
            >
              {msg.content ? (
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: msg.role === "user" ? "#eef0ee" : "#dfe3df" }}>
                  <MarkdownText text={msg.content} />
                </p>
              ) : (
                <div style={{ display: "flex", gap: 5 }}>
                  {[0, 0.2, 0.4].map((delay) => (
                    <span key={delay} style={{ width: 6, height: 6, borderRadius: "50%", background: "#4fd99a", display: "inline-block", animation: `mayaTyping 1.2s infinite ${delay}s` }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input dock */}
      <div style={{ position: "relative", zIndex: 1, flex: "none", padding: "18px 36px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              style={{ fontSize: 12.5, color: "#a2a8a2", padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", cursor: "pointer", fontFamily: "'Sora', sans-serif", transition: "border-color 0.15s, color 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(79,217,154,0.3)"; (e.currentTarget as HTMLElement).style.color = "#eef0ee"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "#a2a8a2"; }}
            >
              {s}
            </button>
          ))}
        </div>
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "13px 16px", transition: "border-color 0.15s" }}
          onFocus={(e) => (e.currentTarget as HTMLElement).style.borderColor = "rgba(79,217,154,0.35)"}
          onBlur={(e) => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.09)"}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend(input)}
            placeholder="Ask Maya anything…"
            disabled={streaming}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#eef0ee", fontFamily: "'Sora', sans-serif", fontSize: 14.5 }}
          />
          <i className="ph ph-microphone" style={{ fontSize: 20, color: "#7d837d", cursor: "pointer" }} />
          <button
            onClick={() => handleSend(input)}
            disabled={streaming || !input.trim()}
            style={{ width: 36, height: 36, borderRadius: 10, border: "none", background: "linear-gradient(135deg, #4fd99a, #1e8d63)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none", opacity: (!input.trim() || streaming) ? 0.5 : 1 }}
          >
            <i className="ph-fill ph-arrow-up" style={{ fontSize: 18, color: "#06231e" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
