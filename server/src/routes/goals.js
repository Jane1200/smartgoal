import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import Goal from "../models/Goal.js";
import GoalAllocationPreference from "../models/GoalAllocationPreference.js";
import MarketplaceIncome from "../models/MarketplaceIncome.js";
import Notification from "../models/Notification.js";
import AutoTransfer from "../models/AutoTransfer.js";
import Finance from "../models/Finance.js";
import { requireAuth } from "../middleware/auth.js";
import { checkSufficientSavings, calculateUserSavings } from "../utils/financeUtils.js";
import { predictGoalAchievement, predictMultipleGoals } from "../utils/goalPrediction.js";
import { sendGoalMilestoneEmail } from "../utils/emailService.js";

const router = Router();

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

router.use(requireAuth);

// Helper function to check if user has emergency fund
function hasEmergencyFund(goals) {
  return goals.some(goal => 
    goal.category === "emergency_fund" && 
    (goal.status === "planned" || goal.status === "in_progress" || goal.status === "completed")
  );
}

// Helper function to calculate emergency fund target
function calculateEmergencyFundTarget(monthlyExpense) {
  return monthlyExpense * 3; // 3 months of expenses
}

// List goals for current user
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    let goals = await Goal.find({ userId }).sort({ createdAt: -1 });
    
    // Calculate dynamic currentAmount based on savings allocation (50/30/20 rule)
    try {
      // Get user's finance data to calculate savings
      const financeData = await Finance.getUserFinanceSummary(userId);
      let totalIncome = 0;
      let totalExpenses = 0;
      
      financeData.forEach(item => {
        if (item._id === 'income') {
          totalIncome = item.total;
        } else if (item._id === 'expense') {
          totalExpenses = item.total;
        }
      });
      
      // Calculate actual savings (what user has saved so far)
      const actualSavings = totalIncome - totalExpenses;
      
      // Get monthly income for 50/30/20 rule calculation
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      
      const monthlySummary = await Finance.getUserFinanceSummary(userId, {
        month: currentMonth,
        year: currentYear
      });
      
      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      
      monthlySummary.forEach(item => {
        if (item._id === 'income') {
          monthlyIncome = item.total;
        } else if (item._id === 'expense') {
          monthlyExpenses = item.total;
        }
      });
      
      // Calculate savings using 50/30/20 rule
      // 20% of income should go to savings/goals
      const recommendedMonthlySavings = monthlyIncome * 0.20;
      const actualMonthlySavings = monthlyIncome - monthlyExpenses;
      
      // Use the minimum of actual savings available for goals
      // This ensures we only allocate what the user has actually saved
      const savingsForGoals = Math.max(0, actualSavings);
      
      console.log(`💰 Goal Allocation - Total Savings: ₹${actualSavings.toFixed(2)}, Monthly Income: ₹${monthlyIncome.toFixed(2)}, Recommended 20%: ₹${recommendedMonthlySavings.toFixed(2)}`);
      
      // If user has savings, allocate them to goals based on priority and category
      if (savingsForGoals > 0 && goals.length > 0) {
        // Filter active goals (not completed or archived)
        const activeGoals = goals.filter(g => g.status !== 'completed' && g.status !== 'archived');
        
        if (activeGoals.length > 0) {
          // Sort by priority (1 = critical first, then by category importance)
          const sortedGoals = [...activeGoals].sort((a, b) => {
            // First sort by priority
            if (a.priority !== b.priority) {
              return a.priority - b.priority;
            }
            // Then by category (emergency fund first)
            const categoryOrder = {
              'emergency_fund': 1,
              'debt_repayment': 2,
              'essential_purchase': 3,
              'education': 4,
              'investment': 5,
              'discretionary': 6,
              'other': 7
            };
            return (categoryOrder[a.category] || 7) - (categoryOrder[b.category] || 7);
          });
          
          // Calculate total target needed for all active goals
          const totalTargetNeeded = sortedGoals.reduce((sum, g) => sum + (g.targetAmount - (g.currentAmount || 0)), 0);
          
          console.log(`📊 Active Goals: ${activeGoals.length}, Total Target Needed: ₹${totalTargetNeeded.toFixed(2)}`);
          
          // REALISTIC ALLOCATION: Only allocate NEW savings (not already allocated)
          const totalAllocatedToGoals = activeGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
          const newSavingsToAllocate = Math.max(0, savingsForGoals - totalAllocatedToGoals);
          
          console.log(`💵 Total Savings: ₹${savingsForGoals.toFixed(2)}, Already Allocated: ₹${totalAllocatedToGoals.toFixed(2)}, New to Allocate: ₹${newSavingsToAllocate.toFixed(2)}`);
          
          // Sort goals by priority (1 = highest priority)
          const prioritySortedGoals = [...activeGoals].sort((a, b) => {
            if (a.priority !== b.priority) {
              return a.priority - b.priority;
            }
            return new Date(a.dueDate) - new Date(b.dueDate);
          });
          
          // Allocate NEW savings to goals based on priority
          let remainingSavings = newSavingsToAllocate;
          
          // Allocate savings to goals using PRIORITY-BASED allocation
          goals = await Promise.all(goals.map(async (goal) => {
            if (goal.status === 'completed' || goal.status === 'archived') {
              return goal;
            }
            
            const targetNeeded = goal.targetAmount - (goal.currentAmount || 0);
            
            // Calculate allocation for this goal
            let allocation = 0;
            if (targetNeeded > 0 && remainingSavings > 0) {
              // Find this goal in sorted list to check if it should get allocation
              const goalIndex = prioritySortedGoals.findIndex(g => g._id.toString() === goal._id.toString());
              if (goalIndex !== -1) {
                // Allocate as much as possible (up to what's needed)
                allocation = Math.min(targetNeeded, remainingSavings);
                remainingSavings -= allocation;
              }
            }
            
            const newCurrentAmount = (goal.currentAmount || 0) + allocation;
            const progress = (newCurrentAmount / goal.targetAmount) * 100;
            
            console.log(`  Goal: "${goal.title}" - Allocated: ₹${allocation.toFixed(2)}, New Current: ₹${newCurrentAmount.toFixed(2)}/${goal.targetAmount} (${progress.toFixed(0)}%)`);
            
            // Dynamically update status based on progress
            let newStatus = goal.status;
            let statusChanged = false;
            
            if (progress >= 100 && goal.status !== 'achieved') {
              // 100% progress → achieved
              newStatus = 'achieved';
              statusChanged = true;
              console.log(`  ✅ Goal "${goal.title}" automatically marked as ACHIEVED (100% progress)!`);
            } else if (progress > 0 && progress < 100 && goal.status === 'planned') {
              // 1-99% progress and currently planned → in_progress
              newStatus = 'in_progress';
              statusChanged = true;
              console.log(`  🚀 Goal "${goal.title}" automatically marked as IN PROGRESS (${progress.toFixed(0)}% progress)!`);
            } else if (progress === 0 && goal.status === 'in_progress' && newCurrentAmount === 0) {
              // 0% progress and currently in_progress → back to planned
              newStatus = 'planned';
              statusChanged = true;
              console.log(`  ⏸️ Goal "${goal.title}" automatically marked as PLANNED (0% progress)!`);
            }
            
            // Check if currentAmount changed significantly (more than ₹1 difference)
            const amountChanged = Math.abs(newCurrentAmount - (goal.currentAmount || 0)) > 1;
            
            // Update database if status changed, amount changed, or goal reached 100%
            if (statusChanged || amountChanged || progress >= 100) {
              try {
                const updateData = { 
                  status: newStatus,
                  currentAmount: progress >= 100 ? goal.targetAmount : newCurrentAmount
                };
                
                const updatedGoal = await Goal.findByIdAndUpdate(
                  goal._id,
                  updateData,
                  { new: true } // Return the updated document
                );
                
                console.log(`  💾 Saved to database: ${goal.title} - ₹${updateData.currentAmount.toFixed(2)}`);
                
                // Return the updated goal from database
                return updatedGoal;
              } catch (updateError) {
                console.error(`  ❌ Failed to update goal "${goal.title}":`, updateError);
                // If update fails, return goal with virtual currentAmount and status
                return {
                  ...goal.toObject(),
                  currentAmount: newCurrentAmount,
                  status: newStatus
                };
              }
            }
            
            // Return goal with updated currentAmount (virtual, not saved to DB if no significant change)
            return {
              ...goal.toObject(),
              currentAmount: newCurrentAmount
            };
          }));
        }
      } else if (savingsForGoals <= 0) {
        console.log('⚠️ No savings available to allocate to goals');
      }
    } catch (error) {
      console.error('❌ Error calculating dynamic goal amounts:', error);
      console.error('Error stack:', error.stack);
      // Continue with original goals if allocation fails
    }
    
    // Check if emergency fund alert should be created
    setTimeout(async () => {
      try {
        if (!hasEmergencyFund(goals)) {
          // Get monthly expense to calculate target
          const currentDate = new Date();
          const currentMonth = currentDate.getMonth() + 1;
          const currentYear = currentDate.getFullYear();
          
          const summary = await Finance.getUserFinanceSummary(userId, {
            month: currentMonth,
            year: currentYear
          });
          
          let monthlyExpense = 0;
          summary.forEach(item => {
            if (item._id === 'expense') {
              monthlyExpense = item.total;
            }
          });
          
          // Only create alert if user has expenses and no emergency fund goal
          if (monthlyExpense > 0) {
            const targetAmount = calculateEmergencyFundTarget(monthlyExpense);
            
            // Check if notification already exists today to avoid duplicates
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const existingNotification = await Notification.findOne({
              userId,
              category: 'goal',
              title: 'Build Your Emergency Fund First!',
              createdAt: { $gte: today }
            });
            
            if (!existingNotification) {
              await Notification.createEmergencyFundAlert(userId, monthlyExpense, targetAmount);
              console.log(`✓ Emergency fund alert created for user with ₹${monthlyExpense} monthly expense`);
            }
          }
        }
      } catch (err) {
        console.error("Error checking emergency fund:", err);
      }
    }, 1000);
    
  res.json(goals);
  } catch (error) {
    console.error("Get goals error:", error);
    res.status(500).json({ message: "Failed to fetch goals" });
  }
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

// Get goal achievement predictions (ML-powered)
router.get("/predictions", async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all active goals
    const goals = await Goal.find({ 
      userId, 
      status: { $in: ["planned", "in_progress"] }
    });
    
    if (goals.length === 0) {
      return res.json({ 
        success: true, 
        predictions: [],
        message: "No active goals to predict"
      });
    }
    
    // Get financial transaction history
    const financeHistory = await Finance.find({ userId }).sort({ date: 1 });
    
    if (financeHistory.length === 0) {
      return res.json({
        success: true,
        predictions: goals.map(goal => ({
          goalId: goal._id,
          goalTitle: goal.title,
          prediction: {
            probability: 50,
            probabilityPercentage: 50,
            estimatedCompletionDate: null,
            riskLevel: "unknown",
            insights: ["Add financial transactions to get accurate predictions"],
            metrics: {},
            recommendations: []
          }
        })),
        message: "Need financial data for accurate predictions"
      });
    }
    
    // Generate predictions for all goals
    const predictions = predictMultipleGoals(goals, financeHistory);
    
    res.json({
      success: true,
      predictions,
      totalGoals: goals.length,
      dataPoints: financeHistory.length
    });
  } catch (error) {
    console.error("Goal prediction error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to generate predictions",
      error: error.message 
    });
  }
});

// Get prediction for a specific goal
router.get("/predictions/:goalId", async (req, res) => {
  try {
    const { goalId } = req.params;
    const userId = req.user.id;
    
    // Get the goal
    const goal = await Goal.findOne({ _id: goalId, userId });
    
    if (!goal) {
      return res.status(404).json({ 
        success: false, 
        message: "Goal not found" 
      });
    }
    
    // Get financial transaction history
    const financeHistory = await Finance.find({ userId }).sort({ date: 1 });
    
    if (financeHistory.length === 0) {
      return res.json({
        success: true,
        goalId: goal._id,
        goalTitle: goal.title,
        prediction: {
          probability: 50,
          probabilityPercentage: 50,
          estimatedCompletionDate: null,
          riskLevel: "unknown",
          insights: ["Add financial transactions to get accurate predictions"],
          metrics: {},
          recommendations: []
        },
        message: "Need financial data for accurate predictions"
      });
    }
    
    // Generate prediction
    const prediction = predictGoalAchievement(goal, financeHistory);
    
    res.json({
      success: true,
      goalId: goal._id,
      goalTitle: goal.title,
      goalDetails: {
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        dueDate: goal.dueDate,
        priority: goal.priority,
        category: goal.category,
        status: goal.status
      },
      prediction,
      dataPoints: financeHistory.length
    });
  } catch (error) {
    console.error("Goal prediction error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to generate prediction",
      error: error.message 
    });
  }
});

// Create goal
router.post(
  "/",
  [
    body("title")
      .isString()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Title must be between 3 and 100 characters")
      .matches(/^[a-zA-Z0-9\s\-_.,!?():]+$/)
      .withMessage("Only letters, numbers, spaces, and basic punctuation allowed")
      .custom((value) => {
        // Check for suspicious patterns
        const lowerText = value.toLowerCase();
        const suspiciousWords = [
          'test', 'testing', 'asdf', 'qwerty', 'dummy', 'sample', 'example', 'temp',
          'aaaa', 'bbbb', 'cccc', 'lorem', 'ipsum', '123456'
        ];
        
        // Check if entire text is just repeated characters
        if (/^(.)\1{2,}$/.test(lowerText)) {
          throw new Error('Please enter a meaningful goal title');
        }
        
        // Check if text contains only numbers
        if (/^\d+$/.test(lowerText)) {
          throw new Error('Title cannot be only numbers');
        }
        
        // Check for excessive repeated characters
        if (/(.)\1{4,}/.test(lowerText)) {
          throw new Error('Please avoid excessive repeated characters');
        }
        
        // Check against suspicious words
        if (suspiciousWords.some(word => lowerText.includes(word))) {
          throw new Error('Please enter a meaningful goal title');
        }
        
        return true;
      }),
    body("description")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters")
      .custom((value) => {
        if (!value) return true; // Optional field
        
        const lowerText = value.toLowerCase();
        const suspiciousWords = [
          'test', 'testing', 'asdf', 'qwerty', 'dummy', 'sample', 'example', 'temp',
          'aaaa', 'bbbb', 'cccc', 'lorem', 'ipsum'
        ];
        
        // Check for suspicious patterns
        if (/^(.)\1{2,}$/.test(lowerText) || /(.)\1{4,}/.test(lowerText)) {
          throw new Error('Please enter a meaningful description');
        }
        
        if (suspiciousWords.some(word => lowerText.includes(word))) {
          throw new Error('Please enter a meaningful description');
        }
        
        return true;
      }),
    body("targetAmount").optional().isFloat({ min: 0 }),
    body("currentAmount").optional().isFloat({ min: 0 }),
    body("dueDate").optional().isISO8601(),
    body("status").optional().isIn(["planned", "in_progress", "completed", "archived", "achieved"]),
    body("category").optional().isIn(["emergency_fund", "debt_repayment", "essential_purchase", "education", "investment", "discretionary", "other"]),
    body("priority").optional().isInt({ min: 1, max: 5 }),
    body("timePeriod").optional().isIn(["short-term", "long-term"]),
    body("wantsIncomeAllocation").optional().isFloat({ min: 0, max: 100 }),
    body("sourceWishlistId").optional().isMongoId()
  ],
  async (req, res) => {
    try {
    const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        console.log("❌ Goal creation validation failed:", errorMessages);
        console.log("❌ Validation errors:", errors.array());
        console.log("❌ Request body that failed:", {
          title: req.body.title,
          titleLength: req.body.title?.length,
          category: req.body.category,
          priority: req.body.priority,
          sourceWishlistId: req.body.sourceWishlistId
        });
        return res.status(400).json({ 
          message: errorMessages, 
          errors: errors.array(),
          receivedTitle: req.body.title,
          titleLength: req.body.title?.length
        });
      }

      const userId = req.user.id;
      console.log("🎯 Creating goal with data:", { ...req.body, userId });
      const goal = await Goal.create({ ...req.body, userId });
      console.log("✅ Goal created successfully:", goal._id, goal.title, "from wishlist:", req.body.sourceWishlistId || 'N/A');
      
      // ===== AUTO-AUTOMATION SETUP USING 50/30/20 RULE =====
      try {
        // Get user's monthly income
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        
        const summary = await Finance.getUserFinanceSummary(userId, {
          month: currentMonth,
          year: currentYear
        });
        
        let monthlyIncome = 0;
        summary.forEach(item => {
          if (item._id === 'income') {
            monthlyIncome = item.total;
          }
        });
        
        // Only create auto-transfer if user has income
        if (monthlyIncome > 0) {
          // Calculate 20% of monthly income for savings (50/30/20 rule)
          const totalSavingsAllocation = monthlyIncome * 0.20;
          
          // Get all active goals (including the newly created one)
          const activeGoals = await Goal.find({ 
            userId, 
            status: { $in: ["planned", "in_progress"] }
          });
          
          // Calculate per-goal allocation
          const numberOfGoals = activeGoals.length;
          const amountPerGoal = numberOfGoals > 0 ? Math.floor(totalSavingsAllocation / numberOfGoals) : totalSavingsAllocation;
          
          // Only create auto-transfer if amount is meaningful (at least ₹50)
          if (amountPerGoal >= 50) {
            // Create auto-transfer for the new goal
            const existingAutoTransfer = await AutoTransfer.findOne({ userId, goalId: goal._id });
            
            if (!existingAutoTransfer) {
              const nextTransferDate = calculateNextTransferDate("monthly");
              
              await AutoTransfer.create({
                userId,
                goalId: goal._id,
                amount: amountPerGoal,
                frequency: "monthly",
                nextTransferDate,
                isActive: true
              });
              
              console.log(`✓ Auto-transfer created for goal "${goal.title}" with ₹${amountPerGoal}/month based on 50/30/20 rule`);
            }
            
            // Update existing auto-transfers to re-balance amounts across all goals
            const existingAutoTransfers = await AutoTransfer.find({
              userId,
              goalId: { $ne: goal._id }, // Exclude the newly created one
              isActive: true
            });
            
            for (const autoTransfer of existingAutoTransfers) {
              // Only update if the amount has changed significantly (more than ₹10 difference)
              if (Math.abs(autoTransfer.amount - amountPerGoal) > 10) {
                autoTransfer.amount = amountPerGoal;
                await autoTransfer.save();
                console.log(`✓ Updated auto-transfer for existing goal to ₹${amountPerGoal}/month`);
              }
            }
          } else {
            console.log(`⚠️ Monthly income too low to create meaningful auto-transfer (would be ₹${amountPerGoal})`);
          }
        } else {
          console.log(`⚠️ No monthly income found for user, skipping auto-transfer creation`);
        }
      } catch (autoError) {
        // Log error but don't fail goal creation
        console.error("Failed to create auto-transfer for new goal:", autoError);
      }
      // ===== END AUTO-AUTOMATION SETUP =====
      
    res.status(201).json(goal);
    } catch (error) {
      console.error("Goal creation error:", error);
      res.status(500).json({ message: "Failed to create goal" });
    }
  }
);

// Update goal
router.put(
  "/:id",
  [
    param("id").isMongoId(),
    body("title")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage("Title must be between 3 and 100 characters")
      .matches(/^[a-zA-Z0-9\s\-_.,!?():]+$/)
      .withMessage("Only letters, numbers, spaces, and basic punctuation allowed")
      .custom((value) => {
        if (!value) return true; // Skip if not provided
        const lowerText = value.toLowerCase();
        const suspiciousWords = [
          'test', 'testing', 'asdf', 'qwerty', 'dummy', 'sample', 'example', 'temp',
          'aaaa', 'bbbb', 'cccc', 'lorem', 'ipsum', '123456'
        ];
        
        if (/^(.)\1{2,}$/.test(lowerText) || /(.)\1{4,}/.test(lowerText)) {
          throw new Error('Please enter a meaningful goal title');
        }
        
        if (/^\d+$/.test(lowerText)) {
          throw new Error('Title cannot be only numbers');
        }
        
        if (suspiciousWords.some(word => lowerText.includes(word))) {
          throw new Error('Please enter a meaningful goal title');
        }
        
        return true;
      }),
    body("description")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters")
      .custom((value) => {
        if (!value) return true;
        const lowerText = value.toLowerCase();
        const suspiciousWords = [
          'test', 'testing', 'asdf', 'qwerty', 'dummy', 'sample', 'example', 'temp',
          'aaaa', 'bbbb', 'cccc', 'lorem', 'ipsum'
        ];
        
        if (/^(.)\1{2,}$/.test(lowerText) || /(.)\1{4,}/.test(lowerText)) {
          throw new Error('Please enter a meaningful description');
        }
        
        if (suspiciousWords.some(word => lowerText.includes(word))) {
          throw new Error('Please enter a meaningful description');
        }
        
        return true;
      }),
    body("targetAmount").optional().isFloat({ min: 0 }),
    body("currentAmount").optional().isFloat({ min: 0 }),
    body("dueDate").optional().isISO8601(),
    body("status").optional().isIn(["planned", "in_progress", "completed", "archived", "achieved"]),
    body("category").optional().isIn(["emergency_fund", "debt_repayment", "essential_purchase", "education", "investment", "discretionary", "other"]),
    body("priority").optional().isInt({ min: 1, max: 5 }),
    body("timePeriod").optional().isIn(["short-term", "long-term"]),
    body("wantsIncomeAllocation").optional().isFloat({ min: 0, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg).join(', ');
      return res.status(400).json({ message: errorMessages, errors: errors.array() });
    }

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

// Complete goal - Mark as completed and create expense entry to deduct from savings
router.post(
  "/:id/complete",
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid id" });

      const userId = req.user.id;
      const goal = await Goal.findOne({ _id: req.params.id, userId });
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      // Check if goal is achieved (100% progress)
      if (goal.status !== 'achieved' && goal.currentAmount < goal.targetAmount) {
        return res.status(400).json({ 
          message: "Goal must be at 100% progress (achieved status) before completing",
          currentProgress: ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)
        });
      }

      // Create expense entry to deduct the goal amount from savings
      const expenseEntry = await Finance.create({
        userId,
        type: 'expense',
        amount: goal.targetAmount,
        category: 'other',
        description: `Goal Completed: ${goal.title}`,
        date: new Date(),
        tags: ['goal-completion', goal.category]
      });

      // Mark goal as completed
      goal.status = 'completed';
      goal.currentAmount = goal.targetAmount; // Ensure it's exactly the target
      await goal.save();

      console.log(`✅ Goal "${goal.title}" completed! Expense entry created for ₹${goal.targetAmount}`);

      res.json({
        success: true,
        message: `Goal "${goal.title}" completed! ₹${goal.targetAmount} deducted from savings.`,
        goal,
        expenseEntry: {
          id: expenseEntry._id,
          amount: expenseEntry.amount,
          description: expenseEntry.description,
          date: expenseEntry.date
        }
      });
    } catch (error) {
      console.error("Complete goal error:", error);
      res.status(500).json({ message: "Failed to complete goal", error: error.message });
    }
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

    // ===== NEW: VALIDATE SUFFICIENT SAVINGS =====
    const savingsCheck = await checkSufficientSavings(userId, wantsIncomeAmount);
    
    if (!savingsCheck.hasSufficient) {
      // Create notification
      await Notification.createGoalAllocationBlockedNotification(
        userId,
        wantsIncomeAmount,
        savingsCheck.availableSavings
      );

      return res.status(400).json({
        success: false,
        message: "Insufficient savings to allocate to goals",
        error: "INSUFFICIENT_SAVINGS_FOR_GOALS",
        details: {
          requestedAmount: wantsIncomeAmount,
          availableSavings: savingsCheck.availableSavings,
          shortfall: savingsCheck.shortfall
        },
        notification: {
          type: "error",
          title: "Insufficient Savings",
          message: `You're trying to allocate ₹${wantsIncomeAmount.toLocaleString()} to goals, but only have ₹${savingsCheck.availableSavings.toLocaleString()} in savings. Savings come from your income minus expenses. Add more income or reduce expenses to increase your savings.`
        }
      });
    }

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

    // ===== NEW: VALIDATE SUFFICIENT SAVINGS =====
    const incomeAmount = marketplaceIncome.amount;
    const savingsCheck = await checkSufficientSavings(userId, incomeAmount);
    
    if (!savingsCheck.hasSufficient) {
      return res.status(400).json({
        success: false,
        message: "Insufficient savings to allocate marketplace income to goals",
        error: "INSUFFICIENT_SAVINGS_FOR_MARKETPLACE_ALLOCATION",
        details: {
          marketplaceIncomeAmount: incomeAmount,
          availableSavings: savingsCheck.availableSavings,
          shortfall: savingsCheck.shortfall
        },
        notification: {
          type: "warning",
          title: "Insufficient Savings",
          message: `Your marketplace income of ₹${incomeAmount.toLocaleString()} exceeds your available savings of ₹${savingsCheck.availableSavings.toLocaleString()}. This usually means you have pending expenses. Clear your expenses before allocating to goals.`
        }
      });
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

// Check for expired goals and create notifications
router.post("/check-expired", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🔍 Checking for expired goals for user ${userId}...`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find goals that are past due date and not yet completed or archived
    const expiredGoals = await Goal.find({
      userId,
      dueDate: { $lt: today },
      status: { $in: ['planned', 'in_progress'] }
    });
    
    console.log(`Found ${expiredGoals.length} expired goals`);
    
    let notificationsCreated = 0;
    
    for (const goal of expiredGoals) {
      // Check if notification already exists for this goal (within last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const existingNotification = await Notification.findOne({
        userId,
        'details.goalId': goal._id.toString(),
        'details.action': 'extend_or_delete',
        createdAt: { $gte: sevenDaysAgo }
      });
      
      if (!existingNotification) {
        await Notification.createExpiredGoalAlert(
          userId,
          goal._id,
          goal.title,
          goal.dueDate,
          goal.currentAmount || 0,
          goal.targetAmount
        );
        notificationsCreated++;
        console.log(`✅ Created expired notification for goal: ${goal.title}`);
      }
    }
    
    res.json({
      success: true,
      message: `Found ${expiredGoals.length} expired goal(s), created ${notificationsCreated} notification(s)`,
      expiredCount: expiredGoals.length,
      notificationsCreated
    });
  } catch (error) {
    console.error("Check expired goals error:", error);
    res.status(500).json({ 
      message: "Failed to check expired goals", 
      error: error.message 
    });
  }
});

// Manual allocation endpoint - Allocate savings to goals NOW
router.post("/allocate-savings", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log("🔄 Manual allocation triggered for user:", userId);
    
    // Get all active goals
    const goals = await Goal.find({ 
      userId, 
      status: { $in: ["planned", "in_progress"] }
    });
    
    if (goals.length === 0) {
      return res.json({
        success: true,
        message: "No active goals to allocate savings to",
        allocated: 0
      });
    }
    
    // Get user's finance data
    const financeData = await Finance.getUserFinanceSummary(userId);
    let totalIncome = 0;
    let totalExpenses = 0;
    
    financeData.forEach(item => {
      if (item._id === 'income') {
        totalIncome = item.total;
      } else if (item._id === 'expense') {
        totalExpenses = item.total;
      }
    });
    
    const totalSavings = totalIncome - totalExpenses;
    
    console.log(`💰 Total Savings Available: ₹${totalSavings.toFixed(2)}`);
    
    if (totalSavings <= 0) {
      return res.json({
        success: false,
        message: "No savings available. Add income entries to create positive balance.",
        totalSavings: 0,
        totalIncome,
        totalExpenses
      });
    }
    
    // Calculate total target needed
    const totalTargetNeeded = goals.reduce((sum, g) => sum + (g.targetAmount - (g.currentAmount || 0)), 0);
    
    console.log(`📊 ${goals.length} active goals, Total target needed: ₹${totalTargetNeeded.toFixed(2)}`);
    
    // REALISTIC ALLOCATION: Only allocate NEW savings since last allocation
    let allocatedCount = 0;
    const allocations = [];
    
    // Calculate how much NEW savings to allocate
    // This is the difference between current total savings and what's already allocated to goals
    const totalAllocatedToGoals = goals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
    const newSavingsToAllocate = Math.max(0, totalSavings - totalAllocatedToGoals);
    
    console.log(`💵 Total Savings: ₹${totalSavings.toFixed(2)}, Already Allocated: ₹${totalAllocatedToGoals.toFixed(2)}, New to Allocate: ₹${newSavingsToAllocate.toFixed(2)}`);
    
    if (newSavingsToAllocate <= 0) {
      return res.json({
        success: false,
        message: "All available savings are already allocated to goals. Add more income to increase savings.",
        totalSavings,
        totalAllocated: totalAllocatedToGoals,
        newSavings: 0
      });
    }
    
    // Sort goals by priority (1 = highest priority)
    const sortedGoals = [...goals].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower number = higher priority
      }
      // If same priority, sort by due date (earlier first)
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    // Allocate new savings to goals based on priority
    let remainingSavings = newSavingsToAllocate;
    
    for (const goal of sortedGoals) {
      if (remainingSavings <= 0) break;
      
      const targetNeeded = goal.targetAmount - (goal.currentAmount || 0);
      
      if (targetNeeded <= 0) continue; // Skip completed goals
      
      // Allocate as much as possible to this goal (up to what's needed)
      const allocation = Math.min(targetNeeded, remainingSavings);
      
      const newCurrentAmount = (goal.currentAmount || 0) + allocation;
      const progress = (newCurrentAmount / goal.targetAmount) * 100;
      
      // Check for milestone achievements (25%, 50%, 75%, 100%)
      const oldProgress = ((goal.currentAmount || 0) / goal.targetAmount) * 100;
      const milestones = [25, 50, 75, 100];
      
      for (const milestone of milestones) {
        if (oldProgress < milestone && progress >= milestone) {
          // Milestone reached! Send email notification
          console.log(`🎉 Milestone ${milestone}% reached for goal: ${goal.title}`);
          
          try {
            await sendGoalMilestoneEmail(req.user, {
              _id: goal._id,
              name: goal.title,
              targetAmount: goal.targetAmount,
              currentAmount: newCurrentAmount,
            }, milestone);
            console.log(`✅ Milestone email sent for ${milestone}%`);
          } catch (emailError) {
            console.error(`❌ Failed to send milestone email:`, emailError);
            // Don't fail the allocation if email fails
          }
          
          break; // Only send one milestone email per update
        }
      }
      
      // Determine new status
      let newStatus = goal.status;
      if (progress >= 100) {
        newStatus = 'achieved';
      } else if (progress > 0 && goal.status === 'planned') {
        newStatus = 'in_progress';
      }
      
      // Update goal in database
      await Goal.findByIdAndUpdate(goal._id, {
        currentAmount: newCurrentAmount,
        status: newStatus
      });
      
      remainingSavings -= allocation;
      allocatedCount++;
      
      allocations.push({
        goalId: goal._id,
        title: goal.title,
        priority: goal.priority,
        allocated: allocation,
        newCurrentAmount,
        progress: progress.toFixed(1),
        status: newStatus
      });
      allocatedCount++;
      allocations.push({
        goalId: goal._id,
        title: goal.title,
        allocated: allocation,
        newCurrentAmount,
        progress: progress.toFixed(1),
        status: newStatus,
        timeProgress: (timeProgress * 100).toFixed(1),
        daysElapsed: elapsedDays,
        totalDays: totalDays
      });
      
      console.log(`  ✅ ${goal.title}: Allocated ₹${allocation.toFixed(2)}, Progress: ${progress.toFixed(1)}%, Status: ${newStatus}`);
    }
    
    res.json({
      success: true,
      message: `Successfully allocated ₹${totalSavings.toFixed(2)} to ${allocatedCount} goals`,
      totalSavings,
      allocatedCount,
      allocations
    });
    
  } catch (error) {
    console.error("Manual allocation error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to allocate savings",
      error: error.message 
    });
  }
});

// Check for expired goals and create notifications (continued)
router.post("/check-expired-continued", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🔍 Checking for expired goals for user ${userId}...`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find goals that are past due date and not yet completed or archived
    const expiredGoals = await Goal.find({
      userId,
      dueDate: { $lt: today },
      status: { $in: ['planned', 'in_progress'] }
    });
    
    console.log(`Found ${expiredGoals.length} expired goals`);
    
    let notificationsCreated = 0;
    
    for (const goal of expiredGoals) {
      // Check if notification already exists for this goal (within last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const existingNotification = await Notification.findOne({
        userId,
        'details.goalId': goal._id.toString(),
        'details.action': 'extend_or_delete',
        createdAt: { $gte: sevenDaysAgo }
      });
      
      if (!existingNotification) {
        await Notification.createExpiredGoalAlert(
          userId,
          goal._id,
          goal.title,
          goal.dueDate,
          goal.currentAmount || 0,
          goal.targetAmount
        );
        notificationsCreated++;
        console.log(`✅ Created expired notification for goal: ${goal.title}`);
      }
    }
    
    res.json({
      success: true,
      message: `Found ${expiredGoals.length} expired goal(s), created ${notificationsCreated} notification(s)`,
      expiredCount: expiredGoals.length,
      notificationsCreated
    });
  } catch (error) {
    console.error("Check expired goals error:", error);
    res.status(500).json({ 
      message: "Failed to check expired goals", 
      error: error.message 
    });
  }
});

// Extend goal due date
router.put("/:goalId/extend-due-date", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { goalId } = req.params;
    const { newDueDate } = req.body;
    
    if (!newDueDate) {
      return res.status(400).json({ message: "New due date is required" });
    }
    
    const goal = await Goal.findOne({ _id: goalId, userId });
    
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }
    
    const newDate = new Date(newDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (newDate <= today) {
      return res.status(400).json({ message: "New due date must be in the future" });
    }
    
    goal.dueDate = newDate;
    await goal.save();
    
    // Delete related expired notification
    await Notification.deleteMany({
      userId,
      'details.goalId': goalId,
      'details.action': 'extend_or_delete'
    });
    
    console.log(`✅ Extended due date for goal "${goal.title}" to ${newDate.toDateString()}`);
    
    res.json({
      success: true,
      message: `Goal due date extended to ${newDate.toLocaleDateString()}`,
      goal
    });
  } catch (error) {
    console.error("Extend goal due date error:", error);
    res.status(500).json({ 
      message: "Failed to extend goal due date", 
      error: error.message 
    });
  }
});

// Delete expired goal (from notification)
router.delete("/:goalId/expired", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { goalId } = req.params;
    
    const goal = await Goal.findOne({ _id: goalId, userId });
    
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }
    
    // Check if goal is actually expired
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (goal.dueDate >= today && !req.query.force) {
      return res.status(400).json({ message: "This goal is not expired yet" });
    }
    
    const goalTitle = goal.title;
    
    // Delete the goal
    await Goal.findByIdAndDelete(goalId);
    
    // Delete related auto-transfers
    await AutoTransfer.deleteMany({ goalId });
    
    // Delete related expired notification
    await Notification.deleteMany({
      userId,
      'details.goalId': goalId,
      'details.action': 'extend_or_delete'
    });
    
    console.log(`✅ Deleted expired goal "${goalTitle}"`);
    
    res.json({
      success: true,
      message: `Goal "${goalTitle}" has been deleted`
    });
  } catch (error) {
    console.error("Delete expired goal error:", error);
    res.status(500).json({ 
      message: "Failed to delete goal", 
      error: error.message 
    });
  }
});

// Get smart goal recommendations
router.get("/recommendations", async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { generateGoalRecommendations } = await import('../utils/goalRecommendations.js');
    const result = await generateGoalRecommendations(userId);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Error generating goal recommendations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate goal recommendations",
      error: error.message
    });
  }
});

// Create goal from recommendation
router.post("/recommendations/:index/accept", async (req, res) => {
  try {
    const userId = req.user.id;
    const recommendationIndex = parseInt(req.params.index);
    
    // Generate recommendations again to get the specific one
    const { generateGoalRecommendations, createGoalFromRecommendation } = await import('../utils/goalRecommendations.js');
    const result = await generateGoalRecommendations(userId);
    
    if (recommendationIndex < 0 || recommendationIndex >= result.recommendations.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid recommendation index"
      });
    }
    
    const recommendation = result.recommendations[recommendationIndex];
    const goal = await createGoalFromRecommendation(userId, recommendation);
    
    res.json({
      success: true,
      message: "Goal created successfully from recommendation",
      goal
    });
  } catch (error) {
    console.error("Error creating goal from recommendation:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create goal from recommendation",
      error: error.message
    });
  }
});

export default router;




// ============================================
// MARKETPLACE-GOAL INTEGRATION ENDPOINTS
// ============================================

import { 
  findMarketplaceMatchesForGoals, 
  getMarketplaceGoalStats 
} from "../utils/marketplaceGoalIntegration.js";

// Get marketplace items matching user's goals
router.get("/marketplace-matches", async (req, res) => {
  try {
    const userId = req.user.id;
    const matches = await findMarketplaceMatchesForGoals(userId);

    res.json({
      success: true,
      matches,
      totalMatches: matches.reduce((sum, m) => sum + m.items.length, 0)
    });
  } catch (error) {
    console.error("Get marketplace matches error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to find marketplace matches"
    });
  }
});

// Get marketplace contribution statistics
router.get("/marketplace-stats", async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getMarketplaceGoalStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Get marketplace stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get marketplace statistics"
    });
  }
});
