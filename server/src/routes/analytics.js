import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import Finance from "../models/Finance.js";
import Goal from "../models/Goal.js";
import Marketplace from "../models/Marketplace.js";

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

export default router;
