import type { GovernmentLead, CompanyProfile, ScoringBreakdown } from "@shared/schema";

interface ScoreResult {
  likelihoodScore: number;
  matchScore: number;
  urgencyScore: number;
  budgetFitScore: number;
  priorityScore: number;
  scoringBreakdown: ScoringBreakdown;
}

const RLTX_CAPABILITIES = [
  "ai development",
  "rag systems",
  "document processing",
  "automation",
  "legacy system integration",
  "data integration",
  "workflow automation",
  "citizen services",
  "digital transformation",
  "machine learning",
  "natural language processing",
  "chatbot",
  "intelligent search",
  "data analytics",
  "predictive analytics",
];

const RELEVANT_DEPARTMENTS = [
  "Information Technology",
  "County Administration",
  "Finance & Budget",
  "Public Works",
  "Planning & Development",
  "Social Services",
  "Public Health",
];

const URGENCY_KEYWORDS = {
  rfp: ["rfp", "request for proposal", "bid", "solicitation", "procurement", "contract"],
  budget: ["budget approved", "new fiscal year", "funding", "grant", "allocation"],
  complaints: ["outdated", "inefficient", "frustrated", "complaints", "delays", "backlog", "manual process"],
  hiring: ["hiring", "it director", "technology officer", "cio", "cto", "it manager"],
};

function parseBudget(budgetStr: string | null | undefined): number {
  if (!budgetStr) return 0;
  const cleanStr = budgetStr.toLowerCase().replace(/[^0-9.kmb]/g, "");
  let multiplier = 1;
  if (budgetStr.toLowerCase().includes("b")) multiplier = 1_000_000_000;
  else if (budgetStr.toLowerCase().includes("m")) multiplier = 1_000_000;
  else if (budgetStr.toLowerCase().includes("k")) multiplier = 1_000;
  const numMatch = cleanStr.match(/[\d.]+/);
  if (numMatch) {
    return parseFloat(numMatch[0]) * multiplier;
  }
  return 0;
}

function calculateLikelihoodScore(lead: GovernmentLead): {
  score: number;
  factors: ScoringBreakdown["likelihoodFactors"];
} {
  let painPointScore = 0;
  let buyingSignalScore = 0;
  let budgetScore = 0;
  let techMaturityScore = 0;
  let recentNewsScore = 0;

  if (lead.painPoints && lead.painPoints.length > 0) {
    painPointScore = Math.min(lead.painPoints.length * 5, 25);
  }

  if (lead.buyingSignals && lead.buyingSignals.length > 0) {
    buyingSignalScore = Math.min(lead.buyingSignals.length * 8, 25);
  }

  const budgetValue = parseBudget(lead.annualBudget);
  if (budgetValue > 50_000_000) budgetScore = 20;
  else if (budgetValue > 10_000_000) budgetScore = 15;
  else if (budgetValue > 1_000_000) budgetScore = 10;
  else if (budgetValue > 100_000) budgetScore = 5;

  if (lead.techMaturityScore) {
    techMaturityScore = Math.max(0, 15 - lead.techMaturityScore * 1.5);
  } else {
    techMaturityScore = 7;
  }

  if (lead.recentNews && lead.recentNews.length > 0) {
    recentNewsScore = Math.min(lead.recentNews.length * 5, 15);
  }

  const score = Math.min(100, Math.max(0, 
    painPointScore + buyingSignalScore + budgetScore + techMaturityScore + recentNewsScore + 10
  ));

  return {
    score,
    factors: {
      painPointScore,
      buyingSignalScore,
      budgetScore,
      techMaturityScore,
      recentNewsScore,
    },
  };
}

function calculateMatchScore(
  lead: GovernmentLead,
  companyProfile: CompanyProfile | null
): { score: number; factors: ScoringBreakdown["matchFactors"] } {
  let painPointMatchScore = 0;
  let departmentRelevanceScore = 0;
  let techStackCompatibilityScore = 0;
  let scaleAppropriatenessScore = 0;

  const capabilities = companyProfile?.capabilities || RLTX_CAPABILITIES;
  const services = companyProfile?.services || [];
  const allCapabilities = [...capabilities, ...services].map(c => c.toLowerCase());

  if (lead.painPoints && lead.painPoints.length > 0) {
    let matches = 0;
    for (const painPoint of lead.painPoints) {
      const painLower = painPoint.toLowerCase();
      for (const capability of allCapabilities) {
        if (painLower.includes(capability) || capability.includes(painLower.split(" ")[0])) {
          matches++;
          break;
        }
      }
      if (painLower.includes("legacy") || painLower.includes("manual") || 
          painLower.includes("integration") || painLower.includes("automation") ||
          painLower.includes("efficiency") || painLower.includes("data")) {
        matches++;
      }
    }
    painPointMatchScore = Math.min(matches * 8, 30);
  }

  if (lead.department) {
    const deptLower = lead.department.toLowerCase();
    if (RELEVANT_DEPARTMENTS.some(d => deptLower.includes(d.toLowerCase()))) {
      departmentRelevanceScore = 25;
    } else if (deptLower.includes("it") || deptLower.includes("technology") || 
               deptLower.includes("admin") || deptLower.includes("finance")) {
      departmentRelevanceScore = 20;
    } else {
      departmentRelevanceScore = 10;
    }
  } else {
    departmentRelevanceScore = 15;
  }

  if (lead.techStack && lead.techStack.length > 0) {
    const hasLegacy = lead.techStack.some(t => 
      t.toLowerCase().includes("legacy") || 
      t.toLowerCase().includes("oracle") ||
      t.toLowerCase().includes("mainframe") ||
      t.toLowerCase().includes("cobol")
    );
    const hasModern = lead.techStack.some(t => 
      t.toLowerCase().includes("cloud") || 
      t.toLowerCase().includes("api") ||
      t.toLowerCase().includes("python") ||
      t.toLowerCase().includes("aws") ||
      t.toLowerCase().includes("azure")
    );
    if (hasLegacy && hasModern) {
      techStackCompatibilityScore = 25;
    } else if (hasLegacy) {
      techStackCompatibilityScore = 20;
    } else if (hasModern) {
      techStackCompatibilityScore = 15;
    } else {
      techStackCompatibilityScore = 10;
    }
  } else {
    techStackCompatibilityScore = 12;
  }

  if (lead.population) {
    if (lead.population >= 100_000 && lead.population <= 2_000_000) {
      scaleAppropriatenessScore = 20;
    } else if (lead.population > 2_000_000) {
      scaleAppropriatenessScore = 15;
    } else if (lead.population >= 50_000) {
      scaleAppropriatenessScore = 15;
    } else {
      scaleAppropriatenessScore = 8;
    }
  } else {
    scaleAppropriatenessScore = 10;
  }

  const score = Math.min(100, Math.max(0,
    painPointMatchScore + departmentRelevanceScore + techStackCompatibilityScore + scaleAppropriatenessScore
  ));

  return {
    score,
    factors: {
      painPointMatchScore,
      departmentRelevanceScore,
      techStackCompatibilityScore,
      scaleAppropriatenessScore,
    },
  };
}

function calculateUrgencyScore(lead: GovernmentLead): {
  score: number;
  factors: ScoringBreakdown["urgencyFactors"];
} {
  let rfpMentionScore = 0;
  let budgetCycleScore = 0;
  let techComplaintScore = 0;
  let itHiringScore = 0;

  const allText: string[] = [];
  
  if (lead.recentNews) {
    lead.recentNews.forEach(news => {
      allText.push(news.title.toLowerCase());
      allText.push(news.summary.toLowerCase());
    });
  }
  
  if (lead.buyingSignals) {
    lead.buyingSignals.forEach(signal => allText.push(signal.toLowerCase()));
  }
  
  if (lead.painPoints) {
    lead.painPoints.forEach(pain => allText.push(pain.toLowerCase()));
  }

  const combinedText = allText.join(" ");

  for (const keyword of URGENCY_KEYWORDS.rfp) {
    if (combinedText.includes(keyword)) {
      rfpMentionScore = 30;
      break;
    }
  }

  for (const keyword of URGENCY_KEYWORDS.budget) {
    if (combinedText.includes(keyword)) {
      budgetCycleScore = 25;
      break;
    }
  }

  const now = new Date();
  const fiscalMonths = [7, 10, 1, 4];
  if (fiscalMonths.includes(now.getMonth() + 1)) {
    budgetCycleScore = Math.max(budgetCycleScore, 15);
  }

  for (const keyword of URGENCY_KEYWORDS.complaints) {
    if (combinedText.includes(keyword)) {
      techComplaintScore = 25;
      break;
    }
  }

  for (const keyword of URGENCY_KEYWORDS.hiring) {
    if (combinedText.includes(keyword)) {
      itHiringScore = 20;
      break;
    }
  }

  const score = Math.min(100, Math.max(0,
    rfpMentionScore + budgetCycleScore + techComplaintScore + itHiringScore
  ));

  return {
    score,
    factors: {
      rfpMentionScore,
      budgetCycleScore,
      techComplaintScore,
      itHiringScore,
    },
  };
}

function calculateBudgetFitScore(lead: GovernmentLead): number {
  const budgetValue = parseBudget(lead.annualBudget);
  
  if (budgetValue >= 500_000_000) return 100;
  if (budgetValue >= 100_000_000) return 90;
  if (budgetValue >= 50_000_000) return 80;
  if (budgetValue >= 10_000_000) return 70;
  if (budgetValue >= 5_000_000) return 60;
  if (budgetValue >= 1_000_000) return 50;
  if (budgetValue >= 500_000) return 40;
  if (budgetValue >= 100_000) return 30;
  if (budgetValue > 0) return 20;
  
  if (lead.population) {
    if (lead.population >= 500_000) return 70;
    if (lead.population >= 100_000) return 55;
    if (lead.population >= 50_000) return 45;
    return 35;
  }
  
  return 40;
}

function generateScoringNotes(
  lead: GovernmentLead,
  breakdown: ScoringBreakdown
): string[] {
  const notes: string[] = [];

  if (breakdown.likelihoodFactors.painPointScore > 15) {
    notes.push(`Strong pain point alignment with ${lead.painPoints?.length || 0} identified issues`);
  }
  
  if (breakdown.likelihoodFactors.buyingSignalScore > 15) {
    notes.push(`Multiple buying signals detected (${lead.buyingSignals?.length || 0} indicators)`);
  }
  
  if (breakdown.matchFactors.painPointMatchScore > 20) {
    notes.push("Pain points closely match rltx.ai capabilities");
  }
  
  if (breakdown.urgencyFactors.rfpMentionScore > 0) {
    notes.push("Active RFP or procurement activity detected");
  }
  
  if (breakdown.urgencyFactors.budgetCycleScore > 15) {
    notes.push("Favorable budget cycle timing");
  }
  
  if (breakdown.matchFactors.departmentRelevanceScore >= 25) {
    notes.push(`${lead.department} is a high-priority department for AI solutions`);
  }

  if (lead.techMaturityScore && lead.techMaturityScore <= 4) {
    notes.push("Low tech maturity suggests high modernization potential");
  }

  return notes;
}

export function calculateLeadScore(
  lead: GovernmentLead,
  companyProfile: CompanyProfile | null
): ScoreResult {
  const likelihood = calculateLikelihoodScore(lead);
  const match = calculateMatchScore(lead, companyProfile);
  const urgency = calculateUrgencyScore(lead);
  const budgetFitScore = calculateBudgetFitScore(lead);

  const priorityScore = Math.round(
    likelihood.score * 0.4 + match.score * 0.4 + urgency.score * 0.2
  );

  const scoringBreakdown: ScoringBreakdown = {
    likelihoodFactors: likelihood.factors,
    matchFactors: match.factors,
    urgencyFactors: urgency.factors,
  };

  scoringBreakdown.notes = generateScoringNotes(lead, scoringBreakdown);

  return {
    likelihoodScore: Math.round(likelihood.score),
    matchScore: Math.round(match.score),
    urgencyScore: Math.round(urgency.score),
    budgetFitScore: Math.round(budgetFitScore),
    priorityScore: Math.min(100, Math.max(0, priorityScore)),
    scoringBreakdown,
  };
}

export function scoreAllLeads(
  leads: GovernmentLead[],
  companyProfile: CompanyProfile | null
): Array<{ leadId: number; scores: ScoreResult }> {
  return leads.map(lead => ({
    leadId: lead.id,
    scores: calculateLeadScore(lead, companyProfile),
  }));
}
