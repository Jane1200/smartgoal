import cron from "node-cron";
import User from "../models/User.js";
import Finance from "../models/Finance.js";
import Goal from "../models/Goal.js";
import { sendMonthlyReportEmail } from "../utils/emailService.js";

/**
 * Monthly Financial Report Job
 * Runs on the 1st day of every month at 9:00 AM
 * Sends financial summary email to all users
 */
export function startMonthlyReportJob() {
  // Schedule: "0 9 1 * *" = At 09:00 on day-of-month 1
  // For testing: "*/5 * * * *" = Every 5 minutes
  const schedule = process.env.NODE_ENV === "production" 
    ? "0 9 1 * *"  // Production: 1st of month at 9 AM
    : "0 9 1 * *"; // Development: same schedule (or change for testing)

  cron.schedule(schedule, async () => {
    console.log("\n📊 Starting Monthly Financial Report Job...");
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);

    try {
      // Get all active users
      const users = await User.find({ 
        role: { $in: ["user", "student", "professional"] }
      });

      console.log(`👥 Found ${users.length} users to process`);

      // Get previous month's data
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const month = lastMonth.getMonth() + 1;
      const year = lastMonth.getFullYear();

      console.log(`📅 Generating reports for: ${month}/${year}`);

      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // Get user's financial summary for last month
          const financeSummary = await Finance.getUserFinanceSummary(user._id, {
            month,
            year,
          });

          let income = 0;
          let expense = 0;

          financeSummary.forEach((item) => {
            if (item._id === "income") {
              income = item.total;
            } else if (item._id === "expense") {
              expense = item.total;
            }
          });

          const savings = income - expense;
          const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;

          // Get top spending categories
          const expenses = await Finance.find({
            userId: user._id,
            type: "expense",
            date: {
              $gte: new Date(year, month - 1, 1),
              $lt: new Date(year, month, 1),
            },
          });

          const categoryTotals = {};
          expenses.forEach((exp) => {
            const cat = exp.category || "Uncategorized";
            categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
          });

          const topCategories = Object.entries(categoryTotals)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

          // Get goal progress for last month
          const goals = await Goal.find({
            userId: user._id,
            status: { $in: ["in_progress", "achieved", "completed"] },
          });

          const goalProgress = goals.map((goal) => {
            const progress = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1);
            return {
              name: goal.title,
              contributed: goal.currentAmount || 0,
              progress: parseFloat(progress),
            };
          });

          // Only send email if user had any financial activity
          if (income > 0 || expense > 0) {
            await sendMonthlyReportEmail(user, {
              month,
              year,
              income,
              expense,
              savings,
              savingsRate,
              topCategories,
              goalProgress,
            });

            successCount++;
            console.log(`  ✅ Sent report to ${user.email}`);
          } else {
            console.log(`  ⏭️  Skipped ${user.email} (no activity)`);
          }
        } catch (userError) {
          errorCount++;
          console.error(`  ❌ Failed for ${user.email}:`, userError.message);
        }
      }

      console.log(`\n📊 Monthly Report Job Complete:`);
      console.log(`  ✅ Success: ${successCount}`);
      console.log(`  ❌ Errors: ${errorCount}`);
      console.log(`  ⏭️  Skipped: ${users.length - successCount - errorCount}\n`);
    } catch (error) {
      console.error("❌ Monthly Report Job Failed:", error);
    }
  });

  console.log("✅ Monthly Financial Report Job scheduled");
  console.log(`📅 Schedule: ${schedule}`);
}

/**
 * Manual trigger for testing
 * Call this function to send reports immediately
 */
export async function triggerMonthlyReportManually(userId = null) {
  console.log("\n📊 Manually triggering Monthly Financial Report...");

  try {
    const query = userId ? { _id: userId } : { role: { $in: ["user", "student", "professional"] } };
    const users = await User.find(query);

    console.log(`👥 Processing ${users.length} user(s)`);

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = lastMonth.getMonth() + 1;
    const year = lastMonth.getFullYear();

    for (const user of users) {
      const financeSummary = await Finance.getUserFinanceSummary(user._id, {
        month,
        year,
      });

      let income = 0;
      let expense = 0;

      financeSummary.forEach((item) => {
        if (item._id === "income") {
          income = item.total;
        } else if (item._id === "expense") {
          expense = item.total;
        }
      });

      const savings = income - expense;
      const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;

      const expenses = await Finance.find({
        userId: user._id,
        type: "expense",
        date: {
          $gte: new Date(year, month - 1, 1),
          $lt: new Date(year, month, 1),
        },
      });

      const categoryTotals = {};
      expenses.forEach((exp) => {
        const cat = exp.category || "Uncategorized";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + exp.amount;
      });

      const topCategories = Object.entries(categoryTotals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const goals = await Goal.find({
        userId: user._id,
        status: { $in: ["in_progress", "achieved", "completed"] },
      });

      const goalProgress = goals.map((goal) => {
        const progress = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1);
        return {
          name: goal.title,
          contributed: goal.currentAmount || 0,
          progress: parseFloat(progress),
        };
      });

      await sendMonthlyReportEmail(user, {
        month,
        year,
        income,
        expense,
        savings,
        savingsRate,
        topCategories,
        goalProgress,
      });

      console.log(`✅ Sent report to ${user.email}`);
    }

    console.log("\n✅ Manual trigger complete\n");
    return { success: true, count: users.length };
  } catch (error) {
    console.error("❌ Manual trigger failed:", error);
    return { success: false, error: error.message };
  }
}

export default { startMonthlyReportJob, triggerMonthlyReportManually };
