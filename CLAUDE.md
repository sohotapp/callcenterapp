# CLAUDE.md - AI Lead Generation Platform

---

## IMPORTANT: Use Ralph Planning System

**Before ANY work, read these files in order:**

1. `.ralph/PROMPT.md` - Project mission and intelligence-first philosophy
2. `.ralph/@fix_plan.md` - Current task list with checkboxes (89 tasks, 10 phases)
3. `.ralph/@AGENT.md` - Build commands and verification steps
4. `.ralph/specs/` - Detailed specifications (database, security, testing, observability)

**Workflow:**
1. Read `.ralph/@fix_plan.md` to find the next unchecked `[ ]` task
2. Complete the task following `.ralph/PROMPT.md` anti-slop guidelines
3. Verify with commands: `npm run build`, `npm test`
4. Update `.ralph/@fix_plan.md` to check off completed task `[x]`
5. Commit changes with descriptive message
6. Move to next task

**Never improvise. Follow the plan.**

---

## Mission
Build the most efficient AI-native outreach platform for B2B cold calling. Think "Juice Box AI for leads" - maximum contact discovery with minimal friction using Claude API + Tavily for real-time web scraping.

## Tech Stack
- **Frontend**: React 18 + TanStack Query + Tailwind + Shadcn UI + Recharts
- **Backend**: Express.js + Drizzle ORM + PostgreSQL
- **AI**: Claude claude-sonnet-4-5 (Anthropic API)
- **Scraping**: Tavily API (real-time web search + content extraction)
- **Routing**: Wouter (client), Express (server)

## Quick Commands
```bash
npm run dev          # Start dev server (port 5000)
npm run db:push      # Push schema changes to database
npm run build        # Production build
```

## Architecture Overview

```
/client/src/
  /pages/           # Main views (dashboard, leads, icp, analytics, etc.)
  /components/      # Reusable UI components
  /hooks/           # Custom React hooks (useAuth, etc.)
  /lib/             # API client, utils

/server/
  routes.ts         # All API endpoints (needs splitting - 2400+ lines)
  storage.ts        # Database operations via Drizzle
  playbook-orchestrator.ts  # Multi-ICP scraping engine
  real-data-scraper.ts      # Tavily + Claude lead extraction
  enrichment.ts             # AI-powered lead enrichment
  scoring.ts                # Multi-dimensional lead scoring
  email-validator.ts        # MX record validation

/shared/
  schema.ts         # Drizzle schema + Zod validators
```

## Core Data Flow

```
ICP Config → Playbook Orchestrator → Tavily Search → Claude Extraction → Lead Creation → Enrichment → Scoring
```

1. **ICP defines targets**: Population range, departments, states, pain points
2. **Playbook generates queries**: Dynamic search terms per vertical
3. **Tavily scrapes web**: Real government/business websites
4. **Claude extracts contacts**: Emails, phones, decision makers from raw HTML
5. **MX validation**: Verify email deliverability
6. **Enrichment pipeline**: Tech stack, news, buying signals, competitors
7. **Scoring**: 5-factor scoring (Likelihood, Match, Urgency, Budget, Priority)

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `government_leads` | Main entity - 40+ fields for contacts, scoring, enrichment |
| `icp_profiles` | 5 verticals with playbook config (Government, Healthcare, Legal, FinServ, PE) |
| `call_scripts` | Generated scripts per lead (4 styles) |
| `email_sequences` | Multi-step email campaigns |
| `sequence_steps` | Individual email templates with delays |
| `outreach_activities` | Activity tracking (emails, calls, LinkedIn) |
| `scrape_jobs` | Async job tracking with progress |

## API Integrations

### Claude API (Anthropic)
- **Env var**: `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- **Model**: claude-sonnet-4-5
- **Uses**: Lead extraction, enrichment synthesis, script generation, ICP suggestions
- **Token limits**: 500-4096 depending on task

### Tavily API
- **Env var**: `TAVILY_API_KEY`
- **Uses**: Real-time web search, contact extraction, news discovery
- **Config**: `search_depth: "advanced"`, `include_raw_content: true`, `max_results: 5`
- **Concurrency**: `p-limit(2-4)` to respect rate limits

## Critical Files to Understand

| File | Lines | Purpose |
|------|-------|---------|
| `server/routes.ts` | 2451 | ALL API endpoints - needs refactoring into modules |
| `server/playbook-orchestrator.ts` | 2000+ | Multi-ICP scraping with playbook configs |
| `server/real-data-scraper.ts` | 500+ | Tavily integration + content processing |
| `shared/schema.ts` | 600+ | Database models + Zod validation |
| `client/src/pages/leads.tsx` | 400+ | Main lead management UI |
| `client/src/pages/icp.tsx` | 500+ | ICP configuration + auto-scrape |

## ICP Verticals & Playbooks

Each ICP has a playbook config in `icp_profiles.playbookConfig`:

| Vertical | Entity Types | Decision Makers | Data Sources |
|----------|--------------|-----------------|--------------|
| Government | county, city, district | IT Director, County Manager, CIO | tavily_web, us_census |
| Healthcare | hospital, health_system, clinic | CIO, CMIO, VP Operations | tavily_web, cms_hospitals |
| Legal | law_firm, legal_department | Managing Partner, CIO | tavily_web, state_bar |
| Financial Services | bank, credit_union, insurance | CTO, CIO, VP Technology | tavily_web, fdic_banks |
| Private Equity | pe_firm, portfolio_company | Operating Partner, CTO | tavily_web, crunchbase |

## Lead Scoring System

5-factor scoring in `server/scoring.ts`:

```typescript
{
  likelihoodScore: number,    // Purchase probability (0-100)
  matchScore: number,         // Service alignment (0-100)
  urgencyScore: number,       // Buying signals (0-100)
  budgetFitScore: number,     // Budget alignment (0-100)
  priorityScore: number       // Weighted composite for ranking
}
```

## Script Generation Styles

4 styles in `POST /api/leads/:id/generate-script`:

1. **Consultative** - Advisor approach, discovery questions, trust-building
2. **Direct Value** - ROI-driven, quantified benefits, speed-focused
3. **Question-Led** - Socratic method, self-discovery, engagement
4. **Pain-Agitate-Solution (PAS)** - Pain identification, agitation, solution as relief

---

# STRATEGIC IMPROVEMENT ROADMAP

> **DEPRECATED**: This roadmap has been replaced by `.ralph/@fix_plan.md`
> See the Ralph Planning System above for current tasks.

## Phase 1: Core Efficiency (Critical)

### 1.1 Split Routes File
`server/routes.ts` is 2400+ lines. Split into:
- `routes/leads.ts`
- `routes/icp.ts`
- `routes/sequences.ts`
- `routes/analytics.ts`
- `routes/scraping.ts`

### 1.2 Implement Job Queue
Current: Scrape jobs run in-memory, lost on restart.
Solution: Add BullMQ + Redis for reliable background jobs.

### 1.3 Add Pagination
Current: API returns ALL leads, filtered in memory.
Solution: Add `limit/offset` to all list endpoints.

### 1.4 Batch Email Validation
Current: MX lookups are sequential.
Solution: `Promise.all` with concurrency limit.

## Phase 2: AI-Native UX Features

### 2.1 Real-Time Streaming
- Stream Claude responses as they generate (SSE)
- Show typing indicators during AI processing
- Progressive loading for enrichment data

### 2.2 AI Command Palette
- `Cmd+K` to open AI command bar
- Natural language queries: "Find all healthcare leads in Texas with high urgency"
- AI-suggested actions based on current context

### 2.3 Smart Lead Cards
- AI-generated "Why This Lead" summaries
- Predicted best contact time based on patterns
- Auto-suggested talking points

### 2.4 Conversational Enrichment
- Chat interface to ask questions about a lead
- "What's their biggest pain point?" → AI synthesizes from enrichment data
- "Draft a follow-up email" → Generates personalized content

### 2.5 AI Copilot Sidebar
- Persistent AI assistant during calls
- Real-time objection handling suggestions
- Live script adaptation based on call notes

## Phase 3: Scale & Reliability

### 3.1 Deduplication System
- Fuzzy matching on institution name + location
- Merge duplicate leads with conflict resolution

### 3.2 Data Quality Scoring
- Track enrichment freshness (re-enrich if >30 days old)
- Source confidence weighting
- Automated data quality alerts

### 3.3 Webhooks & Integrations
- Webhook system for CRM sync
- Slack notifications for high-priority leads
- Calendar integration for meeting scheduling

### 3.4 Rate Limiting
- Token bucket for API calls
- Usage dashboards per API provider
- Automatic backoff on rate limit errors

## Phase 4: Advanced Intelligence

### 4.1 Predictive Lead Scoring
- ML model trained on closed-won data
- Features: enrichment signals, industry, size, tech stack
- A/B test scoring models

### 4.2 Sequence Optimization
- Auto-optimize email send times
- A/B test subject lines with AI
- Predict reply probability

### 4.3 Competitive Intelligence
- Auto-track competitor mentions
- Alert on competitor wins/losses
- Market trend analysis

---

# AI-NATIVE UI/UX PATTERNS TO IMPLEMENT

## 1. Progressive Disclosure with AI
- Show lead summary first, expand for AI analysis
- "See AI Insights" button reveals enrichment interpretation
- Collapse/expand all AI-generated content

## 2. Confidence Indicators
- Show AI confidence scores (High/Medium/Low)
- Visual indicators (green/yellow/red) on extracted data
- "Verify" buttons to human-confirm AI extractions

## 3. Inline AI Actions
- Hover on any text → "Explain", "Expand", "Rewrite"
- Right-click context menu for AI operations
- Drag-drop to AI enhancement zones

## 4. Smart Defaults
- AI pre-selects best script style based on lead profile
- Auto-suggest ICP based on lead characteristics
- Pre-fill forms with AI predictions

## 5. Feedback Loops
- Thumbs up/down on AI outputs
- "This was helpful" tracking
- Learn from corrections

## 6. Loading States with Value
- "Analyzing 15 websites for contact info..."
- Show intermediate results as they arrive
- Cancel/pause long-running AI tasks

---

# DEVELOPMENT GUIDELINES

## Adding New Features
1. Check if schema change needed → Update `shared/schema.ts`
2. Add API endpoint → `server/routes.ts` (or split file)
3. Add storage method → `server/storage.ts`
4. Create React component → `client/src/components/`
5. Add page if needed → `client/src/pages/`
6. Update API client → `client/src/lib/api.ts`

## AI Integration Pattern
```typescript
// Standard Claude call pattern
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }]
});
const text = response.content[0].type === "text" ? response.content[0].text : "";
```

## Tavily Search Pattern
```typescript
// Standard Tavily call pattern
const response = await fetch("https://api.tavily.com/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    api_key: process.env.TAVILY_API_KEY,
    query: searchQuery,
    search_depth: "advanced",
    include_raw_content: true,
    max_results: 5
  })
});
```

## UI Component Standards
- Use Shadcn UI components (in `client/src/components/ui/`)
- Follow Tailwind spacing: p-4, p-6 for cards, gap-4, gap-6 for layouts
- Dark mode support via `next-themes`
- Icons from Lucide React

## Error Handling
- All API calls wrapped in try/catch
- Return structured errors: `{ error: string, details?: any }`
- Frontend shows toast notifications for errors
- Log errors server-side with context

---

# QUICK REFERENCE

## Key Endpoints
```
GET  /api/leads                    # All leads
GET  /api/leads/:id                # Single lead with enrichment
POST /api/leads/:id/enrich         # Trigger AI enrichment
POST /api/leads/:id/generate-script # Generate call script
GET  /api/icp                      # All ICP profiles
POST /api/icp/:id/playbook-scrape  # Scrape leads for ICP
GET  /api/analytics/funnel         # Conversion funnel
POST /api/scrape/start             # Start scrape job
```

## Environment Variables
```
TAVILY_API_KEY                     # Required for web scraping
AI_INTEGRATIONS_ANTHROPIC_API_KEY  # Required for Claude API
DATABASE_URL                       # PostgreSQL connection
```

## Common Tasks

### Add a new lead field
1. `shared/schema.ts` → add to `governmentLeads` table
2. `npm run db:push` to migrate
3. Update relevant API endpoints
4. Update React components to display/edit

### Create new API endpoint
1. Add to `server/routes.ts`
2. Add storage method if DB access needed
3. Add to API client in frontend

### Add new UI page
1. Create `client/src/pages/new-page.tsx`
2. Add route in `client/src/App.tsx`
3. Add sidebar link in `client/src/components/layout/sidebar.tsx`
