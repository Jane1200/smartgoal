import Finance from "../models/Finance.js";

/**
 * Check if user has sufficient balance to add an expense
 * @param {string} userId - User ID
 * @param {number} expenseAmount - Amount of expense to add
 * @param {string} paymentMethod - Payment method (cash, upi, other)
 * @returns {Promise<{valid: boolean, message?: string, currentBalance?: number}>}
 */
export async function validateExpenseBalance(userId, expenseAmount, paymentMethod = null) {
  try {
    // Get all user's finance entries
    const allEntries = await Finance.find({ userId });

    // Calculate total income and expenses
    let totalIncome = 0;
    let totalExpenses = 0;

    // If paymentMethod is specified, only check that payment method's balance
    if (paymentMethod) {
      totalIncome = allEntries
        .filter(e => e.type === 'income' && e.paymentMethod === paymentMethod)
        .reduce((sum, e) => sum + e.amount, 0);
      
      totalExpenses = allEntries
        .filter(e => e.type === 'expense' && e.paymentMethod === paymentMethod)
        .reduce((sum, e) => sum + e.amount, 0);
    } else {
      // Check overall balance
      totalIncome = allEntries
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + e.amount, 0);
      
      totalExpenses = allEntries
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + e.amount, 0);
    }

    const currentBalance = totalIncome - totalExpenses;
    const newBalance = currentBalance - expenseAmount;

    if (newBalance < 0) {
      const paymentMethodLabel = paymentMethod === 'cash' ? 'Cash in Hand' : 
                                  paymentMethod === 'upi' ? 'UPI/Bank' : 
                                  'overall';
      
      return {
        valid: false,
        message: `Insufficient balance. Your ${paymentMethodLabel} balance is ₹${currentBalance.toLocaleString('en-IN')}. You cannot add an expense of ₹${expenseAmount.toLocaleString('en-IN')}.`,
        currentBalance,
        requiredBalance: expenseAmount,
        shortfall: Math.abs(newBalance)
      };
    }

    return {
      valid: true,
      currentBalance,
      newBalance
    };
  } catch (error) {
    console.error("Balance validation error:", error);
    return {
      valid: false,
      message: "Failed to validate balance"
    };
  }
}

/**
 * Check balance for batch import (bank statements)
 * @param {string} userId - User ID
 * @param {Array} transactions - Array of transactions to import
 * @param {string} paymentMethod - Payment method for these transactions
 * @returns {Promise<{valid: boolean, message?: string, invalidTransactions?: Array}>}
 */
export async function validateBatchExpenses(userId, transactions, paymentMethod = 'other') {
  try {
    // Get current balance
    const allEntries = await Finance.find({ userId });
    
    let currentIncome = allEntries
      .filter(e => e.type === 'income' && e.paymentMethod === paymentMethod)
      .reduce((sum, e) => sum + e.amount, 0);
    
    let currentExpenses = allEntries
      .filter(e => e.type === 'expense' && e.paymentMethod === paymentMethod)
      .reduce((sum, e) => sum + e.amount, 0);

    let runningBalance = currentIncome - currentExpenses;

    // Sort transactions by date to process chronologically
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    const invalidTransactions = [];

    // Check each transaction
    for (const transaction of sortedTransactions) {
      if (transaction.type === 'income') {
        runningBalance += transaction.amount;
      } else if (transaction.type === 'expense') {
        if (runningBalance - transaction.amount < 0) {
          invalidTransactions.push({
            ...transaction,
            reason: `Would result in negative balance. Current balance: ₹${runningBalance.toLocaleString('en-IN')}, Expense: ₹${transaction.amount.toLocaleString('en-IN')}`
          });
        } else {
          runningBalance -= transaction.amount;
        }
      }
    }

    if (invalidTransactions.length > 0) {
      return {
        valid: false,
        message: `${invalidTransactions.length} transaction(s) would result in negative balance`,
        invalidTransactions,
        currentBalance: currentIncome - currentExpenses
      };
    }

    return {
      valid: true,
      finalBalance: runningBalance
    };
  } catch (error) {
    console.error("Batch validation error:", error);
    return {
      valid: false,
      message: "Failed to validate transactions"
    };
  }
}
