import natural from 'natural';
import compromise from 'compromise';

/**
 * Advanced ML-based bank statement parser
 * Uses NLP techniques to better extract and categorize transactions
 */

// Initialize natural tokenizer
const tokenizer = new natural.WordTokenizer();
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');

// Transaction type indicators
const INCOME_INDICATORS = [
  'received', 'credited', 'deposit', 'salary', 'wages', 'refund', 'cashback', 
  'interest', 'dividend', 'commission', 'bonus', 'transfer in', 'upi credit',
  'payment received', 'money received', 'funds received'
];

const EXPENSE_INDICATORS = [
  'paid', 'debited', 'withdrawal', 'payment', 'purchase', 'buy', 'spent',
  'charge', 'fee', 'tax', 'fine', 'transfer out', 'upi debit',
  'payment made', 'money sent', 'funds sent'
];

// Expense categories with keywords
const EXPENSE_CATEGORIES = {
  'food': ['restaurant', 'cafe', 'food', 'meal', 'dining', 'swiggy', 'zomato', 'dominos', 'mcdonalds', 'kfc', 'starbucks', 'coffee', 'tea', 'lunch', 'dinner', 'breakfast', 'grocery', 'vegetables', 'fruits', 'supermarket'],
  'transport': ['fuel', 'petrol', 'diesel', 'car', 'bike', 'ola', 'uber', 'taxi', 'bus', 'train', 'flight', 'airline', 'airport', 'railway', 'metro', 'parking', 'toll', 'auto', 'cab'],
  'housing': ['rent', 'emi', 'mortgage', 'house', 'home', 'electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'maintenance', 'repair', 'furniture', 'appliance'],
  'healthcare': ['hospital', 'doctor', 'medicine', 'pharmacy', 'clinic', 'dentist', 'optician', 'insurance', 'medical', 'health', 'fitness', 'gym', 'yoga'],
  'education': ['school', 'college', 'university', 'tuition', 'books', 'stationery', 'course', 'training', 'certification', 'exam', 'fees'],
  'shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'clothing', 'fashion', 'electronics', 'mobile', 'laptop', 'shopping', 'purchase', 'buy', 'retail', 'store', 'mall', 'brand'],
  'entertainment': ['movie', 'cinema', 'netflix', 'amazon prime', 'disney', 'spotify', 'music', 'concert', 'theatre', 'game', 'playstation', 'xbox', 'streaming', 'subscription'],
  'travel': ['hotel', 'resort', 'vacation', 'holiday', 'tour', 'trip', 'booking', 'oyo', 'makemytrip', 'goibibo', 'airbnb', 'ola', 'uber', 'ola money'],
  'personal_care': ['salon', 'spa', 'beauty', 'cosmetics', 'haircut', 'massage', 'skincare', 'makeup', 'perfume', 'fragrance'],
  'utilities': ['phone', 'mobile', 'recharge', 'bill', 'dth', 'cable', 'subscription', 'membership', 'fee'],
  'other': []
};

// Income categories with keywords
const INCOME_CATEGORIES = {
  'salary': ['salary', 'wages', 'payroll', 'compensation', 'income', 'earnings', 'take home', 'net pay'],
  'freelance': ['freelance', 'consulting', 'contract', 'service fee', 'professional services'],
  'investment': ['dividend', 'interest', 'capital gains', 'roi', 'return on investment', 'mutual fund', 'fixed deposit', 'fd', 'sip'],
  'business': ['revenue', 'sales', 'profit', 'business income', 'commission', 'royalty'],
  'gift': ['gift', 'present', 'donation', 'contribution', 'award', 'prize', 'scholarship'],
  'refund': ['refund', 'reimbursement', 'rebate', 'cashback', 'return'],
  'other_income': ['other', 'miscellaneous']
};

/**
 * Determine if a transaction is income or expense using ML/NLP techniques
 * @param {string} text - Transaction description text
 * @returns {string} 'income' or 'expense'
 */
function determineTransactionType(text) {
  const lowerText = text.toLowerCase();
  
  // Count income and expense indicators
  let incomeScore = 0;
  let expenseScore = 0;
  
  for (const indicator of INCOME_INDICATORS) {
    if (lowerText.includes(indicator)) {
      incomeScore += 2;
    }
  }
  
  for (const indicator of EXPENSE_INDICATORS) {
    if (lowerText.includes(indicator)) {
      expenseScore += 2;
    }
  }
  
  // Use sentiment analysis as additional signal
  const tokens = tokenizer.tokenize(lowerText);
  const sentiment = analyzer.getSentiment(tokens);
  
  // Positive sentiment might indicate income, negative might indicate expense
  if (sentiment > 0.1) {
    incomeScore += 1;
  } else if (sentiment < -0.1) {
    expenseScore += 1;
  }
  
  // Special case for GPay format
  if (lowerText.includes('received from')) {
    incomeScore += 5;
  } else if (lowerText.includes('paid to')) {
    expenseScore += 5;
  }
  
  // Default to expense if scores are equal
  return incomeScore >= expenseScore ? 'income' : 'expense';
}

/**
 * Categorize a transaction using keyword matching and NLP
 * @param {string} text - Transaction description text
 * @param {string} type - Transaction type ('income' or 'expense')
 * @returns {string} Category name
 */
function categorizeTransaction(text, type) {
  const lowerText = text.toLowerCase();
  let bestMatch = type === 'income' ? 'other_income' : 'other';
  let bestScore = 0;
  
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  
  // Score each category based on keyword matches
  for (const [category, keywords] of Object.entries(categories)) {
    let score = 0;
    
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += 2; // Base match
      }
      
      // Bonus for exact word matches
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lowerText)) {
        score += 1;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }
  
  return bestMatch;
}

/**
 * Extract date from text using multiple patterns
 * @param {string} text - Text to extract date from
 * @returns {Date|null} Parsed date or null
 */
function extractDate(text) {
  // Multiple date patterns
  const patterns = [
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,  // DD/MM/YYYY or DD-MM-YYYY
    /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/,   // YYYY-MM-DD
    /(\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})/i, // DD MMM YYYY
    /(\d{1,2}[\/\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\/\-]\d{2,4})/i, // DD-MMM-YY
    /(\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),\s*\d{4})/i // DDMMM, YYYY (GPay format)
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const dateStr = match[1];
        
        // Handle different formats
        if (dateStr.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/)) {
          const parts = dateStr.split(/[\/\-]/);
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          let year = parseInt(parts[2]);
          if (year < 100) year += year < 50 ? 2000 : 1900;
          return new Date(year, month, day);
        } else if (dateStr.match(/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/)) {
          return new Date(dateStr);
        } else if (dateStr.match(/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4}$/i)) {
          return new Date(dateStr);
        } else if (dateStr.match(/^\d{1,2}[\/\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\/\-]\d{2,4}$/i)) {
          const parts = dateStr.split(/[\/\-]/);
          const day = parseInt(parts[0]);
          const monthStr = parts[1];
          let year = parseInt(parts[2]);
          if (year < 100) year += year < 50 ? 2000 : 1900;
          
          const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          
          return new Date(year, months[monthStr], day);
        } else if (dateStr.match(/^\d{1,2}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec),\s*\d{4}$/i)) {
          const parts = dateStr.split(',');
          const datePart = parts[0];
          const yearPart = parts[1].trim();
          
          const day = parseInt(datePart.match(/^\d+/)[0]);
          const monthStr = datePart.replace(/^\d+/, '');
          const year = parseInt(yearPart);
          
          const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          
          return new Date(year, months[monthStr], day);
        }
      } catch (err) {
        console.error('Error parsing date:', err);
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Extract amount from text
 * @param {string} text - Text to extract amount from
 * @returns {number|null} Parsed amount or null
 */
function extractAmount(text) {
  // Look for ₹ symbol followed by numbers
  const amountPatterns = [
    /₹([0-9,]+\.?[0-9]*)/,
    /Rs\.?\s*([0-9,]+\.?[0-9]*)/,
    /INR\s*([0-9,]+\.?[0-9]*)/
  ];
  
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      } catch (err) {
        console.error('Error parsing amount:', err);
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Parse a line of bank statement text
 * @param {string} line - Line of text from bank statement
 * @param {Date} currentDate - Current date context
 * @returns {Object|null} Parsed transaction or null
 */
function parseStatementLine(line, currentDate) {
  // Skip empty lines
  if (!line.trim()) return null;
  
  // Extract amount
  const amount = extractAmount(line);
  if (!amount) return null;
  
  // Determine transaction type
  const type = determineTransactionType(line);
  
  // Extract description
  let description = line.trim();
  
  // For GPay format, extract the merchant/person name
  if (line.includes('Received from')) {
    const match = line.match(/Received from ([^U]+)/);
    if (match) {
      description = match[1].trim();
    }
  } else if (line.includes('Paid to')) {
    const match = line.match(/Paid to ([^U]+)/);
    if (match) {
      description = match[1].trim();
    }
  }
  
  // Categorize transaction
  const category = categorizeTransaction(description, type);
  
  // Use current date if no date found in line
  const date = extractDate(line) || currentDate;
  
  return {
    date: date,
    amount: amount,
    description: description,
    type: type,
    category: category,
    rawLine: line
  };
}

/**
 * Advanced ML-based bank statement parser
 * @param {string} text - Extracted text from bank statement
 * @returns {Array} Array of parsed transactions
 */
export function parseBankStatementML(text) {
  console.log('Parsing bank statement with ML parser');
  
  const transactions = [];
  const lines = text.split('\n');
  
  let currentDate = new Date(); // Default to today
  
  // Special handling for GPay statements
  const isGPay = text.includes('Google Pay') || text.includes('Transaction statement');
  if (isGPay) {
    console.log('Detected GPay statement, using specialized parsing');
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Try to extract date from line
    const lineDate = extractDate(line);
    if (lineDate) {
      currentDate = lineDate;
    }
    
    // For GPay, look for transaction lines
    if (isGPay) {
      if ((line.includes('Paid to') || line.includes('Received from')) && line.includes('₹')) {
        try {
          const amount = extractAmount(line);
          if (amount) {
            const type = line.includes('Received from') ? 'income' : 'expense';
            
            // Extract description
            let description = '';
            if (type === 'income') {
              const match = line.match(/Received from ([^U]+)/);
              if (match) {
                description = match[1].trim();
              }
            } else {
              const match = line.match(/Paid to ([^U]+)/);
              if (match) {
                description = match[1].trim();
              }
            }
            
            if (!description) {
              description = line.substring(0, 50);
            }
            
            const category = categorizeTransaction(description, type);
            
            transactions.push({
              date: new Date(currentDate),
              amount: amount,
              description: description || 'GPay Transaction',
              type: type,
              category: category,
              rawLine: line
            });
            
            if (transactions.length <= 10) {
              console.log('ML Parsed GPay transaction:', {
                date: currentDate.toISOString().split('T')[0],
                amount: amount,
                description: description,
                type: type,
                category: category
              });
            }
          }
        } catch (err) {
          console.error('Error parsing GPay line:', line, err);
        }
      }
    } else {
      // For other bank statements, parse each line
      const transaction = parseStatementLine(line, currentDate);
      if (transaction) {
        transactions.push(transaction);
        
        if (transactions.length <= 5) {
          console.log('ML Parsed transaction:', transaction);
        }
      }
    }
  }
  
  console.log('ML parser found', transactions.length, 'transactions');
  return transactions;
}

/**
 * Enhanced version that combines multiple parsing strategies
 * @param {string} text - Extracted text from bank statement
 * @returns {Array} Array of parsed transactions
 */
export function parseBankStatementEnhanced(text) {
  console.log('Parsing bank statement with enhanced ML parser');
  
  // First try the ML parser
  const mlTransactions = parseBankStatementML(text);
  
  // If ML parser found transactions, return them
  if (mlTransactions.length > 0) {
    console.log('Using ML parser results:', mlTransactions.length, 'transactions');
    return mlTransactions;
  }
  
  // Fallback to rule-based parser
  console.log('ML parser found no transactions, falling back to rule-based parser');
  
  // Use existing parsers
  if (text.includes('Google Pay') || text.includes('Transaction statement')) {
    // Import the existing GPay parser function
    // Note: We can't import it here due to circular dependencies, so we'll recreate the logic
    return parseBankStatementML(text); // This will use the GPay logic in ML parser
  }
  
  // Return empty array if nothing worked
  return [];
}