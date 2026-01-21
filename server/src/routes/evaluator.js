import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import Goal from "../models/Goal.js";

const router = Router();

// Middleware to check if user is evaluator
const requireEvaluator = (req, res, next) => {
  if (req.user.role !== 'evaluator' && req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access denied. Evaluator role required." });
  }
  next();
};

// Get users for evaluation
router.get("/users", requireAuth, requireEvaluator, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", role = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role && role !== 'all') {
      query.role = role;
    }

    // Get users
    const users = await User.find(query)
      .select('-passwordHash -firebaseUid')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Get user details with goals
router.get("/users/:userId", requireAuth, requireEvaluator, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-passwordHash -firebaseUid');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's goals
    const goals = await Goal.find({ userId }).sort({ createdAt: -1 });

    res.json({
      user,
      goals
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({ message: "Failed to fetch user details" });
  }
});

export default router;
