/**
 * PDF Report Generator for Financial Health Reports
 * Generates monthly PDF reports for both goal setters and buyers
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Generate Financial Health Report for Goal Setters
 */
export async function generateGoalSetterReport(userData, analyticsData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).fillColor('#0d6efd').text('SmartGoal Financial Health Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#6c757d').text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
      doc.moveDown(1);

      // User Info
      doc.fontSize(14).fillColor('#000').text(`Report for: ${userData.name || 'User'}`);
      doc.fontSize(10).fillColor('#6c757d').text(`Email: ${userData.email || 'N/A'}`);
      doc.moveDown(1.5);

      // Financial Health Score - Big Box
      const scoreColor = analyticsData.score >= 80 ? '#198754' : analyticsData.score >= 60 ? '#0d6efd' : analyticsData.score >= 40 ? '#ffc107' : '#dc3545';
      doc.rect(50, doc.y, 495, 80).fillAndStroke(scoreColor, '#000');
      doc.fontSize(16).fillColor('#fff').text('Financial Health Score', 60, doc.y - 70, { width: 475 });
      doc.fontSize(48).fillColor('#fff').text(`${analyticsData.score}%`, 60, doc.y + 10, { width: 475, align: 'center' });
      doc.fontSize(14).fillColor('#fff').text(`Status: ${analyticsData.status}`, 60, doc.y + 10, { width: 475, align: 'center' });
      doc.moveDown(6);

      // Key Metrics Section
      doc.fontSize(18).fillColor('#0d6efd').text('📊 Key Metrics', { underline: true });
      doc.moveDown(0.5);

      const metrics = analyticsData.metrics || {};
      const metricsList = [
        { label: 'Monthly Income', value: `₹${(metrics.monthlyIncome || 0).toLocaleString()}`, icon: '💰' },
        { label: 'Monthly Expenses', value: `₹${(metrics.monthlyExpense || 0).toLocaleString()}`, icon: '💸' },
        { label: 'Monthly Savings', value: `₹${(metrics.monthlySavings || 0).toLocaleString()}`, icon: '🎯' },
        { label: 'Savings Rate', value: `${metrics.savingsRate || 0}%`, icon: '📈' },
        { label: 'Marketplace Income', value: `₹${(metrics.marketplaceIncome || 0).toLocaleString()}`, icon: '🛒' },
        { label: 'Items Sold', value: `${metrics.itemsSold || 0}`, icon: '📦' },
        { label: 'Active Goals', value: `${metrics.activeGoals || 0}`, icon: '🎯' },
        { label: 'Active Listings', value: `${metrics.activeListings || 0}`, icon: '🏷️' }
      ];

      metricsList.forEach((metric, index) => {
        if (index % 2 === 0) {
          doc.fontSize(11).fillColor('#000').text(`${metric.icon} ${metric.label}:`, 60, doc.y);
          doc.fontSize(11).fillColor('#0d6efd').text(metric.value, 200, doc.y - 11);
          
          if (metricsList[index + 1]) {
            const nextMetric = metricsList[index + 1];
            doc.fontSize(11).fillColor('#000').text(`${nextMetric.icon} ${nextMetric.label}:`, 320, doc.y - 11);
            doc.fontSize(11).fillColor('#0d6efd').text(nextMetric.value, 460, doc.y - 11);
          }
          doc.moveDown(0.8);
        }
      });

      doc.moveDown(1);

      // Insights Section
      if (analyticsData.insights && analyticsData.insights.length > 0) {
        doc.fontSize(18).fillColor('#198754').text('💡 Key Insights', { underline: true });
        doc.moveDown(0.5);

        analyticsData.insights.slice(0, 5).forEach((insight, index) => {
          doc.fontSize(10).fillColor('#000').text(`${index + 1}. ${insight}`, { width: 495, align: 'left' });
          doc.moveDown(0.4);
        });
        doc.moveDown(1);
      }

      // Recommendations Section
      if (analyticsData.recommendations && analyticsData.recommendations.length > 0) {
        doc.addPage();
        doc.fontSize(18).fillColor('#dc3545').text('🎯 Recommendations', { underline: true });
        doc.moveDown(0.5);

        analyticsData.recommendations.slice(0, 6).forEach((rec, index) => {
          doc.fontSize(12).fillColor('#000').text(`${index + 1}. ${rec.title || rec}`, { bold: true });
          if (rec.description) {
            doc.fontSize(10).fillColor('#6c757d').text(`   ${rec.description}`, { width: 495 });
          }
          doc.moveDown(0.6);
        });
        doc.moveDown(1);
      }

      // Goals Progress Section
      if (analyticsData.goals && analyticsData.goals.length > 0) {
        doc.fontSize(18).fillColor('#0d6efd').text('🎯 Goals Progress', { underline: true });
        doc.moveDown(0.5);

        analyticsData.goals.slice(0, 5).forEach(goal => {
          const progress = goal.progress || 0;
          const progressColor = progress >= 75 ? '#198754' : progress >= 50 ? '#0d6efd' : progress >= 25 ? '#ffc107' : '#dc3545';

          doc.fontSize(11).fillColor('#000').text(`• ${goal.title}`, { bold: true });
          doc.fontSize(9).fillColor('#6c757d').text(`  Target: ₹${(goal.targetAmount || 0).toLocaleString()} | Current: ₹${(goal.currentAmount || 0).toLocaleString()}`);
          
          // Progress bar
          const barWidth = 400;
          const barHeight = 10;
          const barX = 100;
          const barY = doc.y + 5;
          
          doc.rect(barX, barY, barWidth, barHeight).stroke('#ddd');
          doc.rect(barX, barY, barWidth * (progress / 100), barHeight).fillAndStroke(progressColor, progressColor);
          doc.fontSize(9).fillColor('#000').text(`${Math.round(progress)}%`, barX + barWidth + 10, barY);
          
          doc.moveDown(2);
        });
      }

      // Footer
      doc.fontSize(8).fillColor('#6c757d').text(
        `Generated by SmartGoal Analytics Engine | ${new Date().toLocaleDateString('en-US')}`,
        50,
        doc.page.height - 50,
        { align: 'center', width: 495 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Buyer Analytics Report
 */
export async function generateBuyerReport(userData, buyerAnalytics) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).fillColor('#0d6efd').text('SmartGoal Buyer Analytics Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#6c757d').text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
      doc.moveDown(1);

      // User Info
      doc.fontSize(14).fillColor('#000').text(`Report for: ${userData.name || 'User'}`);
      doc.fontSize(10).fillColor('#6c757d').text(`Email: ${userData.email || 'N/A'}`);
      doc.moveDown(1.5);

      // Overview Section
      doc.fontSize(18).fillColor('#0d6efd').text('📊 Spending Overview', { underline: true });
      doc.moveDown(0.5);

      const overview = buyerAnalytics.overview || {};
      const overviewMetrics = [
        { label: 'Total Spent', value: `₹${(overview.totalSpent || 0).toLocaleString()}`, icon: '💸', color: '#dc3545' },
        { label: 'Total Orders', value: `${overview.totalOrders || 0}`, icon: '📦', color: '#0d6efd' },
        { label: 'Avg Order Value', value: `₹${(overview.avgOrderValue || 0).toLocaleString()}`, icon: '📊', color: '#17a2b8' },
        { label: 'Monthly Spending', value: `₹${(overview.monthlySpending || 0).toLocaleString()}`, icon: '💳', color: '#ffc107' },
        { label: 'Available Savings', value: `₹${(overview.availableSavings || 0).toLocaleString()}`, icon: '💰', color: '#198754' }
      ];

      overviewMetrics.forEach(metric => {
        doc.fontSize(11).fillColor('#000').text(`${metric.icon} ${metric.label}:`, 60, doc.y);
        doc.fontSize(12).fillColor(metric.color).text(metric.value, 250, doc.y - 12, { bold: true });
        doc.moveDown(0.8);
      });

      doc.moveDown(1);

      // Category Breakdown
      if (buyerAnalytics.categoryBreakdown && buyerAnalytics.categoryBreakdown.length > 0) {
        doc.fontSize(18).fillColor('#198754').text('🛍️ Spending by Category', { underline: true });
        doc.moveDown(0.5);

        const totalSpending = buyerAnalytics.categoryBreakdown.reduce((sum, cat) => sum + cat.value, 0);

        buyerAnalytics.categoryBreakdown.slice(0, 8).forEach((category, index) => {
          const percentage = totalSpending > 0 ? ((category.value / totalSpending) * 100).toFixed(1) : 0;
          
          doc.fontSize(11).fillColor('#000').text(`${index + 1}. ${category.name}`, 60, doc.y);
          doc.fontSize(11).fillColor('#0d6efd').text(`₹${category.value.toLocaleString()}`, 300, doc.y - 11);
          doc.fontSize(10).fillColor('#6c757d').text(`(${percentage}%)`, 420, doc.y - 11);
          
          // Progress bar
          const barWidth = 300;
          const barHeight = 8;
          const barX = 120;
          const barY = doc.y + 5;
          
          doc.rect(barX, barY, barWidth, barHeight).stroke('#ddd');
          doc.rect(barX, barY, barWidth * (percentage / 100), barHeight).fillAndStroke('#0d6efd', '#0d6efd');
          
          doc.moveDown(1.5);
        });

        doc.moveDown(1);
      }

      // Top Purchases
      if (buyerAnalytics.topPurchases && buyerAnalytics.topPurchases.length > 0) {
        doc.addPage();
        doc.fontSize(18).fillColor('#dc3545').text('🏆 Top Purchases', { underline: true });
        doc.moveDown(0.5);

        buyerAnalytics.topPurchases.slice(0, 5).forEach((purchase, index) => {
          doc.fontSize(12).fillColor('#000').text(`${index + 1}. ${purchase.title || 'Unknown Item'}`, { bold: true });
          doc.fontSize(10).fillColor('#6c757d').text(`   Price: ₹${(purchase.price || 0).toLocaleString()} | Date: ${purchase.date ? new Date(purchase.date).toLocaleDateString() : 'N/A'}`);
          if (purchase.category) {
            doc.fontSize(9).fillColor('#0d6efd').text(`   Category: ${purchase.category}`);
          }
          doc.moveDown(0.8);
        });

        doc.moveDown(1);
      }

      // Spending Insights
      doc.fontSize(18).fillColor('#ffc107').text('💡 Spending Insights', { underline: true });
      doc.moveDown(0.5);

      const insights = [];
      
      if (overview.totalOrders > 0) {
        insights.push(`You've completed ${overview.totalOrders} order${overview.totalOrders !== 1 ? 's' : ''} with an average value of ₹${Math.round(overview.avgOrderValue).toLocaleString()}.`);
      }

      if (overview.monthlySpending > 0 && overview.availableSavings > 0) {
        const spendingRatio = (overview.monthlySpending / (overview.monthlySpending + overview.availableSavings)) * 100;
        if (spendingRatio < 30) {
          insights.push(`Great job! You're spending only ${spendingRatio.toFixed(1)}% of your available funds.`);
        } else if (spendingRatio > 70) {
          insights.push(`Consider reducing spending - currently using ${spendingRatio.toFixed(1)}% of available funds.`);
        }
      }

      if (buyerAnalytics.categoryBreakdown && buyerAnalytics.categoryBreakdown.length > 0) {
        const topCategory = buyerAnalytics.categoryBreakdown[0];
        insights.push(`Your top spending category is ${topCategory.name} with ₹${topCategory.value.toLocaleString()}.`);
      }

      insights.push(`Available savings: ₹${(overview.availableSavings || 0).toLocaleString()} for future purchases.`);

      insights.forEach((insight, index) => {
        doc.fontSize(10).fillColor('#000').text(`${index + 1}. ${insight}`, { width: 495 });
        doc.moveDown(0.5);
      });

      // Footer
      doc.fontSize(8).fillColor('#6c757d').text(
        `Generated by SmartGoal Analytics Engine | ${new Date().toLocaleDateString('en-US')}`,
        50,
        doc.page.height - 50,
        { align: 'center', width: 495 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Save PDF buffer to file
 */
export async function savePDFToFile(pdfBuffer, filename) {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'reports');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, pdfBuffer);
  
  return filePath;
}
