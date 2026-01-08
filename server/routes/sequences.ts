import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  insertEmailSequenceSchema,
  insertSequenceStepSchema,
  type GovernmentLead
} from "@shared/schema";
import { renderEmailTemplate, getAvailableTemplateVariables, paginationSchema, paginatedResponse } from "./utils";

const router = Router();

const enrollLeadsSchema = z.object({
  leadIds: z.array(z.number()).min(1, "At least one lead ID is required"),
});

const renderTemplateSchema = z.object({
  leadId: z.number(),
  subject: z.string().optional(),
  bodyTemplate: z.string(),
});

// GET /api/sequences - All sequences
router.get("/", async (req: Request, res: Response) => {
  try {
    const params = paginationSchema.safeParse(req.query);
    const { limit, offset } = params.success ? params.data : { limit: 20, offset: 0 };

    const sequences = await storage.getAllSequences();
    const total = sequences.length;
    const paginatedSequences = sequences.slice(offset, offset + limit);

    res.json(paginatedResponse(paginatedSequences, total, { limit, offset }));
  } catch (error) {
    console.error("Error fetching sequences:", error);
    res.status(500).json({ error: "Failed to fetch sequences" });
  }
});

// POST /api/sequences - Create sequence
router.post("/", async (req: Request, res: Response) => {
  try {
    const parseResult = insertEmailSequenceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }
    const sequence = await storage.createSequence(parseResult.data);
    res.status(201).json(sequence);
  } catch (error) {
    console.error("Error creating sequence:", error);
    res.status(500).json({ error: "Failed to create sequence" });
  }
});

// GET /api/sequences/:id - Get sequence with steps
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid sequence ID" });
    }
    const sequenceWithSteps = await storage.getSequenceWithSteps(id);
    if (!sequenceWithSteps) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    res.json(sequenceWithSteps);
  } catch (error) {
    console.error("Error fetching sequence:", error);
    res.status(500).json({ error: "Failed to fetch sequence" });
  }
});

// PUT /api/sequences/:id - Update sequence
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid sequence ID" });
    }
    const updateSchema = insertEmailSequenceSchema.partial();
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }
    const sequence = await storage.updateSequence(id, parseResult.data);
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    res.json(sequence);
  } catch (error) {
    console.error("Error updating sequence:", error);
    res.status(500).json({ error: "Failed to update sequence" });
  }
});

// DELETE /api/sequences/:id - Delete sequence
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid sequence ID" });
    }
    const sequence = await storage.getSequence(id);
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    await storage.deleteSequence(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting sequence:", error);
    res.status(500).json({ error: "Failed to delete sequence" });
  }
});

// POST /api/sequences/:id/steps - Add step
router.post("/:id/steps", async (req: Request, res: Response) => {
  try {
    const sequenceId = parseInt(req.params.id);
    if (isNaN(sequenceId)) {
      return res.status(400).json({ error: "Invalid sequence ID" });
    }
    const sequence = await storage.getSequence(sequenceId);
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    const stepData = { ...req.body, sequenceId };
    const parseResult = insertSequenceStepSchema.safeParse(stepData);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }
    const step = await storage.createStep(parseResult.data);
    res.status(201).json(step);
  } catch (error) {
    console.error("Error creating step:", error);
    res.status(500).json({ error: "Failed to create step" });
  }
});

// PUT /api/sequences/:id/steps/:stepId - Update step
router.put("/:id/steps/:stepId", async (req: Request, res: Response) => {
  try {
    const sequenceId = parseInt(req.params.id);
    const stepId = parseInt(req.params.stepId);
    if (isNaN(sequenceId) || isNaN(stepId)) {
      return res.status(400).json({ error: "Invalid sequence or step ID" });
    }
    const existingStep = await storage.getStep(stepId);
    if (!existingStep || existingStep.sequenceId !== sequenceId) {
      return res.status(404).json({ error: "Step not found in this sequence" });
    }
    const updateSchema = insertSequenceStepSchema.partial().omit({ sequenceId: true });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }
    const step = await storage.updateStep(stepId, parseResult.data);
    res.json(step);
  } catch (error) {
    console.error("Error updating step:", error);
    res.status(500).json({ error: "Failed to update step" });
  }
});

// DELETE /api/sequences/:id/steps/:stepId - Delete step
router.delete("/:id/steps/:stepId", async (req: Request, res: Response) => {
  try {
    const sequenceId = parseInt(req.params.id);
    const stepId = parseInt(req.params.stepId);
    if (isNaN(sequenceId) || isNaN(stepId)) {
      return res.status(400).json({ error: "Invalid sequence or step ID" });
    }
    const existingStep = await storage.getStep(stepId);
    if (!existingStep || existingStep.sequenceId !== sequenceId) {
      return res.status(404).json({ error: "Step not found in this sequence" });
    }
    await storage.deleteStep(stepId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting step:", error);
    res.status(500).json({ error: "Failed to delete step" });
  }
});

// POST /api/sequences/:id/enroll - Enroll leads
router.post("/:id/enroll", async (req: Request, res: Response) => {
  try {
    const sequenceId = parseInt(req.params.id);
    if (isNaN(sequenceId)) {
      return res.status(400).json({ error: "Invalid sequence ID" });
    }
    const sequence = await storage.getSequence(sequenceId);
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    const parseResult = enrollLeadsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }
    const { leadIds } = parseResult.data;
    const enrollments = [];
    const errors = [];
    for (const leadId of leadIds) {
      try {
        const lead = await storage.getLead(leadId);
        if (!lead) {
          errors.push({ leadId, error: "Lead not found" });
          continue;
        }
        const existingEnrollments = await storage.getEnrollmentsByLeadId(leadId);
        const alreadyEnrolled = existingEnrollments.find(
          (e) => e.sequenceId === sequenceId && e.status === "active"
        );
        if (alreadyEnrolled) {
          errors.push({ leadId, error: "Lead already enrolled in this sequence" });
          continue;
        }
        const steps = await storage.getStepsBySequenceId(sequenceId);
        const firstStep = steps.find(s => s.stepNumber === 1);
        const nextStepAt = firstStep
          ? new Date(Date.now() + (firstStep.delayDays * 24 * 60 * 60 * 1000) + (firstStep.delayHours * 60 * 60 * 1000))
          : null;
        const enrollment = await storage.createEnrollment({
          sequenceId,
          leadId,
          currentStep: 1,
          status: "active",
          nextStepAt,
        });
        enrollments.push(enrollment);
      } catch (err) {
        errors.push({ leadId, error: "Failed to enroll lead" });
      }
    }
    res.status(201).json({
      message: `Enrolled ${enrollments.length} leads successfully`,
      enrollments,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error enrolling leads:", error);
    res.status(500).json({ error: "Failed to enroll leads" });
  }
});

// GET /api/sequences/:id/enrollments - Get enrollments
router.get("/:id/enrollments", async (req: Request, res: Response) => {
  try {
    const sequenceId = parseInt(req.params.id);
    if (isNaN(sequenceId)) {
      return res.status(400).json({ error: "Invalid sequence ID" });
    }
    const sequence = await storage.getSequence(sequenceId);
    if (!sequence) {
      return res.status(404).json({ error: "Sequence not found" });
    }
    const enrollments = await storage.getEnrollmentsBySequenceId(sequenceId);
    res.json(enrollments);
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
});

// POST /api/sequences/:id/render-template - Render template
router.post("/:id/render-template", async (req: Request, res: Response) => {
  try {
    const sequenceId = parseInt(req.params.id);
    if (isNaN(sequenceId)) {
      return res.status(400).json({ error: "Invalid sequence ID" });
    }
    const parseResult = renderTemplateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }
    const { leadId, subject, bodyTemplate } = parseResult.data;
    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    const renderedSubject = subject ? renderEmailTemplate(subject, lead) : undefined;
    const renderedBody = renderEmailTemplate(bodyTemplate, lead);
    res.json({
      subject: renderedSubject,
      body: renderedBody,
      variables: getAvailableTemplateVariables(),
    });
  } catch (error) {
    console.error("Error rendering template:", error);
    res.status(500).json({ error: "Failed to render template" });
  }
});

// GET /api/template-variables - Available variables
router.get("/template-variables", (req: Request, res: Response) => {
  res.json(getAvailableTemplateVariables());
});

export default router;
