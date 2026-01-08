import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { enrichLead, enrichLeadsBatch, enrichLeadWithRealData } from "../enrichment";
import { calculateLeadScore, scoreAllLeads } from "../scoring";
import { findBestIcpForLead } from "../icp-matcher";
import { paginationSchema, paginatedResponse } from "./utils";

const router = Router();

// Validation schemas
const updateLeadSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
  painPoints: z.array(z.string()).optional(),
});

const batchEnrichSchema = z.object({
  leadIds: z.array(z.number()).min(1).max(10),
});

// GET /api/leads - All leads with pagination (SQL-level LIMIT/OFFSET)
router.get("/", async (req: Request, res: Response) => {
  try {
    const params = paginationSchema.safeParse(req.query);
    const { limit, offset } = params.success ? params.data : { limit: 20, offset: 0 };
    const page = Math.floor(offset / limit) + 1;

    // Extract filters from query params
    const filters = {
      state: req.query.state as string | undefined,
      status: req.query.status as string | undefined,
      icpId: req.query.icpId ? Number(req.query.icpId) : undefined,
    };

    // Use SQL-level pagination for better performance
    const result = await storage.getLeadsPaginated(page, Math.min(limit, 100), filters);

    res.json(paginatedResponse(result.leads, result.total, { limit, offset }));
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// GET /api/leads/top-scored - Top N leads by priority
router.get("/top-scored", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const leads = await storage.getTopScoredLeads(Math.min(limit, 50));
    res.json(leads);
  } catch (error) {
    console.error("Error fetching top scored leads:", error);
    res.status(500).json({ error: "Failed to fetch top scored leads" });
  }
});

// GET /api/leads/:id - Single lead
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }
    const lead = await storage.getLead(id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

// PATCH /api/leads/:id - Update lead
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const parseResult = updateLeadSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const updates = parseResult.data;
    if (updates.status && updates.status !== "not_contacted") {
      (updates as any).lastContactedAt = new Date();
    }
    const lead = await storage.updateLead(id, updates);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(lead);
  } catch (error) {
    console.error("Error updating lead:", error);
    res.status(500).json({ error: "Failed to update lead" });
  }
});

// GET /api/leads/:id/enrichment - Get enrichment data
router.get("/:id/enrichment", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const lead = await storage.getLead(id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json({
      decisionMakers: lead.decisionMakers || [],
      techStack: lead.techStack || [],
      recentNews: lead.recentNews || [],
      competitorAnalysis: lead.competitorAnalysis || [],
      buyingSignals: lead.buyingSignals || [],
      enrichmentData: lead.enrichmentData || {},
      enrichedAt: lead.enrichedAt,
      enrichmentScore: lead.enrichmentScore,
    });
  } catch (error) {
    console.error("Error fetching lead enrichment:", error);
    res.status(500).json({ error: "Failed to fetch lead enrichment" });
  }
});

// POST /api/leads/:id/enrich - Trigger enrichment
router.post("/:id/enrich", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const lead = await storage.getLead(id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      return res.status(500).json({ error: "TAVILY_API_KEY not configured" });
    }

    console.log(`Starting enrichment for lead ${id}: ${lead.institutionName}`);

    const enrichmentResult = await enrichLead(lead);

    const updatedLead = await storage.updateLeadEnrichment(id, {
      decisionMakers: enrichmentResult.decisionMakers,
      techStack: enrichmentResult.techStack,
      recentNews: enrichmentResult.recentNews,
      competitorAnalysis: enrichmentResult.competitorAnalysis,
      buyingSignals: enrichmentResult.buyingSignals,
      enrichmentData: enrichmentResult.enrichmentData,
      enrichmentScore: enrichmentResult.enrichmentScore,
    });

    res.json(updatedLead);
  } catch (error) {
    console.error("Error enriching lead:", error);
    res.status(500).json({ error: "Failed to enrich lead" });
  }
});

// POST /api/leads/:id/enrich-real - Real-time web research enrichment
router.post("/:id/enrich-real", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const lead = await storage.getLead(id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      return res.status(500).json({ error: "TAVILY_API_KEY not configured. Please add your Tavily API key to enable real-time web research." });
    }

    console.log(`Starting real data enrichment for lead ${id}: ${lead.institutionName}`);

    const enrichmentResult = await enrichLeadWithRealData(lead);

    const existingPainPoints = lead.painPoints || [];
    const existingDecisionMakers = lead.decisionMakers || [];

    const mergedPainPoints = Array.from(new Set([...existingPainPoints, ...enrichmentResult.painPoints]));
    const mergedDecisionMakers = [
      ...existingDecisionMakers,
      ...enrichmentResult.decisionMakers.filter(
        (newDm) => !existingDecisionMakers.some((existing) => existing.name === newDm.name)
      ),
    ];

    const existingTechStack = lead.techStack || [];
    const mergedTechStack = Array.from(new Set([...existingTechStack, ...enrichmentResult.techStack]));

    const existingBuyingSignals = lead.buyingSignals || [];
    const mergedBuyingSignals = Array.from(new Set([...existingBuyingSignals, ...enrichmentResult.buyingSignals]));

    const updatedLead = await storage.updateLeadEnrichment(id, {
      decisionMakers: mergedDecisionMakers,
      techStack: mergedTechStack,
      buyingSignals: mergedBuyingSignals,
      enrichmentData: {
        ...(lead.enrichmentData || {}),
        realDataEnrichment: {
          recentNews: enrichmentResult.recentNews,
          searchQueries: enrichmentResult.searchQueries,
          totalResultsFound: enrichmentResult.totalResultsFound,
          enrichedAt: enrichmentResult.enrichedAt.toISOString(),
        },
      },
      enrichmentScore: Math.max(enrichmentResult.enrichmentScore, lead.enrichmentScore || 0),
    });

    await storage.updateLead(id, {
      painPoints: mergedPainPoints,
    });

    const finalLead = await storage.getLead(id);

    res.json({
      lead: finalLead,
      enrichmentDetails: {
        recentNews: enrichmentResult.recentNews,
        techStack: enrichmentResult.techStack,
        painPoints: enrichmentResult.painPoints,
        buyingSignals: enrichmentResult.buyingSignals,
        decisionMakers: enrichmentResult.decisionMakers,
        enrichmentScore: enrichmentResult.enrichmentScore,
        searchQueries: enrichmentResult.searchQueries,
        totalResultsFound: enrichmentResult.totalResultsFound,
      },
      status: "completed",
    });
  } catch (error) {
    console.error("Error in real data enrichment:", error);
    res.status(500).json({
      error: "Failed to enrich lead with real data",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/leads/enrich-batch - Batch enrichment
router.post("/enrich-batch", async (req: Request, res: Response) => {
  try {
    const parseResult = batchEnrichSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
      return res.status(500).json({ error: "TAVILY_API_KEY not configured" });
    }

    const { leadIds } = parseResult.data;

    const leads: any[] = [];
    for (const id of leadIds) {
      const lead = await storage.getLead(id);
      if (lead) {
        leads.push(lead);
      }
    }

    if (leads.length === 0) {
      return res.status(404).json({ error: "No valid leads found" });
    }

    console.log(`Starting batch enrichment for ${leads.length} leads`);

    const results = await enrichLeadsBatch(leads);

    const enrichedLeads: any[] = [];
    for (const [leadId, enrichmentResult] of Array.from(results.entries())) {
      const updatedLead = await storage.updateLeadEnrichment(leadId, {
        decisionMakers: enrichmentResult.decisionMakers,
        techStack: enrichmentResult.techStack,
        recentNews: enrichmentResult.recentNews,
        competitorAnalysis: enrichmentResult.competitorAnalysis,
        buyingSignals: enrichmentResult.buyingSignals,
        enrichmentData: enrichmentResult.enrichmentData,
        enrichmentScore: enrichmentResult.enrichmentScore,
      });
      if (updatedLead) {
        enrichedLeads.push(updatedLead);
      }
    }

    res.json({
      message: `Successfully enriched ${enrichedLeads.length} leads`,
      leads: enrichedLeads,
    });
  } catch (error) {
    console.error("Error in batch enrichment:", error);
    res.status(500).json({ error: "Failed to enrich leads" });
  }
});

// POST /api/leads/:id/score - Score single lead
router.post("/:id/score", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const lead = await storage.getLead(id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const companyProfile = await storage.getCompanyProfile();
    const scores = calculateLeadScore(lead, companyProfile ?? null);

    const updatedLead = await storage.updateLeadScoring(id, scores);

    res.json({
      lead: updatedLead,
      scores,
    });
  } catch (error) {
    console.error("Error scoring lead:", error);
    res.status(500).json({ error: "Failed to score lead" });
  }
});

// POST /api/leads/score-all - Score all leads
router.post("/score-all", async (req: Request, res: Response) => {
  try {
    const leads = await storage.getAllLeads();
    const companyProfile = await storage.getCompanyProfile();

    const scoredLeads = scoreAllLeads(leads, companyProfile ?? null);

    const updatedLeads: any[] = [];
    for (const { leadId, scores } of scoredLeads) {
      const updatedLead = await storage.updateLeadScoring(leadId, scores);
      if (updatedLead) {
        updatedLeads.push(updatedLead);
      }
    }

    res.json({
      message: `Successfully scored ${updatedLeads.length} leads`,
      count: updatedLeads.length,
    });
  } catch (error) {
    console.error("Error scoring all leads:", error);
    res.status(500).json({ error: "Failed to score leads" });
  }
});

// GET /api/leads/:id/icp-match - Best ICP match for lead
router.get("/:id/icp-match", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const lead = await storage.getLead(id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const icpProfiles = await storage.getIcpProfiles();
    const activeProfiles = icpProfiles.filter((p: any) => p.isActive);

    if (activeProfiles.length === 0) {
      return res.json({
        leadId: id,
        leadName: lead.institutionName,
        bestMatch: null,
      });
    }

    const bestMatch = findBestIcpForLead(lead, activeProfiles);

    res.json({
      leadId: id,
      leadName: lead.institutionName,
      bestMatch: bestMatch ? {
        icpId: bestMatch.icpId,
        icpName: bestMatch.icpName,
        matchScore: bestMatch.matchScore,
      } : null,
    });
  } catch (error) {
    console.error("Error finding ICP match:", error);
    res.status(500).json({ error: "Failed to find ICP match" });
  }
});

export default router;
