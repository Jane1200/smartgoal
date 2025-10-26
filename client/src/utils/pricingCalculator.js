/**
 * Dynamic Pricing Calculator for Resale Items
 * Factors: Condition, Age, Brand, Original Price, Demand
 */

// Premium brands that retain higher resale value
const PREMIUM_BRANDS = {
  electronics: ['Apple', 'Samsung', 'Sony', 'Canon', 'Nikon', 'Dell', 'Lenovo', 'HP'],
  sports: ['Nike', 'Adidas', 'Puma', 'Decathlon', 'Quechua'],
  books: ['Penguin', 'Collins', 'Cambridge'],
  fashion: ['Tommy Hilfiger', 'Calvin Klein', 'Levi', 'Zara']
};

// Condition depreciation multipliers
const CONDITION_MULTIPLIERS = {
  'new': 0.95,           // 95% of estimated value
  'like-new': 0.82,      // 82% of estimated value
  'excellent': 0.75,     // 75% of estimated value
  'good': 0.68,          // 68% of estimated value
  'fair': 0.48,          // 48% of estimated value
  'needs-repair': 0.28,  // 28% of estimated value (requires repair)
  'poor': 0.28           // 28% of estimated value (legacy support)
};

// Category-specific depreciation rates (per month) - adjusted for exponential decay
const DEPRECIATION_RATES = {
  electronics: 0.025,    // Electronics: ~60% value after 12 months, ~35% after 24 months
  sports: 0.015,         // Sports items: ~83% after 12 months, ~70% after 24 months
  books: 0.008,          // Books: ~91% after 12 months, ~82% after 24 months
  fashion: 0.012,        // Fashion: ~86% after 12 months, ~75% after 24 months
  other: 0.020           // Others: ~78% after 12 months, ~60% after 24 months
};

// Base demand multipliers by category
const DEMAND_MULTIPLIERS = {
  electronics: 1.2,
  sports: 1.0,
  books: 0.9,
  fashion: 1.1,
  other: 0.8
};

/**
 * Extract brand name from item title
 * @param {string} title - The item title
 * @returns {string|null} - Brand name or null
 */
export function extractBrand(title) {
  if (!title) return null;

  const words = title.split(' ');
  const firstWord = words[0];

  // Check if first word is a known brand
  for (const category in PREMIUM_BRANDS) {
    if (PREMIUM_BRANDS[category].some(brand => 
      brand.toLowerCase() === firstWord.toLowerCase()
    )) {
      return firstWord;
    }
  }

  return firstWord; // Return first word as potential brand
}

/**
 * Check if brand is premium (retains more value)
 * @param {string} brand - Brand name
 * @returns {number} - Brand value multiplier (1.0 = neutral, >1.0 = premium)
 */
export function getBrandMultiplier(brand) {
  if (!brand) return 1.0;

  for (const category in PREMIUM_BRANDS) {
    if (PREMIUM_BRANDS[category].some(b => 
      b.toLowerCase() === brand.toLowerCase()
    )) {
      return 1.15; // Premium brands retain 15% more value
    }
  }

  return 1.0; // Non-premium brands - neutral multiplier
}

/**
 * Calculate months between purchase and now
 * @param {string|Date} purchaseDate - Purchase date
 * @returns {number} - Number of months
 */
export function calculateMonthsOld(purchaseDate) {
  if (!purchaseDate) return 0;

  const purchase = new Date(purchaseDate);
  const now = new Date();
  
  const months = (now.getFullYear() - purchase.getFullYear()) * 12 + 
                 (now.getMonth() - purchase.getMonth());
  
  return Math.max(0, months);
}

/**
 * Calculate depreciation based on age and category
 * @param {number} monthsOld - Months since purchase
 * @param {string} category - Item category
 * @returns {number} - Depreciation multiplier (0.0 - 1.0)
 */
export function calculateDepreciation(monthsOld, category = 'other') {
  const rate = DEPRECIATION_RATES[category] || DEPRECIATION_RATES.other;
  
  // Use exponential decay formula: e^(-rate * months)
  // This is more realistic than linear depreciation
  const depreciation = Math.exp(-rate * monthsOld);
  
  // More realistic floor values based on category
  const floorValues = {
    electronics: 0.25,  // Minimum 25% value for electronics
    sports: 0.30,       // Minimum 30% value for sports
    books: 0.20,        // Minimum 20% value for books
    fashion: 0.15,      // Minimum 15% value for fashion
    other: 0.20         // Minimum 20% value for others
  };
  
  const minValue = floorValues[category] || floorValues.other;
  return Math.max(minValue, depreciation);
}

/**
 * Calculate suggested resale price
 * 
 * @param {Object} params - Pricing parameters
 * @param {number} params.originalPrice - Original purchase price
 * @param {string} params.condition - Item condition (new, like-new, good, fair, poor)
 * @param {string} params.category - Item category (electronics, sports, books, fashion, other)
 * @param {string|Date} params.purchaseDate - When item was purchased
 * @param {string} params.brand - Brand name (optional)
 * @param {string} params.title - Item title to extract brand (optional)
 * @param {number} params.demandBoost - Custom demand multiplier (0.5 - 1.5, default 1.0)
 * @returns {Object} - Pricing analysis with suggested price and breakdown
 */
export function calculateResalePrice(params) {
  const {
    originalPrice,
    condition = 'good',
    category = 'other',
    purchaseDate,
    brand,
    title,
    demandBoost = 1.0
  } = params;

  if (!originalPrice || originalPrice <= 0) {
    return {
      suggested: 100,
      breakdown: { error: 'Invalid original price' },
      confidence: 0
    };
  }

  // Get brand from title if not provided
  const itemBrand = brand || extractBrand(title);
  const brandMultiplier = getBrandMultiplier(itemBrand);

  // Calculate age-based depreciation
  const monthsOld = calculateMonthsOld(purchaseDate);
  const depreciationMultiplier = calculateDepreciation(monthsOld, category);

  // Get condition multiplier
  const conditionMultiplier = CONDITION_MULTIPLIERS[condition] || CONDITION_MULTIPLIERS.good;

  // Get category demand multiplier
  const categoryDemandMultiplier = DEMAND_MULTIPLIERS[category] || DEMAND_MULTIPLIERS.other;

  // Calculate suggested price
  const suggestedPrice = originalPrice 
    * conditionMultiplier           // Apply condition factor
    * depreciationMultiplier        // Apply age/depreciation
    * brandMultiplier               // Apply brand premium/discount
    * categoryDemandMultiplier      // Apply category demand
    * demandBoost;                  // Apply custom demand adjustment

  // Round to nearest 50 for nice pricing
  const roundedPrice = Math.round(suggestedPrice / 50) * 50;

  // Calculate confidence score (0-100)
  // Higher confidence if all factors are known
  let confidence = 70;
  if (purchaseDate) confidence += 15;
  if (brand) confidence += 15;
  confidence = Math.min(100, confidence);

  return {
    suggested: Math.max(100, roundedPrice), // Minimum ₹100
    original: originalPrice,
    breakdown: {
      condition: {
        factor: condition,
        multiplier: conditionMultiplier,
        value: originalPrice * conditionMultiplier
      },
      age: {
        months: monthsOld,
        multiplier: depreciationMultiplier,
        value: originalPrice * depreciationMultiplier
      },
      brand: {
        name: itemBrand || 'Unknown',
        multiplier: brandMultiplier,
        isPremium: brandMultiplier > 1.0
      },
      category: {
        name: category,
        multiplier: categoryDemandMultiplier
      },
      demand: {
        multiplier: demandBoost,
        adjusted: categoryDemandMultiplier * demandBoost
      }
    },
    confidence,
    percentOfOriginal: Math.round((roundedPrice / originalPrice) * 100),
    recommendedRange: {
      min: Math.max(100, Math.round(suggestedPrice * 0.9 / 50) * 50),
      max: Math.max(100, Math.round(suggestedPrice * 1.1 / 50) * 50)
    }
  };
}

/**
 * Get pricing insights for the user
 * @param {Object} pricing - Result from calculateResalePrice
 * @returns {string} - Human-readable pricing insight
 */
export function getPricingInsight(pricing) {
  const { suggested, original, percentOfOriginal, breakdown } = pricing;

  if (!breakdown.age || breakdown.age.months === undefined) {
    return 'Add purchase date for better price estimation';
  }

  const months = breakdown.age.months;
  let insight = '';

  if (months === 0) {
    insight = 'Item is new - great resale potential!';
  } else if (months <= 3) {
    insight = `Item is ${months} month(s) old - excellent condition, good price`;
  } else if (months <= 12) {
    insight = `Item is ${Math.round(months)} months old - moderately depreciated`;
  } else {
    insight = `Item is ${Math.round(months / 12)} year(s) old - significant depreciation`;
  }

  if (breakdown.brand.isPremium) {
    insight += ' | Premium brand retains value well';
  }

  return insight;
}

/**
 * Validate pricing inputs
 * @param {Object} params - Parameters to validate
 * @returns {Object} - Validation result
 */
export function validatePricingInputs(params) {
  const errors = [];

  if (!params.originalPrice || params.originalPrice < 100) {
    errors.push('Original price must be at least ₹100');
  }

  if (!params.condition || !CONDITION_MULTIPLIERS[params.condition]) {
    errors.push('Valid condition is required');
  }

  if (!params.category) {
    errors.push('Category is required');
  }

  if (params.demandBoost && (params.demandBoost < 0.5 || params.demandBoost > 1.5)) {
    errors.push('Demand boost must be between 0.5 and 1.5');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default {
  calculateResalePrice,
  getPricingInsight,
  validatePricingInputs,
  extractBrand,
  getBrandMultiplier,
  calculateMonthsOld,
  calculateDepreciation
};