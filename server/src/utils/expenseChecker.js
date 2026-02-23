import Finance from '../models/Finance.js';
import User from '../models/User.js';

/**
 * Calculate total expenses for the current month
 */
export async function getCurrentMonthExpenses(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const result = await Finance.aggregate([
    {
      $match: {
        userId: userId,
        type: 'expense',
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      }
    },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: '$amount' }
      }
    }
  ]);

  return result.length > 0 ? result[0].totalExpenses : 0;
}

/**
 * Calculate total expenses for the current month by category
 */
export async function getCurrentMonthCategoryExpenses(userId, category) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const result = await Finance.aggregate([
    {
      $match: {
        userId: userId,
        type: "expense",
        category: category,
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      }
    },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: "$amount" }
      }
    }
  ]);

  return result.length > 0 ? result[0].totalExpenses : 0;
}

/**
 * Check if user has exceeded or is approaching their expense limit
 */
export async function checkExpenseLimit(userId) {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.expenseLimit?.enabled || !user.expenseLimit?.monthlyLimit) {
      return {
        hasLimit: false,
        withinLimit: true
      };
    }

    const totalExpenses = await getCurrentMonthExpenses(userId);
    const limit = user.expenseLimit.monthlyLimit;
    const threshold = user.expenseLimit.alertThreshold || 80;
    const percentageUsed = (totalExpenses / limit) * 100;
    const thresholdAmount = (limit * threshold) / 100;

    const status = {
      hasLimit: true,
      enabled: user.expenseLimit.enabled,
      limit: limit,
      totalExpenses: totalExpenses,
      remaining: Math.max(0, limit - totalExpenses),
      percentageUsed: Math.round(percentageUsed * 10) / 10,
      threshold: threshold,
      thresholdAmount: thresholdAmount,
      withinLimit: totalExpenses <= limit,
      approachingLimit: totalExpenses >= thresholdAmount && totalExpenses <= limit,
      exceededLimit: totalExpenses > limit,
      exceededBy: totalExpenses > limit ? totalExpenses - limit : 0
    };

    // Determine alert level
    if (status.exceededLimit) {
      status.alertLevel = 'danger';
      status.alertMessage = `You've exceeded your monthly limit by ₹${status.exceededBy.toFixed(2)}!`;
    } else if (status.approachingLimit) {
      status.alertLevel = 'warning';
      status.alertMessage = `You've used ${status.percentageUsed}% of your monthly limit. ₹${status.remaining.toFixed(2)} remaining.`;
    } else {
      status.alertLevel = 'success';
      status.alertMessage = `You're within your budget. ₹${status.remaining.toFixed(2)} remaining.`;
    }

    return status;
  } catch (error) {
    console.error('Error checking expense limit:', error);
    return {
      hasLimit: false,
      withinLimit: true,
      error: error.message
    };
  }
}

/**
 * Check if adding a new expense would exceed the limit
 */
export async function wouldExceedLimit(userId, newExpenseAmount) {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.expenseLimit?.enabled || !user.expenseLimit?.monthlyLimit) {
      return {
        hasLimit: false,
        wouldExceed: false
      };
    }

    const totalExpenses = await getCurrentMonthExpenses(userId);
    const limit = user.expenseLimit.monthlyLimit;
    const projectedTotal = totalExpenses + newExpenseAmount;

    return {
      hasLimit: true,
      currentExpenses: totalExpenses,
      newExpenseAmount: newExpenseAmount,
      projectedTotal: projectedTotal,
      limit: limit,
      wouldExceed: projectedTotal > limit,
      exceededBy: projectedTotal > limit ? projectedTotal - limit : 0,
      remaining: Math.max(0, limit - projectedTotal)
    };
  } catch (error) {
    console.error('Error checking if would exceed limit:', error);
    return {
      hasLimit: false,
      wouldExceed: false,
      error: error.message
    };
  }
}

/**
 * Check category-level budget status
 */
export async function checkCategoryBudgetStatus(userId, category) {
  try {
    const user = await User.findById(userId);

    if (!user || !Array.isArray(user.categoryBudgets)) {
      return { hasBudget: false, category };
    }

    const budget = user.categoryBudgets.find((b) => b.category === category);

    if (!budget || !budget.enabled || !budget.monthlyLimit) {
      return { hasBudget: false, category };
    }

    const totalExpenses = await getCurrentMonthCategoryExpenses(userId, category);
    const limit = budget.monthlyLimit;
    const threshold = budget.alertThreshold || 80;
    const percentageUsed = (totalExpenses / limit) * 100;
    const thresholdAmount = (limit * threshold) / 100;

    const status = {
      hasBudget: true,
      category,
      enabled: budget.enabled,
      limit,
      totalExpenses,
      remaining: Math.max(0, limit - totalExpenses),
      percentageUsed: Math.round(percentageUsed * 10) / 10,
      threshold,
      thresholdAmount,
      withinLimit: totalExpenses <= limit,
      approachingLimit: totalExpenses >= thresholdAmount && totalExpenses <= limit,
      exceededLimit: totalExpenses > limit,
      exceededBy: totalExpenses > limit ? totalExpenses - limit : 0,
      lastAlertDate: budget.lastAlertDate || null
    };

    if (status.exceededLimit) {
      status.alertLevel = "danger";
      status.alertMessage = `You've exceeded your ${category} budget by ₹${status.exceededBy.toFixed(2)}!`;
    } else if (status.approachingLimit) {
      status.alertLevel = "warning";
      status.alertMessage = `You're close to your ${category} budget (${status.percentageUsed}% used). ₹${status.remaining.toFixed(2)} remaining.`;
    } else {
      status.alertLevel = "success";
      status.alertMessage = `You're within your ${category} budget. ₹${status.remaining.toFixed(2)} remaining.`;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastAlert = status.lastAlertDate ? new Date(status.lastAlertDate) : null;
    const shouldAlert =
      (status.alertLevel === "danger" || status.alertLevel === "warning") &&
      (!lastAlert || lastAlert < today);

    return { ...status, shouldAlert };
  } catch (error) {
    console.error("Error checking category budget:", error);
    return { hasBudget: false, category, error: error.message };
  }
}

/**
 * Check all category budgets for a user
 */
export async function checkAllCategoryBudgets(userId) {
  try {
    const user = await User.findById(userId).select("categoryBudgets");
    if (!user || !Array.isArray(user.categoryBudgets)) {
      return [];
    }

    const results = [];
    for (const budget of user.categoryBudgets) {
      const status = await checkCategoryBudgetStatus(userId, budget.category);
      results.push(status);
    }

    return results;
  } catch (error) {
    console.error("Error checking all category budgets:", error);
    return [];
  }
}

/**
 * Check if adding a new expense would exceed a category budget
 */
export async function wouldExceedCategoryBudget(userId, category, newExpenseAmount) {
  try {
    const user = await User.findById(userId);

    if (!user || !Array.isArray(user.categoryBudgets)) {
      return { hasBudget: false, category, wouldExceed: false };
    }

    const budget = user.categoryBudgets.find((b) => b.category === category);

    if (!budget || !budget.enabled || !budget.monthlyLimit) {
      return { hasBudget: false, category, wouldExceed: false };
    }

    const totalExpenses = await getCurrentMonthCategoryExpenses(userId, category);
    const limit = budget.monthlyLimit;
    const projectedTotal = totalExpenses + newExpenseAmount;

    return {
      hasBudget: true,
      category,
      currentExpenses: totalExpenses,
      newExpenseAmount,
      projectedTotal,
      limit,
      wouldExceed: projectedTotal > limit,
      exceededBy: projectedTotal > limit ? projectedTotal - limit : 0,
      remaining: Math.max(0, limit - projectedTotal)
    };
  } catch (error) {
    console.error("Error checking if would exceed category budget:", error);
    return { hasBudget: false, category, wouldExceed: false, error: error.message };
  }
}
