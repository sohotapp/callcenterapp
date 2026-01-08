import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { findDuplicates, mergeLeads, checkNewLeadForDuplicates } from "../deduplication";

const router = Router();

// GET /api/deduplication/scan - Scan for duplicates
router.get("/scan", async (req: Request, res: Response) => {
  try {
    console.log("[Deduplication] Starting duplicate scan...");
    const result = await findDuplicates();
    console.log(`[Deduplication] Found ${result.duplicatesFound} duplicates in ${result.groups.length} groups`);
    res.json(result);
  } catch (error) {
    console.error("Error scanning for duplicates:", error);
    res.status(500).json({ error: "Failed to scan for duplicates" });
  }
});

// POST /api/deduplication/merge - Merge two leads
const mergeSchema = z.object({
  keepLeadId: z.number(),
  mergeLeadId: z.number(),
});

router.post("/merge", async (req: Request, res: Response) => {
  try {
    const parseResult = mergeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const { keepLeadId, mergeLeadId } = parseResult.data;

    if (keepLeadId === mergeLeadId) {
      return res.status(400).json({ error: "Cannot merge a lead with itself" });
    }

    console.log(`[Deduplication] Merging lead ${mergeLeadId} into ${keepLeadId}`);
    const result = await mergeLeads(keepLeadId, mergeLeadId);

    if (!result) {
      return res.status(404).json({ error: "One or both leads not found" });
    }

    res.json({
      message: "Leads merged successfully",
      lead: result,
    });
  } catch (error) {
    console.error("Error merging leads:", error);
    res.status(500).json({ error: "Failed to merge leads" });
  }
});

// POST /api/deduplication/check - Check if a new lead would be duplicate
const checkSchema = z.object({
  institutionName: z.string(),
  state: z.string(),
  county: z.string().optional(),
  department: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
});

router.post("/check", async (req: Request, res: Response) => {
  try {
    const parseResult = checkSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const matches = await checkNewLeadForDuplicates(parseResult.data);

    res.json({
      hasDuplicates: matches.length > 0,
      matches,
    });
  } catch (error) {
    console.error("Error checking for duplicates:", error);
    res.status(500).json({ error: "Failed to check for duplicates" });
  }
});

// GET /api/freshness/stale - Get stale leads
router.get("/freshness/stale", async (req: Request, res: Response) => {
  try {
    const daysThreshold = parseInt(req.query.days as string) || 30;
    const leads = await storage.getAllLeads();

    const now = new Date();
    const thresholdDate = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

    const staleLeads = leads.filter(lead => {
      // Check enrichment freshness
      if (lead.enrichedAt) {
        const enrichedDate = new Date(lead.enrichedAt);
        return enrichedDate < thresholdDate;
      }
      // Never enriched = stale
      return true;
    }).map(lead => ({
      id: lead.id,
      institutionName: lead.institutionName,
      state: lead.state,
      department: lead.department,
      enrichedAt: lead.enrichedAt,
      daysSinceEnrichment: lead.enrichedAt
        ? Math.floor((now.getTime() - new Date(lead.enrichedAt).getTime()) / (24 * 60 * 60 * 1000))
        : null,
      status: lead.status,
      priorityScore: lead.priorityScore,
    }));

    // Sort by days since enrichment (never enriched first, then oldest first)
    staleLeads.sort((a, b) => {
      if (a.daysSinceEnrichment === null) return -1;
      if (b.daysSinceEnrichment === null) return 1;
      return b.daysSinceEnrichment - a.daysSinceEnrichment;
    });

    res.json({
      threshold: daysThreshold,
      totalLeads: leads.length,
      staleCount: staleLeads.length,
      stalePercentage: Math.round((staleLeads.length / leads.length) * 100),
      leads: staleLeads.slice(0, 100), // Return top 100 stale leads
    });
  } catch (error) {
    console.error("Error fetching stale leads:", error);
    res.status(500).json({ error: "Failed to fetch stale leads" });
  }
});

// GET /api/freshness/stats - Get freshness statistics
router.get("/freshness/stats", async (req: Request, res: Response) => {
  try {
    const leads = await storage.getAllLeads();
    const now = new Date();

    const stats = {
      totalLeads: leads.length,
      neverEnriched: 0,
      fresh: 0, // < 7 days
      recent: 0, // 7-30 days
      stale: 0, // 30-90 days
      veryStale: 0, // > 90 days
      avgDaysSinceEnrichment: 0,
    };

    let totalDays = 0;
    let enrichedCount = 0;

    for (const lead of leads) {
      if (!lead.enrichedAt) {
        stats.neverEnriched++;
        continue;
      }

      const enrichedDate = new Date(lead.enrichedAt);
      const daysSince = Math.floor((now.getTime() - enrichedDate.getTime()) / (24 * 60 * 60 * 1000));

      totalDays += daysSince;
      enrichedCount++;

      if (daysSince < 7) {
        stats.fresh++;
      } else if (daysSince < 30) {
        stats.recent++;
      } else if (daysSince < 90) {
        stats.stale++;
      } else {
        stats.veryStale++;
      }
    }

    stats.avgDaysSinceEnrichment = enrichedCount > 0 ? Math.round(totalDays / enrichedCount) : 0;

    res.json(stats);
  } catch (error) {
    console.error("Error fetching freshness stats:", error);
    res.status(500).json({ error: "Failed to fetch freshness stats" });
  }
});

// POST /api/freshness/refresh-batch - Refresh stale leads
const refreshBatchSchema = z.object({
  leadIds: z.array(z.number()).min(1).max(20),
});

router.post("/freshness/refresh-batch", async (req: Request, res: Response) => {
  try {
    const parseResult = refreshBatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const { leadIds } = parseResult.data;

    // Return the list of leads to refresh - actual enrichment handled separately
    const leads = await Promise.all(leadIds.map(id => storage.getLead(id)));
    const validLeads = leads.filter(Boolean);

    res.json({
      message: `${validLeads.length} leads queued for refresh`,
      leadIds: validLeads.map(l => l!.id),
    });
  } catch (error) {
    console.error("Error queuing leads for refresh:", error);
    res.status(500).json({ error: "Failed to queue leads for refresh" });
  }
});

export default router;
