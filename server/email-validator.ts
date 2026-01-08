import dns from "dns";
import pLimit from "p-limit";

export interface EmailValidationResult {
  isValid: boolean;
  formatValid: boolean;
  domainValid: boolean;
  mxRecords: string[];
  reason?: string;
  cachedResult?: boolean;
}

// Domain MX cache to avoid redundant DNS lookups
const domainMxCache = new Map<string, { success: boolean; records: string[]; error?: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Concurrency limit for DNS lookups
const DNS_CONCURRENCY = 10;

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const GOVERNMENT_DOMAIN_PATTERNS = [
  /\.gov$/i,
  /\.gov\.[a-z]{2}$/i,
  /^co\.[a-z]+\.[a-z]{2}\.us$/i,
  /\.county\.[a-z]+\.us$/i,
  /\.state\.[a-z]{2}\.us$/i,
  /\.city\.[a-z]+\.us$/i,
  /\.ci\.[a-z]+\.[a-z]{2}\.us$/i,
];

function validateEmailFormat(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  
  const trimmedEmail = email.trim().toLowerCase();
  
  if (trimmedEmail.length > 254) {
    return false;
  }
  
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return false;
  }
  
  const [localPart, domain] = trimmedEmail.split("@");
  
  if (!localPart || localPart.length > 64) {
    return false;
  }
  
  if (!domain || domain.length > 253) {
    return false;
  }
  
  if (!domain.includes(".")) {
    return false;
  }
  
  return true;
}

function extractDomain(email: string): string | null {
  if (!email || typeof email !== "string") {
    return null;
  }
  
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) {
    return null;
  }
  
  return parts[1];
}

function isGovernmentDomain(domain: string): boolean {
  return GOVERNMENT_DOMAIN_PATTERNS.some(pattern => pattern.test(domain));
}

async function lookupMxRecords(domain: string, useCache = true): Promise<{ success: boolean; records: string[]; error?: string; cached?: boolean }> {
  // Check cache first
  if (useCache) {
    const cached = domainMxCache.get(domain);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { ...cached, cached: true };
    }
  }

  try {
    const mxRecords = await dns.promises.resolveMx(domain);

    if (!mxRecords || mxRecords.length === 0) {
      const result = { success: false, records: [], error: "No MX records found" };
      domainMxCache.set(domain, { ...result, timestamp: Date.now() });
      return result;
    }

    const sortedRecords = mxRecords
      .sort((a, b) => a.priority - b.priority)
      .map(record => record.exchange);

    const result = { success: true, records: sortedRecords };
    domainMxCache.set(domain, { ...result, timestamp: Date.now() });
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown DNS error";
    const errorCode = (error as NodeJS.ErrnoException).code;

    let result;
    if (errorCode === "ENOTFOUND" || errorCode === "ENODATA") {
      result = { success: false, records: [], error: "Domain does not exist or has no MX records" };
    } else if (errorCode === "ETIMEOUT") {
      result = { success: false, records: [], error: "DNS lookup timed out" };
    } else {
      result = { success: false, records: [], error: errorMessage };
    }

    domainMxCache.set(domain, { ...result, timestamp: Date.now() });
    return result;
  }
}

export async function validateEmail(email: string): Promise<EmailValidationResult> {
  if (!validateEmailFormat(email)) {
    return {
      isValid: false,
      formatValid: false,
      domainValid: false,
      mxRecords: [],
      reason: "Invalid email format",
    };
  }
  
  const domain = extractDomain(email);
  if (!domain) {
    return {
      isValid: false,
      formatValid: false,
      domainValid: false,
      mxRecords: [],
      reason: "Could not extract domain from email",
    };
  }
  
  const mxResult = await lookupMxRecords(domain);
  
  if (!mxResult.success) {
    const isGovDomain = isGovernmentDomain(domain);
    
    return {
      isValid: false,
      formatValid: true,
      domainValid: false,
      mxRecords: [],
      reason: isGovDomain 
        ? `Government domain MX lookup failed: ${mxResult.error}`
        : `Domain cannot receive email: ${mxResult.error}`,
    };
  }
  
  return {
    isValid: true,
    formatValid: true,
    domainValid: true,
    mxRecords: mxResult.records,
  };
}

export async function validateEmailBatch(
  emails: string[],
  options: { concurrency?: number; skipDuplicates?: boolean } = {}
): Promise<Map<string, EmailValidationResult>> {
  const { concurrency = DNS_CONCURRENCY, skipDuplicates = true } = options;
  const results = new Map<string, EmailValidationResult>();
  const limit = pLimit(concurrency);

  // Deduplicate emails if requested
  const uniqueEmails = skipDuplicates ? Array.from(new Set(emails)) : emails;

  // Group emails by domain for efficient caching
  const emailsByDomain = new Map<string, string[]>();
  for (const email of uniqueEmails) {
    const domain = extractDomain(email);
    if (domain) {
      if (!emailsByDomain.has(domain)) {
        emailsByDomain.set(domain, []);
      }
      emailsByDomain.get(domain)!.push(email);
    }
  }

  // Pre-warm cache for unique domains (with concurrency limit)
  const domains = Array.from(emailsByDomain.keys());
  await Promise.all(
    domains.map(domain => limit(() => lookupMxRecords(domain, true)))
  );

  // Now validate all emails (cache will be warm, so this is fast)
  const validationPromises = uniqueEmails.map(email =>
    limit(async () => {
      const result = await validateEmail(email);
      results.set(email, result);
    })
  );

  await Promise.all(validationPromises);

  return results;
}

// Export cache utilities for testing/monitoring
export function getCacheStats(): { size: number; domains: string[] } {
  return {
    size: domainMxCache.size,
    domains: Array.from(domainMxCache.keys()),
  };
}

export function clearCache(): void {
  domainMxCache.clear();
}
