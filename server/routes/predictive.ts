import { Router, Request, Response } from "express";
import { storage } from "../storage";
import {
  calculatePredictiveScore,
  scoreAllLeadsPredictive,
  getTopPredictedLeads,
  getLeadsByAction,
} from "../predictive-scoring";

const router = Router();

// GET /api/predictive/scores - Get all predictive scores
router.get("/scores", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const scores = await scoreAllLeadsPredictive();

    res.json({
      total: scores.length,
      scores: scores.slice(0, limit),
    });
  } catch (error) {
    console.error("Error calculating predictive scores:", error);
    res.status(500).json({ error: "Failed to calculate predictive scores" });
  }
});

// GET /api/predictive/top - Get top predicted leads
router.get("/top", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topLeads = await getTopPredictedLeads(limit);

    // Enrich with lead data
    const enrichedLeads = await Promise.all(
      topLeads.map(async (score) => {
        const lead = await storage.getLead(score.leadId);
        return {
          ...score,
          lead: lead ? {
            id: lead.id,
            institutionName: lead.institutionName,
            department: lead.department,
            state: lead.state,
            county: lead.county,
            population: lead.population,
            status: lead.status,
            phoneNumber: lead.phoneNumber,
            email: lead.email,
          } : null,
        };
      })
    );

    res.json(enrichedLeads);
  } catch (error) {
    console.error("Error fetching top predicted leads:", error);
    res.status(500).json({ error: "Failed to fetch top predicted leads" });
  }
});

// GET /api/predictive/lead/:id - Get predictive score for single lead
router.get("/lead/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid lead ID" });
    }

    const lead = await storage.getLead(id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const allLeads = await storage.getAllLeads();
    const companyProfile = await storage.getCompanyProfile();
    const score = calculatePredictiveScore(lead, companyProfile ?? null, allLeads);

    res.json({
      ...score,
      lead: {
        id: lead.id,
        institutionName: lead.institutionName,
        department: lead.department,
        state: lead.state,
        status: lead.status,
      },
    });
  } catch (error) {
    console.error("Error calculating predictive score:", error);
    res.status(500).json({ error: "Failed to calculate predictive score" });
  }
});

// GET /api/predictive/by-action - Get leads grouped by recommended action
router.get("/by-action", async (req: Request, res: Response) => {
  try {
    const grouped = await getLeadsByAction();

    // Add summary stats
    const summary = {
      highPriority: grouped["High Priority"].length,
      enrichFirst: grouped["Enrich First"].length,
      batchOutreach: grouped["Batch Outreach"].length,
      lowPriority: grouped["Low Priority"].length,
      total: Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0),
    };

    // Limit each group to top 20 for response size
    const limitedGroups: Record<string, any[]> = {};
    for (const [action, scores] of Object.entries(grouped)) {
      limitedGroups[action] = scores.slice(0, 20).map(score => ({
        leadId: score.leadId,
        probability: score.predictedConversionProbability,
        confidence: score.confidenceLevel,
        predictedValue: score.predictedValue,
        nextBestAction: score.nextBestAction,
      }));
    }

    res.json({
      summary,
      groups: limitedGroups,
    });
  } catch (error) {
    console.error("Error grouping leads by action:", error);
    res.status(500).json({ error: "Failed to group leads by action" });
  }
});

// GET /api/predictive/insights - Get aggregate predictive insights
router.get("/insights", async (req: Request, res: Response) => {
  try {
    const scores = await scoreAllLeadsPredictive();

    // Calculate distribution
    const distribution = {
      high: scores.filter(s => s.predictedConversionProbability >= 70).length,
      medium: scores.filter(s => s.predictedConversionProbability >= 40 && s.predictedConversionProbability < 70).length,
      low: scores.filter(s => s.predictedConversionProbability < 40).length,
    };

    // Calculate average by confidence level
    const byConfidence = {
      high: scores.filter(s => s.confidenceLevel === "high"),
      medium: scores.filter(s => s.confidenceLevel === "medium"),
      low: scores.filter(s => s.confidenceLevel === "low"),
    };

    const avgByConfidence = {
      high: byConfidence.high.length > 0
        ? Math.round(byConfidence.high.reduce((sum, s) => sum + s.predictedConversionProbability, 0) / byConfidence.high.length)
        : 0,
      medium: byConfidence.medium.length > 0
        ? Math.round(byConfidence.medium.reduce((sum, s) => sum + s.predictedConversionProbability, 0) / byConfidence.medium.length)
        : 0,
      low: byConfidence.low.length > 0
        ? Math.round(byConfidence.low.reduce((sum, s) => sum + s.predictedConversionProbability, 0) / byConfidence.low.length)
        : 0,
    };

    // Top factors across all leads
    const factorCounts: Record<string, { count: number; avgImpact: number }> = {};
    for (const score of scores) {
      for (const factor of score.scoreFactors) {
        if (!factorCounts[factor.name]) {
          factorCounts[factor.name] = { count: 0, avgImpact: 0 };
        }
        factorCounts[factor.name].count++;
        factorCounts[factor.name].avgImpact += factor.impact;
      }
    }

    const topFactors = Object.entries(factorCounts)
      .map(([name, data]) => ({
        name,
        frequency: Math.round((data.count / scores.length) * 100),
        avgImpact: Math.round(data.avgImpact / data.count),
      }))
      .sort((a, b) => Math.abs(b.avgImpact) - Math.abs(a.avgImpact))
      .slice(0, 10);

    res.json({
      totalLeads: scores.length,
      averageScore: Math.round(scores.reduce((sum, s) => sum + s.predictedConversionProbability, 0) / scores.length),
      distribution,
      byConfidence: {
        counts: {
          high: byConfidence.high.length,
          medium: byConfidence.medium.length,
          low: byConfidence.low.length,
        },
        averages: avgByConfidence,
      },
      topFactors,
      recommendations: {
        callImmediately: distribution.high,
        enrichFirst: scores.filter(s =>
          s.predictedConversionProbability >= 40 &&
          s.predictedConversionProbability < 70 &&
          s.confidenceLevel !== "high"
        ).length,
        needsMoreData: scores.filter(s => s.confidenceLevel === "low").length,
      },
    });
  } catch (error) {
    console.error("Error generating predictive insights:", error);
    res.status(500).json({ error: "Failed to generate predictive insights" });
  }
});

export default router;
