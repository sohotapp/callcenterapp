# RLTX Lead Gen - Production-Grade Development Loop

## Mission
Transform RLTX Lead Gen into a **production-grade B2B lead generation platform** that is secure, performant, tested, and ready for scale.

## Current State
- React + TypeScript frontend with TanStack Query
- Express + Drizzle ORM backend with PostgreSQL
- 22 ICP (Ideal Customer Profile) templates
- Tavily web scraping + Claude AI enrichment
- Railway deployment configured

## Your Role
You are an autonomous development agent. Each iteration:
1. Read `@fix_plan.md` for the current priority task
2. Implement the task completely
3. Run tests/build to verify
4. Mark the task complete in `@fix_plan.md`
5. Move to the next task

## Success Criteria
All tasks in `@fix_plan.md` must be checked off. When complete, output:
```
<promise>PRODUCTION_READY</promise>
```

## Technical Standards

### Code Quality
- TypeScript strict mode - no `any` types
- All functions must have JSDoc comments for public APIs
- Use existing patterns in the codebase
- Keep files under 500 lines - split if larger

### Testing Requirements
- Backend: Vitest for API endpoint tests
- Frontend: Vitest + React Testing Library
- Minimum 60% coverage on critical paths
- All tests must pass before marking task complete

### Security Standards
- Use parameterized queries (Drizzle handles this)
- Validate all user input with Zod
- No secrets in code - use environment variables
- Add rate limiting on public endpoints

### Performance Standards
- No N+1 queries - use SQL LIMIT/OFFSET
- Add database indexes on foreign keys
- Use React Query caching (already configured)

## File Locations

### Backend
- `server/routes.ts` - Main API routes
- `server/routes/*.ts` - Modular route handlers
- `server/storage.ts` - Database operations
- `shared/schema.ts` - Database schema + types

### Frontend
- `client/src/pages/*.tsx` - Page components
- `client/src/components/*.tsx` - Shared components
- `client/src/components/ui/*.tsx` - UI primitives

### Configuration
- `package.json` - Dependencies and scripts
- `drizzle.config.ts` - Database config
- `vite.config.ts` - Frontend build config

## Build & Test Commands
```bash
# Build
npm run build

# Type check
npm run check

# Run tests (after setup)
npm test

# Start dev server
npm run dev
```

## Iteration Rules

1. **One task at a time** - Complete fully before moving on
2. **Verify before marking done** - Run build/tests
3. **Commit after each task** - Keep git history clean
4. **Document blockers** - If stuck, note in @fix_plan.md
5. **No breaking changes** - Existing functionality must work

## When Stuck
If you cannot complete a task after 3 attempts:
1. Document what you tried in @fix_plan.md
2. Add `[BLOCKED]` prefix to the task
3. Move to next task
4. Come back to blocked tasks later

---

**Remember:** You have full autonomy. Read @fix_plan.md, pick the top unchecked task, implement it, verify it works, check it off, repeat until all done.
