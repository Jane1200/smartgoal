/**
 * Goal Achievement Probability Prediction
 * Uses financial transaction history to predict goal achievement likelihood
 */

/**
 * Calculate goal achievement probability and estimated completion date
 * @param {Object} goal - Goal object with target amount, current amount, due date
 * @param {Array} financeHistory - Array of finance records (income/expense transactions)
 * @returns {Object} - Prediction results with probability, estimated date, insights
 */
export function predictGoalAchievement(goal, financeHistory) {
  try {
    // Extract financial metrics
    const metrics = calculateFinancialMetrics(financeHistory);
    
    // Calculate goal-specific factors
    const goalFactors = calculateGoalFactors(goal);
    
    // Predict achievement probability
    const probability = calculateAchievementProbability(goal, metrics, goalFactors);
    
    // Estimate completion date
    const estimatedDate = estimateCompletionDate(goal, metrics);
    
    // Generate insights and recommendations
    const insights = generateInsights(goal, metrics, probability, estimatedDate);
    
    return {
      probability: Math.round(probability * 100) / 100, // Round to 2 decimals
      probabilityPercentage: Math.round(probability),
      estimatedCompletionDate: estimatedDate,
      daysToCompletion: estimatedDate ? Math.ceil((new Date(estimatedDate) - new Date()) / (1000 * 60 * 60 * 24)) : null,
      riskLevel: getRiskLevel(probability),
      insights,
      metrics: {
        monthlySavingsRate: Math.round(metrics.avgMonthlySavings),
        savingsTrend: metrics.savingsTrend,
        consistencyScore: Math.round(metrics.consistencyScore),
        requiredMonthlySavings: Math.round(goalFactors.requiredMonthlySavings)
      },
      recommendations: generateRecommendations(goal, metrics, probability)
    };
  } catch (error) {
    console.error("Goal prediction error:", error);
    return {
      probability: 50,
      probabilityPercentage: 50,
      estimatedCompletionDate: null,
      riskLevel: "unknown",
      insights: ["Unable to calculate prediction. Need more financial data."],
      metrics: {},
      recommendations: []
    };
  }
}

/**
 * Calculate financial metrics from transaction history
 */
function calculateFinancialMetrics(financeHistory) {
  if (!financeHistory || financeHistory.length === 0) {
    return {
      avgMonthlySavings: 0,
      savingsTrend: 0,
      consistencyScore: 0,
      totalIncome: 0,
      totalExpenses: 0,
      monthlyData: []
    };
  }

  // Group transactions by month
  const monthlyData = {};
  
  financeHistory.forEach(record => {
    const date = new Date(record.date || record.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expenses: 0, savings: 0 };
    }
    
    if (record.type === 'income') {
      monthlyData[monthKey].income += record.amount;
    } else if (record.type === 'expense') {
      monthlyData[monthKey].expenses += record.amount;
    }
  });

  // Calculate savings for each month
  const months = Object.keys(monthlyData).sort();
  months.forEach(month => {
    monthlyData[month].savings = monthlyData[month].income - monthlyData[month].expenses;
  });

  // Calculate average monthly savings (last 6 months or all available)
  const recentMonths = months.slice(-6);
  const avgMonthlySavings = recentMonths.reduce((sum, month) => 
    sum + monthlyData[month].savings, 0) / recentMonths.length;

  // Calculate savings trend (linear regression)
  const savingsTrend = calculateTrend(recentMonths.map(m => monthlyData[m].savings));

  // Calculate consistency score (0-100)
  const consistencyScore = calculateConsistency(recentMonths.map(m => monthlyData[m].savings));

  // Calculate totals
  const totalIncome = financeHistory
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);
  
  const totalExpenses = financeHistory
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);

  return {
    avgMonthlySavings,
    savingsTrend,
    consistencyScore,
    totalIncome,
    totalExpenses,
    monthlyData: recentMonths.map(m => ({
      month: m,
      ...monthlyData[m]
    }))
  };
}

/**
 * Calculate goal-specific factors
 */
function calculateGoalFactors(goal) {
  const remainingAmount = goal.targetAmount - (goal.currentAmount || 0);
  const progressPercentage = ((goal.currentAmount || 0) / goal.targetAmount) * 100;
  
  // Calculate months until due date
  const now = new Date();
  const dueDate = new Date(goal.dueDate);
  const monthsRemaining = Math.max(1, (dueDate - now) / (1000 * 60 * 60 * 24 * 30));
  
  // Required monthly savings to achieve goal
  const requiredMonthlySavings = remainingAmount / monthsRemaining;
  
  // Priority weight (high priority = higher weight)
  const priorityWeight = {
    'critical': 1.2,
    'high': 1.1,
    'medium': 1.0,
    'low': 0.9
  }[goal.priority] || 1.0;

  // Category weight (emergency fund = higher weight)
  const categoryWeight = {
    'emergency_fund': 1.2,
    'debt_repayment': 1.15,
    'retirement': 1.1,
    'education': 1.05,
    'home': 1.05,
    'vehicle': 1.0,
    'vacation': 0.95,
    'other': 1.0
  }[goal.category] || 1.0;

  return {
    remainingAmount,
    progressPercentage,
    monthsRemaining,
    requiredMonthlySavings,
    priorityWeight,
    categoryWeight
  };
}

/**
 * Calculate achievement probability using weighted factors
 */
function calculateAchievementProbability(goal, metrics, goalFactors) {
  let probability = 50; // Base probability

  // Factor 1: Current progress (0-30 points)
  const progressScore = Math.min(30, goalFactors.progressPercentage * 0.3);
  probability += progressScore;

  // Factor 2: Savings capacity (0-25 points)
  if (metrics.avgMonthlySavings > 0) {
    const savingsRatio = metrics.avgMonthlySavings / goalFactors.requiredMonthlySavings;
    const savingsScore = Math.min(25, savingsRatio * 25);
    probability += savingsScore;
  } else {
    probability -= 20; // Negative savings
  }

  // Factor 3: Savings trend (0-15 points)
  if (metrics.savingsTrend > 0) {
    probability += Math.min(15, metrics.savingsTrend * 10);
  } else if (metrics.savingsTrend < 0) {
    probability += Math.max(-15, metrics.savingsTrend * 10);
  }

  // Factor 4: Consistency (0-15 points)
  probability += (metrics.consistencyScore / 100) * 15;

  // Factor 5: Time remaining (0-10 points)
  if (goalFactors.monthsRemaining > 12) {
    probability += 10; // More time = higher probability
  } else if (goalFactors.monthsRemaining < 3) {
    probability -= 10; // Less time = lower probability
  }

  // Factor 6: Priority and category weights (-5 to +5 points)
  const weightBonus = ((goalFactors.priorityWeight + goalFactors.categoryWeight) / 2 - 1) * 10;
  probability += weightBonus;

  // Ensure probability is between 0 and 100
  return Math.max(0, Math.min(100, probability));
}

/**
 * Estimate completion date based on current savings rate
 */
function estimateCompletionDate(goal, metrics) {
  if (metrics.avgMonthlySavings <= 0) {
    return null; // Cannot estimate with negative/zero savings
  }

  const remainingAmount = goal.targetAmount - (goal.currentAmount || 0);
  
  if (remainingAmount <= 0) {
    return new Date(); // Already achieved
  }

  // Calculate months needed at current savings rate
  const monthsNeeded = remainingAmount / metrics.avgMonthlySavings;
  
  // Add trend adjustment (if savings are increasing, reduce time; if decreasing, increase time)
  const trendAdjustment = metrics.savingsTrend > 0 ? -0.1 : metrics.savingsTrend < 0 ? 0.1 : 0;
  const adjustedMonths = monthsNeeded * (1 + trendAdjustment);
  
  // Calculate estimated date
  const estimatedDate = new Date();
  estimatedDate.setMonth(estimatedDate.getMonth() + Math.ceil(adjustedMonths));
  
  return estimatedDate.toISOString();
}

/**
 * Calculate trend using simple linear regression
 */
function calculateTrend(values) {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, val) => sum + val, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  
  // Normalize slope to -1 to 1 range
  const avgValue = Math.abs(yMean) || 1;
  return Math.max(-1, Math.min(1, slope / avgValue));
}

/**
 * Calculate consistency score (0-100)
 */
function calculateConsistency(values) {
  if (values.length < 2) return 50;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Coefficient of variation (lower is more consistent)
  const cv = mean !== 0 ? stdDev / Math.abs(mean) : 1;
  
  // Convert to 0-100 score (lower CV = higher score)
  return Math.max(0, Math.min(100, 100 - (cv * 50)));
}

/**
 * Get risk level based on probability
 */
function getRiskLevel(probability) {
  if (probability >= 80) return "low";
  if (probability >= 60) return "medium";
  if (probability >= 40) return "high";
  return "critical";
}

/**
 * Generate insights based on prediction
 */
function generateInsights(goal, metrics, probability, estimatedDate) {
  const insights = [];
  
  // Progress insight
  const progressPct = ((goal.currentAmount || 0) / goal.targetAmount) * 100;
  if (progressPct >= 75) {
    insights.push(`🎯 Great progress! You're ${Math.round(progressPct)}% toward your goal.`);
  } else if (progressPct >= 50) {
    insights.push(`📊 You're ${Math.round(progressPct)}% of the way there. Keep going!`);
  } else if (progressPct >= 25) {
    insights.push(`🚀 You've made a start at ${Math.round(progressPct)}%. Stay consistent!`);
  } else {
    insights.push(`💪 Just getting started. Focus on building momentum!`);
  }
  
  // Savings rate insight
  if (metrics.avgMonthlySavings > 0) {
    insights.push(`💰 Your average monthly savings: ₹${Math.round(metrics.avgMonthlySavings).toLocaleString()}`);
  } else {
    insights.push(`⚠️ Your expenses exceed income. Focus on reducing expenses or increasing income.`);
  }
  
  // Trend insight
  if (metrics.savingsTrend > 0.1) {
    insights.push(`📈 Positive trend! Your savings are increasing over time.`);
  } else if (metrics.savingsTrend < -0.1) {
    insights.push(`📉 Warning: Your savings are decreasing. Review your budget.`);
  } else {
    insights.push(`➡️ Your savings rate is stable.`);
  }
  
  // Completion date insight
  if (estimatedDate) {
    const dueDate = new Date(goal.dueDate);
    const estimated = new Date(estimatedDate);
    
    if (estimated <= dueDate) {
      const monthsDiff = Math.round((dueDate - estimated) / (1000 * 60 * 60 * 24 * 30));
      if (monthsDiff > 0) {
        insights.push(`✅ On track! You may achieve this ${monthsDiff} month(s) early.`);
      } else {
        insights.push(`✅ On track to achieve by your target date!`);
      }
    } else {
      const monthsLate = Math.round((estimated - dueDate) / (1000 * 60 * 60 * 24 * 30));
      insights.push(`⏰ May take ${monthsLate} month(s) longer than planned. Consider increasing savings.`);
    }
  }
  
  return insights;
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(goal, metrics, probability) {
  const recommendations = [];
  const remainingAmount = goal.targetAmount - (goal.currentAmount || 0);
  const goalFactors = calculateGoalFactors(goal);
  
  if (probability < 60) {
    // High risk - need aggressive action
    recommendations.push({
      priority: "high",
      action: "Increase monthly savings",
      detail: `Save ₹${Math.round(goalFactors.requiredMonthlySavings).toLocaleString()}/month to stay on track`
    });
    
    if (metrics.avgMonthlySavings < goalFactors.requiredMonthlySavings) {
      const gap = goalFactors.requiredMonthlySavings - metrics.avgMonthlySavings;
      recommendations.push({
        priority: "high",
        action: "Close the savings gap",
        detail: `You need ₹${Math.round(gap).toLocaleString()} more per month`
      });
    }
    
    recommendations.push({
      priority: "medium",
      action: "Review and cut expenses",
      detail: "Identify non-essential expenses to reduce"
    });
  } else if (probability < 80) {
    // Medium risk - maintain and improve
    recommendations.push({
      priority: "medium",
      action: "Maintain current savings rate",
      detail: "You're on track, but stay consistent"
    });
    
    recommendations.push({
      priority: "low",
      action: "Look for income opportunities",
      detail: "Extra income can help achieve goal faster"
    });
  } else {
    // Low risk - optimize
    recommendations.push({
      priority: "low",
      action: "Consider increasing goal target",
      detail: "You're ahead of schedule!"
    });
    
    recommendations.push({
      priority: "low",
      action: "Explore investment options",
      detail: "Grow your savings faster with investments"
    });
  }
  
  // Consistency recommendation
  if (metrics.consistencyScore < 60) {
    recommendations.push({
      priority: "medium",
      action: "Improve savings consistency",
      detail: "Set up automatic transfers to savings"
    });
  }
  
  return recommendations;
}

/**
 * Batch predict for multiple goals
 */
export function predictMultipleGoals(goals, financeHistory) {
  return goals.map(goal => ({
    goalId: goal._id,
    goalTitle: goal.title,
    prediction: predictGoalAchievement(goal, financeHistory)
  }));
}
