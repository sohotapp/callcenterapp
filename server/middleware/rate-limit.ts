import rateLimit from 'express-rate-limit';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Stricter limit for expensive operations (scraping)
export const scrapeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 scrape requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Scraping rate limit exceeded. Please wait a moment.' },
});

// AI enrichment limiter
export const enrichLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 enrichment requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Enrichment rate limit exceeded. Please wait a moment.' },
});

// Auth limiter - prevent brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});
