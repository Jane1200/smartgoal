/**
 * PDF Report Generator for Financial Health Reports
 * Professional Blue Theme - Simple & Clean
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Professional Blue Theme Colors
const COLORS = {
  primary: '#4A5FDC',
  primaryLight: '#8B9FE8',
  primaryPale: '#E8ECFF',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  dark: '#1F2937',
  light: '#F9FAFB',
  white: '#FFFFFF',
  text: '#374151',
  textLight: '#6B7280',
};

// Helper: Draw rounded rectangle
function drawRoundedRect(doc, x, y, width, height, radius, fillColor) {
  doc.save().fillColor(fillColor).roundedRect(x, y, width, height, radius).fill().restore();
}

// Helper: Draw card
function drawCard(doc, x, y, width, height, options = {}) {
  const { fillColor = COLORS.white, radius = 8, shadow = true } = options;
  if (shadow) {
    doc.save().fillColor('#000000').opacity(0.05).roundedRect(x + 2, y + 2, width, height, radius).fill().restore();
  }
  drawRoundedRect(doc, x, y, width, height, radius, fillColor);
}

// Helper: Draw donut chart
function drawDonutChart(doc, centerX, centerY, radius, percentage, color) {
  const innerRadius = radius * 0.65;
  
  // Background circle
  doc.save().fillColor(COLORS.primaryPale).circle(centerX, centerY, radius).fill().restore();
  
  // Progress arc
  if (percentage > 0) {
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * percentage / 100);
    const largeArcFlag = percentage > 50 ? 1 : 0;
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    const ix1 = centerX + innerRadius * Math.cos(endAngle);
    const iy1 = centerY + innerRadius * Math.sin(endAngle);
    const ix2 = centerX + innerRadius * Math.cos(startAngle);
    const iy2 = centerY + innerRadius * Math.sin(startAngle);
    
    doc.save().fillColor(color)
      .path(`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix2} ${iy2} Z`)
      .fill().restore();
  }
  
  // Inner white circle
  doc.save().fillColor(COLORS.white).circle(centerX, centerY, innerRadius).fill().restore();
}

// Helper: Draw horizontal bar chart
function drawHorizontalBarChart(doc, x, y, width, height, data) {
  const maxValue = Math.max(...data.map(d => Math.max(d.expected || 0, d.actual || 0)));
  const barHeight = 18;
  const gap = 6;
  
  // Legend
  const legendX = x + width - 140;
  drawRoundedRect(doc, legendX, y, 12, 8, 2, COLORS.primaryPale);
  doc.fillColor(COLORS.text).fontSize(7).font('Helvetica').text('Expected', legendX + 16, y - 1);
  drawRoundedRect(doc, legendX + 70, y, 12, 8, 2, COLORS.primary);
  doc.text('Actual', legendX + 86, y - 1);
  
  let currentY = y + 20;
  
  data.forEach(item => {
    // Category label
    doc.fillColor(COLORS.text).fontSize(8).font('Helvetica').text(item.category, x, currentY + 4, { width: 90 });
    
    const barStartX = x + 95;
    const barWidth = width - 105;
    
    // Expected bar
    if (item.expected > 0) {
      const expWidth = (barWidth * item.expected) / maxValue;
      drawRoundedRect(doc, barStartX, currentY, expWidth, barHeight, 3, COLORS.primaryPale);
    }
    
    // Actual bar
    if (item.actual > 0) {
      const actWidth = (barWidth * item.actual) / maxValue;
      drawRoundedRect(doc, barStartX, currentY, actWidth, barHeight, 3, COLORS.primary);
    }
    
    currentY += barHeight + gap;
  });
}

/**
 * Generate Financial Health Report for Goal Setters
 */
export async function generateGoalSetterReport(userData, analyticsData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 80;
      const metrics = analyticsData.metrics || {};
      const currentDate = new Date();
      const monthYear = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const dateStr = currentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
      
      // ===== PAGE 1: BUDGET DASHBOARD =====
      
      // Blue Header
      doc.rect(0, 0, doc.page.width, 110).fill(COLORS.primary);
      doc.fillColor(COLORS.white).fontSize(28).font('Helvetica-Bold').text('SmartGoal', 40, 30);
      doc.fontSize(11).font('Helvetica').text('Financial Report', 40, 62);
      doc.fontSize(10).text(dateStr, pageWidth - 100, 30, { width: 180, align: 'right' });
      doc.fontSize(14).font('Helvetica-Bold').text(userData.name || 'User', pageWidth - 100, 50, { width: 180, align: 'right' });
      
      doc.y = 130;

      // Title
      doc.fillColor(COLORS.dark).fontSize(36).font('Helvetica-Bold').text(monthYear, 40, doc.y, { align: 'center', width: pageWidth });
      doc.fillColor(COLORS.textLight).fontSize(11).font('Helvetica').text('BUDGET DASHBOARD', 40, doc.y + 5, { align: 'center', width: pageWidth });
      doc.y += 60;

      // Top 3 Cards
      const topY = doc.y;
      const cardW = (pageWidth - 40) / 3;
      
      // Card 1: Month & Year
      drawCard(doc, 40, topY, cardW, 90, { fillColor: COLORS.primaryPale });
      doc.fillColor(COLORS.dark).fontSize(9).font('Helvetica-Bold').text('MONTH & YEAR', 50, topY + 15, { width: cardW - 20 });
      doc.fillColor(COLORS.text).fontSize(16).font('Helvetica').text(monthYear, 50, topY + 50, { width: cardW - 20, align: 'center' });
      
      // Card 2: Amount Left (Donut)
      const donutX = 40 + cardW + 20;
      drawCard(doc, donutX, topY, cardW, 90, { fillColor: COLORS.white });
      doc.fillColor(COLORS.dark).fontSize(9).font('Helvetica-Bold').text('AMOUNT LEFT TO SPEND', donutX + 10, topY + 15, { width: cardW - 20, align: 'center' });
      
      const totalIncome = metrics.monthlyIncome || 0;
      const totalExpense = metrics.monthlyExpense || 0;
      const leftToSpend = Math.max(0, totalIncome - totalExpense);
      const spentPct = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
      
      const donutCX = donutX + cardW / 2;
      const donutCY = topY + 60;
      drawDonutChart(doc, donutCX, donutCY, 28, spentPct, COLORS.primary);
      doc.fillColor(COLORS.primary).fontSize(12).font('Helvetica-Bold').text(`₹${leftToSpend.toFixed(2)}`, donutX + 10, donutCY - 6, { width: cardW - 20, align: 'center' });
      
      // Card 3 & 4: Income and Expenses
      const incomeX = donutX + cardW + 20;
      drawCard(doc, incomeX, topY, cardW, 40, { fillColor: COLORS.primaryPale });
      doc.fillColor(COLORS.dark).fontSize(9).font('Helvetica-Bold').text('TOTAL INCOME', incomeX + 10, topY + 8, { width: cardW - 20, align: 'center' });
      doc.fillColor(COLORS.success).fontSize(16).font('Helvetica-Bold').text(`₹${totalIncome.toFixed(2)}`, incomeX + 10, topY + 22, { width: cardW - 20, align: 'center' });
      
      drawCard(doc, incomeX, topY + 50, cardW, 40, { fillColor: COLORS.primaryPale });
      doc.fillColor(COLORS.dark).fontSize(9).font('Helvetica-Bold').text('TOTAL EXPENSES', incomeX + 10, topY + 58, { width: cardW - 20, align: 'center' });
      doc.fillColor(COLORS.danger).fontSize(16).font('Helvetica-Bold').text(`₹${totalExpense.toFixed(2)}`, incomeX + 10, topY + 72, { width: cardW - 20, align: 'center' });
      
      doc.y = topY + 110;

      // Cash Flow Chart
      doc.fillColor(COLORS.dark).fontSize(13).font('Helvetica-Bold').text('CASH FLOW SUMMARY', 40, doc.y);
      doc.y += 20;
      
      const chartData = [
        { category: 'Income', expected: totalIncome * 0.95, actual: totalIncome },
        { category: 'Expenses', expected: totalExpense * 0.85, actual: totalExpense },
        { category: 'Debt', expected: 0, actual: 0 },
        { category: 'Bills', expected: totalExpense * 0.25, actual: totalExpense * 0.3 },
        { category: 'Savings', expected: totalIncome * 0.2, actual: metrics.monthlySavings || 0 },
        { category: 'Subscriptions', expected: totalExpense * 0.08, actual: totalExpense * 0.1 }
      ];
      
      const chartY = doc.y;
      drawCard(doc, 40, chartY, pageWidth, 170, { fillColor: COLORS.white });
      drawHorizontalBarChart(doc, 50, chartY + 10, pageWidth - 20, 150, chartData);
      
      doc.y = chartY + 190;

      // Table Section
      doc.fillColor(COLORS.dark).fontSize(13).font('Helvetica-Bold').text('CASH FLOW SUMMARY', 40, doc.y);
      doc.y += 20;
      
      const tblY = doc.y;
      const tblW = pageWidth;
      
      drawCard(doc, 40, tblY, tblW, 180, { fillColor: COLORS.primaryPale });
      
      // Header
      doc.fillColor(COLORS.dark).fontSize(9).font('Helvetica-Bold')
        .text('CATEGORY', 50, tblY + 12, { width: 120 })
        .text('EXPECTED', 200, tblY + 12, { width: 80, align: 'right' })
        .text('ACTUAL', 310, tblY + 12, { width: 80, align: 'right' })
        .text('DIFF.', 420, tblY + 12, { width: 80, align: 'right' });
      
      let rY = tblY + 32;
      const rows = [
        { cat: 'Start Balance', exp: totalIncome, act: totalIncome, diff: 0 },
        { cat: 'Income', exp: totalIncome * 0.9, act: totalIncome, diff: totalIncome * 0.1 },
        { cat: 'Expenses', exp: totalExpense * 0.85, act: totalExpense, diff: -(totalExpense * 0.15) },
        { cat: 'Debt', exp: 0, act: 0, diff: 0 },
        { cat: 'Bills', exp: totalExpense * 0.25, act: totalExpense * 0.3, diff: -(totalExpense * 0.05) }
      ];
      
      rows.forEach((r, i) => {
        const bg = i % 2 === 0 ? COLORS.white : COLORS.light;
        drawRoundedRect(doc, 45, rY, tblW - 10, 20, 3, bg);
        
        doc.fillColor(COLORS.text).fontSize(8).font('Helvetica')
          .text(r.cat, 50, rY + 6, { width: 120 })
          .text(`₹${r.exp.toFixed(2)}`, 200, rY + 6, { width: 80, align: 'right' })
          .text(`₹${r.act.toFixed(2)}`, 310, rY + 6, { width: 80, align: 'right' })
          .fillColor(r.diff >= 0 ? COLORS.success : COLORS.danger)
          .text(`₹${Math.abs(r.diff).toFixed(2)}`, 420, rY + 6, { width: 80, align: 'right' });
        
        rY += 22;
      });
      
      // Leftover
      const leftover = totalIncome - totalExpense;
      drawRoundedRect(doc, 45, rY + 5, tblW - 10, 24, 3, COLORS.primary);
      doc.fillColor(COLORS.white).fontSize(9).font('Helvetica-Bold')
        .text('LEFTOVER', 50, rY + 12, { width: 120 })
        .text(`₹${leftover.toFixed(2)}`, 310, rY + 12, { width: 190, align: 'right' });

      // ===== PAGE 2: FINANCIAL HEALTH =====
      doc.addPage();
      doc.y = 50;

      // Financial Health Score
      const scoreColor = analyticsData.score >= 80 ? COLORS.success : analyticsData.score >= 60 ? COLORS.primary : analyticsData.score >= 40 ? COLORS.warning : COLORS.danger;
      const scoreY = doc.y;
      
      drawCard(doc, 40, scoreY, pageWidth, 100, { fillColor: scoreColor, radius: 12 });
      
      doc.save().fillColor(COLORS.white).opacity(0.25).circle(120, scoreY + 50, 35).fill().restore();
      doc.fillColor(COLORS.white).fontSize(32).font('Helvetica-Bold').text(`${analyticsData.score}`, 85, scoreY + 35, { width: 70, align: 'center' });
      doc.fontSize(10).font('Helvetica').text('%', 85, scoreY + 65, { width: 70, align: 'center' });
      doc.fontSize(18).font('Helvetica-Bold').text('Financial Health Score', 180, scoreY + 25);
      doc.fontSize(12).font('Helvetica').text(`Status: ${analyticsData.status}`, 180, scoreY + 50);
      doc.fontSize(9).text('Based on income, expenses, savings, and goal progress', 180, scoreY + 70, { width: 300 });
      
      doc.y = scoreY + 130;

      // Insights
      if (analyticsData.insights && analyticsData.insights.length > 0) {
        doc.fillColor(COLORS.dark).fontSize(16).font('Helvetica-Bold').text('💡 Key Insights', 40, doc.y);
        doc.y += 20;

        analyticsData.insights.slice(0, 4).forEach((insight, index) => {
          const insightY = doc.y;
          drawCard(doc, 40, insightY, pageWidth, 35, { fillColor: COLORS.primaryPale });
          doc.save().fillColor(COLORS.primary).circle(55, insightY + 17, 10).fill().restore();
          doc.fillColor(COLORS.white).fontSize(8).font('Helvetica-Bold').text(`${index + 1}`, 50, insightY + 12);
          doc.fillColor(COLORS.text).fontSize(9).font('Helvetica').text(insight, 75, insightY + 10, { width: pageWidth - 45 });
          doc.y = insightY + 45;
        });
      }

      // Recommendations
      if (analyticsData.recommendations && analyticsData.recommendations.length > 0) {
        doc.y += 10;
        doc.fillColor(COLORS.dark).fontSize(16).font('Helvetica-Bold').text('🎯 Recommendations', 40, doc.y);
        doc.y += 20;

        analyticsData.recommendations.slice(0, 4).forEach((rec, index) => {
          const recY = doc.y;
          drawCard(doc, 40, recY, pageWidth, 50, { fillColor: COLORS.light });
          doc.save().fillColor(COLORS.primary).circle(55, recY + 25, 12).fill().restore();
          doc.fillColor(COLORS.white).fontSize(9).font('Helvetica-Bold').text(`${index + 1}`, 49, recY + 19);
          
          const title = rec.title || rec;
          doc.fillColor(COLORS.dark).fontSize(11).font('Helvetica-Bold').text(title, 75, recY + 12, { width: pageWidth - 45 });
          if (rec.description) {
            doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica').text(rec.description, 75, recY + 28, { width: pageWidth - 45 });
          }
          doc.y = recY + 60;
        });
      }

      // Goals Progress
      if (analyticsData.goals && analyticsData.goals.length > 0) {
        if (doc.y > 650) doc.addPage();
        
        doc.y += 10;
        doc.fillColor(COLORS.dark).fontSize(16).font('Helvetica-Bold').text('🎯 Goals Progress', 40, doc.y);
        doc.y += 20;

        analyticsData.goals.slice(0, 4).forEach(goal => {
          const progress = goal.progress || 0;
          const progressColor = progress >= 75 ? COLORS.success : progress >= 50 ? COLORS.primary : progress >= 25 ? COLORS.warning : COLORS.danger;
          const goalY = doc.y;

          drawCard(doc, 40, goalY, pageWidth, 65, { fillColor: COLORS.light });
          doc.fillColor(COLORS.dark).fontSize(12).font('Helvetica-Bold').text(goal.title, 50, goalY + 12, { width: pageWidth - 20 });
          doc.fillColor(COLORS.textLight).fontSize(9).font('Helvetica').text(`₹${(goal.currentAmount || 0).toFixed(2)} of ₹${(goal.targetAmount || 0).toFixed(2)}`, 50, goalY + 30);
          
          // Progress bar
          const barW = pageWidth - 20;
          const barX = 50;
          const barY = goalY + 46;
          drawRoundedRect(doc, barX, barY, barW, 10, 5, COLORS.primaryPale);
          if (progress > 0) {
            const fillW = (barW * progress) / 100;
            drawRoundedRect(doc, barX, barY, fillW, 10, 5, progressColor);
          }
          doc.fillColor(progressColor).fontSize(10).font('Helvetica-Bold').text(`${Math.round(progress)}%`, barX + barW - 35, barY + 1);
          
          doc.y = goalY + 75;
        });
      }

      // Footer
      const footerY = doc.page.height - 50;
      doc.save().strokeColor(COLORS.primaryPale).lineWidth(1).moveTo(50, footerY).lineTo(pageWidth + 30, footerY).stroke().restore();
      doc.fillColor(COLORS.textLight).fontSize(8).font('Helvetica')
        .text('Generated by SmartGoal - Your Personal Finance Manager', 50, footerY + 15, { width: pageWidth - 20, align: 'center' });

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
  return generateGoalSetterReport(userData, {
    score: 75,
    status: 'Good',
    insights: ['Buyer analytics report'],
    recommendations: [],
    metrics: buyerAnalytics.overview || {},
    goals: []
  });
}

/**
 * Save PDF buffer to file
 */
export async function savePDFToFile(pdfBuffer, filename) {
  const uploadsDir = path.join(process.cwd(), 'uploads', 'reports');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, pdfBuffer);
  return filePath;
}
