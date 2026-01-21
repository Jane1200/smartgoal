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
    isFoundational: true,
    aiRecommended: true
  },
  essential_purchase: {
    label: "Essential Purchase",
    priority: 2, // High
    icon: "🏠",
    description: "Necessary items like home repairs, medical needs",
    color: "info",
    isFoundational: false,
    aiRecommended: true
  },
  education: {
    label: "Education",
    priority: 2, // High
    icon: "📚",
    description: "Invest in skills and knowledge",
    color: "primary",
    isFoundational: false,
    aiRecommended: true
  },
  investment: {
    label: "Investment",
    priority: 3, // Medium
    icon: "📈",
    description: "Long-term wealth building",
    color: "success",
    isFoundational: false,
    aiRecommended: true
  },
  // Custom category (NOT recommended by AI)
  custom: {
    label: "Custom Category",
    priority: 3, // Medium
    icon: "📌",
    description: "Create your own category",
    color: "secondary",
    isFoundational: false,
    allowCustom: true,
    aiRecommended: false
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
    g.status !== 'archived' &&
    g.status !== 'achieved'
  );
}

/**
 * Get foundational goals (emergency fund, debt repayment)
 */
export function getFoundationalGoals(goals) {
  return goals.filter(g => 
    GOAL_CATEGORIES[g.category]?.isFoundational &&
    g.status !== 'completed' && 
    g.status !== 'archived' &&
    g.status !== 'achieved'
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
  // If it's a predefined category, return it
  if (GOAL_CATEGORIES[category]) {
    return GOAL_CATEGORIES[category];
  }
  
  // Otherwise, it's a custom category
  return {
    label: category,
    priority: 3,
    icon: "📌",
    description: "Custom category",
    color: "secondary",
    isFoundational: false,
    aiRecommended: false
  };
}

/**
 * Get categories for custom goal creation (exclude AI-recommended ones)
 */
export function getCustomGoalCategories() {
  return Object.entries(GOAL_CATEGORIES)
    .filter(([_, info]) => !info.aiRecommended)
    .reduce((acc, [key, info]) => {
      acc[key] = info;
      return acc;
    }, {});
}

/**
 * Get AI-recommended categories
 */
export function getAIRecommendedCategories() {
  return Object.entries(GOAL_CATEGORIES)
    .filter(([_, info]) => info.aiRecommended)
    .reduce((acc, [key, info]) => {
      acc[key] = info;
      return acc;
    }, {});
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