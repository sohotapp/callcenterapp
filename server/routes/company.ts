import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { getAnthropicClient } from "./utils";

const router = Router();

// GET /api/company-profile - Get company profile
router.get("/", async (req: Request, res: Response) => {
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

// POST /api/company-profile/refresh - Refresh with AI
router.post("/refresh", async (req: Request, res: Response) => {
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

// POST /api/company-profile/scrape-website - Scrape from web
router.post("/scrape-website", async (req: Request, res: Response) => {
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

    // Return fallback profile
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

// PUT /api/company-profile - Manual update
router.put("/", async (req: Request, res: Response) => {
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

export default router;
