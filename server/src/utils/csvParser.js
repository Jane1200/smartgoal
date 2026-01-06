import fs from 'fs/promises';
import Papa from 'papaparse';

/**
 * Parse CSV bank statement and extract transactions
 * Supports multiple bank statement formats
 */
export async function parseCSVStatement(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Parse CSV using papaparse
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase()
    });
    
    if (parseResult.errors.length > 0) {
      console.error('CSV parsing errors:', parseResult.errors);
    }
    
    const rows = parseResult.data;
    const transactions = [];
    
    // Common column name variations for different banks
    const columnMappings = {
      date: ['date', 'transaction date', 'txn date', 'value date', 'posting date', 'trans date'],
      description: ['description', 'particulars', 'narration', 'transaction details', 'details', 'remarks', 'transaction description'],
      debit: ['debit', 'withdrawal', 'debit amount', 'withdrawal amount', 'dr', 'amount debited'],
      credit: ['credit', 'deposit', 'credit amount', 'deposit amount', 'cr', 'amount credited'],
      amount: ['amount', 'transaction amount', 'txn amount'],
      balance: ['balance', 'closing balance', 'available balance']
    };
    
    // Detect column names
    const headers = parseResult.meta.fields || [];
    const columnMap = {};
    
    for (const [key, variations] of Object.entries(columnMappings)) {
      for (const variation of variations) {
        const foundHeader = headers.find(h => h.toLowerCase().includes(variation));
        if (foundHeader) {
          columnMap[key] = foundHeader;
          break;
        }
      }
    }
    
    console.log('Detected columns:', columnMap);
    
    // Parse each row
    for (const row of rows) {
      try {
        // Extract date
        const dateValue = row[columnMap.date];
        if (!dateValue) continue;
        
        let parsedDate;
        
        // Try parsing different date formats
        // Format: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD MMM YYYY, etc.
        const dateStr = dateValue.trim();
        
        // Try DD/MM/YYYY or DD-MM-YYYY
        if (dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/)) {
          const parts = dateStr.split(/[\/\-]/);
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          let year = parseInt(parts[2]);
          if (year < 100) year += 2000;
          parsedDate = new Date(year, month, day);
        }
        // Try YYYY-MM-DD
        else if (dateStr.match(/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/)) {
          parsedDate = new Date(dateStr);
        }
        // Try DD MMM YYYY (e.g., 15 Jan 2024)
        else {
          parsedDate = new Date(dateStr);
        }
        
        if (!parsedDate || isNaN(parsedDate.getTime())) {
          console.log('Invalid date:', dateStr);
          continue;
        }
        
        // Extract amount and type
        let amount = 0;
        let type = 'expense';
        
        // Check if there are separate debit/credit columns
        if (columnMap.debit && columnMap.credit) {
          const debitValue = row[columnMap.debit];
          const creditValue = row[columnMap.credit];
          
          if (creditValue && creditValue.trim() && creditValue.trim() !== '') {
            amount = parseFloat(creditValue.replace(/[,₹Rs\s]/g, ''));
            type = 'income';
          } else if (debitValue && debitValue.trim() && debitValue.trim() !== '') {
            amount = parseFloat(debitValue.replace(/[,₹Rs\s]/g, ''));
            type = 'expense';
          }
        }
        // Single amount column
        else if (columnMap.amount) {
          const amountValue = row[columnMap.amount];
          if (!amountValue || amountValue.trim() === '') continue;
          
          amount = parseFloat(amountValue.replace(/[,₹Rs\s]/g, ''));
          
          // Determine type from description or amount sign
          const description = row[columnMap.description] || '';
          if (amount < 0) {
            amount = Math.abs(amount);
            type = 'expense';
          } else {
            // Check description for income/expense keywords
            const isCr = /cr|credit|deposit|salary|credited|received/i.test(description);
            const isDr = /dr|debit|withdrawal|debited|withdrawn|payment|purchase/i.test(description);
            type = isCr ? 'income' : (isDr ? 'expense' : 'income');
          }
        }
        
        if (!amount || amount <= 0 || isNaN(amount)) {
          console.log('Invalid amount:', row);
          continue;
        }
        
        // Extract description
        const description = (row[columnMap.description] || 'Transaction').substring(0, 100);
        
        transactions.push({
          date: parsedDate,
          amount: amount,
          description: description.trim(),
          type: type,
          rawRow: row
        });
        
      } catch (err) {
        console.log('Failed to parse row:', row, err);
        continue;
      }
    }
    
    return {
      transactions,
      totalRows: rows.length,
      parsedRows: transactions.length,
      columnMap
    };
    
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error('Failed to parse CSV file: ' + error.message);
  }
}

/**
 * Validate CSV file structure
 */
export function validateCSVStructure(headers) {
  const requiredColumns = ['date', 'amount'];
  const hasRequiredColumns = requiredColumns.some(col => 
    headers.some(h => h.toLowerCase().includes(col))
  );
  
  return {
    valid: hasRequiredColumns,
    message: hasRequiredColumns 
      ? 'CSV structure is valid' 
      : 'CSV must contain at least Date and Amount columns'
  };
}