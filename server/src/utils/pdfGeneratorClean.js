/**
 * Clean Professional PDF Report Generator
 * Simple, neat, and properly aligned
 */

import PDFDocument from 'pdfkit';

const COLORS = {
  primary: '#2563eb',
  success: '#10b981',
  danger: '#ef4444',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  dark: '#111827',
  white: '#ffffff',
};

/**
 * Generate Clean Financial Report
 */
export async function generateCleanFinancialReport(userData, financialData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50, 
        size: 'A4',
        bufferPages: true
      });
      
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100;
      const currentDate = new Date();
      const monthYear = currentDate.toLocaleDateString('en-IN', { 
        month: 'long', 
        year: 'numeric' 
      });

      // ===== HEADER =====
      doc.rect(0, 0, doc.page.width, 80).fill(COLORS.primary);
      
      doc.fillColor(COLORS.white)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('SmartGoal Financial Report', 50, 25);
      
      doc.fontSize(11)
         .font('Helvetica')
         .text(monthYear, 50, 52);
      
      doc.fontSize(10)
         .text(userData.name || 'User', doc.page.width - 200, 30, { 
           width: 150, 
           align: 'right' 
         });
      
      doc.text(currentDate.toLocaleDateString('en-IN'), doc.page.width - 200, 50, { 
        width: 150, 
        align: 'right' 
      });

      doc.y = 110;

      // ===== SUMMARY SECTION =====
      doc.fillColor(COLORS.dark)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Financial Summary', 50, doc.y);
      
      doc.y += 25;

      // Summary boxes
      const boxWidth = (pageWidth - 20) / 3;
      const boxHeight = 80;
      const startY = doc.y;

      // Income Box
      doc.rect(50, startY, boxWidth, boxHeight)
         .fillAndStroke(COLORS.lightGray, COLORS.gray);
      
      doc.fillColor(COLORS.gray)
         .fontSize(10)
         .font('Helvetica')
         .text('Total Income', 60, startY + 15, { width: boxWidth - 20 });
      
      doc.fillColor(COLORS.success)
         .fontSize(20)
         .font('Helvetica-Bold')
         .text(`₹${(financialData.totalIncome || 0).toLocaleString('en-IN')}`, 
               60, startY + 40, { width: boxWidth - 20 });

      // Expense Box
      const expenseX = 50 + boxWidth + 10;
      doc.rect(expenseX, startY, boxWidth, boxHeight)
         .fillAndStroke(COLORS.lightGray, COLORS.gray);
      
      doc.fillColor(COLORS.gray)
         .fontSize(10)
         .font('Helvetica')
         .text('Total Expenses', expenseX + 10, startY + 15, { width: boxWidth - 20 });
      
      doc.fillColor(COLORS.danger)
         .fontSize(20)
         .font('Helvetica-Bold')
         .text(`₹${(financialData.totalExpenses || 0).toLocaleString('en-IN')}`, 
               expenseX + 10, startY + 40, { width: boxWidth - 20 });

      // Savings Box
      const savingsX = expenseX + boxWidth + 10;
      doc.rect(savingsX, startY, boxWidth, boxHeight)
         .fillAndStroke(COLORS.lightGray, COLORS.gray);
      
      doc.fillColor(COLORS.gray)
         .fontSize(10)
         .font('Helvetica')
         .text('Net Savings', savingsX + 10, startY + 15, { width: boxWidth - 20 });
      
      const savings = (financialData.totalIncome || 0) - (financialData.totalExpenses || 0);
      doc.fillColor(savings >= 0 ? COLORS.success : COLORS.danger)
         .fontSize(20)
         .font('Helvetica-Bold')
         .text(`₹${savings.toLocaleString('en-IN')}`, 
               savingsX + 10, startY + 40, { width: boxWidth - 20 });

      doc.y = startY + boxHeight + 30;

      // ===== BREAKDOWN SECTION =====
      doc.fillColor(COLORS.dark)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Cash Breakdown', 50, doc.y);
      
      doc.y += 25;

      // Table header
      const tableY = doc.y;
      doc.rect(50, tableY, pageWidth, 30)
         .fill(COLORS.primary);
      
      doc.fillColor(COLORS.white)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Category', 60, tableY + 10, { width: 150 })
         .text('Income', 220, tableY + 10, { width: 100, align: 'right' })
         .text('Expense', 330, tableY + 10, { width: 100, align: 'right' })
         .text('Balance', 440, tableY + 10, { width: 100, align: 'right' });

      // Table rows
      let rowY = tableY + 30;
      const rows = [
        {
          category: 'Cash in Hand',
          income: financialData.cashIncome || 0,
          expense: financialData.cashExpense || 0,
          balance: (financialData.cashIncome || 0) - (financialData.cashExpense || 0)
        },
        {
          category: 'Cash at Bank',
          income: financialData.bankIncome || 0,
          expense: financialData.bankExpense || 0,
          balance: (financialData.bankIncome || 0) - (financialData.bankExpense || 0)
        }
      ];

      rows.forEach((row, index) => {
        const bgColor = index % 2 === 0 ? COLORS.white : COLORS.lightGray;
        doc.rect(50, rowY, pageWidth, 35)
           .fill(bgColor);
        
        doc.fillColor(COLORS.dark)
           .fontSize(10)
           .font('Helvetica')
           .text(row.category, 60, rowY + 12, { width: 150 });
        
        doc.fillColor(COLORS.success)
           .text(`₹${row.income.toLocaleString('en-IN')}`, 220, rowY + 12, { 
             width: 100, 
             align: 'right' 
           });
        
        doc.fillColor(COLORS.danger)
           .text(`₹${row.expense.toLocaleString('en-IN')}`, 330, rowY + 12, { 
             width: 100, 
             align: 'right' 
           });
        
        doc.fillColor(row.balance >= 0 ? COLORS.success : COLORS.danger)
           .font('Helvetica-Bold')
           .text(`₹${row.balance.toLocaleString('en-IN')}`, 440, rowY + 12, { 
             width: 100, 
             align: 'right' 
           });
        
        rowY += 35;
      });

      // Total row
      doc.rect(50, rowY, pageWidth, 40)
         .fill(COLORS.primary);
      
      doc.fillColor(COLORS.white)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('TOTAL', 60, rowY + 14, { width: 150 });
      
      doc.text(`₹${(financialData.totalIncome || 0).toLocaleString('en-IN')}`, 
               220, rowY + 14, { width: 100, align: 'right' });
      
      doc.text(`₹${(financialData.totalExpenses || 0).toLocaleString('en-IN')}`, 
               330, rowY + 14, { width: 100, align: 'right' });
      
      doc.text(`₹${savings.toLocaleString('en-IN')}`, 
               440, rowY + 14, { width: 100, align: 'right' });

      doc.y = rowY + 60;

      // ===== SAVINGS RATE =====
      if (doc.y > 650) {
        doc.addPage();
        doc.y = 50;
      }

      doc.fillColor(COLORS.dark)
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Savings Analysis', 50, doc.y);
      
      doc.y += 25;

      const savingsRate = financialData.totalIncome > 0 
        ? ((savings / financialData.totalIncome) * 100).toFixed(1)
        : 0;

      doc.rect(50, doc.y, pageWidth, 60)
         .fillAndStroke(COLORS.lightGray, COLORS.gray);
      
      doc.fillColor(COLORS.gray)
         .fontSize(11)
         .font('Helvetica')
         .text('Savings Rate', 60, doc.y + 15);
      
      doc.fillColor(COLORS.primary)
         .fontSize(24)
         .font('Helvetica-Bold')
         .text(`${savingsRate}%`, 60, doc.y + 35);
      
      // Savings recommendation
      let recommendation = '';
      if (savingsRate >= 20) {
        recommendation = 'Excellent! You are saving well.';
      } else if (savingsRate >= 10) {
        recommendation = 'Good savings rate. Try to increase it further.';
      } else {
        recommendation = 'Consider reducing expenses to save more.';
      }
      
      doc.fillColor(COLORS.gray)
         .fontSize(10)
         .font('Helvetica')
         .text(recommendation, 250, doc.y + 30, { width: 250 });

      // ===== FOOTER =====
      const footerY = doc.page.height - 50;
      doc.moveTo(50, footerY)
         .lineTo(doc.page.width - 50, footerY)
         .stroke(COLORS.gray);
      
      doc.fillColor(COLORS.gray)
         .fontSize(9)
         .font('Helvetica')
         .text('Generated by SmartGoal', 50, footerY + 10, { 
           width: pageWidth, 
           align: 'center' 
         });
      
      doc.text(`Page ${doc.bufferedPageRange().count}`, 50, footerY + 25, { 
        width: pageWidth, 
        align: 'center' 
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
