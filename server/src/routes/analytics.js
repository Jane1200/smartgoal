import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import Finance from "../models/Finance.js";
import Goal from "../models/Goal.js";
import Marketplace from "../models/Marketplace.js";
import User from "../models/User.js";
import { generateGoalSetterReport } from "../utils/pdfGenerator.js";

const router = Router();

// Quick analytics for dashboard mini widget
router.get("/quick", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Overall progress: average progress across active goals
    const goals = await Goal.find({ userId, status: { $ne: "archived" } }).lean();
    let overallProgress = 0;
    let topGoal = null;
    if (goals.length > 0) {
      const progressList = goals.map((g) => {
        const progress = g.targetAmount > 0 ? Math.min(100, Math.max(0, (g.currentAmount || 0) / g.targetAmount * 100)) : 0;
        return { id: g._id, title: g.title, progress };
      });
      overallProgress = Math.round(progressList.reduce((s, p) => s + p.progress, 0) / progressList.length);
      topGoal = progressList.sort((a, b) => b.progress - a.progress)[0] || null;
    }

    // Monthly metrics: derive high-level percentages from finance + marketplace
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Income/Expense summary (if model static method exists)
    let resaleIncomePct = 0;
    let plannedSavingsPct = 0;
    let spendingControlPct = 0;
    try {
      const financeSummary = await Finance.getUserFinanceSummary(userId, { month, year });
      let income = 0;
      let expense = 0;
      financeSummary.forEach((f) => {
        if (f._id === "income") income = f.total;
        if (f._id === "expense") expense = f.total;
      });
      const savings = Math.max(0, income - expense);
      plannedSavingsPct = income > 0 ? Math.round(Math.min(100, (savings / income) * 100)) : 0;
      spendingControlPct = income > 0 ? Math.round(Math.min(100, ((income - expense) / income) * 100)) : 0;
    } catch (_e) {
      // safe defaults
    }

    try {
      const startOfMonth = new Date(year, now.getMonth(), 1);
      const endOfMonth = new Date(year, now.getMonth() + 1, 0);
      const marketplaceEarnings = await Marketplace.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            status: "sold",
            soldAt: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]);
      const totalSold = marketplaceEarnings.length ? marketplaceEarnings[0].total : 0;
      // Map totalSold to a 0-100 scale heuristically (e.g., 0-100k INR -> 0-100)
      resaleIncomePct = Math.round(Math.max(0, Math.min(100, totalSold / 1000)));
    } catch (_e) {
      // safe default already 0
    }

    return res.json({
      overallProgress,
      topGoal,
      monthlyMetrics: {
        resaleIncome: resaleIncomePct,
        plannedSavings: plannedSavingsPct,
        spendingControl: spendingControlPct,
      },
    });
  } catch (error) {
    console.error("Quick analytics error:", error);
    res.status(500).json({ message: "Failed to fetch quick analytics" });
  }
});

// Get financial health analysis
router.get("/financial-health", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current month's financial data
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Get finance summary for current month
    const financeSummary = await Finance.getUserFinanceSummary(userId, {
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    });
    
    // Get marketplace earnings for current month
    const marketplaceEarnings = await Marketplace.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'sold',
          soldAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$price' },
          itemsSold: { $sum: 1 }
        }
      }
    ]);
    
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let marketplaceIncome = 0;
    let itemsSold = 0;
    
    // Process finance data
    financeSummary.forEach(item => {
      if (item._id === 'income') {
        monthlyIncome = item.total;
      } else if (item._id === 'expense') {
        monthlyExpense = item.total;
      }
    });
    
    // Process marketplace earnings
    if (marketplaceEarnings.length > 0) {
      marketplaceIncome = marketplaceEarnings[0].totalEarnings;
      itemsSold = marketplaceEarnings[0].itemsSold;
    }
    
    const totalIncome = monthlyIncome + marketplaceIncome;
    const monthlySavings = Math.max(0, totalIncome - monthlyExpense);
    
    // Calculate financial health score (0-100)
    let score = 0;
    const insights = [];
    const recommendations = [];
    
    // Savings rate scoring (35% of total score)
    if (totalIncome > 0) {
      const savingsRate = (monthlySavings / totalIncome) * 100;
      score += Math.min(35, savingsRate * 0.35);
      
      if (savingsRate >= 20) {
        insights.push("Excellent savings rate! You're saving 20%+ of your total income.");
        recommendations.push({
          title: "Maintain Current Savings",
          description: "Keep up your excellent savings habits to reach your goals faster."
        });
      } else if (savingsRate >= 10) {
        insights.push("Good savings rate. You're saving a healthy portion of your income.");
        recommendations.push({
          title: "Increase Savings Gradually",
          description: "Try to increase your savings rate by 2-3% each month."
        });
      } else if (savingsRate > 0) {
        insights.push("You're saving some money, but there's room for improvement.");
        recommendations.push({
          title: "Boost Your Savings",
          description: "Look for ways to cut expenses or increase income to save more."
        });
      } else {
        insights.push("You're spending more than you earn. This needs immediate attention.");
        recommendations.push({
          title: "Emergency: Reduce Expenses",
          description: "Immediately review and cut non-essential expenses to balance your budget."
        });
      }
    }
    
    // Marketplace performance scoring (15% of total score)
    if (marketplaceIncome > 0) {
      score += 15;
      insights.push(`Great job! You earned ₹${marketplaceIncome.toLocaleString()} from selling ${itemsSold} item${itemsSold !== 1 ? 's' : ''} this month.`);
      recommendations.push({
        title: "Scale Your Marketplace",
        description: "List more items to increase your resale income and reach goals faster."
      });
    } else {
      // Check if user has active listings
      const activeListings = await Marketplace.countDocuments({ userId, status: 'active' });
      if (activeListings > 0) {
        insights.push(`You have ${activeListings} active listing${activeListings !== 1 ? 's' : ''}. Consider optimizing prices or descriptions to boost sales.`);
        recommendations.push({
          title: "Optimize Listings",
          description: "Review your active listings for better pricing and descriptions to increase sales."
        });
      } else {
        insights.push("Consider listing unused items to generate additional income.");
        recommendations.push({
          title: "Start Selling",
          description: "List unused items in your marketplace to create an additional income stream."
        });
      }
    }
    
    // Expense diversification scoring (20% of total score)
    const expenseBreakdown = await Finance.getCategoryBreakdown(userId, 'expense', {
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    });
    
    if (expenseBreakdown.length > 0) {
      const topCategoryPercentage = (expenseBreakdown[0].total / monthlyExpense) * 100;
      if (topCategoryPercentage <= 40) {
        score += 20;
        insights.push("Well-diversified expenses across multiple categories.");
      } else if (topCategoryPercentage <= 60) {
        score += 10;
        insights.push("Moderately diversified expenses. Consider spreading costs more evenly.");
      } else {
        insights.push("High concentration in one expense category. Diversify your spending.");
        recommendations.push({
          title: "Diversify Expenses",
          description: "Try to spread your expenses more evenly across different categories."
        });
      }
    } else {
      score += 10; // Neutral score for no expenses
    }
    
    // Income diversification scoring (15% of total score)
    const incomeBreakdown = await Finance.getCategoryBreakdown(userId, 'income', {
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    });
    
    let incomeSources = incomeBreakdown.length;
    if (marketplaceIncome > 0) incomeSources += 1; // Marketplace as additional source
    
    if (incomeSources > 2) {
      score += 15;
      insights.push("Excellent income diversification with multiple sources including marketplace earnings.");
    } else if (incomeSources > 1) {
      score += 10;
      insights.push("Good income diversification. Consider adding more income sources.");
    } else if (incomeBreakdown.length > 0 && incomeBreakdown[0]._id === 'salary') {
      score += 8;
      insights.push("Stable salary income provides good financial foundation.");
    } else {
      score += 5;
      insights.push("Consider diversifying your income sources for better stability.");
      recommendations.push({
        title: "Diversify Income",
        description: "Look for additional income sources like freelance work, investments, or selling unused items."
      });
    }
    
    // Goal progress scoring (15% of total score)
    const activeGoals = await Goal.find({ userId, status: { $ne: 'archived' } });
    if (activeGoals.length > 0) {
      const avgProgress = activeGoals.reduce((sum, goal) => {
        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
        return sum + progress;
      }, 0) / activeGoals.length;
      
      score += Math.min(15, avgProgress * 0.15);
      
      if (avgProgress >= 50) {
        insights.push("Great progress on your financial goals!");
      } else if (avgProgress >= 25) {
        insights.push("Making steady progress toward your goals.");
      } else {
        insights.push("Focus on accelerating progress toward your goals.");
        recommendations.push({
          title: "Accelerate Goal Progress",
          description: "Increase savings or find additional income to reach your goals faster."
        });
      }
    } else {
      insights.push("No active financial goals set. Consider setting some savings targets.");
      recommendations.push({
        title: "Set Financial Goals",
        description: "Create specific, measurable goals to improve your financial health."
      });
    }
    
    // Determine health status
    let status = 'Poor';
    if (score >= 80) status = 'Excellent';
    else if (score >= 65) status = 'Good';
    else if (score >= 50) status = 'Fair';
    
    res.json({
      score: Math.round(score),
      status,
      insights,
      recommendations,
      metrics: {
        monthlyIncome,
        marketplaceIncome,
        totalIncome,
        monthlyExpense,
        monthlySavings,
        savingsRate: totalIncome > 0 ? ((monthlySavings / totalIncome) * 100).toFixed(1) : 0,
        itemsSold,
        expenseCategories: expenseBreakdown.length,
        incomeSources,
        activeGoals: activeGoals.length,
        activeListings: await Marketplace.countDocuments({ userId, status: 'active' })
      }
    });
  } catch (error) {
    console.error("Financial health analysis error:", error);
    res.status(500).json({ message: "Failed to analyze financial health" });
  }
});

// Get goal progress analytics
router.get("/goal-progress", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all active goals
    const goals = await Goal.find({ userId, status: { $ne: 'archived' } });
    
    // Get marketplace earnings for goal acceleration analysis
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const marketplaceEarnings = await Marketplace.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'sold',
          soldAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$price' }
        }
      }
    ]);
    
    const monthlyMarketplaceEarnings = marketplaceEarnings.length > 0 ? marketplaceEarnings[0].totalEarnings : 0;
    
    // Get average monthly savings from finance data
    const financeSummary = await Finance.getUserFinanceSummary(userId, {
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    });
    
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    
    financeSummary.forEach(item => {
      if (item._id === 'income') {
        monthlyIncome = item.total;
      } else if (item._id === 'expense') {
        monthlyExpense = item.total;
      }
    });
    
    const monthlySavings = Math.max(0, monthlyIncome + monthlyMarketplaceEarnings - monthlyExpense);
    
    const goalAnalytics = goals.map(goal => {
      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
      const remainingAmount = goal.targetAmount - goal.currentAmount;
      
      // Calculate estimated completion time based on actual savings + marketplace earnings
      let estimatedCompletion = "Unknown";
      
      if (monthlySavings > 0) {
        const monthsRemaining = Math.ceil(remainingAmount / monthlySavings);
        
        if (monthsRemaining <= 12) {
          estimatedCompletion = `${monthsRemaining} month${monthsRemaining !== 1 ? 's' : ''}`;
        } else {
          const years = Math.floor(monthsRemaining / 12);
          const months = monthsRemaining % 12;
          estimatedCompletion = `${years} year${years !== 1 ? 's' : ''}${months > 0 ? ` and ${months} month${months !== 1 ? 's' : ''}` : ''}`;
        }
      } else if (monthlyMarketplaceEarnings > 0) {
        // If no regular savings but has marketplace earnings
        const monthsRemaining = Math.ceil(remainingAmount / monthlyMarketplaceEarnings);
        estimatedCompletion = `${monthsRemaining} month${monthsRemaining !== 1 ? 's' : ''} (via marketplace)`;
      } else {
        estimatedCompletion = "Start saving or selling items";
      }
      
      return {
        _id: goal._id,
        title: goal.title,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        progress: Math.round(progress),
        remainingAmount,
        estimatedCompletion,
        monthlySavings,
        status: goal.status,
        dueDate: goal.dueDate
      };
    });
    
    // Calculate average progress
    const averageProgress = goals.length > 0 
      ? Math.round(goalAnalytics.reduce((sum, goal) => sum + goal.progress, 0) / goals.length)
      : 0;
    
    // Generate insights
    const insights = [];
    
    if (goals.length === 0) {
      insights.push("No active financial goals. Set some goals to track your progress!");
    } else {
      const completedGoals = goals.filter(g => g.status === 'completed').length;
      const onTrackGoals = goalAnalytics.filter(g => g.progress >= 50).length;
      
      if (completedGoals > 0) {
        insights.push(`Congratulations! You've completed ${completedGoals} goal${completedGoals !== 1 ? 's' : ''}.`);
      }
      
      if (onTrackGoals > 0) {
        insights.push(`${onTrackGoals} of your goals are more than 50% complete.`);
      }
      
      // Marketplace earnings impact on goals
      if (monthlyMarketplaceEarnings > 0) {
        const goalsAccelerated = goalAnalytics.filter(g => 
          g.estimatedCompletion.includes('marketplace') || 
          g.estimatedCompletion !== "Start saving or selling items"
        ).length;
        
        if (goalsAccelerated > 0) {
          insights.push(`Your marketplace earnings (₹${monthlyMarketplaceEarnings.toLocaleString()}) are helping you reach ${goalsAccelerated} goal${goalsAccelerated !== 1 ? 's' : ''} faster.`);
        }
      }
      
      // Find most achievable goal
      const goalsWithTime = goalAnalytics.filter(g => 
        g.estimatedCompletion !== "Start saving or selling items" && 
        g.estimatedCompletion !== "Unknown"
      );
      
      if (goalsWithTime.length > 0) {
        const fastestGoal = goalsWithTime.reduce((prev, current) => {
          const prevMonths = parseInt(prev.estimatedCompletion) || 999;
          const currentMonths = parseInt(current.estimatedCompletion) || 999;
          return prevMonths < currentMonths ? prev : current;
        });
        insights.push(`"${fastestGoal.title}" is your most achievable goal (${fastestGoal.estimatedCompletion}).`);
      }
      
      // Savings rate impact
      if (monthlySavings > 0) {
        const avgMonthlyContribution = monthlySavings / goals.length;
        insights.push(`Your current savings rate can contribute ₹${Math.round(avgMonthlyContribution).toLocaleString()} per goal monthly.`);
      }
    }
    
    res.json({
      goals: goalAnalytics,
      averageProgress,
      totalGoals: goals.length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      insights,
      summary: {
        totalTargetAmount: goals.reduce((sum, goal) => sum + goal.targetAmount, 0),
        totalCurrentAmount: goals.reduce((sum, goal) => sum + goal.currentAmount, 0),
        totalRemainingAmount: goals.reduce((sum, goal) => sum + (goal.targetAmount - goal.currentAmount), 0),
        monthlySavings,
        monthlyMarketplaceEarnings,
        avgMonthlyContributionPerGoal: goals.length > 0 ? monthlySavings / goals.length : 0
      }
    });
  } catch (error) {
    console.error("Goal progress analysis error:", error);
    res.status(500).json({ message: "Failed to analyze goal progress" });
  }
});

// Get spending patterns analysis
router.get("/spending-patterns", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { months = 3 } = req.query;
    
    // Get spending data for the last N months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - parseInt(months));
    
    // Get expense breakdown
    const expenseBreakdown = await Finance.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);
    
    // Get marketplace earnings for comparison
    const marketplaceEarnings = await Marketplace.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'sold',
          soldAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$price' },
          itemsSold: { $sum: 1 }
        }
      }
    ]);
    
    // Get income breakdown for comparison
    const incomeBreakdown = await Finance.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'income',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$source',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);
    
    // Calculate totals
    const totalExpenses = expenseBreakdown.reduce((sum, item) => sum + item.total, 0);
    const totalIncome = incomeBreakdown.reduce((sum, item) => sum + item.total, 0);
    const totalMarketplaceEarnings = marketplaceEarnings.length > 0 ? marketplaceEarnings[0].totalEarnings : 0;
    const totalRevenue = totalIncome + totalMarketplaceEarnings;
    
    // Format categories with percentages
    const categories = expenseBreakdown.map(item => ({
      name: item._id,
      amount: item.total,
      percentage: totalExpenses > 0 ? Math.round((item.total / totalExpenses) * 100) : 0,
      count: item.count,
      average: Math.round(item.average)
    }));
    
    // Format income sources
    const incomeSources = incomeBreakdown.map(item => ({
      name: item._id,
      amount: item.total,
      percentage: totalIncome > 0 ? Math.round((item.total / totalIncome) * 100) : 0,
      count: item.count,
      average: Math.round(item.average)
    }));
    
    // Add marketplace as income source if there are earnings
    if (totalMarketplaceEarnings > 0) {
      incomeSources.push({
        name: 'marketplace',
        amount: totalMarketplaceEarnings,
        percentage: totalRevenue > 0 ? Math.round((totalMarketplaceEarnings / totalRevenue) * 100) : 0,
        count: marketplaceEarnings[0].itemsSold,
        average: Math.round(totalMarketplaceEarnings / marketplaceEarnings[0].itemsSold)
      });
    }
    
    // Generate insights
    const insights = [];
    
    if (categories.length > 0) {
      const topCategory = categories[0];
      insights.push(`Your biggest expense category is ${topCategory.name} (${topCategory.percentage}% of total expenses).`);
      
      if (topCategory.percentage > 50) {
        insights.push("Consider reducing expenses in your top category to improve savings.");
      }
      
      if (categories.length >= 5) {
        insights.push("Good expense diversification across multiple categories.");
      } else {
        insights.push("Consider tracking more detailed expense categories for better insights.");
      }
      
      // Find potential savings opportunities
      const highExpenseCategories = categories.filter(c => c.percentage > 20);
      if (highExpenseCategories.length > 1) {
        insights.push("Multiple high-expense categories detected. Review for optimization opportunities.");
      }
    } else {
      insights.push("No expense data available for analysis. Start tracking your expenses!");
    }
    
    // Marketplace insights
    if (totalMarketplaceEarnings > 0) {
      const marketplacePercentage = totalRevenue > 0 ? Math.round((totalMarketplaceEarnings / totalRevenue) * 100) : 0;
      insights.push(`Marketplace sales contributed ${marketplacePercentage}% of your total revenue (₹${totalMarketplaceEarnings.toLocaleString()}).`);
      
      if (marketplacePercentage > 20) {
        insights.push("Marketplace is a significant income source! Consider listing more items to boost earnings.");
      }
    } else {
      insights.push("No marketplace sales yet. List unused items to create additional income streams.");
    }
    
    // Income vs Expense insights
    if (totalRevenue > 0 && totalExpenses > 0) {
      const savingsRate = ((totalRevenue - totalExpenses) / totalRevenue) * 100;
      if (savingsRate > 20) {
        insights.push(`Excellent savings rate of ${savingsRate.toFixed(1)}%! Keep up the great work.`);
      } else if (savingsRate > 0) {
        insights.push(`You're saving ${savingsRate.toFixed(1)}% of your income. Consider increasing this rate.`);
      } else {
        insights.push("You're spending more than you earn. Focus on reducing expenses or increasing income.");
      }
    }
    
    // Get spending trends over time
    const trends = await Finance.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'expense',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    // Get marketplace earnings trends
    const marketplaceTrends = await Marketplace.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'sold',
          soldAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$soldAt' },
            month: { $month: '$soldAt' }
          },
          total: { $sum: '$price' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    res.json({
      categories,
      incomeSources,
      trends,
      marketplaceTrends,
      insights,
      summary: {
        totalExpenses,
        totalIncome,
        totalMarketplaceEarnings,
        totalRevenue,
        savingsRate: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1) : 0,
        averageMonthlyExpense: totalExpenses / parseInt(months),
        averageMonthlyIncome: totalRevenue / parseInt(months),
        totalTransactions: categories.reduce((sum, cat) => sum + cat.count, 0),
        totalItemsSold: marketplaceEarnings.length > 0 ? marketplaceEarnings[0].itemsSold : 0,
        analysisPeriod: `${months} months`
      }
    });
  } catch (error) {
    console.error("Spending patterns analysis error:", error);
    res.status(500).json({ message: "Failed to analyze spending patterns" });
  }
});

// Get today's activity feed for dashboard
router.get("/today-activity", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get start and end of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    
    const activities = [];
    
    // Get today's goals activities (created or updated)
    const goalsUpdatedToday = await Goal.find({
      userId,
      $or: [
        { createdAt: { $gte: startOfToday, $lte: endOfToday } },
        { updatedAt: { $gte: startOfToday, $lte: endOfToday } }
      ]
    }).sort({ updatedAt: -1 }).limit(10);
    
    goalsUpdatedToday.forEach(goal => {
      const isNew = new Date(goal.createdAt) >= startOfToday;
      const progress = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
      
      activities.push({
        type: 'goal',
        action: isNew ? 'created' : 'updated',
        title: goal.title,
        description: isNew 
          ? `Created new goal with target of ₹${goal.targetAmount.toLocaleString()}`
          : `Updated goal progress to ${progress}% (₹${goal.currentAmount.toLocaleString()} of ₹${goal.targetAmount.toLocaleString()})`,
        timestamp: goal.updatedAt,
        metadata: {
          goalId: goal._id,
          progress,
          status: goal.status,
          amount: goal.currentAmount
        },
        icon: isNew ? '🎯' : '📈'
      });
    });
    
    // Get today's finance records
    const financeRecordsToday = await Finance.find({
      userId,
      createdAt: { $gte: startOfToday, $lte: endOfToday }
    }).sort({ createdAt: -1 }).limit(10);
    
    financeRecordsToday.forEach(record => {
      activities.push({
        type: 'finance',
        action: record.type,
        title: record.type === 'income' ? 'Income Added' : 'Expense Recorded',
        description: `${record.category || record.source || 'General'}: ₹${record.amount.toLocaleString()}${record.description ? ` - ${record.description}` : ''}`,
        timestamp: record.createdAt,
        metadata: {
          financeId: record._id,
          type: record.type,
          amount: record.amount,
          category: record.category || record.source
        },
        icon: record.type === 'income' ? '💰' : '💸'
      });
    });
    
    // Get today's marketplace activities
    const marketplaceActivitiesToday = await Marketplace.find({
      userId,
      $or: [
        { createdAt: { $gte: startOfToday, $lte: endOfToday } },
        { updatedAt: { $gte: startOfToday, $lte: endOfToday } },
        { soldAt: { $gte: startOfToday, $lte: endOfToday } }
      ]
    }).sort({ updatedAt: -1 }).limit(10);
    
    marketplaceActivitiesToday.forEach(item => {
      const isNew = new Date(item.createdAt) >= startOfToday;
      const isSold = item.status === 'sold' && item.soldAt && new Date(item.soldAt) >= startOfToday;
      
      let action, description, icon;
      
      if (isSold) {
        action = 'sold';
        description = `Sold "${item.title}" for ₹${item.price.toLocaleString()}`;
        icon = '✅';
      } else if (isNew) {
        action = 'listed';
        description = `Listed "${item.title}" for ₹${item.price.toLocaleString()}`;
        icon = '🏷️';
      } else {
        action = 'updated';
        description = `Updated listing "${item.title}"`;
        icon = '🔄';
      }
      
      activities.push({
        type: 'marketplace',
        action,
        title: action === 'sold' ? 'Item Sold' : (action === 'listed' ? 'New Listing' : 'Listing Updated'),
        description,
        timestamp: isSold ? item.soldAt : item.updatedAt,
        metadata: {
          itemId: item._id,
          status: item.status,
          price: item.price
        },
        icon
      });
    });
    
    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Limit to 20 most recent activities
    const recentActivities = activities.slice(0, 20);
    
    res.json({
      activities: recentActivities,
      count: recentActivities.length,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error("Today's activity feed error:", error);
    res.status(500).json({ message: "Failed to fetch today's activities" });
  }
});

// Generate Monthly PDF Report for Goal Setters
router.get("/generate-monthly-report", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const user = await User.findById(userId).select('name email profile');
    
    // Get financial health data
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const financeSummary = await Finance.getUserFinanceSummary(userId, {
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    });
    
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    financeSummary.forEach(item => {
      if (item._id === 'income') monthlyIncome = item.total;
      if (item._id === 'expense') monthlyExpense = item.total;
    });
    
    const monthlySavings = monthlyIncome - monthlyExpense;
    const savingsRate = monthlyIncome > 0 ? ((monthlySavings / monthlyIncome) * 100).toFixed(1) : 0;
    
    // Get marketplace data
    const marketplaceEarnings = await Marketplace.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          status: 'sold',
          soldAt: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$price' }, count: { $sum: 1 } } }
    ]);
    
    const marketplaceIncome = marketplaceEarnings.length ? marketplaceEarnings[0].total : 0;
    const itemsSold = marketplaceEarnings.length ? marketplaceEarnings[0].count : 0;
    const activeListings = await Marketplace.countDocuments({ userId, status: 'active' });
    
    // Get goals data
    const goals = await Goal.find({ userId, status: { $ne: 'archived' } });
    const activeGoals = goals.filter(g => g.status === 'active');
    
    // Calculate financial health score
    let score = 0;
    
    // Savings rate scoring (40%)
    if (savingsRate >= 30) score += 40;
    else if (savingsRate >= 20) score += 30;
    else if (savingsRate >= 10) score += 20;
    else if (savingsRate >= 5) score += 10;
    
    // Income stability (20%)
    if (monthlyIncome > 0) score += 15;
    if (marketplaceIncome > 0) score += 5;
    
    // Expense management (15%)
    if (monthlyExpense < monthlyIncome) score += 15;
    else if (monthlyExpense <= monthlyIncome * 1.1) score += 10;
    
    // Goal progress (15%)
    if (activeGoals.length > 0) {
      const avgProgress = activeGoals.reduce((sum, g) => {
        const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
        return sum + progress;
      }, 0) / activeGoals.length;
      score += Math.min(15, (avgProgress / 100) * 15);
    }
    
    // Marketplace activity (10%)
    if (itemsSold > 0) score += 10;
    else if (activeListings > 0) score += 5;
    
    score = Math.round(score);
    
    // Determine status
    let status = 'Poor';
    if (score >= 80) status = 'Excellent';
    else if (score >= 65) status = 'Good';
    else if (score >= 50) status = 'Fair';
    
    // Generate insights
    const insights = [];
    if (savingsRate >= 20) {
      insights.push(`Excellent savings rate of ${savingsRate}%. You're building wealth effectively.`);
    } else if (savingsRate >= 10) {
      insights.push(`Good savings rate of ${savingsRate}%. Consider increasing it to 20%+.`);
    } else {
      insights.push(`Low savings rate of ${savingsRate}%. Try to reduce expenses or increase income.`);
    }
    
    if (marketplaceIncome > 0) {
      insights.push(`Great marketplace activity! You earned ₹${marketplaceIncome.toLocaleString()} from ${itemsSold} sale${itemsSold !== 1 ? 's' : ''}.`);
    } else if (activeListings > 0) {
      insights.push(`You have ${activeListings} active listing${activeListings !== 1 ? 's' : ''}. Consider optimizing to boost sales.`);
    }
    
    if (activeGoals.length > 0) {
      insights.push(`You have ${activeGoals.length} active goal${activeGoals.length !== 1 ? 's' : ''} in progress.`);
    }
    
    if (monthlyExpense < monthlyIncome) {
      insights.push('Your monthly expenses are within budget. Great financial discipline!');
    } else {
      insights.push('Monthly expenses exceed income. Review and optimize spending.');
    }
    
    // Generate recommendations
    const recommendations = [];
    if (savingsRate < 20) {
      recommendations.push({
        title: 'Increase Savings Rate',
        description: 'Target a 20%+ savings rate by reducing discretionary spending or finding additional income sources.'
      });
    }
    
    if (marketplaceIncome === 0 && activeListings === 0) {
      recommendations.push({
        title: 'Start Selling Unused Items',
        description: 'List unused items on the marketplace to generate extra income and accelerate goal progress.'
      });
    }
    
    if (activeGoals.length === 0) {
      recommendations.push({
        title: 'Set Financial Goals',
        description: 'Create specific savings goals to give your financial planning clear direction and motivation.'
      });
    }
    
    if (monthlyExpense > monthlyIncome) {
      recommendations.push({
        title: 'Balance Your Budget',
        description: 'Immediately review and cut non-essential expenses to balance your monthly budget.'
      });
    }
    
    // Prepare analytics data for PDF
    const analyticsData = {
      score,
      status,
      insights,
      recommendations,
      metrics: {
        monthlyIncome,
        monthlyExpense,
        monthlySavings,
        savingsRate: parseFloat(savingsRate),
        marketplaceIncome,
        itemsSold,
        activeGoals: activeGoals.length,
        activeListings
      },
      goals: activeGoals.map(g => ({
        title: g.title,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        progress: g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0
      }))
    };
    
    const userData = {
      name: user.name || user.profile?.name,
      email: user.email
    };
    
    // Generate PDF
    const pdfBuffer = await generateGoalSetterReport(userData, analyticsData);
    
    // Set response headers for PDF download
    const filename = `SmartGoal_Financial_Report_${currentDate.toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Generate monthly report error:', error);
    res.status(500).json({ message: 'Failed to generate monthly report' });
  }
});

export default router;
