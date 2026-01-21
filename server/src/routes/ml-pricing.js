/**
 * ML Routes - Integration with Python ML Service
 * Handles buyer-seller matching
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

// Python ML service URL (change if different)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * GET /api/ml-pricing/health
 * Check if ML service is available
 */
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 5000
    });
    
    res.json({
      status: 'connected',
      mlService: response.data
    });
  } catch (error) {
    res.status(503).json({
      status: 'disconnected',
      error: 'ML service unavailable',
      message: error.message
    });
  }
});

/**
 * POST /api/ml-pricing/match-sellers
 * Match buyers with nearby sellers using ML
 * 
 * Body:
 * {
 *   sellers: [{sellerId, productId, productTitle, productPrice, latitude, longitude, ...}],
 *   buyer: {latitude, longitude, budgetMin, budgetMax, preferredCategory, maxDistance}
 * }
 */
router.post('/match-sellers', async (req, res) => {
  try {
    const { sellers, buyer } = req.body;

    // Validate required fields
    if (!sellers || !buyer) {
      return res.status(400).json({
        message: 'Missing required fields: sellers and buyer'
      });
    }

    if (!Array.isArray(sellers) || sellers.length === 0) {
      return res.json({
        success: true,
        message: 'No sellers available',
        matches: [],
        totalMatches: 0,
        recommendedMatches: 0
      });
    }

    // Call Python ML service
    const response = await axios.post(
      `${ML_SERVICE_URL}/match/sellers`,
      {
        sellers,
        buyer: {
          latitude: buyer.latitude || 0,
          longitude: buyer.longitude || 0,
          budgetMin: buyer.budgetMin || 0,
          budgetMax: buyer.budgetMax || 100000,
          preferredCategory: buyer.preferredCategory || 'electronics',
          preferredCondition: buyer.preferredCondition || 'good',
          maxDistance: buyer.maxDistance || 10
        }
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('ML matching error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'ML service unavailable',
        message: 'Please start the Python ML service'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Matching failed',
      message: error.response?.data?.error || error.message
    });
  }
});

export default router;

