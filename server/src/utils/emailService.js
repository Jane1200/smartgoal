import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Create reusable transporter
const createTransporter = () => {
  // Check if using Gmail or custom SMTP
  if (process.env.EMAIL_SERVICE === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
      },
    });
  }

  // For SendGrid, Mailgun, or custom SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Send email using configured transporter
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"SmartGoal" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || stripHtml(html), // Fallback plain text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Strip HTML tags for plain text fallback
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Base email template with SmartGoal branding
 */
function getEmailTemplate(content) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartGoal</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f7fa;
      color: #334155;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #161da3 0%, #1e40af 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .tagline {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin: 8px 0 0 0;
    }
    .content {
      padding: 40px 30px;
    }
    .content h1 {
      color: #1e293b;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 20px 0;
    }
    .content p {
      color: #64748b;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #161da3 0%, #1e40af 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(22, 29, 163, 0.3);
    }
    .stats-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .stat-row:last-child {
      border-bottom: none;
    }
    .stat-label {
      color: #64748b;
      font-size: 14px;
      font-weight: 500;
    }
    .stat-value {
      color: #1e293b;
      font-size: 18px;
      font-weight: 700;
    }
    .progress-bar {
      width: 100%;
      height: 12px;
      background: #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      margin: 16px 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      border-radius: 6px;
      transition: width 0.3s ease;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin: 4px;
    }
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    .badge-info {
      background: #dbeafe;
      color: #1e40af;
    }
    .footer {
      background: #f8fafc;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      color: #94a3b8;
      font-size: 14px;
      margin: 8px 0;
    }
    .footer a {
      color: #161da3;
      text-decoration: none;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      display: inline-block;
      margin: 0 8px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 14px;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .stat-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1 class="logo">💰 SmartGoal</h1>
      <p class="tagline">Your Personal Finance Companion</p>
    </div>
    
    <div class="content">
      ${content}
    </div>
    
    <div class="footer">
      <p><strong>SmartGoal</strong> - Smart Financial Planning Made Easy</p>
      <p>You're receiving this email because you have an account with SmartGoal.</p>
      <div class="social-links">
        <a href="#">Help Center</a> • 
        <a href="#">Privacy Policy</a> • 
        <a href="#">Unsubscribe</a>
      </div>
      <p style="color: #cbd5e1; font-size: 12px; margin-top: 20px;">
        © ${new Date().getFullYear()} SmartGoal. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 1. Goal Milestone Achieved Email
 */
export async function sendGoalMilestoneEmail(user, goal, milestone) {
  const progressPercent = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1);
  const remaining = goal.targetAmount - goal.currentAmount;

  const milestoneEmojis = {
    25: "🎯",
    50: "🚀",
    75: "⭐",
    100: "🎉",
  };

  const milestoneTitles = {
    25: "Great Start!",
    50: "Halfway There!",
    75: "Almost Done!",
    100: "Goal Achieved!",
  };

  const content = `
    <h1>${milestoneEmojis[milestone]} ${milestoneTitles[milestone]}</h1>
    <p>Hi ${user.name},</p>
    <p>Congratulations! You've reached <strong>${milestone}%</strong> of your goal: <strong>${goal.name}</strong>!</p>
    
    <div class="stats-card">
      <div class="stat-row">
        <span class="stat-label">Target Amount</span>
        <span class="stat-value">₹${goal.targetAmount.toLocaleString("en-IN")}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Current Savings</span>
        <span class="stat-value" style="color: #10b981;">₹${goal.currentAmount.toLocaleString("en-IN")}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Remaining</span>
        <span class="stat-value" style="color: #f59e0b;">₹${remaining.toLocaleString("en-IN")}</span>
      </div>
    </div>

    <div style="text-align: center;">
      <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">Progress</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progressPercent}%;"></div>
      </div>
      <div style="font-size: 24px; font-weight: 700; color: #10b981; margin-top: 8px;">
        ${progressPercent}%
      </div>
    </div>

    ${milestone < 100 ? `
      <p style="margin-top: 30px;">Keep up the great work! You're doing amazing. 💪</p>
      <p style="color: #64748b; font-size: 14px;">
        💡 <strong>Tip:</strong> Stay consistent with your contributions to reach your goal faster!
      </p>
    ` : `
      <p style="margin-top: 30px; font-size: 18px; color: #10b981; font-weight: 600;">
        🎊 You did it! Your goal is complete!
      </p>
      <p>Time to celebrate your achievement and set your next financial goal!</p>
    `}

    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard/goals" class="button">
        View Goal Details
      </a>
    </div>
  `;

  const subject = milestone === 100 
    ? `🎉 Goal Achieved: ${goal.name}!`
    : `${milestoneEmojis[milestone]} You're ${milestone}% closer to ${goal.name}!`;

  return sendEmail({
    to: user.email,
    subject,
    html: getEmailTemplate(content),
  });
}

/**
 * 2. Monthly Financial Report Email
 */
export async function sendMonthlyReportEmail(user, reportData) {
  const { month, year, income, expense, savings, savingsRate, topCategories, goalProgress } = reportData;

  const monthNames = ["January", "February", "March", "April", "May", "June", 
                      "July", "August", "September", "October", "November", "December"];
  const monthName = monthNames[month - 1];

  const savingsColor = savings >= 0 ? "#10b981" : "#ef4444";
  const savingsIcon = savings >= 0 ? "📈" : "📉";

  const content = `
    <h1>📊 Your ${monthName} ${year} Financial Report</h1>
    <p>Hi ${user.name},</p>
    <p>Here's a comprehensive summary of your financial activity for ${monthName}.</p>

    <div class="stats-card">
      <div class="stat-row">
        <span class="stat-label">💰 Total Income</span>
        <span class="stat-value" style="color: #10b981;">₹${income.toLocaleString("en-IN")}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">💸 Total Expenses</span>
        <span class="stat-value" style="color: #ef4444;">₹${expense.toLocaleString("en-IN")}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">${savingsIcon} Net Savings</span>
        <span class="stat-value" style="color: ${savingsColor};">₹${savings.toLocaleString("en-IN")}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">📊 Savings Rate</span>
        <span class="stat-value">${savingsRate}%</span>
      </div>
    </div>

    ${topCategories && topCategories.length > 0 ? `
      <h2 style="font-size: 18px; color: #1e293b; margin: 30px 0 16px 0;">
        🏆 Top Spending Categories
      </h2>
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
        ${topCategories.slice(0, 5).map((cat, index) => `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; ${index < 4 ? 'border-bottom: 1px solid #e2e8f0;' : ''}">
            <span style="color: #64748b;">${index + 1}. ${cat.category}</span>
            <span style="color: #1e293b; font-weight: 600;">₹${cat.amount.toLocaleString("en-IN")}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${goalProgress && goalProgress.length > 0 ? `
      <h2 style="font-size: 18px; color: #1e293b; margin: 30px 0 16px 0;">
        🎯 Goal Progress This Month
      </h2>
      ${goalProgress.map(goal => `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-weight: 600; color: #1e293b;">${goal.name}</span>
            <span style="color: #10b981; font-weight: 600;">+₹${goal.contributed.toLocaleString("en-IN")}</span>
          </div>
          <div class="progress-bar" style="height: 8px;">
            <div class="progress-fill" style="width: ${goal.progress}%;"></div>
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            ${goal.progress}% complete
          </div>
        </div>
      `).join('')}
    ` : ''}

    <div style="background: linear-gradient(135deg, #161da3 0%, #1e40af 100%); border-radius: 12px; padding: 24px; margin: 30px 0; color: white;">
      <h3 style="margin: 0 0 12px 0; font-size: 18px;">💡 Financial Insights</h3>
      <p style="margin: 0; opacity: 0.95; font-size: 14px; line-height: 1.6;">
        ${savings > 0 
          ? `Great job! You saved ₹${savings.toLocaleString("en-IN")} this month. ${savingsRate >= 20 ? "Your savings rate is excellent! 🌟" : "Try to increase your savings rate to 20% or more."}`
          : `You spent more than you earned this month. Review your expenses and create a budget to get back on track.`
        }
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard/finances" class="button">
        View Detailed Report
      </a>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `📈 Your ${monthName} Financial Report`,
    html: getEmailTemplate(content),
  });
}

/**
 * 3. Password Changed Email (Security Alert)
 */
export async function sendPasswordChangedEmail(user, deviceInfo = {}) {
  const { device = "Unknown Device", location = "Unknown Location", timestamp = new Date() } = deviceInfo;

  const content = `
    <h1>🔒 Password Changed Successfully</h1>
    <p>Hi ${user.name},</p>
    <p>Your SmartGoal account password was recently changed.</p>

    <div class="stats-card">
      <div class="stat-row">
        <span class="stat-label">🕐 Time</span>
        <span class="stat-value" style="font-size: 14px;">${new Date(timestamp).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short"
        })}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">📱 Device</span>
        <span class="stat-value" style="font-size: 14px;">${device}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">📍 Location</span>
        <span class="stat-value" style="font-size: 14px;">${location}</span>
      </div>
    </div>

    <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0; color: #065f46; font-weight: 600;">
        ✅ If this was you, no action is needed.
      </p>
    </div>

    <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 24px 0;">
      <p style="margin: 0 0 12px 0; color: #991b1b; font-weight: 600;">
        ⚠️ If you didn't make this change:
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #991b1b;">
        <li>Someone may have accessed your account</li>
        <li>Reset your password immediately</li>
        <li>Review your recent account activity</li>
        <li>Contact our support team</li>
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password" class="button" style="background: #ef4444;">
        Reset Password Now
      </a>
    </div>

    <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
      <strong>Security Tips:</strong><br>
      • Use a strong, unique password<br>
      • Enable two-factor authentication<br>
      • Never share your password with anyone<br>
      • Be cautious of phishing emails
    </p>
  `;

  return sendEmail({
    to: user.email,
    subject: "🔒 Your SmartGoal Password Was Changed",
    html: getEmailTemplate(content),
  });
}

export default {
  sendEmail,
  sendGoalMilestoneEmail,
  sendMonthlyReportEmail,
  sendPasswordChangedEmail,
};
