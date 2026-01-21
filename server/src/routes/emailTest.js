import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { sendGoalMilestoneEmail, sendMonthlyReportEmail, sendPasswordChangedEmail } from "../utils/emailService.js";
import { triggerMonthlyReportManually } from "../jobs/monthlyReportJob.js";
import Goal from "../models/Goal.js";
import Finance from "../models/Finance.js";

const router = Router();

router.use(requireAuth);

/**
 * Test Goal Milestone Email
 * POST /api/email-test/milestone
 * Body: { goalId: "...", milestone: 50 }
 */
router.post("/milestone", async (req, res) => {
  try {
    const { goalId, milestone } = req.body;

    if (!goalId || !milestone) {
      return res.status(400).json({ 
        message: "goalId and milestone are required" 
      });
    }

    if (![25, 50, 75, 100].includes(milestone)) {
      return res.status(400).json({ 
        message: "milestone must be 25, 50, 75, or 100" 
      });
    }

    const goal = await Goal.findOne({ _id: goalId, userId: req.user.id });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    await sendGoalMilestoneEmail(req.user, {
      _id: goal._id,
      name: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount || 0,
    }, milestone);

    res.json({ 
      success: true, 
      message: `Milestone ${milestone}% email sent to ${req.user.email}` 
    });
  } catch (error) {
    console.error("Test milestone email error:", error);
    res.status(500).json({ 
      message: "Failed to send test email", 
      error: error.message 
    });
  }
});

/**
 * Test Monthly Report Email
 * POST /api/email-test/monthly-report
 */
router.post("/monthly-report", async (req, res) => {
  try {
    const result = await triggerMonthlyReportManually(req.user.id);

    if (result.success) {
      res.json({ 
        success: true, 
        message: `Monthly report sent to ${req.user.email}` 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Failed to send monthly report", 
        error: result.error 
      });
    }
  } catch (error) {
    console.error("Test monthly report error:", error);
    res.status(500).json({ 
      message: "Failed to send test email", 
      error: error.message 
    });
  }
});

/**
 * Test Password Changed Email
 * POST /api/email-test/password-changed
 */
router.post("/password-changed", async (req, res) => {
  try {
    const deviceInfo = {
      device: req.headers['user-agent'] || 'Test Device',
      location: req.ip || 'Test Location',
      timestamp: new Date()
    };

    await sendPasswordChangedEmail(req.user, deviceInfo);

    res.json({ 
      success: true, 
      message: `Password changed email sent to ${req.user.email}` 
    });
  } catch (error) {
    console.error("Test password changed email error:", error);
    res.status(500).json({ 
      message: "Failed to send test email", 
      error: error.message 
    });
  }
});

/**
 * Test All Emails
 * POST /api/email-test/all
 */
router.post("/all", async (req, res) => {
  try {
    const results = [];

    // 1. Test milestone email (if user has goals)
    const goal = await Goal.findOne({ userId: req.user.id });
    if (goal) {
      try {
        await sendGoalMilestoneEmail(req.user, {
          _id: goal._id,
          name: goal.title,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount || 0,
        }, 50);
        results.push({ type: "milestone", success: true });
      } catch (error) {
        results.push({ type: "milestone", success: false, error: error.message });
      }
    } else {
      results.push({ type: "milestone", success: false, error: "No goals found" });
    }

    // 2. Test monthly report
    try {
      await triggerMonthlyReportManually(req.user.id);
      results.push({ type: "monthly-report", success: true });
    } catch (error) {
      results.push({ type: "monthly-report", success: false, error: error.message });
    }

    // 3. Test password changed
    try {
      await sendPasswordChangedEmail(req.user, {
        device: "Test Device",
        location: "Test Location",
        timestamp: new Date()
      });
      results.push({ type: "password-changed", success: true });
    } catch (error) {
      results.push({ type: "password-changed", success: false, error: error.message });
    }

    const successCount = results.filter(r => r.success).length;

    res.json({ 
      success: true, 
      message: `Sent ${successCount}/${results.length} test emails to ${req.user.email}`,
      results 
    });
  } catch (error) {
    console.error("Test all emails error:", error);
    res.status(500).json({ 
      message: "Failed to send test emails", 
      error: error.message 
    });
  }
});

export default router;
