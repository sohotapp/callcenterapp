import { Router, Request, Response } from "express";
import { storage } from "../storage";

const router = Router();

// GET /api/stats - Dashboard statistics
router.get("/stats", async (req: Request, res: Response) => {
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

// GET /api/analytics/funnel - Conversion funnel data
router.get("/funnel", async (req: Request, res: Response) => {
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

// GET /api/analytics/response-rates - Response rates by channel
router.get("/response-rates", async (req: Request, res: Response) => {
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
        replied: 0,
      },
    };

    res.json(responseRates);
  } catch (error) {
    console.error("Error fetching response rates:", error);
    res.status(500).json({ error: "Failed to fetch response rates" });
  }
});

// GET /api/analytics/by-icp - Performance by ICP
router.get("/by-icp", async (req: Request, res: Response) => {
  try {
    const icpProfiles = await storage.getIcpProfiles();
    const leads = await storage.getAllLeads();

    const icpPerformance = await Promise.all(
      icpProfiles.map(async (icp) => {
        const matchingLeads = leads.filter(lead => {
          const criteria = icp.targetCriteria;
          if (!criteria) return false;

          if (criteria.minPopulation && (!lead.population || lead.population < criteria.minPopulation)) return false;
          if (criteria.maxPopulation && lead.population && lead.population > criteria.maxPopulation) return false;

          if (criteria.states && criteria.states.length > 0 && !criteria.states.includes(lead.state)) return false;

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

// GET /api/analytics/by-state - Geographic breakdown
router.get("/by-state", async (req: Request, res: Response) => {
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

// GET /api/analytics/over-time - Activity over time
router.get("/over-time", async (req: Request, res: Response) => {
  try {
    const leads = await storage.getAllLeads();
    const period = (req.query.period as string) || "week";

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dateMap = new Map<string, {
      date: string;
      leadsCreated: number;
      leadsContacted: number;
      meetingsBooked: number;
    }>();

    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dateMap.set(dateKey, { date: dateKey, leadsCreated: 0, leadsContacted: 0, meetingsBooked: 0 });
    }

    for (const lead of leads) {
      if (lead.createdAt && lead.createdAt >= thirtyDaysAgo) {
        const dateKey = new Date(lead.createdAt).toISOString().split('T')[0];
        if (dateMap.has(dateKey)) {
          dateMap.get(dateKey)!.leadsCreated++;
        }
      }

      if (lead.lastContactedAt && lead.lastContactedAt >= thirtyDaysAgo) {
        const dateKey = new Date(lead.lastContactedAt).toISOString().split('T')[0];
        if (dateMap.has(dateKey)) {
          dateMap.get(dateKey)!.leadsContacted++;
          // Count meetings booked on this date
          if (lead.lastCallOutcome === "meeting_scheduled") {
            dateMap.get(dateKey)!.meetingsBooked++;
          }
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

export default router;
