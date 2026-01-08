import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";

// Import route modules
import systemRoutes from "./system";
import leadsRoutes from "./leads";
import scriptsRoutes from "./scripts";
import analyticsRoutes from "./analytics";
import activitiesRoutes from "./activities";
import icpRoutes from "./icp";
import sequencesRoutes from "./sequences";
import scrapingRoutes from "./scraping";
import companyRoutes from "./company";
import aiStreamRoutes from "./ai-stream";
import deduplicationRoutes from "./deduplication";
import predictiveRoutes from "./predictive";
import intelligenceRoutes from "./intelligence";
import briefingRoutes from "./briefing";
import { getAvailableTemplateVariables } from "./utils";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Recover any orphaned scrape jobs from previous server instance
  try {
    const recoveredCount = await storage.recoverOrphanedJobs();
    console.log(`[startup] Orphaned job recovery: ${recoveredCount} job(s) recovered`);
  } catch (error) {
    console.error("[startup] Failed to recover orphaned jobs:", error);
  }

  // ============================================
  // SYSTEM ROUTES
  // ============================================
  app.get("/healthz", systemRoutes);
  app.use("/api/system", systemRoutes);

  // ============================================
  // ANALYTICS & STATS ROUTES
  // ============================================
  app.use("/api", analyticsRoutes);
  app.use("/api/analytics", analyticsRoutes);

  // ============================================
  // LEADS ROUTES
  // ============================================
  app.use("/api/leads", leadsRoutes);

  // Legacy script routes on leads (backward compatibility)
  app.get("/api/leads/:id/script", async (req, res) => {
    req.url = `/lead/${req.params.id}`;
    scriptsRoutes(req, res, () => {});
  });
  app.get("/api/leads/:id/scripts", async (req, res) => {
    req.url = `/lead/${req.params.id}/all`;
    scriptsRoutes(req, res, () => {});
  });
  app.post("/api/leads/:id/generate-script", async (req, res) => {
    req.url = `/generate/${req.params.id}`;
    scriptsRoutes(req, res, () => {});
  });

  // Legacy activity routes on leads (backward compatibility)
  app.get("/api/leads/:id/activities", async (req, res) => {
    req.url = `/lead/${req.params.id}`;
    activitiesRoutes(req, res, () => {});
  });
  app.patch("/api/leads/:id/call-outcome", async (req, res) => {
    req.url = `/lead/${req.params.id}/call-outcome`;
    activitiesRoutes(req, res, () => {});
  });

  // ============================================
  // SCRIPTS ROUTES
  // ============================================
  app.use("/api/scripts", scriptsRoutes);

  // ============================================
  // ICP ROUTES
  // ============================================
  app.use("/api/icp", icpRoutes);

  // ============================================
  // EMAIL SEQUENCES ROUTES
  // ============================================
  app.use("/api/sequences", sequencesRoutes);

  // Template variables endpoint
  app.get("/api/template-variables", (req, res) => {
    res.json(getAvailableTemplateVariables());
  });

  // ============================================
  // ACTIVITIES ROUTES
  // ============================================
  app.use("/api/activities", activitiesRoutes);

  // Legacy sequence activities route (backward compatibility)
  app.get("/api/sequences/:id/activities", async (req, res) => {
    req.url = `/sequence/${req.params.id}`;
    activitiesRoutes(req, res, () => {});
  });

  // ============================================
  // SCRAPING & EXPORT ROUTES
  // ============================================
  app.use("/api/scrape", scrapingRoutes);
  app.post("/api/export", async (req, res) => {
    req.url = "/export";
    scrapingRoutes(req, res, () => {});
  });

  // ============================================
  // COMPANY PROFILE ROUTES
  // ============================================
  app.use("/api/company-profile", companyRoutes);

  // ============================================
  // AI STREAMING ROUTES
  // ============================================
  app.use("/api/ai/stream", aiStreamRoutes);

  // ============================================
  // DEDUPLICATION & FRESHNESS ROUTES
  // ============================================
  app.use("/api/deduplication", deduplicationRoutes);
  app.use("/api/freshness", deduplicationRoutes);

  // ============================================
  // PREDICTIVE SCORING ROUTES
  // ============================================
  app.use("/api/predictive", predictiveRoutes);

  // ============================================
  // INTELLIGENCE ROUTES (Synthesis, Signals, Scoring)
  // ============================================
  app.use("/api/intelligence", intelligenceRoutes);

  // ============================================
  // CALL BRIEFING ROUTES (The Product)
  // ============================================
  app.use("/api/briefing", briefingRoutes);

  return httpServer;
}
