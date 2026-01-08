import { Router, Request, Response } from "express";

const router = Router();

// GET /healthz - Health check
router.get("/healthz", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// GET /api/system/api-keys-status - Check API key status
router.get("/api-keys-status", (req: Request, res: Response) => {
  const tavilyKey = process.env.TAVILY_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

  res.json({
    tavily: !!tavilyKey && tavilyKey.length > 0,
    anthropic: !!anthropicKey && anthropicKey.length > 0,
  });
});

export default router;
