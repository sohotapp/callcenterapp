import Anthropic from "@anthropic-ai/sdk";
import { storage } from "../storage";
import {
  type GovernmentLead,
  type IntentSignal,
  type SynthesizedContext,
  type CompanyContext,
  type PersonContext,
} from "@shared/schema";

const anthropic = new Anthropic();

// Anti-slop banned phrases that should never appear in generated content
const BANNED_PHRASES = [
  "i hope this finds you well",
  "i hope this email finds you",
  "i came across your profile",
  "reaching out",
  "touch base",
  "pick your brain",
  "leverage",
  "synergy",
  "circle back",
  "at the end of the day",
  "low-hanging fruit",
  "move the needle",
  "deep dive",
  "drill down",
  "bandwidth",
  "ping you",
  "loop you in",
];

// Check if text contains any banned phrases
function containsBannedPhrases(text: string): string[] {
  const lowerText = text.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lowerText.includes(phrase));
}

// The core synthesis prompt with anti-slop constraints
const SYNTHESIS_PROMPT = `You are an elite B2B sales intelligence analyst. Your job is to synthesize raw data about a prospect into actionable outreach intelligence.

CRITICAL ANTI-SLOP RULES:
1. NEVER use generic opener phrases like "I hope this finds you well", "reaching out", "touch base"
2. NEVER use corporate buzzwords like "leverage", "synergy", "circle back"
3. Every insight must be SPECIFIC and reference actual data
4. If you can't find a genuine reason to reach out NOW, say "NOT READY"
5. First line of any recommended opener MUST reference something specific (a post, quote, data point)

LEAD DATA:
{leadData}

COMPANY CONTEXT:
{companyContext}

PERSON CONTEXT:
{personContext}

INTENT SIGNALS:
{intentSignals}

YOUR TASK:
Analyze this data and generate:

1. WHY REACH OUT NOW (1-2 sentences)
   - What specific trigger makes this the RIGHT moment?
   - If there's no clear trigger, output "NOT READY: [what signal we'd need]"

2. PERSONALIZATION HOOKS (top 3)
   - Each must reference specific data from the signals
   - Format: "[hook description] - SOURCE: [where this came from]"

3. RECOMMENDED ANGLE
   - What approach best fits their situation?
   - Based on signals, not assumptions

4. PREDICTED OBJECTIONS (top 2-3)
   - What they're likely to say
   - Counter for each objection

5. DO NOT MENTION (warning list)
   - Things that would be creepy to mention
   - Things that would be forced or irrelevant
   - Things they might be sensitive about

6. OUTREACH SCORE (1-10)
   - 1-3: Not ready, need more signals
   - 4-6: Could reach out, but weak timing
   - 7-8: Good signals, clear reason
   - 9-10: Urgent/hot, reach out immediately
   - Include 1-sentence reasoning

Respond in JSON format matching this structure:
{
  "whyReachOutNow": "string or NOT READY: [reason]",
  "personalizationHooks": ["hook1 - SOURCE: x", "hook2 - SOURCE: y", "hook3 - SOURCE: z"],
  "recommendedAngle": "string",
  "predictedObjections": ["objection1", "objection2"],
  "counterToObjections": {"objection1": "counter1", "objection2": "counter2"},
  "doNotMention": ["thing1", "thing2"],
  "outreachScore": number,
  "scoreReasoning": "string"
}`;

// Synthesize intelligence for a single lead
export async function synthesizeLead(leadId: number): Promise<SynthesizedContext | null> {
  const lead = await storage.getLead(leadId);
  if (!lead) {
    console.error(`Lead ${leadId} not found`);
    return null;
  }

  // Prepare data for synthesis
  const leadData = {
    institutionName: lead.institutionName,
    institutionType: lead.institutionType,
    department: lead.department,
    state: lead.state,
    email: lead.email,
    decisionMakers: lead.decisionMakers || [],
    techStack: lead.techStack || [],
    buyingSignals: lead.buyingSignals || [],
    recentNews: lead.recentNews || [],
    status: lead.status,
  };

  const companyContext = lead.companyContext || {};
  const personContext = lead.personContext || {};
  const intentSignals = lead.intentSignals || [];

  // Skip if no signals to synthesize
  if (intentSignals.length === 0 && !lead.recentNews?.length && !lead.buyingSignals?.length) {
    return {
      whyReachOutNow: "NOT READY: No intent signals detected. Need Reddit posts, job postings, or news events.",
      personalizationHooks: [],
      recommendedAngle: null,
      predictedObjections: [],
      counterToObjections: {},
      doNotMention: [],
      outreachScore: 2,
      scoreReasoning: "Insufficient signals for personalized outreach",
    };
  }

  // Build the prompt
  const prompt = SYNTHESIS_PROMPT
    .replace("{leadData}", JSON.stringify(leadData, null, 2))
    .replace("{companyContext}", JSON.stringify(companyContext, null, 2))
    .replace("{personContext}", JSON.stringify(personContext, null, 2))
    .replace("{intentSignals}", JSON.stringify(intentSignals, null, 2));

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    // Parse the JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const synthesis: SynthesizedContext = JSON.parse(jsonMatch[0]);

    // Validate against anti-slop rules
    const allText = [
      synthesis.whyReachOutNow || "",
      ...(synthesis.personalizationHooks || []),
      synthesis.recommendedAngle || "",
    ].join(" ");

    const bannedFound = containsBannedPhrases(allText);
    if (bannedFound.length > 0) {
      console.warn(`Anti-slop violation detected in lead ${leadId}: ${bannedFound.join(", ")}`);
      // Regenerate with stronger constraints (in production, you'd retry)
    }

    // Update the lead with synthesized context
    await storage.updateLead(leadId, {
      synthesizedContext: synthesis,
      outreachScore: synthesis.outreachScore,
      lastSignalDate: intentSignals.length > 0
        ? new Date(intentSignals[0].signalDate)
        : undefined,
    } as any);

    return synthesis;
  } catch (error) {
    console.error(`Error synthesizing lead ${leadId}:`, error);
    return null;
  }
}

// Batch synthesize multiple leads
export async function synthesizeLeadsBatch(
  leadIds: number[],
  options: { maxConcurrent?: number } = {}
): Promise<Map<number, SynthesizedContext | null>> {
  const { maxConcurrent = 3 } = options;
  const results = new Map<number, SynthesizedContext | null>();

  // Process in batches to avoid rate limits
  for (let i = 0; i < leadIds.length; i += maxConcurrent) {
    const batch = leadIds.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async (id) => {
        const result = await synthesizeLead(id);
        return { id, result };
      })
    );

    for (const { id, result } of batchResults) {
      results.set(id, result);
    }

    // Small delay between batches
    if (i + maxConcurrent < leadIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

// Get leads ready for outreach (score >= threshold)
export async function getOutreachReadyLeads(
  minScore: number = 6
): Promise<GovernmentLead[]> {
  const allLeads = await storage.getAllLeads();
  return allLeads
    .filter((lead) => (lead.outreachScore ?? 0) >= minScore)
    .sort((a, b) => (b.outreachScore ?? 0) - (a.outreachScore ?? 0));
}

// Signal scoring weights
const SIGNAL_WEIGHTS = {
  reddit_post: 10,
  job_posting: 7,
  g2_review: 8,
  news: 6,
  tech_change: 5,
};

const RELEVANCE_MULTIPLIERS = {
  direct: 1.5,
  adjacent: 1.0,
  weak: 0.5,
};

// Calculate outreach score from signals
export function calculateOutreachScore(signals: IntentSignal[]): number {
  if (!signals || signals.length === 0) return 1;

  let totalScore = 0;
  const now = new Date();

  for (const signal of signals) {
    const baseWeight = SIGNAL_WEIGHTS[signal.signalType] || 5;
    const relevanceMultiplier = RELEVANCE_MULTIPLIERS[signal.relevanceToUs] || 1;

    // Recency decay: signals older than 30 days get reduced score
    const signalDate = new Date(signal.signalDate);
    const daysOld = Math.floor((now.getTime() - signalDate.getTime()) / (1000 * 60 * 60 * 24));
    const recencyMultiplier = daysOld < 7 ? 1.5 : daysOld < 14 ? 1.2 : daysOld < 30 ? 1.0 : 0.7;

    const signalScore = signal.signalStrength * baseWeight * relevanceMultiplier * recencyMultiplier;
    totalScore += signalScore;
  }

  // Normalize to 1-10 scale
  const normalizedScore = Math.min(10, Math.max(1, Math.round(totalScore / 20)));
  return normalizedScore;
}
