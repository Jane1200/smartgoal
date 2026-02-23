import { Router } from "express";
import { triggerMonthlyReportManually } from "../jobs/monthlyReportJob.js";

const router = Router();

/**
 * Vercel Cron: monthly report job.
 * Secured by CRON_SECRET. Set in Vercel env and in vercel.json cron auth.
 */
router.all("/monthly-report", async (req, res) => {
  const secret = req.headers.authorization?.replace("Bearer ", "") || req.query.secret;
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const result = await triggerMonthlyReportManually();
    res.json(result);
  } catch (err) {
    console.error("Cron monthly-report error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
