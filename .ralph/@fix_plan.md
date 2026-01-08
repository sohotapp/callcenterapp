# RLTX Lead Gen - Intelligence-First Implementation Plan

**Total Tasks:** 89
**Phases:** 10
**Goal:** Production-grade, intelligence-first outbound platform

---

## Phase 1: Enhanced Data Model (Foundation)

### 1.1 Schema Updates
- [x] Add `company_context` JSONB column to government_leads table
- [x] Add `person_context` JSONB column to government_leads table
- [x] Add `intent_signals` JSONB array column to government_leads table
- [x] Add `synthesized_context` JSONB column to government_leads table
- [x] Add `outreach_history` JSONB array column to government_leads table
- [x] Add `linkedin_url` column to government_leads table
- [x] Add `twitter_handle` column to government_leads table
- [x] Add `reddit_username` column to government_leads table
- [x] Add `outreach_score` integer column (1-10) to government_leads table
- [x] Add `last_signal_date` timestamp column for sorting
- [x] Create TypeScript types for all new JSONB structures in shared/schema.ts
- [ ] Run `npm run db:push` to apply schema changes

### 1.2 Database Indexes (Performance)
- [x] Add index on `government_leads.icp_id`
- [x] Add index on `government_leads.state`
- [x] Add index on `government_leads.status`
- [x] Add index on `government_leads.outreach_score`
- [x] Add index on `government_leads.last_signal_date`
- [x] Fix N+1 query in getAllLeads() - use SQL LIMIT/OFFSET

---

## Phase 2: Data Ingestion Layer

### 2.1 Reddit Scraper
- [ ] Create `server/intelligence/reddit-scraper.ts`
- [ ] Implement subreddit monitoring (r/sales, r/startups, r/saas, r/b2bmarketing)
- [ ] Implement keyword detection for competitor mentions
- [ ] Implement intent pattern matching ("looking for", "frustrated with", "alternatives")
- [ ] Store Reddit posts as intent_signals with source_url
- [ ] Add Reddit scrape scheduling (every 4 hours)
- [ ] Create API endpoint `POST /api/intelligence/scrape-reddit`

### 2.2 Job Board Monitor
- [ ] Create `server/intelligence/job-scraper.ts`
- [ ] Implement job posting detection via Tavily searches
- [ ] Extract hiring velocity signals from job counts
- [ ] Store job postings as intent_signals
- [ ] Create API endpoint `POST /api/intelligence/scrape-jobs`

### 2.3 News & Funding Monitor
- [ ] Create `server/intelligence/news-scraper.ts`
- [ ] Implement funding announcement detection
- [ ] Implement acquisition/expansion news detection
- [ ] Store news events in company_context
- [ ] Create API endpoint `POST /api/intelligence/scrape-news`

### 2.4 Tech Stack Detection
- [ ] Create `server/intelligence/techstack-detector.ts`
- [ ] Implement website technology detection (patterns for common tools)
- [ ] Detect competitor tools in tech stack
- [ ] Store tech_stack and competitors_used in company_context

---

## Phase 3: Synthesis Engine (The Brain)

### 3.1 Core Synthesis
- [x] Create `server/intelligence/synthesis-engine.ts`
- [x] Implement synthesis prompt with anti-slop constraints
- [x] Generate `why_reach_out_now` from signals
- [x] Generate `personalization_hooks` (top 3 hooks)
- [x] Generate `recommended_angle` based on signals
- [x] Generate `predicted_objections` with counters
- [x] Generate `do_not_mention` list
- [x] Calculate `outreach_score` (1-10) with reasoning
- [x] Create API endpoint `POST /api/intelligence/synthesize/:id`

### 3.2 Batch Synthesis
- [x] Implement batch synthesis for multiple leads
- [x] Add synthesis queue with rate limiting
- [x] Store synthesis results in synthesized_context
- [x] Create API endpoint `POST /api/intelligence/synthesize-batch`

### 3.3 Signal Scoring
- [x] Create `server/intelligence/signal-scorer.ts`
- [x] Implement signal type weighting (Reddit > Jobs > News)
- [x] Implement recency scoring (newer = higher)
- [x] Implement relevance classification (direct/adjacent/weak)
- [x] Calculate composite outreach_score

---

## Phase 4: Call Briefing System (The Product)

### 4.1 Backend
- [x] Create `server/routes/briefing.ts`
- [x] Implement `GET /api/briefing/:id` endpoint
- [x] Generate opening line from synthesis
- [x] Format key context bullets
- [x] Format objection/counter pairs
- [x] Include source links for signals
- [x] Implement `GET /api/briefing` - call queue endpoint
- [x] Implement `POST /api/briefing/:id/log-outcome` - outcome logging

### 4.2 Frontend - Briefing UI
- [ ] Create `client/src/pages/call-queue.tsx` - call queue page
- [ ] Create `client/src/components/call-briefing-card.tsx`
- [ ] Display WHY NOW section prominently
- [ ] Display OPENING LINE in quotable format
- [ ] Display KEY CONTEXT as bullet list
- [ ] Display LIKELY OBJECTIONS with counters
- [ ] Display DO NOT MENTION as warning list
- [ ] Add SOURCE link to original signal
- [ ] Add call outcome logging UI

### 4.3 Call Queue Features
- [ ] Sort leads by outreach_score (highest first)
- [ ] Filter by score threshold (show only 6+ by default)
- [ ] Filter by signal type (Reddit, Jobs, News)
- [ ] Add "Skip" button to move to next lead
- [ ] Add "Log Outcome" modal after call
- [ ] Show next 3 leads in queue sidebar

---

## Phase 5: Anti-Slop Message Generation

### 5.1 Constraint System
- [ ] Create `server/intelligence/message-generator.ts`
- [ ] Implement banned phrase detection and rejection
- [ ] Implement max sentence limit (4 for email)
- [ ] Implement first-line specificity check
- [ ] Implement "say it out loud" heuristic scoring

### 5.2 Message Templates
- [ ] Create cold email template with synthesis placeholders
- [ ] Create LinkedIn message template with synthesis placeholders
- [ ] Create call script template with briefing integration
- [ ] Add message preview with slop score indicator

### 5.3 Human Review Queue
- [ ] Create `client/src/pages/review-queue.tsx`
- [ ] Show high-value leads (score 8+) for review
- [ ] Display proposed message with edit capability
- [ ] Add approve/reject/edit workflow
- [ ] Track review metrics

---

## Phase 6: Feedback Loop System

### 6.1 Outcome Tracking
- [ ] Create `server/routes/feedback.ts`
- [ ] Implement `POST /api/leads/:id/log-outcome` endpoint
- [ ] Store outcome in outreach_history
- [ ] Track signal_used and hook_used per outcome
- [ ] Calculate conversion rates by signal type

### 6.2 Analytics Dashboard
- [ ] Add signal effectiveness chart to analytics page
- [ ] Show conversion rate by signal type
- [ ] Show conversion rate by outreach_score range
- [ ] Show top performing hooks
- [ ] Show objections frequency

### 6.3 Learning System
- [ ] Create `server/intelligence/feedback-learner.ts`
- [ ] Adjust signal weights based on outcomes
- [ ] Identify high-converting signal patterns
- [ ] Generate weekly insights report

---

## Phase 7: Production Infrastructure

### 7.1 Testing
- [ ] Install Vitest and testing dependencies
- [ ] Create test setup and utilities
- [ ] Test synthesis engine with mock data
- [ ] Test signal scoring logic
- [ ] Test briefing generation
- [ ] Test message constraint validation

### 7.2 Security
- [ ] Add helmet.js for security headers
- [ ] Add rate limiting (100 req/min general, 10/min for scraping)
- [ ] Add request body size limits
- [ ] Validate all new API inputs with Zod

### 7.3 Logging & Monitoring
- [ ] Install Winston for structured logging
- [ ] Add request/response logging
- [ ] Add synthesis operation logging
- [ ] Add error tracking with context

---

## Phase 8: Frontend Polish

### 8.1 Navigation Updates
- [ ] Add "Call Queue" to sidebar navigation
- [ ] Add "Review Queue" to sidebar navigation
- [ ] Add signal count badges to navigation

### 8.2 Lead Detail Enhancement
- [ ] Add intent_signals display section
- [ ] Add synthesized_context display section
- [ ] Add outreach_history timeline
- [ ] Add quick-synthesis button

### 8.3 Dashboard Updates
- [ ] Add "Hot Leads" widget (score 8+)
- [ ] Add "New Signals Today" widget
- [ ] Add "Pending Reviews" widget
- [ ] Add signal trend mini-chart

---

## Phase 9: Integration & Data Sources

### 9.1 Free Data Source Integration
- [ ] Integrate OpenCorporates API for company verification
- [ ] Integrate SEC EDGAR for public company data
- [ ] Add Data.gov business license lookup
- [ ] Create unified data fetcher with source attribution

### 9.2 ICP-Intelligence Connection
- [ ] Link ICP playbooks to signal detection rules
- [ ] Auto-assign leads to ICPs based on signals
- [ ] Generate ICP-specific synthesis prompts
- [ ] Track signal effectiveness per ICP

---

## Phase 10: End-to-End Verification

### 10.1 Flow Testing
- [ ] Test: Create lead → Scrape signals → Synthesize → View briefing
- [ ] Test: Call from queue → Log outcome → Check feedback
- [ ] Test: Generate message → Review → Approve → Send
- [ ] Test: Signal detection → Score calculation → Queue ordering

### 10.2 Performance Testing
- [ ] Load test with 1000+ leads
- [ ] Verify pagination works with new columns
- [ ] Verify synthesis completes in <5s per lead
- [ ] Verify briefing loads in <1s

### 10.3 Documentation
- [ ] Document new API endpoints
- [ ] Document synthesis prompt tuning
- [ ] Document signal scoring weights
- [ ] Create user guide for call queue

---

## Progress Tracking

**Started:** 2026-01-08
**Last Updated:** 2026-01-08
**Tasks Completed:** 35 / 89
**Current Phase:** 4 (Backend complete, Frontend pending)

---

## Phase Priority Order

1. **Phase 1** - Schema (must be first, everything depends on it)
2. **Phase 3** - Synthesis Engine (the core intelligence)
3. **Phase 4** - Call Briefing (the visible product)
4. **Phase 2** - Data Ingestion (feeds the system)
5. **Phase 6** - Feedback Loop (makes it smarter)
6. **Phase 5** - Message Generation (anti-slop)
7. **Phase 7** - Production Infrastructure (stability)
8. **Phase 8** - Frontend Polish (UX)
9. **Phase 9** - Data Sources (more intelligence)
10. **Phase 10** - Verification (ship it)

---

## Completion Signal

When ALL tasks are checked, output:
```
<promise>INTELLIGENCE_PLATFORM_COMPLETE</promise>
```
