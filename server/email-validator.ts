import dns from "dns";

export interface EmailValidationResult {
  isValid: boolean;
  formatValid: boolean;
  domainValid: boolean;
  mxRecords: string[];
  reason?: string;
}

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

async function lookupMxRecords(domain: string): Promise<{ success: boolean; records: string[]; error?: string }> {
  try {
    const mxRecords = await dns.promises.resolveMx(domain);
    
    if (!mxRecords || mxRecords.length === 0) {
      return { success: false, records: [], error: "No MX records found" };
    }
    
    const sortedRecords = mxRecords
      .sort((a, b) => a.priority - b.priority)
      .map(record => record.exchange);
    
    return { success: true, records: sortedRecords };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown DNS error";
    const errorCode = (error as NodeJS.ErrnoException).code;
    
    if (errorCode === "ENOTFOUND" || errorCode === "ENODATA") {
      return { success: false, records: [], error: "Domain does not exist or has no MX records" };
    }
    
    if (errorCode === "ETIMEOUT") {
      return { success: false, records: [], error: "DNS lookup timed out" };
    }
    
    return { success: false, records: [], error: errorMessage };
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

export async function validateEmailBatch(emails: string[]): Promise<Map<string, EmailValidationResult>> {
  const results = new Map<string, EmailValidationResult>();
  
  const validationPromises = emails.map(async (email) => {
    const result = await validateEmail(email);
    results.set(email, result);
  });
  
  await Promise.all(validationPromises);
  
  return results;
}
