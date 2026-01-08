import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  generateMessage,
  regenerateMessage,
  analyzeMessageForSlop,
  type GeneratedMessage,
} from "../intelligence/message-generator";

const router = Router();

// Schema for message generation request
const generateMessageSchema = z.object({
  messageType: z.enum(["cold_email", "linkedin", "follow_up_email"]),
  customContext: z.string().optional(),
});

// Schema for regeneration request
const regenerateMessageSchema = z.object({
  messageType: z.enum(["cold_email", "linkedin", "follow_up_email"]),
  feedback: z.string().min(1, "Feedback is required"),
  customContext: z.string().optional(),
});

// Schema for slop analysis
const analyzeSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

// POST /api/messages/generate/:leadId - Generate a message for a lead
router.post("/generate/:leadId", async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.leadId);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const parseResult = generateMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parseResult.error.flatten(),
      });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const { messageType, customContext } = parseResult.data;

    const message = await generateMessage({
      lead,
      messageType,
      synthesis: lead.synthesizedContext,
      customContext,
    });

    res.json(message);
  } catch (error) {
    console.error("Error generating message:", error);
    res.status(500).json({ error: "Failed to generate message" });
  }
});

// POST /api/messages/regenerate/:leadId - Regenerate with feedback
router.post("/regenerate/:leadId", async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.leadId);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const parseResult = regenerateMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parseResult.error.flatten(),
      });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const { messageType, feedback, customContext } = parseResult.data;

    const message = await regenerateMessage(
      {
        lead,
        messageType,
        synthesis: lead.synthesizedContext,
        customContext,
      },
      feedback
    );

    res.json(message);
  } catch (error) {
    console.error("Error regenerating message:", error);
    res.status(500).json({ error: "Failed to regenerate message" });
  }
});

// POST /api/messages/analyze - Analyze a message for slop
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const parseResult = analyzeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: parseResult.error.flatten(),
      });
    }

    const { message } = parseResult.data;
    const analysis = analyzeMessageForSlop(message);

    res.json({
      slopScore: analysis.score,
      issues: analysis.issues,
      improvements: analysis.improvements,
      isGood: analysis.score < 20,
      isAcceptable: analysis.score < 40,
    });
  } catch (error) {
    console.error("Error analyzing message:", error);
    res.status(500).json({ error: "Failed to analyze message" });
  }
});

// GET /api/messages/pending-review - Get leads needing message review (score 8+)
router.get("/pending-review", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    // Get high-value leads (outreach score 8+) that haven't been contacted recently
    const leads = await storage.getAllLeads();

    const pendingReview = leads
      .filter((lead) => {
        const score = lead.outreachScore ?? 0;
        const hasBeenContacted = lead.status !== "not_contacted";
        const hasSynthesis = lead.synthesizedContext?.whyReachOutNow;
        return score >= 8 && !hasBeenContacted && hasSynthesis;
      })
      .sort((a, b) => (b.outreachScore ?? 0) - (a.outreachScore ?? 0))
      .slice(0, limit)
      .map((lead) => ({
        id: lead.id,
        institutionName: lead.institutionName,
        institutionType: lead.institutionType,
        state: lead.state,
        department: lead.department,
        outreachScore: lead.outreachScore,
        whyNow: lead.synthesizedContext?.whyReachOutNow,
        hooks: lead.synthesizedContext?.personalizationHooks,
        recommendedAngle: lead.synthesizedContext?.recommendedAngle,
        email: lead.email,
        phone: lead.phoneNumber,
        signalCount: lead.intentSignals?.length ?? 0,
        latestSignalType: lead.intentSignals?.[0]?.signalType ?? null,
      }));

    res.json({
      leads: pendingReview,
      total: pendingReview.length,
    });
  } catch (error) {
    console.error("Error fetching pending review:", error);
    res.status(500).json({ error: "Failed to fetch pending review" });
  }
});

export default router;
