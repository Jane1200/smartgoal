import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import Goal from "../models/Goal.js";
import GoalAllocationPreference from "../models/GoalAllocationPreference.js";
import MarketplaceIncome from "../models/MarketplaceIncome.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// List goals for current user
router.get("/", async (req, res) => {
  const goals = await Goal.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(goals);
});

// Get goals grouped by time period (short-term vs long-term)
router.get("/by-period", async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id, status: { $ne: "archived" } }).sort({ createdAt: -1 });
    
    const shortTermGoals = goals.filter(g => g.timePeriod === "short-term");
    const longTermGoals = goals.filter(g => g.timePeriod === "long-term");
    
    res.json({
      shortTerm: shortTermGoals,
      longTerm: longTermGoals
    });
  } catch (error) {
    console.error("Failed to fetch goals by period:", error);
    res.status(500).json({ message: "Failed to fetch goals by period" });
  }
});

// Create goal
router.post(
  "/",
  [
    body("title").isString().isLength({ min: 1 }),
    body("description").optional().isString(),
    body("targetAmount").optional().isFloat({ min: 0 }),
    body("currentAmount").optional().isFloat({ min: 0 }),
    body("dueDate").optional().isISO8601(),
    body("status").optional().isIn(["planned", "in_progress", "completed", "archived"]),
    body("timePeriod").optional().isIn(["short-term", "long-term"]),
    body("wantsIncomeAllocation").optional().isFloat({ min: 0, max: 100 }),
    body("sourceWishlistId").optional().isMongoId()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid data", errors: errors.array() });

    const goal = await Goal.create({ ...req.body, userId: req.user.id });
    res.status(201).json(goal);
  }
);

// Update goal
router.put(
  "/:id",
  [
    param("id").isMongoId(),
    body("title").optional().isString().isLength({ min: 1 }),
    body("description").optional().isString(),
    body("targetAmount").optional().isFloat({ min: 0 }),
    body("currentAmount").optional().isFloat({ min: 0 }),
    body("dueDate").optional().isISO8601(),
    body("status").optional().isIn(["planned", "in_progress", "completed", "archived"]),
    body("timePeriod").optional().isIn(["short-term", "long-term"]),
    body("wantsIncomeAllocation").optional().isFloat({ min: 0, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid data", errors: errors.array() });

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.json(goal);
  }
);

// Delete goal
router.delete(
  "/:id",
  [param("id").isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid id" });

    const result = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ message: "Goal not found" });
    res.json({ ok: true });
  }
);

// Get or create goal allocation preference
router.get("/allocation-preference/settings", async (req, res) => {
  try {
    let preference = await GoalAllocationPreference.findOne({ userId: req.user.id });
    
    // Create default preference if not exists
    if (!preference) {
      preference = await GoalAllocationPreference.create({
        userId: req.user.id,
        shortTermRatio: 70,
        longTermRatio: 30,
        allocationMode: "automatic"
      });
    }
    
    res.json(preference);
  } catch (error) {
    console.error("Failed to get allocation preference:", error);
    res.status(500).json({ message: "Failed to get allocation preference" });
  }
});

// Update goal allocation preference
router.put("/allocation-preference/settings", [
  body("shortTermRatio").optional().isInt({ min: 0, max: 100 }),
  body("longTermRatio").optional().isInt({ min: 0, max: 100 }),
  body("allocationMode").optional().isIn(["automatic", "manual"]),
  body("manualAllocations").optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid data", errors: errors.array() });

    let preference = await GoalAllocationPreference.findOne({ userId: req.user.id });
    
    if (!preference) {
      preference = await GoalAllocationPreference.create({
        userId: req.user.id,
        ...req.body
      });
    } else {
      Object.assign(preference, req.body);
      await preference.save();
    }
    
    res.json(preference);
  } catch (error) {
    console.error("Failed to update allocation preference:", error);
    res.status(500).json({ message: "Failed to update allocation preference", error: error.message });
  }
});

// Distribute wants income to goals
router.post("/distribute-wants-income", [
  body("wantsIncomeAmount").isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid data", errors: errors.array() });

    const { wantsIncomeAmount } = req.body;
    const userId = req.user.id;

    // Get user's allocation preference
    let preference = await GoalAllocationPreference.findOne({ userId });
    if (!preference) {
      preference = await GoalAllocationPreference.create({
        userId,
        shortTermRatio: 70,
        longTermRatio: 30,
        allocationMode: "automatic"
      });
    }

    // Get user's goals
    const goals = await Goal.find({ userId, status: { $ne: "archived" } });

    if (goals.length === 0) {
      return res.status(400).json({ message: "No goals found to allocate income to" });
    }

    const allocations = [];

    if (preference.allocationMode === "automatic") {
      // Get goals by time period
      const shortTermGoals = goals.filter(g => g.timePeriod === "short-term");
      const longTermGoals = goals.filter(g => g.timePeriod === "long-term");

      const shortTermAmount = (wantsIncomeAmount * preference.shortTermRatio) / 100;
      const longTermAmount = (wantsIncomeAmount * preference.longTermRatio) / 100;

      // Distribute to short-term goals
      if (shortTermGoals.length > 0) {
        const perGoalAmount = shortTermAmount / shortTermGoals.length;
        for (const goal of shortTermGoals) {
          goal.currentAmount = (goal.currentAmount || 0) + perGoalAmount;
          await goal.save();
          allocations.push({
            goalId: goal._id,
            amount: perGoalAmount,
            method: "automatic"
          });
        }
      }

      // Distribute to long-term goals
      if (longTermGoals.length > 0) {
        const perGoalAmount = longTermAmount / longTermGoals.length;
        for (const goal of longTermGoals) {
          goal.currentAmount = (goal.currentAmount || 0) + perGoalAmount;
          await goal.save();
          allocations.push({
            goalId: goal._id,
            amount: perGoalAmount,
            method: "automatic"
          });
        }
      }
    } else {
      // Manual allocation using preference settings
      for (const manualAlloc of preference.manualAllocations) {
        const goal = goals.find(g => g._id.toString() === manualAlloc.goalId.toString());
        if (goal) {
          const allocAmount = (wantsIncomeAmount * manualAlloc.percentage) / 100;
          goal.currentAmount = (goal.currentAmount || 0) + allocAmount;
          await goal.save();
          allocations.push({
            goalId: goal._id,
            amount: allocAmount,
            method: "manual"
          });
        }
      }
    }

    // Record allocation history
    preference.allocationHistory.push({
      date: new Date(),
      wantsIncomeAmount,
      allocations
    });
    await preference.save();

    res.json({
      message: "Wants income distributed successfully",
      wantsIncomeAmount,
      allocations,
      updatedGoals: await Goal.find({ userId, status: { $ne: "archived" } })
    });
  } catch (error) {
    console.error("Failed to distribute wants income:", error);
    res.status(500).json({ message: "Failed to distribute wants income", error: error.message });
  }
});

// Distribute marketplace income to goals
router.post("/distribute-marketplace-income/:incomeId", async (req, res) => {
  try {
    const { incomeId } = req.params;
    const userId = req.user.id;

    const marketplaceIncome = await MarketplaceIncome.findOne({
      _id: incomeId,
      sellerId: userId,
      status: "confirmed",
      "distributionStatus.isDistributed": false
    });

    if (!marketplaceIncome) {
      return res.status(404).json({ message: "Marketplace income not found or already distributed" });
    }

    // Get user's goals
    const goals = await Goal.find({ userId, status: { $ne: "archived" } });
    
    if (goals.length === 0) {
      return res.status(400).json({ message: "No goals found to allocate marketplace income to" });
    }

    // Get allocation preference
    let preference = await GoalAllocationPreference.findOne({ userId });
    if (!preference) {
      preference = await GoalAllocationPreference.create({
        userId,
        shortTermRatio: 70,
        longTermRatio: 30,
        allocationMode: "automatic"
      });
    }

    const goalDistributions = [];
    const amount = marketplaceIncome.amount;

    if (preference.allocationMode === "automatic") {
      const shortTermGoals = goals.filter(g => g.timePeriod === "short-term");
      const longTermGoals = goals.filter(g => g.timePeriod === "long-term");

      const shortTermAmount = (amount * preference.shortTermRatio) / 100;
      const longTermAmount = (amount * preference.longTermRatio) / 100;

      if (shortTermGoals.length > 0) {
        const perGoalAmount = shortTermAmount / shortTermGoals.length;
        for (const goal of shortTermGoals) {
          goal.currentAmount = (goal.currentAmount || 0) + perGoalAmount;
          await goal.save();
          goalDistributions.push({
            goalId: goal._id,
            amount: perGoalAmount
          });
        }
      }

      if (longTermGoals.length > 0) {
        const perGoalAmount = longTermAmount / longTermGoals.length;
        for (const goal of longTermGoals) {
          goal.currentAmount = (goal.currentAmount || 0) + perGoalAmount;
          await goal.save();
          goalDistributions.push({
            goalId: goal._id,
            amount: perGoalAmount
          });
        }
      }
    } else {
      for (const manualAlloc of preference.manualAllocations) {
        const goal = goals.find(g => g._id.toString() === manualAlloc.goalId.toString());
        if (goal) {
          const allocAmount = (amount * manualAlloc.percentage) / 100;
          goal.currentAmount = (goal.currentAmount || 0) + allocAmount;
          await goal.save();
          goalDistributions.push({
            goalId: goal._id,
            amount: allocAmount
          });
        }
      }
    }

    // Mark as distributed
    marketplaceIncome.distributionStatus.isDistributed = true;
    marketplaceIncome.distributionStatus.distributedAt = new Date();
    marketplaceIncome.distributionStatus.goalDistributions = goalDistributions;
    marketplaceIncome.status = "distributed";
    await marketplaceIncome.save();

    res.json({
      message: "Marketplace income distributed successfully",
      distribution: {
        incomeAmount: amount,
        goalDistributions,
        updatedGoals: await Goal.find({ userId, status: { $ne: "archived" } })
      }
    });
  } catch (error) {
    console.error("Failed to distribute marketplace income:", error);
    res.status(500).json({ message: "Failed to distribute marketplace income", error: error.message });
  }
});

export default router;



