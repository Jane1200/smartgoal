/**
 * ML Phishing URL Detection Routes - Integration with Python NB Service
 */

import express from 'express';
import axios from 'axios';

const router = express.Router();

// Python ML service URL (reuse setting)
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// Health of phishing model
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 5000 });
    res.json({ status: 'connected', mlService: response.data });
  } catch (error) {
    res.status(503).json({ status: 'disconnected', error: 'ML service unavailable', message: error.message });
  }
});

/**
 * POST /api/ml-phishing/train
 * Body: { samples: [{ url: string, label: 'phish'|'legit'|1|0 }] }
 */
router.post('/train', async (req, res) => {
  try {
    const { samples } = req.body;
    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ success: false, error: 'Provide non-empty samples array' });
    }

    const response = await axios.post(`${ML_SERVICE_URL}/phishing/train`, { samples }, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    const message = error.response?.data?.error || error.message;
    res.status(error.response?.status || 500).json({ success: false, error: 'Training failed', message });
  }
});

/**
 * POST /api/ml-phishing/predict
 * Body: { url: string }
 */
router.post('/predict', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing url' });
    }

    const response = await axios.post(`${ML_SERVICE_URL}/phishing/predict`, { url }, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    const message = error.response?.data?.error || error.message;
    res.status(error.response?.status || 500).json({ success: false, error: 'Prediction failed', message });
  }
});

/**
 * POST /api/ml-phishing/evaluate
 * Body: { samples: [{ url: string, label: string|number|boolean }] }
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { samples } = req.body;
    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ success: false, error: 'Provide non-empty samples array' });
    }
    const response = await axios.post(`${ML_SERVICE_URL}/phishing/evaluate`, { samples }, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    const message = error.response?.data?.error || error.message;
    res.status(error.response?.status || 500).json({ success: false, error: 'Evaluation failed', message });
  }
});

export default router;




