import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { getAnthropicClient } from "./utils";
import type { GovernmentLead } from "@shared/schema";

const router = Router();

// SSE helper to send events
function sendSSE(res: Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// AI Command schema
const aiCommandSchema = z.object({
  command: z.string().min(1),
  context: z.object({
    currentLeadId: z.number().optional(),
    selectedLeadIds: z.array(z.number()).optional(),
    currentPage: z.string().optional(),
  }).optional(),
});

// Lead summary schema
const leadSummarySchema = z.object({
  leadId: z.number(),
});

// Script stream schema
const scriptStreamSchema = z.object({
  leadId: z.number(),
  scriptStyle: z.enum(["consultative", "direct_value", "question_led", "pain_agitate_solution"]).default("consultative"),
});

// POST /api/ai/stream/command - AI Command Palette (streaming)
router.post("/command", async (req: Request, res: Response) => {
  try {
    const parseResult = aiCommandSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const { command, context } = parseResult.data;

    // Set up SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sendSSE(res, "start", { message: "Processing command..." });

    // Build context for AI
    let contextInfo = "";
    if (context?.currentLeadId) {
      const lead = await storage.getLead(context.currentLeadId);
      if (lead) {
        contextInfo += `\nCurrent lead: ${lead.institutionName} (${lead.state}) - ${lead.department || "General"}`;
        contextInfo += `\nStatus: ${lead.status}, Priority: ${lead.priorityScore || "Not scored"}`;
        if (lead.painPoints?.length) {
          contextInfo += `\nPain points: ${lead.painPoints.join(", ")}`;
        }
      }
    }

    if (context?.selectedLeadIds?.length) {
      const selectedLeads = await Promise.all(
        context.selectedLeadIds.slice(0, 5).map(id => storage.getLead(id))
      );
      const validLeads = selectedLeads.filter(Boolean);
      if (validLeads.length) {
        contextInfo += `\nSelected leads (${validLeads.length}): ${validLeads.map(l => l!.institutionName).join(", ")}`;
      }
    }

    // Get stats for context
    const leads = await storage.getAllLeads();
    const stats = {
      totalLeads: leads.length,
      contacted: leads.filter(l => l.status !== "not_contacted").length,
      highPriority: leads.filter(l => (l.priorityScore || 0) >= 70).length,
    };
    contextInfo += `\n\nDatabase stats: ${stats.totalLeads} total leads, ${stats.highPriority} high priority, ${stats.contacted} contacted`;

    const systemPrompt = `You are an AI assistant for a B2B cold calling lead generation platform. You help users:
- Find and filter leads
- Understand their data
- Generate insights
- Suggest next actions

Current context:${contextInfo || " No specific context"}
Current page: ${context?.currentPage || "Unknown"}

Respond concisely and actionably. If the user asks to find or filter leads, describe the criteria they should use. If they ask for analysis, provide brief insights.`;

    const anthropic = getAnthropicClient();

    // Stream the response
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: command }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        sendSSE(res, "delta", { text: event.delta.text });
      }
    }

    const finalMessage = await stream.finalMessage();
    sendSSE(res, "complete", {
      usage: finalMessage.usage,
      stopReason: finalMessage.stop_reason,
    });

    res.end();
  } catch (error) {
    console.error("Error in AI command stream:", error);
    sendSSE(res, "error", { message: error instanceof Error ? error.message : "Unknown error" });
    res.end();
  }
});

// POST /api/ai/stream/lead-summary - Generate AI summary for a lead (streaming)
router.post("/lead-summary", async (req: Request, res: Response) => {
  try {
    const parseResult = leadSummarySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const { leadId } = parseResult.data;
    const lead = await storage.getLead(leadId);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Set up SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sendSSE(res, "start", { leadId, leadName: lead.institutionName });

    const prompt = buildLeadSummaryPrompt(lead);

    const anthropic = getAnthropicClient();
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        sendSSE(res, "delta", { text: event.delta.text });
      }
    }

    sendSSE(res, "complete", { leadId });
    res.end();
  } catch (error) {
    console.error("Error in lead summary stream:", error);
    sendSSE(res, "error", { message: error instanceof Error ? error.message : "Unknown error" });
    res.end();
  }
});

// POST /api/ai/stream/script - Stream script generation
router.post("/script", async (req: Request, res: Response) => {
  try {
    const parseResult = scriptStreamSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const { leadId, scriptStyle } = parseResult.data;
    const lead = await storage.getLead(leadId);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Set up SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    sendSSE(res, "start", { leadId, leadName: lead.institutionName, style: scriptStyle });

    const companyProfile = await storage.getCompanyProfile();
    const prompt = buildScriptPrompt(lead, scriptStyle, companyProfile);

    const anthropic = getAnthropicClient();
    const stream = await anthropic.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    let fullResponse = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        sendSSE(res, "delta", { text: event.delta.text });
      }
    }

    // Parse and save the script
    try {
      const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const scriptData = JSON.parse(jsonMatch[0]);
        const script = await storage.createScript({
          leadId,
          scriptStyle,
          opener: scriptData.opener || "",
          talkingPoints: scriptData.talkingPoints || [],
          valueProposition: scriptData.valueProposition || "",
          objectionHandlers: scriptData.objectionHandlers || [],
          closingStatement: scriptData.closingStatement || "",
          fullScript: scriptData.fullScript || fullResponse,
        });
        sendSSE(res, "saved", { scriptId: script.id });
      }
    } catch (parseError) {
      console.error("Failed to parse script JSON:", parseError);
    }

    sendSSE(res, "complete", { leadId });
    res.end();
  } catch (error) {
    console.error("Error in script stream:", error);
    sendSSE(res, "error", { message: error instanceof Error ? error.message : "Unknown error" });
    res.end();
  }
});

// POST /api/ai/lead-summary - Non-streaming version (for quick lookups)
router.post("/lead-summary-sync", async (req: Request, res: Response) => {
  try {
    const parseResult = leadSummarySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid request body", details: parseResult.error.flatten() });
    }

    const { leadId } = parseResult.data;
    const lead = await storage.getLead(leadId);

    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const prompt = buildLeadSummaryPrompt(lead);

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    const summary = content.type === "text" ? content.text : "";

    res.json({
      leadId,
      leadName: lead.institutionName,
      summary,
    });
  } catch (error) {
    console.error("Error generating lead summary:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

// Helper functions
function buildLeadSummaryPrompt(lead: GovernmentLead): string {
  return `Analyze this lead and provide a brief "Why This Lead" summary (2-3 sentences max) explaining:
1. Why they're a good prospect for AI solutions
2. The most promising angle to approach them

LEAD DATA:
- Institution: ${lead.institutionName}
- Type: ${lead.institutionType}
- Department: ${lead.department || "General"}
- Location: ${lead.city || ""}, ${lead.state}
- Population: ${lead.population?.toLocaleString() || "Unknown"}
- Tech Maturity: ${lead.techMaturityScore || "Unknown"}/10
- Priority Score: ${lead.priorityScore || "Not scored"}
- Pain Points: ${lead.painPoints?.join(", ") || "Unknown"}
- Buying Signals: ${lead.buyingSignals?.join(", ") || "None identified"}
- Decision Makers: ${lead.decisionMakers?.map(dm => `${dm.name} (${dm.title})`).join(", ") || "Unknown"}
- Status: ${lead.status}

Respond with ONLY the summary, no preamble. Be specific and actionable.`;
}

function buildScriptPrompt(lead: GovernmentLead, style: string, companyProfile: any): string {
  const styleGuides: Record<string, string> = {
    consultative: "Position yourself as a trusted advisor. Ask discovery questions. Focus on building trust.",
    direct_value: "Lead with immediate, quantifiable value. Be direct and respect their time.",
    question_led: "Use strategic questions to guide them to self-diagnose their problems.",
    pain_agitate_solution: "Identify pain, amplify consequences, then present relief.",
  };

  return `Generate a cold call script for this lead.

COMPANY: rltx.ai - "Palantir for AI"
Services: ${companyProfile?.services?.join(", ") || "Custom AI Development, RAG Systems, AI Agents"}

LEAD:
- Institution: ${lead.institutionName}
- Department: ${lead.department || "General"}
- Location: ${lead.state}
- Pain Points: ${lead.painPoints?.join(", ") || "Unknown"}
- Decision Makers: ${lead.decisionMakers?.map(dm => dm.name).join(", ") || "Unknown"}

STYLE: ${style}
${styleGuides[style] || ""}

Generate JSON:
{
  "opener": "Opening line",
  "talkingPoints": ["Point 1", "Point 2", "Point 3"],
  "valueProposition": "Core value statement",
  "objectionHandlers": [{"objection": "...", "response": "..."}],
  "closingStatement": "Call to action",
  "fullScript": "Complete 200-300 word script"
}`;
}

export default router;
