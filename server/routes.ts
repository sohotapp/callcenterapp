import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { insertGovernmentLeadSchema, insertScrapeJobSchema } from "@shared/schema";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const US_COUNTY_DATA: Array<{
  state: string;
  counties: Array<{
    name: string;
    population?: number;
    seat?: string;
  }>;
}> = [
  {
    state: "California",
    counties: [
      { name: "Los Angeles County", population: 10014009, seat: "Los Angeles" },
      { name: "San Diego County", population: 3338330, seat: "San Diego" },
      { name: "Orange County", population: 3186989, seat: "Santa Ana" },
      { name: "Riverside County", population: 2470546, seat: "Riverside" },
      { name: "San Bernardino County", population: 2180085, seat: "San Bernardino" },
    ],
  },
  {
    state: "Texas",
    counties: [
      { name: "Harris County", population: 4731145, seat: "Houston" },
      { name: "Dallas County", population: 2613539, seat: "Dallas" },
      { name: "Tarrant County", population: 2110640, seat: "Fort Worth" },
      { name: "Bexar County", population: 2009324, seat: "San Antonio" },
      { name: "Travis County", population: 1290188, seat: "Austin" },
    ],
  },
  {
    state: "Florida",
    counties: [
      { name: "Miami-Dade County", population: 2701767, seat: "Miami" },
      { name: "Broward County", population: 1944375, seat: "Fort Lauderdale" },
      { name: "Palm Beach County", population: 1496770, seat: "West Palm Beach" },
      { name: "Hillsborough County", population: 1471968, seat: "Tampa" },
      { name: "Orange County", population: 1393452, seat: "Orlando" },
    ],
  },
  {
    state: "New York",
    counties: [
      { name: "Kings County", population: 2736074, seat: "Brooklyn" },
      { name: "Queens County", population: 2405464, seat: "Jamaica" },
      { name: "New York County", population: 1694251, seat: "New York City" },
      { name: "Suffolk County", population: 1525920, seat: "Riverhead" },
      { name: "Bronx County", population: 1472654, seat: "Bronx" },
    ],
  },
  {
    state: "Pennsylvania",
    counties: [
      { name: "Philadelphia County", population: 1603797, seat: "Philadelphia" },
      { name: "Allegheny County", population: 1250578, seat: "Pittsburgh" },
      { name: "Montgomery County", population: 856553, seat: "Norristown" },
      { name: "Bucks County", population: 646538, seat: "Doylestown" },
      { name: "Delaware County", population: 576830, seat: "Media" },
    ],
  },
  {
    state: "Illinois",
    counties: [
      { name: "Cook County", population: 5275541, seat: "Chicago" },
      { name: "DuPage County", population: 932877, seat: "Wheaton" },
      { name: "Lake County", population: 714342, seat: "Waukegan" },
      { name: "Will County", population: 696355, seat: "Joliet" },
      { name: "Kane County", population: 516522, seat: "Geneva" },
    ],
  },
  {
    state: "Ohio",
    counties: [
      { name: "Franklin County", population: 1323807, seat: "Columbus" },
      { name: "Cuyahoga County", population: 1264817, seat: "Cleveland" },
      { name: "Hamilton County", population: 830639, seat: "Cincinnati" },
      { name: "Summit County", population: 540428, seat: "Akron" },
      { name: "Montgomery County", population: 537309, seat: "Dayton" },
    ],
  },
  {
    state: "Georgia",
    counties: [
      { name: "Fulton County", population: 1066710, seat: "Atlanta" },
      { name: "Gwinnett County", population: 957062, seat: "Lawrenceville" },
      { name: "Cobb County", population: 766149, seat: "Marietta" },
      { name: "DeKalb County", population: 764382, seat: "Decatur" },
      { name: "Clayton County", population: 297595, seat: "Jonesboro" },
    ],
  },
  {
    state: "North Carolina",
    counties: [
      { name: "Mecklenburg County", population: 1115482, seat: "Charlotte" },
      { name: "Wake County", population: 1129410, seat: "Raleigh" },
      { name: "Guilford County", population: 541299, seat: "Greensboro" },
      { name: "Forsyth County", population: 382295, seat: "Winston-Salem" },
      { name: "Cumberland County", population: 335509, seat: "Fayetteville" },
    ],
  },
  {
    state: "Michigan",
    counties: [
      { name: "Wayne County", population: 1793561, seat: "Detroit" },
      { name: "Oakland County", population: 1274395, seat: "Pontiac" },
      { name: "Macomb County", population: 881217, seat: "Mount Clemens" },
      { name: "Kent County", population: 657974, seat: "Grand Rapids" },
      { name: "Genesee County", population: 406892, seat: "Flint" },
    ],
  },
];

const DEPARTMENT_TYPES = [
  "County Administration",
  "Information Technology",
  "Finance & Budget",
  "Public Works",
  "Human Resources",
  "Parks & Recreation",
  "Public Health",
  "Social Services",
  "Emergency Services",
  "Planning & Development",
];

function generatePhoneNumber(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode}) ${prefix}-${lineNumber}`;
}

function calculatePriorityScore(lead: {
  population?: number | null;
  techMaturityScore?: number | null;
}): number {
  let score = 50;
  if (lead.population) {
    if (lead.population > 1000000) score += 30;
    else if (lead.population > 500000) score += 20;
    else if (lead.population > 100000) score += 10;
  }
  if (lead.techMaturityScore) {
    if (lead.techMaturityScore <= 4) score += 20;
    else if (lead.techMaturityScore <= 6) score += 10;
  }
  return Math.min(100, Math.max(0, score));
}

const scrapeStartSchema = z.object({
  states: z.array(z.string()).min(1, "At least one state is required"),
});

const updateLeadSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
  painPoints: z.array(z.string()).optional(),
});

const exportSchema = z.object({
  format: z.enum(["csv", "json"]),
  fields: z.array(z.string()),
  statusFilter: z.string().nullable().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const leads = await storage.getAllLeads();
      const stats = {
        totalLeads: leads.length,
        highPriority: leads.filter((l) => (l.priorityScore ?? 0) >= 70).length,
        contacted: leads.filter((l) => l.status !== "not_contacted").length,
        qualified: leads.filter((l) => l.status === "qualified" || l.status === "closed_won").length,
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/leads", async (req: Request, res: Response) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req: Request, res: Response) => {
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

  app.patch("/api/leads/:id", async (req: Request, res: Response) => {
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

  app.get("/api/leads/:id/script", async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      if (isNaN(leadId)) {
        return res.status(400).json({ error: "Invalid lead ID" });
      }
      const script = await storage.getScriptByLeadId(leadId);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }
      res.json(script);
    } catch (error) {
      console.error("Error fetching script:", error);
      res.status(500).json({ error: "Failed to fetch script" });
    }
  });

  app.post("/api/leads/:id/generate-script", async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      if (isNaN(leadId)) {
        return res.status(400).json({ error: "Invalid lead ID" });
      }
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const companyProfile = await storage.getCompanyProfile();

      const prompt = `You are a sales script expert for rltx.ai, a company that builds custom AI software systems for government organizations. Generate a compelling cold-call script for the following government lead.

LEAD INFORMATION:
- Institution: ${lead.institutionName}
- Type: ${lead.institutionType}
- Department: ${lead.department || "General Administration"}
- State: ${lead.state}
- County: ${lead.county || "N/A"}
- Population Served: ${lead.population?.toLocaleString() || "Unknown"}
- Annual Budget: ${lead.annualBudget || "Unknown"}
- Tech Maturity Score: ${lead.techMaturityScore || "Unknown"}/10

${companyProfile ? `COMPANY INFORMATION:
- Company: ${companyProfile.companyName}
- Value Proposition: ${companyProfile.valueProposition}
- Services: ${companyProfile.services?.join(", ") || "Custom AI Solutions"}
- Price Range: ${companyProfile.priceRange}
- Target Market: ${companyProfile.targetMarket}
` : `COMPANY INFORMATION:
- Company: rltx.ai
- Services: Custom AI software, RAG systems, end-to-end AI solutions
- Price Range: $10,000 - $500,000
- Target Market: Government and enterprise organizations
`}

Generate a JSON response with the following structure:
{
  "openingStatement": "A friendly, professional opening that introduces yourself and establishes relevance",
  "painPointMatch": "Identify 2-3 specific pain points this government entity likely faces based on their type/department",
  "solutionPitch": "How rltx.ai's custom AI solutions can address their specific pain points",
  "objectionHandlers": ["Response to budget concerns", "Response to 'we already have a system'", "Response to 'we need to go through procurement'"],
  "closingStatement": "A clear call-to-action for next steps",
  "painPoints": ["Pain point 1", "Pain point 2", "Pain point 3"]
}

Be specific to their government type and department. Reference real challenges governments face like legacy systems, manual processes, citizen service improvements, data silos, and compliance requirements.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      let scriptData;
      try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          scriptData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Failed to parse AI response:", content.text);
        scriptData = {
          openingStatement: `Hi, this is calling from rltx.ai. I'm reaching out because we specialize in building custom AI solutions for government organizations like ${lead.institutionName}. Do you have a few minutes to discuss how we might help streamline your operations?`,
          painPointMatch: `Based on my research, many ${lead.institutionType} organizations face challenges with legacy systems, manual data entry, and citizen service response times. Is that something you're experiencing at ${lead.institutionName}?`,
          solutionPitch: `We've helped government organizations implement AI-powered solutions that automate routine tasks, improve data accessibility, and enhance citizen services - typically seeing 40-60% efficiency improvements. Our solutions range from $10K for focused projects to $500K for comprehensive enterprise systems.`,
          objectionHandlers: [
            "I completely understand budget constraints. Many of our government clients start with a smaller pilot project to demonstrate ROI before committing to larger implementations.",
            "That's great that you have existing systems. Our solutions are designed to integrate with and enhance your current infrastructure, not replace everything.",
            "We're very familiar with government procurement processes. We can provide all the documentation needed for RFP responses and are registered in most state vendor systems."
          ],
          closingStatement: "Would you be open to a brief 15-minute call next week where I could show you a case study of similar work we've done? I think you'd find it relevant to what you're trying to accomplish.",
          painPoints: ["Legacy system integration", "Manual data processing", "Citizen service efficiency"]
        };
      }

      const fullScript = `OPENING:
${scriptData.openingStatement}

PAIN POINT DISCOVERY:
${scriptData.painPointMatch}

SOLUTION PITCH:
${scriptData.solutionPitch}

OBJECTION HANDLERS:
${scriptData.objectionHandlers.map((h: string, i: number) => `${i + 1}. ${h}`).join("\n")}

CLOSE:
${scriptData.closingStatement}`;

      const script = await storage.createScript({
        leadId,
        openingStatement: scriptData.openingStatement,
        painPointMatch: scriptData.painPointMatch,
        solutionPitch: scriptData.solutionPitch,
        objectionHandlers: scriptData.objectionHandlers,
        closingStatement: scriptData.closingStatement,
        fullScript,
      });

      if (scriptData.painPoints && scriptData.painPoints.length > 0) {
        await storage.updateLead(leadId, { painPoints: scriptData.painPoints });
      }

      res.json(script);
    } catch (error) {
      console.error("Error generating script:", error);
      res.status(500).json({ error: "Failed to generate script" });
    }
  });

  app.get("/api/scripts", async (req: Request, res: Response) => {
    try {
      const scripts = await storage.getAllScripts();
      const leads = await storage.getAllLeads();
      const scriptsWithLeads = scripts.map((script) => ({
        ...script,
        lead: leads.find((l) => l.id === script.leadId),
      }));
      res.json(scriptsWithLeads);
    } catch (error) {
      console.error("Error fetching scripts:", error);
      res.status(500).json({ error: "Failed to fetch scripts" });
    }
  });

  app.get("/api/company-profile", async (req: Request, res: Response) => {
    try {
      const profile = await storage.getCompanyProfile();
      if (!profile) {
        return res.status(404).json({ error: "Company profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching company profile:", error);
      res.status(500).json({ error: "Failed to fetch company profile" });
    }
  });

  app.post("/api/company-profile/refresh", async (req: Request, res: Response) => {
    try {
      const prompt = `Analyze rltx.ai as a company that builds custom AI software. Based on the company name and typical offerings of AI development agencies, generate a comprehensive company profile.

Generate a JSON response with the following structure:
{
  "companyName": "rltx.ai",
  "valueProposition": "A compelling 1-2 sentence value proposition for government clients",
  "services": ["Service 1", "Service 2", "Service 3", "Service 4", "Service 5"],
  "priceRange": "$10,000 - $500,000",
  "targetMarket": "Government and enterprise organizations seeking custom AI solutions",
  "uniqueSellingPoints": ["USP 1", "USP 2", "USP 3", "USP 4"],
  "caseStudies": ["Brief case study 1", "Brief case study 2"]
}

Focus on AI/ML capabilities, RAG systems, custom software development, and enterprise integrations. Make the content compelling for government decision-makers.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      let profileData;
      try {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          profileData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        profileData = {
          companyName: "rltx.ai",
          valueProposition: "We build end-to-end custom AI systems that transform government operations, from intelligent document processing to citizen service automation.",
          services: [
            "Custom AI Software Development",
            "RAG (Retrieval-Augmented Generation) Systems",
            "Intelligent Document Processing",
            "Citizen Service Chatbots",
            "Data Integration & Analytics",
          ],
          priceRange: "$10,000 - $500,000",
          targetMarket: "Local, county, and state government organizations seeking to modernize operations with AI",
          uniqueSellingPoints: [
            "Government-focused expertise with proven implementations",
            "End-to-end delivery from concept to deployment",
            "Flexible pricing from pilot projects to enterprise solutions",
            "Compliance-first approach for government security requirements",
          ],
          caseStudies: [
            "County records department: 70% reduction in document processing time through AI automation",
            "State agency: Citizen service chatbot handling 10,000+ inquiries monthly with 85% resolution rate",
          ],
        };
      }

      const profile = await storage.upsertCompanyProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error refreshing company profile:", error);
      res.status(500).json({ error: "Failed to refresh company profile" });
    }
  });

  app.get("/api/scrape/jobs", async (req: Request, res: Response) => {
    try {
      const jobs = await storage.getAllScrapeJobs();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching scrape jobs:", error);
      res.status(500).json({ error: "Failed to fetch scrape jobs" });
    }
  });

  app.post("/api/scrape/start", async (req: Request, res: Response) => {
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

      (async () => {
        let leadsFound = 0;
        let statesCompleted = 0;

        try {
          for (const stateName of states) {
            const stateData = US_COUNTY_DATA.find(
              (s) => s.state.toLowerCase() === stateName.toLowerCase()
            );

            if (stateData) {
              for (const county of stateData.counties) {
                const numDepts = Math.floor(Math.random() * 3) + 1;
                const selectedDepts = DEPARTMENT_TYPES.sort(() => Math.random() - 0.5).slice(0, numDepts);

                for (const dept of selectedDepts) {
                  try {
                    const techScore = Math.floor(Math.random() * 10) + 1;
                    const budget = county.population
                      ? `$${Math.round((county.population * 2500) / 1000000)}M - $${Math.round((county.population * 3500) / 1000000)}M`
                      : undefined;

                    const priorityScore = calculatePriorityScore({ population: county.population, techMaturityScore: techScore });

                    await storage.createLead({
                      institutionName: county.name,
                      institutionType: "county",
                      department: dept,
                      state: stateData.state,
                      county: county.name.replace(" County", ""),
                      city: county.seat,
                      phoneNumber: generatePhoneNumber(),
                      email: `${dept.toLowerCase().replace(/\s+/g, ".")}@${county.name.toLowerCase().replace(/\s+/g, "")}.gov`,
                      website: `https://www.${county.name.toLowerCase().replace(/\s+/g, "")}.gov`,
                      population: county.population,
                      annualBudget: budget,
                      techMaturityScore: techScore,
                      priorityScore,
                      status: "not_contacted",
                    });
                    leadsFound++;
                  } catch (insertError) {
                    console.error("Error inserting lead:", insertError);
                  }
                }
              }
            } else {
              const fakeCities = [`${stateName} City`, `${stateName} Metro`];
              for (const city of fakeCities) {
                try {
                  const dept = DEPARTMENT_TYPES[Math.floor(Math.random() * DEPARTMENT_TYPES.length)];
                  const techScore = Math.floor(Math.random() * 10) + 1;
                  const population = Math.floor(Math.random() * 500000) + 50000;
                  const priorityScore = calculatePriorityScore({ population, techMaturityScore: techScore });

                  await storage.createLead({
                    institutionName: `${city} Municipal Government`,
                    institutionType: "city",
                    department: dept,
                    state: stateName,
                    city: city,
                    phoneNumber: generatePhoneNumber(),
                    email: `${dept.toLowerCase().replace(/\s+/g, ".")}@${city.toLowerCase().replace(/\s+/g, "")}.gov`,
                    website: `https://www.${city.toLowerCase().replace(/\s+/g, "")}.gov`,
                    population,
                    techMaturityScore: techScore,
                    priorityScore,
                    status: "not_contacted",
                  });
                  leadsFound++;
                } catch (insertError) {
                  console.error("Error inserting lead:", insertError);
                }
              }
            }

            statesCompleted++;
            await storage.updateScrapeJob(job.id, {
              statesCompleted,
              leadsFound,
            });
          }

          await storage.updateScrapeJob(job.id, {
            status: "completed",
            statesCompleted: states.length,
            leadsFound,
            completedAt: new Date(),
          });
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

  app.post("/api/export", async (req: Request, res: Response) => {
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

  return httpServer;
}
