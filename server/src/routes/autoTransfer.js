import express from "express";
import AutoTransfer from "../models/AutoTransfer.js";
import TransferHistory from "../models/TransferHistory.js";
import Goal from "../models/Goal.js";
import Finance from "../models/Finance.js";
import { sortGoalsByPriority } from "../utils/goalPriority.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Get all auto-transfers for the authenticated user
router.get("/", async (req, res) => {
  try {
    const autoTransfers = await AutoTransfer.find({ userId: req.user.id })
      .populate("goalId", "title targetAmount currentAmount category priority status")
      .sort({ createdAt: -1 });

    res.json(autoTransfers);
  } catch (error) {
    console.error("Get auto-transfers error:", error);
    res.status(500).json({ message: "Failed to fetch auto-transfers" });
  }
});

// Create a new auto-transfer
router.post("/", async (req, res) => {
  try {
    const { goalId, amount, frequency } = req.body;

    // Validate goal exists and belongs to user
    const goal = await Goal.findOne({ _id: goalId, userId: req.user.id });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    // Check if auto-transfer already exists for this goal
    const existing = await AutoTransfer.findOne({ userId: req.user.id, goalId });
    if (existing) {
      return res.status(400).json({ message: "Auto-transfer already exists for this goal" });
    }

    // Calculate next transfer date based on frequency
    const nextTransferDate = calculateNextTransferDate(frequency);

    const autoTransfer = new AutoTransfer({
      userId: req.user.id,
      goalId,
      amount,
      frequency,
      nextTransferDate
    });

    await autoTransfer.save();
    await autoTransfer.populate("goalId", "title targetAmount currentAmount category priority status");

    res.status(201).json(autoTransfer);
  } catch (error) {
    console.error("Create auto-transfer error:", error);
    res.status(500).json({ message: "Failed to create auto-transfer" });
  }
});

// Update an auto-transfer
router.put("/:id", async (req, res) => {
  try {
    const { amount, frequency, isActive } = req.body;

    const autoTransfer = await AutoTransfer.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!autoTransfer) {
      return res.status(404).json({ message: "Auto-transfer not found" });
    }

    if (amount !== undefined) autoTransfer.amount = amount;
    if (frequency !== undefined) {
      autoTransfer.frequency = frequency;
      autoTransfer.nextTransferDate = calculateNextTransferDate(frequency, autoTransfer.lastTransferDate);
    }
    if (isActive !== undefined) autoTransfer.isActive = isActive;

    await autoTransfer.save();
    await autoTransfer.populate("goalId", "title targetAmount currentAmount category priority status");

    res.json(autoTransfer);
  } catch (error) {
    console.error("Update auto-transfer error:", error);
    res.status(500).json({ message: "Failed to update auto-transfer" });
  }
});

// Delete an auto-transfer
router.delete("/:id", async (req, res) => {
  try {
    const autoTransfer = await AutoTransfer.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!autoTransfer) {
      return res.status(404).json({ message: "Auto-transfer not found" });
    }

    res.json({ message: "Auto-transfer deleted successfully" });
  } catch (error) {
    console.error("Delete auto-transfer error:", error);
    res.status(500).json({ message: "Failed to delete auto-transfer" });
  }
});

// Get transfer history
router.get("/history", async (req, res) => {
  try {
    const { limit = 50, goalId } = req.query;

    const query = { userId: req.user.id };
    if (goalId) query.goalId = goalId;

    const history = await TransferHistory.find(query)
      .populate("goalId", "title category priority")
      .sort({ transferDate: -1 })
      .limit(parseInt(limit));

    res.json(history);
  } catch (error) {
    console.error("Get transfer history error:", error);
    res.status(500).json({ message: "Failed to fetch transfer history" });
  }
});

// Execute pending transfers (called by cron job or manually)
router.post("/execute", async (req, res) => {
  try {
    const now = new Date();

    // Find all active auto-transfers that are due
    const dueTransfers = await AutoTransfer.find({
      userId: req.user.id,
      isActive: true,
      nextTransferDate: { $lte: now }
    }).populate("goalId");

    if (dueTransfers.length === 0) {
      return res.json({ message: "No pending transfers", executed: 0 });
    }

    // Get user's available savings
    const finances = await Finance.find({ userId: req.user.id });
    const totalSavings = finances.reduce((sum, f) => sum + (f.savings || 0), 0);

    // Sort transfers by goal priority
    const goals = dueTransfers.map(t => t.goalId);
    const sortedGoals = sortGoalsByPriority(goals);
    const sortedTransfers = dueTransfers.sort((a, b) => {
      const indexA = sortedGoals.findIndex(g => g._id.toString() === a.goalId._id.toString());
      const indexB = sortedGoals.findIndex(g => g._id.toString() === b.goalId._id.toString());
      return indexA - indexB;
    });

    let remainingSavings = totalSavings;
    const results = [];

    for (const transfer of sortedTransfers) {
      const goal = transfer.goalId;

      // Skip if goal is completed or archived
      if (goal.status === "completed" || goal.status === "archived") {
        const history = new TransferHistory({
          userId: req.user.id,
          goalId: goal._id,
          autoTransferId: transfer._id,
          amount: 0,
          status: "skipped",
          reason: `Goal is ${goal.status}`
        });
        await history.save();
        
        // Deactivate auto-transfer for completed/archived goals
        transfer.isActive = false;
        await transfer.save();
        
        results.push({ goalId: goal._id, status: "skipped", reason: `Goal is ${goal.status}` });
        continue;
      }

      // Check if enough savings available
      if (remainingSavings < transfer.amount) {
        const history = new TransferHistory({
          userId: req.user.id,
          goalId: goal._id,
          autoTransferId: transfer._id,
          amount: 0,
          status: "failed",
          reason: "Insufficient savings"
        });
        await history.save();
        
        results.push({ goalId: goal._id, status: "failed", reason: "Insufficient savings" });
        continue;
      }

      // Execute transfer
      const transferAmount = Math.min(transfer.amount, goal.targetAmount - goal.currentAmount);
      
      goal.currentAmount += transferAmount;
      if (goal.currentAmount >= goal.targetAmount) {
        goal.status = "completed";
      } else if (goal.status === "planned") {
        goal.status = "in_progress";
      }
      await goal.save();

      remainingSavings -= transferAmount;

      // Update auto-transfer
      transfer.lastTransferDate = now;
      transfer.nextTransferDate = calculateNextTransferDate(transfer.frequency, now);
      transfer.totalTransferred += transferAmount;
      transfer.transferCount += 1;
      await transfer.save();

      // Record history
      const history = new TransferHistory({
        userId: req.user.id,
        goalId: goal._id,
        autoTransferId: transfer._id,
        amount: transferAmount,
        status: "success"
      });
      await history.save();

      results.push({ goalId: goal._id, status: "success", amount: transferAmount });
    }

    res.json({ 
      message: "Transfers executed", 
      executed: results.filter(r => r.status === "success").length,
      results 
    });
  } catch (error) {
    console.error("Execute transfers error:", error);
    res.status(500).json({ message: "Failed to execute transfers" });
  }
});

// Helper function to calculate next transfer date
function calculateNextTransferDate(frequency, fromDate = new Date()) {
  const date = new Date(fromDate);
  
  switch (frequency) {
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "biweekly":
      date.setDate(date.getDate() + 14);
      break;
    case "monthly":
    default:
      date.setMonth(date.getMonth() + 1);
      break;
  }
  
  return date;
}

export default router;