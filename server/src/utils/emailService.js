/**
 * Email Service for SmartGoal
 * Handles sending automated emails for summaries and notifications
 */

import nodemailer from 'nodemailer';
import Goal from '../models/Goal.js';
import Finance from '../models/Finance.js';
import Marketplace from '../models/Marketplace.js';

// Email transporter configuration
const transporter = nodemailer.default ? nodemailer.default.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}) : nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send weekly financial health summary to user
 */
export async function sendWeeklyFinancialSummary(user) {
  try {
    const userId = user._id;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Fetch financial data for the past week
    const [goals, incomes, expenses, marketplaceItems] = await Promise.all([
      Goal.find({ userId, createdAt: { $gte: weekAgo } }),
      Finance.find({ userId, type: 'income', date: { $gte: weekAgo } }),
      Finance.find({ userId, type: 'expense', date: { $gte: weekAgo } }),
      Marketplace.find({ sellerId: userId, createdAt: { $gte: weekAgo } })
    ]);

    // Calculate totals
    const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netSavings = totalIncome - totalExpenses;

    // Get active goals summary
    const activeGoals = await Goal.find({ userId, status: 'active' });
    const totalGoalProgress = activeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    const totalGoalTarget = activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0);

    // Build email HTML
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .stat-card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .stat-title { font-size: 14px; color: #666; margin-bottom: 5px; }
          .stat-value { font-size: 28px; font-weight: bold; color: #667eea; }
          .positive { color: #10b981; }
          .negative { color: #ef4444; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Your Weekly Financial Summary</h1>
            <p>Week of ${weekAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}</p>
          </div>
          <div class="content">
            <div class="stat-card">
              <div class="stat-title">💰 Total Income (This Week)</div>
              <div class="stat-value positive">₹${totalIncome.toLocaleString('en-IN')}</div>
              <small>${incomes.length} transaction(s)</small>
            </div>

            <div class="stat-card">
              <div class="stat-title">💸 Total Expenses (This Week)</div>
              <div class="stat-value negative">₹${totalExpenses.toLocaleString('en-IN')}</div>
              <small>${expenses.length} transaction(s)</small>
            </div>

            <div class="stat-card">
              <div class="stat-title">📈 Net Savings</div>
              <div class="stat-value ${netSavings >= 0 ? 'positive' : 'negative'}">
                ₹${netSavings.toLocaleString('en-IN')}
              </div>
            </div>

            <div class="stat-card">
              <div class="stat-title">🎯 Active Goals Progress</div>
              <div class="stat-value">
                ₹${totalGoalProgress.toLocaleString('en-IN')} / ₹${totalGoalTarget.toLocaleString('en-IN')}
              </div>
              <small>${activeGoals.length} active goal(s)</small>
              ${totalGoalTarget > 0 ? `
                <div style="margin-top: 10px;">
                  <div style="background: #e5e7eb; border-radius: 10px; height: 10px; overflow: hidden;">
                    <div style="background: #667eea; height: 100%; width: ${(totalGoalProgress / totalGoalTarget * 100).toFixed(1)}%;"></div>
                  </div>
                  <small style="color: #666;">${(totalGoalProgress / totalGoalTarget * 100).toFixed(1)}% Complete</small>
                </div>
              ` : ''}
            </div>

            ${marketplaceItems.length > 0 ? `
              <div class="stat-card">
                <div class="stat-title">🛍️ Marketplace Activity</div>
                <div class="stat-value">${marketplaceItems.length}</div>
                <small>New listings this week</small>
              </div>
            ` : ''}

            <div style="margin-top: 30px; padding: 20px; background: #eff6ff; border-left: 4px solid #667eea; border-radius: 4px;">
              <strong>💡 Financial Tip:</strong>
              <p style="margin: 10px 0 0 0;">
                ${netSavings > 0 
                  ? "Great job! You saved money this week. Consider allocating some towards your goals." 
                  : "Your expenses exceeded income this week. Review your spending and look for areas to cut back."}
              </p>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated weekly summary from SmartGoal</p>
            <p>Keep tracking your finances to achieve your goals! 🎯</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from: `"SmartGoal" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: '📊 Your Weekly Financial Summary',
      html: emailHTML
    });

    console.log(`✅ Weekly summary sent to ${user.email}`);
  } catch (error) {
    console.error(`Failed to send weekly summary to ${user.email}:`, error);
    throw error;
  }
}

/**
 * Send notification about expired resale items
 */
export async function sendExpiredResaleNotification(user, expiredItems) {
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .item { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #ef4444; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Expired Marketplace Listings</h1>
        </div>
        <div class="content">
          <p>The following items have been listed for over 90 days and have been marked as expired:</p>
          ${expiredItems.map(item => `
            <div class="item">
              <strong>${item.title}</strong><br>
              <small>Listed: ${new Date(item.createdAt).toLocaleDateString()}</small><br>
              <small>Price: ₹${item.price.toLocaleString('en-IN')}</small>
            </div>
          `).join('')}
          <p style="margin-top: 20px;">Consider updating or removing these listings.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"SmartGoal" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: '⚠️ Expired Marketplace Listings',
    html: emailHTML
  });
}

/**
 * Send notification about expired goals
 */
export async function sendExpiredGoalsNotification(user, expiredGoals) {
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .goal { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Expired Goals</h1>
        </div>
        <div class="content">
          <p>The following goals have passed their target dates:</p>
          ${expiredGoals.map(goal => `
            <div class="goal">
              <strong>${goal.name}</strong><br>
              <small>Target Date: ${new Date(goal.targetDate).toLocaleDateString()}</small><br>
              <small>Progress: ₹${goal.currentAmount.toLocaleString('en-IN')} / ₹${goal.targetAmount.toLocaleString('en-IN')}</small>
            </div>
          `).join('')}
          <p style="margin-top: 20px;">Review these goals and update their target dates or mark them as completed.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"SmartGoal" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: '⏰ Expired Goals Notification',
    html: emailHTML
  });
}
