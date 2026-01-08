import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { activityTypes, activityChannels, callOutcomes } from "@shared/schema";

const router = Router();

// Validation schemas
const createActivitySchema = z.object({
  leadId: z.number(),
  type: z.enum(activityTypes),
  channel: z.enum(activityChannels),
  sequenceId: z.number().nullable().optional(),
  stepNumber: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  outcome: z.enum(callOutcomes).nullable().optional(),
  duration: z.number().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

const updateCallOutcomeSchema = z.object({
  outcome: z.enum(callOutcomes),
  notes: z.string().optional(),
});

// POST /api/activities - Log new activity
router.post("/", async (req: Request, res: Response) => {
  try {
    const parseResult = createActivitySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const lead = await storage.getLead(parseResult.data.leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const activity = await storage.createActivity(parseResult.data);
    res.status(201).json(activity);
  } catch (error) {
    console.error("Error creating activity:", error);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

// GET /api/activities/stats - Activity statistics
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await storage.getActivityStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching activity stats:", error);
    res.status(500).json({ error: "Failed to fetch activity stats" });
  }
});

// GET /api/leads/:id/activities - Activities for a lead
router.get("/lead/:id", async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const activities = await storage.getActivitiesByLead(leadId);
    res.json(activities);
  } catch (error) {
    console.error("Error fetching lead activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// GET /api/sequences/:id/activities - Activities for a sequence
router.get("/sequence/:id", async (req: Request, res: Response) => {
  try {
    const sequenceId = parseInt(req.params.id);
    if (isNaN(sequenceId)) {
      return res.status(400).json({ error: "Invalid sequence ID" });
    }

    const sequence = await storage.getSequence(sequenceId);
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }

    const activities = await storage.getActivitiesBySequence(sequenceId);
    res.json(activities);
  } catch (error) {
    console.error("Error fetching sequence activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// PATCH /api/leads/:id/call-outcome - Update call outcome
router.patch("/lead/:id/call-outcome", async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.id);
    if (isNaN(leadId)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const parseResult = updateCallOutcomeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const existingLead = await storage.getLead(leadId);
    if (!existingLead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const { outcome, notes } = parseResult.data;

    const updatedLead = await storage.updateLeadCallOutcome(leadId, outcome, notes);
    if (!updatedLead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Log activity for this call
    const activityType = outcome === "no_answer" || outcome === "voicemail" ? "call_made" : "call_answered";
    await storage.createActivity({
      leadId,
      type: activityType,
      channel: "phone",
      outcome,
      notes: notes || null,
    });

    res.json(updatedLead);
  } catch (error) {
    console.error("Error updating call outcome:", error);
    res.status(500).json({ error: "Failed to update call outcome" });
  }
});

export default router;
