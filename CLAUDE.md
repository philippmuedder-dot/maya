# MAYA — Project Context for Claude Code

## What this project is
MAYA is a personal AI operating system for Philipp Muedder. 
Live at: https://maya-lilac.vercel.app
GitHub: https://github.com/philippmuedder-dot/maya

## Tech stack
- Next.js 14, Tailwind CSS, Supabase, Vercel
- Auth: NextAuth.js with Google OAuth
- AI: Anthropic Claude API (claude-sonnet-4-20250514)

## Key rules for Claude Code
- NEVER run npm, tsc, or build commands — they timeout
- Always use: git add [specific files] && git commit && git push
- Use Sonnet 4.6 for most tasks, Opus 4.6 for AI logic only
- Run /compact before long sessions

## Project structure
- /app — Next.js pages and API routes
- /components — reusable UI components
- /lib — helpers (whoop.ts, supabase.ts, genetics.ts, userMemory.ts)
- /prompts — AI context files (philipp.md, memory.md, family.md)

## Database (Supabase)
All tables use user_id = email for user scoping.
Service role key bypasses RLS — use createServiceClient() in API routes.
Key tables: whoop_tokens, whoop_daily_data, daily_checkins, 
daily_briefings, daily_tasks, supplements, supplement_logs,
bloodwork_results, apple_health_data, genetic_variants,
genetics_analysis, energy_logs, flow_states, decisions,
weekly_plans, user_memory, breathwork_logs, user_preferences,
work_calendar_tokens, chat_messages, sacral_responses

## Integrations
- Whoop: OAuth + webhooks at /api/whoop/webhook (v2 API endpoints)
- Apple Health: webhook at /api/apple-health/webhook (Health Auto Export app)
- Google Calendar: personal + work (philipp@vetsak.com) via OAuth
- Anthropic API: all AI calls inject philipp.md + memory.md context

## Known patterns
- TypeScript error "Set iteration": use Array.from(prev).concat(x) not [...prev, x]
- TypeScript error "session.user possibly undefined": use session.user?.email ?? ""
- Build cache issues: rm -rf .next && npm run dev
- Git hanging: use specific file paths, not git add .
- Whoop null data ≠ not connected: always return `whoop_connected: boolean` from API routes separately from data. Whoop v2 doesn't always populate computed fields (e.g. `sleep_needed`); compute fallbacks from raw sleep log where needed. Never show "Connect Whoop" based on data being null alone.

## Current status
All phases complete. Daily use mode.
```