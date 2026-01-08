import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { scriptStyles, type ScriptStyle } from "@shared/schema";
import { getAnthropicClient, paginationSchema, paginatedResponse } from "./utils";

const router = Router();

const generateScriptSchema = z.object({
  scriptStyle: z.enum(scriptStyles).default("consultative"),
});

// GET /api/scripts - All scripts with lead data
router.get("/", async (req: Request, res: Response) => {
  try {
    const params = paginationSchema.safeParse(req.query);
    const { limit, offset } = params.success ? params.data : { limit: 20, offset: 0 };

    const scripts = await storage.getAllScripts();
    const leads = await storage.getAllLeads();
    const scriptsWithLeads = scripts.map((script) => ({
      ...script,
      lead: leads.find((l) => l.id === script.leadId),
    }));

    const total = scriptsWithLeads.length;
    const paginatedScripts = scriptsWithLeads.slice(offset, offset + limit);

    res.json(paginatedResponse(paginatedScripts, total, { limit, offset }));
  } catch (error) {
    console.error("Error fetching scripts:", error);
    res.status(500).json({ error: "Failed to fetch scripts" });
  }
});

// GET /api/leads/:id/script - Get script for lead
router.get("/lead/:id", async (req: Request, res: Response) => {
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

// GET /api/leads/:id/scripts - All scripts for lead
router.get("/lead/:id/all", async (req: Request, res: Response) => {
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

// POST /api/leads/:id/generate-script - Generate new script
router.post("/generate/:id", async (req: Request, res: Response) => {
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

export default router;
