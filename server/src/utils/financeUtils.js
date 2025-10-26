import Finance from "../models/Finance.js";
import MarketplaceIncome from "../models/MarketplaceIncome.js";

/**
 * Calculate user's total savings (income - expenses)
 * Savings = Total Income - Total Expenses
 * 
 * @param {String} userId - User's MongoDB ID
 * @returns {Object} { totalIncome, totalExpenses, totalSavings, marketplaceIncome }
 */
export const calculateUserSavings = async (userId) => {
  try {
    // Get all income entries
    const incomeEntries = await Finance.find({ userId, type: "income" });
    const totalIncome = incomeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Get all expense entries
    const expenseEntries = await Finance.find({ userId, type: "expense" });
    const totalExpenses = expenseEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Calculate savings
    const totalSavings = Math.max(0, totalIncome - totalExpenses);

    // Get marketplace income breakdown
    const marketplaceIncomeEntries = await MarketplaceIncome.find({ 
      sellerId: userId, 
      status: "confirmed" 
    });
    const marketplaceIncome = marketplaceIncomeEntries.reduce(
      (sum, entry) => sum + (entry.amount || 0), 
      0
    );

    return {
      totalIncome,
      totalExpenses,
      totalSavings,
      marketplaceIncome,
      availableBalance: totalSavings // Same as totalSavings
    };
  } catch (error) {
    console.error("Error calculating user savings:", error);
    throw new Error("Failed to calculate savings");
  }
};

/**
 * Check if user has sufficient savings for a purchase/goal
 * 
 * @param {String} userId - User's MongoDB ID
 * @param {Number} requiredAmount - Amount needed
 * @returns {Object} { hasSufficient, availableSavings, shortfall }
 */
export const checkSufficientSavings = async (userId, requiredAmount) => {
  try {
    const { totalSavings } = await calculateUserSavings(userId);

    const hasSufficient = totalSavings >= requiredAmount;
    const shortfall = hasSufficient ? 0 : requiredAmount - totalSavings;

    return {
      hasSufficient,
      availableSavings: totalSavings,
      requiredAmount,
      shortfall
    };
  } catch (error) {
    console.error("Error checking sufficient savings:", error);
    throw new Error("Failed to check savings");
  }
};

/**
 * Get monthly savings breakdown
 * 
 * @param {String} userId - User's MongoDB ID
 * @param {Number} months - Number of months to look back
 * @returns {Array} Monthly savings data
 */
export const getMonthlySavingsBreakdown = async (userId, months = 6) => {
  try {
    const breakdown = [];
    const currentDate = new Date();

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(currentDate);
      targetDate.setMonth(targetDate.getMonth() - i);
      
      const month = targetDate.getMonth();
      const year = targetDate.getFullYear();
      
      // Get income for this month
      const monthIncome = await Finance.find({
        userId,
        type: "income",
        date: {
          $gte: new Date(year, month, 1),
          $lt: new Date(year, month + 1, 1)
        }
      });

      // Get expenses for this month
      const monthExpenses = await Finance.find({
        userId,
        type: "expense",
        date: {
          $gte: new Date(year, month, 1),
          $lt: new Date(year, month + 1, 1)
        }
      });

      const income = monthIncome.reduce((sum, e) => sum + e.amount, 0);
      const expenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const savings = Math.max(0, income - expenses);

      breakdown.push({
        month: month + 1,
        year,
        monthName: targetDate.toLocaleString('default', { month: 'long' }),
        income,
        expenses,
        savings,
        savingsRate: income > 0 ? (savings / income) * 100 : 0
      });
    }

    return breakdown.reverse(); // Oldest to newest
  } catch (error) {
    console.error("Error getting monthly savings breakdown:", error);
    throw new Error("Failed to get savings breakdown");
  }
};

/**
 * Calculate projected savings for EMI/installment purchases
 * 
 * @param {String} userId - User's MongoDB ID
 * @param {Number} installmentAmount - Monthly installment amount
 * @param {Number} numberOfMonths - Number of months
 * @returns {Object} Projected savings after each installment
 */
export const calculateProjectedSavingsWithEMI = async (
  userId, 
  installmentAmount, 
  numberOfMonths
) => {
  try {
    const { totalSavings } = await calculateUserSavings(userId);
    
    // Get average monthly income (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentIncome = await Finance.find({
      userId,
      type: "income",
      date: { $gte: threeMonthsAgo }
    });
    
    const avgMonthlyIncome = recentIncome.reduce((sum, e) => sum + e.amount, 0) / 3;

    // Get average monthly expenses (last 3 months)
    const recentExpenses = await Finance.find({
      userId,
      type: "expense",
      date: { $gte: threeMonthsAgo }
    });
    
    const avgMonthlyExpenses = recentExpenses.reduce((sum, e) => sum + e.amount, 0) / 3;
    const avgMonthlySavings = Math.max(0, avgMonthlyIncome - avgMonthlyExpenses);

    // Project future savings
    const projection = [];
    let currentSavings = totalSavings;

    for (let i = 1; i <= numberOfMonths; i++) {
      currentSavings = currentSavings + avgMonthlySavings - installmentAmount;
      projection.push({
        month: i,
        projectedSavings: Math.max(0, currentSavings),
        installmentPaid: installmentAmount,
        isAffordable: currentSavings >= 0
      });
    }

    return {
      currentSavings: totalSavings,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      avgMonthlySavings,
      installmentAmount,
      numberOfMonths,
      projection,
      isAffordable: projection.every(p => p.isAffordable),
      warning: projection.some(p => !p.isAffordable) 
        ? "Warning: You may not have sufficient savings in some months"
        : null
    };
  } catch (error) {
    console.error("Error calculating projected savings:", error);
    throw new Error("Failed to calculate projected savings");
  }
};

export default {
  calculateUserSavings,
  checkSufficientSavings,
  getMonthlySavingsBreakdown,
  calculateProjectedSavingsWithEMI
};


