import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import pRetry from "p-retry";
import type { GovernmentLead, DecisionMaker, RecentNews, CompetitorAnalysis } from "@shared/schema";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

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

interface EnrichmentResult {
  decisionMakers: DecisionMaker[];
  techStack: string[];
  recentNews: RecentNews[];
  competitorAnalysis: CompetitorAnalysis[];
  buyingSignals: string[];
  enrichmentData: Record<string, unknown>;
  enrichmentScore: number;
}

async function searchTavily(query: string): Promise<TavilyResult[]> {
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  if (!tavilyApiKey) {
    throw new Error("TAVILY_API_KEY not configured");
  }

  return tavilyLimit(async () => {
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
          console.log(`Tavily search attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        },
      }
    );

    return response.results || [];
  });
}

function buildEnrichmentQueries(lead: GovernmentLead): string[] {
  const institutionName = lead.institutionName;
  const state = lead.state;
  const county = lead.county || "";

  return [
    `${institutionName} ${state} government officials leadership staff directory`,
    `${institutionName} ${state} technology software systems IT infrastructure`,
    `${institutionName} ${state} recent news initiatives projects 2024 2025`,
    `${institutionName} ${state} RFP bids contracts technology procurement`,
    `${institutionName} ${county} ${state} budget technology spending appropriations`,
  ];
}

// Truncate text to a maximum character length
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "... [truncated]";
}

async function analyzeWithClaude(
  lead: GovernmentLead,
  searchResults: Map<string, TavilyResult[]>
): Promise<EnrichmentResult> {
  const allResults: string[] = [];
  const MAX_CONTENT_PER_RESULT = 2000; // Limit each result's content
  const MAX_RESULTS_PER_QUERY = 3; // Only use top 3 results per query
  const MAX_TOTAL_CONTENT = 30000; // Total content limit to stay under Claude's limit
  
  for (const [query, results] of Array.from(searchResults.entries())) {
    if (results.length > 0) {
      allResults.push(`\n=== Query: ${query} ===`);
      // Only take top results per query
      const limitedResults = results.slice(0, MAX_RESULTS_PER_QUERY);
      for (const result of limitedResults) {
        const content = result.content || ""; // Use summary content instead of raw_content to save tokens
        allResults.push(`
Title: ${result.title}
URL: ${result.url}
Content: ${truncateText(content, MAX_CONTENT_PER_RESULT)}
---`);
      }
    }
  }

  // Truncate entire combined results if still too long
  let combinedResults = allResults.join("\n");
  combinedResults = truncateText(combinedResults, MAX_TOTAL_CONTENT);

  const prompt = `Analyze the following search results about a government institution and extract structured intelligence data.

INSTITUTION INFORMATION:
- Name: ${lead.institutionName}
- Type: ${lead.institutionType}
- State: ${lead.state}
- County: ${lead.county || "N/A"}
- Department: ${lead.department || "General Administration"}
- Population Served: ${lead.population?.toLocaleString() || "Unknown"}

SEARCH RESULTS:
${combinedResults}

Based on the search results, extract and structure the following information. If specific information is not found in the search results, provide reasonable inferences based on the institution type and size, but mark them as inferred.

Generate a JSON response with this exact structure:
{
  "decisionMakers": [
    {
      "name": "Full Name",
      "title": "Job Title/Position",
      "email": "email@domain.com or null if not found",
      "phone": "phone number or null if not found",
      "linkedIn": "LinkedIn URL or null if not found"
    }
  ],
  "techStack": [
    "List of software, systems, or technology platforms they currently use"
  ],
  "recentNews": [
    {
      "title": "News headline or initiative title",
      "url": "Source URL",
      "date": "Date if available or null",
      "summary": "Brief 1-2 sentence summary"
    }
  ],
  "competitorAnalysis": [
    {
      "competitor": "Company/vendor name",
      "product": "Product or service they provide",
      "relationship": "Current vendor, previous vendor, in RFP, etc."
    }
  ],
  "buyingSignals": [
    "List specific indicators of purchase intent: RFPs, budget allocations, tech complaints, modernization initiatives, leadership changes, etc."
  ],
  "enrichmentScore": 75
}

Guidelines:
- For decisionMakers: Focus on IT directors, department heads, commissioners, elected officials, procurement officers
- For techStack: Look for mentions of software vendors, ERP systems, CRM systems, website platforms, GIS systems
- For recentNews: Include technology initiatives, budget approvals, RFP announcements, modernization projects
- For competitorAnalysis: Identify any current technology vendors or partners mentioned
- For buyingSignals: Look for RFP announcements, budget increases, complaints about current systems, new project announcements, grant funding, ARPA/federal funding mentions
- For enrichmentScore: Rate 1-100 based on how much valuable sales intelligence was found (100 = comprehensive, 1 = almost nothing found)

Respond ONLY with valid JSON.`;

  const message = await pRetry(
    async () => {
      return await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
    },
    {
      retries: 2,
      onFailedAttempt: (error) => {
        console.log(`Claude analysis attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      },
    }
  );

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected AI response type");
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Claude response as JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    decisionMakers: parsed.decisionMakers || [],
    techStack: parsed.techStack || [],
    recentNews: parsed.recentNews || [],
    competitorAnalysis: parsed.competitorAnalysis || [],
    buyingSignals: parsed.buyingSignals || [],
    enrichmentData: {
      queriesUsed: Array.from(searchResults.keys()),
      totalResultsFound: Array.from(searchResults.values()).reduce((sum, arr) => sum + arr.length, 0),
      analyzedAt: new Date().toISOString(),
    },
    enrichmentScore: Math.min(100, Math.max(1, parsed.enrichmentScore || 50)),
  };
}

export async function enrichLead(lead: GovernmentLead): Promise<EnrichmentResult> {
  const queries = buildEnrichmentQueries(lead);
  const searchResults = new Map<string, TavilyResult[]>();

  console.log(`Starting enrichment for lead: ${lead.institutionName}`);

  const searchPromises = queries.map(async (query) => {
    try {
      const results = await searchTavily(query);
      searchResults.set(query, results);
      console.log(`Query "${query.slice(0, 50)}..." returned ${results.length} results`);
    } catch (error) {
      console.error(`Search failed for query: ${query}`, error);
      searchResults.set(query, []);
    }
  });

  await Promise.all(searchPromises);

  const totalResults = Array.from(searchResults.values()).reduce((sum, arr) => sum + arr.length, 0);
  
  if (totalResults === 0) {
    console.log(`No search results found for ${lead.institutionName}`);
    return {
      decisionMakers: [],
      techStack: [],
      recentNews: [],
      competitorAnalysis: [],
      buyingSignals: ["No public information found - recommend direct outreach"],
      enrichmentData: {
        queriesUsed: queries,
        totalResultsFound: 0,
        analyzedAt: new Date().toISOString(),
        note: "No search results returned",
      },
      enrichmentScore: 10,
    };
  }

  const enrichmentResult = await analyzeWithClaude(lead, searchResults);
  
  console.log(`Enrichment complete for ${lead.institutionName} with score: ${enrichmentResult.enrichmentScore}`);
  
  return enrichmentResult;
}

export async function enrichLeadsBatch(
  leads: GovernmentLead[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<number, EnrichmentResult>> {
  const results = new Map<number, EnrichmentResult>();
  const batchLimit = pLimit(1);
  let completed = 0;

  const enrichmentPromises = leads.map((lead) =>
    batchLimit(async () => {
      try {
        const result = await enrichLead(lead);
        results.set(lead.id, result);
      } catch (error) {
        console.error(`Failed to enrich lead ${lead.id}:`, error);
        results.set(lead.id, {
          decisionMakers: [],
          techStack: [],
          recentNews: [],
          competitorAnalysis: [],
          buyingSignals: [],
          enrichmentData: {
            error: error instanceof Error ? error.message : "Unknown error",
            analyzedAt: new Date().toISOString(),
          },
          enrichmentScore: 0,
        });
      }
      completed++;
      if (onProgress) {
        onProgress(completed, leads.length);
      }
    })
  );

  await Promise.all(enrichmentPromises);
  return results;
}

export interface RealDataEnrichmentResult {
  recentNews: string[];
  techStack: string[];
  painPoints: string[];
  buyingSignals: string[];
  decisionMakers: DecisionMaker[];
  enrichmentScore: number;
  searchQueries: string[];
  totalResultsFound: number;
  enrichedAt: Date;
}

function buildRealDataQueries(lead: GovernmentLead): string[] {
  const institutionName = lead.institutionName;
  const state = lead.state;
  const department = lead.department || "administration";

  return [
    `${institutionName} ${state} recent news RFP technology initiatives`,
    `${institutionName} ${state} IT staff directory contact`,
    `${institutionName} ${department} budget spending technology`,
  ];
}

async function analyzeRealDataWithClaude(
  lead: GovernmentLead,
  searchResults: Map<string, TavilyResult[]>
): Promise<RealDataEnrichmentResult> {
  const allResults: string[] = [];
  
  for (const [query, results] of Array.from(searchResults.entries())) {
    if (results.length > 0) {
      allResults.push(`\n=== Search: ${query} ===`);
      for (const result of results) {
        allResults.push(`
Title: ${result.title}
URL: ${result.url}
Content: ${result.raw_content || result.content}
---`);
      }
    }
  }

  const combinedResults = allResults.join("\n");
  const totalResults = Array.from(searchResults.values()).reduce((sum, arr) => sum + arr.length, 0);

  if (totalResults === 0) {
    return {
      recentNews: [],
      techStack: [],
      painPoints: ["No public information found - recommend direct outreach"],
      buyingSignals: [],
      decisionMakers: [],
      enrichmentScore: 10,
      searchQueries: Array.from(searchResults.keys()),
      totalResultsFound: 0,
      enrichedAt: new Date(),
    };
  }

  const prompt = `Analyze these web search results about a government institution and extract sales intelligence.

INSTITUTION:
- Name: ${lead.institutionName}
- Type: ${lead.institutionType}
- State: ${lead.state}
- County: ${lead.county || "N/A"}
- Department: ${lead.department || "General Administration"}
- Population: ${lead.population?.toLocaleString() || "Unknown"}

SEARCH RESULTS:
${combinedResults}

Extract structured intelligence. Only include information explicitly found in the search results or clearly inferred from them.

Respond with JSON:
{
  "recentNews": [
    "Recent news item or announcement with date if available",
    "Another news item about initiatives or projects"
  ],
  "techStack": [
    "Software or system currently in use",
    "Another technology platform mentioned"
  ],
  "painPoints": [
    "Problems, challenges, or complaints mentioned",
    "Issues with current systems or processes"
  ],
  "buyingSignals": [
    "Budget approvals or allocations for technology",
    "RFP announcements or procurement activity",
    "Hiring for IT or technology positions",
    "Complaints about current systems needing replacement"
  ],
  "decisionMakers": [
    {
      "name": "Full Name",
      "title": "Job Title",
      "email": "email or null",
      "phone": "phone or null",
      "linkedIn": "url or null"
    }
  ],
  "enrichmentScore": 75
}

Guidelines:
- recentNews: News from 2024-2025 about technology initiatives, modernization, grants, projects
- techStack: Any software vendors, systems, or platforms mentioned (ERP, CRM, GIS, websites)
- painPoints: Complaints, challenges, outdated systems, manual processes mentioned
- buyingSignals: RFPs, budget increases, federal/state grants, ARPA funding, IT hiring, system replacements
- decisionMakers: IT directors, department heads, commissioners, CIOs, procurement officers found in results
- enrichmentScore: 1-100 based on how much valuable intelligence was found

Respond ONLY with valid JSON.`;

  const message = await pRetry(
    async () => {
      return await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
    },
    {
      retries: 2,
      onFailedAttempt: (error) => {
        console.log(`Claude real data analysis attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      },
    }
  );

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected AI response type");
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Claude response as JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    recentNews: parsed.recentNews || [],
    techStack: parsed.techStack || [],
    painPoints: parsed.painPoints || [],
    buyingSignals: parsed.buyingSignals || [],
    decisionMakers: parsed.decisionMakers || [],
    enrichmentScore: Math.min(100, Math.max(1, parsed.enrichmentScore || 50)),
    searchQueries: Array.from(searchResults.keys()),
    totalResultsFound: totalResults,
    enrichedAt: new Date(),
  };
}

export async function enrichLeadWithRealData(lead: GovernmentLead): Promise<RealDataEnrichmentResult> {
  const queries = buildRealDataQueries(lead);
  const searchResults = new Map<string, TavilyResult[]>();

  console.log(`[RealDataEnrichment] Starting real data enrichment for: ${lead.institutionName}`);

  const searchPromises = queries.map(async (query) => {
    try {
      const results = await searchTavily(query);
      searchResults.set(query, results);
      console.log(`[RealDataEnrichment] Query "${query.slice(0, 50)}..." returned ${results.length} results`);
    } catch (error) {
      console.error(`[RealDataEnrichment] Search failed for query: ${query}`, error);
      searchResults.set(query, []);
    }
  });

  await Promise.all(searchPromises);

  const result = await analyzeRealDataWithClaude(lead, searchResults);
  
  console.log(`[RealDataEnrichment] Enrichment complete for ${lead.institutionName} with score: ${result.enrichmentScore}`);
  
  return result;
}
