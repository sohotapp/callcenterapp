# GovLeads - Hyper-Personalized Cold-Call Intelligence Platform

## Overview
GovLeads is a world-class cold-call intelligence platform that helps rltx.ai ("Palantir for AI") sell custom end-to-end AI systems to local government institutions. It uses Tavily API for real-time web research and Claude 4.5 Sonnet for deep analysis, generating hyper-personalized cold-call scripts in 4 distinct styles.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, TanStack Query
- **Backend**: Express.js, Node.js
- **AI**: Claude 4.5 Sonnet (claude-sonnet-4-5) via Replit AI Integrations
- **Research**: Tavily API for real-time web research
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side routing

## Key Features

### 1. Company Intelligence Layer
- Scrape rltx.ai website using Tavily API
- Store company capabilities, services, case studies
- Manual editing in Settings page
- Context for personalized script generation

### 2. ICP Builder (Ideal Customer Profile)
- 5 configurable verticals: Government, Healthcare, Legal, Financial Services, PE
- Target criteria per vertical: population, budget, departments, states
- Pain point keywords for matching
- Active/inactive toggle per vertical

### 3. Lead Enrichment Engine
Deep research using Tavily API + Claude AI:
- **Decision Makers**: Names, titles, contact info
- **Tech Stack**: Current software/systems in use
- **Recent News**: Initiatives, projects, RFPs
- **Pain Points**: Real problems from public sources
- **Buying Signals**: Budget approvals, hiring, tech complaints
- **Competitor Analysis**: Who else is selling to them

### 4. Script Generation System
4 distinct cold-call script styles:
- **Consultative**: Advisor approach, discovery questions, trust-building
- **Direct Value**: ROI-driven, quantified benefits, speed-focused
- **Question-Led**: Socratic method, self-discovery, engagement
- **Pain-Agitate-Solution (PAS)**: Pain identification, agitation, solution as relief

Each script includes:
- Opener, Talking Points, Value Proposition
- Full Script, Objection Handlers, Closing Statement

### 5. Lead Scoring
Multi-dimensional scoring system:
- **Likelihood Score** (1-100): Purchase probability
- **Match Score** (1-100): Service alignment with rltx.ai
- **Urgency Score** (1-100): Buying urgency signals
- **Budget Fit Score** (1-100): Budget alignment
- **Priority Score**: Weighted composite for ranking

### 6. Additional Features
- Dashboard with stats and top scored leads
- Lead management with filtering/sorting
- Web scraping for government data collection
- CSV/JSON export for CRM integration

## Project Structure
```
client/src/
  ├── pages/           # Page components
  │   ├── dashboard.tsx      # Stats, top leads, lead table
  │   ├── leads.tsx          # All leads with filtering
  │   ├── lead-detail.tsx    # Lead detail with tabs
  │   ├── icp.tsx            # ICP Builder
  │   ├── scripts.tsx        # All generated scripts
  │   ├── scrape.tsx         # Data collection
  │   └── settings.tsx       # Company profile
  ├── components/      # Reusable components
  └── lib/            # Utilities

server/
  ├── routes.ts       # API endpoints
  ├── storage.ts      # Database operations
  ├── enrichment.ts   # Tavily + Claude enrichment
  ├── scoring.ts      # Lead scoring algorithms
  └── county-data.ts  # US Census county data

shared/
  └── schema.ts       # Data models (leads, ICP, scripts, company)
```

## API Endpoints

### Stats & Dashboard
- `GET /api/stats` - Dashboard statistics
- `GET /api/leads/top-scored` - Top N leads by priority

### Leads
- `GET /api/leads` - All leads
- `GET /api/leads/:id` - Single lead
- `PATCH /api/leads/:id` - Update lead

### Enrichment
- `POST /api/leads/:id/enrich` - Enrich lead with Tavily + Claude
- `POST /api/leads/enrich-batch` - Batch enrich multiple leads
- `GET /api/leads/:id/enrichment` - Get enrichment details

### Scripts
- `POST /api/leads/:id/generate-script` - Generate script (accepts scriptStyle param)
- `GET /api/leads/:id/scripts` - All scripts for a lead
- `GET /api/scripts` - All scripts with lead data

### Scoring
- `POST /api/leads/:id/score` - Score a single lead
- `POST /api/leads/score-all` - Batch score all leads

### ICP
- `GET /api/icp` - All ICP profiles
- `PUT /api/icp/:id` - Update ICP profile

### Company Profile
- `GET /api/company-profile` - Company profile
- `PUT /api/company-profile` - Manual update
- `POST /api/company-profile/scrape-website` - Scrape from rltx.ai

### Data Collection
- `GET /api/scrape/jobs` - Scrape job history
- `POST /api/scrape/start` - Start new scrape
- `POST /api/export` - Export leads data

## Environment Variables
- `TAVILY_API_KEY` - Required for web research enrichment
- `DATABASE_URL` - PostgreSQL connection (auto-configured)

## Running the App
The app runs on port 5000 with the `Start application` workflow (`npm run dev`).

## Data Sources
- **County Data**: Embedded Census Bureau county data (300+ counties, all 50 states + DC)
- **Contact Patterns**: Generated following standard .gov conventions
- **Web Research**: Tavily API for real-time information
- **AI Analysis**: Claude 4.5 Sonnet for extraction and script generation
