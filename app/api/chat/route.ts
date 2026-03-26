import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase";
import { fetchCalendarEvents, getTodayEvents } from "@/lib/googleCalendar";
import { getValidWhoopToken, fetchWhoopData } from "@/lib/whoop";
import { MAYA_SYSTEM_PROMPT } from "@/prompts/system";
import { getUserMemoryContext, extractMemoryFromRecentChat } from "@/lib/userMemory";
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

const philippContext = fs.readFileSync(
  path.join(process.cwd(), "prompts/philipp.md"),
  "utf-8"
);
const memoryContext = fs.readFileSync(
  path.join(process.cwd(), "prompts/memory.md"),
  "utf-8"
);

// GET — fetch chat history
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", session.user.email)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify(data ?? []), {
    headers: { "Content-Type": "application/json" },
  });
}

// POST — send message, stream response
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { message } = await req.json();
  if (!message || typeof message !== "string") {
    return new Response(JSON.stringify({ error: "Message required" }), {
      status: 400,
    });
  }

  const supabase = createServiceClient();

  // Save user message
  await supabase.from("chat_messages").insert({
    user_id: session.user.email,
    role: "user",
    content: message,
  });

  // Gather context in parallel
  const [checkinHistory, whoopData, calendarData, supplements, dbMemoryContext] =
    await Promise.all([
      supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", session.user.email)
        .order("date", { ascending: false })
        .limit(7)
        .then(({ data }) => data ?? []),
      getValidWhoopToken(session.user.email)
        .then((token) => (token ? fetchWhoopData(token) : null))
        .catch(() => null),
      session.accessToken
        ? fetchCalendarEvents(session.accessToken).catch(() => null)
        : Promise.resolve(null),
      supabase
        .from("supplements")
        .select("name, dose, unit, timing")
        .eq("user_id", session.user.email)
        .eq("active", true)
        .then(({ data }) => data ?? []),
      getUserMemoryContext(session.user.email),
    ]);

  // Build context block
  const todayEvents = calendarData ? getTodayEvents(calendarData.events) : [];
  const contextParts: string[] = [];

  if (whoopData?.recovery) {
    const r = whoopData.recovery.score;
    contextParts.push(
      `Whoop: Recovery ${r.recovery_score}%, HRV ${r.hrv_rmssd_milli}ms, RHR ${r.resting_heart_rate}bpm`
    );
  }
  if (whoopData?.sleep?.start && whoopData?.sleep?.end) {
    const hrs = (
      (new Date(whoopData.sleep.end).getTime() -
        new Date(whoopData.sleep.start).getTime()) /
      3_600_000
    ).toFixed(1);
    contextParts.push(`Sleep: ${hrs}hrs`);
  }
  if (todayEvents.length > 0) {
    contextParts.push(
      `Calendar today: ${todayEvents.length} events — ${todayEvents.map((e) => e.summary).join(", ")}`
    );
  }
  if (supplements.length > 0) {
    contextParts.push(
      `Active supplements: ${supplements
        .map(
          (s: { name: string; dose: number | null; unit: string | null }) =>
            `${s.name}${s.dose ? ` ${s.dose}${s.unit || ""}` : ""}`
        )
        .join(", ")}`
    );
  }
  if (checkinHistory.length > 0) {
    const recent = checkinHistory.slice(0, 3);
    contextParts.push(
      `Recent check-ins: ${recent
        .map(
          (c: {
            date: string;
            stress_level: number | null;
            mood: string | null;
          }) => `${c.date}: stress ${c.stress_level}/10, mood: ${c.mood}`
        )
        .join(" | ")}`
    );
  }

  const systemPrompt = `${MAYA_SYSTEM_PROMPT}

Current context (${new Date().toISOString().split("T")[0]}):
${contextParts.length > 0 ? contextParts.join("\n") : "No data available yet."}`
    + "\n\n---\n## Who you are talking to:\n" + philippContext
    + "\n\n## Long-term memory:\n" + memoryContext
    + dbMemoryContext;

  // Get recent chat history for conversation context
  const { data: recentMessages } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("user_id", session.user.email)
    .order("created_at", { ascending: false })
    .limit(20);

  const conversationHistory = (recentMessages ?? [])
    .reverse()
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Stream response
  const anthropic = new Anthropic();

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: systemPrompt,
    messages: conversationHistory,
  });

  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }

        // Save assistant message after stream completes
        await supabase.from("chat_messages").insert({
          user_id: session.user?.email,
          role: "assistant",
          content: fullResponse,
        });

        // Trigger memory extraction after every 10th message (fire-and-forget)
        const { count } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user?.email ?? "");
        if (count && count % 10 === 0) {
          extractMemoryFromRecentChat(session.user?.email ?? "").catch(() => {});
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("[chat] streaming error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
