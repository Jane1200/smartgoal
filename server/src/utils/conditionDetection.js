/**
 * Condition Detection Utility Functions
 * Integrates with Python ML service for computer vision-based condition detection
 */

import axios from 'axios';
import path from 'path';

// ML service URL (should match the Python service)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Detect product condition from uploaded image file
 * @param {string} imagePath - Full path to the uploaded image file
 * @returns {Promise<Object>} Condition detection result
 */
export async function detectConditionFromFile(imagePath) {
  try {
    // Call Python ML service to detect condition
    const response = await axios.post(
      `${ML_SERVICE_URL}/condition/detect`,
      {
        imagePath: imagePath
      },
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      return {
        success: true,
        condition: response.data.condition,
        confidence: response.data.confidence,
        tampered: response.data.tampered,
        features: response.data.features,
        message: `Condition detected as ${response.data.condition} (${response.data.confidence}% confidence)`
      };
    } else {
      throw new Error(response.data.error || 'Condition detection failed');
    }
  } catch (error) {
    console.error('Condition detection error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('ML service unavailable. Please start the Python ML service.');
    }
    
    throw new Error(`Condition detection failed: ${error.response?.data?.error || error.message}`);
  }
}

/**
 * Get enhanced price prediction based on product details and condition
 * @param {Object} productData - Product information
 * @param {string} imagePath - Path to product image
 * @returns {Promise<Object>} Enhanced price prediction with condition analysis
 */
export async function getEnhancedPricePrediction(productData, imagePath) {
  try {
    // First, detect condition from image
    let conditionResult = null;
    
    try {
      conditionResult = await detectConditionFromFile(imagePath);
      console.log(`\n🔍 Condition Detection Result:`, conditionResult);
    } catch (condError) {
      console.warn(`⚠️ Condition detection failed, using defaults:`, condError.message);
    }
    
    // Prepare data for price prediction
    const predictionData = {
      title: productData.title || 'Resale Item',
      category: productData.category || 'electronics',
      condition: conditionResult?.condition || 'good',
      originalPrice: productData.originalPrice || 10000,
      location: productData.location || 'India',
      ageMonths: productData.ageMonths || 12,
      brand: productData.brand || 'generic'
    };
    
    // Include CV analysis in pricing request if successful
    const pricingRequest = {
      ...predictionData,
      cvAnalysis: conditionResult || null
    };
    
    console.log(`\n📤 Sending to ML Service:`, JSON.stringify(pricingRequest, null, 2));
    
    // Call CV pricing service
    const priceResponse = await axios.post(
      `${ML_SERVICE_URL}/predict`,
      pricingRequest,
      {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`\n📥 ML Service Response:`, JSON.stringify(priceResponse.data, null, 2));
    
    if (priceResponse.data.success) {
      return {
        success: true,
        predicted_price: priceResponse.data.predicted_price,
        original_price: priceResponse.data.original_price,
        depreciation_factor: priceResponse.data.depreciation_factor,
        condition_adjustment: priceResponse.data.condition_adjustment,
        location_factor: priceResponse.data.location_factor,
        brand_factor: priceResponse.data.brand_factor,
        confidence: priceResponse.data.confidence,
        ai_score: priceResponse.data.ai_score,
        cv_insights: conditionResult || priceResponse.data.cv_insights,
        condition_result: conditionResult,
        price_breakdown: priceResponse.data.price_breakdown,
        message: `Price automatically estimated at ₹${priceResponse.data.predicted_price} for ${conditionResult?.condition || 'good'} condition`
      };
    } else {
      throw new Error(priceResponse.data.error || 'Price prediction failed');
    }
  } catch (error) {
    console.error('Enhanced price prediction error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ ML service unavailable at', ML_SERVICE_URL);
      throw new Error('ML service unavailable. Please start the Python ML service.');
    }
    
    // Even if the service fails, provide a fallback estimation
    console.warn('⚠️ Using fallback pricing');
    return {
      success: true,
      predicted_price: productData.originalPrice ? Math.round(productData.originalPrice * 0.5) : 5000,
      original_price: productData.originalPrice || 10000,
      depreciation_factor: 0.5,
      condition_adjustment: 'good',
      location_factor: 1.0,
      brand_factor: 1.0,
      confidence: 50,
      ai_score: 50,
      cv_insights: { fallback_used: true, condition: 'good', confidence: 50 },
      price_breakdown: {
        base_depreciated: (productData.originalPrice || 10000) * 0.5,
        condition_adjusted: (productData.originalPrice || 10000) * 0.5 * 0.65,
        location_adjusted: (productData.originalPrice || 10000) * 0.5 * 0.65,
        final: productData.originalPrice ? Math.round(productData.originalPrice * 0.5) : 5000
      },
      message: `Fallback price estimation: ₹${productData.originalPrice ? Math.round(productData.originalPrice * 0.5) : 5000}`
    };
  }
}

/**
 * Train condition detection model with new data
 * @param {Array} trainingData - Array of training samples [{imagePath, label}]
 * @returns {Promise<Object>} Training result
 */
export async function trainConditionModel(trainingData) {
  try {
    const response = await axios.post(
      `${ML_SERVICE_URL}/condition/train`,
      {
        trainingData: trainingData
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Condition model training error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('ML service unavailable. Please start the Python ML service.');
    }
    
    throw new Error(`Condition model training failed: ${error.response?.data?.error || error.message}`);
  }
}

