/**
 * Meaningful Text Validator
 * Prevents users from entering random meaningless words and spam
 * Uses pattern detection + optional dictionary API for strict validation
 */

// Common meaningful words cache (offline validation)
const COMMON_WORDS = new Set([
  // Common articles, prepositions, conjunctions
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'by', 'for', 'to', 'from', 'of', 'with', 'as', 'is', 'be',
  // Numbers and common words
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'new', 'old', 'good', 'bad',
  // Marketplace related
  'item', 'product', 'buy', 'sell', 'price', 'quality', 'condition', 'brand', 'model', 'size', 'color', 'like',
  // General descriptors
  'best', 'great', 'nice', 'excellent', 'good', 'fair', 'poor', 'perfect', 'original', 'genuine', 'authentic',
  // Goal related
  'goal', 'target', 'plan', 'dream', 'save', 'budget', 'financial', 'investment', 'future', 'money',
  // Common brands and categories
  'apple', 'samsung', 'sony', 'nokia', 'dell', 'hp', 'lenovo', 'xiaomi', 'oneplus', 'iphone', 'laptop', 'phone',
  'camera', 'watch', 'tablet', 'speaker', 'headphone', 'charger', 'cable', 'adapter', 'case', 'screen',
  // Condition words
  'mint', 'sealed', 'unopened', 'brand', 'barely', 'used', 'gently', 'box', 'all', 'accessories', 'included',
  // Common verbs
  'have', 'has', 'had', 'get', 'got', 'make', 'made', 'use', 'used', 'come', 'came', 'take', 'took', 'give', 'gave'
]);

/**
 * Detect spam patterns in text
 * @param {string} text - Text to validate
 * @returns {object} - { isSpam: boolean, reason: string }
 */
export const detectSpamPatterns = (text) => {
  if (!text) return { isSpam: false, reason: '' };
  
  const trimmed = text.trim();
  
  // 1. Check for repeated characters (e.g., "aaaaaaa", "1111111")
  if (/(.)\1{2,}/g.test(trimmed)) {
    return { isSpam: true, reason: 'Text contains repeated characters (spam detected)' };
  }
  
  // 2. Check for excessive special characters (more than 30% of text)
  const specialCharCount = (trimmed.match(/[!@#$%^&*()_+=\[\]{};:'",.<>?/\\|~`]/g) || []).length;
  const specialCharPercentage = (specialCharCount / trimmed.length) * 100;
  if (specialCharPercentage > 30) {
    return { isSpam: true, reason: 'Text contains too many special characters' };
  }
  
  // 3. Check for excessive numbers (more than 50% of text)
  const numberCount = (trimmed.match(/\d/g) || []).length;
  const numberPercentage = (numberCount / trimmed.length) * 100;
  if (numberPercentage > 50) {
    return { isSpam: true, reason: 'Text contains too many numbers' };
  }
  
  // 4. Check for random character sequences (single letters separated by spaces)
  const words = trimmed.split(/\s+/);
  const singleLetters = words.filter(w => w.length === 1).length;
  if (words.length > 2 && singleLetters > words.length * 0.3) {
    return { isSpam: true, reason: 'Text appears to be random characters' };
  }
  
  // 5. Check for keyboard mashing patterns (random character combinations)
  const hasKeyboardMash = /qwerty|asdfgh|zxcvbn|qazwsx|1234|5678/i.test(trimmed);
  if (hasKeyboardMash && words.length === 1) {
    return { isSpam: true, reason: 'Text appears to be keyboard mashing' };
  }
  
  // 6. All caps with short length (suspicious)
  if (trimmed === trimmed.toUpperCase() && trimmed.length < 4) {
    return { isSpam: true, reason: 'Text must have proper capitalization' };
  }
  
  return { isSpam: false, reason: '' };
};

/**
 * Check if words are meaningful (offline validation)
 * @param {string} text - Text to validate
 * @returns {object} - { isMeaningful: boolean, invalidWords: array }
 */
export const validateMeaningfulWords = (text) => {
  if (!text) return { isMeaningful: true, invalidWords: [] };
  
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s\-']/g, ' ') // Remove special chars except hyphens and apostrophes
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  const invalidWords = [];
  const uniqueWords = new Set();
  
  words.forEach(word => {
    // Skip if already processed
    if (uniqueWords.has(word)) return;
    uniqueWords.add(word);
    
    // Skip short common words (articles, prepositions)
    if (word.length <= 2 && COMMON_WORDS.has(word)) return;
    
    // Check if word is in common words or is a number-like word
    if (!COMMON_WORDS.has(word) && isNaN(parseInt(word))) {
      // Check if it's a plausible word (has vowels or common consonant patterns)
      if (!isPlausibleWord(word)) {
        invalidWords.push(word);
      }
    }
  });
  
  // Allow up to 20% invalid words (for names, brands, typos)
  const invalidPercentage = (invalidWords.length / uniqueWords.size) * 100;
  const isMeaningful = invalidPercentage <= 20;
  
  return { 
    isMeaningful, 
    invalidWords: invalidWords.slice(0, 3) // Return first 3 invalid words
  };
};

/**
 * Check if a word is plausible (contains vowels or common patterns)
 * @param {string} word - Word to check
 * @returns {boolean}
 */
const isPlausibleWord = (word) => {
  if (word.length < 2) return false;
  
  // Must contain at least one vowel
  const hasVowel = /[aeiouoy]/i.test(word);
  if (!hasVowel) return false;
  
  // For words longer than 6 chars, be extra strict:
  // They should have good vowel-consonant distribution
  if (word.length > 6) {
    // Count vowels and consonants
    const vowels = (word.match(/[aeiouoy]/gi) || []).length;
    const consonants = (word.match(/[bcdfghjklmnpqrstvwxz]/gi) || []).length;
    
    // Ratio should be reasonable: 
    // Real words rarely have consonant runs > 3 or very skewed vowel ratios
    const vowelRatio = vowels / word.length;
    
    // Real words have 18-85% vowels typically
    // Anything below 18% is likely random (xyzpqr patterns)
    if (vowelRatio < 0.18 || vowelRatio > 0.85) {
      return false; // Too skewed, probably random
    }
    
    // Check for consonant runs (more than 4 consonants in a row = suspicious)
    if (/[bcdfghjklmnpqrstvwxz]{4,}/i.test(word)) {
      return false; // Too many consonants in a row
    }
  }
  
  // Check for common patterns
  const hasCommonPattern = /(th|ch|sh|ng|er|ed|ing|tion|sion|ous|ness|ment|ive|able|ical|ary)/i.test(word);
  
  // Accept if has common pattern or reasonable vowel distribution
  return hasCommonPattern || (word.length <= 6);
};

/**
 * Validate meaningful content using FREE Dictionary API (async)
 * Falls back to offline validation if API is unavailable
 * @param {string} text - Text to validate
 * @param {object} options - { strict: boolean, useAPI: boolean }
 * @returns {Promise<object>} - { isValid: boolean, error: string }
 */
export const validateMeaningfulContent = async (text, options = {}) => {
  const { strict = true, useAPI = true } = options;
  
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: 'Text cannot be empty' };
  }
  
  // Step 1: Check spam patterns first (always done)
  const spamCheck = detectSpamPatterns(text);
  if (spamCheck.isSpam) {
    return { isValid: false, error: spamCheck.reason };
  }
  
  // Step 2: Check meaningful words offline
  const meaningCheck = validateMeaningfulWords(text);
  if (!meaningCheck.isMeaningful) {
    return { 
      isValid: false, 
      error: `Please use meaningful words. Invalid words detected: "${meaningCheck.invalidWords.join('", "')}"` 
    };
  }
  
  // Step 3: Optional API validation for strict mode
  if (strict && useAPI) {
    try {
      const words = text.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2 && !COMMON_WORDS.has(w));
      
      // Check first few significant words with API
      const wordsToCheck = words.slice(0, 3);
      
      for (const word of wordsToCheck) {
        const isRealWord = await checkWordWithDictionary(word);
        if (!isRealWord) {
          return { 
            isValid: false, 
            error: `"${word}" doesn't appear to be a real word. Please use meaningful words.` 
          };
        }
      }
    } catch (error) {
      // API failed, continue with offline validation
      console.warn('Dictionary API check failed, continuing with offline validation', error);
    }
  }
  
  return { isValid: true, error: '' };
};

/**
 * Check if word exists using Free Dictionary API
 * @param {string} word - Word to check
 * @returns {Promise<boolean>}
 */
const checkWordWithDictionary = async (word) => {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    
    // 200 = word exists, 404 = word not found
    return response.status === 200;
  } catch (error) {
    console.warn(`Failed to check word "${word}" with API:`, error);
    // If API fails, assume word is valid (don't block user)
    return true;
  }
};

/**
 * Main validation function for integration with forms
 * @param {string} fieldName - Name of field being validated
 * @param {string} value - Value to validate
 * @param {object} options - Validation options
 * @returns {Promise<string>} - Error message or empty string if valid
 */
export const validateMeaningfulText = async (fieldName, value, options = {}) => {
  const { strict = true, useAPI = true } = options;
  
  // Skip validation for certain field types
  if (fieldName === 'price' || fieldName === 'amount' || fieldName === 'targetAmount') {
    return '';
  }
  
  if (!value || value.trim().length === 0) {
    return '';
  }
  
  const validation = await validateMeaningfulContent(value, { strict, useAPI });
  return validation.error;
};

/**
 * Synchronous version for immediate feedback (client-side only)
 * @param {string} fieldName - Name of field
 * @param {string} value - Value to validate
 * @returns {string} - Error message or empty string
 */
export const validateMeaningfulTextSync = (fieldName, value) => {
  // Skip validation for certain field types
  if (fieldName === 'price' || fieldName === 'amount' || fieldName === 'targetAmount') {
    return '';
  }
  
  if (!value || value.trim().length === 0) {
    return '';
  }
  
  // Check spam patterns
  const spamCheck = detectSpamPatterns(value);
  if (spamCheck.isSpam) {
    return spamCheck.reason;
  }
  
  // Check meaningful words
  const meaningCheck = validateMeaningfulWords(value);
  if (!meaningCheck.isMeaningful) {
    return `Please use meaningful words. Suspicious words: "${meaningCheck.invalidWords.join('", "')}"`;
  }
  
  return '';
};

export default {
  detectSpamPatterns,
  validateMeaningfulWords,
  validateMeaningfulContent,
  validateMeaningfulText,
  validateMeaningfulTextSync,
  checkWordWithDictionary
};