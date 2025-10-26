import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error"],
      default: "info"
    },
    category: {
      type: String,
      enum: [
        "savings", 
        "purchase", 
        "goal", 
        "payment", 
        "marketplace",
        "finance",
        "general"
      ],
      default: "general"
    },
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date,
      default: null
    },
    actionUrl: {
      type: String,
      default: null
    },
    actionLabel: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for better performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

// Mark notification as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Get unread notifications count
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

// Get recent notifications
notificationSchema.statics.getRecentNotifications = function(
  userId, 
  limit = 20,
  includeRead = true
) {
  const query = { userId };
  if (!includeRead) {
    query.isRead = false;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Create insufficient savings notification
notificationSchema.statics.createInsufficientSavingsNotification = async function(
  userId,
  details
) {
  return this.create({
    userId,
    type: "error",
    category: "savings",
    title: "Insufficient Savings",
    message: details.message || "You don't have enough savings for this action",
    details: {
      requiredAmount: details.requiredAmount,
      availableSavings: details.availableSavings,
      shortfall: details.shortfall,
      action: details.action
    },
    actionUrl: "/finances",
    actionLabel: "View Finances"
  });
};

// Create purchase blocked notification
notificationSchema.statics.createPurchaseBlockedNotification = async function(
  userId,
  purchaseAmount,
  availableSavings
) {
  const shortfall = purchaseAmount - availableSavings;
  
  return this.create({
    userId,
    type: "warning",
    category: "purchase",
    title: "Purchase Blocked - Insufficient Savings",
    message: `Your purchase of ₹${purchaseAmount.toLocaleString()} requires ₹${shortfall.toLocaleString()} more in savings. Add income or reduce expenses to increase your savings.`,
    details: {
      purchaseAmount,
      availableSavings,
      shortfall
    },
    actionUrl: "/finances",
    actionLabel: "Manage Finances"
  });
};

// Create goal allocation blocked notification
notificationSchema.statics.createGoalAllocationBlockedNotification = async function(
  userId,
  allocationAmount,
  availableSavings
) {
  const shortfall = allocationAmount - availableSavings;
  
  return this.create({
    userId,
    type: "warning",
    category: "goal",
    title: "Goal Allocation Blocked",
    message: `Cannot allocate ₹${allocationAmount.toLocaleString()} to goals. You need ₹${shortfall.toLocaleString()} more in savings.`,
    details: {
      allocationAmount,
      availableSavings,
      shortfall
    },
    actionUrl: "/goals",
    actionLabel: "View Goals"
  });
};

// Create financial alert notifications
notificationSchema.statics.createFinanceAlerts = async function(userId, alertsData) {
  const notifications = [];
  
  for (const alert of alertsData) {
    const notificationType = alert.severity === 'danger' ? 'error' : 
                            alert.severity === 'warning' ? 'warning' : 'info';
    
    const notification = await this.create({
      userId,
      type: notificationType,
      category: "finance",
      title: alert.title,
      message: alert.message,
      details: alert.details || {},
      actionUrl: alert.actionUrl || "/finances",
      actionLabel: alert.actionLabel || "View Finances"
    });
    
    notifications.push(notification);
  }
  
  return notifications;
};

// Create 50/30/20 needs alert
notificationSchema.statics.createNeedsAlert = async function(userId, needsPercentage, monthlyIncome) {
  return this.create({
    userId,
    type: "warning",
    category: "finance",
    title: "50/30/20 Rule: Needs Alert",
    message: `Your essential expenses (${needsPercentage.toFixed(1)}%) exceed the recommended 50% of income. Consider ways to reduce housing, food, or transport costs.`,
    details: {
      needsPercentage,
      recommendedPercentage: 50,
      monthlyIncome
    },
    actionUrl: "/finances",
    actionLabel: "Review Finances"
  });
};

// Create 50/30/20 wants alert
notificationSchema.statics.createWantsAlert = async function(userId, wantsPercentage, excessAmount, monthlyIncome) {
  return this.create({
    userId,
    type: "warning",
    category: "finance",
    title: "50/30/20 Rule: Wants Alert",
    message: `Your discretionary spending (${wantsPercentage.toFixed(1)}%) exceeds the recommended 30%. You could save ₹${excessAmount.toLocaleString()} by reducing entertainment, shopping, or travel expenses.`,
    details: {
      wantsPercentage,
      recommendedPercentage: 30,
      excessAmount,
      monthlyIncome
    },
    actionUrl: "/finances",
    actionLabel: "Reduce Spending"
  });
};

// Create 50/30/20 savings alert
notificationSchema.statics.createSavingsAlert = async function(userId, savingsPercentage, savingsGap, monthlyIncome) {
  return this.create({
    userId,
    type: "error",
    category: "finance",
    title: "50/30/20 Rule: Savings Alert",
    message: `Your savings rate (${savingsPercentage.toFixed(1)}%) is below the recommended 20%. You need to save ₹${savingsGap.toLocaleString()} more to reach your target.`,
    details: {
      savingsPercentage,
      recommendedPercentage: 20,
      savingsGap,
      monthlyIncome
    },
    actionUrl: "/finances",
    actionLabel: "Increase Savings"
  });
};

// Create high spending category notification
notificationSchema.statics.createHighSpendingAlert = async function(userId, category, amount, percentage) {
  return this.create({
    userId,
    type: "info",
    category: "finance",
    title: "High Spending Category",
    message: `${category} accounts for ${percentage.toFixed(1)}% of your expenses (₹${amount.toLocaleString()}). Consider reviewing this category.`,
    details: {
      category,
      amount,
      percentage
    },
    actionUrl: "/finances",
    actionLabel: "View Details"
  });
};

// Create recent high expenses notification
notificationSchema.statics.createRecentHighExpensesAlert = async function(userId, count, totalAmount) {
  return this.create({
    userId,
    type: "info",
    category: "finance",
    title: "Recent High Expenses",
    message: `You've made ${count} expense(s) over ₹1,000 in the last week totaling ₹${totalAmount.toLocaleString()}. Monitor your spending pattern.`,
    details: {
      count,
      totalAmount,
      period: "last 7 days"
    },
    actionUrl: "/finances",
    actionLabel: "Review Expenses"
  });
};

// Create overspending alert
notificationSchema.statics.createOverspendingAlert = async function(userId, overspendAmount, income, expenses) {
  return this.create({
    userId,
    type: "error",
    category: "finance",
    title: "Monthly Overspending Alert",
    message: `You're spending ₹${overspendAmount.toLocaleString()} more than you earn this month. Review your expenses immediately.`,
    details: {
      overspendAmount,
      monthlyIncome: income,
      monthlyExpenses: expenses
    },
    actionUrl: "/finances",
    actionLabel: "Fix Budget"
  });
};

// Create emergency fund alert
notificationSchema.statics.createEmergencyFundAlert = async function(userId, monthlyExpense, targetAmount) {
  return this.create({
    userId,
    type: "warning",
    category: "goal",
    title: "Build Your Emergency Fund First!",
    message: `Financial experts recommend having 3-6 months of expenses saved for emergencies. Based on your monthly expenses of ₹${monthlyExpense.toLocaleString()}, we recommend an emergency fund of ₹${targetAmount.toLocaleString()}. This safety net protects you from unexpected job loss, medical emergencies, or urgent repairs.`,
    details: {
      monthlyExpense,
      targetAmount,
      monthsRecommended: 3
    },
    actionUrl: "/goals",
    actionLabel: "Create Emergency Fund Goal"
  });
};

// Create expired goal notification
notificationSchema.statics.createExpiredGoalAlert = async function(userId, goalId, goalTitle, dueDate, currentAmount, targetAmount) {
  return this.create({
    userId,
    type: "warning",
    category: "goal",
    title: "Goal Due Date Expired",
    message: `Your goal "${goalTitle}" was due on ${new Date(dueDate).toLocaleDateString()}. You've saved ₹${currentAmount.toLocaleString()} out of ₹${targetAmount.toLocaleString()}. Would you like to extend the due date or delete this goal?`,
    details: {
      goalId: goalId.toString(),
      goalTitle,
      dueDate,
      currentAmount,
      targetAmount,
      progressPercentage: ((currentAmount / targetAmount) * 100).toFixed(1),
      action: 'extend_or_delete' // Special action type
    },
    actionUrl: `/goals?expired=${goalId}`,
    actionLabel: "Manage Goal"
  });
};

export default mongoose.model("Notification", notificationSchema);


