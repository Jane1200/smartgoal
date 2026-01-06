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
import { checkBudgetBreaches } from "../utils/notificationService.js";

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

  if (entryDate > today) {
    return {
      valid: false,
      error: "Date cannot be in the future",
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

    if (all === "true") {
      // Get all-time summary
      summary = await Finance.getUserFinanceSummary(userId);
      console.log(`Finance summary request for user ${userId} - ALL TIME`);
    } else {
      // Get current month if not specified
      const currentDate = new Date();
      const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();

      console.log(
        `Finance summary request for user ${userId}, month: ${targetMonth}, year: ${targetYear}`,
      );

      summary = await Finance.getUserFinanceSummary(userId, {
        month: targetMonth,
        year: targetYear,
      });
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
      viewMode: all === "true" ? "all-time" : "current-month",
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
    if (month && year) {
      filters.month = parseInt(month);
      filters.year = parseInt(year);
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
    if (month && year) {
      filters.month = parseInt(month);
      filters.year = parseInt(year);
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

    // Create new expense entry
    const expense = new Finance({
      userId,
      type: "expense",
      amount: parseFloat(amount),
      category,
      description: description || "",
      date: dateValidation.date,
    });

    await expense.save();

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

    res.json({
      message: "Expense entry added successfully",
      expense,
    });
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
    if (month && year) {
      filters.month = parseInt(month);
      filters.year = parseInt(year);
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
      const { startDate, endDate } = req.body;

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

      // Extract transactions from file using OCR/parsing
      const extractedTransactions = await extractTransactionsFromFile(
        req.file.path,
        req.file.mimetype,
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

      // Auto-categorize transactions
      console.log("🏷️ Categorizing transactions...");
      const transactionsWithCategories = await getSuggestionsForReview(
        filteredTransactions,
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
        transactionsCount: filteredTransactions.length,
        extractedTransactions: {
          total: filteredTransactions.length,
          income: filteredTransactions.filter(t => t.type === "income").length,
          expenses: filteredTransactions.filter(t => t.type === "expense").length,
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
        `✅ Extracted ${filteredTransactions.length} transactions from statement`,
      );

      res.json({
        success: true,
        message: `Successfully extracted ${filteredTransactions.length} transactions`,
        transactions: transactionsWithCategories,
        statementId: processedStatement._id,
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

    console.log(`📥 Importing ${transactions.length} transactions...`);

    const results = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

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
        const dateValidation = await validateFinanceDate(
          transaction.date.split("T")[0],
          req.user._id,
        );

        if (!dateValidation.valid) {
          results.failed++;
          results.errors.push({
            transaction: transaction.description,
            error: dateValidation.error,
          });
          continue;
        }

        // Create finance entry
        const financeEntry = new Finance({
          userId: req.user._id,
          type: transaction.type || "expense",
          category: transaction.category || "Uncategorized",
          amount: parseFloat(transaction.amount),
          description: transaction.description || "Bank transaction",
          date: dateValidation.date,
          source: "bank_statement",
        });

        await financeEntry.save();
        results.successful++;
      } catch (error) {
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
