import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import pRetry from "p-retry";
import { storage } from "./storage";
import type { IcpProfile, InsertGovernmentLead, PlaybookConfig, LeadSourceData } from "@shared/schema";
import { validateEmail } from "./email-validator";

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

const tavilyLimit = pLimit(2);

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  raw_content?: string;
}

interface TavilyResponse {
  results: TavilyResult[];
}

export interface ScrapingOptions {
  entities: Array<{
    name: string;
    state?: string;
    department?: string;
    entityType?: string;
  }>;
  maxResults?: number;
  dryRun?: boolean;
}

export interface ScrapeResult {
  success: boolean;
  leadsCreated: number;
  errors: string[];
  leads: Array<{
    institutionName: string;
    id?: number;
  }>;
}

interface ExtractedLeadData {
  institutionName: string;
  institutionType: string;
  department: string | null;
  state: string;
  phoneNumber: string | null;
  email: string | null;
  website: string | null;
  decisionMakerName: string | null;
  decisionMakerTitle: string | null;
  additionalContacts: Array<{
    name: string;
    title: string;
    phone?: string;
    email?: string;
  }>;
  sourceUrl: string | null;
  confidenceScore: number;
}

async function searchTavily(query: string): Promise<TavilyResult[]> {
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  if (!tavilyApiKey) {
    console.log("[PlaybookOrchestrator] TAVILY_API_KEY not configured, skipping search");
    return [];
  }

  return tavilyLimit(async () => {
    try {
      const response = await pRetry(
        async () => {
          const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: tavilyApiKey,
              query: query,
              search_depth: "advanced",
              include_raw_content: true,
              max_results: 5,
            }),
          });

          if (!res.ok) {
            throw new Error(`Tavily API error: ${res.status}`);
          }

          return res.json() as Promise<TavilyResponse>;
        },
        {
          retries: 2,
          onFailedAttempt: (error) => {
            console.log(`[PlaybookOrchestrator] Tavily search attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
          },
        }
      );

      return response.results || [];
    } catch (error) {
      console.error(`[PlaybookOrchestrator] Tavily search failed for query "${query}":`, error);
      return [];
    }
  });
}

function buildQueryFromTemplate(
  template: string,
  entity: { name: string; state?: string; department?: string }
): string {
  return template
    .replace(/\{entity\}/g, entity.name)
    .replace(/\{state\}/g, entity.state || "")
    .replace(/\{department\}/g, entity.department || "")
    .trim()
    .replace(/\s+/g, " ");
}

async function extractLeadDataWithClaude(
  entity: { name: string; state?: string; department?: string; entityType?: string },
  searchResults: TavilyResult[],
  playbookConfig: PlaybookConfig
): Promise<ExtractedLeadData | null> {
  if (searchResults.length === 0) {
    console.log(`[PlaybookOrchestrator] No search results to analyze for ${entity.name}`);
    return null;
  }

  const combinedContent = searchResults
    .slice(0, 5)
    .map((r) => `
URL: ${r.url}
Title: ${r.title}
Content: ${(r.raw_content || r.content || "").slice(0, 3000)}
---`)
    .join("\n");

  const entityType = entity.entityType || playbookConfig.targetEntityTypes?.[0] || "organization";
  const enrichmentHints = playbookConfig.enrichmentPromptHints || "";

  const prompt = `You are extracting contact information from search results for a lead generation system.

ENTITY: ${entity.name}
TYPE: ${entityType}
STATE: ${entity.state || "Unknown"}
DEPARTMENT/FOCUS: ${entity.department || "General"}

${enrichmentHints ? `SPECIFIC GUIDANCE: ${enrichmentHints}` : ""}

SEARCH RESULTS:
${combinedContent}

Extract ONLY information that is explicitly stated in the search results. Do NOT make up or guess any information.

Find:
1. The official website URL
2. A phone number for the organization or department
3. An email address (look for contact emails)
4. Decision maker name and title (key leadership)
5. Any additional staff contacts found

IMPORTANT: Only include information you can verify from the search results. If you cannot find a piece of information, set it to null.

Respond ONLY with valid JSON in this exact format:
{
  "phoneNumber": "extracted phone number or null",
  "email": "extracted email or null",
  "website": "official website URL or null",
  "decisionMakerName": "name of key official or null",
  "decisionMakerTitle": "their title or null",
  "additionalContacts": [
    {
      "name": "Staff name",
      "title": "Their title",
      "phone": "their direct phone or null",
      "email": "their email or null"
    }
  ],
  "confidenceScore": 75
}

The confidenceScore should be 0-100 based on how reliable the extracted data appears.`;

  try {
    const message = await pRetry(
      async () => {
        return await getAnthropicClient().messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        });
      },
      {
        retries: 2,
        onFailedAttempt: (error) => {
          console.log(`[PlaybookOrchestrator] Claude extraction attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
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
      
      const sourceUrl = searchResults[0]?.url || null;

      return {
        institutionName: entity.name,
        institutionType: entityType,
        department: entity.department || null,
        state: entity.state || "Unknown",
        phoneNumber: parsed.phoneNumber || null,
        email: parsed.email || null,
        website: parsed.website || null,
        decisionMakerName: parsed.decisionMakerName || null,
        decisionMakerTitle: parsed.decisionMakerTitle || null,
        additionalContacts: parsed.additionalContacts || [],
        sourceUrl,
        confidenceScore: parsed.confidenceScore || 50,
      };
    }
  } catch (error) {
    console.error(`[PlaybookOrchestrator] Claude extraction failed for ${entity.name}:`, error);
  }

  return null;
}

async function validateLeadEmails(leadData: ExtractedLeadData): Promise<ExtractedLeadData> {
  const validatedData = { ...leadData };

  if (validatedData.email) {
    const result = await validateEmail(validatedData.email);
    if (!result.isValid) {
      console.log(`[PlaybookOrchestrator] Invalid email discarded for ${validatedData.institutionName}: ${validatedData.email}`);
      validatedData.email = null;
    }
  }

  if (validatedData.additionalContacts.length > 0) {
    const validatedContacts = await Promise.all(
      validatedData.additionalContacts.map(async (contact) => {
        if (contact.email) {
          const result = await validateEmail(contact.email);
          if (!result.isValid) {
            return { ...contact, email: undefined };
          }
        }
        return contact;
      })
    );
    validatedData.additionalContacts = validatedContacts;
  }

  return validatedData;
}

async function scrapeWithTavily(
  entity: { name: string; state?: string; department?: string; entityType?: string },
  playbookConfig: PlaybookConfig
): Promise<ExtractedLeadData | null> {
  const queryTemplates = playbookConfig.queryTemplates || [];
  
  if (queryTemplates.length === 0) {
    console.log(`[PlaybookOrchestrator] No query templates configured for scraping`);
    return null;
  }

  const allResults: TavilyResult[] = [];

  for (const template of queryTemplates) {
    const query = buildQueryFromTemplate(template, entity);
    console.log(`[PlaybookOrchestrator] Executing Tavily search: "${query}"`);
    const results = await searchTavily(query);
    console.log(`[PlaybookOrchestrator] Found ${results.length} results`);
    allResults.push(...results);
  }

  const uniqueResults = allResults.filter((result, index, self) =>
    index === self.findIndex((r) => r.url === result.url)
  );

  console.log(`[PlaybookOrchestrator] Total unique results: ${uniqueResults.length}`);

  if (uniqueResults.length === 0) {
    return null;
  }

  const leadData = await extractLeadDataWithClaude(entity, uniqueResults, playbookConfig);
  
  if (leadData) {
    return await validateLeadEmails(leadData);
  }

  return null;
}

export async function scrapeForIcp(
  icpId: number,
  options: ScrapingOptions
): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    success: true,
    leadsCreated: 0,
    errors: [],
    leads: [],
  };

  // CRITICAL: Validate API keys are configured - no fallbacks allowed
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  const anthropicApiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  
  if (!tavilyApiKey) {
    result.success = false;
    result.errors.push("TAVILY_API_KEY is not configured. Real data scraping requires Tavily API access.");
    console.error("[PlaybookOrchestrator] FATAL: Cannot scrape without Tavily API key");
    return result;
  }
  
  if (!anthropicApiKey) {
    result.success = false;
    result.errors.push("AI_INTEGRATIONS_ANTHROPIC_API_KEY is not configured. Real data extraction requires Claude AI access.");
    console.error("[PlaybookOrchestrator] FATAL: Cannot extract data without Anthropic API key");
    return result;
  }

  const icp = await storage.getIcpProfile(icpId);
  if (!icp) {
    result.success = false;
    result.errors.push(`ICP profile not found: ${icpId}`);
    return result;
  }

  const playbookConfig = icp.playbookConfig;
  if (!playbookConfig) {
    result.success = false;
    result.errors.push(`No playbook configuration found for ICP: ${icp.displayName}`);
    return result;
  }

  console.log(`[PlaybookOrchestrator] Starting scrape for ICP: ${icp.displayName}`);
  console.log(`[PlaybookOrchestrator] Data sources: ${playbookConfig.dataSources?.join(", ") || "tavily_web"}`);
  console.log(`[PlaybookOrchestrator] Processing ${options.entities.length} entities`);

  const limit = pLimit(2);

  const promises = options.entities.map((entity) =>
    limit(async () => {
      try {
        let leadData: ExtractedLeadData | null = null;
        const dataSources = playbookConfig.dataSources || ["tavily_web"];

        for (const source of dataSources) {
          if (source === "tavily_web") {
            leadData = await scrapeWithTavily(entity, playbookConfig);
            if (leadData) break;
          }
        }

        if (!leadData) {
          console.log(`[PlaybookOrchestrator] No data found for entity: ${entity.name}`);
          return;
        }

        if (options.dryRun) {
          result.leads.push({ institutionName: leadData.institutionName });
          result.leadsCreated++;
          return;
        }

        const sourceData: LeadSourceData = {
          sourceUrl: leadData.sourceUrl,
          sourceType: "tavily_web",
          extractionMethod: "ai_extraction",
          verifiedAt: new Date().toISOString(),
          confidenceScore: leadData.confidenceScore,
        };

        const decisionMakers = leadData.decisionMakerName
          ? [
              {
                name: leadData.decisionMakerName,
                title: leadData.decisionMakerTitle || "Unknown",
                email: leadData.email,
                phone: leadData.phoneNumber,
              },
              ...leadData.additionalContacts.map((c) => ({
                name: c.name,
                title: c.title,
                email: c.email || null,
                phone: c.phone || null,
              })),
            ]
          : leadData.additionalContacts.map((c) => ({
              name: c.name,
              title: c.title,
              email: c.email || null,
              phone: c.phone || null,
            }));

        const insertLead: InsertGovernmentLead = {
          institutionName: leadData.institutionName,
          institutionType: leadData.institutionType,
          department: leadData.department,
          state: leadData.state,
          phoneNumber: leadData.phoneNumber,
          email: leadData.email,
          website: leadData.website,
          icpId: icpId,
          sourceData: sourceData,
          decisionMakers: decisionMakers.length > 0 ? decisionMakers : undefined,
          status: "not_contacted",
        };

        const createdLead = await storage.createLead(insertLead);
        result.leads.push({
          institutionName: createdLead.institutionName,
          id: createdLead.id,
        });
        result.leadsCreated++;

        console.log(`[PlaybookOrchestrator] Created lead: ${createdLead.institutionName} (ID: ${createdLead.id})`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to process entity ${entity.name}: ${errorMessage}`);
        console.error(`[PlaybookOrchestrator] Error processing ${entity.name}:`, error);
      }
    })
  );

  await Promise.all(promises);

  console.log(`[PlaybookOrchestrator] Scrape complete. Created ${result.leadsCreated} leads, ${result.errors.length} errors.`);

  if (result.errors.length > 0 && result.leadsCreated === 0) {
    result.success = false;
  }

  return result;
}

export function getPlaybookDataSources(): string[] {
  return [
    "tavily_web",
    "us_census",
    "cms_hospitals",
    "fdic_banks",
    "state_bar",
    "crunchbase",
  ];
}
