import Anthropic from "@anthropic-ai/sdk";
import pLimit from "p-limit";
import pRetry from "p-retry";
import type { CountyData } from "./county-data";
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

export interface RealContactData {
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
}

const MAX_CONTENT_PER_RESULT = 2500;
const MAX_TOTAL_CONTENT = 12000;

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "... [truncated]";
}

function extractPatternsFromText(text: string): { phones: string[]; emails: string[]; govUrls: string[] } {
  const phonePattern = /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}(?:\s*(?:ext|x|extension)\.?\s*[0-9]+)?/gi;
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const govUrlPattern = /https?:\/\/[^\s"'<>]*\.gov[^\s"'<>]*/gi;

  const phones = Array.from(new Set(text.match(phonePattern) || [])).slice(0, 30);
  const emails = Array.from(new Set(text.match(emailPattern) || [])).slice(0, 30);
  const govUrls = Array.from(new Set(text.match(govUrlPattern) || [])).slice(0, 10);

  return { phones, emails, govUrls };
}

function prepareSearchResultsForClaude(results: TavilyResult[]): { content: string; preExtracted: { phones: string[]; emails: string[]; govUrls: string[] } } {
  const allPhones: string[] = [];
  const allEmails: string[] = [];
  const allGovUrls: string[] = [];
  
  let totalLength = 0;
  const truncatedResults: string[] = [];
  
  for (const r of results) {
    if (totalLength >= MAX_TOTAL_CONTENT) break;
    
    const rawText = r.raw_content || r.content || "";
    const patterns = extractPatternsFromText(rawText);
    allPhones.push(...patterns.phones);
    allEmails.push(...patterns.emails);
    allGovUrls.push(...patterns.govUrls);
    
    const truncatedText = truncateContent(rawText, MAX_CONTENT_PER_RESULT);
    const resultBlock = `URL: ${r.url}\nTitle: ${r.title}\nContent: ${truncatedText}\n---`;
    
    if (totalLength + resultBlock.length <= MAX_TOTAL_CONTENT) {
      truncatedResults.push(resultBlock);
      totalLength += resultBlock.length;
    }
  }
  
  return {
    content: truncatedResults.join("\n"),
    preExtracted: {
      phones: Array.from(new Set(allPhones)).slice(0, 50),
      emails: Array.from(new Set(allEmails)).slice(0, 50),
      govUrls: Array.from(new Set(allGovUrls)).slice(0, 15),
    },
  };
}

async function searchTavily(query: string): Promise<TavilyResult[]> {
  const tavilyApiKey = process.env.TAVILY_API_KEY;
  if (!tavilyApiKey) {
    console.log("[RealDataScraper] TAVILY_API_KEY not configured, skipping search");
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
            console.log(`[RealDataScraper] Tavily search attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
          },
        }
      );

      return response.results || [];
    } catch (error) {
      console.error(`[RealDataScraper] Tavily search failed for query "${query}":`, error);
      return [];
    }
  });
}

async function extractContactDataWithClaude(
  countyName: string,
  state: string,
  department: string,
  searchResults: TavilyResult[]
): Promise<RealContactData> {
  if (searchResults.length === 0) {
    console.log(`[RealDataScraper] No search results to analyze for ${countyName} County, ${state} - ${department}`);
    return {
      phoneNumber: null,
      email: null,
      website: null,
      decisionMakerName: null,
      decisionMakerTitle: null,
      additionalContacts: [],
    };
  }

  const { content: combinedContent, preExtracted } = prepareSearchResultsForClaude(searchResults);
  
  console.log(`[RealDataScraper] Prepared content for Claude: ${combinedContent.length} chars, pre-extracted: ${preExtracted.phones.length} phones, ${preExtracted.emails.length} emails`);

  const preExtractedSection = `
PRE-EXTRACTED CONTACT PATTERNS (use these to match with names):
Phones found: ${preExtracted.phones.slice(0, 20).join(", ")}
Emails found: ${preExtracted.emails.slice(0, 20).join(", ")}
Gov URLs found: ${preExtracted.govUrls.slice(0, 5).join(", ")}
`;

  const prompt = `You are extracting REAL contact information from government website search results. Your PRIMARY GOAL is to find DIRECT PHONE NUMBERS and EMAIL ADDRESSES for INDIVIDUAL PEOPLE, not just general office numbers.

COUNTY: ${countyName} County
STATE: ${state}
DEPARTMENT: ${department}
${preExtractedSection}
SEARCH RESULTS:
${combinedContent}

Extract ONLY information that is explicitly stated in the search results. Do NOT make up or guess any information.

PRIORITY ORDER for phone numbers:
1. DIRECT LINES for specific people (e.g., "John Smith: 555-123-4567") - HIGHEST PRIORITY
2. Direct extensions (e.g., "ext. 1234")
3. Cell/mobile numbers if listed
4. Department main line as fallback

Find:
1. The official county government website URL (look for .gov domains or official county sites)
2. The main department phone number (as a fallback)
3. An email address for the department
4. Decision maker: Look for the DEPARTMENT HEAD (Director, Manager, Administrator, Chief) - get their DIRECT phone and email if available
5. ALL additional staff contacts you can find - extract EVERY person with their:
   - Full name
   - Title/position
   - DIRECT phone number (prioritize direct lines over main office)
   - Personal/direct email address

IMPORTANT: 
- Extract AS MANY individual contacts as possible from the search results
- For each person, try to find their DIRECT phone line, not just the main office number
- Look for staff directories, org charts, leadership pages, and contact lists
- Include deputies, assistants, managers, coordinators - anyone with contact info

Respond ONLY with valid JSON in this exact format:
{
  "phoneNumber": "main department phone or null",
  "email": "department email or null",
  "website": "official county website URL or null",
  "decisionMakerName": "department head name or null",
  "decisionMakerTitle": "their title or null",
  "decisionMakerDirectPhone": "their DIRECT phone line or null",
  "decisionMakerEmail": "their direct email or null",
  "additionalContacts": [
    {
      "name": "Staff member full name",
      "title": "Their exact title",
      "phone": "their DIRECT phone line or null",
      "email": "their email or null"
    }
  ]
}`;

  try {
    const message = await pRetry(
      async () => {
        return await getAnthropicClient().messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 2500,
          messages: [{ role: "user", content: prompt }],
        });
      },
      {
        retries: 2,
        onFailedAttempt: (error) => {
          console.log(`[RealDataScraper] Claude extraction attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
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
      
      const additionalContacts = parsed.additionalContacts || [];
      
      if (parsed.decisionMakerName) {
        const existingDecisionMaker = additionalContacts.find(
          (c: { name: string }) => c.name === parsed.decisionMakerName
        );
        if (!existingDecisionMaker) {
          const newContact: { name: string; title: string; phone?: string; email?: string } = {
            name: parsed.decisionMakerName,
            title: parsed.decisionMakerTitle || "Department Head",
          };
          if (parsed.decisionMakerDirectPhone) {
            newContact.phone = parsed.decisionMakerDirectPhone;
          }
          if (parsed.decisionMakerEmail) {
            newContact.email = parsed.decisionMakerEmail;
          }
          additionalContacts.unshift(newContact);
        } else if (parsed.decisionMakerDirectPhone && !existingDecisionMaker.phone) {
          existingDecisionMaker.phone = parsed.decisionMakerDirectPhone;
        }
      }
      
      return {
        phoneNumber: parsed.phoneNumber || null,
        email: parsed.email || null,
        website: parsed.website || null,
        decisionMakerName: parsed.decisionMakerName || null,
        decisionMakerTitle: parsed.decisionMakerTitle || null,
        additionalContacts: additionalContacts,
      };
    }
  } catch (error) {
    console.error(`[RealDataScraper] Claude extraction failed for ${countyName} County:`, error);
  }

  return {
    phoneNumber: null,
    email: null,
    website: null,
    decisionMakerName: null,
    decisionMakerTitle: null,
    additionalContacts: [],
  };
}

async function validateAndFilterEmails(
  contactData: RealContactData,
  countyName: string
): Promise<RealContactData> {
  const validatedData = { ...contactData };

  if (validatedData.email) {
    const result = await validateEmail(validatedData.email);
    console.log(`[RealDataScraper] Email validation for ${countyName} (${validatedData.email}):`, {
      isValid: result.isValid,
      formatValid: result.formatValid,
      domainValid: result.domainValid,
      mxRecords: result.mxRecords.slice(0, 2),
      reason: result.reason,
    });

    if (!result.isValid) {
      console.log(`[RealDataScraper] Invalid email discarded for ${countyName}: ${validatedData.email} - ${result.reason}`);
      validatedData.email = null;
    }
  }

  if (validatedData.additionalContacts.length > 0) {
    const validatedContacts = await Promise.all(
      validatedData.additionalContacts.map(async (contact) => {
        if (contact.email) {
          const result = await validateEmail(contact.email);
          console.log(`[RealDataScraper] Additional contact email validation (${contact.name}):`, {
            email: contact.email,
            isValid: result.isValid,
            reason: result.reason,
          });

          if (!result.isValid) {
            console.log(`[RealDataScraper] Invalid additional contact email discarded: ${contact.email}`);
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

export async function scrapeRealCountyData(
  county: CountyData,
  department: string
): Promise<RealContactData> {
  const countyName = county.name;
  const state = county.state;
  const stateAbbr = county.stateAbbr;

  console.log(`[RealDataScraper] Searching for real contact data: ${countyName} County, ${state} - ${department}`);

  const queries = [
    `${countyName} county ${state} government official website`,
    `${countyName} county ${stateAbbr} ${department} contact information phone email`,
    `${countyName} county ${state} ${department} department staff directory`,
    `${countyName} county ${state} ${department} director phone number email address`,
    `${countyName} county ${stateAbbr} employee phone directory leadership team`,
    `site:${countyName.toLowerCase().replace(/\s+/g, '')}county.gov OR site:co.${countyName.toLowerCase().replace(/\s+/g, '')}.${stateAbbr.toLowerCase()}.us staff directory phone`,
  ];

  const allResults: TavilyResult[] = [];

  for (const query of queries) {
    console.log(`[RealDataScraper] Executing Tavily search: "${query}"`);
    const results = await searchTavily(query);
    console.log(`[RealDataScraper] Found ${results.length} results for query`);
    allResults.push(...results);
  }

  const uniqueResults = allResults.filter((result, index, self) =>
    index === self.findIndex((r) => r.url === result.url)
  );

  console.log(`[RealDataScraper] Total unique results: ${uniqueResults.length}`);

  if (uniqueResults.length === 0) {
    console.log(`[RealDataScraper] No results found for ${countyName} County, ${state} - returning empty data`);
    return {
      phoneNumber: null,
      email: null,
      website: null,
      decisionMakerName: null,
      decisionMakerTitle: null,
      additionalContacts: [],
    };
  }

  const contactData = await extractContactDataWithClaude(
    countyName,
    state,
    department,
    uniqueResults
  );

  console.log(`[RealDataScraper] Extracted data for ${countyName} County:`, {
    hasPhone: !!contactData.phoneNumber,
    hasEmail: !!contactData.email,
    hasWebsite: !!contactData.website,
    hasDecisionMaker: !!contactData.decisionMakerName,
    additionalContactsCount: contactData.additionalContacts.length,
  });

  const validatedContactData = await validateAndFilterEmails(contactData, countyName);

  console.log(`[RealDataScraper] Validated data for ${countyName} County:`, {
    hasPhone: !!validatedContactData.phoneNumber,
    hasEmail: !!validatedContactData.email,
    hasWebsite: !!validatedContactData.website,
    hasDecisionMaker: !!validatedContactData.decisionMakerName,
    additionalContactsCount: validatedContactData.additionalContacts.length,
    validContactEmails: validatedContactData.additionalContacts.filter(c => c.email).length,
  });

  return validatedContactData;
}

export async function scrapeRealCountyDataBatch(
  counties: Array<{ county: CountyData; department: string }>
): Promise<Map<string, RealContactData>> {
  const results = new Map<string, RealContactData>();
  const limit = pLimit(2);

  const promises = counties.map(({ county, department }) =>
    limit(async () => {
      const key = `${county.name}-${county.state}-${department}`;
      try {
        const data = await scrapeRealCountyData(county, department);
        results.set(key, data);
      } catch (error) {
        console.error(`[RealDataScraper] Failed to scrape ${key}:`, error);
        results.set(key, {
          phoneNumber: null,
          email: null,
          website: null,
          decisionMakerName: null,
          decisionMakerTitle: null,
          additionalContacts: [],
        });
      }
    })
  );

  await Promise.all(promises);
  return results;
}
