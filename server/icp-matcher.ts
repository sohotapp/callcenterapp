import type { IcpProfile, GovernmentLead, TargetCriteria } from "@shared/schema";

export interface IcpMatchResult {
  leadId: number;
  icpId: number;
  matchScore: number; // 0-100
  breakdown: {
    populationMatch: number;
    stateMatch: number;
    departmentMatch: number;
    techMaturityMatch: number;
    painPointMatch: number;
  };
  matchDetails: string[];
}

export function calculateIcpMatchScore(
  lead: GovernmentLead,
  icp: IcpProfile
): IcpMatchResult {
  const criteria = icp.targetCriteria as TargetCriteria | null;
  const breakdown = {
    populationMatch: 0,
    stateMatch: 0,
    departmentMatch: 0,
    techMaturityMatch: 0,
    painPointMatch: 0,
  };
  const matchDetails: string[] = [];

  // Population matching (0-25 points)
  if (lead.population) {
    const minPop = criteria?.minPopulation ?? 0;
    const maxPop = criteria?.maxPopulation ?? Infinity;
    
    if (lead.population >= minPop && lead.population <= maxPop) {
      breakdown.populationMatch = 25;
      matchDetails.push(`Population ${lead.population.toLocaleString()} within target range`);
    } else if (lead.population >= minPop * 0.75 || lead.population <= maxPop * 1.25) {
      breakdown.populationMatch = 15;
      matchDetails.push(`Population ${lead.population.toLocaleString()} near target range`);
    }
  } else {
    breakdown.populationMatch = 10; // Unknown population gets partial score
  }

  // State matching (0-20 points)
  const targetStates = (criteria?.states || []).map(s => s.toLowerCase());
  if (targetStates.length === 0) {
    breakdown.stateMatch = 20; // No state filter = all states match
  } else if (lead.state && targetStates.includes(lead.state.toLowerCase())) {
    breakdown.stateMatch = 20;
    matchDetails.push(`Located in target state: ${lead.state}`);
  }

  // Department matching (0-25 points)
  const targetDepts = (criteria?.departments || []).map(d => d.toLowerCase());
  if (targetDepts.length === 0) {
    breakdown.departmentMatch = 25; // No dept filter = all depts match
  } else if (lead.department) {
    const leadDept = lead.department.toLowerCase();
    if (targetDepts.some(d => leadDept.includes(d) || d.includes(leadDept))) {
      breakdown.departmentMatch = 25;
      matchDetails.push(`Department "${lead.department}" matches target criteria`);
    } else {
      breakdown.departmentMatch = 10; // Partial score for different dept
    }
  }

  // Tech maturity matching (0-15 points)
  if (lead.techMaturityScore != null) {
    const minTech = criteria?.techMaturityMin ?? 1;
    const maxTech = criteria?.techMaturityMax ?? 10;
    
    if (lead.techMaturityScore >= minTech && lead.techMaturityScore <= maxTech) {
      breakdown.techMaturityMatch = 15;
      matchDetails.push(`Tech maturity score ${lead.techMaturityScore} within target range`);
    } else if (lead.techMaturityScore >= minTech - 1 && lead.techMaturityScore <= maxTech + 1) {
      breakdown.techMaturityMatch = 10;
    }
  } else {
    breakdown.techMaturityMatch = 8; // Unknown gets partial score
  }

  // Pain point keyword matching (0-15 points)
  const painPointKeywords = (criteria?.painPointKeywords || []).map(k => k.toLowerCase());
  if (painPointKeywords.length === 0) {
    breakdown.painPointMatch = 15; // No keywords = full score
  } else if (lead.painPoints && lead.painPoints.length > 0) {
    const leadPainPointsStr = lead.painPoints.join(" ").toLowerCase();
    const matchingKeywords = painPointKeywords.filter(k => leadPainPointsStr.includes(k));
    const keywordMatchRatio = matchingKeywords.length / painPointKeywords.length;
    breakdown.painPointMatch = Math.round(15 * keywordMatchRatio);
    
    if (matchingKeywords.length > 0) {
      matchDetails.push(`Pain points match keywords: ${matchingKeywords.join(", ")}`);
    }
  }

  const matchScore = 
    breakdown.populationMatch +
    breakdown.stateMatch +
    breakdown.departmentMatch +
    breakdown.techMaturityMatch +
    breakdown.painPointMatch;

  return {
    leadId: lead.id,
    icpId: icp.id,
    matchScore,
    breakdown,
    matchDetails,
  };
}

export function matchLeadsToIcp(
  leads: GovernmentLead[],
  icp: IcpProfile
): IcpMatchResult[] {
  return leads
    .map(lead => calculateIcpMatchScore(lead, icp))
    .sort((a, b) => b.matchScore - a.matchScore);
}

export function findBestIcpForLead(
  lead: GovernmentLead,
  icpProfiles: IcpProfile[]
): { icpId: number; icpName: string; matchScore: number } | null {
  if (icpProfiles.length === 0) return null;
  
  const activeProfiles = icpProfiles.filter(p => p.isActive);
  if (activeProfiles.length === 0) return null;
  
  const matches = activeProfiles.map(icp => ({
    icpId: icp.id,
    icpName: icp.displayName,
    matchScore: calculateIcpMatchScore(lead, icp).matchScore,
  }));
  
  return matches.sort((a, b) => b.matchScore - a.matchScore)[0];
}
