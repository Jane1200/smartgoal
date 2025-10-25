/**
 * Goal Prioritization Utility
 * Helps users focus on critical financial goals before discretionary ones
 */

// Goal categories with their default priorities
export const GOAL_CATEGORIES = {
  emergency_fund: {
    label: "Emergency Fund",
    priority: 1, // Critical
    icon: "🛡️",
    description: "Build a safety net for unexpected expenses",
    color: "danger",
    isFoundational: true
  },
  debt_repayment: {
    label: "Debt Repayment",
    priority: 2, // High
    icon: "💳",
    description: "Pay off loans and credit card debt",
    color: "warning",
    isFoundational: true
  },
  essential_purchase: {
    label: "Essential Purchase",
    priority: 3, // Medium
    icon: "🏠",
    description: "Necessary items like home repairs, medical needs",
    color: "info",
    isFoundational: false
  },
  education: {
    label: "Education",
    priority: 3, // Medium
    icon: "📚",
    description: "Invest in skills and knowledge",
    color: "primary",
    isFoundational: false
  },
  investment: {
    label: "Investment",
    priority: 3, // Medium
    icon: "📈",
    description: "Long-term wealth building",
    color: "success",
    isFoundational: false
  },
  discretionary: {
    label: "Discretionary",
    priority: 4, // Low
    icon: "🎯",
    description: "Vacation, gadgets, entertainment",
    color: "secondary",
    isFoundational: false
  },
  other: {
    label: "Other",
    priority: 5, // Very Low
    icon: "📌",
    description: "Miscellaneous goals",
    color: "secondary",
    isFoundational: false
  }
};

// Priority levels
export const PRIORITY_LEVELS = {
  1: { label: "Critical", color: "danger", badge: "🔴" },
  2: { label: "High", color: "warning", badge: "🟠" },
  3: { label: "Medium", color: "info", badge: "🟡" },
  4: { label: "Low", color: "secondary", badge: "⚪" },
  5: { label: "Very Low", color: "secondary", badge: "⚫" }
};

/**
 * Calculate automatic priority based on category
 */
export function calculateAutoPriority(category) {
  return GOAL_CATEGORIES[category]?.priority || 3;
}

/**
 * Sort goals by priority (critical first)
 */
export function sortGoalsByPriority(goals) {
  return [...goals].sort((a, b) => {
    // First by priority (lower number = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Then by status (in_progress before planned)
    const statusOrder = { in_progress: 1, planned: 2, completed: 3, archived: 4 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    // Finally by due date (earlier first)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    return 0;
  });
}

/**
 * Get priority goals (critical and high priority, not completed/archived)
 */
export function getPriorityGoals(goals) {
  return goals.filter(g => 
    g.priority <= 2 && 
    g.status !== 'completed' && 
    g.status !== 'archived'
  );
}

/**
 * Get foundational goals (emergency fund, debt repayment)
 */
export function getFoundationalGoals(goals) {
  return goals.filter(g => 
    GOAL_CATEGORIES[g.category]?.isFoundational &&
    g.status !== 'completed' && 
    g.status !== 'archived'
  );
}

/**
 * Check if user has emergency fund goal
 */
export function hasEmergencyFund(goals) {
  return goals.some(g => 
    g.category === 'emergency_fund' && 
    g.status !== 'archived'
  );
}

/**
 * Calculate recommended emergency fund amount (3-6 months of expenses)
 */
export function calculateEmergencyFundTarget(monthlyExpense) {
  // Recommend 3 months for low income, 6 months for higher income
  const months = monthlyExpense < 20000 ? 3 : 6;
  return Math.round(monthlyExpense * months);
}

/**
 * Check if user should be warned about low-priority goals
 */
export function shouldWarnAboutPriority(goals, currentGoal) {
  // If creating/editing a low-priority goal
  if (currentGoal.priority >= 4) {
    // Check if there are incomplete high-priority goals
    const incompleteHighPriority = goals.filter(g => 
      g.priority <= 2 && 
      g.status !== 'completed' && 
      g.status !== 'archived' &&
      g._id !== currentGoal._id
    );
    
    if (incompleteHighPriority.length > 0) {
      return {
        shouldWarn: true,
        message: `You have ${incompleteHighPriority.length} critical/high priority goal(s) that need attention first.`,
        goals: incompleteHighPriority
      };
    }
  }
  return { shouldWarn: false };
}

/**
 * Calculate minimum allocation percentage for high-priority goals
 */
export function calculateMinimumAllocation(goals, monthlySavings) {
  const priorityGoals = getPriorityGoals(goals);
  
  if (priorityGoals.length === 0) {
    return { minPercentage: 0, minAmount: 0, goals: [] };
  }
  
  // Require at least 60% of savings to go to priority goals
  const minPercentage = 60;
  const minAmount = Math.round((monthlySavings * minPercentage) / 100);
  
  return {
    minPercentage,
    minAmount,
    goals: priorityGoals
  };
}

/**
 * Get goal category info
 */
export function getCategoryInfo(category) {
  return GOAL_CATEGORIES[category] || GOAL_CATEGORIES.other;
}

/**
 * Get priority level info
 */
export function getPriorityInfo(priority) {
  return PRIORITY_LEVELS[priority] || PRIORITY_LEVELS[3];
}

/**
 * Format goal for display with priority info
 */
export function formatGoalWithPriority(goal) {
  const categoryInfo = getCategoryInfo(goal.category);
  const priorityInfo = getPriorityInfo(goal.priority);
  
  return {
    ...goal,
    categoryInfo,
    priorityInfo,
    isHighPriority: goal.priority <= 2,
    isFoundational: categoryInfo.isFoundational
  };
}