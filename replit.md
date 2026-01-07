# RLTX.ai GTM Platform - Multi-Vertical Lead Generation

## Overview
RLTX.ai GTM Platform is a world-class outbound platform (like Apollo/Unify) that helps rltx.ai ("Palantir for AI") sell custom end-to-end AI systems across multiple verticals: Government, Healthcare, Legal, Financial Services, and Private Equity. It uses Tavily API for real-time web research to scrape REAL contact data from actual websites, and Claude 4.5 Sonnet for deep analysis and script generation.

**Key Differentiator**: All contact information (emails, phone numbers, decision makers) is scraped from REAL websites - no fake/generated data allowed. The system validates API keys and fails fast if real data sources are unavailable.

## Multi-ICP Playbook System

The platform uses a **Playbook-based architecture** where each ICP (Ideal Customer Profile) has its own configuration for:
- **Target Entity Types**: hospital, law_firm, bank, pe_firm, county, etc.
- **Query Templates**: Customizable search queries with {entity}, {state}, {department} placeholders
- **Data Sources**: tavily_web, cms_hospitals, fdic_banks, state_bar, crunchbase, us_census
- **Enrichment Hints**: Guidance for Claude AI on what decision makers to look for
- **Value Proposition**: ICP-specific pitch for rltx.ai services
- **Compliance Flags**: HIPAA, SOC2, PCI as needed

### Supported ICPs
1. **Government** - Counties, cities, districts with IT/Finance/Public Works focus
2. **Healthcare** - Hospitals, health systems, clinics with CIO/CMIO focus
3. **Legal** - Law firms with Managing Partner/CIO focus
4. **Financial Services** - Banks, credit unions, insurance with CTO/CIO focus
5. **Private Equity** - PE firms, portfolio companies with Operating Partner focus

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, TanStack Query, Recharts
- **Backend**: Express.js, Node.js
- **AI**: Claude 4.5 Sonnet (claude-sonnet-4-5) via Replit AI Integrations
- **Research**: Tavily API for real-time web research and contact extraction
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side routing

## Key Features

### 1. Real Data Scraping (server/real-data-scraper.ts)
- Uses Tavily API to search for actual county government websites
- Claude extracts real emails, phone numbers, websites from search results
- MX record validation ensures emails are deliverable
- No fake/generated data - all contact info comes from real sources

### 2. Email Verification (server/email-validator.ts)
- Format validation with comprehensive email regex
- MX record lookup using Node's DNS module
- Only stores emails that can actually receive mail
- Government domain pattern recognition (@*.gov, @co.*.*.us)

### 3. Company Intelligence Layer
- Scrape rltx.ai website using Tavily API
- Store company capabilities, services, case studies
- Manual editing in Settings page
- Context for personalized script generation

### 4. ICP Builder with Auto-Scraping (server/icp-scraper.ts)
- 5 configurable verticals: Government, Healthcare, Legal, Financial Services, PE
- Target criteria per vertical: population, budget, departments, states
- **Auto-scrape toggle**: Automatically queue scraping jobs when ICP is updated
- Find matching lead targets based on ICP criteria

### 5. Lead Enrichment Engine (server/enrichment.ts)
Deep research using Tavily API + Claude AI:
- **Decision Makers**: Names, titles, contact info from real staff directories
- **Tech Stack**: Current software/systems in use
- **Recent News**: Initiatives, projects, RFPs
- **Pain Points**: Real problems from public sources
- **Buying Signals**: Budget approvals, hiring, tech complaints
- **Competitor Analysis**: Who else is selling to them

### 6. Email Sequence Builder
Multi-step email campaigns with:
- **Sequences**: name, description, status (draft/active/paused)
- **Steps**: subject, body template, delay days/hours, conditions
- **Enrollments**: track leads through sequence progression
- **Template Variables**: {{institutionName}}, {{contactName}}, {{painPoints}}, {{buyingSignals}}, etc.

### 7. Outreach Tracking
Track all outreach activities:
- **Activity Types**: email_sent, email_opened, email_replied, call_made, call_answered, linkedin_sent, linkedin_connected
- **Channels**: email, phone, linkedin
- **Call Outcomes**: no_answer, voicemail, callback_scheduled, not_interested, interested, meeting_scheduled
- Auto-updates lead status based on activities

### 8. Script Generation System
4 distinct cold-call script styles:
- **Consultative**: Advisor approach, discovery questions, trust-building
- **Direct Value**: ROI-driven, quantified benefits, speed-focused
- **Question-Led**: Socratic method, self-discovery, engagement
- **Pain-Agitate-Solution (PAS)**: Pain identification, agitation, solution as relief

### 9. Lead Scoring
Multi-dimensional scoring system:
- **Likelihood Score** (1-100): Purchase probability
- **Match Score** (1-100): Service alignment with rltx.ai
- **Urgency Score** (1-100): Buying urgency signals
- **Budget Fit Score** (1-100): Budget alignment
- **Priority Score**: Weighted composite for ranking

### 10. Analytics Dashboard (client/src/pages/analytics.tsx)
- **Conversion Funnel**: Total leads → Enriched → Contacted → Responded → Meeting booked → Won
- **Response Rates by Channel**: Email, Phone, LinkedIn metrics
- **Performance by ICP**: Lead count, response rate, meetings per ICP
- **Activity Over Time**: 30-day chart of leads created/contacted
- **Geographic Breakdown**: Leads and response rates by state

## Project Structure
```
client/src/
  ├── pages/
  │   ├── dashboard.tsx      # Stats, top leads, lead table
  │   ├── leads.tsx          # All leads with filtering
  │   ├── lead-detail.tsx    # Lead detail with tabs
  │   ├── icp.tsx            # ICP Builder with auto-scrape
  │   ├── scripts.tsx        # All generated scripts
  │   ├── scrape.tsx         # Data collection
  │   ├── settings.tsx       # Company profile
  │   └── analytics.tsx      # Analytics dashboard
  ├── components/
  └── lib/

server/
  ├── routes.ts              # API endpoints
  ├── storage.ts             # Database operations
  ├── playbook-orchestrator.ts # Multi-ICP playbook scraping engine
  ├── real-data-scraper.ts   # Tavily + Claude real data extraction
  ├── email-validator.ts     # MX record validation
  ├── enrichment.ts          # Lead enrichment with web research
  ├── icp-scraper.ts         # ICP-triggered auto-scraping
  ├── scoring.ts             # Lead scoring algorithms
  └── county-data.ts         # US Census county data

shared/
  └── schema.ts              # Data models (leads, ICP, scripts, sequences, activities)
```

## API Endpoints

### Stats & Dashboard
- `GET /api/stats` - Dashboard statistics
- `GET /api/leads/top-scored` - Top N leads by priority

### Leads
- `GET /api/leads` - All leads
- `GET /api/leads/:id` - Single lead
- `PATCH /api/leads/:id` - Update lead
- `PATCH /api/leads/:id/call-outcome` - Update call outcome and log activity

### Enrichment
- `POST /api/leads/:id/enrich` - Enrich lead with Tavily + Claude
- `POST /api/leads/:id/enrich-real` - Enhanced enrichment with real-time web research
- `POST /api/leads/enrich-batch` - Batch enrich multiple leads

### Scripts
- `POST /api/leads/:id/generate-script` - Generate script (accepts scriptStyle param)
- `GET /api/leads/:id/scripts` - All scripts for a lead
- `GET /api/scripts` - All scripts with lead data

### Scoring
- `POST /api/leads/:id/score` - Score a single lead
- `POST /api/leads/score-all` - Batch score all leads

### ICP
- `GET /api/icp` - All ICP profiles
- `PUT /api/icp/:id` - Update ICP profile (triggers auto-scrape if enabled)
- `POST /api/icp/:id/trigger-scrape` - Manually trigger scraping for ICP
- `POST /api/icp/:id/playbook-scrape` - Scrape specific entities using playbook config
- `GET /api/icp/:id/matching-targets` - Preview matching targets

### Email Sequences
- `GET /api/sequences` - All sequences
- `POST /api/sequences` - Create sequence
- `GET /api/sequences/:id` - Get sequence with steps
- `PUT /api/sequences/:id` - Update sequence
- `DELETE /api/sequences/:id` - Delete sequence
- `POST /api/sequences/:id/steps` - Add step
- `PUT /api/sequences/:id/steps/:stepId` - Update step
- `DELETE /api/sequences/:id/steps/:stepId` - Delete step
- `POST /api/sequences/:id/enroll` - Enroll leads
- `GET /api/sequences/:id/enrollments` - Get enrollments
- `POST /api/sequences/:id/render-template` - Render template with lead data
- `GET /api/template-variables` - Get available template variables

### Outreach Activities
- `POST /api/activities` - Log new activity
- `GET /api/activities/stats` - Get activity statistics
- `GET /api/leads/:id/activities` - Get activities for a lead
- `GET /api/sequences/:id/activities` - Get activities for a sequence

### Analytics
- `GET /api/analytics/funnel` - Conversion funnel data
- `GET /api/analytics/response-rates` - Response rates by channel
- `GET /api/analytics/by-icp` - Performance by ICP
- `GET /api/analytics/by-state` - Geographic breakdown
- `GET /api/analytics/over-time` - Time series data

### Company Profile
- `GET /api/company-profile` - Company profile
- `PUT /api/company-profile` - Manual update
- `POST /api/company-profile/scrape-website` - Scrape from rltx.ai

### Data Collection
- `GET /api/scrape/jobs` - Scrape job history
- `POST /api/scrape/start` - Start new scrape (uses real data extraction)
- `POST /api/export` - Export leads data

## Environment Variables
- `TAVILY_API_KEY` - Required for web research and real contact extraction
- `DATABASE_URL` - PostgreSQL connection (auto-configured)

## Running the App
The app runs on port 5000 with the `Start application` workflow (`npm run dev`).

## Data Sources
- **County Data**: Embedded Census Bureau county data (300+ counties, all 50 states + DC)
- **Real Contact Data**: Scraped from actual government websites using Tavily API
- **Email Validation**: MX record lookup to verify deliverability
- **Web Research**: Tavily API for real-time information
- **AI Analysis**: Claude 4.5 Sonnet for extraction and script generation
