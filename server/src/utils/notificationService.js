import Notification from "../models/Notification.js";
import Finance from "../models/Finance.js";
import Goal from "../models/Goal.js";
import User from "../models/User.js";

/**
 * Smart Notification Service
 * Monitors budgets, payments, and goals to send timely alerts
 */

/**
 * Check for budget breaches and send alerts
 */
export async function checkBudgetBreaches(userId) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get current month's income and expenses
    const finances = await Finance.find({
      userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const monthlyIncome = finances
      .filter((f) => f.type === "income")
      .reduce((sum, f) => sum + f.amount, 0);

    const monthlyExpenses = finances
      .filter((f) => f.type === "expense")
      .reduce((sum, f) => sum + f.amount, 0);

    const notifications = [];

    // 1. Check for overspending (expenses > income)
    if (monthlyExpenses > monthlyIncome) {
      const overspendAmount = monthlyExpenses - monthlyIncome;
      const notification = await Notification.createOverspendingAlert(
        userId,
        overspendAmount,
        monthlyIncome,
        monthlyExpenses
      );
      notifications.push(notification);
    }

    // 2. Check 50/30/20 rule compliance
    if (monthlyIncome > 0) {
      const expensesByCategory = {};
      finances
        .filter((f) => f.type === "expense")
        .forEach((f) => {
          expensesByCategory[f.category] = (expensesByCategory[f.category] || 0) + f.amount;
        });

      // Calculate needs, wants, savings
      const needs = [
        "Housing",
        "Utilities",
        "Food & Groceries",
        "Transportation",
        "Healthcare",
        "Insurance",
      ];
      const wants = [
        "Entertainment",
        "Shopping",
        "Travel & Vacation",
        "Dining Out",
        "Hobbies",
      ];

      const needsAmount = Object.entries(expensesByCategory)
        .filter(([cat]) => needs.includes(cat))
        .reduce((sum, [, amt]) => sum + amt, 0);

      const wantsAmount = Object.entries(expensesByCategory)
        .filter(([cat]) => wants.includes(cat))
        .reduce((sum, [, amt]) => sum + amt, 0);

      const savingsAmount = monthlyIncome - monthlyExpenses;

      const needsPercentage = (needsAmount / monthlyIncome) * 100;
      const wantsPercentage = (wantsAmount / monthlyIncome) * 100;
      const savingsPercentage = (savingsAmount / monthlyIncome) * 100;

      // Alert: Needs > 50%
      if (needsPercentage > 50) {
        const notification = await Notification.createNeedsAlert(
          userId,
          needsPercentage,
          monthlyIncome
        );
        notifications.push(notification);
      }

      // Alert: Wants > 30%
      if (wantsPercentage > 30) {
        const excessAmount = wantsAmount - monthlyIncome * 0.3;
        const notification = await Notification.createWantsAlert(
          userId,
          wantsPercentage,
          excessAmount,
          monthlyIncome
        );
        notifications.push(notification);
      }

      // Alert: Savings < 20%
      if (savingsPercentage < 20) {
        const savingsGap = monthlyIncome * 0.2 - savingsAmount;
        const notification = await Notification.createSavingsAlert(
          userId,
          savingsPercentage,
          savingsGap,
          monthlyIncome
        );
        notifications.push(notification);
      }
    }

    // 3. Check for high spending categories
    const expensesByCategory = {};
    finances
      .filter((f) => f.type === "expense")
      .forEach((f) => {
        expensesByCategory[f.category] = (expensesByCategory[f.category] || 0) + f.amount;
      });

    const totalExpenses = Object.values(expensesByCategory).reduce((sum, amt) => sum + amt, 0);

    for (const [category, amount] of Object.entries(expensesByCategory)) {
      const percentage = (amount / totalExpenses) * 100;
      // Alert if category is > 25% of total expenses
      if (percentage > 25) {
        const notification = await Notification.createHighSpendingAlert(
          userId,
          category,
          amount,
          percentage
        );
        notifications.push(notification);
      }
    }

    // 4. Check for recent high expenses (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentHighExpenses = await Finance.find({
      userId,
      type: "expense",
      amount: { $gte: 1000 },
      date: { $gte: sevenDaysAgo },
    });

    if (recentHighExpenses.length > 0) {
      const totalAmount = recentHighExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const notification = await Notification.createRecentHighExpensesAlert(
        userId,
        recentHighExpenses.length,
        totalAmount
      );
      notifications.push(notification);
    }

    return notifications;
  } catch (error) {
    console.error("Error checking budget breaches:", error);
    throw error;
  }
}

/**
 * Check for upcoming payment reminders (goals nearing due date)
 */
export async function checkPaymentReminders(userId) {
  try {
    const now = new Date();
    const notifications = [];

    // Get all active goals
    const goals = await Goal.find({
      userId,
      status: { $in: ["active", "in_progress"] },
    });

    for (const goal of goals) {
      if (!goal.dueDate) continue;

      const dueDate = new Date(goal.dueDate);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      // Alert 30 days before due date
      if (daysUntilDue === 30) {
        const notification = await Notification.create({
          userId,
          type: "info",
          category: "goal",
          title: "Goal Due in 30 Days",
          message: `Your goal "${goal.title}" is due in 30 days (${dueDate.toLocaleDateString()}). Current progress: ₹${goal.currentAmount.toLocaleString()} / ₹${goal.targetAmount.toLocaleString()} (${((goal.currentAmount / goal.targetAmount) * 100).toFixed(1)}%)`,
          details: {
            goalId: goal._id.toString(),
            goalTitle: goal.title,
            dueDate: goal.dueDate,
            daysRemaining: daysUntilDue,
            currentAmount: goal.currentAmount,
            targetAmount: goal.targetAmount,
            remainingAmount: goal.targetAmount - goal.currentAmount,
          },
          actionUrl: `/goals?highlight=${goal._id}`,
          actionLabel: "View Goal",
        });
        notifications.push(notification);
      }

      // Alert 7 days before due date
      if (daysUntilDue === 7) {
        const notification = await Notification.create({
          userId,
          type: "warning",
          category: "goal",
          title: "Goal Due in 1 Week",
          message: `Your goal "${goal.title}" is due in 7 days! You still need ₹${(goal.targetAmount - goal.currentAmount).toLocaleString()} to reach your target of ₹${goal.targetAmount.toLocaleString()}.`,
          details: {
            goalId: goal._id.toString(),
            goalTitle: goal.title,
            dueDate: goal.dueDate,
            daysRemaining: daysUntilDue,
            currentAmount: goal.currentAmount,
            targetAmount: goal.targetAmount,
            remainingAmount: goal.targetAmount - goal.currentAmount,
          },
          actionUrl: `/goals?highlight=${goal._id}`,
          actionLabel: "Allocate Now",
        });
        notifications.push(notification);
      }

      // Alert 1 day before due date
      if (daysUntilDue === 1) {
        const notification = await Notification.create({
          userId,
          type: "error",
          category: "goal",
          title: "Goal Due Tomorrow!",
          message: `Your goal "${goal.title}" is due tomorrow! Current progress: ₹${goal.currentAmount.toLocaleString()} / ₹${goal.targetAmount.toLocaleString()}`,
          details: {
            goalId: goal._id.toString(),
            goalTitle: goal.title,
            dueDate: goal.dueDate,
            daysRemaining: daysUntilDue,
            currentAmount: goal.currentAmount,
            targetAmount: goal.targetAmount,
            remainingAmount: goal.targetAmount - goal.currentAmount,
          },
          actionUrl: `/goals?highlight=${goal._id}`,
          actionLabel: "Take Action",
        });
        notifications.push(notification);
      }

      // Alert for expired goals
      if (daysUntilDue < 0 && goal.currentAmount < goal.targetAmount) {
        const notification = await Notification.createExpiredGoalAlert(
          userId,
          goal._id,
          goal.title,
          goal.dueDate,
          goal.currentAmount,
          goal.targetAmount
        );
        notifications.push(notification);
      }
    }

    return notifications;
  } catch (error) {
    console.error("Error checking payment reminders:", error);
    throw error;
  }
}

/**
 * Check for goal milestones and send encouragement
 */
export async function checkGoalMilestones(userId) {
  try {
    const notifications = [];

    // Get all active goals
    const goals = await Goal.find({
      userId,
      status: { $in: ["active", "in_progress"] },
    });

    for (const goal of goals) {
      const progressPercentage = (goal.currentAmount / goal.targetAmount) * 100;

      // Milestone notifications at 25%, 50%, 75%, 90%
      const milestones = [25, 50, 75, 90];

      for (const milestone of milestones) {
        // Check if just crossed this milestone (within 5% buffer)
        if (
          progressPercentage >= milestone &&
          progressPercentage < milestone + 5
        ) {
          const notification = await Notification.create({
            userId,
            type: "success",
            category: "goal",
            title: `${milestone}% Complete! 🎉`,
            message: `Amazing progress on "${goal.title}"! You've saved ₹${goal.currentAmount.toLocaleString()} out of ₹${goal.targetAmount.toLocaleString()}. Keep going!`,
            details: {
              goalId: goal._id.toString(),
              goalTitle: goal.title,
              milestone,
              currentAmount: goal.currentAmount,
              targetAmount: goal.targetAmount,
              remainingAmount: goal.targetAmount - goal.currentAmount,
            },
            actionUrl: `/goals?highlight=${goal._id}`,
            actionLabel: "View Progress",
          });
          notifications.push(notification);
        }
      }

      // Check for goal completion
      if (goal.currentAmount >= goal.targetAmount && goal.status !== "completed") {
        const notification = await Notification.create({
          userId,
          type: "success",
          category: "goal",
          title: "Goal Achieved! 🎊",
          message: `Congratulations! You've reached your goal "${goal.title}" and saved ₹${goal.targetAmount.toLocaleString()}. Time to celebrate and set a new goal!`,
          details: {
            goalId: goal._id.toString(),
            goalTitle: goal.title,
            achievedAmount: goal.currentAmount,
            targetAmount: goal.targetAmount,
          },
          actionUrl: `/goals?completed=${goal._id}`,
          actionLabel: "Celebrate",
        });
        notifications.push(notification);

        // Update goal status to completed
        goal.status = "completed";
        await goal.save();
      }
    }

    return notifications;
  } catch (error) {
    console.error("Error checking goal milestones:", error);
    throw error;
  }
}

/**
 * Check for emergency fund recommendation
 */
export async function checkEmergencyFund(userId) {
  try {
    const notifications = [];

    // Check if user already has an emergency fund goal
    const emergencyGoal = await Goal.findOne({
      userId,
      category: "Emergency Fund",
      status: { $in: ["active", "in_progress", "completed"] },
    });

    if (!emergencyGoal) {
      // Calculate recommended emergency fund
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const monthlyExpenses = await Finance.aggregate([
        {
          $match: {
            userId: userId,
            type: "expense",
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      if (monthlyExpenses.length > 0 && monthlyExpenses[0].total > 0) {
        const monthlyExpense = monthlyExpenses[0].total;
        const targetAmount = monthlyExpense * 3; // 3 months of expenses

        const notification = await Notification.createEmergencyFundAlert(
          userId,
          monthlyExpense,
          targetAmount
        );
        notifications.push(notification);
      }
    }

    return notifications;
  } catch (error) {
    console.error("Error checking emergency fund:", error);
    throw error;
  }
}

/**
 * Run all notification checks for a user
 */
export async function runNotificationChecks(userId) {
  try {
    console.log(`🔔 Running notification checks for user ${userId}`);

    const allNotifications = [];

    // Run all checks
    const budgetNotifications = await checkBudgetBreaches(userId);
    const paymentNotifications = await checkPaymentReminders(userId);
    const milestoneNotifications = await checkGoalMilestones(userId);
    const emergencyNotifications = await checkEmergencyFund(userId);

    allNotifications.push(...budgetNotifications);
    allNotifications.push(...paymentNotifications);
    allNotifications.push(...milestoneNotifications);
    allNotifications.push(...emergencyNotifications);

    console.log(`✅ Created ${allNotifications.length} notifications for user ${userId}`);

    return allNotifications;
  } catch (error) {
    console.error("Error running notification checks:", error);
    throw error;
  }
}

/**
 * Run notification checks for all active users
 */
export async function runNotificationChecksForAllUsers() {
  try {
    console.log("🔔 Running notification checks for all users...");

    // Get all active users
    const users = await User.find({ isVerified: true }).select("_id");

    let totalNotifications = 0;

    for (const user of users) {
      try {
        const notifications = await runNotificationChecks(user._id);
        totalNotifications += notifications.length;
      } catch (error) {
        console.error(`Error checking notifications for user ${user._id}:`, error);
        // Continue with next user
      }
    }

    console.log(`✅ Notification checks complete. Created ${totalNotifications} notifications total.`);

    return totalNotifications;
  } catch (error) {
    console.error("Error running notification checks for all users:", error);
    throw error;
  }
}
