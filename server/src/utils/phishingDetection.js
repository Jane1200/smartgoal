/**
 * Phishing Detection Utility for Wishlist Links
 * Integrates with Python ML service for URL phishing detection
 */

import axios from 'axios';

// ML service URL (should match the Python service)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Check if a URL is potentially phishing/scam
 * @param {string} url - The URL to check
 * @returns {Promise<Object>} Phishing detection result
 */
export async function checkPhishingUrl(url) {
  try {
    // Validate URL format
    if (!url || typeof url !== 'string') {
      return {
        success: false,
        error: 'Invalid URL provided'
      };
    }

    // Call Python ML service to check for phishing
    const response = await axios.post(
      `${ML_SERVICE_URL}/phishing/predict`,
      {
        url: url
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Phishing detection error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'ML service unavailable. Please start the Python ML service.'
      };
    }
    
    return {
      success: false,
      error: `Phishing detection failed: ${error.response?.data?.error || error.message}`
    };
  }
}

/**
 * Check multiple URLs for phishing
 * @param {Array<string>} urls - Array of URLs to check
 * @returns {Promise<Array<Object>>} Array of phishing detection results
 */
export async function checkMultiplePhishingUrls(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    return [];
  }

  const results = [];
  for (const url of urls) {
    try {
      const result = await checkPhishingUrl(url);
      results.push({
        url: url,
        ...result
      });
    } catch (error) {
      results.push({
        url: url,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Get a human-readable phishing risk assessment
 * @param {Object} phishingResult - Result from checkPhishingUrl
 * @returns {string} Risk assessment message
 */
export function getPhishingRiskMessage(phishingResult) {
  if (!phishingResult.success) {
    return 'Unable to assess phishing risk';
  }

  const suspicionScore = phishingResult.suspicionScore || 0;
  const label = phishingResult.label || 'unknown';

  if (label === 'phish' || suspicionScore > 0.8) {
    return '🚨 HIGH RISK - This link appears to be phishing/scam. Do not click!';
  } else if (suspicionScore > 0.6) {
    return '⚠️ MEDIUM RISK - This link may be suspicious. Proceed with caution.';
  } else if (suspicionScore > 0.4) {
    return 'ℹ️ LOW RISK - This link appears relatively safe but exercise caution.';
  } else {
    return '✅ SAFE - This link appears to be legitimate.';
  }
}

/**
 * Check if a URL is flagged as phishing
 * @param {Object} phishingResult - Result from checkPhishingUrl
 * @returns {boolean} True if flagged as phishing
 */
export function isPhishingFlagged(phishingResult) {
  if (!phishingResult.success) {
    return false; // If we can't check, we don't flag
  }

  const suspicionScore = phishingResult.suspicionScore || 0;
  const label = phishingResult.label || 'legit';

  return label === 'phish' || suspicionScore > 0.7;
}

