# RLTX Lead Gen - Agent Instructions

## Build Commands

```bash
# Install dependencies
npm install

# Build production bundle
npm run build

# Type check without emitting
npm run check

# Run development server
npm run dev

# Push database schema
npm run db:push
```

## Test Commands

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/api/leads.test.ts

# Run tests in watch mode
npx vitest
```

## Verification Steps

After each task, verify:

1. **Build passes:**
   ```bash
   npm run build
   ```
   Expected: No errors, dist/ folder updated

2. **Type check passes:**
   ```bash
   npm run check
   ```
   Expected: No TypeScript errors (some warnings OK)

3. **Tests pass (if applicable):**
   ```bash
   npm test
   ```
   Expected: All tests green

## File Editing Guidelines

### When modifying backend:
1. Check `server/routes.ts` for route definitions
2. Check `server/storage.ts` for database operations
3. Check `shared/schema.ts` for types and schema

### When modifying frontend:
1. Check `client/src/pages/` for page components
2. Check `client/src/components/` for shared components
3. Check `client/src/lib/` for utilities

### When adding tests:
1. Create in `tests/` directory
2. Use `.test.ts` or `.test.tsx` extension
3. Follow existing patterns if any exist

## Common Fixes

### If build fails with missing module:
```bash
npm install <package-name>
```

### If TypeScript errors:
- Check for missing types: `npm install -D @types/<package>`
- Check import paths are correct

### If tests fail:
- Read error message carefully
- Check if test setup is correct
- Verify mocks are properly configured

## Database Operations

### View current schema:
Check `shared/schema.ts`

### Add new index:
Add to schema in `shared/schema.ts`, then:
```bash
npm run db:push
```

### Check database connection:
```bash
npm run dev
# Then visit http://localhost:3000/healthz
```

## Git Operations

After completing a task:
```bash
git add -A
git commit -m "Complete: [task description]"
```

Do NOT push automatically - let the human review first.
