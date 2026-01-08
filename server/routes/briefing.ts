import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { synthesizeLead } from "../intelligence/synthesis-engine";
import { getSignalUrgency, calculateCompositeScore } from "../intelligence/signal-scorer";
import type { GovernmentLead, IntentSignal, SynthesizedContext } from "@shared/schema";

const router = Router();

// Types for the call briefing
interface CallBriefing {
  leadId: number;
  institutionName: string;
  contactInfo: {
    department: string | null;
    state: string;
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  score: number;
  classification: "hot" | "warm" | "nurture";
  urgency: {
    level: string;
    action: string;
    deadline: string;
  };
  whyNow: string;
  openingLine: string;
  keyContext: string[];
  objections: Array<{
    objection: string;
    counter: string;
  }>;
  doNotMention: string[];
  signalSources: Array<{
    type: string;
    date: string;
    url: string | null;
    preview: string;
  }>;
  decisionMakers: Array<{
    name: string;
    title: string;
    email: string | null;
    phone: string | null;
  }>;
}

// Generate opening line from synthesis
function generateOpeningLine(lead: GovernmentLead, synthesis: SynthesizedContext | null): string {
  // If we have a synthesized hook, use that
  if (synthesis?.personalizationHooks?.length) {
    const hook = synthesis.personalizationHooks[0];
    // Extract the hook part before SOURCE
    const hookText = hook.split(" - SOURCE:")[0];
    return hookText;
  }

  // Fallback to basic opener based on available data
  const dm = lead.decisionMakers?.[0];
  if (dm) {
    return `Hi ${dm.name.split(" ")[0]}, this is [Your Name] from RLTX.ai - I'm calling about your ${lead.department || lead.institutionType} department.`;
  }

  return `Hi, this is [Your Name] from RLTX.ai - I'm calling to speak with someone in your ${lead.department || "IT"} department about technology solutions.`;
}

// Generate key context bullets
function generateKeyContext(lead: GovernmentLead, synthesis: SynthesizedContext | null): string[] {
  const context: string[] = [];

  // Decision maker context
  const dm = lead.decisionMakers?.[0];
  if (dm) {
    context.push(`Primary contact: ${dm.name}, ${dm.title}`);
  }

  // Company/institution context
  if (lead.population) {
    context.push(`Population served: ${lead.population.toLocaleString()}`);
  }
  if (lead.annualBudget) {
    context.push(`Annual budget: ${lead.annualBudget}`);
  }

  // Tech stack context
  if (lead.techStack?.length) {
    context.push(`Current tech stack: ${lead.techStack.slice(0, 3).join(", ")}`);
  }

  // Buying signals
  if (lead.buyingSignals?.length) {
    context.push(`Buying signals: ${lead.buyingSignals[0]}`);
  }

  // Synthesis-based context
  if (synthesis?.recommendedAngle) {
    context.push(`Recommended angle: ${synthesis.recommendedAngle}`);
  }

  return context.slice(0, 5);
}

// GET /api/briefing/:id - Get call briefing for a lead
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Get or generate synthesis
    let synthesis = lead.synthesizedContext;
    if (!synthesis && (lead.intentSignals?.length || lead.buyingSignals?.length)) {
      synthesis = await synthesizeLead(leadId);
    }

    // Calculate score and urgency
    const signals = lead.intentSignals || [];
    const scoreResult = calculateCompositeScore(signals);
    const urgencyResult = getSignalUrgency(signals);

    // Build the briefing
    const briefing: CallBriefing = {
      leadId,
      institutionName: lead.institutionName,
      contactInfo: {
        department: lead.department,
        state: lead.state,
        phone: lead.phoneNumber,
        email: lead.email,
        website: lead.website,
      },
      score: synthesis?.outreachScore || scoreResult.score,
      classification: scoreResult.classification,
      urgency: {
        level: urgencyResult.urgency,
        action: urgencyResult.action,
        deadline: urgencyResult.deadline,
      },
      whyNow: synthesis?.whyReachOutNow || "No specific timing trigger identified. Consider nurturing.",
      openingLine: generateOpeningLine(lead, synthesis),
      keyContext: generateKeyContext(lead, synthesis),
      objections: (synthesis?.predictedObjections || []).map((objection, i) => ({
        objection,
        counter: synthesis?.counterToObjections?.[objection] || "Address their specific concern",
      })),
      doNotMention: synthesis?.doNotMention || [],
      signalSources: signals.slice(0, 3).map((signal: IntentSignal) => ({
        type: signal.signalType.replace("_", " "),
        date: signal.signalDate,
        url: signal.sourceUrl || null,
        preview: signal.signalContent.substring(0, 150) + (signal.signalContent.length > 150 ? "..." : ""),
      })),
      decisionMakers: (lead.decisionMakers || []).slice(0, 3).map((dm) => ({
        name: dm.name,
        title: dm.title,
        email: dm.email || null,
        phone: dm.phone || null,
      })),
    };

    res.json(briefing);
  } catch (error) {
    console.error("Error generating briefing:", error);
    res.status(500).json({ error: "Failed to generate briefing" });
  }
});

// GET /api/briefing/queue - Get call queue with briefings
router.get("/", async (req: Request, res: Response) => {
  try {
    const minScore = parseInt(req.query.minScore as string) || 6;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get all leads with outreach scores
    const allLeads = await storage.getAllLeads();

    // Filter and sort by outreach score
    const scoredLeads = allLeads
      .filter((lead) => (lead.outreachScore ?? 0) >= minScore)
      .sort((a, b) => {
        // Sort by outreach score descending, then by last signal date
        const scoreDiff = (b.outreachScore ?? 0) - (a.outreachScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;

        const aDate = a.lastSignalDate ? new Date(a.lastSignalDate).getTime() : 0;
        const bDate = b.lastSignalDate ? new Date(b.lastSignalDate).getTime() : 0;
        return bDate - aDate;
      });

    const paginatedLeads = scoredLeads.slice(offset, offset + limit);

    // Build queue items
    const queue = paginatedLeads.map((lead) => {
      const signals = lead.intentSignals || [];
      const scoreResult = calculateCompositeScore(signals);
      const urgencyResult = getSignalUrgency(signals);

      return {
        id: lead.id,
        institutionName: lead.institutionName,
        department: lead.department,
        state: lead.state,
        phone: lead.phoneNumber,
        score: lead.outreachScore || scoreResult.score,
        classification: scoreResult.classification,
        urgency: urgencyResult.urgency,
        whyNow: lead.synthesizedContext?.whyReachOutNow?.substring(0, 100),
        topHook: lead.synthesizedContext?.personalizationHooks?.[0]?.split(" - SOURCE:")[0],
        signalCount: signals.length,
        latestSignalType: signals[0]?.signalType,
        status: lead.status,
        lastContactedAt: lead.lastContactedAt,
      };
    });

    res.json({
      total: scoredLeads.length,
      returned: queue.length,
      offset,
      limit,
      minScore,
      queue,
    });
  } catch (error) {
    console.error("Error fetching call queue:", error);
    res.status(500).json({ error: "Failed to fetch call queue" });
  }
});

// POST /api/briefing/:id/log-outcome - Log call outcome
router.post("/:id/log-outcome", async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const { outcome, notes, signalUsed, hookUsed } = req.body;

    if (!outcome) {
      return res.status(400).json({ error: "Outcome is required" });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Add to outreach history
    const historyEntry = {
      channel: "call" as const,
      date: new Date().toISOString(),
      signalUsed: signalUsed || null,
      hookUsed: hookUsed || null,
      outcome,
      notes: notes || null,
    };

    const existingHistory = lead.outreachHistory || [];
    const updatedHistory = [...existingHistory, historyEntry];

    // Update lead status based on outcome
    let newStatus = lead.status;
    if (outcome === "meeting") {
      newStatus = "qualified";
    } else if (outcome === "callback") {
      newStatus = "follow_up";
    } else if (outcome === "not_interested") {
      newStatus = "closed_lost";
    } else if (outcome === "no_answer" || outcome === "no_reply") {
      newStatus = "contacted";
    }

    await storage.updateLead(leadId, {
      outreachHistory: updatedHistory,
      status: newStatus,
      lastContactedAt: new Date(),
      lastCallOutcome: outcome,
      callNotes: notes || lead.callNotes,
    } as any);

    res.json({
      success: true,
      leadId,
      outcome,
      newStatus,
      historyCount: updatedHistory.length,
    });
  } catch (error) {
    console.error("Error logging outcome:", error);
    res.status(500).json({ error: "Failed to log outcome" });
  }
});

export default router;
