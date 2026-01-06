/**
 * Monthly PDF Report Generator
 * Generates comprehensive financial reports in PDF format
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Goal from '../models/Goal.js';
import Finance from '../models/Finance.js';
import Marketplace from '../models/Marketplace.js';
import Order from '../models/Order.js';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Email transporter
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
 * Generate monthly PDF report for a user
 */
export async function generateMonthlyPDFReport(user) {
  try {
    const userId = user._id;
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch all data for the month
    const [goals, incomes, expenses, marketplaceItems, orders] = await Promise.all([
      Goal.find({ userId }),
      Finance.find({ userId, type: 'income', date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth } }),
      Finance.find({ userId, type: 'expense', date: { $gte: firstDayOfMonth, $lte: lastDayOfMonth } }),
      Marketplace.find({ sellerId: userId }),
      Order.find({ sellerId: userId, createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth } })
    ]);

    // Calculate statistics
    const stats = {
      totalIncome: incomes.reduce((sum, income) => sum + income.amount, 0),
      totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      activeGoals: goals.filter(g => g.status === 'active').length,
      completedGoals: goals.filter(g => g.status === 'completed').length,
      totalGoalProgress: goals.reduce((sum, goal) => sum + goal.currentAmount, 0),
      totalGoalTarget: goals.reduce((sum, goal) => sum + goal.targetAmount, 0),
      marketplaceListings: marketplaceItems.length,
      marketplaceSales: orders.filter(o => o.status === 'completed').length,
      marketplaceRevenue: orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.totalAmount, 0)
    };

    stats.netSavings = stats.totalIncome - stats.totalExpenses;

    // Generate PDF
    const pdfPath = await createPDFReport(user, stats, { firstDayOfMonth, lastDayOfMonth }, {
      goals, incomes, expenses, orders
    });

    // Send email with PDF attachment
    await sendPDFReport(user, pdfPath, firstDayOfMonth, lastDayOfMonth);

    // Clean up temporary file
    fs.unlinkSync(pdfPath);

    console.log(`✅ Monthly report generated and sent to ${user.email}`);
  } catch (error) {
    console.error(`Failed to generate monthly report for ${user.email}:`, error);
    throw error;
  }
}

/**
 * Create PDF document
 */
async function createPDFReport(user, stats, dateRange, data) {
  return new Promise((resolve, reject) => {
    try {
      const { firstDayOfMonth, lastDayOfMonth } = dateRange;
      const monthName = firstDayOfMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      
      // Create reports directory if it doesn't exist
      const reportsDir = path.join(__dirname, '..', '..', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const fileName = `financial-report-${user._id}-${Date.now()}.pdf`;
      const filePath = path.join(reportsDir, fileName);
      
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('SmartGoal Financial Report', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(monthName, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
      doc.moveDown(2);

      // User Information
      doc.fontSize(14).font('Helvetica-Bold').text('User Information');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Name: ${user.name || 'N/A'}`);
      doc.text(`Email: ${user.email}`);
      doc.moveDown(2);

      // Financial Summary
      doc.fontSize(14).font('Helvetica-Bold').text('Financial Summary');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      
      doc.text(`Total Income: ₹${stats.totalIncome.toLocaleString('en-IN')}`, { continued: true });
      doc.text(`    (${data.incomes.length} transactions)`, { align: 'right' });
      
      doc.text(`Total Expenses: ₹${stats.totalExpenses.toLocaleString('en-IN')}`, { continued: true });
      doc.text(`    (${data.expenses.length} transactions)`, { align: 'right' });
      
      doc.font('Helvetica-Bold');
      const savingsColor = stats.netSavings >= 0 ? 'green' : 'red';
      doc.fillColor(savingsColor).text(`Net Savings: ₹${stats.netSavings.toLocaleString('en-IN')}`);
      doc.fillColor('black').font('Helvetica');
      doc.moveDown(2);

      // Goals Summary
      doc.fontSize(14).font('Helvetica-Bold').text('Goals Summary');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Active Goals: ${stats.activeGoals}`);
      doc.text(`Completed Goals: ${stats.completedGoals}`);
      doc.text(`Total Progress: ₹${stats.totalGoalProgress.toLocaleString('en-IN')} / ₹${stats.totalGoalTarget.toLocaleString('en-IN')}`);
      if (stats.totalGoalTarget > 0) {
        const percentage = (stats.totalGoalProgress / stats.totalGoalTarget * 100).toFixed(1);
        doc.text(`Overall Completion: ${percentage}%`);
      }
      doc.moveDown(2);

      // Marketplace Summary
      if (stats.marketplaceListings > 0 || stats.marketplaceSales > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Marketplace Summary');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Listings: ${stats.marketplaceListings}`);
        doc.text(`Sales This Month: ${stats.marketplaceSales}`);
        doc.text(`Revenue This Month: ₹${stats.marketplaceRevenue.toLocaleString('en-IN')}`);
        doc.moveDown(2);
      }

      // Top Income Sources
      if (data.incomes.length > 0) {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('Top Income Sources');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        const incomeBySource = {};
        data.incomes.forEach(income => {
          const source = income.source || 'Other';
          incomeBySource[source] = (incomeBySource[source] || 0) + income.amount;
        });

        Object.entries(incomeBySource)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([source, amount], index) => {
            doc.text(`${index + 1}. ${source}: ₹${amount.toLocaleString('en-IN')}`);
          });
        doc.moveDown(2);
      }

      // Top Expenses
      if (data.expenses.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Top Expense Categories');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        const expenseByCategory = {};
        data.expenses.forEach(expense => {
          const category = expense.category || 'Other';
          expenseByCategory[category] = (expenseByCategory[category] || 0) + expense.amount;
        });

        Object.entries(expenseByCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([category, amount], index) => {
            doc.text(`${index + 1}. ${category}: ₹${amount.toLocaleString('en-IN')}`);
          });
        doc.moveDown(2);
      }

      // Active Goals Details
      const activeGoals = data.goals.filter(g => g.status === 'active');
      if (activeGoals.length > 0) {
        if (doc.y > 600) doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('Active Goals');
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        activeGoals.forEach((goal, index) => {
          if (doc.y > 700) doc.addPage();
          const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount * 100).toFixed(1) : 0;
          doc.text(`${index + 1}. ${goal.name}`);
          doc.text(`   Progress: ₹${goal.currentAmount.toLocaleString('en-IN')} / ₹${goal.targetAmount.toLocaleString('en-IN')} (${progress}%)`);
          doc.text(`   Target Date: ${new Date(goal.targetDate).toLocaleDateString('en-IN')}`);
          doc.moveDown(0.5);
        });
      }

      // Footer
      doc.fontSize(8).fillColor('gray').text(
        'This report is generated automatically by SmartGoal. For questions, contact support.',
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Send PDF report via email
 */
async function sendPDFReport(user, pdfPath, firstDay, lastDay) {
  const monthName = firstDay.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  await transporter.sendMail({
    from: `"SmartGoal" <${process.env.SMTP_USER}>`,
    to: user.email,
    subject: `📄 Your Monthly Financial Report - ${monthName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px; }
          .content { background: #f9f9f9; padding: 30px; margin-top: 20px; border-radius: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 Your Monthly Financial Report</h1>
            <p>${monthName}</p>
          </div>
          <div class="content">
            <p>Hello ${user.name || 'there'},</p>
            <p>Your comprehensive financial report for ${monthName} is ready!</p>
            <p>The attached PDF includes:</p>
            <ul>
              <li>💰 Income and expense summary</li>
              <li>🎯 Goals progress and achievements</li>
              <li>🛍️ Marketplace activity</li>
              <li>📊 Detailed breakdowns and insights</li>
            </ul>
            <p>Keep tracking your finances to achieve your goals!</p>
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              This is an automated monthly report from SmartGoal.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    attachments: [
      {
        filename: `SmartGoal-Report-${monthName.replace(' ', '-')}.pdf`,
        path: pdfPath
      }
    ]
  });
}
