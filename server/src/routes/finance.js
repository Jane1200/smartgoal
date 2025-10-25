import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Finance from "../models/Finance.js";

const router = Router();

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
    
    // Create new income entry
    const income = new Finance({
      userId,
      type: 'income',
      amount: parseFloat(amount),
      source,
      description: description || '',
      date: date ? new Date(date) : new Date()
    });
    
    await income.save();
    
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
    
    // Create new expense entry
    const expense = new Finance({
      userId,
      type: 'expense',
      amount: parseFloat(amount),
      category,
      description: description || '',
      date: date ? new Date(date) : new Date()
    });
    
    await expense.save();
    
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

export default router;
