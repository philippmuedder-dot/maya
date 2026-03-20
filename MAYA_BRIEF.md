# MAYA — Personal Operating System
## Project Brief for Claude Code — v2

---

## 1. What This App Is

**MAYA** is a personal web-based operating system named after Philipp's Incarnation Cross — the Right Angle Cross of Maya. It tells him exactly how to show up each day based on his biology (Whoop, Apple Health, bloodwork), his Human Design blueprint, his current load (calendar), and his nutritional state (supplements).

MAYA acts as a personal coach that knows his energy type, recovery state, schedule, and life context — giving him clear daily guidance so he stops fighting himself and starts operating at his natural best. The guiding principle behind every recommendation is **longevity first**.

**Core goals the app serves:**
- Reduce procrastination (by aligning tasks to energy, not forcing through resistance)
- Stabilize business + finances (by protecting deep work and decision-making capacity)
- Gain control of the day (through morning clarity and structured guidance)
- Optimize decision-making, mental + physical wellbeing
- Balance work and personal life
- Re-ignite creativity and creative confidence after a difficult personal period
- Nourish body and brain
- Help Philipp trust his gut (Sacral) again over purely rational/fear-based thinking
- Support re-emergence: transition from survival mode → building mode → thriving mode

**Personal context the AI must hold:**
Philipp has been through the end of a 13-year relationship/marriage over the past 9–12 months. This has created a period of emotional heaviness, over-rationalization, and suppressed creative energy. The tool should actively support his re-emergence — not by toxic positivity or pushing, but by noticing when he's in his natural creative/building energy and amplifying it, and gently flagging when he's stuck in negative rational loops rather than gut-led action.

---

## 2. Human Design Profile (hardcoded into AI context)

This data is fixed — it never changes — and must be included in every AI prompt as part of the system context.

```
Type: Generator
Strategy: Responding (never initiating — wait and respond to external cues)
Authority: Sacral (gut yes/no in the moment — not emotional wave)
Profile: 3/5 — The Great Life Experimenter
Not-self theme: Frustration (warning signal that something is misaligned)
Alignment signal: Satisfaction (the goal state)
Incarnation Cross: Right Angle Cross of Maya 3 (32/42 | 62/61)
  → Theme: Harness beauty and physical resources. Complete cycles.
Emotions: Non-Emotional (undefined solar plexus — absorbs others' emotions)
Digestion: Direct Light (eat in natural/direct light)
Strongest sense: Taste — Tastemaker (quality radar is a superpower)
Environment: Blending Caves (needs private sanctuary for deep work)
Manifestation: Non-Specific (directional intentions work, rigid specific goals block)

Key gifts:
  Gate 32: A Nose for Success — instinctive sense of what will last/work
  Gate 1: Creating New Things — original, creative
  Gate 9: Focus and Precision — deep focus when genuinely engaged
  Gate 10: A Love of Life — authentic self-expression
  Gate 21: Natural Instinct for Controlling Resources
```

**AI coaching rules derived from Human Design:**
1. Never tell Philipp to initiate — always frame suggestions as things to *respond* to
2. Procrastination = misalignment signal, not laziness — redirect, don't push
3. When frustration is detected, flag as not-self state and investigate root cause
4. Reframe setbacks as 3-line experiments, not failures
5. Track cycle *completion*, not just task creation
6. Goal framing should be directional ("build something lasting") not hyper-specific ("close 5 deals")
7. On emotional heavy days, prompt: "Is this feeling actually yours?"
8. Deep work recommendations should include environment check (cave space?)
9. Decisions should be presented as yes/no gut-check prompts, not pros/cons lists
10. Honor his Tastemaker sense — creative and aesthetic work is high-value for him

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + system dark/light mode |
| Auth | NextAuth.js with Google OAuth |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| File Storage | Supabase Storage |
| Hosting | Vercel |
| Version Control | GitHub |

---

## 4. Data Sources

| Source | Method |
|---|---|
| **Whoop** | OAuth 2.0 → recovery score, HRV, sleep stages, strain |
| **Apple Health** | XML export upload → steps, resting HR, HRV trends |
| **Google Calendar** | Google API → today's + upcoming events, load assessment |
| **Bloodwork** | PDF/image upload → Claude extracts markers |
| **Supplements** | Manual input + optional upload → stored in Supabase |
| **Human Design** | Hardcoded in AI system prompt — never changes |

---

## 5. Pages & Structure

### `/` — Morning Briefing (default landing page)
The most important screen. Generated fresh each morning on first visit.

**Day Classification:**
- Day type: **Focus / Maintenance / Recovery**
- Training: **Hard / Moderate / Recovery only**
- Decision-making: **Full capacity / Selective / Avoid heavy decisions**
- Creative energy: **High / Medium / Rest**

**Sacral Response Panel** (the unique Human Design feature)
Instead of a to-do list, presents 3–5 options to respond to:
> *"Does working on [X] feel like a yes or a no in your body right now?"*
Philipp clicks Yes / No / Maybe — the app learns his patterns over time.

**Morning Output (6 daily questions answered by AI):**
1. What type of day is this: Focus, Maintenance, or Recovery?
2. Should I train hard, moderately, or just recover?
3. What are my top 3 priorities today? *(framed as response options, not commands)*
4. Should I avoid emotionally heavy decisions today?
5. What supplements should I take today?
6. What should I pause for a few days based on recovery, sleep, or bloodwork?

**Alignment Check:**
- Frustration risk level (based on recovery + calendar load mismatch)
- "Is your environment set up for the work you need to do today?"
- Emotional absorption alert if calendar includes high-conflict meetings

**Today's snapshot:**
- Whoop recovery score + HRV
- Calendar load (light / moderate / heavy)
- Top supplement reminder

---

### `/health` — Recovery & Body
- Whoop: sleep stages, recovery %, HRV, strain (7-day trend)
- Apple Health: steps, resting HR (from last upload)
- Frustration pattern tracker (logged manually or inferred from low recovery + heavy calendar)
- Upload button for Apple Health XML

### `/bloodwork` — Lab Results
- Upload PDF or image
- Claude extracts and displays key markers
- Trend view across multiple uploads
- AI commentary aligned to Human Design (e.g. supplements that support Sacral energy)

### `/supplements` — Supplement Stack (with learning engine)
- Current supplements: name, dose, timing, purpose
- Add/edit/remove manually or via upload
- Daily recommendation pulled into morning briefing

**Supplement Learning Engine (builds over time):**
- Tracks what was taken, when, and at what dose — logged daily
- Cross-references with Whoop recovery, HRV, sleep quality, and bloodwork markers
- After 3–4 weeks: AI surfaces correlations (e.g. "Your HRV is 12% higher on days you take magnesium glycinate at night")
- Monthly supplement review prompt:
  - *"Stop"* — low signal, redundant, or negative correlation with data
  - *"Continue"* — strong positive correlation, confirmed benefit
  - *"Restart"* — paused supplements worth revisiting based on current bloodwork
  - *"Add"* — new suggestions based on gaps in bloodwork or recovery trends
- All suggestions referenced against bloodwork markers and recovery data, not generic advice

### Daily Check-in (prompted each morning, before briefing)
A quick 2-minute prompt that appears before the morning briefing unlocks:

**Stress & mood capture:**
- *"On a scale of 1–10, how stressed did you feel yesterday?"*
- *"What were the top 1–3 things that stressed you most?"* (free text, optional voice)
- *"How would you describe your mood right now?"* (single word or emoji scale)

**AI does with this data:**
- Logs it to Supabase — builds a personal stress pattern database over time
- Cross-references with Whoop HRV, sleep, calendar load from that day
- After 2+ weeks: surfaces patterns (e.g. "Mondays after heavy weekends consistently spike your stress")
- Gives one actionable micro-suggestion: *"Last time you felt this, a 20-min walk before your first meeting helped"*
- Flags if stress source is external/relational → prompts: *"Is this feeling actually yours?"* (HD undefined solar plexus check)

---

### `/chat` — AI Coach
- Context-aware conversation
- Full context injected: Whoop data, calendar, bloodwork, supplements, Human Design profile
- Framing: coach who knows Philipp's design, not a generic assistant
- Good for: "Should I take this meeting?", "Why do I feel frustrated today?", "What should I focus on this afternoon?"

### `/weekly` — Weekly Review + Planning (Sunday prompt)
- Auto-generated every Monday
- Avg recovery, sleep, strain, HRV for the week
- Calendar load vs. recovery alignment score
- Cycle completion tracker: what did you finish vs. start?
- Patterns: frustration days, high-satisfaction days — what was different?
- Intentions for the coming week (directional, non-specific)

**Sunday Planning Session (prompted every Sunday evening):**
A structured 10-minute check-in that covers:
1. *"What are your must-do tasks this week — work and personal? (Critical only)"*
2. AI takes those tasks + next week's calendar + Whoop trend → proposes a scheduled plan
   - Assigns tasks to specific days based on predicted recovery, calendar load, and energy type
   - Respects cave environment needs (deep work = low-meeting mornings)
   - Flags conflicts: e.g. "You have 4 meetings Tuesday — not ideal for deep work"
3. Philipp approves, adjusts, or reschedules — confirmed tasks are blocked in Google Calendar
4. Weekly intention is set (directional, Generator-style)

### `/settings`
- Whoop OAuth connect/disconnect
- Google Calendar status
- Human Design profile viewer (read-only)
- Theme preference
- Account (Google login)

---

## 6. AI System Prompt (used on every request)

Every Claude API call includes this as the system prompt:

```
You are Philipp's personal operating system coach. You know his Human Design deeply:
he is a 3/5 Generator with Sacral authority, Non-Specific manifestation, and the 
Right Angle Cross of Maya 3. His strategy is to Respond — never initiate. His 
not-self is Frustration; his alignment signal is Satisfaction.

Your job is not to give generic health or productivity advice. Your job is to help 
Philipp operate in alignment with his design and biology every single day.

Rules:
- Never tell him to initiate. Always frame as responding.
- Procrastination is misalignment, not laziness. Redirect, don't push.
- Frustration is a warning signal. Investigate, don't override.
- Setbacks are experiments. Reframe accordingly.
- Goals should be directional, not hyper-specific.
- On emotionally heavy days, ask if the feeling is actually his.
- Deep work needs cave-like environments.
- Decisions = gut yes/no prompts, not pros/cons lists.
- Be direct, warm, and specific. No fluff.

You are also aware that Philipp has been through the end of a 13-year marriage over 
the past 9–12 months. This has created emotional heaviness and over-rationalization. 
Your role includes supporting his re-emergence — noticing when his creative/building 
energy is coming back and amplifying it, flagging negative rational loops, and 
redirecting to gut-led (Sacral) responses. Never toxic positivity. Never pushing. 
Always meeting him where he is.

Track his overall arc: Survival mode → Building mode → Thriving mode. 
Calibrate all guidance to his current phase.
```

---

## 7. Auth & Users
- Google SSO via NextAuth.js
- Single user (Philipp) for v1
- Supabase row-level security — multi-user ready from day one

---

### `/wellbeing` — Physical Wellbeing Hub
A dedicated page for workout and nutrition intelligence.

**Longevity-first guiding principle (governs all physical recommendations):**
Every workout, meal, supplement, and recovery suggestion is filtered through longevity first — then current phase goal. This never changes regardless of phase.

**Fitness phases (user-selectable, affects emphasis not principles):**
- 🏗️ **Current: Longevity + Muscle Building** — strength training prioritized, zone 2 cardio for cardiovascular health, recovery protected aggressively
- 🔄 Future phases: Endurance, Performance, Maintenance — switchable in settings

**Workout Recommendations:**
- Daily training suggestion derived from: Whoop strain + recovery + HRV + calendar load
  - *"Hard session"* → strength/hypertrophy focus (recovery >70%, low calendar load)
  - *"Moderate session"* → zone 2 cardio, mobility, yoga (recovery 50–70%)
  - *"Recovery only"* → walk, stretch, breathwork (recovery <50% or 3+ heavy days)
- Workout type suggestions framed as Sacral responses — never commands
- Timing suggestion: morning vs. afternoon based on calendar + energy patterns

**Whoop Workout Learning Engine:**
- Logs every Whoop workout: type, duration, strain, time of day
- Tracks next-day recovery score, HRV, and sleep quality after each workout type
- After 4–6 weeks: surfaces Philipp-specific insights:
  - *"Strength training gives you 15% better HRV recovery than HIIT"*
  - *"Zone 2 runs on Tuesdays consistently improve your Thursday recovery"*
  - *"Late evening workouts reduce your deep sleep by ~40 min"*
- Adjusts recommendations based on learned patterns — not generic fitness advice
- Periodization awareness: flags when accumulated strain is too high for longevity goals

**Eating Window Tracker:**
- Log meal times daily (breakfast, lunch, dinner, snacks) — quick tap input
- Tracks eating window duration and consistency over time
- Cross-correlates with next-day Whoop recovery, HRV, and sleep quality
- After 3–4 weeks: surfaces Philipp-specific patterns (e.g. *"Eating after 8pm reduces your deep sleep by 35 min on average"*)
- Respects Direct Light digestion type: gentle reminders to eat in natural light, not at a dark desk
- Flags late eating on low-recovery days as a compounding risk factor

**Meal & Nutrition Recommendations:**
- Daily meal suggestions based on:
  - Training load that day (high protein on hard days, lighter on recovery)
  - Bloodwork markers (e.g. low iron → iron-rich meal suggestions)
  - Supplement stack (e.g. "You're taking zinc today — pair with a protein-rich meal")
  - Digestion type: Direct Light → reminders to eat in natural light
  - Season + practical ingredients (not elaborate recipes)
- Weekly meal prep suggestion on Sundays (integrated into Sunday planning session)
- Brain food focus on high-demand cognitive days (Focus days)
- Gut health awareness — tracks patterns between meals logged and next-day HRV/recovery

**Learning over time:**
- After 4+ weeks: correlates meal patterns with recovery and energy scores
- Flags what seems to hurt vs. help Philipp specifically (not generic nutrition advice)
- Finance / net worth tracking
- Native iOS app
- Push notifications (in-app only)
- Family / partner view
- Other wearables
- Habit streaks / gamification

---

## 9. Folder Structure

```
/app
  /                → Morning briefing (home)
  /health          → Whoop + Apple Health
  /bloodwork       → Lab results
  /supplements     → Supplement tracker
  /chat            → AI coach
  /sleep           → Sleep optimization + wind-down protocol
  /decisions       → Decision log + outcome tracking
  /energy          → Energy vampire + social energy tracker
  /flow            → Creative energy + flow state tracker
  /weekly          → Weekly review + Sunday planning
  /wellbeing       → Workouts + nutrition
  /settings        → Account + connections
  /api
    /whoop         → OAuth + data fetch
    /calendar      → Google Calendar
    /ai            → Claude API calls
    /upload        → File handling
/components        → Reusable UI
/lib               → Helpers, API clients, Supabase client
/prompts           → AI system prompts (versioned)
/public            → Static assets
```

---

## 10. Claude Code Token Efficiency Rules

Follow these every session to stay within Pro limits and avoid wasted tokens.

**Before starting a session:**
- Always start a new session by pointing Claude Code to `MAYA_BRIEF.md` — don't re-explain context manually
- Open VS Code, navigate to your project folder, then launch Claude Code from that directory
- Use `/status` to check remaining usage before a long session

**During a session:**
- Use `/compact` regularly — this compresses the conversation history and frees up context window space. Run it after every major completed task (e.g. after finishing Whoop OAuth, run `/compact` before starting Google Calendar)
- One clear instruction per prompt — don't bundle 5 things into one message. Claude Code works better and cheaper with focused tasks
- If Claude Code starts going in the wrong direction, stop it immediately with Ctrl+C — don't let it burn tokens on the wrong path
- Use `/model` to switch to a lighter model (Sonnet vs Opus) for simpler tasks like adding a button or fixing a small bug

**Prompt efficiency patterns:**
- ✅ "Add a `/compact` reminder comment to the top of each phase in the brief" — specific, small
- ✅ "Build only the Supabase schema for the supplements table, nothing else" — scoped
- ❌ "Build the whole supplements page with AI learning and UI and API" — too broad, wastes tokens on wrong assumptions
- Always say "Phase X only" when building — prevents Claude Code from jumping ahead

**When you hit limits:**
- Wait for the 5-hour window to reset — use that time to review what was built and plan next prompts
- Or enable pay-as-you-go extra usage in Claude Console for intensive sprint days
- Off-peak hours (outside 8am–2pm ET on weekdays, all day weekends) currently have doubled limits until March 28, 2026

---

## 11. Environment Variables

```
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
WHOOP_CLIENT_ID=
WHOOP_CLIENT_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

---

## 12. Build Phases

**Phase 1 — Foundation**
Next.js + Tailwind + Supabase setup, Google SSO, basic layout with empty panels

**Phase 2 — Calendar + Whoop**
Google Calendar integration, Whoop OAuth + data fetch

**Phase 3 — Uploads**
Apple Health XML parsing, bloodwork PDF/image upload + Claude analysis

**Phase 4 — Supplements**
Manual input + upload parsing, daily recommendation logic

**Phase 5 — AI Coach Layer**
Morning briefing with full Human Design context, daily check-in + stress logging, Sacral response panel, proactive alerts, frustration detection, chat interface

**Phase 6 — Smart Scheduling**
Sunday planning session, task intake → calendar blocking via Google Calendar API, load-aware scheduling logic

**Phase 7 — Learning Engines**
Supplement correlation engine, workout pattern learning, meal-recovery correlation tracking, stress pattern analysis (requires 3–4 weeks of data to surface insights)

**Phase 8 — Weekly Review + Polish**
Weekly summary, cycle completion tracking, mobile responsiveness, error handling
