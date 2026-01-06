import Tesseract from 'tesseract.js';
import fs from 'fs/promises';
import { parseCSVStatement } from './csvParser.js';
import { parseBankStatementEnhanced } from './mlBankStatementParser.js';

/**
 * Extract text from image using OCR
 */
export async function extractTextFromImage(imagePath) {
  try {
    console.log('Starting OCR on image:', imagePath);
    
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'eng',
      {
        logger: info => console.log('OCR Progress:', info.status, info.progress)
      }
    );
    
    console.log('OCR completed. Extracted text length:', text.length);
    
    // Log first 2000 characters for debugging
    if (text.length > 0) {
      console.log('First 2000 chars of OCR text:');
      console.log(text.substring(0, 2000));
    }
    
    return text;
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw new Error('Failed to extract text from image: ' + error.message);
  }
}

/**
 * Extract text from PDF using dynamic import
 */
export async function extractTextFromPDF(pdfPath) {
  try {
    console.log('Starting PDF extraction for file:', pdfPath);
    // Dynamic import for CommonJS module
    const pdfParse = (await import('pdf-parse')).default;
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdfParse(dataBuffer);
    
    console.log('PDF parsing completed, text length:', data.text.length);
    
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

/**
 * Parse bank statement text and extract transactions
 * Enhanced version that handles real bank statement formats
 */
export function parseTransactions(text) {
  console.log('Parsing transactions from text, length:', text.length);
  
  // Log sample of the text for debugging
  if (text.length > 0) {
    console.log('Sample text (first 1000 chars):');
    console.log(text.substring(0, 1000));
  }
  
  // Special handling for GPay statements
  if (text.includes('Google Pay') || text.includes('Transaction statement')) {
    console.log('Detected GPay statement, using specialized parser');
    return parseGPayTransactions(text);
  }
  
  const transactions = [];
  const lines = text.split('\n');
  
  console.log('Total lines to process:', lines.length);
  
  // More comprehensive patterns for Indian bank statements
  const datePatterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,  // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,   // YYYY-MM-DD
    /(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})/i, // DD MMM YYYY
    /([0-9]{1,2}(st|nd|rd|th)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+[0-9]{2,4})/i, // DDth MMM YYYY
    /(\d{1,2}[\/\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\/\-]\d{2,4})/i, // DD-MMM-YY (like 1-Dec-25)
    /(\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),\s*\d{2,4})/i // DDMMM, YYYY (like 01Nov, 2025)
  ];
  
  // More flexible amount patterns
  const amountPatterns = [
    /(?:Rs\.?|₹|INR|Cr|Dr)\s*([0-9,]+\.?[0-9]*)/gi,
    /([0-9,]+\.?[0-9]*)\s*(?:Cr|Dr|Cr\.|Dr\.)/gi,
    /(?:Credit|Debit|Withdrawal|Deposit)\s*[:\s]*([0-9,]+\.?[0-9]*)/gi,
    /([0-9,]+\.?[0-9]*)\s*₹/gi, // Amount followed by ₹ symbol
    /₹\s*([0-9,]+\.?[0-9]*)/gi,  // ₹ symbol followed by amount
    /([0-9,]+\.?[0-9]*)\s*₹\s*[0-9,]+\.?[0-9]*\s*₹\s*([0-9,]+\.?[0-9]*)\s*₹/gi  // Multiple amounts with ₹ symbol
  ];
  
  // Keywords to identify transaction types
  const incomeKeywords = [
    'salary', 'credit', 'deposit', 'credited', 'received', 'transfer', 'refund', 
    'cashback', 'interest', 'dividend', 'commission', 'bonus', 'reversal', 'upi credit'
  ];
  
  const expenseKeywords = [
    'debit', 'withdrawal', 'debited', 'withdrawn', 'payment', 'purchase', 
    'paid', 'charged', 'deducted', 'atm', 'pos', 'online', 'upi debit'
  ];
  
  let processedLines = 0;
  let linesWithDates = 0;
  let linesWithAmounts = 0;
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 15) continue; // Skip very short lines
    
    processedLines++;
    
    // Log every 50th line for debugging
    if (processedLines % 50 === 0) {
      console.log(`Processing line ${processedLines}:`, line.substring(0, 100));
    }
    
    // Try to find date in the line
    let dateStr = null;
    let parsedDate = null;
    
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        dateStr = match[1];
        break;
      }
    }
    
    if (!dateStr) continue; // Skip lines without dates
    
    linesWithDates++;
    
    // Parse the date
    try {
      // Handle DD/MM/YYYY or DD-MM-YYYY
      if (dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/)) {
        const parts = dateStr.split(/[\/\-]/);
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        let year = parseInt(parts[2]);
        if (year < 100) year += year < 50 ? 2000 : 1900; // Handle 2-digit years
        parsedDate = new Date(year, month, day);
      }
      // Handle YYYY-MM-DD
      else if (dateStr.match(/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/)) {
        parsedDate = new Date(dateStr);
      }
      // Handle DD MMM YYYY
      else if (dateStr.match(/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}$/i)) {
        parsedDate = new Date(dateStr);
      }
      // Handle DDth MMM YYYY
      else if (dateStr.match(/^[0-9]{1,2}(st|nd|rd|th)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+[0-9]{2,4}$/i)) {
        // Remove ordinal suffix
        const cleanDate = dateStr.replace(/(st|nd|rd|th)/i, '');
        parsedDate = new Date(cleanDate);
      }
      
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        continue;
      }
      
      // Ensure date is reasonable (not in distant future or past)
      const now = new Date();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(now.getFullYear() - 5);
      
      if (parsedDate > now || parsedDate < fiveYearsAgo) {
        continue;
      }
    } catch (err) {
      continue; // Skip lines with invalid dates
    }
    
    // Look for amounts
    let amounts = [];
    
    // Try all amount patterns
    for (const pattern of amountPatterns) {
      const matches = [...line.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          amounts.push({
            value: parseFloat(match[1].replace(/,/g, '')),
            text: match[0],
            position: match.index
          });
        }
      }
    }
    
    // If no specific amount patterns found, try general number pattern
    if (amounts.length === 0) {
      const generalAmountPattern = /(?<!\d)([0-9,]+\.?[0-9]*)(?!\d)/g;
      const matches = [...line.matchAll(generalAmountPattern)];
      for (const match of matches) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0 && value < 10000000) { // Reasonable range
          amounts.push({
            value: value,
            text: match[0],
            position: match.index
          });
        }
      }
    }
    
    // Special handling for Indian bank statement format with multiple amounts
    if (amounts.length === 0 && /\d+[,.]?\d*\s*₹/.test(line)) {
      const indianAmountPattern = /([0-9,]+\.?[0-9]*)\s*₹/g;
      const matches = [...line.matchAll(indianAmountPattern)];
      for (const match of matches) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0 && value < 10000000) { // Reasonable range
          amounts.push({
            value: value,
            text: match[0],
            position: match.index
          });
        }
      }
    }
    
    if (amounts.length === 0) continue; // Skip lines without amounts
    
    linesWithAmounts++;
    
    // Initialize amount variables
    let amount = 0;
    let amountText = '';
    
    // Special handling for Indian bank statements with multiple amounts
    // Format: Debit/Credit Amount | Fee | Final Balance
    // We want the primary transaction amount (usually the first significant amount)
    if (amounts.length >= 2 && /DEPOSIT|WITHDRAWAL/.test(line)) {
      // Sort by position (order in line) rather than value
      amounts.sort((a, b) => a.position - b.position);
      
      // For deposits, take the first significant amount
      // For withdrawals, take the first significant amount
      for (const amt of amounts) {
        if (amt.value >= 1 && amt.value <= 1000000) { // Reasonable transaction range
          amount = amt.value;
          amountText = amt.text;
          break;
        }
      }
    } else {
      // Sort amounts by value (largest first, likely the transaction amount)
      amounts.sort((a, b) => b.value - a.value);
      
      // Take the largest reasonable amount
      for (const amt of amounts) {
        if (amt.value >= 1 && amt.value <= 1000000) { // Reasonable transaction range
          amount = amt.value;
          amountText = amt.text;
          break;
        }
      }
    }
    
    if (amount === 0) continue;
    
    // Extract description (everything except date and amount)
    let description = line;
    
    // Remove date
    description = description.replace(dateStr, '').trim();
    
    // Remove amount
    description = description.replace(amountText, '').trim();
    
    // Clean up extra spaces and symbols
    description = description.replace(/[\*\#\!\@\$\%\^\&\(\)]/g, '').trim();
    
    // If description is too short, try to get more context
    if (description.length < 5) {
      // Look at neighboring lines for context
      const contextLines = [];
      if (i > 0) contextLines.push(lines[i-1].trim());
      contextLines.push(line);
      if (i < lines.length - 1) contextLines.push(lines[i+1].trim());
      
      description = contextLines.join(' ').replace(dateStr, '').replace(amountText, '').trim();
      description = description.replace(/[\*\#\!\@\$\%\^\&\(\)]/g, '').trim();
    }
    
    // Limit description length
    description = description.substring(0, 100);
    
    // Determine transaction type with enhanced logic
    let type = 'expense'; // Default to expense
    
    const lowerLine = line.toLowerCase();
    
    // Check for explicit income keywords
    for (const keyword of incomeKeywords) {
      if (lowerLine.includes(keyword)) {
        type = 'income';
        break;
      }
    }
    
    // Check for explicit expense keywords (override if found)
    for (const keyword of expenseKeywords) {
      if (lowerLine.includes(keyword)) {
        type = 'expense';
        break;
      }
    }
    
    // Enhanced Cr/Dr detection
    if (type === 'expense') {
      if (/\bCr\b|\bCredit\b|\bCredited\b|\bDEPOSIT\b|\bINTEREST\b/i.test(line)) {
        type = 'income';
      } else if (/\bDr\b|\bDebit\b|\bDebited\b|\bWITHDRAWAL\b|\bCHARGE\b|\bFEE\b/i.test(line)) {
        type = 'expense';
      }
    }
    
    // Special handling for specific bank statement patterns
    if (/DEPOSIT|RECEIVED|CREDITED|UPI CREDIT/i.test(line)) {
      type = 'income';
    } else if (/WITHDRAWAL|PAID|DEBITED|UPI DEBIT/i.test(line)) {
      type = 'expense';
    }
    
    transactions.push({
      date: parsedDate,
      amount: amount,
      description: description || 'Transaction',
      type: type,
      rawLine: line
    });
    
    // Log first few transactions for debugging
    if (transactions.length <= 3) {
      console.log('Parsed transaction:', {
        date: parsedDate.toISOString().split('T')[0],
        amount: amount,
        description: description,
        type: type
      });
    }
  }
  
  console.log('Processed', processedLines, 'lines, found', transactions.length, 'transactions');
  console.log('Lines with dates:', linesWithDates, 'Lines with amounts:', linesWithAmounts);
  
  // If no transactions found, try ML-based approach
  if (transactions.length === 0) {
    console.log('No transactions found with strict parsing, trying ML-based approach...');
    const mlTransactions = parseBankStatementEnhanced(text);
    console.log('ML parsing found', mlTransactions.length, 'transactions');
    if (mlTransactions.length > 0) {
      return mlTransactions;
    }
    
    // Fallback to lenient approach
    console.log('Trying lenient approach...');
    const lenientTransactions = parseTransactionsLenient(text);
    console.log('Lenient parsing found', lenientTransactions.length, 'transactions');
    return lenientTransactions;
  }
  
  // Deduplicate transactions (sometimes OCR creates duplicates)
  const uniqueTransactions = [];
  const seen = new Set();
  
  for (const txn of transactions) {
    const key = `${txn.date.toISOString().split('T')[0]}_${txn.amount}_${txn.description.substring(0, 20)}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTransactions.push(txn);
    }
  }
  
  console.log('After deduplication:', uniqueTransactions.length, 'transactions');
  return uniqueTransactions;
}

/**
 * Main function to extract transactions from file
 */
export async function extractTransactionsFromFile(filePath, fileType) {
  let text = '';
  let transactions = [];
  
  console.log('Processing file:', filePath, 'Type:', fileType);
  
  if (fileType === 'text/csv' || fileType === 'application/vnd.ms-excel') {
    // CSV file - use CSV parser
    console.log('Parsing CSV file');
    const result = await parseCSVStatement(filePath);
    transactions = result.transactions;
    text = `CSV file parsed: ${result.parsedRows} transactions from ${result.totalRows} rows\nDetected columns: ${JSON.stringify(result.columnMap)}`;
    console.log('CSV parsing result:', result.parsedRows, 'transactions');
  } else if (fileType === 'application/pdf') {
    console.log('Parsing PDF file');
    text = await extractTextFromPDF(filePath);
    console.log('PDF text extracted, length:', text.length);
    transactions = parseTransactions(text);
    console.log('PDF parsing result:', transactions.length, 'transactions');
  } else if (fileType.startsWith('image/')) {
    console.log('Parsing image file');
    text = await extractTextFromImage(filePath);
    console.log('Image text extracted, length:', text.length);
    transactions = parseTransactions(text);
    console.log('Image parsing result:', transactions.length, 'transactions');
  } else {
    throw new Error('Unsupported file type. Please upload PDF, CSV, or image file.');
  }
  
  console.log('Total transactions extracted:', transactions.length);
  return { text, transactions };
}

/**
 * Lenient transaction parser for difficult OCR cases
 * Looks for any line with numbers that might be transactions
 */
export function parseTransactionsLenient(text) {
  console.log('Using lenient parser');
  
  const transactions = [];
  const lines = text.split('\n');
  
  // Very simple pattern: look for lines with dates and amounts
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 10) continue;
    
    // Look for any date-like pattern
    const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
    if (!dateMatch) continue;
    
    // Look for any number that might be an amount
    const amountMatches = [...line.matchAll(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g)];
    if (amountMatches.length === 0) continue;
    
    // Take the largest number as the amount
    let amount = 0;
    let amountText = '';
    for (const match of amountMatches) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (value > amount && value >= 1 && value <= 1000000) {
        amount = value;
        amountText = match[1];
      }
    }
    
    if (amount === 0) continue;
    
    // Parse date
    let parsedDate = null;
    const dateStr = dateMatch[1];
    
    try {
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        let year = parseInt(parts[2]);
        if (year < 100) year += year < 50 ? 2000 : 1900;
        parsedDate = new Date(year, month, day);
      } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[0].length === 4) {
          parsedDate = new Date(dateStr);
        } else {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          let year = parseInt(parts[2]);
          if (year < 100) year += year < 50 ? 2000 : 1900;
          parsedDate = new Date(year, month, day);
        }
      }
      
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        continue;
      }
      
      // Ensure date is reasonable
      const now = new Date();
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(now.getFullYear() - 5);
      
      if (parsedDate > now || parsedDate < fiveYearsAgo) {
        continue;
      }
    } catch (err) {
      continue;
    }
    
    // Extract description
    let description = line.replace(dateStr, '').replace(amountText, '').trim();
    description = description.replace(/[\*\#\!\@\$\%\^\&\(\)]/g, '').trim();
    description = description.substring(0, 100);
    
    // Determine transaction type with enhanced logic
    let type = 'expense'; // Default to expense
    
    const lowerLine = description.toLowerCase();
    
    // Income keywords
    const incomeKeywords = ['salary', 'wages', 'deposit', 'credit', 'interest', 'dividend', 'refund', 'reimbursement', 'cashback', 'commission', 'bonus', 'deposit', 'credited', 'received', 'upi credit'];
    
    // Expense keywords
    const expenseKeywords = ['withdrawal', 'debit', 'payment', 'purchase', 'buy', 'fee', 'charge', 'tax', 'fine', 'withdrawn', 'debited', 'paid', 'upi debit'];
    
    // Check for explicit income keywords
    for (const keyword of incomeKeywords) {
      if (lowerLine.includes(keyword)) {
        type = 'income';
        break;
      }
    }
    
    // Check for explicit expense keywords (override if found)
    for (const keyword of expenseKeywords) {
      if (lowerLine.includes(keyword)) {
        type = 'expense';
        break;
      }
    }
    
    // Special handling for specific bank statement patterns
    if (/DEPOSIT|RECEIVED|INTEREST|CREDITED|UPI CREDIT/i.test(line)) {
      type = 'income';
    } else if (/WITHDRAWAL|PAID|DEBITED|CHARGE|FEE|UPI DEBIT/i.test(line)) {
      type = 'expense';
    }
    
    transactions.push({
      date: parsedDate,
      amount: amount,
      description: description || 'Transaction',
      type: type,
      rawLine: line
    });
    
    if (transactions.length <= 3) {
      console.log('Lenient parsed transaction:', {
        date: parsedDate.toISOString().split('T')[0],
        amount: amount,
        description: description,
        type: type
      });
    }
  }
  
  return transactions;
}

/**
 * Specialized parser for GPay statements
 * @param {string} text - The extracted text from GPay statement
 * @returns {Array} Array of parsed transactions
 */
export function parseGPayTransactions(text) {
  console.log('Parsing GPay transactions');
  
  const transactions = [];
  const lines = text.split('\n');
  
  // GPay format pattern:
  // DDMMM,YYYY HH:MM AM/PM Paidto/Receivedfrom DESCRIPTION UPITransactionID:XXXXXX Paidto/from BANK ₹AMOUNT
  
  let currentDate = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Look for date lines (format: DDMMM,YYYY)
    const dateMatch = line.match(/^\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),\s*\d{4}/i);
    if (dateMatch) {
      // Parse the date
      try {
        // Format: 01Nov, 2025
        const parts = dateMatch[0].split(',');
        const datePart = parts[0];
        const yearPart = parts[1].trim();
        
        const day = parseInt(datePart.match(/^\d+/)[0]);
        const monthStr = datePart.replace(/^\d+/, '');
        
        // Convert month string to number
        const months = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        
        const month = months[monthStr];
        const year = parseInt(yearPart);
        
        currentDate = new Date(year, month, day);
        
        // Check if date is reasonable
        const now = new Date();
        const fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(now.getFullYear() - 5);
        
        if (currentDate > now || currentDate < fiveYearsAgo) {
          currentDate = null;
          continue;
        }
        
        console.log('Parsed GPay date:', currentDate.toISOString().split('T')[0]);
      } catch (err) {
        console.error('Error parsing GPay date:', err);
        currentDate = null;
        continue;
      }
      
      // Continue to next line to get transaction details
      continue;
    }
    
    // If we have a date and this line looks like a transaction
    // Look for lines that contain transaction information
    if (currentDate && (line.includes('Paid to') || line.includes('Received from')) && line.includes('₹')) {
      try {
        console.log('Processing GPay transaction line:', line);
        
        // Look for amount (format: ₹AMOUNT at the end of line)
        const amountMatch = line.match(/₹([0-9,]+\.?[0-9]*)$/);
        if (!amountMatch) {
          console.log('No amount found in line:', line);
          continue;
        }
        
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) {
          console.log('Invalid amount in line:', line);
          continue;
        }
        
        // Determine transaction type
        const isIncome = line.includes('Received from');
        const type = isIncome ? 'income' : 'expense';
        
        // Extract description (between "Paid to"/"Received from" and "UPI Transaction ID")
        let description = '';
        if (isIncome) {
          const descMatch = line.match(/Received from (.+?) UPITransactionID:/);
          if (descMatch) {
            description = descMatch[1].trim();
          }
        } else {
          const descMatch = line.match(/Paid to (.+?) UPITransactionID:/);
          if (descMatch) {
            description = descMatch[1].trim();
          }
        }
        
        // If we couldn't extract description, use the whole line part
        if (!description) {
          // Try to extract a more general description
          if (isIncome) {
            const descMatch = line.match(/Received from (.+?)\s+UPI/);
            if (descMatch) {
              description = descMatch[1].trim();
            }
          } else {
            const descMatch = line.match(/Paid to (.+?)\s+UPI/);
            if (descMatch) {
              description = descMatch[1].trim();
            }
          }
        }
        
        // If still no description, use a portion of the line
        if (!description) {
          description = line.substring(0, 50);
        }
        
        transactions.push({
          date: new Date(currentDate),
          amount: amount,
          description: description || 'GPay Transaction',
          type: type,
          rawLine: line
        });
        
        if (transactions.length <= 10) {
          console.log('Parsed GPay transaction:', {
            date: currentDate.toISOString().split('T')[0],
            amount: amount,
            description: description,
            type: type
          });
        }
      } catch (err) {
        console.error('Error parsing GPay transaction line:', line, err);
        continue;
      }
    }
  }
  
  // If we didn't find any transactions with the detailed parsing, try a simpler approach
  if (transactions.length === 0) {
    console.log('Detailed GPay parsing found no transactions, trying simplified approach');
    
    // Reset and try a simpler approach
    currentDate = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Look for date lines
      const dateMatch = line.match(/^\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),\s*\d{4}/i);
      if (dateMatch) {
        // Parse the date
        try {
          const parts = dateMatch[0].split(',');
          const datePart = parts[0];
          const yearPart = parts[1].trim();
          
          const day = parseInt(datePart.match(/^\d+/)[0]);
          const monthStr = datePart.replace(/^\d+/, '');
          
          const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          
          const month = months[monthStr];
          const year = parseInt(yearPart);
          
          currentDate = new Date(year, month, day);
        } catch (err) {
          console.error('Error parsing GPay date (simplified):', err);
          currentDate = null;
          continue;
        }
        continue;
      }
      
      // Look for transaction lines
      if (currentDate && line.includes('₹') && (line.includes('Paid to') || line.includes('Received from'))) {
        try {
          // Extract amount
          const amountMatch = line.match(/₹([0-9,]+\.?[0-9]*)$/);
          if (!amountMatch) continue;
          
          const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
          if (isNaN(amount) || amount <= 0) continue;
          
          // Determine type
          const isIncome = line.includes('Received from');
          const type = isIncome ? 'income' : 'expense';
          
          // Extract description
          let description = '';
          if (isIncome) {
            // Try different patterns
            const patterns = [
              /Received from ([^U]+)/,
              /Received from (.+?)\s+UPI/,
              /Received from (.+?)\s+Paid/
            ];
            
            for (const pattern of patterns) {
              const match = line.match(pattern);
              if (match) {
                description = match[1].trim();
                break;
              }
            }
          } else {
            // Try different patterns
            const patterns = [
              /Paid to ([^U]+)/,
              /Paid to (.+?)\s+UPI/,
              /Paid to (.+?)\s+Paid/
            ];
            
            for (const pattern of patterns) {
              const match = line.match(pattern);
              if (match) {
                description = match[1].trim();
                break;
              }
            }
          }
          
          // Fallback description
          if (!description) {
            description = line.substring(0, Math.min(50, line.indexOf('₹'))).trim();
          }
          
          transactions.push({
            date: new Date(currentDate),
            amount: amount,
            description: description || 'GPay Transaction',
            type: type,
            rawLine: line
          });
          
          console.log('Simplified parsed GPay transaction:', {
            date: currentDate.toISOString().split('T')[0],
            amount: amount,
            description: description,
            type: type
          });
        } catch (err) {
          console.error('Error in simplified GPay parsing:', err);
        }
      }
    }
  }
  
  console.log('GPay parser found', transactions.length, 'transactions');
  return transactions;
}
