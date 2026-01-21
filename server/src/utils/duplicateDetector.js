import Finance from '../models/Finance.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

/**
 * Generate a unique hash for a transaction to identify duplicates
 * Uses: amount, date (day precision), type, description/source/category
 */
export function generateTransactionHash(transaction) {
  try {
    const date = new Date(transaction.date);
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Ensure amount is a number
    const amount = parseFloat(transaction.amount);
    if (isNaN(amount)) {
      console.warn('⚠️ Invalid amount for transaction:', transaction);
      return null;
    }
    
    // Get description - fallback to source (income) or category (expense)
    const description = (
      transaction.description || 
      transaction.source || 
      transaction.category || 
      ''
    ).toString().trim().toLowerCase();
    
    const hashInput = [
      amount.toFixed(2),
      dateString,
      transaction.type,
      description
    ].join('|');
    
    const hash = crypto.createHash('md5').update(hashInput).digest('hex');
    console.log(`🔑 Hash generated: ${hashInput} → ${hash}`);
    
    return hash;
  } catch (error) {
    console.error('❌ Error generating hash:', error, transaction);
    return null;
  }
}

/**
 * Check if transactions already exist in the database
 * Returns array of new transactions (not duplicates)
 */
export async function filterDuplicateTransactions(userId, transactions) {
  if (!transactions || transactions.length === 0) {
    return {
      newTransactions: [],
      duplicates: [],
      stats: {
        total: 0,
        new: 0,
        duplicates: 0
      }
    };
  }

  console.log(`🔍 Checking ${transactions.length} transactions for duplicates...`);
  console.log(`👤 User ID: ${userId}`);

  // Ensure userId is ObjectId
  const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  // Get date range from transactions
  const dates = transactions.map(t => new Date(t.date));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  // Add buffer of 2 days on each side to account for timezone differences
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);
  // Set to start and end of day
  minDate.setHours(0, 0, 0, 0);
  maxDate.setHours(23, 59, 59, 999);

  console.log(`📅 Date range: ${minDate.toISOString()} to ${maxDate.toISOString()}`);

  // Fetch existing transactions in the date range
  const existingTransactions = await Finance.find({
    userId: userObjectId,
    date: { $gte: minDate, $lte: maxDate }
  }).lean();

  console.log(`📊 Found ${existingTransactions.length} existing transactions in date range`);

  // Create a Map of hashes for existing transactions (for debugging)
  const existingHashMap = new Map();
  const existingHashes = new Set();
  
  for (const t of existingTransactions) {
    const hash = generateTransactionHash(t);
    if (hash) {
      existingHashes.add(hash);
      existingHashMap.set(hash, t);
    }
  }

  console.log(`🔑 Generated ${existingHashes.size} unique hashes from existing transactions`);

  // Filter out duplicates
  const newTransactions = [];
  const duplicates = [];

  for (const transaction of transactions) {
    const hash = generateTransactionHash(transaction);
    
    if (!hash) {
      console.warn('⚠️ Skipping transaction with invalid hash:', transaction);
      continue;
    }
    
    if (existingHashes.has(hash)) {
      const matchedTransaction = existingHashMap.get(hash);
      duplicates.push({
        ...transaction,
        reason: 'Duplicate transaction already exists',
        matchedWith: matchedTransaction?._id
      });
      console.log(`❌ Duplicate found: ${transaction.description || transaction.source || transaction.category} - ₹${transaction.amount} on ${new Date(transaction.date).toLocaleDateString()}`);
    } else {
      newTransactions.push(transaction);
      // Add to set to prevent duplicates within the same upload
      existingHashes.add(hash);
      console.log(`✅ New transaction: ${transaction.description || transaction.source || transaction.category} - ₹${transaction.amount} on ${new Date(transaction.date).toLocaleDateString()}`);
    }
  }

  console.log(`✅ Results: ${newTransactions.length} new, ${duplicates.length} duplicates`);

  return {
    newTransactions,
    duplicates,
    stats: {
      total: transactions.length,
      new: newTransactions.length,
      duplicates: duplicates.length
    }
  };
}

/**
 * Advanced duplicate detection with fuzzy matching
 * Useful for transactions with slight variations in description
 */
export async function filterDuplicatesWithFuzzyMatch(userId, transactions, threshold = 0.9) {
  if (!transactions || transactions.length === 0) {
    return {
      newTransactions: [],
      duplicates: [],
      stats: {
        total: 0,
        new: 0,
        duplicates: 0
      }
    };
  }

  console.log(`🔍 Checking ${transactions.length} transactions with fuzzy matching (threshold: ${threshold})...`);

  // Ensure userId is ObjectId
  const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
    ? new mongoose.Types.ObjectId(userId) 
    : userId;

  // Get date range from transactions
  const dates = transactions.map(t => new Date(t.date));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));
  
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);
  minDate.setHours(0, 0, 0, 0);
  maxDate.setHours(23, 59, 59, 999);

  // Fetch existing transactions in the date range
  const existingTransactions = await Finance.find({
    userId: userObjectId,
    date: { $gte: minDate, $lte: maxDate }
  }).lean();

  console.log(`📊 Found ${existingTransactions.length} existing transactions in date range`);

  const newTransactions = [];
  const duplicates = [];

  for (const transaction of transactions) {
    let isDuplicate = false;
    
    // Check for exact or near-exact matches
    for (const existing of existingTransactions) {
      // Must match: amount, date (same day), type
      const sameAmount = Math.abs(existing.amount - transaction.amount) < 0.01;
      const sameDate = new Date(existing.date).toDateString() === new Date(transaction.date).toDateString();
      const sameType = existing.type === transaction.type;
      
      if (sameAmount && sameDate && sameType) {
        // Check description similarity
        const existingDesc = (existing.description || existing.source || existing.category || '').trim().toLowerCase();
        const newDesc = (transaction.description || transaction.source || transaction.category || '').trim().toLowerCase();
        
        // Exact match or both empty
        if (existingDesc === newDesc || (!existingDesc && !newDesc)) {
          isDuplicate = true;
          duplicates.push({
            ...transaction,
            reason: 'Exact duplicate found',
            matchedWith: existing._id
          });
          console.log(`❌ Exact duplicate: ${transaction.description} - ₹${transaction.amount}`);
          break;
        }
        
        // Fuzzy match (if descriptions exist)
        if (existingDesc && newDesc) {
          const similarity = calculateSimilarity(existingDesc, newDesc);
          if (similarity >= threshold) {
            isDuplicate = true;
            duplicates.push({
              ...transaction,
              reason: `Similar transaction found (${(similarity * 100).toFixed(0)}% match)`,
              matchedWith: existing._id,
              similarity: similarity
            });
            console.log(`❌ Fuzzy duplicate: ${transaction.description} - ₹${transaction.amount} (${(similarity * 100).toFixed(0)}% match)`);
            break;
          }
        }
      }
    }
    
    if (!isDuplicate) {
      newTransactions.push(transaction);
      // Add to existing transactions to prevent duplicates within the same upload
      existingTransactions.push(transaction);
    }
  }

  console.log(`✅ Results: ${newTransactions.length} new, ${duplicates.length} duplicates`);

  return {
    newTransactions,
    duplicates,
    stats: {
      total: transactions.length,
      new: newTransactions.length,
      duplicates: duplicates.length
    }
  };
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
