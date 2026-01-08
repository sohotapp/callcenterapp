import Anthropic from "@anthropic-ai/sdk";
import type { GovernmentLead, SynthesizedContext } from "../../shared/schema";

// Anti-slop banned phrases - these make messages feel generic and salesy
const BANNED_PHRASES = [
  "i hope this finds you well",
  "hope this email finds you",
  "i came across your profile",
  "i came across your company",
  "reaching out to you",
  "just reaching out",
  "wanted to reach out",
  "touch base",
  "circle back",
  "pick your brain",
  "leverage",
  "synergy",
  "synergies",
  "low-hanging fruit",
  "move the needle",
  "thought leader",
  "disruptive",
  "game-changer",
  "best-in-class",
  "world-class",
  "cutting-edge",
  "state-of-the-art",
  "next-generation",
  "revolutionary",
  "transform your business",
  "take your business to the next level",
  "i'd love to chat",
  "would love to chat",
  "would love to connect",
  "i'd love to connect",
  "grab a coffee",
  "pick your brain",
  "quick question",
  "just checking in",
  "following up",
  "per my last email",
  "as per our conversation",
  "congratulations on the funding",
  "congratulations on your recent",
  "i noticed you",
  "i saw that you",
];

// Weak opening patterns that should be avoided
const WEAK_OPENERS = [
  /^(hi|hello|hey|dear)\s+(there|team|sir|madam)/i,
  /^my name is/i,
  /^i am (a|the|an)/i,
  /^i work (at|for|with)/i,
  /^we are a/i,
  /^our company/i,
];

// Vague call-to-action patterns
const VAGUE_CTAS = [
  "let me know if you're interested",
  "let me know what you think",
  "would love to hear your thoughts",
  "feel free to reach out",
  "don't hesitate to contact",
  "i'm happy to discuss",
  "let's find a time",
  "when works for you",
];

export interface MessageGenerationRequest {
  lead: GovernmentLead;
  messageType: "cold_email" | "linkedin" | "follow_up_email";
  synthesis?: SynthesizedContext | null;
  customContext?: string;
}

export interface GeneratedMessage {
  subject?: string; // For emails
  body: string;
  slopScore: number; // 0-100, lower is better (less slop)
  slopIssues: string[];
  suggestedImprovements: string[];
  hookUsed: string | null;
  signalReferenced: string | null;
}

export interface MessageConstraints {
  maxSentences: number;
  requireSpecificOpener: boolean;
  requireClearAsk: boolean;
  bannedPhrases: string[];
}

const DEFAULT_CONSTRAINTS: Record<string, MessageConstraints> = {
  cold_email: {
    maxSentences: 4,
    requireSpecificOpener: true,
    requireClearAsk: true,
    bannedPhrases: BANNED_PHRASES,
  },
  linkedin: {
    maxSentences: 3,
    requireSpecificOpener: true,
    requireClearAsk: true,
    bannedPhrases: BANNED_PHRASES,
  },
  follow_up_email: {
    maxSentences: 3,
    requireSpecificOpener: false,
    requireClearAsk: true,
    bannedPhrases: BANNED_PHRASES,
  },
};

/**
 * Analyze a message for slop and return a score + issues
 */
export function analyzeMessageForSlop(message: string): {
  score: number;
  issues: string[];
  improvements: string[];
} {
  const issues: string[] = [];
  const improvements: string[] = [];
  const lowerMessage = message.toLowerCase();
  let slopPoints = 0;

  // Check for banned phrases
  for (const phrase of BANNED_PHRASES) {
    if (lowerMessage.includes(phrase)) {
      issues.push(`Contains banned phrase: "${phrase}"`);
      slopPoints += 15;
    }
  }

  // Check for weak openers
  const firstLine = message.split(/[.!?\n]/)[0] || "";
  for (const pattern of WEAK_OPENERS) {
    if (pattern.test(firstLine)) {
      issues.push("Opens with a weak/generic pattern");
      improvements.push("Start with something specific about them or their situation");
      slopPoints += 20;
      break;
    }
  }

  // Check for vague CTAs
  for (const cta of VAGUE_CTAS) {
    if (lowerMessage.includes(cta)) {
      issues.push(`Vague call-to-action: "${cta}"`);
      improvements.push("Use a specific ask with a clear next step");
      slopPoints += 10;
    }
  }

  // Check sentence count (rough estimate)
  const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 5) {
    issues.push(`Too long: ${sentences.length} sentences (recommend max 4)`);
    improvements.push("Cut to 4 sentences or fewer");
    slopPoints += 10;
  }

  // Check for specificity in opener
  const hasSpecificReference = /\b(your|you're|you've)\s+(post|article|comment|tweet|work|project|team|department|recent|latest)/i.test(firstLine)
    || /\b(noticed|saw|read|heard)\s+that\s+you/i.test(firstLine)
    || /\b(regarding|about|concerning)\s+your/i.test(firstLine)
    || /\b(after|following)\s+(seeing|reading|hearing)/i.test(firstLine);

  if (!hasSpecificReference && !lowerMessage.includes("following up")) {
    issues.push("Opener lacks specific reference to their work/situation");
    improvements.push("Reference a specific signal, quote, or data point about them");
    slopPoints += 15;
  }

  // Check for excessive exclamation marks
  const exclamationCount = (message.match(/!/g) || []).length;
  if (exclamationCount > 1) {
    issues.push(`Too many exclamation marks (${exclamationCount})`);
    improvements.push("Use at most one exclamation mark");
    slopPoints += 5;
  }

  // Check for all caps words (excluding acronyms)
  const allCapsWords = message.match(/\b[A-Z]{4,}\b/g)?.filter(w => !["RLTX", "CRM", "ROI", "API", "SaaS", "CEO", "CTO", "CFO", "CIO"].includes(w));
  if (allCapsWords && allCapsWords.length > 0) {
    issues.push("Contains ALL CAPS words (feels like shouting)");
    slopPoints += 5;
  }

  // Normalize score to 0-100
  const score = Math.min(100, slopPoints);

  return { score, issues, improvements };
}

/**
 * Generate a message using Claude with anti-slop constraints
 */
export async function generateMessage(
  request: MessageGenerationRequest
): Promise<GeneratedMessage> {
  const { lead, messageType, synthesis, customContext } = request;
  const constraints = DEFAULT_CONSTRAINTS[messageType];

  // Build context for Claude
  const leadContext = buildLeadContext(lead, synthesis);
  const prompt = buildGenerationPrompt(messageType, leadContext, constraints, customContext);

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the response
    const parsed = parseGeneratedMessage(text, messageType);

    // Analyze for slop
    const analysis = analyzeMessageForSlop(parsed.body);

    return {
      subject: parsed.subject,
      body: parsed.body,
      slopScore: analysis.score,
      slopIssues: analysis.issues,
      suggestedImprovements: analysis.improvements,
      hookUsed: parsed.hookUsed,
      signalReferenced: parsed.signalReferenced,
    };
  } catch (error) {
    console.error("Message generation failed:", error);
    throw new Error("Failed to generate message");
  }
}

function buildLeadContext(lead: GovernmentLead, synthesis?: SynthesizedContext | null): string {
  const parts: string[] = [];

  parts.push(`Organization: ${lead.institutionName}`);
  parts.push(`Type: ${lead.institutionType}`);
  parts.push(`Location: ${lead.city || ""}, ${lead.county || ""} County, ${lead.state}`);

  if (lead.department) {
    parts.push(`Department: ${lead.department}`);
  }

  if (lead.population) {
    parts.push(`Population served: ${lead.population.toLocaleString()}`);
  }

  if (lead.painPoints && lead.painPoints.length > 0) {
    parts.push(`Known pain points: ${lead.painPoints.join(", ")}`);
  }

  if (lead.techStack && lead.techStack.length > 0) {
    parts.push(`Tech stack: ${lead.techStack.join(", ")}`);
  }

  if (lead.buyingSignals && lead.buyingSignals.length > 0) {
    parts.push(`Buying signals: ${lead.buyingSignals.join(", ")}`);
  }

  if (synthesis) {
    if (synthesis.whyReachOutNow) {
      parts.push(`Why reach out now: ${synthesis.whyReachOutNow}`);
    }
    if (synthesis.personalizationHooks && synthesis.personalizationHooks.length > 0) {
      parts.push(`Personalization hooks: ${synthesis.personalizationHooks.join("; ")}`);
    }
    if (synthesis.recommendedAngle) {
      parts.push(`Recommended angle: ${synthesis.recommendedAngle}`);
    }
    if (synthesis.doNotMention && synthesis.doNotMention.length > 0) {
      parts.push(`DO NOT MENTION: ${synthesis.doNotMention.join(", ")}`);
    }
  }

  if (lead.intentSignals && lead.intentSignals.length > 0) {
    const recentSignals = lead.intentSignals.slice(0, 3);
    parts.push(`Recent signals:`);
    for (const signal of recentSignals) {
      parts.push(`  - [${signal.signalType}] ${signal.signalContent.slice(0, 100)}...`);
    }
  }

  return parts.join("\n");
}

function buildGenerationPrompt(
  messageType: string,
  leadContext: string,
  constraints: MessageConstraints,
  customContext?: string
): string {
  const typeInstructions: Record<string, string> = {
    cold_email: `Write a cold email. Include a subject line.`,
    linkedin: `Write a LinkedIn connection request message. No subject needed. Keep it under 300 characters.`,
    follow_up_email: `Write a follow-up email. Include a subject line. Reference the previous outreach.`,
  };

  return `You are writing outreach for RLTX.ai, an AI-native lead generation platform.

LEAD CONTEXT:
${leadContext}

${customContext ? `ADDITIONAL CONTEXT: ${customContext}\n` : ""}

TASK: ${typeInstructions[messageType]}

HARD CONSTRAINTS (MUST FOLLOW):
1. Maximum ${constraints.maxSentences} sentences in the body
2. ${constraints.requireSpecificOpener ? "First sentence MUST reference something specific about them (a signal, quote, or data point)" : ""}
3. ${constraints.requireClearAsk ? "End with a specific, clear ask (not 'let me know if interested')" : ""}
4. NEVER use these phrases: ${constraints.bannedPhrases.slice(0, 10).join(", ")}...
5. Write like you would speak - if it sounds weird to say out loud, rewrite it
6. One insight per message - save others for follow-ups
7. No generic company compliments
8. Be direct and specific, not vague and salesy

OUTPUT FORMAT:
${messageType.includes("email") ? "SUBJECT: [subject line]\n" : ""}BODY:
[message body]

HOOK_USED: [which personalization hook you used, or "none"]
SIGNAL_REFERENCED: [which specific signal you referenced, or "none"]`;
}

function parseGeneratedMessage(
  text: string,
  messageType: string
): { subject?: string; body: string; hookUsed: string | null; signalReferenced: string | null } {
  const lines = text.trim().split("\n");
  let subject: string | undefined;
  let body = "";
  let hookUsed: string | null = null;
  let signalReferenced: string | null = null;
  let inBody = false;

  for (const line of lines) {
    if (line.startsWith("SUBJECT:")) {
      subject = line.replace("SUBJECT:", "").trim();
    } else if (line.startsWith("BODY:")) {
      inBody = true;
    } else if (line.startsWith("HOOK_USED:")) {
      const hook = line.replace("HOOK_USED:", "").trim();
      hookUsed = hook.toLowerCase() === "none" ? null : hook;
      inBody = false;
    } else if (line.startsWith("SIGNAL_REFERENCED:")) {
      const signal = line.replace("SIGNAL_REFERENCED:", "").trim();
      signalReferenced = signal.toLowerCase() === "none" ? null : signal;
      inBody = false;
    } else if (inBody) {
      body += (body ? "\n" : "") + line;
    }
  }

  // Fallback: if parsing failed, use the whole text as body
  if (!body.trim()) {
    body = text.replace(/SUBJECT:.*\n?/i, "").replace(/HOOK_USED:.*\n?/i, "").replace(/SIGNAL_REFERENCED:.*\n?/i, "").trim();
  }

  return { subject, body: body.trim(), hookUsed, signalReferenced };
}

/**
 * Regenerate a message with user feedback
 */
export async function regenerateMessage(
  request: MessageGenerationRequest,
  feedback: string
): Promise<GeneratedMessage> {
  const { lead, messageType, synthesis, customContext } = request;
  const constraints = DEFAULT_CONSTRAINTS[messageType];
  const leadContext = buildLeadContext(lead, synthesis);

  const prompt = `You are writing outreach for RLTX.ai.

LEAD CONTEXT:
${leadContext}

${customContext ? `ADDITIONAL CONTEXT: ${customContext}\n` : ""}

USER FEEDBACK ON PREVIOUS VERSION:
${feedback}

TASK: Regenerate the ${messageType.replace("_", " ")} incorporating this feedback.

CONSTRAINTS:
1. Maximum ${constraints.maxSentences} sentences
2. First sentence must be specific to them
3. Clear call-to-action
4. No generic phrases
5. Sound natural when spoken aloud

OUTPUT FORMAT:
${messageType.includes("email") ? "SUBJECT: [subject line]\n" : ""}BODY:
[message body]

HOOK_USED: [which personalization hook you used, or "none"]
SIGNAL_REFERENCED: [which specific signal you referenced, or "none"]`;

  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = parseGeneratedMessage(text, messageType);
    const analysis = analyzeMessageForSlop(parsed.body);

    return {
      subject: parsed.subject,
      body: parsed.body,
      slopScore: analysis.score,
      slopIssues: analysis.issues,
      suggestedImprovements: analysis.improvements,
      hookUsed: parsed.hookUsed,
      signalReferenced: parsed.signalReferenced,
    };
  } catch (error) {
    console.error("Message regeneration failed:", error);
    throw new Error("Failed to regenerate message");
  }
}
