# RLTX Lead Gen - Production Fix Plan

## Phase 1: Critical Foundation (Must Complete)

### 1.1 Testing Infrastructure
- [ ] Install Vitest and testing dependencies (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `msw`)
- [ ] Create `vitest.config.ts` for backend and frontend
- [ ] Add test scripts to `package.json`
- [ ] Create test utilities and mocks in `tests/` directory

### 1.2 Database Performance
- [ ] Add index on `government_leads.icp_id`
- [ ] Add index on `government_leads.state`
- [ ] Add index on `government_leads.status`
- [ ] Add index on `call_scripts.lead_id`
- [ ] Add index on `outreach_activities.lead_id`
- [ ] Fix N+1 query in `getAllLeads()` - use SQL LIMIT/OFFSET instead of in-memory slice
- [ ] Fix N+1 query in `getLeadsByIcp()` - use SQL WHERE clause

### 1.3 Security Middleware
- [ ] Install security packages (`helmet`, `express-rate-limit`, `express-validator`)
- [ ] Add `helmet()` middleware for security headers
- [ ] Add rate limiting middleware (100 req/min per IP)
- [ ] Add request body size limit (1MB)
- [ ] Add input sanitization on all user inputs

## Phase 2: API Tests (High Priority)

### 2.1 Lead API Tests
- [ ] Test `GET /api/leads` - pagination, filtering
- [ ] Test `GET /api/leads/:id` - found and not found
- [ ] Test `PUT /api/leads/:id` - update lead
- [ ] Test `POST /api/leads/:id/enrich` - enrichment

### 2.2 ICP API Tests
- [ ] Test `GET /api/icp` - list all ICPs
- [ ] Test `PUT /api/icp/:id` - update ICP
- [ ] Test `POST /api/icp/sync` - sync templates

### 2.3 Scraping API Tests
- [ ] Test `POST /api/scrape/start` - start scraping
- [ ] Test `GET /api/scrape/jobs` - list jobs
- [ ] Test `GET /api/scrape/jobs/:id` - job status

## Phase 3: Frontend Error Handling

### 3.1 Error States
- [ ] Add error UI component (`components/ui/error-state.tsx`)
- [ ] Add error boundary to each page
- [ ] Show error state in LeadsTable when fetch fails
- [ ] Show error state in Dashboard when fetch fails
- [ ] Add retry button on failed API calls

### 3.2 Form Validation
- [ ] Add inline error messages to lead edit form
- [ ] Add inline error messages to ICP edit form
- [ ] Add inline error messages to script generator form
- [ ] Show validation errors from API responses

### 3.3 Loading States
- [ ] Ensure all data tables have skeleton loaders
- [ ] Add loading state to all form submissions
- [ ] Add loading state to enrichment actions

## Phase 4: Observability

### 4.1 Structured Logging
- [ ] Install Winston logger
- [ ] Create logger utility with JSON formatting
- [ ] Replace all console.log with structured logger
- [ ] Add request ID tracking
- [ ] Add log levels (debug, info, warn, error)

### 4.2 Error Tracking
- [ ] Install Sentry SDK (`@sentry/node`, `@sentry/react`)
- [ ] Configure Sentry in backend
- [ ] Configure Sentry in frontend
- [ ] Add error boundary reporting to Sentry

### 4.3 Health Checks
- [ ] Enhance `/healthz` to check database connectivity
- [ ] Add `/readyz` endpoint for readiness probe
- [ ] Add API version to health response

## Phase 5: DevOps & CI/CD

### 5.1 GitHub Actions
- [ ] Create `.github/workflows/ci.yml`
- [ ] Run TypeScript check on PR
- [ ] Run tests on PR
- [ ] Run build on PR
- [ ] Deploy to Railway on main push

### 5.2 Documentation
- [ ] Create API documentation with OpenAPI spec
- [ ] Add setup instructions to README
- [ ] Document environment variables
- [ ] Document deployment process

## Phase 6: Component Tests

### 6.1 Core Components
- [ ] Test LeadsTable component
- [ ] Test IcpCard component
- [ ] Test SmartLeadCard component
- [ ] Test Dashboard metrics

### 6.2 Form Components
- [ ] Test lead edit form
- [ ] Test ICP configuration form
- [ ] Test script generator form

## Phase 7: End-to-End Integration

### 7.1 Critical Flows
- [ ] Verify ICP sync loads all 22 templates
- [ ] Verify lead scraping creates leads in database
- [ ] Verify AI enrichment populates lead data
- [ ] Verify script generation works with lead data
- [ ] Verify analytics show correct metrics

### 7.2 Performance Verification
- [ ] Load test with 1000+ leads - ensure pagination works
- [ ] Verify no N+1 queries in database logs
- [ ] Measure and document API response times

---

## Progress Tracking

**Started:** [Auto-filled by Ralph]
**Last Updated:** [Auto-filled by Ralph]
**Tasks Completed:** 0 / 67
**Current Phase:** 1

## Notes

<!-- Add any blockers or notes here -->

---

When ALL tasks above are checked, output:
```
<promise>PRODUCTION_READY</promise>
```
