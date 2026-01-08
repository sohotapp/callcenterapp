import { storage } from "./storage";
import type { GovernmentLead, CompanyProfile } from "@shared/schema";

export interface PredictiveScore {
  leadId: number;
  predictedConversionProbability: number; // 0-100
  confidenceLevel: "high" | "medium" | "low";
  scoreFactors: ScoreFactor[];
  recommendedAction: string;
  nextBestAction: string;
  predictedValue: "high" | "medium" | "low";
}

export interface ScoreFactor {
  name: string;
  impact: number; // -100 to 100
  description: string;
  category: "engagement" | "fit" | "timing" | "data_quality";
}

export interface ScoringModel {
  version: string;
  trainedAt: Date;
  weights: ScoringWeights;
  baselineConversionRate: number;
}

interface ScoringWeights {
  // Engagement signals
  hasDecisionMaker: number;
  hasEmail: number;
  hasPhone: number;
  hasWebsite: number;
  contactedRecently: number;
  multipleContacts: number;

  // Fit signals
  populationTier: Record<string, number>;
  techMaturitySweet: number; // Sweet spot for tech maturity
  hasPainPoints: number;
  painPointCount: number;
  hasBuyingSignals: number;
  buyingSignalCount: number;

  // Timing signals
  recentNews: number;
  budgetCycleAlignment: number;
  competitorPresence: number;

  // Data quality
  enrichmentScore: number;
  dataCompleteness: number;
}

// Default weights based on B2G sales patterns
const DEFAULT_WEIGHTS: ScoringWeights = {
  // Engagement signals (higher = better)
  hasDecisionMaker: 15,
  hasEmail: 10,
  hasPhone: 8,
  hasWebsite: 5,
  contactedRecently: -5, // Already contacted = less urgent
  multipleContacts: 12,

  // Fit signals
  populationTier: {
    large: 20, // >500k
    medium: 15, // 100k-500k
    small: 10, // 50k-100k
    verySmall: 5, // <50k
  },
  techMaturitySweet: 12, // 4-6 is sweet spot (needs help but not hopeless)
  hasPainPoints: 10,
  painPointCount: 3, // Per pain point
  hasBuyingSignals: 15,
  buyingSignalCount: 5, // Per buying signal

  // Timing signals
  recentNews: 8,
  budgetCycleAlignment: 10,
  competitorPresence: 5, // If they have competitors, they have budget

  // Data quality
  enrichmentScore: 0.2, // Multiply by enrichment score
  dataCompleteness: 10,
};

// Calculate predictive score for a single lead
export function calculatePredictiveScore(
  lead: GovernmentLead,
  companyProfile: CompanyProfile | null,
  allLeads: GovernmentLead[]
): PredictiveScore {
  const factors: ScoreFactor[] = [];
  let totalScore = 30; // Base score
  const weights = DEFAULT_WEIGHTS;

  // === ENGAGEMENT SIGNALS ===

  // Decision maker presence
  if (lead.decisionMakers && lead.decisionMakers.length > 0) {
    const impact = weights.hasDecisionMaker;
    totalScore += impact;
    factors.push({
      name: "Decision Maker Identified",
      impact,
      description: `${lead.decisionMakers.length} decision maker(s) known`,
      category: "engagement",
    });

    // Multiple contacts bonus
    if (lead.decisionMakers.length > 1) {
      const multiBonus = Math.min(weights.multipleContacts, lead.decisionMakers.length * 4);
      totalScore += multiBonus;
      factors.push({
        name: "Multiple Contacts",
        impact: multiBonus,
        description: `${lead.decisionMakers.length} contacts provide multiple entry points`,
        category: "engagement",
      });
    }
  } else {
    factors.push({
      name: "No Decision Maker",
      impact: -10,
      description: "Decision maker not yet identified",
      category: "engagement",
    });
    totalScore -= 10;
  }

  // Contact info
  if (lead.email) {
    totalScore += weights.hasEmail;
    factors.push({
      name: "Email Available",
      impact: weights.hasEmail,
      description: "Direct email contact available",
      category: "engagement",
    });
  }

  if (lead.phoneNumber) {
    totalScore += weights.hasPhone;
    factors.push({
      name: "Phone Available",
      impact: weights.hasPhone,
      description: "Direct phone contact available",
      category: "engagement",
    });
  }

  // Already contacted (might be positive or negative depending on outcome)
  if (lead.lastContactedAt) {
    const daysSinceContact = Math.floor(
      (Date.now() - new Date(lead.lastContactedAt).getTime()) / (24 * 60 * 60 * 1000)
    );

    if (lead.lastCallOutcome === "interested" || lead.lastCallOutcome === "callback_scheduled") {
      totalScore += 20;
      factors.push({
        name: "Positive Prior Contact",
        impact: 20,
        description: `Showed interest ${daysSinceContact} days ago`,
        category: "engagement",
      });
    } else if (lead.lastCallOutcome === "not_interested") {
      totalScore -= 25;
      factors.push({
        name: "Previously Not Interested",
        impact: -25,
        description: "Previously expressed disinterest",
        category: "engagement",
      });
    } else if (daysSinceContact < 7) {
      totalScore += weights.contactedRecently;
      factors.push({
        name: "Recently Contacted",
        impact: weights.contactedRecently,
        description: "Already contacted this week",
        category: "engagement",
      });
    }
  }

  // === FIT SIGNALS ===

  // Population tier
  if (lead.population) {
    let popTier: string;
    let popImpact: number;
    if (lead.population > 500000) {
      popTier = "large";
      popImpact = weights.populationTier.large;
    } else if (lead.population > 100000) {
      popTier = "medium";
      popImpact = weights.populationTier.medium;
    } else if (lead.population > 50000) {
      popTier = "small";
      popImpact = weights.populationTier.small;
    } else {
      popTier = "verySmall";
      popImpact = weights.populationTier.verySmall;
    }
    totalScore += popImpact;
    factors.push({
      name: "Population Size",
      impact: popImpact,
      description: `${popTier} population (${lead.population.toLocaleString()})`,
      category: "fit",
    });
  }

  // Tech maturity sweet spot (4-6 is ideal - needs help but has some infrastructure)
  if (lead.techMaturityScore) {
    if (lead.techMaturityScore >= 4 && lead.techMaturityScore <= 6) {
      totalScore += weights.techMaturitySweet;
      factors.push({
        name: "Tech Maturity Sweet Spot",
        impact: weights.techMaturitySweet,
        description: `Score ${lead.techMaturityScore}/10 - ready for modernization`,
        category: "fit",
      });
    } else if (lead.techMaturityScore < 4) {
      const impact = -5;
      totalScore += impact;
      factors.push({
        name: "Low Tech Maturity",
        impact,
        description: "May lack infrastructure for AI adoption",
        category: "fit",
      });
    } else {
      // High tech maturity - less need
      const impact = -3;
      totalScore += impact;
      factors.push({
        name: "High Tech Maturity",
        impact,
        description: "May already have solutions in place",
        category: "fit",
      });
    }
  }

  // Pain points
  if (lead.painPoints && lead.painPoints.length > 0) {
    totalScore += weights.hasPainPoints;
    const painImpact = Math.min(15, lead.painPoints.length * weights.painPointCount);
    totalScore += painImpact;
    factors.push({
      name: "Known Pain Points",
      impact: weights.hasPainPoints + painImpact,
      description: `${lead.painPoints.length} pain points identified`,
      category: "fit",
    });
  }

  // Buying signals
  if (lead.buyingSignals && lead.buyingSignals.length > 0) {
    totalScore += weights.hasBuyingSignals;
    const signalImpact = Math.min(15, lead.buyingSignals.length * weights.buyingSignalCount);
    totalScore += signalImpact;
    factors.push({
      name: "Buying Signals Detected",
      impact: weights.hasBuyingSignals + signalImpact,
      description: `${lead.buyingSignals.length} buying signals identified`,
      category: "timing",
    });
  }

  // === TIMING SIGNALS ===

  // Recent news
  if (lead.recentNews && lead.recentNews.length > 0) {
    totalScore += weights.recentNews;
    factors.push({
      name: "Recent News Activity",
      impact: weights.recentNews,
      description: `${lead.recentNews.length} recent news items`,
      category: "timing",
    });
  }

  // Competitor presence (indicates budget exists)
  if (lead.competitorAnalysis && lead.competitorAnalysis.length > 0) {
    totalScore += weights.competitorPresence;
    factors.push({
      name: "Competitor Presence",
      impact: weights.competitorPresence,
      description: "Has budget for technology solutions",
      category: "timing",
    });
  }

  // === DATA QUALITY ===

  // Enrichment score
  if (lead.enrichmentScore) {
    const enrichImpact = Math.round(lead.enrichmentScore * weights.enrichmentScore);
    totalScore += enrichImpact;
    factors.push({
      name: "Data Enrichment Quality",
      impact: enrichImpact,
      description: `Enrichment score: ${lead.enrichmentScore}/100`,
      category: "data_quality",
    });
  }

  // Data completeness
  const dataFields = [
    lead.email,
    lead.phoneNumber,
    lead.website,
    lead.population,
    lead.techMaturityScore,
    lead.painPoints?.length,
    lead.decisionMakers?.length,
  ];
  const completeness = dataFields.filter(Boolean).length / dataFields.length;
  if (completeness >= 0.7) {
    totalScore += weights.dataCompleteness;
    factors.push({
      name: "High Data Completeness",
      impact: weights.dataCompleteness,
      description: `${Math.round(completeness * 100)}% of key fields populated`,
      category: "data_quality",
    });
  }

  // Normalize score to 0-100
  totalScore = Math.max(0, Math.min(100, totalScore));

  // Determine confidence level
  const positiveFactors = factors.filter(f => f.impact > 0).length;
  const totalFactors = factors.length;
  let confidenceLevel: "high" | "medium" | "low";

  if (positiveFactors >= 5 && totalFactors >= 8) {
    confidenceLevel = "high";
  } else if (positiveFactors >= 3 && totalFactors >= 5) {
    confidenceLevel = "medium";
  } else {
    confidenceLevel = "low";
  }

  // Determine predicted value
  let predictedValue: "high" | "medium" | "low";
  if (lead.population && lead.population > 300000) {
    predictedValue = "high";
  } else if (lead.population && lead.population > 100000) {
    predictedValue = "medium";
  } else {
    predictedValue = "low";
  }

  // Generate recommended action
  let recommendedAction: string;
  let nextBestAction: string;

  if (totalScore >= 70) {
    recommendedAction = "High Priority: Call immediately";
    nextBestAction = "Send personalized intro email before call";
  } else if (totalScore >= 50) {
    recommendedAction = "Enrich data, then call";
    nextBestAction = "Run additional research on pain points";
  } else if (totalScore >= 30) {
    recommendedAction = "Queue for batch outreach";
    nextBestAction = "Add to email sequence";
  } else {
    recommendedAction = "Low priority: Review and potentially archive";
    nextBestAction = "Verify data accuracy";
  }

  return {
    leadId: lead.id,
    predictedConversionProbability: totalScore,
    confidenceLevel,
    scoreFactors: factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    recommendedAction,
    nextBestAction,
    predictedValue,
  };
}

// Score all leads and return sorted by predicted conversion
export async function scoreAllLeadsPredictive(): Promise<PredictiveScore[]> {
  const leads = await storage.getAllLeads();
  const companyProfile = await storage.getCompanyProfile();

  const scores = leads.map(lead =>
    calculatePredictiveScore(lead, companyProfile ?? null, leads)
  );

  // Sort by predicted conversion probability
  scores.sort((a, b) => b.predictedConversionProbability - a.predictedConversionProbability);

  return scores;
}

// Get top N leads by predictive score
export async function getTopPredictedLeads(limit: number = 10): Promise<PredictiveScore[]> {
  const scores = await scoreAllLeadsPredictive();
  return scores.slice(0, limit);
}

// Get leads grouped by recommended action
export async function getLeadsByAction(): Promise<Record<string, PredictiveScore[]>> {
  const scores = await scoreAllLeadsPredictive();

  const grouped: Record<string, PredictiveScore[]> = {
    "High Priority": [],
    "Enrich First": [],
    "Batch Outreach": [],
    "Low Priority": [],
  };

  for (const score of scores) {
    if (score.predictedConversionProbability >= 70) {
      grouped["High Priority"].push(score);
    } else if (score.predictedConversionProbability >= 50) {
      grouped["Enrich First"].push(score);
    } else if (score.predictedConversionProbability >= 30) {
      grouped["Batch Outreach"].push(score);
    } else {
      grouped["Low Priority"].push(score);
    }
  }

  return grouped;
}
