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
      
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      const pageWidth = doc.page.width - 80;
      
      doc.pipe(stream);

      // Modern Header with gradient
      doc.save();
      doc.rect(0, 0, doc.page.width, 140).fill('#059669');
      doc.rect(0, 0, doc.page.width, 140).fillOpacity(0.1).fill('#000000');
      doc.fillOpacity(1);
      
      doc.fontSize(32).fillColor('#ffffff').font('Helvetica-Bold')
         .text('Monthly Financial Report', 40, 30, { align: 'center', width: pageWidth });
      doc.fontSize(16).fillColor('#d1fae5').font('Helvetica')
         .text(monthName, 40, 75, { align: 'center', width: pageWidth });
      doc.fontSize(10).fillColor('#a7f3d0')
         .text(`${user.name || 'N/A'} • ${user.email}`, 40, 100, { align: 'center', width: pageWidth });
      doc.fontSize(8).fillColor('#d1fae5')
         .text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 40, 118, { align: 'center', width: pageWidth });
      doc.restore();
      
      doc.y = 160;

      // Financial Summary Cards
      doc.fontSize(16).fillColor('#1f2937').font('Helvetica-Bold')
         .text('Financial Summary', 40, doc.y);
      doc.moveDown(0.8);

      const summaryMetrics = [
        { 
          label: 'Total Income', 
          value: `₹${stats.totalIncome.toLocaleString('en-IN')}`, 
          subtext: `${data.incomes.length} transactions`,
          icon: '💰', 
          color: '#10b981' 
        },
        { 
          label: 'Total Expenses', 
          value: `₹${stats.totalExpenses.toLocaleString('en-IN')}`, 
          subtext: `${data.expenses.length} transactions`,
          icon: '💸', 
          color: '#ef4444' 
        },
        { 
          label: 'Net Savings', 
          value: `₹${stats.netSavings.toLocaleString('en-IN')}`, 
          subtext: stats.netSavings >= 0 ? 'Positive balance' : 'Deficit',
          icon: stats.netSavings >= 0 ? '💎' : '⚠️', 
          color: stats.netSavings >= 0 ? '#8b5cf6' : '#f59e0b' 
        }
      ];

      const cardWidth = (pageWidth - 40) / 3;
      const cardHeight = 80;
      let currentY = doc.y;

      summaryMetrics.forEach((metric, index) => {
        const x = 40 + (index * (cardWidth + 20));
        const y = currentY;
        
        // Card with shadow
        doc.save();
        doc.roundedRect(x + 2, y + 2, cardWidth, cardHeight, 8).fill('#00000015');
        doc.roundedRect(x, y, cardWidth, cardHeight, 8).fillAndStroke('#ffffff', '#e0e0e0');
        
        // Icon circle
        doc.circle(x + 25, y + 25, 18).fillAndStroke(metric.color + '20', metric.color + '20');
        doc.fontSize(20).fillColor(metric.color).text(metric.icon, x + 16, y + 15);
        
        // Label
        doc.fontSize(9).fillColor('#6c757d').font('Helvetica').text(metric.label, x + 50, y + 12, { width: cardWidth - 60 });
        
        // Value
        doc.fontSize(13).fillColor('#212529').font('Helvetica-Bold').text(metric.value, x + 50, y + 28, { width: cardWidth - 60 });
        
        // Subtext
        doc.fontSize(8).fillColor('#9ca3af').font('Helvetica').text(metric.subtext, x + 50, y + 48, { width: cardWidth - 60 });
        
        doc.restore();
      });

      doc.y = currentY + cardHeight + 30;

      // Goals Summary
      doc.fontSize(16).fillColor('#1f2937').font('Helvetica-Bold')
         .text('Goals Summary', 40, doc.y);
      doc.moveDown(0.8);

      const goalsMetrics = [
        { label: 'Active Goals', value: `${stats.activeGoals}`, icon: '🎯', color: '#3b82f6' },
        { label: 'Completed Goals', value: `${stats.completedGoals}`, icon: '✅', color: '#10b981' },
        { label: 'Total Progress', value: `₹${stats.totalGoalProgress.toLocaleString('en-IN')}`, icon: '📊', color: '#8b5cf6' },
        { label: 'Total Target', value: `₹${stats.totalGoalTarget.toLocaleString('en-IN')}`, icon: '🎯', color: '#f59e0b' }
      ];

      const goalCardWidth = (pageWidth - 20) / 2;
      const goalCardHeight = 60;
      currentY = doc.y;

      goalsMetrics.forEach((metric, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = 40 + (col * (goalCardWidth + 20));
        const y = currentY + (row * (goalCardHeight + 15));
        
        // Card
        doc.save();
        doc.roundedRect(x + 2, y + 2, goalCardWidth, goalCardHeight, 8).fill('#00000015');
        doc.roundedRect(x, y, goalCardWidth, goalCardHeight, 8).fillAndStroke('#ffffff', '#e0e0e0');
        
        // Icon
        doc.circle(x + 20, y + goalCardHeight / 2, 15).fillAndStroke(metric.color + '20', metric.color + '20');
        doc.fontSize(16).fillColor(metric.color).text(metric.icon, x + 13, y + goalCardHeight / 2 - 8);
        
        // Label and value
        doc.fontSize(9).fillColor('#6c757d').text(metric.label, x + 45, y + 15, { width: goalCardWidth - 55 });
        doc.fontSize(14).fillColor('#212529').font('Helvetica-Bold').text(metric.value, x + 45, y + 30, { width: goalCardWidth - 55 });
        doc.font('Helvetica');
        
        doc.restore();
      });

      doc.y = currentY + (Math.ceil(goalsMetrics.length / 2) * (goalCardHeight + 15)) + 20;

      if (stats.totalGoalTarget > 0) {
        const percentage = (stats.totalGoalProgress / stats.totalGoalTarget * 100).toFixed(1);
        doc.fontSize(11).fillColor('#6b7280').font('Helvetica')
           .text(`Overall Completion: ${percentage}%`, 40, doc.y);
        doc.moveDown(1.5);
      }

      // Marketplace Summary
      if (stats.marketplaceListings > 0 || stats.marketplaceSales > 0) {
        doc.fontSize(16).fillColor('#1f2937').font('Helvetica-Bold')
           .text('Marketplace Summary', 40, doc.y);
        doc.moveDown(0.8);

        const marketplaceMetrics = [
          { label: 'Total Listings', value: `${stats.marketplaceListings}`, icon: '🏷️', color: '#06b6d4' },
          { label: 'Sales This Month', value: `${stats.marketplaceSales}`, icon: '📦', color: '#10b981' },
          { label: 'Revenue', value: `₹${stats.marketplaceRevenue.toLocaleString('en-IN')}`, icon: '💰', color: '#f59e0b' }
        ];

        const mpCardWidth = (pageWidth - 40) / 3;
        const mpCardHeight = 60;
        currentY = doc.y;

        marketplaceMetrics.forEach((metric, index) => {
          const x = 40 + (index * (mpCardWidth + 20));
          const y = currentY;
          
          doc.save();
          doc.roundedRect(x + 2, y + 2, mpCardWidth, mpCardHeight, 8).fill('#00000015');
          doc.roundedRect(x, y, mpCardWidth, mpCardHeight, 8).fillAndStroke('#ffffff', '#e0e0e0');
          
          doc.circle(x + 20, y + mpCardHeight / 2, 15).fillAndStroke(metric.color + '20', metric.color + '20');
          doc.fontSize(16).fillColor(metric.color).text(metric.icon, x + 13, y + mpCardHeight / 2 - 8);
          
          doc.fontSize(9).fillColor('#6c757d').text(metric.label, x + 45, y + 15, { width: mpCardWidth - 55 });
          doc.fontSize(14).fillColor('#212529').font('Helvetica-Bold').text(metric.value, x + 45, y + 30, { width: mpCardWidth - 55 });
          doc.font('Helvetica');
          
          doc.restore();
        });

        doc.y = currentY + mpCardHeight + 30;
      }

      // Top Income Sources
      if (data.incomes.length > 0) {
        if (doc.y > 650) doc.addPage();
        
        doc.fontSize(16).fillColor('#1f2937').font('Helvetica-Bold')
           .text('💰 Top Income Sources', 40, doc.y);
        doc.moveDown(0.8);

        const incomeBySource = {};
        data.incomes.forEach(income => {
          const source = income.source || 'Other';
          incomeBySource[source] = (incomeBySource[source] || 0) + income.amount;
        });

        Object.entries(incomeBySource)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([source, amount], index) => {
            const itemY = doc.y;
            
            doc.save();
            doc.roundedRect(40, itemY, pageWidth, 35, 6).fillAndStroke('#ecfdf5', '#a7f3d0');
            
            doc.circle(55, itemY + 17, 10).fillAndStroke('#10b981', '#10b981');
            doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold')
               .text(`${index + 1}`, 50, itemY + 12);
            
            doc.fontSize(10).fillColor('#065f46').font('Helvetica-Bold')
               .text(source, 75, itemY + 10);
            doc.fontSize(10).fillColor('#047857')
               .text(`₹${amount.toLocaleString('en-IN')}`, pageWidth - 80, itemY + 10);
            
            doc.restore();
            doc.y = itemY + 45;
          });
        doc.moveDown(1);
      }

      // Top Expenses
      if (data.expenses.length > 0) {
        if (doc.y > 650) doc.addPage();
        
        doc.fontSize(16).fillColor('#1f2937').font('Helvetica-Bold')
           .text('💸 Top Expense Categories', 40, doc.y);
        doc.moveDown(0.8);

        const expenseByCategory = {};
        data.expenses.forEach(expense => {
          const category = expense.category || 'Other';
          expenseByCategory[category] = (expenseByCategory[category] || 0) + expense.amount;
        });

        Object.entries(expenseByCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .forEach(([category, amount], index) => {
            const itemY = doc.y;
            
            doc.save();
            doc.roundedRect(40, itemY, pageWidth, 35, 6).fillAndStroke('#fef2f2', '#fecaca');
            
            doc.circle(55, itemY + 17, 10).fillAndStroke('#ef4444', '#ef4444');
            doc.fontSize(8).fillColor('#ffffff').font('Helvetica-Bold')
               .text(`${index + 1}`, 50, itemY + 12);
            
            doc.fontSize(10).fillColor('#7f1d1d').font('Helvetica-Bold')
               .text(category, 75, itemY + 10);
            doc.fontSize(10).fillColor('#991b1b')
               .text(`₹${amount.toLocaleString('en-IN')}`, pageWidth - 80, itemY + 10);
            
            doc.restore();
            doc.y = itemY + 45;
          });
        doc.moveDown(1);
      }

      // Active Goals Details
      const activeGoals = data.goals.filter(g => g.status === 'active');
      if (activeGoals.length > 0) {
        if (doc.y > 650) doc.addPage();
        
        doc.fontSize(16).fillColor('#1f2937').font('Helvetica-Bold')
           .text('🎯 Active Goals', 40, doc.y);
        doc.moveDown(0.8);

        activeGoals.forEach((goal, index) => {
          if (doc.y > 700) doc.addPage();
          
          const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount * 100).toFixed(1) : 0;
          const goalY = doc.y;
          const progressColor = progress >= 75 ? '#10b981' : progress >= 50 ? '#3b82f6' : progress >= 25 ? '#f59e0b' : '#ef4444';
          
          doc.save();
          doc.roundedRect(40, goalY, pageWidth, 70, 8).fillAndStroke('#ffffff', '#e5e7eb');
          
          doc.fontSize(12).fillColor('#1f2937').font('Helvetica-Bold')
             .text(`${index + 1}. ${goal.name}`, 50, goalY + 12, { width: pageWidth - 20 });
          doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
             .text(`₹${goal.currentAmount.toLocaleString('en-IN')} of ₹${goal.targetAmount.toLocaleString('en-IN')}`, 50, goalY + 30);
          doc.fontSize(8).fillColor('#9ca3af')
             .text(`Target: ${new Date(goal.targetDate).toLocaleDateString('en-IN')}`, 50, goalY + 45);
          
          // Progress bar
          const barWidth = pageWidth - 100;
          const barX = 50;
          const barY = goalY + 55;
          
          doc.roundedRect(barX, barY, barWidth, 8, 3).fillAndStroke('#e9ecef', '#e9ecef');
          if (progress > 0) {
            const fillWidth = (barWidth * progress) / 100;
            doc.roundedRect(barX, barY, fillWidth, 8, 3).fillAndStroke(progressColor, progressColor);
          }
          
          doc.fontSize(9).fillColor(progressColor).font('Helvetica-Bold')
             .text(`${progress}%`, barX + barWidth + 10, barY);
          
          doc.restore();
          doc.y = goalY + 80;
        });
      }

      // Footer
      const footerY = doc.page.height - 60;
      doc.save();
      doc.rect(0, footerY, doc.page.width, 60).fill('#f9fafb');
      doc.fontSize(8).fillColor('#9ca3af').font('Helvetica')
         .text('This report is generated automatically by SmartGoal. For questions, contact support.', 40, footerY + 25, { align: 'center', width: pageWidth });
      doc.restore();

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
