import { createServiceClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";

export type MemoryCategory = "preference" | "pattern" | "goal" | "avoid" | "insight";

export interface UserMemoryRow {
  id: string;
  user_id: string;
  category: MemoryCategory;
  insight: string;
  source: string;
  created_at: string;
  last_reinforced_at: string;
}

/**
 * Fetches the last 50 user memory rows and returns a formatted string
 * to append to Claude system prompts. Returns empty string on error.
 */
export async function getUserMemoryContext(userId: string): Promise<string> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("user_memory")
      .select("category, insight")
      .eq("user_id", userId)
      .order("last_reinforced_at", { ascending: false })
      .limit(50);

    if (!data || data.length === 0) return "";

    const lines = data.map(
      (m: { category: string; insight: string }) => `[${m.category}] ${m.insight}`
    );
    return "\n\n## Learned from conversations:\n" + lines.join("\n");
  } catch {
    return "";
  }
}

/**
 * Extracts memory insights from the last 10 chat messages and saves them to user_memory.
 * Intended to be called fire-and-forget (no await needed).
 */
export async function extractMemoryFromRecentChat(userId: string): Promise<void> {
  try {
    const supabase = createServiceClient();

    const { data: messages } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!messages || messages.length < 2) return;

    const conversation = messages
      .reverse()
      .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const prompt = `Extract any new facts, preferences, patterns or insights about Philipp from this conversation. Return a JSON array:
[{"category": "preference"|"pattern"|"goal"|"avoid"|"insight", "insight": "concise statement about Philipp"}]

Categories:
- preference: things he likes/dislikes, how he wants things done
- pattern: recurring behaviors, tendencies, cycles
- goal: things he is working toward or wants to achieve
- avoid: things that drain him, he wants less of, or should be avoided
- insight: meaningful observations about his mindset, situation, or growth

Only return genuinely new information not already obvious from his profile. If nothing meaningful, return [].
Respond with ONLY valid JSON. No markdown.

Conversation:
${conversation}`;

    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system:
        "You are an intelligent memory system for MAYA, Philipp's personal OS. Extract meaningful, specific insights from conversations. Be concise and specific — avoid generic statements.",
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";
    let extracted: { category: string; insight: string }[] = [];
    try {
      extracted = JSON.parse(text);
    } catch {
      return;
    }

    if (!Array.isArray(extracted) || extracted.length === 0) return;

    const validCategories = ["preference", "pattern", "goal", "avoid", "insight"];
    const rows = extracted
      .filter(
        (e) =>
          e.category &&
          validCategories.includes(e.category) &&
          e.insight &&
          typeof e.insight === "string"
      )
      .map((e) => ({
        user_id: userId,
        category: e.category,
        insight: e.insight.trim(),
        source: "chat",
        last_reinforced_at: new Date().toISOString(),
      }));

    if (rows.length > 0) {
      await supabase.from("user_memory").insert(rows);
    }
  } catch (err) {
    console.error("[extractMemoryFromRecentChat] error:", err);
  }
}
