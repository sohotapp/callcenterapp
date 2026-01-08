import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { synthesizeLead, synthesizeLeadsBatch, getOutreachReadyLeads } from "../intelligence/synthesis-engine";
import { calculateCompositeScore, getSignalUrgency } from "../intelligence/signal-scorer";

const router = Router();

// POST /api/intelligence/synthesize/:id - Synthesize a single lead
router.post("/synthesize/:id", async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const synthesis = await synthesizeLead(leadId);
    if (!synthesis) {
      return res.status(500).json({ error: "Failed to synthesize lead" });
    }

    res.json({
      success: true,
      leadId,
      synthesis,
    });
  } catch (error) {
    console.error("Error synthesizing lead:", error);
    res.status(500).json({ error: "Failed to synthesize lead" });
  }
});

// POST /api/intelligence/synthesize-batch - Synthesize multiple leads
const batchSynthesizeSchema = z.object({
  leadIds: z.array(z.number()).min(1).max(20),
});

router.post("/synthesize-batch", async (req: Request, res: Response) => {
  try {
    const parseResult = batchSynthesizeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: parseResult.error.issues,
      });
    }

    const { leadIds } = parseResult.data;
    const results = await synthesizeLeadsBatch(leadIds);

    const successful = Array.from(results.entries())
      .filter(([_, synthesis]) => synthesis !== null)
      .map(([id, synthesis]) => ({ id, synthesis }));

    const failed = Array.from(results.entries())
      .filter(([_, synthesis]) => synthesis === null)
      .map(([id]) => id);

    res.json({
      success: true,
      processed: leadIds.length,
      successful: successful.length,
      failed: failed.length,
      results: successful,
      failedIds: failed,
    });
  } catch (error) {
    console.error("Error batch synthesizing leads:", error);
    res.status(500).json({ error: "Failed to batch synthesize leads" });
  }
});

// GET /api/intelligence/outreach-ready - Get leads ready for outreach
router.get("/outreach-ready", async (req: Request, res: Response) => {
  try {
    const minScore = parseInt(req.query.minScore as string) || 6;
    const limit = parseInt(req.query.limit as string) || 20;

    const leads = await getOutreachReadyLeads(minScore);
    const limitedLeads = leads.slice(0, limit);

    res.json({
      total: leads.length,
      returned: limitedLeads.length,
      minScore,
      leads: limitedLeads.map((lead) => ({
        id: lead.id,
        institutionName: lead.institutionName,
        state: lead.state,
        status: lead.status,
        outreachScore: lead.outreachScore,
        synthesizedContext: lead.synthesizedContext,
        intentSignals: lead.intentSignals,
        lastSignalDate: lead.lastSignalDate,
      })),
    });
  } catch (error) {
    console.error("Error fetching outreach-ready leads:", error);
    res.status(500).json({ error: "Failed to fetch outreach-ready leads" });
  }
});

// GET /api/intelligence/score/:id - Get signal score for a lead
router.get("/score/:id", async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const signals = lead.intentSignals || [];
    const scoreResult = calculateCompositeScore(signals);
    const urgencyResult = getSignalUrgency(signals);

    res.json({
      leadId,
      institutionName: lead.institutionName,
      signalCount: signals.length,
      score: scoreResult.score,
      classification: scoreResult.classification,
      reasoning: scoreResult.reasoning,
      urgency: urgencyResult,
      topSignals: scoreResult.topSignals.map((s) => ({
        type: s.signal.signalType,
        date: s.signal.signalDate,
        strength: s.signal.signalStrength,
        relevance: s.signal.relevanceToUs,
        score: s.score,
        content: s.signal.signalContent.substring(0, 200) + "...",
      })),
    });
  } catch (error) {
    console.error("Error scoring lead:", error);
    res.status(500).json({ error: "Failed to score lead" });
  }
});

// POST /api/intelligence/add-signal/:id - Add an intent signal to a lead
const addSignalSchema = z.object({
  signalType: z.enum(["reddit_post", "job_posting", "g2_review", "news", "tech_change"]),
  signalDate: z.string(),
  signalContent: z.string().min(1),
  signalStrength: z.number().min(1).max(10),
  relevanceToUs: z.enum(["direct", "adjacent", "weak"]),
  sourceUrl: z.string().optional(),
});

router.post("/add-signal/:id", async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const parseResult = addSignalSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid signal data",
        details: parseResult.error.issues,
      });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const newSignal = parseResult.data;
    const existingSignals = lead.intentSignals || [];
    const updatedSignals = [...existingSignals, newSignal];

    // Calculate new score
    const { score } = calculateCompositeScore(updatedSignals as any);

    await storage.updateLead(leadId, {
      intentSignals: updatedSignals,
      outreachScore: score,
      lastSignalDate: new Date(newSignal.signalDate),
    } as any);

    res.json({
      success: true,
      leadId,
      signalCount: updatedSignals.length,
      newScore: score,
    });
  } catch (error) {
    console.error("Error adding signal:", error);
    res.status(500).json({ error: "Failed to add signal" });
  }
});

// GET /api/intelligence/hot-leads - Get HOT leads (score 8+)
router.get("/hot-leads", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const leads = await getOutreachReadyLeads(8);

    res.json({
      count: Math.min(leads.length, limit),
      total: leads.length,
      leads: leads.slice(0, limit).map((lead) => ({
        id: lead.id,
        institutionName: lead.institutionName,
        department: lead.department,
        state: lead.state,
        outreachScore: lead.outreachScore,
        whyNow: lead.synthesizedContext?.whyReachOutNow,
        topHook: lead.synthesizedContext?.personalizationHooks?.[0],
        signalCount: lead.intentSignals?.length || 0,
        latestSignal: lead.intentSignals?.[0]?.signalType,
      })),
    });
  } catch (error) {
    console.error("Error fetching hot leads:", error);
    res.status(500).json({ error: "Failed to fetch hot leads" });
  }
});

export default router;
