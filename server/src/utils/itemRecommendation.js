/**
 * Item Recommendation Engine
 * Calculates confidence scores for marketplace items based on:
 * - Price (lower is better)
 * - Seller rating (higher is better)
 * - Distance (closer is better)
 */

/**
 * Calculate price score (0-10 scale)
 * Lower price = Higher score
 */
function calculatePriceScore(itemPrice, allSimilarItems) {
  if (!allSimilarItems || allSimilarItems.length === 0) {
    return 5; // Neutral score if no comparison
  }

  const prices = allSimilarItems.map(item => item.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (minPrice === maxPrice) {
    return 10; // All same price
  }

  // Normalize: lower price gets higher score (0-10)
  const normalizedScore = 10 - ((itemPrice - minPrice) / (maxPrice - minPrice)) * 10;
  return Math.max(0, Math.min(10, normalizedScore));
}

/**
 * Calculate rating score (0-10 scale)
 * Higher rating = Higher score
 */
function calculateRatingScore(sellerRating) {
  if (!sellerRating || sellerRating === 0) {
    return 5; // Neutral score for new sellers
  }

  // Convert 0-5 rating to 0-10 scale
  return (sellerRating / 5) * 10;
}

/**
 * Calculate distance score (0-10 scale)
 * Closer distance = Higher score
 */
function calculateDistanceScore(distance, maxDistance = 5) {
  if (!distance || distance === 0) {
    return 10; // Same location
  }

  if (distance >= maxDistance) {
    return 0; // Too far
  }

  // Normalize: closer gets higher score (0-10)
  const normalizedScore = 10 - (distance / maxDistance) * 10;
  return Math.max(0, Math.min(10, normalizedScore));
}

/**
 * Calculate overall confidence score (0-100 scale)
 * Weighted average of price, rating, and distance
 */
export function calculateConfidenceScore(item, allSimilarItems = [], maxDistance = 5) {
  // Extract values
  const itemPrice = item.price || 0;
  const sellerRating = item.userId?.marketplaceStats?.averageRating || 
                       item.sellerRating || 
                       0;
  const distance = item.distance || 0;

  // Calculate individual scores (0-10 scale)
  const priceScore = calculatePriceScore(itemPrice, allSimilarItems);
  const ratingScore = calculateRatingScore(sellerRating);
  const distanceScore = calculateDistanceScore(distance, maxDistance);

  // Weighted average (configurable weights)
  const weights = {
    price: 0.4,    // 40% weight on price
    rating: 0.4,   // 40% weight on seller rating
    distance: 0.2  // 20% weight on distance
  };

  const confidenceScore = (
    priceScore * weights.price +
    ratingScore * weights.rating +
    distanceScore * weights.distance
  ) * 10; // Convert to 0-100 scale

  return Math.round(confidenceScore);
}

/**
 * Group similar items by title and category
 * Used for price comparison
 */
export function groupSimilarItems(items) {
  const groups = {};

  items.forEach(item => {
    // Create a key based on normalized title and category
    const titleKey = item.title?.toLowerCase().trim() || '';
    const categoryKey = item.category?.toLowerCase() || '';
    const key = `${categoryKey}_${titleKey}`;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  });

  return groups;
}

/**
 * Add confidence scores to items and mark recommended ones
 */
export function addConfidenceScores(items, maxDistance = 5) {
  if (!items || items.length === 0) {
    return [];
  }

  // Group similar items for price comparison
  const similarGroups = groupSimilarItems(items);

  // Calculate confidence score for each item
  const scoredItems = items.map(item => {
    const titleKey = item.title?.toLowerCase().trim() || '';
    const categoryKey = item.category?.toLowerCase() || '';
    const key = `${categoryKey}_${titleKey}`;
    const similarItems = similarGroups[key] || [item];

    const confidenceScore = calculateConfidenceScore(item, similarItems, maxDistance);

    return {
      ...item,
      confidenceScore,
      isRecommended: false, // Will be set later
      recommendationReasons: getRecommendationReasons(item, similarItems, maxDistance)
    };
  });

  // Sort by confidence score (highest first)
  scoredItems.sort((a, b) => b.confidenceScore - a.confidenceScore);

  // Mark top 3 items as recommended
  const topCount = Math.min(3, scoredItems.length);
  for (let i = 0; i < topCount; i++) {
    if (scoredItems[i].confidenceScore >= 70) { // Only recommend if score >= 70
      scoredItems[i].isRecommended = true;
    }
  }

  return scoredItems;
}

/**
 * Get human-readable reasons for recommendation
 */
function getRecommendationReasons(item, similarItems, maxDistance) {
  const reasons = [];

  // Price comparison
  if (similarItems.length > 1) {
    const prices = similarItems.map(i => i.price);
    const minPrice = Math.min(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    if (item.price === minPrice) {
      reasons.push('Best price in area');
    } else if (item.price < avgPrice) {
      const savings = Math.round(avgPrice - item.price);
      reasons.push(`₹${savings} less than average`);
    }
  }

  // Seller rating
  const sellerRating = item.userId?.marketplaceStats?.averageRating || item.sellerRating || 0;
  if (sellerRating >= 4.5) {
    reasons.push(`Highly rated seller (${sellerRating.toFixed(1)}★)`);
  } else if (sellerRating >= 4.0) {
    reasons.push(`Good seller rating (${sellerRating.toFixed(1)}★)`);
  }

  // Distance
  const distance = item.distance || 0;
  if (distance <= 1) {
    reasons.push('Very close (< 1 km)');
  } else if (distance <= 2) {
    reasons.push(`Nearby (${distance.toFixed(1)} km)`);
  } else if (distance <= maxDistance) {
    reasons.push(`Within ${distance.toFixed(1)} km`);
  }

  // Trust badge
  const trustLevel = item.userId?.trustBadge?.level;
  if (trustLevel === 'platinum' || trustLevel === 'gold') {
    reasons.push(`${trustLevel.charAt(0).toUpperCase() + trustLevel.slice(1)} seller`);
  }

  return reasons;
}

/**
 * Get confidence level label
 */
export function getConfidenceLabel(score) {
  if (score >= 90) return 'Excellent Match';
  if (score >= 80) return 'Great Match';
  if (score >= 70) return 'Good Match';
  if (score >= 60) return 'Fair Match';
  return 'Low Match';
}

/**
 * Get confidence color for UI
 */
export function getConfidenceColor(score) {
  if (score >= 90) return '#10b981'; // Green
  if (score >= 80) return '#3b82f6'; // Blue
  if (score >= 70) return '#f59e0b'; // Orange
  if (score >= 60) return '#f97316'; // Dark orange
  return '#ef4444'; // Red
}

export default {
  calculateConfidenceScore,
  groupSimilarItems,
  addConfidenceScores,
  getConfidenceLabel,
  getConfidenceColor
};
