# Testing Specification

## Overview
Set up comprehensive testing infrastructure using Vitest for both backend and frontend.

## Dependencies to Install

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw happy-dom
```

## Configuration Files

### vitest.config.ts (root)
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/components/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
```

### vitest.config.client.ts
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/components/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
});
```

## Directory Structure

```
tests/
├── setup.ts              # Test setup and mocks
├── utils.ts              # Test utilities
├── mocks/
│   ├── handlers.ts       # MSW request handlers
│   └── server.ts         # MSW server setup
├── api/
│   ├── leads.test.ts
│   ├── icp.test.ts
│   └── scrape.test.ts
└── components/
    ├── LeadsTable.test.tsx
    ├── IcpCard.test.tsx
    └── Dashboard.test.tsx
```

## Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

## Example API Test

```typescript
// tests/api/leads.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../../server/index';
import request from 'supertest';

describe('GET /api/leads', () => {
  it('returns paginated leads', async () => {
    const res = await request(app)
      .get('/api/leads')
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('leads');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page');
    expect(Array.isArray(res.body.leads)).toBe(true);
  });

  it('respects pagination limits', async () => {
    const res = await request(app)
      .get('/api/leads')
      .query({ page: 1, limit: 5 });

    expect(res.body.leads.length).toBeLessThanOrEqual(5);
  });
});
```

## Example Component Test

```typescript
// tests/components/LeadsTable.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadsTable } from '../../client/src/components/leads-table';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('LeadsTable', () => {
  it('renders loading skeleton initially', () => {
    render(<LeadsTable />, { wrapper });
    expect(screen.getByTestId('leads-skeleton')).toBeInTheDocument();
  });
});
```

## Coverage Targets

| Area | Minimum Coverage |
|------|------------------|
| API Routes | 70% |
| Storage Functions | 60% |
| React Components | 50% |
| Utilities | 80% |

## Priority Order

1. API endpoint tests (highest value)
2. Storage function tests
3. Component tests
4. Utility function tests
