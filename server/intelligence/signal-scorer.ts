import { type IntentSignal } from "@shared/schema";

// Signal type weights - Reddit signals are highest value
const SIGNAL_TYPE_WEIGHTS: Record<string, number> = {
  reddit_post: 10,     // Direct intent expression
  g2_review: 9,        // Active evaluation
  job_posting: 7,      // Growth/change signal
  news: 6,             // Company event
  tech_change: 5,      // Technical indicator
};

// Relevance multipliers
const RELEVANCE_MULTIPLIERS: Record<string, number> = {
  direct: 1.5,      // Directly mentions our category/competitors
  adjacent: 1.0,    // Related problem area
  weak: 0.5,        // Tangentially related
};

// Recency scoring brackets
function getRecencyMultiplier(signalDate: Date): number {
  const now = new Date();
  const daysOld = Math.floor((now.getTime() - signalDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOld <= 1) return 2.0;     // Same day/yesterday - HOT
  if (daysOld <= 3) return 1.8;     // Last 3 days - very fresh
  if (daysOld <= 7) return 1.5;     // Last week - fresh
  if (daysOld <= 14) return 1.2;    // Last 2 weeks - warm
  if (daysOld <= 30) return 1.0;    // Last month - standard
  if (daysOld <= 60) return 0.7;    // 1-2 months - cooling
  return 0.5;                        // Older - cold
}

// Hot signal patterns - these indicate immediate buying intent
const HOT_PATTERNS = [
  /looking for (recommendations|alternatives|suggestions)/i,
  /frustrated with/i,
  /\balternatives?\b.*\?/i,
  /anyone (using|tried|recommend)/i,
  /hate (my|our|this) current/i,
  /switching from/i,
  /evaluating (options|tools|vendors)/i,
  /budget (approved|allocated)/i,
  /starting (a|the) search/i,
  /RFP/i,
  /vendor (selection|evaluation)/i,
];

// Check if signal content matches hot patterns
function isHotSignal(content: string): boolean {
  return HOT_PATTERNS.some((pattern) => pattern.test(content));
}

// Score a single signal
export function scoreSignal(signal: IntentSignal): number {
  const baseWeight = SIGNAL_TYPE_WEIGHTS[signal.signalType] || 5;
  const relevanceMultiplier = RELEVANCE_MULTIPLIERS[signal.relevanceToUs] || 1;
  const recencyMultiplier = getRecencyMultiplier(new Date(signal.signalDate));

  // Hot signal bonus
  const hotBonus = isHotSignal(signal.signalContent) ? 1.5 : 1.0;

  // Use signal's own strength rating (1-10)
  const strengthFactor = signal.signalStrength / 10;

  const score = baseWeight * relevanceMultiplier * recencyMultiplier * hotBonus * strengthFactor;
  return Math.round(score * 10) / 10; // Round to 1 decimal
}

// Calculate composite outreach score from all signals
export function calculateCompositeScore(signals: IntentSignal[]): {
  score: number;
  classification: "hot" | "warm" | "nurture";
  topSignals: Array<{ signal: IntentSignal; score: number }>;
  reasoning: string;
} {
  if (!signals || signals.length === 0) {
    return {
      score: 1,
      classification: "nurture",
      topSignals: [],
      reasoning: "No intent signals detected",
    };
  }

  // Score each signal
  const scoredSignals = signals.map((signal) => ({
    signal,
    score: scoreSignal(signal),
  })).sort((a, b) => b.score - a.score);

  // Top signals contribute most to score
  const topSignals = scoredSignals.slice(0, 3);

  // Calculate weighted composite (diminishing returns on additional signals)
  let totalScore = 0;
  scoredSignals.forEach((s, i) => {
    const positionWeight = 1 / (i + 1); // First signal full weight, diminishing after
    totalScore += s.score * positionWeight;
  });

  // Normalize to 1-10 scale
  const normalizedScore = Math.min(10, Math.max(1, Math.round(totalScore / 3)));

  // Classify based on score
  let classification: "hot" | "warm" | "nurture";
  if (normalizedScore >= 8) {
    classification = "hot";
  } else if (normalizedScore >= 5) {
    classification = "warm";
  } else {
    classification = "nurture";
  }

  // Generate reasoning
  const topSignal = topSignals[0]?.signal;
  let reasoning = "";
  if (classification === "hot") {
    reasoning = `High-priority: ${topSignal?.signalType.replace("_", " ")} detected within last 7 days with direct relevance`;
  } else if (classification === "warm") {
    reasoning = `Good timing: ${topSignal?.signalType.replace("_", " ")} indicates potential interest`;
  } else {
    reasoning = signals.length > 0
      ? `Monitoring: Signals are weak or outdated`
      : `No actionable signals yet`;
  }

  return {
    score: normalizedScore,
    classification,
    topSignals,
    reasoning,
  };
}

// Batch score leads
export function scoreLeadsSignals(
  leads: Array<{ id: number; intentSignals: IntentSignal[] | null }>
): Map<number, { score: number; classification: string }> {
  const results = new Map();

  for (const lead of leads) {
    const { score, classification } = calculateCompositeScore(lead.intentSignals || []);
    results.set(lead.id, { score, classification });
  }

  return results;
}

// Get signal urgency classification
export function getSignalUrgency(signals: IntentSignal[]): {
  urgency: "critical" | "high" | "medium" | "low";
  action: string;
  deadline: string;
} {
  const { score, classification, topSignals } = calculateCompositeScore(signals);

  // Check for critical patterns
  const hasCriticalSignal = topSignals.some((s) =>
    isHotSignal(s.signal.signalContent) &&
    getRecencyMultiplier(new Date(s.signal.signalDate)) >= 1.5
  );

  if (hasCriticalSignal || score >= 9) {
    return {
      urgency: "critical",
      action: "Call within 24 hours",
      deadline: "Tomorrow",
    };
  }

  if (classification === "hot" || score >= 7) {
    return {
      urgency: "high",
      action: "Call within 48 hours, email immediately",
      deadline: "2 days",
    };
  }

  if (classification === "warm" || score >= 4) {
    return {
      urgency: "medium",
      action: "Email this week, call next week",
      deadline: "1 week",
    };
  }

  return {
    urgency: "low",
    action: "Add to nurture sequence",
    deadline: "Monitor for new signals",
  };
}
