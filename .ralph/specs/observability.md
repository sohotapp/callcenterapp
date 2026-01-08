# Observability Specification

## Overview
Implement structured logging and error tracking for production monitoring.

## Dependencies to Install

```bash
npm install winston @sentry/node @sentry/react
```

## 1. Structured Logging with Winston

### Create `server/lib/logger.ts`:

```typescript
import winston from 'winston';

const { combine, timestamp, json, errors, printf } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} [${level.toUpperCase()}] ${message} ${metaStr}`;
});

// Determine environment
const isDev = process.env.NODE_ENV !== 'production';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    isDev ? devFormat : json()
  ),
  defaultMeta: { service: 'rltx-lead-gen' },
  transports: [
    new winston.transports.Console(),
  ],
});

// Request logger middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Attach request ID
  req.requestId = requestId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
    });
  });

  next();
};

// Helper functions
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

export const logInfo = (message: string, meta?: Record<string, any>) => {
  logger.info(message, meta);
};

export const logWarn = (message: string, meta?: Record<string, any>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
  logger.debug(message, meta);
};
```

### Usage in routes:

```typescript
import { logger, logError, logInfo } from './lib/logger';

// Replace console.log
logInfo('Starting scrape job', { icpId, stateCount: states.length });

// Replace console.error
logError(error, { endpoint: '/api/leads', leadId });
```

## 2. Sentry Error Tracking

### Backend Setup (`server/index.ts`):

```typescript
import * as Sentry from '@sentry/node';

// Initialize Sentry FIRST
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // 10% of transactions
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],
  });

  // Request handler must be first
  app.use(Sentry.Handlers.requestHandler());

  // Tracing handler
  app.use(Sentry.Handlers.tracingHandler());
}

// ... your routes ...

// Error handler must be LAST
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}
```

### Frontend Setup (`client/src/main.tsx`):

```typescript
import * as Sentry from '@sentry/react';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay({ maskAllText: false }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

### Error Boundary with Sentry:

```typescript
// client/src/components/error-boundary.tsx
import * as Sentry from '@sentry/react';

export const SentryErrorBoundary = Sentry.withErrorBoundary(
  ({ children }) => <>{children}</>,
  {
    fallback: ({ error }) => (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
        <p className="text-muted-foreground mt-2">{error.message}</p>
        <button onClick={() => window.location.reload()} className="mt-4 btn">
          Reload Page
        </button>
      </div>
    ),
  }
);
```

## 3. Enhanced Health Check

Update `/healthz` endpoint:

```typescript
app.get('/healthz', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'unknown',
      memory: 'ok',
    },
  };

  // Check database
  try {
    await db.execute(sql`SELECT 1`);
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'failed';
    health.status = 'degraded';
  }

  // Check memory
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
    health.checks.memory = 'warning';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

// Readiness check
app.get('/readyz', async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});
```

## Environment Variables

Add to `.env.example`:

```bash
# Observability
LOG_LEVEL=info
SENTRY_DSN=your-sentry-dsn-here
VITE_SENTRY_DSN=your-sentry-dsn-here
```

## Log Levels

| Level | Use Case |
|-------|----------|
| error | Exceptions, failures that need attention |
| warn | Degraded performance, approaching limits |
| info | Normal operations, key events |
| debug | Detailed troubleshooting (dev only) |

## Metrics to Track

| Metric | Source |
|--------|--------|
| Request count | Logger middleware |
| Response time | Logger middleware |
| Error rate | Sentry |
| Database query time | Drizzle logger |
| API endpoint usage | Logger middleware |
