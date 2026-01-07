import Anthropic from "@anthropic-ai/sdk";
import pRetry from "p-retry";
import type { IcpProfile, TargetCriteria } from "@shared/schema";

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("AI_INTEGRATIONS_ANTHROPIC_API_KEY is not configured");
    }
    anthropicClient = new Anthropic({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
  }
  return anthropicClient;
}

export interface IcpAiSuggestion {
  description: string;
  targetCriteria: TargetCriteria;
  searchQueries: string[];
  rationale: string;
}

export async function generateIcpSuggestions(
  profile: IcpProfile,
  companyContext?: string
): Promise<IcpAiSuggestion> {
  const companyInfo = companyContext || `rltx.ai - A "Palantir for AI" company that builds custom end-to-end AI systems for enterprise customers. Services include data integration, AI/ML model development, workflow automation, and decision intelligence platforms.`;

  const prompt = `You are an expert B2B sales strategist helping a company refine their Ideal Customer Profile (ICP) for outbound sales.

COMPANY SELLING:
${companyInfo}

CURRENT ICP VERTICAL: ${profile.displayName}
CURRENT DESCRIPTION: ${profile.description || "Not set"}
CURRENT TARGET CRITERIA:
${JSON.stringify(profile.targetCriteria || {}, null, 2)}
CURRENT SEARCH QUERIES:
${(profile.searchQueries || []).join("\n") || "None set"}

Your task is to generate an OPTIMIZED ICP configuration that will help this company find the best-fit prospects in the ${profile.displayName} vertical.

Think deeply about:
1. What types of ${profile.displayName} organizations are most likely to buy AI/automation solutions?
2. What specific pain points do they have that this company can solve?
3. What budget/size criteria indicate purchase readiness?
4. What search queries would find organizations with buying signals?

Generate a JSON response with this structure:
{
  "description": "A compelling 2-3 sentence description of this ICP that explains WHO these prospects are and WHY they're ideal buyers",
  "targetCriteria": {
    "minPopulation": <number or null - for government, what's the minimum population that indicates sufficient budget?>,
    "maxPopulation": <number or null - if targeting smaller orgs that are more agile>,
    "techMaturityMin": <1-10 where 1=very low tech, 10=cutting edge>,
    "techMaturityMax": <1-10>,
    "departments": ["List of specific departments to target within these organizations"],
    "states": [], 
    "painPointKeywords": ["Specific keywords that indicate pain points this company can solve"]
  },
  "searchQueries": [
    "5-8 specific search queries that would find prospects with buying signals",
    "Include queries for: RFPs, budget approvals, modernization initiatives, technology complaints, new leadership"
  ],
  "rationale": "Explain in 2-3 sentences why these criteria will find high-quality prospects"
}

For ${profile.verticalName} specifically, consider:
${getVerticalSpecificGuidance(profile.verticalName)}

Respond ONLY with valid JSON.`;

  const message = await pRetry(
    async () => {
      return await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });
    },
    {
      retries: 2,
      onFailedAttempt: (error) => {
        console.log(`ICP AI suggestion attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      },
    }
  );

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected AI response type");
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response as JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    description: parsed.description || profile.description,
    targetCriteria: {
      minPopulation: parsed.targetCriteria?.minPopulation ?? null,
      maxPopulation: parsed.targetCriteria?.maxPopulation ?? null,
      techMaturityMin: parsed.targetCriteria?.techMaturityMin ?? 1,
      techMaturityMax: parsed.targetCriteria?.techMaturityMax ?? 10,
      departments: parsed.targetCriteria?.departments || [],
      states: parsed.targetCriteria?.states || [],
      painPointKeywords: parsed.targetCriteria?.painPointKeywords || [],
    },
    searchQueries: parsed.searchQueries || [],
    rationale: parsed.rationale || "",
  };
}

function getVerticalSpecificGuidance(vertical: string): string {
  const guidance: Record<string, string> = {
    government: `
- County governments with 50,000+ population often have dedicated IT staff and budget
- Look for: legacy system modernization, citizen services digitization, data silos, compliance requirements
- Key departments: IT, County Administration, Finance, Public Works, Human Services
- Buying signals: ARPA funding, federal grants, new CIO/IT Director appointments, failed RFPs
- Pain points: manual processes, paper-based workflows, siloed data, aging infrastructure`,
    
    healthcare: `
- Hospital systems and large clinics with complex operations
- Look for: EHR integration challenges, patient scheduling issues, claims processing delays
- Key departments: Health IT, Clinical Operations, Revenue Cycle, Patient Services
- Buying signals: meaningful use compliance, interoperability mandates, value-based care transitions
- Pain points: clinician burnout, documentation burden, care coordination gaps`,
    
    legal: `
- Mid-size to large law firms and corporate legal departments
- Look for: document automation needs, eDiscovery challenges, contract management
- Key departments: Legal Operations, Knowledge Management, IT, Practice Groups
- Buying signals: litigation surge, M&A activity, new CLO/COO appointments
- Pain points: time-consuming document review, research inefficiency, matter management`,
    
    financial_services: `
- Regional banks, credit unions, insurance companies
- Look for: fraud detection, customer onboarding friction, regulatory compliance burden
- Key departments: Operations, Risk Management, Compliance, Digital Banking
- Buying signals: core system replacement, digital transformation initiatives, regulatory exams
- Pain points: manual underwriting, slow loan processing, fraud losses`,
    
    pe: `
- PE firms and their portfolio companies seeking operational improvements
- Look for: due diligence automation, portfolio company efficiency, value creation
- Key departments: Operations, Technology, Finance, Portfolio Management
- Buying signals: new acquisitions, platform builds, carve-outs
- Pain points: manual data aggregation, slow reporting, integration challenges`,
  };

  return guidance[vertical] || "Consider what makes prospects in this vertical ideal buyers for AI/automation solutions.";
}

export async function generateSearchQueriesForIcp(
  profile: IcpProfile,
  existingLeads?: number
): Promise<string[]> {
  const prompt = `Generate 5-8 highly specific web search queries to find ${profile.displayName} organizations that are likely buyers for AI/automation solutions.

ICP: ${profile.displayName}
Description: ${profile.description}
Target Criteria: ${JSON.stringify(profile.targetCriteria || {})}
Existing leads in database: ${existingLeads || 0}

Generate search queries that would find:
1. Organizations with active RFPs or procurement activity
2. Organizations with recent budget approvals for technology
3. Organizations hiring for IT/technology leadership roles
4. Organizations with public complaints about current systems
5. Organizations receiving grants or funding for modernization

Format: Return a JSON array of search query strings.
Example: ["query 1", "query 2", "query 3"]

Respond ONLY with the JSON array.`;

  const message = await pRetry(
    async () => {
      return await getAnthropicClient().messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
    },
    { retries: 2 }
  );

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected AI response type");
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [];
  }

  return JSON.parse(jsonMatch[0]);
}
