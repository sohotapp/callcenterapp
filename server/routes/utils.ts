import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import type { GovernmentLead } from "@shared/schema";

// Lazy initialization of Anthropic client
let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || "",
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
    });
  }
  return anthropicClient;
}

// State abbreviation mappings
export const STATE_ABBREVIATIONS: Record<string, string> = {
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

export const ABBREVIATION_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBREVIATIONS).map(([name, abbr]) => [abbr, name])
);

export const DEPARTMENT_TYPES = [
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

// Pagination schema
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// Pagination response helper
export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
) {
  return {
    data,
    pagination: {
      total,
      limit: params.limit,
      offset: params.offset,
      hasMore: params.offset + data.length < total,
    },
  };
}

// Format phone number helper
export function formatPhoneNumber(phone: string | null | undefined): string | undefined {
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

// Calculate priority score helper
export function calculatePriorityScore(lead: {
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

// Email template rendering
export function renderEmailTemplate(template: string, lead: GovernmentLead): string {
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

// Get available template variables
export function getAvailableTemplateVariables(): Array<{ variable: string; description: string }> {
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

// AI enrichment for county data
export interface AiEnrichmentResult {
  techMaturityScore: number;
  painPoints: string[];
  estimatedBudget: string;
}

export async function enrichCountyWithAI(
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
    const message = await getAnthropicClient().messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

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
