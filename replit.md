# GovLeads - Government Sales Pipeline Platform

## Overview
GovLeads is an intelligent government sales pipeline platform that helps rltx.ai identify, research, and connect with local government institutions across the United States. It uses Claude 4.5 Opus AI to generate personalized cold-call scripts based on each government entity's specific needs and pain points.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Shadcn UI, TanStack Query
- **Backend**: Express.js, Node.js
- **AI**: Claude 4.5 Sonnet (claude-sonnet-4-5) via Replit AI Integrations (no API key required)
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side routing

## Key Features
1. **Dashboard** - Overview stats (total leads, high priority, contacted, qualified)
2. **Lead Management** - Full CRUD for government leads with filtering/sorting
3. **AI Script Generation** - Claude-powered contextual cold-call scripts
4. **Web Scraping** - Collect U.S. county government contact data
5. **Company Profile** - AI-analyzed rltx.ai capabilities for script context
6. **Export** - CSV/JSON export for CRM integration

## Project Structure
```
client/src/
  ├── pages/           # Page components (dashboard, leads, scripts, etc.)
  ├── components/      # Reusable components (sidebar, theme toggle)
  └── lib/            # Utilities (queryClient)

server/
  ├── routes.ts       # API endpoints
  ├── storage.ts      # In-memory data storage
  └── replit_integrations/  # AI integration utilities

shared/
  └── schema.ts       # Data models and types
```

## API Endpoints
- `GET /api/stats` - Dashboard statistics
- `GET /api/leads` - All leads
- `GET /api/leads/:id` - Single lead
- `PATCH /api/leads/:id` - Update lead
- `GET /api/leads/:id/script` - Get script for lead
- `POST /api/leads/:id/generate-script` - Generate AI script
- `GET /api/scripts` - All scripts with lead data
- `GET /api/company-profile` - Company profile
- `POST /api/company-profile/refresh` - Refresh from rltx.ai
- `GET /api/scrape/jobs` - Scrape job history
- `POST /api/scrape/start` - Start new scrape
- `POST /api/export` - Export leads data

## Running the App
The app runs on port 5000 with the `Start application` workflow (`npm run dev`).

## Recent Changes
- Initial implementation of full MVP
- Dashboard with stats cards and lead table
- Lead detail view with AI script generation
- Scrape page for collecting government data
- Export functionality for CRM integration
- Settings page for company profile management
