import { Router, Request, Response } from "express";
import { z } from "zod";
import pLimit from "p-limit";
import { storage } from "../storage";
import { getCountiesByState, type CountyData } from "../county-data";
import { scrapeRealCountyData } from "../real-data-scraper";
import {
  enrichCountyWithAI,
  calculatePriorityScore,
  ABBREVIATION_TO_STATE,
  DEPARTMENT_TYPES,
  paginationSchema,
  paginatedResponse
} from "./utils";

const router = Router();

const scrapeStartSchema = z.object({
  states: z.array(z.string()).min(1, "At least one state is required"),
});

const exportSchema = z.object({
  format: z.enum(["csv", "json"]),
  fields: z.array(z.string()),
  statusFilter: z.string().nullable().optional(),
});

// GET /api/scrape/jobs - All scrape jobs
router.get("/jobs", async (req: Request, res: Response) => {
  try {
    const params = paginationSchema.safeParse(req.query);
    const { limit, offset } = params.success ? params.data : { limit: 20, offset: 0 };

    const jobs = await storage.getAllScrapeJobs();
    const total = jobs.length;
    const paginatedJobs = jobs.slice(offset, offset + limit);

    res.json(paginatedResponse(paginatedJobs, total, { limit, offset }));
  } catch (error) {
    console.error("Error fetching scrape jobs:", error);
    res.status(500).json({ error: "Failed to fetch scrape jobs" });
  }
});

// POST /api/scrape/start - Start scraping
router.post("/start", async (req: Request, res: Response) => {
  try {
    const parseResult = scrapeStartSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const { states } = parseResult.data;

    const job = await storage.createScrapeJob({
      status: "running",
      totalStates: states.length,
      statesCompleted: 0,
      leadsFound: 0,
      startedAt: new Date(),
    });

    // Run async
    (async () => {
      let leadsFound = 0;
      let statesProcessed = 0;

      try {
        console.log(`Starting scrape job ${job.id} for states: ${states.join(", ")}`);

        const counties = getCountiesByState(states);
        console.log(`Found ${counties.length} counties from embedded data`);

        if (counties.length === 0) {
          await storage.updateScrapeJob(job.id, {
            status: "completed",
            statesCompleted: states.length,
            leadsFound: 0,
            completedAt: new Date(),
            errorMessage: "No counties found for selected states",
          });
          return;
        }

        const countiesByState: Record<string, CountyData[]> = {};
        for (const county of counties) {
          const stateName = county.state;
          if (!countiesByState[stateName]) {
            countiesByState[stateName] = [];
          }
          countiesByState[stateName].push(county);
        }

        const limit = pLimit(3);

        for (const stateName of states) {
          const stateCounties = countiesByState[stateName] ||
            countiesByState[ABBREVIATION_TO_STATE[stateName.toUpperCase()]] ||
            [];

          console.log(`Processing ${stateCounties.length} counties for ${stateName}`);

          const countyPromises = stateCounties.map((county) =>
            limit(async () => {
              const countyName = county.name;
              const population = county.population;

              const numDepts = Math.min(3, Math.max(1, Math.floor(Math.random() * 2) + 1));
              const selectedDepts = [...DEPARTMENT_TYPES]
                .sort(() => Math.random() - 0.5)
                .slice(0, numDepts);

              for (const dept of selectedDepts) {
                try {
                  const enrichment = await enrichCountyWithAI(
                    countyName,
                    county.state,
                    population,
                    dept
                  );

                  const priorityScore = calculatePriorityScore({
                    population,
                    techMaturityScore: enrichment.techMaturityScore,
                  });

                  const fullCountyName = countyName.toLowerCase().includes("county")
                    ? countyName
                    : `${countyName} County`;

                  let realContactData;
                  try {
                    console.log(`[Scraper] Fetching real data for ${countyName} County, ${county.state} - ${dept}`);
                    realContactData = await scrapeRealCountyData(county, dept);
                  } catch (scrapeError) {
                    console.error(`[Scraper] Failed to fetch real data for ${countyName} County:`, scrapeError);
                    realContactData = {
                      phoneNumber: null,
                      email: null,
                      website: null,
                      decisionMakerName: null,
                      decisionMakerTitle: null,
                      additionalContacts: [],
                    };
                  }

                  const decisionMakers = [];
                  if (realContactData.decisionMakerName) {
                    decisionMakers.push({
                      name: realContactData.decisionMakerName,
                      title: realContactData.decisionMakerTitle || dept,
                      email: realContactData.email,
                      phone: realContactData.phoneNumber,
                      linkedIn: null,
                    });
                  }
                  for (const contact of realContactData.additionalContacts || []) {
                    decisionMakers.push({
                      name: contact.name,
                      title: contact.title,
                      email: contact.email || null,
                      phone: contact.phone || null,
                      linkedIn: null,
                    });
                  }

                  await storage.createLead({
                    institutionName: fullCountyName,
                    institutionType: "county",
                    department: dept,
                    state: county.state,
                    county: countyName,
                    city: county.countySeat,
                    phoneNumber: realContactData.phoneNumber || null,
                    email: realContactData.email || null,
                    website: realContactData.website || null,
                    population: population || null,
                    annualBudget: enrichment.estimatedBudget,
                    techMaturityScore: enrichment.techMaturityScore,
                    priorityScore,
                    status: "not_contacted",
                    painPoints: enrichment.painPoints,
                    decisionMakers: decisionMakers.length > 0 ? decisionMakers : null,
                  });
                  leadsFound++;

                  await storage.updateScrapeJob(job.id, {
                    leadsFound,
                  });
                } catch (insertError) {
                  console.error(`Error inserting lead for ${countyName}:`, insertError);
                }
              }
            })
          );

          await Promise.all(countyPromises);

          statesProcessed++;
          await storage.updateScrapeJob(job.id, {
            statesCompleted: statesProcessed,
            leadsFound,
          });
        }

        await storage.updateScrapeJob(job.id, {
          status: "completed",
          statesCompleted: states.length,
          leadsFound,
          completedAt: new Date(),
        });

        console.log(`Scrape job ${job.id} completed. Found ${leadsFound} leads.`);
      } catch (error) {
        console.error("Scrape job failed:", error);
        await storage.updateScrapeJob(job.id, {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        });
      }
    })();

    res.json(job);
  } catch (error) {
    console.error("Error starting scrape:", error);
    res.status(500).json({ error: "Failed to start scrape" });
  }
});

// POST /api/export - Export leads
router.post("/export", async (req: Request, res: Response) => {
  try {
    const parseResult = exportSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const { format, fields, statusFilter } = parseResult.data;
    let leads = await storage.getAllLeads();

    if (statusFilter) {
      leads = leads.filter((l) => l.status === statusFilter);
    }

    const filteredLeads = leads.map((lead) => {
      const filtered: Record<string, unknown> = {};
      for (const field of fields) {
        if (field in lead) {
          filtered[field] = lead[field as keyof typeof lead];
        }
      }
      return filtered;
    });

    if (format === "json") {
      res.json({ data: JSON.stringify(filteredLeads, null, 2), count: filteredLeads.length });
    } else {
      const headers = fields.join(",");
      const rows = filteredLeads.map((lead) =>
        fields.map((f: string) => {
          const val = lead[f];
          if (Array.isArray(val)) return `"${val.join("; ")}"`;
          if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val ?? "";
        }).join(",")
      );
      res.json({ data: [headers, ...rows].join("\n"), count: filteredLeads.length });
    }
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({ error: "Failed to export data" });
  }
});

export default router;
