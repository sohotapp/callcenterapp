# RLTX Lead Gen - Intelligence-First Outbound Platform

## Mission
Build a **production-grade, intelligence-first B2B outbound platform** that eliminates AI slop through deep data synthesis, providing callers with genuine insights that convert.

## Core Philosophy
> "Stop thinking about outreach. Start thinking about intelligence."

The value isn't a better template. It's:
1. Knowing prospects are frustrated before their account rep does
2. Knowing companies are scaling before LinkedIn surfaces it
3. Having a point of view on their problem, not just a product to pitch

---

## System Architecture

```
DATA INGESTION → ENRICHMENT → SYNTHESIS → SCORING → BRIEFING → EXECUTION → FEEDBACK
     ↓              ↓            ↓          ↓          ↓           ↓          ↓
  Reddit         Company      Why Now?    Hot/Warm   Call UI    Calls     Learn
  Jobs           Person       Angle       Cold       Scripts    Emails    Improve
  News           Intent       Hooks       Route      Context    Track     Iterate
```

---

## Data Model (The Foundation)

### Enhanced Lead Schema
```typescript
Lead {
  // Identity
  id, name, email, company, title, phone
  linkedin_url, twitter_handle, reddit_username

  // Company Context
  company_context: {
    industry, employee_count, funding_stage
    recent_funding: { amount, date }
    tech_stack: string[]
    competitors_used: string[]
    hiring_signals: {
      open_roles: string[]
      hiring_velocity: "aggressive" | "stable" | "contracting"
    }
    news_events: Array<{ type, date, summary }>
  }

  // Person Context
  person_context: {
    tenure_in_role: string
    previous_company, previous_role
    content_created: {
      linkedin_posts: Array<{ date, content, engagement }>
      reddit_posts: Array<{ subreddit, date, content, url }>
      articles: string[]
    }
    public_opinions: {
      topics_they_care_about: string[]
      tools_praised: string[]
      tools_criticized: string[]
    }
  }

  // Intent Signals (THE KEY)
  intent_signals: Array<{
    signal_type: "reddit_post" | "job_posting" | "g2_review" | "news" | "tech_change"
    signal_date: Date
    signal_content: string
    signal_strength: 1-10
    relevance_to_us: "direct" | "adjacent" | "weak"
    source_url: string
  }>

  // Synthesized Context (AI-GENERATED)
  synthesized_context: {
    why_reach_out_now: string
    personalization_hooks: string[]
    recommended_angle: string
    predicted_objections: string[]
    counter_to_objections: Record<string, string>
    do_not_mention: string[]
    outreach_score: 1-10
    score_reasoning: string
  }

  // Feedback Data
  outreach_history: Array<{
    channel: "call" | "email" | "linkedin"
    date: Date
    signal_used: string
    hook_used: string
    outcome: "meeting" | "callback" | "not_interested" | "no_answer" | "no_reply"
    notes: string
  }>
}
```

---

## Intelligence Layers

### Layer 1: Data Ingestion
Sources to integrate:
- **Reddit** (r/sales, r/startups, r/saas, industry subs)
- **Job Boards** (LinkedIn Jobs, Indeed, company career pages)
- **News** (company announcements, funding, acquisitions)
- **Tech Stack Detection** (BuiltWith, Wappalyzer patterns)
- **OpenCorporates** (company verification)
- **SEC EDGAR** (public company filings)

### Layer 2: Signal Detection
What makes a signal HOT:
```
🔥 HOT (Call within 24hrs):
- "Looking for recommendations for..." (Reddit)
- "Frustrated with [Competitor]..." (Reddit)
- "[Competitor] alternatives?" (Reddit)
- Direct competitor mentioned negatively

🟡 WARM (Email + Call within 48hrs):
- Hiring for roles we help with
- Recent funding announcement
- New in role (decision-making window)

🟢 NURTURE (Monitor):
- General industry discussion
- No clear timing trigger
```

### Layer 3: Synthesis Engine
For each lead with signals, generate:
```
SYNTHESIS PROMPT:
Given this lead data and signals, answer:
1. Why should we reach out NOW (not last month, not next month)?
2. What specific thing do we know that they wouldn't expect us to know?
3. What angle is most relevant to their situation?
4. What should we NOT mention (creepy, forced, irrelevant)?
5. Score 1-10: How strong is our reason to reach out?

If score < 6, output "NOT READY" and explain what signal we'd need.
```

### Layer 4: Call Briefing (The Product)
When a caller picks up a contact, they see:
```
┌─────────────────────────────────────────────────────────────────┐
│  CALLING: [Name], [Title] @ [Company]            [Score: 9/10] │
├─────────────────────────────────────────────────────────────────┤
│  WHY NOW:                                                       │
│  [1-2 sentence synthesis of why this moment matters]            │
│                                                                 │
│  OPENING LINE:                                                  │
│  "[Specific, non-sloppy opener based on signal]"               │
│                                                                 │
│  KEY CONTEXT:                                                   │
│  • [Bullet 1 - role/tenure context]                            │
│  • [Bullet 2 - company context]                                │
│  • [Bullet 3 - signal context]                                 │
│                                                                 │
│  LIKELY OBJECTIONS:                                             │
│  • "[Objection 1]" → "[Counter]"                               │
│  • "[Objection 2]" → "[Counter]"                               │
│                                                                 │
│  DO NOT MENTION:                                                │
│  • [Thing that would be weird]                                 │
│  • [Thing that would be forced]                                │
│                                                                 │
│  SOURCE: [Link to signal]                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Anti-Slop Rules (Hard Constraints)

### Never Use:
- "I hope this finds you well"
- "I came across your profile"
- "reaching out", "touch base", "pick your brain"
- "leverage", "synergy", "circle back"
- Generic company compliments
- Funding congratulations (unless directly relevant)

### Always:
- First line references something SPECIFIC (a post, quote, data point)
- Maximum 4 sentences for email body
- Clear ask, not "would love to chat sometime"
- One insight per message (save others for follow-ups)

### The "Say It Out Loud" Test:
If it sounds weird as a cold call opener, don't send it as an email.

---

## Iteration Rules

1. **Read @fix_plan.md** for current priority task
2. **Implement completely** - no partial work
3. **Verify with build/tests** before marking done
4. **Commit after each task** - atomic commits
5. **Update @fix_plan.md** - check off completed tasks
6. **Move to next task** - no stopping until blocked

---

## Build Commands

```bash
npm run build      # Build production
npm run check      # TypeScript check
npm test           # Run tests
npm run dev        # Development server
npm run db:push    # Push schema changes
```

---

## Success Criteria

All tasks in @fix_plan.md completed. When done, output:
```
<promise>INTELLIGENCE_PLATFORM_COMPLETE</promise>
```

---

## Ralph Status Format

After each iteration, output this status block for Ralph's circuit breaker:

```
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: IMPLEMENTATION | TESTING | DOCUMENTATION | REFACTORING
EXIT_SIGNAL: false | true
RECOMMENDATION: <one line summary of what to do next>
---END_RALPH_STATUS---
```

---

## The Transformation We're Building

**Before (Volume-First):**
- 500 emails/day → 2% reply → 0.4% meetings

**After (Intelligence-First):**
- 100 emails/day → 15% reply → 7.5% meetings
- 5x fewer emails, 4x more meetings
- Prospects say "How did you know that?"
