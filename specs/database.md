# Database Optimization Specification

## Overview
Fix N+1 queries and add proper database indexes for production performance.

## Current Problems

### N+1 Query in getAllLeads()

Current (BAD):
```typescript
async getAllLeads(): Promise<GovernmentLead[]> {
  return db.select().from(governmentLeads).orderBy(desc(governmentLeads.updatedAt));
}

// Then in route:
const leads = await storage.getAllLeads();
const paginatedLeads = leads.slice(offset, offset + limit); // Loads ALL into memory
```

Fixed (GOOD):
```typescript
async getLeadsPaginated(page: number, limit: number, filters?: LeadFilters): Promise<{
  leads: GovernmentLead[];
  total: number;
}> {
  const offset = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [];
  if (filters?.state) {
    conditions.push(eq(governmentLeads.state, filters.state));
  }
  if (filters?.status) {
    conditions.push(eq(governmentLeads.status, filters.status));
  }
  if (filters?.icpId) {
    conditions.push(eq(governmentLeads.icpId, filters.icpId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get paginated results
  const [leads, countResult] = await Promise.all([
    db
      .select()
      .from(governmentLeads)
      .where(whereClause)
      .orderBy(desc(governmentLeads.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(governmentLeads)
      .where(whereClause),
  ]);

  return {
    leads,
    total: Number(countResult[0]?.count ?? 0),
  };
}
```

## Database Indexes to Add

### In `shared/schema.ts`:

```typescript
import { index } from 'drizzle-orm/pg-core';

export const governmentLeads = pgTable('government_leads', {
  // ... existing columns
}, (table) => ({
  icpIdIdx: index('gov_leads_icp_id_idx').on(table.icpId),
  stateIdx: index('gov_leads_state_idx').on(table.state),
  statusIdx: index('gov_leads_status_idx').on(table.status),
  updatedAtIdx: index('gov_leads_updated_at_idx').on(table.updatedAt),
}));

export const callScripts = pgTable('call_scripts', {
  // ... existing columns
}, (table) => ({
  leadIdIdx: index('call_scripts_lead_id_idx').on(table.leadId),
}));

export const outreachActivities = pgTable('outreach_activities', {
  // ... existing columns
}, (table) => ({
  leadIdIdx: index('outreach_lead_id_idx').on(table.leadId),
}));

export const sequenceEnrollments = pgTable('sequence_enrollments', {
  // ... existing columns
}, (table) => ({
  leadIdIdx: index('seq_enroll_lead_id_idx').on(table.leadId),
  sequenceIdIdx: index('seq_enroll_seq_id_idx').on(table.sequenceId),
}));
```

## Migration

After adding indexes, run:
```bash
npm run db:push
```

## Route Updates Needed

### GET /api/leads

Update to use new paginated method:

```typescript
app.get('/api/leads', async (req, res) => {
  try {
    const { page = 1, limit = 20, state, status, icpId } = req.query;

    const result = await storage.getLeadsPaginated(
      Number(page),
      Math.min(Number(limit), 100),
      {
        state: state as string,
        status: status as string,
        icpId: icpId ? Number(icpId) : undefined,
      }
    );

    res.json({
      leads: result.leads,
      total: result.total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(result.total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});
```

## Performance Verification

After implementation, verify with database query logging:

1. Enable query logging in Drizzle:
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(pool, {
  logger: true, // Logs all queries
});
```

2. Make API requests and verify:
- Only 2 queries per paginated request (data + count)
- LIMIT and OFFSET in queries
- Indexes being used (check EXPLAIN)

## Expected Performance Improvement

| Scenario | Before | After |
|----------|--------|-------|
| 1000 leads, page 1 | Load all 1000 | Load 20 |
| Filter by state | Load all, filter in JS | SQL WHERE |
| Sort by date | Load all, sort in JS | SQL ORDER BY |
