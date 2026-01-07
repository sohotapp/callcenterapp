import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { 
  insertGovernmentLeadSchema, 
  insertScrapeJobSchema, 
  insertIcpProfileSchema, 
  targetCriteriaSchema, 
  scriptStyles, 
  type ScriptStyle,
  insertEmailSequenceSchema,
  insertSequenceStepSchema,
  insertOutreachActivitySchema,
  type GovernmentLead,
  sequenceStatuses,
  activityTypes,
  activityChannels,
  callOutcomes,
} from "@shared/schema";
import pLimit from "p-limit";
import pRetry from "p-retry";
import { 
  getCountiesByState, 
  type CountyData 
} from "./county-data";
import { enrichLead, enrichLeadsBatch, enrichLeadWithRealData } from "./enrichment";
import { calculateLeadScore, scoreAllLeads } from "./scoring";
import { scrapeRealCountyData } from "./real-data-scraper";
import { queueAutoScrapeForIcp, findMatchingLeadTargets } from "./icp-scraper";
import { generateIcpSuggestions } from "./icp-ai";
import { matchLeadsToIcp, findBestIcpForLead } from "./icp-matcher";

// Lazy initialization of Anthropic client to avoid crashes if env vars aren't set
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || "",
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
  }
  return anthropicClient;
}

const STATE_ABBREVIATIONS: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
  "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
  "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
  "District of Columbia": "DC"
};

const ABBREVIATION_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBREVIATIONS).map(([name, abbr]) => [abbr, name])
);

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

interface AiEnrichmentResult {
  techMaturityScore: number;
  painPoints: string[];
  estimatedBudget: string;
}

async function enrichCountyWithAI(
  countyName: string,
  state: string,
  population: number | null | undefined,
  department: string
): Promise<AiEnrichmentResult> {
  const prompt = `Analyze this US county government department and provide technology insights.

COUNTY: ${countyName}
STATE: ${state}
POPULATION: ${population?.toLocaleString() || "Unknown"}
DEPARTMENT: ${department}

Based on typical government technology patterns, population size, and regional characteristics, provide:

1. A tech maturity score (1-10) where:
   - 1-3: Very low tech adoption, mostly paper-based processes
   - 4-6: Basic digital systems, some legacy software
   - 7-8: Modern systems with some automation
   - 9-10: Advanced tech adoption, cloud-first approach

2. The top 3 most likely technology pain points this department faces

3. An estimated annual IT/technology budget range based on population and department type

Respond ONLY with valid JSON in this exact format:
{
  "techMaturityScore": <number 1-10>,
  "painPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "estimatedBudget": "$X - $Y"
}`;

  try {
    const message = await pRetry(
      async () => {
        return await getAnthropicClient().messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        });
      },
      {
        retries: 2,
        onFailedAttempt: (error) => {
          console.log(`AI enrichment attempt ${error.attemptNumber} failed for ${countyName}. ${error.retriesLeft} retries left.`);
        },
      }
    );

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected AI response type");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        techMaturityScore: Math.max(1, Math.min(10, parsed.techMaturityScore || 5)),
        painPoints: parsed.painPoints || ["Legacy system integration", "Manual data processing", "Citizen service efficiency"],
        estimatedBudget: parsed.estimatedBudget || "Unknown",
      };
    }
  } catch (error) {
    console.error(`AI enrichment failed for ${countyName}:`, error);
  }

  const baseScore = population && population > 500000 ? 6 : population && population > 100000 ? 5 : 4;
  return {
    techMaturityScore: baseScore,
    painPoints: [
      "Legacy system modernization needed",
      "Manual processes reducing efficiency",
      "Data silos across departments"
    ],
    estimatedBudget: population ? `$${Math.round(population * 15 / 1000000)}M - $${Math.round(population * 25 / 1000000)}M` : "Unknown",
  };
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

function formatPhoneNumber(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
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
  
  // Health check endpoint for deployment - must respond quickly
  app.get("/healthz", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });


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

  app.get("/api/leads/top-scored", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const leads = await storage.getTopScoredLeads(Math.min(limit, 50));
      res.json(leads);
    } catch (error) {
      console.error("Error fetching top scored leads:", error);
      res.status(500).json({ error: "Failed to fetch top scored leads" });
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
      const scriptStyle = req.query.style as ScriptStyle | undefined;
      const script = await storage.getScriptByLeadId(leadId, scriptStyle);
      if (!script) {
        return res.status(404).json({ error: "Script not found" });
      }
      res.json(script);
    } catch (error) {
      console.error("Error fetching script:", error);
      res.status(500).json({ error: "Failed to fetch script" });
    }
  });

  app.get("/api/leads/:id/scripts", async (req: Request, res: Response) => {
    try {
      const leadId = parseInt(req.params.id);
      if (isNaN(leadId)) {
        return res.status(400).json({ error: "Invalid lead ID" });
      }
      const scripts = await storage.getScriptsByLeadId(leadId);
      res.json(scripts);
    } catch (error) {
      console.error("Error fetching scripts:", error);
      res.status(500).json({ error: "Failed to fetch scripts" });
    }
  });

  const generateScriptSchema = z.object({
    scriptStyle: z.enum(scriptStyles).default("consultative"),
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

      const parseResult = generateScriptSchema.safeParse(req.body);
      const scriptStyle: ScriptStyle = parseResult.success ? parseResult.data.scriptStyle : "consultative";

      const companyProfile = await storage.getCompanyProfile();

      const companyContext = companyProfile ? `COMPANY INFORMATION (rltx.ai - "Palantir for AI"):
- Company: ${companyProfile.companyName}
- Tagline: ${companyProfile.tagline || "Palantir for AI - End-to-end custom AI systems"}
- Description: ${companyProfile.description || "We build end-to-end custom AI systems that transform government operations"}
- Services: ${companyProfile.services?.join(", ") || "Custom AI Development, RAG Systems, AI Agents, Enterprise AI Platforms"}
- Capabilities: ${companyProfile.capabilities?.join(", ") || "End-to-end AI development, Legacy system integration, Custom LLM solutions"}
- Price Range: ${companyProfile.priceRange || "$10,000 - $500,000"}
- Target Markets: ${companyProfile.targetMarkets?.join(", ") || "Government, Enterprise"}
- Unique Selling Points: ${companyProfile.uniqueSellingPoints?.join(", ") || "Full-service AI development, Government-focused expertise"}
- Competitive Advantages: ${companyProfile.competitiveAdvantages?.join(", ") || "End-to-end delivery, Compliance-first approach"}` 
      : `COMPANY INFORMATION (rltx.ai - "Palantir for AI"):
- Company: rltx.ai
- Tagline: Palantir for AI - End-to-end custom AI systems for any need
- Services: Custom AI Development, RAG Systems, AI Agents, Intelligent Document Processing, Enterprise AI Platforms
- Price Range: $10,000 - $500,000
- Target Markets: Government and enterprise organizations seeking custom AI solutions
- Value: Custom AI solutions that integrate with legacy systems, automate workflows, and improve citizen services`;

      const enrichmentContext = `LEAD ENRICHMENT DATA:
${lead.decisionMakers && lead.decisionMakers.length > 0 ? `- Decision Makers: ${lead.decisionMakers.map(dm => `${dm.name} (${dm.title})`).join(", ")}` : "- Decision Makers: Unknown"}
${lead.painPoints && lead.painPoints.length > 0 ? `- Known Pain Points: ${lead.painPoints.join(", ")}` : "- Pain Points: To be discovered"}
${lead.techStack && lead.techStack.length > 0 ? `- Current Tech Stack: ${lead.techStack.join(", ")}` : "- Tech Stack: Unknown"}
${lead.buyingSignals && lead.buyingSignals.length > 0 ? `- Buying Signals: ${lead.buyingSignals.join(", ")}` : "- Buying Signals: None identified"}
${lead.recentNews && lead.recentNews.length > 0 ? `- Recent News: ${lead.recentNews.map(n => n.title).join("; ")}` : ""}`;

      const leadContext = `LEAD INFORMATION:
- Institution: ${lead.institutionName}
- Type: ${lead.institutionType}
- Department: ${lead.department || "General Administration"}
- State: ${lead.state}
- County: ${lead.county || "N/A"}
- City: ${lead.city || "N/A"}
- Population Served: ${lead.population?.toLocaleString() || "Unknown"}
- Annual Budget: ${lead.annualBudget || "Unknown"}
- Tech Maturity Score: ${lead.techMaturityScore || "Unknown"}/10
- Current Status: ${lead.status}

${enrichmentContext}`;

      const stylePrompts: Record<ScriptStyle, string> = {
        consultative: `SCRIPT STYLE: CONSULTATIVE
This script should position you as a trusted advisor/partner, NOT a salesperson.

KEY CHARACTERISTICS:
- Open with an insight about their specific situation that shows you've done research
- Ask discovery questions to understand their unique challenges
- Listen-first approach - let them share before pitching
- Position solutions as recommendations based on their needs
- Focus on building trust and long-term relationship

TONE: Thoughtful, curious, collaborative, expert-but-humble`,

        direct_value: `SCRIPT STYLE: DIRECT VALUE PROPOSITION
This script should lead with immediate, quantifiable value. No fluff, get to the point fast.

KEY CHARACTERISTICS:
- Open with an immediate value statement backed by numbers
- Quantified benefits upfront (time saved, cost reduction, efficiency gains)
- Clear ROI messaging within the first 30 seconds
- Respect their time - busy government officials appreciate directness
- Focus on speed, clarity, and concrete outcomes

TONE: Confident, direct, data-driven, respectful of their time`,

        question_led: `SCRIPT STYLE: QUESTION-LED (SOCRATIC METHOD)
This script should use strategic questions to guide the prospect to self-diagnose their problems.

KEY CHARACTERISTICS:
- Open with a thought-provoking question that highlights a common challenge
- Use the Socratic method to guide discovery
- Let the prospect articulate their own pain points
- Each question should build on the previous answer
- They should conclude they need a solution before you pitch one
- Focus on engagement, buy-in, and self-discovery

TONE: Curious, engaging, strategic, patient`,

        pain_agitate_solution: `SCRIPT STYLE: PAIN-AGITATE-SOLUTION (PAS)
This script should identify pain, amplify the consequences, then present relief.

KEY CHARACTERISTICS:
- Open by naming a specific pain point they likely experience
- Agitate - vividly describe the consequences of inaction (wasted time, frustrated citizens, budget overruns)
- Let them feel the weight of the problem
- Present the solution as relief from that pain
- Focus on emotional resonance and urgency

TONE: Empathetic but urgent, understanding the struggle, offering hope`,
      };

      const prompt = `You are an expert cold-call script writer for rltx.ai. Generate a compelling cold-call script using the specified style.

${companyContext}

${leadContext}

${stylePrompts[scriptStyle]}

Generate a JSON response with EXACTLY this structure:
{
  "opener": "The opening line/paragraph of the call - tailored to the script style",
  "talkingPoints": ["Key point 1 to cover", "Key point 2 to cover", "Key point 3 to cover", "Key point 4 to cover", "Key point 5 to cover"],
  "valueProposition": "The core value proposition statement - what makes rltx.ai valuable for THIS specific lead",
  "objectionHandlers": [
    {"objection": "Budget constraints", "response": "Tailored response to budget concerns"},
    {"objection": "Already have a system", "response": "Response about integration and enhancement"},
    {"objection": "Need to go through procurement", "response": "Response about procurement experience"},
    {"objection": "Not a priority right now", "response": "Response about timing and quick wins"}
  ],
  "closingStatement": "A clear, style-appropriate call-to-action for next steps",
  "fullScript": "The complete script written out as you would speak it, with clear sections and natural flow"
}

IMPORTANT:
- Make the script specific to ${lead.institutionName} and their context
- Reference their department (${lead.department || "administration"}), state (${lead.state}), and situation
- If there are known pain points or decision makers, incorporate them naturally
- The fullScript should be a complete, ready-to-use cold call script of 300-500 words
- Keep the style consistent throughout - ${scriptStyle} approach`;

      const message = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
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
          opener: `Hi, this is calling from rltx.ai. I'm reaching out because we specialize in building custom AI solutions for government organizations like ${lead.institutionName}.`,
          talkingPoints: [
            "Legacy system modernization challenges",
            "Manual process automation opportunities",
            "Citizen service improvement potential",
            "Data integration across departments",
            "Compliance and security requirements"
          ],
          valueProposition: `rltx.ai helps government organizations like ${lead.institutionName} transform operations with custom AI solutions - from document processing to citizen services - typically seeing 40-60% efficiency improvements.`,
          objectionHandlers: [
            { objection: "Budget constraints", response: "Many of our government clients start with a smaller pilot project to demonstrate ROI before committing to larger implementations." },
            { objection: "Already have a system", response: "Our solutions are designed to integrate with and enhance your current infrastructure, not replace everything." },
            { objection: "Need to go through procurement", response: "We're very familiar with government procurement processes and can provide all documentation needed for RFP responses." },
            { objection: "Not a priority right now", response: "I understand. Many organizations find that a quick assessment helps them plan for when the timing is right. Would a brief overview be helpful?" }
          ],
          closingStatement: "Would you be open to a brief 15-minute call next week where I could show you a case study of similar work we've done?",
          fullScript: `Hi, this is calling from rltx.ai. I'm reaching out because we specialize in building custom AI solutions for government organizations like ${lead.institutionName}. Do you have a few minutes to discuss how we might help streamline your operations?\n\nBased on my research, many ${lead.institutionType} organizations face challenges with legacy systems, manual data entry, and citizen service response times. Is that something you're experiencing?\n\nWe've helped government organizations implement AI-powered solutions that automate routine tasks, improve data accessibility, and enhance citizen services. Our solutions range from $10K for focused projects to $500K for comprehensive enterprise systems.\n\nWould you be open to a brief 15-minute call next week where I could show you a case study of similar work we've done?`
        };
      }

      const script = await storage.createScript({
        leadId,
        scriptStyle,
        opener: scriptData.opener,
        talkingPoints: scriptData.talkingPoints || [],
        valueProposition: scriptData.valueProposition,
        objectionHandlers: scriptData.objectionHandlers || [],
        closingStatement: scriptData.closingStatement,
        fullScript: scriptData.fullScript,
      });

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

      const message = await getAnthropicClient().messages.create({
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

  app.post("/api/company-profile/scrape-website", async (req: Request, res: Response) => {
    try {
      const tavilyApiKey = process.env.TAVILY_API_KEY;
      if (!tavilyApiKey) {
        return res.status(500).json({ error: "TAVILY_API_KEY not configured" });
      }

      const tavilyResponse = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: "rltx.ai company services capabilities AI solutions artificial intelligence custom software",
          search_depth: "advanced",
          include_raw_content: true,
          max_results: 5,
        }),
      });

      if (!tavilyResponse.ok) {
        throw new Error(`Tavily API error: ${tavilyResponse.status}`);
      }

      const tavilyData = await tavilyResponse.json() as {
        results: Array<{
          title: string;
          url: string;
          content: string;
          raw_content?: string;
        }>;
      };

      const searchResults = tavilyData.results
        .map((r) => `URL: ${r.url}\nTitle: ${r.title}\nContent: ${r.raw_content || r.content}`)
        .join("\n\n---\n\n");

      const prompt = `Analyze the following search results about rltx.ai and extract comprehensive company intelligence. The company positions itself as "Palantir for AI" - building end-to-end custom AI systems for any need.

SEARCH RESULTS:
${searchResults}

Based on the search results and the company's positioning, generate a comprehensive company profile. If information is not available in the search results, infer reasonable details based on the "Palantir for AI" positioning - they build end-to-end custom AI systems including RAG systems, AI agents, custom LLM solutions, and enterprise AI platforms.

Generate a JSON response with the following structure:
{
  "companyName": "rltx.ai",
  "tagline": "Palantir for AI - End-to-end custom AI systems for any need",
  "description": "A comprehensive 2-3 sentence description of the company",
  "services": ["Service 1", "Service 2", "Service 3", "Service 4", "Service 5"],
  "capabilities": ["Technical capability 1", "Technical capability 2", "Technical capability 3", "Technical capability 4"],
  "caseStudies": [
    {"title": "Case Study Title", "description": "Brief description of the project", "results": "Quantifiable results achieved"},
    {"title": "Case Study Title 2", "description": "Brief description", "results": "Results"}
  ],
  "targetMarkets": ["Target market 1", "Target market 2", "Target market 3"],
  "priceRange": "$X - $Y per project",
  "uniqueSellingPoints": ["USP 1", "USP 2", "USP 3", "USP 4"],
  "competitiveAdvantages": ["Advantage 1", "Advantage 2", "Advantage 3"]
}

Focus on making the content compelling for enterprise and government decision-makers.`;

      const message = await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      let profileData;
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        profileData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }

      const scrapedUrl = tavilyData.results[0]?.url || "https://rltx.ai";

      const profile = await storage.upsertCompanyProfile({
        companyName: profileData.companyName || "rltx.ai",
        tagline: profileData.tagline || "Palantir for AI - End-to-end custom AI systems for any need",
        description: profileData.description,
        services: profileData.services,
        capabilities: profileData.capabilities,
        caseStudies: profileData.caseStudies,
        targetMarkets: profileData.targetMarkets,
        priceRange: profileData.priceRange,
        uniqueSellingPoints: profileData.uniqueSellingPoints,
        competitiveAdvantages: profileData.competitiveAdvantages,
        scrapedFromUrl: scrapedUrl,
        lastScrapedAt: new Date(),
        manuallyEdited: false,
      });

      res.json(profile);
    } catch (error) {
      console.error("Error scraping company website:", error);
      
      const fallbackProfile = await storage.upsertCompanyProfile({
        companyName: "rltx.ai",
        tagline: "Palantir for AI - End-to-end custom AI systems for any need",
        description: "rltx.ai builds end-to-end custom AI systems that transform how organizations operate. From intelligent document processing to AI-powered automation, we deliver enterprise-grade AI solutions tailored to your specific needs.",
        services: [
          "Custom AI Software Development",
          "RAG (Retrieval-Augmented Generation) Systems",
          "AI Agents & Automation",
          "Intelligent Document Processing",
          "Enterprise AI Platform Development",
          "LLM Fine-tuning & Deployment",
        ],
        capabilities: [
          "End-to-end AI system architecture",
          "Custom LLM development and fine-tuning",
          "RAG system implementation",
          "AI agent orchestration",
          "Enterprise system integration",
          "Government compliance & security",
        ],
        caseStudies: [
          {
            title: "Government Records Automation",
            description: "Implemented AI-powered document processing for a county government",
            results: "70% reduction in processing time, 95% accuracy rate",
          },
          {
            title: "Enterprise Knowledge Platform",
            description: "Built a RAG-based knowledge management system for a Fortune 500 company",
            results: "50% faster information retrieval, 80% reduction in support tickets",
          },
        ],
        targetMarkets: [
          "Government & Public Sector",
          "Enterprise Organizations",
          "Healthcare & Life Sciences",
          "Financial Services",
          "Legal & Compliance",
        ],
        priceRange: "$25,000 - $500,000+",
        uniqueSellingPoints: [
          "Palantir-level capabilities at accessible price points",
          "End-to-end delivery from concept to production",
          "Government-grade security and compliance",
          "Rapid prototyping with 2-week proof of concept",
        ],
        competitiveAdvantages: [
          "Deep expertise in RAG and custom LLM solutions",
          "Proven government and enterprise implementations",
          "Flexible engagement models from pilot to enterprise",
          "In-house AI research and development capabilities",
        ],
        lastScrapedAt: new Date(),
        manuallyEdited: false,
      });
      
      res.json(fallbackProfile);
    }
  });

  app.put("/api/company-profile", async (req: Request, res: Response) => {
    try {
      const profileData = req.body;
      
      const profile = await storage.upsertCompanyProfile({
        ...profileData,
        manuallyEdited: true,
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating company profile:", error);
      res.status(500).json({ error: "Failed to update company profile" });
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

                    // Fetch real contact data from government websites using Tavily + Claude
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

                    // Build decision makers array from scraped data
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

  // ICP Profile routes
  app.get("/api/icp", async (req: Request, res: Response) => {
    try {
      await storage.seedDefaultIcps();
      const profiles = await storage.getIcpProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching ICP profiles:", error);
      res.status(500).json({ error: "Failed to fetch ICP profiles" });
    }
  });

  app.get("/api/icp/:id", async (req: Request, res: Response) => {
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

  const updateIcpSchema = z.object({
    displayName: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    autoScrapeEnabled: z.boolean().optional(),
    targetCriteria: targetCriteriaSchema.optional(),
    searchQueries: z.array(z.string()).optional(),
  });

  app.put("/api/icp/:id", async (req: Request, res: Response) => {
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

  app.get("/api/icp/:id/matching-leads", async (req: Request, res: Response) => {
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

  app.post("/api/icp/:id/ai-suggest", async (req: Request, res: Response) => {
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
        ? `${companyProfile.name} - ${companyProfile.description}. Services: ${(companyProfile.services || []).join(", ")}`
        : undefined;

      console.log(`Generating AI suggestions for ICP: ${profile.displayName}`);
      const suggestions = await generateIcpSuggestions(profile, companyContext);
      
      res.json(suggestions);
    } catch (error) {
      console.error("Error generating ICP suggestions:", error);
      res.status(500).json({ error: "Failed to generate AI suggestions" });
    }
  });

  // ICP Lead Matching - Get leads scored against ICP criteria
  app.get("/api/icp/:id/matched-leads", async (req: Request, res: Response) => {
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
      
      // Return top 50 best matches with lead details
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

  // Get best ICP match for a specific lead
  app.get("/api/leads/:id/icp-match", async (req: Request, res: Response) => {
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
      const bestMatch = findBestIcpForLead(lead, icpProfiles);
      
      res.json({
        leadId: id,
        leadName: lead.institutionName,
        bestMatch,
      });
    } catch (error) {
      console.error("Error finding ICP match for lead:", error);
      res.status(500).json({ error: "Failed to find ICP match" });
    }
  });

  app.post("/api/icp/:id/trigger-scrape", async (req: Request, res: Response) => {
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
        states: [...new Set(targets.map(t => t.county.state))],
      });
    } catch (error) {
      console.error("Error triggering ICP scrape:", error);
      res.status(500).json({ error: "Failed to trigger ICP scrape" });
    }
  });

  app.get("/api/icp/:id/matching-targets", async (req: Request, res: Response) => {
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
      const states = [...new Set(targets.map(t => t.county.state))];
      
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

  app.post("/api/leads/:id/enrich", async (req: Request, res: Response) => {
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

  app.post("/api/leads/:id/enrich-real", async (req: Request, res: Response) => {
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
      
      const mergedPainPoints = [...new Set([...existingPainPoints, ...enrichmentResult.painPoints])];
      const mergedDecisionMakers = [
        ...existingDecisionMakers,
        ...enrichmentResult.decisionMakers.filter(
          (newDm) => !existingDecisionMakers.some((existing) => existing.name === newDm.name)
        ),
      ];
      
      const existingTechStack = lead.techStack || [];
      const mergedTechStack = [...new Set([...existingTechStack, ...enrichmentResult.techStack])];
      
      const existingBuyingSignals = lead.buyingSignals || [];
      const mergedBuyingSignals = [...new Set([...existingBuyingSignals, ...enrichmentResult.buyingSignals])];

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

  const batchEnrichSchema = z.object({
    leadIds: z.array(z.number()).min(1).max(10),
  });

  app.post("/api/leads/enrich-batch", async (req: Request, res: Response) => {
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
      for (const [leadId, enrichmentResult] of results) {
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

  app.get("/api/leads/:id/enrichment", async (req: Request, res: Response) => {
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

  app.post("/api/leads/:id/score", async (req: Request, res: Response) => {
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

  app.post("/api/leads/score-all", async (req: Request, res: Response) => {
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

  // ============================================
  // EMAIL SEQUENCE ENDPOINTS
  // ============================================

  // GET /api/sequences - list all sequences
  app.get("/api/sequences", async (req: Request, res: Response) => {
    try {
      const sequences = await storage.getAllSequences();
      res.json(sequences);
    } catch (error) {
      console.error("Error fetching sequences:", error);
      res.status(500).json({ error: "Failed to fetch sequences" });
    }
  });

  // POST /api/sequences - create new sequence
  app.post("/api/sequences", async (req: Request, res: Response) => {
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

  // GET /api/sequences/:id - get sequence with steps
  app.get("/api/sequences/:id", async (req: Request, res: Response) => {
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

  // PUT /api/sequences/:id - update sequence
  app.put("/api/sequences/:id", async (req: Request, res: Response) => {
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

  // DELETE /api/sequences/:id - delete sequence
  app.delete("/api/sequences/:id", async (req: Request, res: Response) => {
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

  // POST /api/sequences/:id/steps - add step to sequence
  app.post("/api/sequences/:id/steps", async (req: Request, res: Response) => {
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

  // PUT /api/sequences/:id/steps/:stepId - update step
  app.put("/api/sequences/:id/steps/:stepId", async (req: Request, res: Response) => {
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

  // DELETE /api/sequences/:id/steps/:stepId - delete step
  app.delete("/api/sequences/:id/steps/:stepId", async (req: Request, res: Response) => {
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

  // POST /api/sequences/:id/enroll - enroll leads in sequence
  const enrollLeadsSchema = z.object({
    leadIds: z.array(z.number()).min(1, "At least one lead ID is required"),
  });

  app.post("/api/sequences/:id/enroll", async (req: Request, res: Response) => {
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

  // GET /api/sequences/:id/enrollments - get enrollments for a sequence
  app.get("/api/sequences/:id/enrollments", async (req: Request, res: Response) => {
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

  // POST /api/sequences/:id/render-template - render template with lead data
  const renderTemplateSchema = z.object({
    leadId: z.number(),
    subject: z.string().optional(),
    bodyTemplate: z.string(),
  });

  app.post("/api/sequences/:id/render-template", async (req: Request, res: Response) => {
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

  // GET /api/template-variables - get list of available template variables
  app.get("/api/template-variables", (req: Request, res: Response) => {
    res.json(getAvailableTemplateVariables());
  });

  // ============================================
  // OUTREACH ACTIVITY TRACKING ENDPOINTS
  // ============================================

  // Validation schemas for activities
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

  // POST /api/activities - log a new activity
  app.post("/api/activities", async (req: Request, res: Response) => {
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

  // GET /api/activities/stats - get aggregated activity stats
  app.get("/api/activities/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getActivityStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching activity stats:", error);
      res.status(500).json({ error: "Failed to fetch activity stats" });
    }
  });

  // GET /api/leads/:id/activities - get activities for a lead
  app.get("/api/leads/:id/activities", async (req: Request, res: Response) => {
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

  // GET /api/sequences/:id/activities - get activities for a sequence
  app.get("/api/sequences/:id/activities", async (req: Request, res: Response) => {
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

  // PATCH /api/leads/:id/call-outcome - update lead with call outcome and log activity
  app.patch("/api/leads/:id/call-outcome", async (req: Request, res: Response) => {
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

      // Update lead with call outcome
      const updatedLead = await storage.updateLeadCallOutcome(leadId, outcome, notes);
      if (!updatedLead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Also log an activity for this call
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

  // ============================================
  // ANALYTICS ENDPOINTS
  // ============================================

  // Conversion funnel data
  app.get("/api/analytics/funnel", async (req: Request, res: Response) => {
    try {
      const leads = await storage.getAllLeads();
      const activityStats = await storage.getActivityStats();

      const funnel = {
        totalLeads: leads.length,
        enrichedLeads: leads.filter(l => l.enrichedAt !== null).length,
        contactedLeads: leads.filter(l => l.status !== "not_contacted").length,
        respondedLeads: leads.filter(l => 
          l.lastCallOutcome === "interested" || 
          l.lastCallOutcome === "callback_scheduled" || 
          l.lastCallOutcome === "meeting_scheduled"
        ).length,
        meetingsBooked: leads.filter(l => l.lastCallOutcome === "meeting_scheduled").length,
        wonDeals: leads.filter(l => l.status === "closed_won").length,
      };

      res.json(funnel);
    } catch (error) {
      console.error("Error fetching funnel data:", error);
      res.status(500).json({ error: "Failed to fetch funnel data" });
    }
  });

  // Response rates by channel
  app.get("/api/analytics/response-rates", async (req: Request, res: Response) => {
    try {
      const activityStats = await storage.getActivityStats();

      const responseRates = {
        email: {
          sent: activityStats.emailsSent,
          opened: activityStats.emailsOpened,
          replied: activityStats.emailsReplied,
          openRate: activityStats.emailsSent > 0 
            ? Math.round((activityStats.emailsOpened / activityStats.emailsSent) * 100) 
            : 0,
          replyRate: activityStats.emailsSent > 0 
            ? Math.round((activityStats.emailsReplied / activityStats.emailsSent) * 100) 
            : 0,
        },
        phone: {
          callsMade: activityStats.callsMade,
          answered: activityStats.callsAnswered,
          meetingsBooked: activityStats.meetingsScheduled,
          answerRate: activityStats.callsMade > 0 
            ? Math.round((activityStats.callsAnswered / activityStats.callsMade) * 100) 
            : 0,
        },
        linkedin: {
          sent: activityStats.linkedinSent,
          connected: activityStats.linkedinConnected,
          replied: 0, // Not tracked separately in current schema
        },
      };

      res.json(responseRates);
    } catch (error) {
      console.error("Error fetching response rates:", error);
      res.status(500).json({ error: "Failed to fetch response rates" });
    }
  });

  // Performance by ICP
  app.get("/api/analytics/by-icp", async (req: Request, res: Response) => {
    try {
      const icpProfiles = await storage.getIcpProfiles();
      const leads = await storage.getAllLeads();

      const icpPerformance = await Promise.all(
        icpProfiles.map(async (icp) => {
          const matchingLeads = leads.filter(lead => {
            const criteria = icp.targetCriteria;
            if (!criteria) return false;
            
            // Check population range
            if (criteria.minPopulation && (!lead.population || lead.population < criteria.minPopulation)) return false;
            if (criteria.maxPopulation && lead.population && lead.population > criteria.maxPopulation) return false;
            
            // Check states
            if (criteria.states && criteria.states.length > 0 && !criteria.states.includes(lead.state)) return false;
            
            // Check departments
            if (criteria.departments && criteria.departments.length > 0 && lead.department) {
              const matchesDept = criteria.departments.some(d => 
                lead.department?.toLowerCase().includes(d.toLowerCase())
              );
              if (!matchesDept) return false;
            }
            
            return true;
          });

          const respondedLeads = matchingLeads.filter(l => 
            l.lastCallOutcome === "interested" || 
            l.lastCallOutcome === "callback_scheduled" || 
            l.lastCallOutcome === "meeting_scheduled"
          );

          const meetingsBooked = matchingLeads.filter(l => 
            l.lastCallOutcome === "meeting_scheduled"
          ).length;

          const avgScore = matchingLeads.length > 0
            ? Math.round(matchingLeads.reduce((sum, l) => sum + (l.priorityScore || 0), 0) / matchingLeads.length)
            : 0;

          return {
            icpId: icp.id,
            icpName: icp.displayName,
            isActive: icp.isActive,
            leadCount: matchingLeads.length,
            responseRate: matchingLeads.length > 0
              ? Math.round((respondedLeads.length / matchingLeads.length) * 100)
              : 0,
            meetingsBooked,
            avgScore,
          };
        })
      );

      res.json(icpPerformance);
    } catch (error) {
      console.error("Error fetching ICP analytics:", error);
      res.status(500).json({ error: "Failed to fetch ICP analytics" });
    }
  });

  // Geographic breakdown by state
  app.get("/api/analytics/by-state", async (req: Request, res: Response) => {
    try {
      const leads = await storage.getAllLeads();

      const stateMap = new Map<string, { 
        state: string; 
        leadCount: number; 
        contacted: number;
        responded: number;
        meetings: number;
      }>();

      for (const lead of leads) {
        const state = lead.state;
        if (!stateMap.has(state)) {
          stateMap.set(state, { state, leadCount: 0, contacted: 0, responded: 0, meetings: 0 });
        }
        const stateData = stateMap.get(state)!;
        stateData.leadCount++;
        
        if (lead.status !== "not_contacted") {
          stateData.contacted++;
        }
        
        if (lead.lastCallOutcome === "interested" || 
            lead.lastCallOutcome === "callback_scheduled" || 
            lead.lastCallOutcome === "meeting_scheduled") {
          stateData.responded++;
        }
        
        if (lead.lastCallOutcome === "meeting_scheduled") {
          stateData.meetings++;
        }
      }

      const stateAnalytics = Array.from(stateMap.values())
        .map(s => ({
          ...s,
          responseRate: s.contacted > 0 ? Math.round((s.responded / s.contacted) * 100) : 0,
        }))
        .sort((a, b) => b.leadCount - a.leadCount);

      res.json(stateAnalytics);
    } catch (error) {
      console.error("Error fetching state analytics:", error);
      res.status(500).json({ error: "Failed to fetch state analytics" });
    }
  });

  // Activity over time
  app.get("/api/analytics/over-time", async (req: Request, res: Response) => {
    try {
      const leads = await storage.getAllLeads();
      const period = (req.query.period as string) || "week"; // day, week, month

      // Get leads created over time (last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dateMap = new Map<string, { 
        date: string; 
        leadsCreated: number; 
        leadsContacted: number;
        meetingsBooked: number;
      }>();

      // Initialize last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        dateMap.set(dateKey, { date: dateKey, leadsCreated: 0, leadsContacted: 0, meetingsBooked: 0 });
      }

      // Count leads created per day
      for (const lead of leads) {
        if (lead.createdAt && lead.createdAt >= thirtyDaysAgo) {
          const dateKey = new Date(lead.createdAt).toISOString().split('T')[0];
          if (dateMap.has(dateKey)) {
            dateMap.get(dateKey)!.leadsCreated++;
          }
        }
        
        // Count contacts per day
        if (lead.lastContactedAt && lead.lastContactedAt >= thirtyDaysAgo) {
          const dateKey = new Date(lead.lastContactedAt).toISOString().split('T')[0];
          if (dateMap.has(dateKey)) {
            dateMap.get(dateKey)!.leadsContacted++;
          }
        }
      }

      const timeSeriesData = Array.from(dateMap.values())
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json(timeSeriesData);
    } catch (error) {
      console.error("Error fetching time series data:", error);
      res.status(500).json({ error: "Failed to fetch time series data" });
    }
  });

  return httpServer;
}

// ============================================
// EMAIL TEMPLATE RENDERING HELPER
// ============================================

function renderEmailTemplate(template: string, lead: GovernmentLead): string {
  const primaryContact = lead.decisionMakers?.[0];
  const variables: Record<string, string> = {
    institutionName: lead.institutionName || "",
    contactName: primaryContact?.name || "Decision Maker",
    department: lead.department || "your department",
    painPoints: lead.painPoints?.join(", ") || "operational challenges",
    buyingSignals: lead.buyingSignals?.join(", ") || "",
    recentNews: lead.recentNews?.map(n => n.title).join("; ") || "",
    state: lead.state || "",
    county: lead.county || "",
    city: lead.city || "",
    institutionType: lead.institutionType || "",
    population: lead.population?.toLocaleString() || "N/A",
    annualBudget: lead.annualBudget || "N/A",
    techStack: lead.techStack?.join(", ") || "",
    techMaturityScore: lead.techMaturityScore?.toString() || "N/A",
    email: lead.email || "",
    phoneNumber: lead.phoneNumber || "",
    website: lead.website || "",
    contactTitle: primaryContact?.title || "",
    contactEmail: primaryContact?.email || "",
    contactPhone: primaryContact?.phone || "",
  };

  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "gi");
    rendered = rendered.replace(regex, value);
  }
  return rendered;
}

function getAvailableTemplateVariables(): Array<{ variable: string; description: string }> {
  return [
    { variable: "{{institutionName}}", description: "Name of the government institution" },
    { variable: "{{contactName}}", description: "Primary contact/decision maker name" },
    { variable: "{{department}}", description: "Department within the institution" },
    { variable: "{{painPoints}}", description: "Known pain points (comma-separated)" },
    { variable: "{{buyingSignals}}", description: "Identified buying signals" },
    { variable: "{{recentNews}}", description: "Recent news about the institution" },
    { variable: "{{state}}", description: "State location" },
    { variable: "{{county}}", description: "County location" },
    { variable: "{{city}}", description: "City location" },
    { variable: "{{institutionType}}", description: "Type of institution (county, city, etc.)" },
    { variable: "{{population}}", description: "Population served" },
    { variable: "{{annualBudget}}", description: "Annual budget" },
    { variable: "{{techStack}}", description: "Current technology stack" },
    { variable: "{{techMaturityScore}}", description: "Technology maturity score (1-10)" },
    { variable: "{{email}}", description: "Institution email address" },
    { variable: "{{phoneNumber}}", description: "Institution phone number" },
    { variable: "{{website}}", description: "Institution website" },
    { variable: "{{contactTitle}}", description: "Primary contact's job title" },
    { variable: "{{contactEmail}}", description: "Primary contact's email" },
    { variable: "{{contactPhone}}", description: "Primary contact's phone" },
  ];
}
