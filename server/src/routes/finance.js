import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Finance from "../models/Finance.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { calculateUserSavings, getMonthlySavingsBreakdown } from "../utils/financeUtils.js";

const router = Router();

// Helper function to validate date
const validateFinanceDate = async (dateString, userId) => {
  // Check if date is provided
  if (!dateString) {
    return { 
      valid: false, 
      error: "Date is required" 
    };
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return { 
      valid: false, 
      error: "Date must be in YYYY-MM-DD format" 
    };
  }

  // Parse date
  const entryDate = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(entryDate.getTime())) {
    return { 
      valid: false, 
      error: "Invalid date" 
    };
  }

  // Check if date is not in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  if (entryDate > today) {
    return { 
      valid: false, 
      error: "Date cannot be in the future" 
    };
  }

  // Get user's account creation date
  try {
    const user = await User.findById(userId).select('createdAt');
    if (!user) {
      return { 
        valid: false, 
        error: "User not found" 
      };
    }

    // Check if date is not before account creation
    const accountCreationDate = new Date(user.createdAt);
    accountCreationDate.setHours(0, 0, 0, 0); // Start of account creation day
    
    const entryDateOnly = new Date(entryDate);
    entryDateOnly.setHours(0, 0, 0, 0);

    if (entryDateOnly < accountCreationDate) {
      const formattedAccountDate = accountCreationDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      return { 
        valid: false, 
        error: `Date cannot be before your account creation date (${formattedAccountDate})` 
      };
    }

    return { 
      valid: true, 
      date: entryDate 
    };
  } catch (error) {
    console.error("Date validation error:", error);
    return { 
      valid: false, 
      error: "Failed to validate date" 
    };
  }
};

// Get finance summary
router.get("/summary", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year, all } = req.query;
    
    let summary;
    
    if (all === 'true') {
      // Get all-time summary
      summary = await Finance.getUserFinanceSummary(userId);
      console.log(`Finance summary request for user ${userId} - ALL TIME`);
    } else {
      // Get current month if not specified
      const currentDate = new Date();
      const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();
      
      console.log(`Finance summary request for user ${userId}, month: ${targetMonth}, year: ${targetYear}`);
      
      summary = await Finance.getUserFinanceSummary(userId, {
        month: targetMonth,
        year: targetYear
      });
    }
    
    console.log('Summary data:', summary);
    
    // Calculate totals
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    
    summary.forEach(item => {
      if (item._id === 'income') {
        monthlyIncome = item.total;
      } else if (item._id === 'expense') {
        monthlyExpense = item.total;
      }
    });
    
    const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);
    
    res.json({
      monthlyIncome,
      monthlyExpense,
      monthlySavings,
      incomeCount: summary.find(s => s._id === 'income')?.count || 0,
      expenseCount: summary.find(s => s._id === 'expense')?.count || 0,
      viewMode: all === 'true' ? 'all-time' : 'current-month'
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
    
    const income = await Finance.getUserIncome(userId, filters)
      .limit(parseInt(limit));
    
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
    
    const expenses = await Finance.getUserExpenses(userId, filters)
      .limit(parseInt(limit));
    
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
        message: "Amount and source are required" 
      });
    }

    // Validate amount range
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 2 || amountNum > 100000) {
      return res.status(400).json({ 
        message: "Amount must be between ₹2 and ₹1,00,000" 
      });
    }

    // Validate description (optional but has constraints if provided)
    if (description && description.length > 100) {
      return res.status(400).json({ 
        message: "Description cannot exceed 100 characters" 
      });
    }

    // Check for repetitive characters in description (if provided)
    if (description && description.trim().length > 0) {
      if (/(.)\1{2,}/.test(description)) {
        return res.status(400).json({ 
          message: "Description contains repetitive characters (spam detected)" 
        });
      }
    }
    
    // Validate date
    const dateValidation = await validateFinanceDate(date, userId);
    if (!dateValidation.valid) {
      return res.status(400).json({ 
        message: dateValidation.error 
      });
    }
    
    // Create new income entry
    const income = new Finance({
      userId,
      type: 'income',
      amount: parseFloat(amount),
      source,
      description: description || '',
      date: dateValidation.date
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
          year: currentYear
        });
        
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        
        summary.forEach(item => {
          if (item._id === 'income') monthlyIncome = item.total;
          else if (item._id === 'expense') monthlyExpense = item.total;
        });
        
        const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);
        
        // Get expenses
        const expenses = await Finance.getUserExpenses(userId, {
          month: currentMonth,
          year: currentYear
        });
        
        // Categorize expenses
        const needs = ['housing', 'food', 'transport', 'healthcare'];
        const wants = ['entertainment', 'shopping', 'travel'];
        
        const needsTotal = expenses.filter(e => needs.includes(e.category)).reduce((sum, e) => sum + (e.amount || 0), 0);
        const wantsTotal = expenses.filter(e => wants.includes(e.category)).reduce((sum, e) => sum + (e.amount || 0), 0);
        
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
              category: 'finance',
              title: '50/30/20 Rule: Needs Alert',
              createdAt: { $gte: today }
            });
            if (!existing) {
              await Notification.createNeedsAlert(userId, needsPercentage, monthlyIncome);
            }
          }
          
          if (wantsPercentage > 30) {
            const existing = await Notification.findOne({
              userId,
              category: 'finance',
              title: '50/30/20 Rule: Wants Alert',
              createdAt: { $gte: today }
            });
            if (!existing) {
              const excessWants = wantsTotal - (monthlyIncome * 0.30);
              await Notification.createWantsAlert(userId, wantsPercentage, excessWants, monthlyIncome);
            }
          }
          
          if (savingsPercentage < 20) {
            const existing = await Notification.findOne({
              userId,
              category: 'finance',
              title: '50/30/20 Rule: Savings Alert',
              createdAt: { $gte: today }
            });
            if (!existing) {
              const targetSavings = monthlyIncome * 0.20;
              const savingsGap = targetSavings - monthlySavings;
              await Notification.createSavingsAlert(userId, savingsPercentage, savingsGap, monthlyIncome);
            }
          }
          
          if (monthlyExpense > monthlyIncome) {
            const existing = await Notification.findOne({
              userId,
              category: 'finance',
              title: 'Monthly Overspending Alert',
              createdAt: { $gte: today }
            });
            if (!existing) {
              const overspend = monthlyExpense - monthlyIncome;
              await Notification.createOverspendingAlert(userId, overspend, monthlyIncome, monthlyExpense);
            }
          }
        }
      } catch (err) {
        console.error("Background financial analysis error:", err);
      }
    }, 1000);
    
    res.json({
      message: "Income entry added successfully",
      income
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
        message: "Amount and category are required" 
      });
    }

    // Validate amount range
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 2 || amountNum > 100000) {
      return res.status(400).json({ 
        message: "Amount must be between ₹2 and ₹1,00,000" 
      });
    }

    // Validate description (optional but has constraints if provided)
    if (description && description.length > 100) {
      return res.status(400).json({ 
        message: "Description cannot exceed 100 characters" 
      });
    }

    // Check for repetitive characters in description (if provided)
    if (description && description.trim().length > 0) {
      if (/(.)\1{2,}/.test(description)) {
        return res.status(400).json({ 
          message: "Description contains repetitive characters (spam detected)" 
        });
      }
    }
    
    // Validate date
    const dateValidation = await validateFinanceDate(date, userId);
    if (!dateValidation.valid) {
      return res.status(400).json({ 
        message: dateValidation.error 
      });
    }
    
    // Create new expense entry
    const expense = new Finance({
      userId,
      type: 'expense',
      amount: parseFloat(amount),
      category,
      description: description || '',
      date: dateValidation.date
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
          year: currentYear
        });
        
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        
        summary.forEach(item => {
          if (item._id === 'income') monthlyIncome = item.total;
          else if (item._id === 'expense') monthlyExpense = item.total;
        });
        
        const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);
        
        // Get expenses
        const expenses = await Finance.getUserExpenses(userId, {
          month: currentMonth,
          year: currentYear
        });
        
        // Categorize expenses
        const needs = ['housing', 'food', 'transport', 'healthcare'];
        const wants = ['entertainment', 'shopping', 'travel'];
        
        const needsTotal = expenses.filter(e => needs.includes(e.category)).reduce((sum, e) => sum + (e.amount || 0), 0);
        const wantsTotal = expenses.filter(e => wants.includes(e.category)).reduce((sum, e) => sum + (e.amount || 0), 0);
        
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
              category: 'finance',
              title: '50/30/20 Rule: Needs Alert',
              createdAt: { $gte: today }
            });
            if (!existing) {
              await Notification.createNeedsAlert(userId, needsPercentage, monthlyIncome);
            }
          }
          
          if (wantsPercentage > 30) {
            const existing = await Notification.findOne({
              userId,
              category: 'finance',
              title: '50/30/20 Rule: Wants Alert',
              createdAt: { $gte: today }
            });
            if (!existing) {
              const excessWants = wantsTotal - (monthlyIncome * 0.30);
              await Notification.createWantsAlert(userId, wantsPercentage, excessWants, monthlyIncome);
            }
          }
          
          if (savingsPercentage < 20) {
            const existing = await Notification.findOne({
              userId,
              category: 'finance',
              title: '50/30/20 Rule: Savings Alert',
              createdAt: { $gte: today }
            });
            if (!existing) {
              const targetSavings = monthlyIncome * 0.20;
              const savingsGap = targetSavings - monthlySavings;
              await Notification.createSavingsAlert(userId, savingsPercentage, savingsGap, monthlyIncome);
            }
          }
          
          if (monthlyExpense > monthlyIncome) {
            const existing = await Notification.findOne({
              userId,
              category: 'finance',
              title: 'Monthly Overspending Alert',
              createdAt: { $gte: today }
            });
            if (!existing) {
              const overspend = monthlyExpense - monthlyIncome;
              await Notification.createOverspendingAlert(userId, overspend, monthlyIncome, monthlyExpense);
            }
          }
        }
        
        // Check for high spending category
        if (expenses.length > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const categoryTotals = {};
          expenses.forEach(entry => {
            const cat = entry.category || 'other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + (entry.amount || 0);
          });
          
          const sortedCategories = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a);
          
          if (sortedCategories.length > 0) {
            const [topCategory, topAmount] = sortedCategories[0];
            const percentage = monthlyExpense > 0 ? (topAmount / monthlyExpense) * 100 : 0;
            
            if (percentage > 40) {
              const existing = await Notification.findOne({
                userId,
                category: 'finance',
                title: 'High Spending Category',
                createdAt: { $gte: today }
              });
              if (!existing) {
                await Notification.createHighSpendingAlert(userId, topCategory, topAmount, percentage);
              }
            }
          }
          
          // Check for recent high expenses
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const recentHighExpenses = expenses.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= sevenDaysAgo && (entry.amount || 0) > 1000;
          });
          
          if (recentHighExpenses.length > 0) {
            const existing = await Notification.findOne({
              userId,
              category: 'finance',
              title: 'Recent High Expenses',
              createdAt: { $gte: today }
            });
            if (!existing) {
              const totalAmount = recentHighExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
              await Notification.createRecentHighExpensesAlert(userId, recentHighExpenses.length, totalAmount);
            }
          }
        }
      } catch (err) {
        console.error("Background financial analysis error:", err);
      }
    }, 1000);
    
    res.json({
      message: "Expense entry added successfully",
      expense
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
      type: 'income' 
    });
    
    if (!entry) {
      return res.status(404).json({ 
        message: "Income entry not found or you do not have permission to delete it" 
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
      type: 'expense' 
    });
    
    if (!entry) {
      return res.status(404).json({ 
        message: "Expense entry not found or you do not have permission to delete it" 
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
    
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ 
        message: "Type must be 'income' or 'expense'" 
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
        availableBalance: savings.availableBalance
      },
      message: `You have ₹${savings.totalSavings.toLocaleString()} in total savings`
    });
  } catch (error) {
    console.error("Get savings error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to calculate savings",
      error: error.message 
    });
  }
});

// Get monthly savings breakdown (NEW)
router.get("/savings/breakdown", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { months = 6 } = req.query;
    
    const breakdown = await getMonthlySavingsBreakdown(userId, parseInt(months));
    
    res.json({
      success: true,
      breakdown,
      summary: {
        avgMonthlySavings: breakdown.reduce((sum, m) => sum + m.savings, 0) / breakdown.length,
        avgSavingsRate: breakdown.reduce((sum, m) => sum + m.savingsRate, 0) / breakdown.length,
        totalSavings: breakdown.reduce((sum, m) => sum + m.savings, 0)
      }
    });
  } catch (error) {
    console.error("Get savings breakdown error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to get savings breakdown",
      error: error.message 
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
      type: 'expense' 
    });

    // Categorize expenses by type (Needs/Wants/Savings)
    const needs = ['housing', 'food', 'transport', 'healthcare'];
    const wants = ['entertainment', 'shopping', 'travel'];

    // Filter current period expenses
    let periodExpenses = expenses;
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      periodExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
    }

    // Calculate wants expenses
    const wantsExpenses = periodExpenses.filter(e => wants.includes(e.category));
    const totalWants = wantsExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Get total income for reference
    const incomeData = await Finance.getUserFinanceSummary(userId, filters);
    const totalIncome = incomeData.find(i => i._id === 'income')?.total || 0;

    res.json({
      wantsExpenses,
      totalWantsAmount: totalWants,
      wantsPercentage: totalIncome > 0 ? (totalWants / totalIncome) * 100 : 0,
      totalIncome,
      message: `Found ₹${totalWants.toLocaleString()} in wants expenses. This amount can be allocated to goals.`
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
      year: currentYear
    });
    
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    
    summary.forEach(item => {
      if (item._id === 'income') monthlyIncome = item.total;
      else if (item._id === 'expense') monthlyExpense = item.total;
    });
    
    const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);
    
    // Get expenses for detailed analysis
    const expenses = await Finance.getUserExpenses(userId, {
      month: currentMonth,
      year: currentYear
    });
    
    // Categorize expenses
    const needs = ['housing', 'food', 'transport', 'healthcare'];
    const wants = ['entertainment', 'shopping', 'travel'];
    
    const needsExpenses = expenses.filter(e => needs.includes(e.category));
    const wantsExpenses = expenses.filter(e => wants.includes(e.category));
    
    const needsTotal = needsExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const wantsTotal = wantsExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    const notificationsCreated = [];
    
    // Only analyze if there's income
    if (monthlyIncome > 0) {
      const needsPercentage = (needsTotal / monthlyIncome) * 100;
      const wantsPercentage = (wantsTotal / monthlyIncome) * 100;
      const savingsPercentage = (monthlySavings / monthlyIncome) * 100;
      
      // Check 50/30/20 Rule violations
      if (needsPercentage > 50) {
        const notification = await Notification.createNeedsAlert(userId, needsPercentage, monthlyIncome);
        notificationsCreated.push(notification);
      }
      
      if (wantsPercentage > 30) {
        const excessWants = wantsTotal - (monthlyIncome * 0.30);
        const notification = await Notification.createWantsAlert(userId, wantsPercentage, excessWants, monthlyIncome);
        notificationsCreated.push(notification);
      }
      
      if (savingsPercentage < 20) {
        const targetSavings = monthlyIncome * 0.20;
        const savingsGap = targetSavings - monthlySavings;
        const notification = await Notification.createSavingsAlert(userId, savingsPercentage, savingsGap, monthlyIncome);
        notificationsCreated.push(notification);
      }
      
      // Check for overspending
      if (monthlyExpense > monthlyIncome) {
        const overspend = monthlyExpense - monthlyIncome;
        const notification = await Notification.createOverspendingAlert(userId, overspend, monthlyIncome, monthlyExpense);
        notificationsCreated.push(notification);
      }
    }
    
    // Analyze expense patterns
    if (expenses.length > 0) {
      // Find highest spending category
      const categoryTotals = {};
      expenses.forEach(entry => {
        const category = entry.category || 'other';
        categoryTotals[category] = (categoryTotals[category] || 0) + (entry.amount || 0);
      });
      
      const sortedCategories = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a);
      
      if (sortedCategories.length > 0) {
        const [topCategory, topAmount] = sortedCategories[0];
        const percentage = monthlyExpense > 0 ? (topAmount / monthlyExpense) * 100 : 0;
        
        if (percentage > 40) {
          const notification = await Notification.createHighSpendingAlert(userId, topCategory, topAmount, percentage);
          notificationsCreated.push(notification);
        }
      }
      
      // Check for recent high expenses (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentHighExpenses = expenses.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= sevenDaysAgo && (entry.amount || 0) > 1000;
      });
      
      if (recentHighExpenses.length > 0) {
        const totalAmount = recentHighExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const notification = await Notification.createRecentHighExpensesAlert(userId, recentHighExpenses.length, totalAmount);
        notificationsCreated.push(notification);
      }
    }
    
    res.json({
      success: true,
      message: `Analysis complete. Created ${notificationsCreated.length} financial notifications.`,
      notificationsCount: notificationsCreated.length,
      notifications: notificationsCreated
    });
    
  } catch (error) {
    console.error("Finance analysis error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to analyze finances",
      error: error.message 
    });
  }
});

export default router;
