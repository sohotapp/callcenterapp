# Security Specification

## Overview
Implement production-grade security middleware and practices.

## Dependencies to Install

```bash
npm install helmet express-rate-limit
```

## Implementation

### 1. Helmet Security Headers

Add to `server/index.ts`:

```typescript
import helmet from 'helmet';

// Add before routes
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // For compatibility
}));
```

### 2. Rate Limiting

Create `server/middleware/rate-limit.ts`:

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Stricter limit for expensive operations
export const scrapeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // 10 scrape requests per minute
  message: { error: 'Scraping rate limit exceeded.' },
});

// AI enrichment limiter
export const enrichLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Enrichment rate limit exceeded.' },
});
```

Apply in `server/index.ts`:

```typescript
import { apiLimiter, scrapeLimiter, enrichLimiter } from './middleware/rate-limit';

// Apply to all API routes
app.use('/api', apiLimiter);

// Apply stricter limits to specific routes
app.use('/api/scrape', scrapeLimiter);
app.use('/api/leads/:id/enrich', enrichLimiter);
```

### 3. Request Body Size Limit

Already in Express, but make explicit:

```typescript
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
```

### 4. Input Validation

Already using Zod - ensure all endpoints validate:

```typescript
// Example pattern - already in use
const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
});

const result = schema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({
    error: 'Validation failed',
    details: result.error.issues
  });
}
```

### 5. SQL Injection Prevention

Drizzle ORM handles this automatically with parameterized queries.

Verify NO raw SQL like this exists:
```typescript
// BAD - Never do this
db.execute(`SELECT * FROM leads WHERE name = '${userInput}'`);

// GOOD - Drizzle does this automatically
db.select().from(leads).where(eq(leads.name, userInput));
```

## Security Headers Added by Helmet

| Header | Purpose |
|--------|---------|
| X-Content-Type-Options | Prevents MIME sniffing |
| X-Frame-Options | Prevents clickjacking |
| X-XSS-Protection | XSS filter |
| Strict-Transport-Security | Forces HTTPS |
| Content-Security-Policy | Controls resource loading |

## Verification

After implementation, test with:

```bash
# Check headers
curl -I http://localhost:3000/api/leads

# Test rate limiting
for i in {1..110}; do curl http://localhost:3000/api/leads; done
# Should get 429 after 100 requests
```
