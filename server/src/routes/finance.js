import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Finance from "../models/Finance.js";
import ProcessedStatement from "../models/ProcessedStatement.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import {
  calculateUserSavings,
  getMonthlySavingsBreakdown,
} from "../utils/financeUtils.js";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { getSuggestionsForReview } from "../utils/expenseCategorizer.js";
import { extractTransactionsFromFile } from "../utils/extractTransactionsFromFile.js";
import { filterDuplicateTransactions } from "../utils/duplicateDetector.js";
import { checkBudgetBreaches } from "../utils/notificationService.js";
import { wouldExceedLimit, checkExpenseLimit } from "../utils/expenseChecker.js";
import { validateExpenseBalance, validateBatchExpenses } from "../utils/balanceValidator.js";

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/statement/";
    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "statement-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "text/csv",
      "application/vnd.ms-excel", // CSV files sometimes come with this MIME type
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, CSV, and images (JPEG, PNG) are allowed.",
        ),
      );
    }
  },
});

// Helper function to validate date
const validateFinanceDate = async (dateString, userId) => {
  // Check if date is provided
  if (!dateString) {
    return {
      valid: false,
      error: "Date is required",
    };
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return {
      valid: false,
      error: "Date must be in YYYY-MM-DD format",
    };
  }

  // Parse date
  const entryDate = new Date(dateString);

  // Check if date is valid
  if (isNaN(entryDate.getTime())) {
    return {
      valid: false,
      error: "Invalid date",
    };
  }

  // Check if date is not in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today

  console.log(`📅 Date validation: Entry date: ${entryDate.toISOString()}, Today: ${today.toISOString()}`);

  if (entryDate > today) {
    return {
      valid: false,
      error: `Date cannot be in the future (Entry: ${entryDate.toLocaleDateString('en-IN')}, Today: ${today.toLocaleDateString('en-IN')})`,
    };
  }

  // Get user's account creation date
  try {
    const user = await User.findById(userId).select("createdAt");
    if (!user) {
      return {
        valid: false,
        error: "User not found",
      };
    }

    // Check if date is not before account creation
    const accountCreationDate = new Date(user.createdAt);
    accountCreationDate.setHours(0, 0, 0, 0); // Start of account creation day

    const entryDateOnly = new Date(entryDate);
    entryDateOnly.setHours(0, 0, 0, 0);

    if (entryDateOnly < accountCreationDate) {
      const formattedAccountDate = accountCreationDate.toLocaleDateString(
        "en-IN",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        },
      );
      return {
        valid: false,
        error: `Date cannot be before your account creation date (${formattedAccountDate})`,
      };
    }

    return {
      valid: true,
      date: entryDate,
    };
  } catch (error) {
    console.error("Date validation error:", error);
    return {
      valid: false,
      error: "Failed to validate date",
    };
  }
};

// Get finance summary
router.get("/summary", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year, all } = req.query;

    let summary;
    let filters = {};

    if (all === "true") {
      // Get all-time summary
      summary = await Finance.getUserFinanceSummary(userId);
      console.log(`Finance summary request for user ${userId} - ALL TIME`);
    } else if (year) {
      // Year or month+year filtering
      filters.year = parseInt(year);
      if (month) {
        filters.month = parseInt(month);
        console.log(
          `Finance summary request for user ${userId}, month: ${filters.month}, year: ${filters.year}`,
        );
      } else {
        console.log(
          `Finance summary request for user ${userId}, year: ${filters.year}`,
        );
      }
      summary = await Finance.getUserFinanceSummary(userId, filters);
    } else {
      // Get current month if not specified
      const currentDate = new Date();
      filters.month = currentDate.getMonth() + 1;
      filters.year = currentDate.getFullYear();

      console.log(
        `Finance summary request for user ${userId}, month: ${filters.month}, year: ${filters.year}`,
      );

      summary = await Finance.getUserFinanceSummary(userId, filters);
    }

    console.log("Summary data:", summary);

    // Calculate totals
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    summary.forEach((item) => {
      if (item._id === "income") {
        monthlyIncome = item.total;
      } else if (item._id === "expense") {
        monthlyExpense = item.total;
      }
    });

    const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);

    res.json({
      monthlyIncome,
      monthlyExpense,
      monthlySavings,
      incomeCount: summary.find((s) => s._id === "income")?.count || 0,
      expenseCount: summary.find((s) => s._id === "expense")?.count || 0,
      viewMode: all === "true" ? "all-time" : (month ? "month" : "year"),
    });
  } catch (error) {
    console.error("Finance summary error:", error);
    res.status(500).json({ message: "Failed to fetch finance summary" });
  }
});

// Get income entries
router.get("/income", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year, limit = 50 } = req.query;

    const filters = {};
    if (year) {
      filters.year = parseInt(year);
      if (month) {
        filters.month = parseInt(month);
      }
    }

    const income = await Finance.getUserIncome(userId, filters).limit(
      parseInt(limit),
    );

    res.json(income);
  } catch (error) {
    console.error("Income fetch error:", error);
    res.status(500).json({ message: "Failed to fetch income entries" });
  }
});

// Get expense entries
router.get("/expenses", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year, limit = 50 } = req.query;

    const filters = {};
    if (year) {
      filters.year = parseInt(year);
      if (month) {
        filters.month = parseInt(month);
      }
    }

    const expenses = await Finance.getUserExpenses(userId, filters).limit(
      parseInt(limit),
    );

    res.json(expenses);
  } catch (error) {
    console.error("Expenses fetch error:", error);
    res.status(500).json({ message: "Failed to fetch expense entries" });
  }
});

// Add income entry
router.post("/income", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, source, description, date } = req.body;

    // Validate required fields
    if (!amount || !source) {
      return res.status(400).json({
        message: "Amount and source are required",
      });
    }

    // Validate amount range
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 2 || amountNum > 100000) {
      return res.status(400).json({
        message: "Amount must be between ₹2 and ₹1,00,000",
      });
    }

    // Validate description (optional but has constraints if provided)
    if (description && description.length > 100) {
      return res.status(400).json({
        message: "Description cannot exceed 100 characters",
      });
    }

    // Check for repetitive characters in description (if provided)
    if (description && description.trim().length > 0) {
      if (/(.)\1{2,}/.test(description)) {
        return res.status(400).json({
          message: "Description contains repetitive characters (spam detected)",
        });
      }
    }

    // Validate date
    const dateValidation = await validateFinanceDate(date, userId);
    if (!dateValidation.valid) {
      return res.status(400).json({
        message: dateValidation.error,
      });
    }

    // Create new income entry
    const income = new Finance({
      userId,
      type: "income",
      amount: parseFloat(amount),
      source,
      description: description || "",
      date: dateValidation.date,
      paymentMethod: "other", // default for manual entries
    });

    await income.save();

    // Trigger financial analysis and create notifications if needed (async, don't wait)
    setTimeout(async () => {
      try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const summary = await Finance.getUserFinanceSummary(userId, {
          month: currentMonth,
          year: currentYear,
        });

        let monthlyIncome = 0;
        let monthlyExpense = 0;

        summary.forEach((item) => {
          if (item._id === "income") monthlyIncome = item.total;
          else if (item._id === "expense") monthlyExpense = item.total;
        });

        const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);

        // Get expenses
        const expenses = await Finance.getUserExpenses(userId, {
          month: currentMonth,
          year: currentYear,
        });

        // Categorize expenses
        const needs = ["housing", "food", "transport", "healthcare"];
        const wants = ["entertainment", "shopping", "travel"];

        const needsTotal = expenses
          .filter((e) => needs.includes(e.category))
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        const wantsTotal = expenses
          .filter((e) => wants.includes(e.category))
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        if (monthlyIncome > 0) {
          const needsPercentage = (needsTotal / monthlyIncome) * 100;
          const wantsPercentage = (wantsTotal / monthlyIncome) * 100;
          const savingsPercentage = (monthlySavings / monthlyIncome) * 100;

          // Check 50/30/20 Rule violations
          // Check if notification already exists today to avoid duplicates
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (needsPercentage > 50) {
            const existing = await Notification.findOne({
              userId,
              category: "finance",
              title: "50/30/20 Rule: Needs Alert",
              createdAt: { $gte: today },
            });
            if (!existing) {
              await Notification.createNeedsAlert(
                userId,
                needsPercentage,
                monthlyIncome,
              );
            }
          }

          if (wantsPercentage > 30) {
            const existing = await Notification.findOne({
              userId,
              category: "finance",
              title: "50/30/20 Rule: Wants Alert",
              createdAt: { $gte: today },
            });
            if (!existing) {
              const excessWants = wantsTotal - monthlyIncome * 0.3;
              await Notification.createWantsAlert(
                userId,
                wantsPercentage,
                excessWants,
                monthlyIncome,
              );
            }
          }

          if (savingsPercentage < 20) {
            const existing = await Notification.findOne({
              userId,
              category: "finance",
              title: "50/30/20 Rule: Savings Alert",
              createdAt: { $gte: today },
            });
            if (!existing) {
              const targetSavings = monthlyIncome * 0.2;
              const savingsGap = targetSavings - monthlySavings;
              await Notification.createSavingsAlert(
                userId,
                savingsPercentage,
                savingsGap,
                monthlyIncome,
              );
            }
          }

          if (monthlyExpense > monthlyIncome) {
            const existing = await Notification.findOne({
              userId,
              category: "finance",
              title: "Monthly Overspending Alert",
              createdAt: { $gte: today },
            });
            if (!existing) {
              const overspend = monthlyExpense - monthlyIncome;
              await Notification.createOverspendingAlert(
                userId,
                overspend,
                monthlyIncome,
                monthlyExpense,
              );
            }
          }
        }
      } catch (err) {
        console.error("Background financial analysis error:", err);
      }
    }, 1000);

    res.json({
      message: "Income entry added successfully",
      income,
    });
  } catch (error) {
    console.error("Add income error:", error);
    res.status(500).json({ message: "Failed to add income entry" });
  }
});

// Add expense entry
router.post("/expenses", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, category, description, date } = req.body;

    // Validate required fields
    if (!amount || !category) {
      return res.status(400).json({
        message: "Amount and category are required",
      });
    }

    // Validate amount range
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 2 || amountNum > 100000) {
      return res.status(400).json({
        message: "Amount must be between ₹2 and ₹1,00,000",
      });
    }

    // Validate description (optional but has constraints if provided)
    if (description && description.length > 100) {
      return res.status(400).json({
        message: "Description cannot exceed 100 characters",
      });
    }

    // Check for repetitive characters in description (if provided)
    if (description && description.trim().length > 0) {
      if (/(.)\1{2,}/.test(description)) {
        return res.status(400).json({
          message: "Description contains repetitive characters (spam detected)",
        });
      }
    }

    // Validate date
    const dateValidation = await validateFinanceDate(date, userId);
    if (!dateValidation.valid) {
      return res.status(400).json({
        message: dateValidation.error,
      });
    }

    // Validate balance - ensure expense doesn't exceed income
    const balanceCheck = await validateExpenseBalance(userId, amountNum, 'other');
    if (!balanceCheck.valid) {
      return res.status(400).json({ 
        message: balanceCheck.message,
        currentBalance: balanceCheck.currentBalance,
        requiredBalance: balanceCheck.requiredBalance,
        shortfall: balanceCheck.shortfall
      });
    }

    // Check if this expense would exceed the monthly limit
    const limitCheck = await wouldExceedLimit(userId, parseFloat(amount));
    
    // Create new expense entry
    const expense = new Finance({
      userId,
      type: "expense",
      amount: parseFloat(amount),
      category,
      description: description || "",
      date: dateValidation.date,
      paymentMethod: "other", // default for manual entries
    });

    await expense.save();

    // Prepare response with limit warning if applicable
    const response = {
      message: "Expense added successfully",
      expense: expense
    };

    // Add limit warning to response if applicable
    if (limitCheck.hasLimit && limitCheck.wouldExceed) {
      response.limitWarning = {
        exceeded: true,
        message: `Warning: This expense exceeds your monthly limit by ₹${limitCheck.exceededBy.toFixed(2)}`,
        projectedTotal: limitCheck.projectedTotal,
        limit: limitCheck.limit
      };
    } else if (limitCheck.hasLimit && limitCheck.remaining < limitCheck.limit * 0.2) {
      // Warn if less than 20% remaining
      response.limitWarning = {
        exceeded: false,
        message: `You have ₹${limitCheck.remaining.toFixed(2)} remaining in your monthly budget`,
        projectedTotal: limitCheck.projectedTotal,
        limit: limitCheck.limit
      };
    }

    res.status(201).json(response);

    // Trigger financial analysis and create notifications if needed (async, don't wait)
    setTimeout(async () => {
      try {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const summary = await Finance.getUserFinanceSummary(userId, {
          month: currentMonth,
          year: currentYear,
        });

        let monthlyIncome = 0;
        let monthlyExpense = 0;

        summary.forEach((item) => {
          if (item._id === "income") monthlyIncome = item.total;
          else if (item._id === "expense") monthlyExpense = item.total;
        });

        const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);

        // Get expenses
        const expenses = await Finance.getUserExpenses(userId, {
          month: currentMonth,
          year: currentYear,
        });

        // Categorize expenses
        const needs = ["housing", "food", "transport", "healthcare"];
        const wants = ["entertainment", "shopping", "travel"];

        const needsTotal = expenses
          .filter((e) => needs.includes(e.category))
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        const wantsTotal = expenses
          .filter((e) => wants.includes(e.category))
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        if (monthlyIncome > 0) {
          const needsPercentage = (needsTotal / monthlyIncome) * 100;
          const wantsPercentage = (wantsTotal / monthlyIncome) * 100;
          const savingsPercentage = (monthlySavings / monthlyIncome) * 100;

          // Check 50/30/20 Rule violations
          // Check if notification already exists today to avoid duplicates
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (needsPercentage > 50) {
            const existing = await Notification.findOne({
              userId,
              category: "finance",
              title: "50/30/20 Rule: Needs Alert",
              createdAt: { $gte: today },
            });
            if (!existing) {
              await Notification.createNeedsAlert(
                userId,
                needsPercentage,
                monthlyIncome,
              );
            }
          }

          if (wantsPercentage > 30) {
            const existing = await Notification.findOne({
              userId,
              category: "finance",
              title: "50/30/20 Rule: Wants Alert",
              createdAt: { $gte: today },
            });
            if (!existing) {
              const excessWants = wantsTotal - monthlyIncome * 0.3;
              await Notification.createWantsAlert(
                userId,
                wantsPercentage,
                excessWants,
                monthlyIncome,
              );
            }
          }

          if (savingsPercentage < 20) {
            const existing = await Notification.findOne({
              userId,
              category: "finance",
              title: "50/30/20 Rule: Savings Alert",
              createdAt: { $gte: today },
            });
            if (!existing) {
              const targetSavings = monthlyIncome * 0.2;
              const savingsGap = targetSavings - monthlySavings;
              await Notification.createSavingsAlert(
                userId,
                savingsPercentage,
                savingsGap,
                monthlyIncome,
              );
            }
          }

          if (monthlyExpense > monthlyIncome) {
            const existing = await Notification.findOne({
              userId,
              category: "finance",
              title: "Monthly Overspending Alert",
              createdAt: { $gte: today },
            });
            if (!existing) {
              const overspend = monthlyExpense - monthlyIncome;
              await Notification.createOverspendingAlert(
                userId,
                overspend,
                monthlyIncome,
                monthlyExpense,
              );
            }
          }
        }

        // Check for high spending category
        if (expenses.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const categoryTotals = {};
          expenses.forEach((entry) => {
            const cat = entry.category || "other";
            categoryTotals[cat] =
              (categoryTotals[cat] || 0) + (entry.amount || 0);
          });

          const sortedCategories = Object.entries(categoryTotals).sort(
            ([, a], [, b]) => b - a,
          );

          if (sortedCategories.length > 0) {
            const [topCategory, topAmount] = sortedCategories[0];
            const percentage =
              monthlyExpense > 0 ? (topAmount / monthlyExpense) * 100 : 0;

            if (percentage > 40) {
              const existing = await Notification.findOne({
                userId,
                category: "finance",
                title: "High Spending Category",
                createdAt: { $gte: today },
              });
              if (!existing) {
                await Notification.createHighSpendingAlert(
                  userId,
                  topCategory,
                  topAmount,
                  percentage,
                );
              }
            }
          }

          // Check for recent high expenses
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const recentHighExpenses = expenses.filter((entry) => {
            const entryDate = new Date(entry.date);
            return entryDate >= sevenDaysAgo && (entry.amount || 0) > 1000;
          });

          if (recentHighExpenses.length > 0) {
            const existing = await Notification.findOne({
              userId,
              category: "finance",
              title: "Recent High Expenses",
              createdAt: { $gte: today },
            });
            if (!existing) {
              const totalAmount = recentHighExpenses.reduce(
                (sum, e) => sum + (e.amount || 0),
                0,
              );
              await Notification.createRecentHighExpensesAlert(
                userId,
                recentHighExpenses.length,
                totalAmount,
              );
            }
          }
        }
      } catch (err) {
        console.error("Background financial analysis error:", err);
      }
    }, 1000);

    // Response already sent above with limit warnings
  } catch (error) {
    console.error("Add expense error:", error);
    res.status(500).json({ message: "Failed to add expense entry" });
  }
});

// Delete income entry
router.delete("/income/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const entryId = req.params.id;

    // Find and verify ownership
    const entry = await Finance.findOne({
      _id: entryId,
      userId,
      type: "income",
    });

    if (!entry) {
      return res.status(404).json({
        message:
          "Income entry not found or you do not have permission to delete it",
      });
    }

    await Finance.findByIdAndDelete(entryId);

    res.json({ message: "Income entry deleted successfully" });
  } catch (error) {
    console.error("Delete income error:", error);
    res.status(500).json({ message: "Failed to delete income entry" });
  }
});

// Delete expense entry
router.delete("/expenses/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const entryId = req.params.id;

    // Find and verify ownership
    const entry = await Finance.findOne({
      _id: entryId,
      userId,
      type: "expense",
    });

    if (!entry) {
      return res.status(404).json({
        message:
          "Expense entry not found or you do not have permission to delete it",
      });
    }

    await Finance.findByIdAndDelete(entryId);

    res.json({ message: "Expense entry deleted successfully" });
  } catch (error) {
    console.error("Delete expense error:", error);
    res.status(500).json({ message: "Failed to delete expense entry" });
  }
});

// Get monthly trends
router.get("/trends", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { months = 6 } = req.query;

    const trends = await Finance.getMonthlyTrends(userId, parseInt(months));

    res.json(trends);
  } catch (error) {
    console.error("Trends fetch error:", error);
    res.status(500).json({ message: "Failed to fetch finance trends" });
  }
});

// Get category breakdown
router.get("/breakdown", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, month, year } = req.query;

    if (!type || !["income", "expense"].includes(type)) {
      return res.status(400).json({
        message: "Type must be 'income' or 'expense'",
      });
    }

    const filters = {};
    if (year) {
      filters.year = parseInt(year);
      if (month) {
        filters.month = parseInt(month);
      }
    }

    const breakdown = await Finance.getCategoryBreakdown(userId, type, filters);

    res.json(breakdown);
  } catch (error) {
    console.error("Breakdown fetch error:", error);
    res.status(500).json({ message: "Failed to fetch category breakdown" });
  }
});

// Get user's total savings (NEW)
router.get("/savings", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const savings = await calculateUserSavings(userId);

    res.json({
      success: true,
      savings: {
        totalIncome: savings.totalIncome,
        totalExpenses: savings.totalExpenses,
        totalSavings: savings.totalSavings,
        marketplaceIncome: savings.marketplaceIncome,
        availableBalance: savings.availableBalance,
      },
      message: `You have ₹${savings.totalSavings.toLocaleString()} in total savings`,
    });
  } catch (error) {
    console.error("Get savings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate savings",
      error: error.message,
    });
  }
});

// Get monthly savings breakdown (NEW)
router.get("/savings/breakdown", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { months = 6 } = req.query;

    const breakdown = await getMonthlySavingsBreakdown(
      userId,
      parseInt(months),
    );

    res.json({
      success: true,
      breakdown,
      summary: {
        avgMonthlySavings:
          breakdown.reduce((sum, m) => sum + m.savings, 0) / breakdown.length,
        avgSavingsRate:
          breakdown.reduce((sum, m) => sum + m.savingsRate, 0) /
          breakdown.length,
        totalSavings: breakdown.reduce((sum, m) => sum + m.savings, 0),
      },
    });
  } catch (error) {
    console.error("Get savings breakdown error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get savings breakdown",
      error: error.message,
    });
  }
});

// Get wants income (for goal allocation)
// This calculates the wants spending based on the 50/30/20 rule
router.get("/wants-income", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    const filters = {};
    if (month && year) {
      filters.month = parseInt(month);
      filters.year = parseInt(year);
    }

    // Get all expenses for the period
    const expenses = await Finance.find({
      userId,
      type: "expense",
    });

    // Categorize expenses by type (Needs/Wants/Savings)
    const needs = ["housing", "food", "transport", "healthcare"];
    const wants = ["entertainment", "shopping", "travel"];

    // Filter current period expenses
    let periodExpenses = expenses;
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      periodExpenses = expenses.filter(
        (e) => e.date >= startDate && e.date <= endDate,
      );
    }

    // Calculate wants expenses
    const wantsExpenses = periodExpenses.filter((e) =>
      wants.includes(e.category),
    );
    const totalWants = wantsExpenses.reduce(
      (sum, e) => sum + (e.amount || 0),
      0,
    );

    // Get total income for reference
    const incomeData = await Finance.getUserFinanceSummary(userId, filters);
    const totalIncome = incomeData.find((i) => i._id === "income")?.total || 0;

    res.json({
      wantsExpenses,
      totalWantsAmount: totalWants,
      wantsPercentage: totalIncome > 0 ? (totalWants / totalIncome) * 100 : 0,
      totalIncome,
      message: `Found ₹${totalWants.toLocaleString()} in wants expenses. This amount can be allocated to goals.`,
    });
  } catch (error) {
    console.error("Get wants income error:", error);
    res.status(500).json({ message: "Failed to get wants income" });
  }
});

// Analyze finances and generate notifications
router.post("/analyze-and-notify", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current month finance data
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const summary = await Finance.getUserFinanceSummary(userId, {
      month: currentMonth,
      year: currentYear,
    });

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    summary.forEach((item) => {
      if (item._id === "income") monthlyIncome = item.total;
      else if (item._id === "expense") monthlyExpense = item.total;
    });

    const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);

    // Get expenses for detailed analysis
    const expenses = await Finance.getUserExpenses(userId, {
      month: currentMonth,
      year: currentYear,
    });

    // Categorize expenses
    const needs = ["housing", "food", "transport", "healthcare"];
    const wants = ["entertainment", "shopping", "travel"];

    const needsExpenses = expenses.filter((e) => needs.includes(e.category));
    const wantsExpenses = expenses.filter((e) => wants.includes(e.category));

    const needsTotal = needsExpenses.reduce(
      (sum, e) => sum + (e.amount || 0),
      0,
    );
    const wantsTotal = wantsExpenses.reduce(
      (sum, e) => sum + (e.amount || 0),
      0,
    );

    const notificationsCreated = [];

    // Only analyze if there's income
    if (monthlyIncome > 0) {
      const needsPercentage = (needsTotal / monthlyIncome) * 100;
      const wantsPercentage = (wantsTotal / monthlyIncome) * 100;
      const savingsPercentage = (monthlySavings / monthlyIncome) * 100;

      // Check 50/30/20 Rule violations
      if (needsPercentage > 50) {
        const notification = await Notification.createNeedsAlert(
          userId,
          needsPercentage,
          monthlyIncome,
        );
        notificationsCreated.push(notification);
      }

      if (wantsPercentage > 30) {
        const excessWants = wantsTotal - monthlyIncome * 0.3;
        const notification = await Notification.createWantsAlert(
          userId,
          wantsPercentage,
          excessWants,
          monthlyIncome,
        );
        notificationsCreated.push(notification);
      }

      if (savingsPercentage < 20) {
        const targetSavings = monthlyIncome * 0.2;
        const savingsGap = targetSavings - monthlySavings;
        const notification = await Notification.createSavingsAlert(
          userId,
          savingsPercentage,
          savingsGap,
          monthlyIncome,
        );
        notificationsCreated.push(notification);
      }

      // Check for overspending
      if (monthlyExpense > monthlyIncome) {
        const overspend = monthlyExpense - monthlyIncome;
        const notification = await Notification.createOverspendingAlert(
          userId,
          overspend,
          monthlyIncome,
          monthlyExpense,
        );
        notificationsCreated.push(notification);
      }
    }

    // Analyze expense patterns
    if (expenses.length > 0) {
      // Find highest spending category
      const categoryTotals = {};
      expenses.forEach((entry) => {
        const category = entry.category || "other";
        categoryTotals[category] =
          (categoryTotals[category] || 0) + (entry.amount || 0);
      });

      const sortedCategories = Object.entries(categoryTotals).sort(
        ([, a], [, b]) => b - a,
      );

      if (sortedCategories.length > 0) {
        const [topCategory, topAmount] = sortedCategories[0];
        const percentage =
          monthlyExpense > 0 ? (topAmount / monthlyExpense) * 100 : 0;

        if (percentage > 40) {
          const notification = await Notification.createHighSpendingAlert(
            userId,
            topCategory,
            topAmount,
            percentage,
          );
          notificationsCreated.push(notification);
        }
      }

      // Check for recent high expenses (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentHighExpenses = expenses.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate >= sevenDaysAgo && (entry.amount || 0) > 1000;
      });

      if (recentHighExpenses.length > 0) {
        const totalAmount = recentHighExpenses.reduce(
          (sum, e) => sum + (e.amount || 0),
          0,
        );
        const notification = await Notification.createRecentHighExpensesAlert(
          userId,
          recentHighExpenses.length,
          totalAmount,
        );
        notificationsCreated.push(notification);
      }
    }

    res.json({
      success: true,
      message: `Analysis complete. Created ${notificationsCreated.length} financial notifications.`,
      notificationsCount: notificationsCreated.length,
      notifications: notificationsCreated,
    });
  } catch (error) {
    console.error("Finance analysis error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to analyze finances",
      error: error.message,
    });
  }
});

// Upload and process bank statement (PDF/CSV/Image)
router.post(
  "/upload-statement",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      console.log("=== UPLOAD STATEMENT REQUEST ===");
      console.log("📦 Full request body:", JSON.stringify(req.body, null, 2));
      console.log("📁 File info:", req.file ? {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : "No file");
      
      let { startDate, endDate, password } = req.body;
      
      // Trim password to remove any whitespace
      if (password) {
        password = password.trim();
        console.log("🔑 Password (trimmed):", password);
        console.log("🔑 Password length:", password.length);
      }

      // Debug authentication
      console.log("🔐 User authenticated:", !!req.user);
      console.log("👤 User ID:", req.user?.id || req.user?._id);

      const userId = req.user.id || req.user._id;

      if (!req.user || !userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      console.log("📄 Processing bank statement:", req.file.originalname);
      console.log("📁 File path:", req.file.path);
      console.log("📋 MIME type:", req.file.mimetype);
      if (password) {
        console.log("🔐 Password provided for encrypted PDF");
      }

      // Extract transactions from file using OCR/parsing (with optional password)
      const extractedTransactions = await extractTransactionsFromFile(
        req.file.path,
        req.file.mimetype,
        password
      );

      console.log(`✅ Extracted ${extractedTransactions.length} transactions`);

      // Filter by date range if provided
      let filteredTransactions = extractedTransactions;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        filteredTransactions = extractedTransactions.filter((t) => {
          const tDate = new Date(t.date);
          return tDate >= start && tDate <= end;
        });
        console.log(`📅 Filtered to ${filteredTransactions.length} transactions in date range`);
      }

      // Check for duplicate transactions
      console.log("🔍 Checking for duplicate transactions...");
      const duplicateCheck = await filterDuplicateTransactions(userId, filteredTransactions);
      
      console.log(`📊 Duplicate check results:
        - Total transactions: ${duplicateCheck.stats.total}
        - New transactions: ${duplicateCheck.stats.new}
        - Duplicates found: ${duplicateCheck.stats.duplicates}`);

      // Auto-categorize only new transactions
      console.log("🏷️ Categorizing new transactions...");
      const transactionsWithCategories = await getSuggestionsForReview(
        duplicateCheck.newTransactions,
      );

      // Determine file type from mimetype
      let fileType = "pdf";
      if (req.file.mimetype.includes("csv")) {
        fileType = "csv";
      } else if (req.file.mimetype.includes("image")) {
        fileType = "image";
      }

      // Save processed statement record
      const processedStatement = new ProcessedStatement({
        userId: userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        fileType: fileType,
        filePath: req.file.path,
        status: "completed",
        transactionsCount: duplicateCheck.stats.new,
        extractedTransactions: {
          total: duplicateCheck.stats.total,
          new: duplicateCheck.stats.new,
          duplicates: duplicateCheck.stats.duplicates,
          income: duplicateCheck.newTransactions.filter(t => t.type === "income").length,
          expenses: duplicateCheck.newTransactions.filter(t => t.type === "expense").length,
        },
      });

      await processedStatement.save();
      console.log("💾 Saved processed statement record");

      // Clean up uploaded file after processing
      try {
        await fs.unlink(req.file.path);
        console.log("🗑️ Cleaned up uploaded file");
      } catch (error) {
        console.error("Failed to delete uploaded file:", error);
      }

      console.log(
        `✅ Extracted ${duplicateCheck.stats.new} new transactions (${duplicateCheck.stats.duplicates} duplicates skipped)`,
      );

      // Prepare response message
      let message = `Successfully extracted ${duplicateCheck.stats.new} new transaction(s)`;
      if (duplicateCheck.stats.duplicates > 0) {
        message += `. ${duplicateCheck.stats.duplicates} duplicate(s) were skipped.`;
      }

      res.json({
        success: true,
        message: message,
        transactions: transactionsWithCategories,
        statementId: processedStatement._id,
        duplicateInfo: {
          total: duplicateCheck.stats.total,
          new: duplicateCheck.stats.new,
          duplicates: duplicateCheck.stats.duplicates,
          duplicateTransactions: duplicateCheck.duplicates.map(d => ({
            amount: d.amount,
            date: d.date,
            description: d.description,
            type: d.type,
            reason: d.reason
          }))
        }
      });
    } catch (error) {
      console.error("❌ Bank statement upload error:", error);
      console.error("Error stack:", error.stack);

      // Clean up file on error
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Failed to delete file after error:", unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: "Failed to process bank statement",
        error: error.message,
      });
    }
  },
);

// Batch import transactions from bank statement
router.post("/batch-import", requireAuth, async (req, res) => {
  try {
    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transactions data",
      });
    }

    if (transactions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No transactions to import",
      });
    }

    if (transactions.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Too many transactions. Maximum 100 per batch.",
      });
    }

    console.log(`📥 Importing ${transactions.length} transactions for user: ${req.user.id}`);

    // Determine payment method for these transactions
    let paymentMethod = "other"; // default for bank statements
    if (req.file?.mimetype?.includes("image")) {
      paymentMethod = "upi";
    }

    // Validate batch expenses to ensure they don't exceed income
    const batchValidation = await validateBatchExpenses(req.user.id, transactions, paymentMethod);
    if (!batchValidation.valid) {
      return res.status(400).json({
        success: false,
        message: batchValidation.message,
        invalidTransactions: batchValidation.invalidTransactions,
        currentBalance: batchValidation.currentBalance,
        details: "Some transactions would result in negative balance. Please add income first or remove these expense transactions."
      });
    }

    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    // Allowed enums from Finance model
    const INCOME_SOURCES = [
      "salary",
      "freelance",
      "business",
      "investment",
      "rental",
      "marketplace-sale",
      "other",
    ];
    const EXPENSE_CATEGORIES = [
      "food",
      "transport",
      "housing",
      "healthcare",
      "entertainment",
      "shopping",
      "education",
      "travel",
      "other",
    ];

    for (const transaction of transactions) {
      try {
        // Validate transaction data
        if (!transaction.amount || transaction.amount <= 0) {
          results.skipped++;
          continue;
        }

        if (!transaction.date) {
          results.skipped++;
          continue;
        }

        // Validate date
        let dateString = transaction.date;
        
        console.log(`🔍 Processing transaction: ${transaction.description}`);
        console.log(`   Original date: ${transaction.date} (type: ${typeof transaction.date})`);
        
        // Handle different date formats
        if (typeof dateString === 'string') {
          // Remove time part if present (e.g., "2025-01-15T00:00:00" -> "2025-01-15")
          if (dateString.includes('T')) {
            dateString = dateString.split("T")[0];
          }
          
          // Convert DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD
          // Patterns: 15-01-2025, 15/01/2025, 15.01.2025
          const ddmmyyyyPattern = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/;
          const match = dateString.match(ddmmyyyyPattern);
          
          if (match) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            const year = match[3];
            dateString = `${year}-${month}-${day}`;
            console.log(`   📅 Converted date: ${transaction.date} -> ${dateString}`);
          } else {
            console.log(`   ℹ️ Date already in correct format or no conversion needed: ${dateString}`);
          }
        }
        
        console.log(`   Final date string: ${dateString}`);
        
        const dateValidation = await validateFinanceDate(
          dateString,
          req.user.id,
        );

        if (!dateValidation.valid) {
          results.failed++;
          results.errors.push({
            transaction: transaction.description,
            error: dateValidation.error,
          });
          continue;
        }

        // Determine transaction type (income or expense)
        const txType = transaction.type === "income" ? "income" : "expense";

        // Determine payment method based on file type or transaction data
        let paymentMethod = "other"; // default for bank statements
        if (req.file?.mimetype?.includes("image")) {
          // UPI screenshots
          paymentMethod = "upi";
        } else if (transaction.paymentMethod) {
          // If transaction already has paymentMethod (from extraction)
          paymentMethod = transaction.paymentMethod;
        }

        let financePayload = {
          userId: req.user.id,
          type: txType,
          amount: parseFloat(transaction.amount),
          description: transaction.description || "Bank transaction",
          date: dateValidation.date,
          paymentMethod: paymentMethod,
        };

        if (txType === "income") {
          // Map categorized label to a valid income source enum
          const rawCategory = (transaction.category || "").toLowerCase();

          // Map income categorizer labels to Finance.source enum
          let mappedSource = "other";
          if (["salary"].includes(rawCategory)) mappedSource = "salary";
          else if (["freelance", "consulting", "contract"].includes(rawCategory))
            mappedSource = "freelance";
          else if (["investment"].includes(rawCategory))
            mappedSource = "investment";
          else if (["business"].includes(rawCategory))
            mappedSource = "business";
          else if (["rental"].includes(rawCategory))
            mappedSource = "rental";
          else if (["marketplace-sale"].includes(rawCategory))
            mappedSource = "marketplace-sale";
          else if (["gift", "refund", "other_income"].includes(rawCategory))
            mappedSource = "other";

          if (!INCOME_SOURCES.includes(mappedSource)) {
            mappedSource = "other";
          }

          financePayload.source = mappedSource;
        } else {
          // Expense: map category to valid Finance.category enum
          const rawCategory = (transaction.category || "").toLowerCase();

          let mappedCategory = "other";
          if (EXPENSE_CATEGORIES.includes(rawCategory)) {
            mappedCategory = rawCategory;
          } else if (["utilities", "personal_care", "other_expense"].includes(rawCategory)) {
            mappedCategory = "other";
          }

          financePayload.category = mappedCategory;
          // Do NOT set source for expenses to avoid enum validation issues
        }

        // Create finance entry
        const financeEntry = new Finance(financePayload);

        await financeEntry.save();
        results.successful++;
        
        console.log(`✅ Saved: ${txType} - ₹${financePayload.amount} - ${financePayload.description} - userId: ${financePayload.userId}`);
      } catch (error) {
        console.error(`❌ Failed to save transaction:`, error.message);
        results.failed++;
        results.errors.push({
          transaction: transaction.description,
          error: error.message,
        });
      }
    }

    console.log(
      `✅ Import complete: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`,
    );
    
    if (results.errors.length > 0) {
      console.log(`❌ Errors encountered:`);
      results.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.transaction}: ${err.error}`);
      });
    }

    res.json({
      success: true,
      message: `Imported ${results.successful} out of ${transactions.length} transactions`,
      results,
    });
  } catch (error) {
    console.error("Batch import error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to import transactions",
      error: error.message,
    });
  }
});

// Get processed statements history
router.get("/processed-statements", requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const statements = await ProcessedStatement.find({
      userId: req.user._id,
    })
      .sort({ processedAt: -1 })
      .limit(limit)
      .select("filename transactionsCount processedAt startDate endDate");

    res.json({
      success: true,
      statements,
    });
  } catch (error) {
    console.error("Failed to fetch processed statements:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch processed statements",
      error: error.message,
    });
  }
});

export default router;
