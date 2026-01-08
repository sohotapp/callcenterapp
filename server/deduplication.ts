import { storage } from "./storage";
import type { GovernmentLead } from "@shared/schema";

export interface DuplicateMatch {
  leadId: number;
  matchedLeadId: number;
  similarity: number;
  matchReasons: string[];
  suggestedAction: "merge" | "review" | "keep_both";
}

export interface DeduplicationResult {
  totalLeads: number;
  duplicatesFound: number;
  groups: DuplicateGroup[];
  processedAt: Date;
}

export interface DuplicateGroup {
  primaryLeadId: number;
  primaryLeadName: string;
  duplicates: Array<{
    leadId: number;
    leadName: string;
    similarity: number;
    matchReasons: string[];
  }>;
}

// Normalize strings for comparison
function normalizeString(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .replace(/county|city|district|department|office|of|the/gi, "")
    .trim();
}

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Calculate similarity score (0-100)
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  if (norm1 === norm2) return 100;

  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 0;

  const distance = levenshteinDistance(norm1, norm2);
  return Math.round((1 - distance / maxLen) * 100);
}

// Check if two leads are potential duplicates
function checkDuplicate(lead1: GovernmentLead, lead2: GovernmentLead): DuplicateMatch | null {
  const matchReasons: string[] = [];
  let totalScore = 0;
  let factors = 0;

  // Institution name similarity (most important)
  const nameSimilarity = calculateSimilarity(lead1.institutionName, lead2.institutionName);
  if (nameSimilarity >= 70) {
    matchReasons.push(`Institution name ${nameSimilarity}% similar`);
    totalScore += nameSimilarity * 2; // Double weight
    factors += 2;
  }

  // Same state (required for match)
  if (lead1.state !== lead2.state) {
    return null;
  }
  matchReasons.push("Same state");
  totalScore += 100;
  factors += 1;

  // Same county
  if (lead1.county && lead2.county) {
    const countySimilarity = calculateSimilarity(lead1.county, lead2.county);
    if (countySimilarity >= 80) {
      matchReasons.push(`Same county (${countySimilarity}%)`);
      totalScore += countySimilarity;
      factors += 1;
    }
  }

  // Same department
  if (lead1.department && lead2.department) {
    const deptSimilarity = calculateSimilarity(lead1.department, lead2.department);
    if (deptSimilarity >= 80) {
      matchReasons.push(`Same department (${deptSimilarity}%)`);
      totalScore += deptSimilarity;
      factors += 1;
    }
  }

  // Same email domain
  if (lead1.email && lead2.email) {
    const domain1 = lead1.email.split("@")[1];
    const domain2 = lead2.email.split("@")[1];
    if (domain1 && domain2 && domain1 === domain2) {
      matchReasons.push("Same email domain");
      totalScore += 100;
      factors += 1;
    }
  }

  // Same phone
  if (lead1.phoneNumber && lead2.phoneNumber) {
    const phone1 = lead1.phoneNumber.replace(/\D/g, "");
    const phone2 = lead2.phoneNumber.replace(/\D/g, "");
    if (phone1 === phone2 && phone1.length >= 10) {
      matchReasons.push("Same phone number");
      totalScore += 100;
      factors += 1;
    }
  }

  // Same website
  if (lead1.website && lead2.website) {
    const cleanUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
    if (cleanUrl(lead1.website) === cleanUrl(lead2.website)) {
      matchReasons.push("Same website");
      totalScore += 100;
      factors += 1;
    }
  }

  // Calculate average similarity
  const avgSimilarity = Math.round(totalScore / factors);

  // Only return if similarity is above threshold
  if (avgSimilarity < 60 || matchReasons.length < 2) {
    return null;
  }

  // Determine suggested action
  let suggestedAction: "merge" | "review" | "keep_both";
  if (avgSimilarity >= 90) {
    suggestedAction = "merge";
  } else if (avgSimilarity >= 70) {
    suggestedAction = "review";
  } else {
    suggestedAction = "keep_both";
  }

  return {
    leadId: lead1.id,
    matchedLeadId: lead2.id,
    similarity: avgSimilarity,
    matchReasons,
    suggestedAction,
  };
}

// Find all duplicates in the database
export async function findDuplicates(): Promise<DeduplicationResult> {
  const leads = await storage.getAllLeads();
  const duplicateGroups: Map<number, DuplicateGroup> = new Map();
  const processedPairs = new Set<string>();

  for (let i = 0; i < leads.length; i++) {
    const lead1 = leads[i];

    for (let j = i + 1; j < leads.length; j++) {
      const lead2 = leads[j];

      // Skip if we've already processed this pair
      const pairKey = `${Math.min(lead1.id, lead2.id)}-${Math.max(lead1.id, lead2.id)}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const match = checkDuplicate(lead1, lead2);
      if (!match) continue;

      // Add to existing group or create new one
      const primaryId = lead1.id < lead2.id ? lead1.id : lead2.id;
      const secondaryId = lead1.id < lead2.id ? lead2.id : lead1.id;
      const secondaryLead = lead1.id < lead2.id ? lead2 : lead1;
      const primaryLead = lead1.id < lead2.id ? lead1 : lead2;

      if (duplicateGroups.has(primaryId)) {
        duplicateGroups.get(primaryId)!.duplicates.push({
          leadId: secondaryId,
          leadName: secondaryLead.institutionName,
          similarity: match.similarity,
          matchReasons: match.matchReasons,
        });
      } else {
        duplicateGroups.set(primaryId, {
          primaryLeadId: primaryId,
          primaryLeadName: primaryLead.institutionName,
          duplicates: [{
            leadId: secondaryId,
            leadName: secondaryLead.institutionName,
            similarity: match.similarity,
            matchReasons: match.matchReasons,
          }],
        });
      }
    }
  }

  const groups = Array.from(duplicateGroups.values())
    .sort((a, b) => b.duplicates.length - a.duplicates.length);

  return {
    totalLeads: leads.length,
    duplicatesFound: groups.reduce((sum, g) => sum + g.duplicates.length, 0),
    groups,
    processedAt: new Date(),
  };
}

// Merge two leads (keep the one with more data)
export async function mergeLeads(
  keepLeadId: number,
  mergeLeadId: number
): Promise<GovernmentLead | null> {
  const keepLead = await storage.getLead(keepLeadId);
  const mergeLead = await storage.getLead(mergeLeadId);

  if (!keepLead || !mergeLead) {
    return null;
  }

  // Merge data - prefer non-null values from either lead
  const mergedData: Partial<GovernmentLead> = {};

  // Merge simple fields - prefer keep lead, fall back to merge lead
  const fields: (keyof GovernmentLead)[] = [
    "phoneNumber", "email", "website", "population", "annualBudget",
    "techMaturityScore", "city"
  ];

  for (const field of fields) {
    if (!keepLead[field] && mergeLead[field]) {
      (mergedData as any)[field] = mergeLead[field];
    }
  }

  // Merge arrays
  if (keepLead.painPoints || mergeLead.painPoints) {
    mergedData.painPoints = Array.from(new Set([
      ...(keepLead.painPoints || []),
      ...(mergeLead.painPoints || []),
    ]));
  }

  if (keepLead.techStack || mergeLead.techStack) {
    mergedData.techStack = Array.from(new Set([
      ...(keepLead.techStack || []),
      ...(mergeLead.techStack || []),
    ]));
  }

  if (keepLead.buyingSignals || mergeLead.buyingSignals) {
    mergedData.buyingSignals = Array.from(new Set([
      ...(keepLead.buyingSignals || []),
      ...(mergeLead.buyingSignals || []),
    ]));
  }

  // Merge decision makers (avoid duplicates by name)
  if (keepLead.decisionMakers || mergeLead.decisionMakers) {
    const existingNames = new Set((keepLead.decisionMakers || []).map(dm => dm.name));
    const newDms = (mergeLead.decisionMakers || []).filter(dm => !existingNames.has(dm.name));
    mergedData.decisionMakers = [...(keepLead.decisionMakers || []), ...newDms];
  }

  // Merge recent news
  if (keepLead.recentNews || mergeLead.recentNews) {
    const existingUrls = new Set((keepLead.recentNews || []).map(n => n.url));
    const newNews = (mergeLead.recentNews || []).filter(n => !existingUrls.has(n.url));
    mergedData.recentNews = [...(keepLead.recentNews || []), ...newNews];
  }

  // Update keep lead with merged data
  const updatedLead = await storage.updateLead(keepLeadId, mergedData);

  // Add note about merge
  const mergeNote = `Merged with lead #${mergeLeadId} (${mergeLead.institutionName}) on ${new Date().toISOString()}`;
  const existingNotes = keepLead.notes || "";
  await storage.updateLead(keepLeadId, {
    notes: existingNotes ? `${existingNotes}\n\n${mergeNote}` : mergeNote,
  });

  // Delete the merged lead
  await storage.deleteLead(mergeLeadId);

  const result = await storage.getLead(keepLeadId);
  return result ?? null;
}

// Check if a new lead would be a duplicate before inserting
export async function checkNewLeadForDuplicates(
  newLead: Partial<GovernmentLead>
): Promise<DuplicateMatch[]> {
  const leads = await storage.getAllLeads();
  const matches: DuplicateMatch[] = [];

  const tempLead = {
    id: -1,
    ...newLead,
  } as GovernmentLead;

  for (const existingLead of leads) {
    const match = checkDuplicate(tempLead, existingLead);
    if (match) {
      matches.push({
        ...match,
        leadId: -1, // New lead doesn't have ID yet
        matchedLeadId: existingLead.id,
      });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}
