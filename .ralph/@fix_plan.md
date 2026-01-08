# RLTX Lead Gen - Intelligence-First Implementation Plan

**Total Tasks:** 207
**Phases:** 12
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
- [x] Create `client/src/pages/call-queue.tsx` - call queue page
- [x] Create call briefing card component (inline in page)
- [x] Display WHY NOW section prominently
- [x] Display OPENING LINE in quotable format
- [x] Display KEY CONTEXT as bullet list
- [x] Display LIKELY OBJECTIONS with counters
- [x] Display DO NOT MENTION as warning list
- [x] Add SOURCE link to original signal
- [x] Add call outcome logging UI

### 4.3 Call Queue Features
- [x] Sort leads by outreach_score (highest first)
- [x] Filter by score threshold (show only 6+ by default)
- [ ] Filter by signal type (Reddit, Jobs, News)
- [x] Add "Skip" button to move to next lead
- [x] Add "Log Outcome" modal after call
- [x] Show queue sidebar with leads

---

## Phase 5: Anti-Slop Message Generation

### 5.1 Constraint System
- [x] Create `server/intelligence/message-generator.ts`
- [x] Implement banned phrase detection and rejection
- [x] Implement max sentence limit (4 for email)
- [x] Implement first-line specificity check
- [x] Implement "say it out loud" heuristic scoring

### 5.2 Message Templates
- [x] Create cold email template with synthesis placeholders
- [x] Create LinkedIn message template with synthesis placeholders
- [x] Create call script template with briefing integration
- [x] Add message preview with slop score indicator

### 5.3 Human Review Queue
- [x] Create `client/src/pages/review-queue.tsx`
- [x] Show high-value leads (score 8+) for review
- [x] Display proposed message with edit capability
- [x] Add approve/reject/edit workflow
- [x] Track review metrics

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

## Phase 8: Frontend Polish (HIGH PRIORITY - User Can't Find Features)

### 8.1 Navigation Updates (CRITICAL - DO FIRST)
- [x] Add "Call Queue" to sidebar navigation with phone icon
- [x] Add "Review Queue" to sidebar navigation with clipboard icon
- [x] Add signal count badges to navigation (red dot for hot leads)
- [x] Add keyboard shortcut hints in navigation items
- [x] Ensure active page highlighting works on all routes

### 8.2 Lead Detail Enhancement
- [ ] Add intent_signals display section with timeline view
- [ ] Add synthesized_context display section with score visualization
- [ ] Add outreach_history timeline with outcomes
- [ ] Add quick-synthesis button with loading state
- [ ] Add "View Briefing" quick action button
- [ ] Display signal sources with clickable links

### 8.3 Dashboard Updates
- [ ] Add "Hot Leads" widget (score 8+) with click-to-call
- [ ] Add "New Signals Today" widget with signal breakdown
- [ ] Add "Pending Reviews" widget linked to review queue
- [ ] Add signal trend mini-chart (7-day sparkline)
- [ ] Add "Your Morning Calls" section (top 5 to call today)
- [ ] Add daily activity summary

### 8.4 Signal Visibility Dashboard (NEW - Critical for Intelligence-First)
- [ ] Create `client/src/pages/signals.tsx` - Signal feed page
- [ ] Show real-time signal feed (Reddit, Jobs, News)
- [ ] Display signal source, content preview, matched lead
- [ ] Add signal filtering (by type, by date, by score)
- [ ] Add "Dismiss" action for irrelevant signals
- [ ] Add "Prioritize" action to boost signal weight
- [ ] Show signal-to-lead match explanation

### 8.5 Settings & Configuration UI
- [ ] Create comprehensive settings page sections
- [ ] Add API key management UI (Tavily, OpenAI)
- [ ] Add signal scoring weight customization sliders
- [ ] Add anti-slop banned phrases management
- [ ] Add notification preferences (email, in-app)
- [ ] Add default ICP selection for new leads

### 8.6 AI-Native UX Patterns (Make AI Visible & Trustworthy)
- [ ] Add confidence badges (High/Medium/Low) to all AI-extracted data
- [ ] Add "See AI Insights" expand/collapse on lead cards
- [ ] Add thumbs up/down feedback buttons on synthesis outputs
- [ ] Add "Verify" button to confirm/edit AI-extracted contact info
- [ ] Add loading states that show progress ("Analyzing 15 websites...")
- [ ] Add intermediate results during long AI operations
- [ ] Add inline "Regenerate" buttons on AI content sections
- [ ] Add hover-to-explain on AI decisions (why this score?)
- [ ] Add "AI Confidence" tooltip explaining data source quality
- [ ] Show "Last synthesized: 2 hours ago" timestamp on AI content

### 8.7 Error & Empty States (Every Screen Needs These)
- [ ] Add empty state for Leads page (0 leads) with "Add Lead" or "Import CSV" CTA
- [ ] Add empty state for Call Queue (0 ready leads) with explanation of scoring
- [ ] Add empty state for Signals page (0 signals) with "Run Signal Detection" CTA
- [ ] Add empty state for Analytics (no data yet) with helpful guidance
- [ ] Add error boundary component for graceful crash handling
- [ ] Add retry button for failed API calls with exponential backoff
- [ ] Add offline indicator when network unavailable
- [ ] Add toast notifications for async operation results (success/error)
- [ ] Add form validation error messages (inline, not alert)
- [ ] Add 404 page with navigation back to dashboard

### 8.8 Confirmation & Destructive Actions
- [ ] Add confirmation dialog for lead deletion
- [ ] Add confirmation dialog for bulk operations
- [ ] Add "Undo" toast for reversible actions (mark as contacted)
- [ ] Add loading spinners on all action buttons during API calls
- [ ] Disable buttons during pending operations (prevent double-submit)

### 8.9 Keyboard Navigation & Shortcuts
- [ ] Add Cmd+K for global search/command palette
- [ ] Add Cmd+N for quick add lead modal
- [ ] Add J/K for next/prev lead in Call Queue
- [ ] Add Enter to start call from briefing
- [ ] Add Escape to close modals
- [ ] Add Tab navigation through form fields
- [ ] Add visible focus states on all interactive elements
- [ ] Display shortcut hints in tooltips

### 8.10 Responsive & Mobile Considerations
- [ ] Ensure sidebar collapses properly on tablet (< 1024px)
- [ ] Make data tables horizontally scrollable on mobile
- [ ] Stack briefing card sections vertically on mobile
- [ ] Ensure touch targets are 44px minimum for mobile
- [ ] Test and fix any overflow issues on small screens

---

## Phase 9: Integration & Data Sources (EXPANDED - Bulk Lead Generation)

### 9.1 OpenCorporates Integration (200M+ Companies Globally)
- [ ] Create `server/data-sources/opencorporates.ts`
- [ ] Implement company search API integration
- [ ] Implement bulk company lookup by jurisdiction
- [ ] Extract: company name, registration number, status, address, officers
- [ ] Add rate limiting (500 req/month free tier)
- [ ] Create `POST /api/data-sources/opencorporates/search` endpoint
- [ ] Create `POST /api/data-sources/opencorporates/bulk-import` endpoint

### 9.2 SEC EDGAR Integration (Public Company Filings)
- [ ] Create `server/data-sources/sec-edgar.ts`
- [ ] Implement full-text search API for company filings
- [ ] Extract executive names, titles, compensation from 10-K/10-Q
- [ ] Extract company subsidiaries and addresses
- [ ] Parse filing dates for recency scoring
- [ ] Create `POST /api/data-sources/sec-edgar/search` endpoint
- [ ] Add SEC EDGAR bulk download for offline processing

### 9.3 Data.gov Business Data (US Government Open Data)
- [ ] Create `server/data-sources/datagov.ts`
- [ ] Integrate business license datasets by state
- [ ] Integrate federal contractor database (SAM.gov data)
- [ ] Integrate SBA loan recipient data
- [ ] Create unified CSV parser for government datasets
- [ ] Create `POST /api/data-sources/datagov/import` endpoint

### 9.4 State Secretary of State Databases (Business Registrations)
- [ ] Create `server/data-sources/state-sos.ts`
- [ ] Implement California bizfile scraper/API
- [ ] Implement Delaware ICIS corporate search
- [ ] Implement New York DOS public inquiry
- [ ] Implement Texas Comptroller search
- [ ] Implement Florida Sunbiz search
- [ ] Extract: entity name, registered agent, status, formation date
- [ ] Create state selection UI for targeted scraping

### 9.5 IRS 990 Nonprofit Database (1.8M+ Nonprofits)
- [ ] Create `server/data-sources/irs-990.ts`
- [ ] Download IRS Exempt Organizations bulk data
- [ ] Parse organization name, EIN, address, assets, revenue
- [ ] Extract executive compensation from Form 990
- [ ] Create nonprofit-focused ICP matching
- [ ] Create `POST /api/data-sources/irs-990/import` endpoint

### 9.6 Common Crawl Integration (Web-Scale Data)
- [ ] Create `server/data-sources/common-crawl.ts`
- [ ] Implement WARC file parsing for contact extraction
- [ ] Extract emails, phone numbers from company websites
- [ ] Match crawled data to existing leads for enrichment
- [ ] Add S3 bucket access for Common Crawl data
- [ ] Create background job for crawl processing

### 9.7 Unified Data Pipeline
- [ ] Create `server/data-sources/unified-fetcher.ts`
- [ ] Implement source attribution tracking (where each data point came from)
- [ ] Implement deduplication across sources (by company name + location)
- [ ] Implement data freshness scoring (newer = higher confidence)
- [ ] Create bulk import progress UI with source breakdown
- [ ] Add data source health dashboard (API status, quotas)

### 9.8 ICP-Intelligence Connection
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

### 10.4 Frontend-Backend Integration Verification
- [ ] Verify Call Queue renders all briefing fields correctly from API
- [ ] Verify Lead Detail shows all signal types with correct formatting
- [ ] Verify Dashboard widgets pull and display correct data
- [ ] Verify Settings save and persist correctly on refresh
- [ ] Verify CSV import handles all edge cases (empty rows, special chars)
- [ ] Verify pagination works correctly with filters applied
- [ ] Verify search returns expected results across all fields
- [ ] Verify all forms submit correctly and show appropriate feedback
- [ ] Verify navigation badges update in real-time
- [ ] Verify modals open/close correctly with no state leaks

### 10.5 Cross-Browser & Device Testing
- [ ] Test all pages in Chrome, Firefox, Safari
- [ ] Test responsive breakpoints (mobile, tablet, desktop)
- [ ] Test keyboard navigation works in all browsers
- [ ] Verify no console errors in production build
- [ ] Test with slow network (3G throttling)

---

## Phase 11: Lead Entry & Import System (NEW - Critical Gap)

### 11.1 Manual Lead Entry
- [x] Create `client/src/pages/add-lead.tsx` - manual lead entry form
- [x] Add form fields for all lead properties (name, email, company, title, phone)
- [x] Add company auto-complete from existing leads
- [x] Add ICP auto-assignment based on company/title
- [x] Add "Enrich on Save" toggle to auto-fetch company data
- [x] Create `POST /api/leads` endpoint for manual creation
- [x] Add validation for required fields and email format

### 11.2 CSV Import
- [x] Create `client/src/components/csv-import-wizard.tsx`
- [x] Add drag-and-drop CSV upload zone
- [x] Add column mapping UI (map CSV columns to lead fields)
- [x] Add preview of first 5 rows before import
- [x] Add duplicate detection (by email) with options (skip, merge, replace)
- [x] Create `POST /api/leads/import-csv` endpoint (uses POST /api/leads with batch)
- [x] Add import progress indicator with success/error counts
- [ ] Add import history log

### 11.3 Quick Add from Anywhere
- [x] Add "Quick Add Lead" button to global header
- [x] Add keyboard shortcut (Cmd+N) for quick add modal
- [x] Create minimal quick-add modal (name, email, company only)
- [x] Auto-navigate to lead detail after creation

---

## Phase 12: Outreach Execution Layer (NEW - Connects Intelligence to Action)

### 12.1 Click-to-Call Integration
- [x] Add `tel:` link to phone numbers throughout app
- [x] Add "Call Now" button in briefing card that opens phone
- [ ] Add call timer that starts when "Call Now" clicked
- [ ] Add quick-log modal that appears after call ends
- [ ] Track call duration in outreach_history

### 12.2 Email Compose
- [x] Create `client/src/components/email-composer.tsx`
- [x] Pre-populate email with generated message from synthesis
- [x] Add "Copy to Clipboard" for use in external email client
- [x] Add `mailto:` link option for native email app
- [x] Add slop-score indicator showing message quality
- [x] Add "Regenerate" button to get new AI message
- [x] Track email sent in outreach_history

### 12.3 LinkedIn Message Prep
- [ ] Add "Open LinkedIn" button linking to prospect's profile
- [ ] Generate LinkedIn-optimized message (shorter, no subject)
- [ ] Add "Copy Message" button for LinkedIn paste
- [ ] Track LinkedIn outreach in outreach_history

### 12.4 Outreach Sequencing (Basic)
- [ ] Add "Next Step" indicator per lead (call → email → LinkedIn)
- [ ] Add "Schedule Follow-up" date picker
- [ ] Add follow-up reminder in dashboard
- [ ] Create "Follow-ups Due Today" section

---

## Progress Tracking

**Started:** 2026-01-08
**Last Updated:** 2026-01-08
**Tasks Completed:** 95 / 207
**Current Phase:** Phase 11 Lead Entry & Import (NEXT CRITICAL)

---

## Phase Priority Order (UPDATED)

### Tier 1: Foundation Complete
1. **Phase 1** - Schema (DONE - everything depends on it)
2. **Phase 3** - Synthesis Engine (DONE - the core intelligence)
3. **Phase 4** - Call Briefing (DONE - the visible product)

### Tier 2: Critical Path (DO NEXT)
4. **Phase 8.1** - Navigation Updates (CRITICAL - users can't find Call Queue!)
5. **Phase 11** - Lead Entry & Import (users need to add leads beyond scraping)
6. **Phase 12.1** - Click-to-Call (connect briefing to action)

### Tier 3: Bulk Lead Data (GET LEADS FIRST)
7. **Phase 9.1-9.5** - Free Data Sources (OpenCorporates, SEC, State DBs, IRS 990)
8. **Phase 9.7** - Unified Data Pipeline (dedupe, attribution)
9. **Phase 11.2** - CSV Import (load bulk data into system)

### Tier 4: Intelligence Layer
10. **Phase 2** - Data Ingestion (Reddit, Jobs, News signals)
11. **Phase 8.4** - Signal Visibility (show users the intelligence)
12. **Phase 6** - Feedback Loop (makes it smarter over time)

### Tier 5: Message Quality
13. **Phase 5** - Message Generation (anti-slop emails/LinkedIn)
14. **Phase 12.2-12.4** - Email/LinkedIn Execution

### Tier 6: Polish & Production
15. **Phase 7** - Production Infrastructure (stability)
16. **Phase 8.2-8.5** - Lead Detail, Dashboard, Signals, Settings
17. **Phase 8.6** - AI-Native UX Patterns (confidence badges, feedback)
18. **Phase 8.7** - Error & Empty States (critical for real usage)
19. **Phase 8.8-8.10** - Confirmations, Keyboard Shortcuts, Responsive
20. **Phase 9.6** - Common Crawl (web-scale enrichment)
21. **Phase 10** - Verification & Testing (ship it)

---

## Completion Signal

When ALL tasks are checked, output:
```
<promise>INTELLIGENCE_PLATFORM_COMPLETE</promise>
```
