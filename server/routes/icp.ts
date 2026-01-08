import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { targetCriteriaSchema } from "@shared/schema";
import { queueAutoScrapeForIcp, findMatchingLeadTargets } from "../icp-scraper";
import { generateIcpSuggestions } from "../icp-ai";
import { matchLeadsToIcp, findBestIcpForLead } from "../icp-matcher";
import { scrapeForIcp } from "../playbook-orchestrator";

const router = Router();

// Validation schemas
const updateIcpSchema = z.object({
  displayName: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  autoScrapeEnabled: z.boolean().optional(),
  targetCriteria: targetCriteriaSchema.optional(),
  searchQueries: z.array(z.string()).optional(),
});

const playbookScrapeSchema = z.object({
  entities: z.array(z.object({
    name: z.string().min(1, "Entity name is required"),
    state: z.string().optional(),
    department: z.string().optional(),
    entityType: z.string().optional(),
  })).min(1, "At least one entity is required"),
  maxResults: z.number().optional().default(5),
  dryRun: z.boolean().optional().default(false),
});

// GET /api/icp - All ICP profiles
router.get("/", async (req: Request, res: Response) => {
  try {
    await storage.seedDefaultIcps();
    await storage.seedDefaultPlaybooks();
    const profiles = await storage.getIcpProfiles();
    res.json(profiles);
  } catch (error) {
    console.error("Error fetching ICP profiles:", error);
    res.status(500).json({ error: "Failed to fetch ICP profiles" });
  }
});

// GET /api/icp/:id - Single ICP
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ICP ID" });
    }
    const profile = await storage.getIcpProfile(id);
    if (!profile) {
      return res.status(404).json({ error: "ICP profile not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("Error fetching ICP profile:", error);
    res.status(500).json({ error: "Failed to fetch ICP profile" });
  }
});

// PUT /api/icp/:id - Update ICP
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ICP ID" });
    }

    const parseResult = updateIcpSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const profile = await storage.updateIcpProfile(id, parseResult.data);
    if (!profile) {
      return res.status(404).json({ error: "ICP profile not found" });
    }

    let scrapeJobId: number | null = null;
    if (profile.autoScrapeEnabled) {
      const scrapeJob = await queueAutoScrapeForIcp(id);
      if (scrapeJob) {
        scrapeJobId = scrapeJob.id;
      }
    }

    res.json({
      ...profile,
      scrapeJobId,
      autoScrapeTriggered: scrapeJobId !== null
    });
  } catch (error) {
    console.error("Error updating ICP profile:", error);
    res.status(500).json({ error: "Failed to update ICP profile" });
  }
});

// GET /api/icp/:id/matching-leads - Count matching leads
router.get("/:id/matching-leads", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ICP ID" });
    }
    const count = await storage.countMatchingLeads(id);
    res.json({ count });
  } catch (error) {
    console.error("Error counting matching leads:", error);
    res.status(500).json({ error: "Failed to count matching leads" });
  }
});

// POST /api/icp/:id/ai-suggest - AI suggestions
router.post("/:id/ai-suggest", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ICP ID" });
    }

    const profile = await storage.getIcpProfile(id);
    if (!profile) {
      return res.status(404).json({ error: "ICP profile not found" });
    }

    const companyProfile = await storage.getCompanyProfile();
    const companyContext = companyProfile
      ? `${companyProfile.companyName} - ${companyProfile.description}. Services: ${(companyProfile.services || []).join(", ")}`
      : undefined;

    console.log(`Generating AI suggestions for ICP: ${profile.displayName}`);
    const suggestions = await generateIcpSuggestions(profile, companyContext);

    res.json(suggestions);
  } catch (error) {
    console.error("Error generating ICP suggestions:", error);
    res.status(500).json({ error: "Failed to generate AI suggestions" });
  }
});

// GET /api/icp/:id/matched-leads - Leads scored against ICP
router.get("/:id/matched-leads", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ICP ID" });
    }

    const profile = await storage.getIcpProfile(id);
    if (!profile) {
      return res.status(404).json({ error: "ICP profile not found" });
    }

    const leads = await storage.getAllLeads();
    const matchResults = matchLeadsToIcp(leads, profile);

    const topMatches = matchResults.slice(0, 50).map(match => {
      const lead = leads.find(l => l.id === match.leadId);
      return {
        ...match,
        lead: lead ? {
          id: lead.id,
          institutionName: lead.institutionName,
          department: lead.department,
          state: lead.state,
          population: lead.population,
          techMaturityScore: lead.techMaturityScore,
          status: lead.status,
        } : null,
      };
    });

    res.json({
      icpId: id,
      icpName: profile.displayName,
      totalLeads: leads.length,
      matchedLeads: topMatches,
    });
  } catch (error) {
    console.error("Error matching leads to ICP:", error);
    res.status(500).json({ error: "Failed to match leads to ICP" });
  }
});

// POST /api/icp/:id/trigger-scrape - Trigger scraping
router.post("/:id/trigger-scrape", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ICP ID" });
    }

    const profile = await storage.getIcpProfile(id);
    if (!profile) {
      return res.status(404).json({ error: "ICP profile not found" });
    }

    const targets = findMatchingLeadTargets(profile);
    if (targets.length === 0) {
      return res.status(400).json({
        error: "No matching targets found",
        message: "No counties match the ICP criteria. Please update the target criteria."
      });
    }

    const scrapeJob = await queueAutoScrapeForIcp(id);
    if (!scrapeJob) {
      return res.status(500).json({ error: "Failed to create scrape job" });
    }

    res.json({
      message: `Scrape job started for ICP: ${profile.displayName}`,
      scrapeJobId: scrapeJob.id,
      targetCounties: targets.length,
      states: Array.from(new Set(targets.map(t => t.county.state))),
    });
  } catch (error) {
    console.error("Error triggering ICP scrape:", error);
    res.status(500).json({ error: "Failed to trigger ICP scrape" });
  }
});

// POST /api/icp/:id/playbook-scrape - Playbook scrape
router.post("/:id/playbook-scrape", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ICP ID" });
    }

    const profile = await storage.getIcpProfile(id);
    if (!profile) {
      return res.status(404).json({ error: "ICP profile not found" });
    }

    if (!profile.playbookConfig) {
      return res.status(400).json({
        error: "No playbook configuration",
        message: "This ICP does not have a playbook configured. Please update the ICP settings."
      });
    }

    const parseResult = playbookScrapeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const { entities, maxResults, dryRun } = parseResult.data;

    const job = await storage.createScrapeJob({
      status: "running",
      totalStates: 1,
      statesCompleted: 0,
      leadsFound: 0,
      startedAt: new Date(),
      icpId: id,
      icpName: profile.displayName,
    });

    // Run async
    (async () => {
      try {
        console.log(`[PlaybookScrape] Starting scrape job ${job.id} for ICP: ${profile.displayName}`);
        console.log(`[PlaybookScrape] Entities to scrape:`, entities.map(e => e.name).join(", "));

        const result = await scrapeForIcp(id, {
          entities,
          maxResults,
          dryRun,
        });

        await storage.updateScrapeJob(job.id, {
          status: result.success ? "completed" : "failed",
          statesCompleted: 1,
          leadsFound: result.leadsCreated,
          completedAt: new Date(),
          errorMessage: result.errors.length > 0 ? result.errors.join("; ") : undefined,
        });

        console.log(`[PlaybookScrape] Job ${job.id} completed: ${result.leadsCreated} leads created`);
      } catch (error) {
        console.error(`[PlaybookScrape] Job ${job.id} failed:`, error);
        await storage.updateScrapeJob(job.id, {
          status: "failed",
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
    })();

    res.json({
      message: `Playbook scrape started for ICP: ${profile.displayName}`,
      scrapeJobId: job.id,
      icpId: id,
      icpName: profile.displayName,
      entitiesCount: entities.length,
      playbookConfig: {
        targetEntityTypes: profile.playbookConfig.targetEntityTypes,
        dataSources: profile.playbookConfig.dataSources,
      },
    });
  } catch (error) {
    console.error("Error starting playbook scrape:", error);
    res.status(500).json({ error: "Failed to start playbook scrape" });
  }
});

// GET /api/icp/:id/matching-targets - Preview matching targets
router.get("/:id/matching-targets", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ICP ID" });
    }

    const profile = await storage.getIcpProfile(id);
    if (!profile) {
      return res.status(404).json({ error: "ICP profile not found" });
    }

    const targets = findMatchingLeadTargets(profile);
    const states = Array.from(new Set(targets.map(t => t.county.state)));

    res.json({
      icpId: id,
      icpName: profile.displayName,
      totalCounties: targets.length,
      states,
      criteria: profile.targetCriteria,
      targets: targets.slice(0, 50).map(t => ({
        county: t.county.name,
        state: t.county.state,
        population: t.county.population,
        departments: t.departments,
      })),
    });
  } catch (error) {
    console.error("Error fetching matching targets:", error);
    res.status(500).json({ error: "Failed to fetch matching targets" });
  }
});

export default router;
