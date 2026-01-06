/**
 * Categorize expenses based on description keywords
 * Returns suggestions for review to allow user confirmation
 */

// Expense categories with keywords
const expenseCategories = {
  'food': {
    keywords: ['restaurant', 'cafe', 'food', 'meal', 'dining', 'swiggy', 'zomato', 'dominos', 'mcdonalds', 'kfc', 'starbucks', 'coffee', 'tea', 'lunch', 'dinner', 'breakfast', 'grocery', 'vegetables', 'fruits', 'supermarket'],
    type: 'needs'
  },
  'transport': {
    keywords: ['fuel', 'petrol', 'diesel', 'car', 'bike', 'ola', 'uber', 'taxi', 'bus', 'train', 'flight', 'airline', 'airport', 'railway', 'metro', 'parking', 'toll', 'auto', 'cab'],
    type: 'needs'
  },
  'housing': {
    keywords: ['rent', 'emi', 'mortgage', 'house', 'home', 'electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'maintenance', 'repair', 'furniture', 'appliance'],
    type: 'needs'
  },
  'healthcare': {
    keywords: ['hospital', 'doctor', 'medicine', 'pharmacy', 'clinic', 'dentist', 'optician', 'insurance', 'medical', 'health', 'fitness', 'gym', 'yoga'],
    type: 'needs'
  },
  'education': {
    keywords: ['school', 'college', 'university', 'tuition', 'books', 'stationery', 'course', 'training', 'certification', 'exam', 'fees'],
    type: 'needs'
  },
  'shopping': {
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'clothing', 'fashion', 'electronics', 'mobile', 'laptop', 'shopping', 'purchase', 'buy', 'retail', 'store', 'mall', 'brand'],
    type: 'wants'
  },
  'entertainment': {
    keywords: ['movie', 'cinema', 'netflix', 'amazon prime', 'disney', 'spotify', 'music', 'concert', 'theatre', 'game', 'playstation', 'xbox', 'streaming', 'subscription'],
    type: 'wants'
  },
  'travel': {
    keywords: ['hotel', 'resort', 'vacation', 'holiday', 'tour', 'trip', 'booking', 'oyo', 'makemytrip', 'goibibo', 'airbnb', 'ola', 'uber', 'ola money'],
    type: 'wants'
  },
  'personal_care': {
    keywords: ['salon', 'spa', 'beauty', 'cosmetics', 'haircut', 'massage', 'skincare', 'makeup', 'perfume', 'fragrance'],
    type: 'wants'
  },
  'utilities': {
    keywords: ['phone', 'mobile', 'recharge', 'bill', 'dth', 'cable', 'subscription', 'membership', 'fee'],
    type: 'needs'
  },
  'other': {
    keywords: [],
    type: 'needs'
  }
};

// Income categories with keywords
const incomeCategories = {
  'salary': {
    keywords: ['salary', 'wages', 'payroll', 'compensation', 'income', 'earnings', 'take home', 'net pay']
  },
  'freelance': {
    keywords: ['freelance', 'consulting', 'contract', 'service fee', 'professional services']
  },
  'investment': {
    keywords: ['dividend', 'interest', 'capital gains', 'roi', 'return on investment', 'mutual fund', 'fixed deposit', 'fd', 'sip']
  },
  'business': {
    keywords: ['revenue', 'sales', 'profit', 'business income', 'commission', 'royalty']
  },
  'gift': {
    keywords: ['gift', 'present', 'donation', 'contribution', 'award', 'prize', 'scholarship']
  },
  'refund': {
    keywords: ['refund', 'reimbursement', 'rebate', 'cashback', 'return']
  },
  'other_income': {
    keywords: ['other', 'miscellaneous']
  }
};

/**
 * Get category suggestions for a transaction
 * @param {Object} transaction - Transaction object with description and amount
 * @returns {Object} Suggested category and confidence level
 */
export function getCategorySuggestion(transaction) {
  const description = (transaction.description || '').toLowerCase();
  
  // Determine if this is likely income or expense based on keywords
  const incomeKeywords = ['salary', 'wages', 'deposit', 'credit', 'interest', 'dividend', 'refund', 'reimbursement', 'cashback', 'commission', 'bonus', 'received', 'upi credit', 'credited'];
  const expenseKeywords = ['withdrawal', 'debit', 'payment', 'purchase', 'buy', 'fee', 'charge', 'tax', 'fine', 'paid', 'upi debit', 'debited'];
  
  let isLikelyIncome = false;
  let isLikelyExpense = false;
  
  // Check for income indicators
  for (const keyword of incomeKeywords) {
    if (description.includes(keyword)) {
      isLikelyIncome = true;
      break;
    }
  }
  
  // Check for expense indicators
  for (const keyword of expenseKeywords) {
    if (description.includes(keyword)) {
      isLikelyExpense = true;
      break;
    }
  }
  
  // If we have conflicting signals, look at the transaction type from OCR
  if (isLikelyIncome && isLikelyExpense) {
    if (transaction.type === 'income') {
      isLikelyIncome = true;
      isLikelyExpense = false;
    } else if (transaction.type === 'expense') {
      isLikelyIncome = false;
      isLikelyExpense = true;
    }
  }
  
  // If still unclear, default to expense but flag for review
  if (!isLikelyIncome && !isLikelyExpense) {
    isLikelyExpense = true; // Default to expense
  }
  
  // Determine transaction type
  const transactionType = isLikelyIncome ? 'income' : 'expense';
  
  // For income transactions, categorize differently
  if (transactionType === 'income') {
    let bestIncomeMatch = 'other_income';
    let bestIncomeScore = 0;
    
    // Check each income category for keyword matches
    for (const [category, data] of Object.entries(incomeCategories)) {
      let score = 0;
      
      // Count keyword matches
      for (const keyword of data.keywords) {
        if (description.includes(keyword)) {
          score += 1;
        }
      }
      
      // Bonus for exact matches at word boundaries
      for (const keyword of data.keywords) {
        const regex = new RegExp(`\b${keyword}\b`, 'i');
        if (regex.test(description)) {
          score += 2;
        }
      }
      
      if (score > bestIncomeScore) {
        bestIncomeScore = score;
        bestIncomeMatch = category;
      }
    }
    
    // Confidence based on match score
    let confidence = 0.3; // Default low confidence
    if (bestIncomeScore >= 3) {
      confidence = 0.9; // High confidence
    } else if (bestIncomeScore >= 2) {
      confidence = 0.7; // Medium confidence
    } else if (bestIncomeScore >= 1) {
      confidence = 0.5; // Low confidence
    }
    
    return {
      suggestedCategory: bestIncomeMatch,
      suggestedType: 'income',
      categoryType: 'income',
      confidence: confidence,
      needsReview: confidence < 0.7 // Flag for review if low confidence
    };
  } else {
    // For expense transactions, use existing logic
    let bestMatch = 'other';
    let bestScore = 0;
    let categoryType = 'needs';
    
    // Check each category for keyword matches
    for (const [category, data] of Object.entries(expenseCategories)) {
      let score = 0;
      
      // Count keyword matches
      for (const keyword of data.keywords) {
        if (description.includes(keyword)) {
          score += 1;
        }
      }
      
      // Bonus for exact matches at word boundaries
      for (const keyword of data.keywords) {
        const regex = new RegExp(`\b${keyword}\b`, 'i');
        if (regex.test(description)) {
          score += 2;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = category;
        categoryType = data.type;
      }
    }
    
    // Confidence based on match score
    let confidence = 0.3; // Default low confidence
    if (bestScore >= 3) {
      confidence = 0.9; // High confidence
    } else if (bestScore >= 2) {
      confidence = 0.7; // Medium confidence
    } else if (bestScore >= 1) {
      confidence = 0.5; // Low confidence
    }
    
    return {
      suggestedCategory: bestMatch,
      suggestedType: 'expense',
      categoryType: categoryType,
      confidence: confidence,
      needsReview: confidence < 0.7 // Flag for review if low confidence
    };
  }
}

/**
 * Get suggestions for a list of transactions
 * @param {Array} transactions - Array of transaction objects
 * @returns {Array} Transactions with category suggestions
 */
export function getSuggestionsForReview(transactions) {
  return transactions.map(transaction => {
    const suggestion = getCategorySuggestion(transaction);
    
    return {
      ...transaction,
      ...suggestion,
      // Preserve original values but allow override
      category: suggestion.suggestedCategory,
      type: suggestion.suggestedType
    };
  });
}

/**
 * Validate category
 * @param {string} category - Category to validate
 * @returns {boolean} Whether category is valid
 */
export function isValidCategory(category) {
  return Object.keys(expenseCategories).includes(category);
}

/**
 * Get all available categories
 * @returns {Array} List of category names
 */
export function getAllCategories() {
  return Object.keys(expenseCategories);
}

/**
 * Get category type (needs/wants)
 * @param {string} category - Category name
 * @returns {string} Category type
 */
export function getCategoryType(category) {
  return expenseCategories[category]?.type || 'needs';
}