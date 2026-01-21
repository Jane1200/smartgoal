import { Router } from "express";
import ActivityLog from "../models/ActivityLog.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();

// Get activity logs (admin only)
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { category, userId, action, page = 1, limit = 50, days = 7 } = req.query;
    
    const query = {};
    
    // Filter by category
    if (category && category !== "all") {
      query.category = category;
    }
    
    // Filter by user
    if (userId) {
      query.userId = userId;
    }
    
    // Filter by action
    if (action) {
      query.action = { $regex: action, $options: "i" };
    }
    
    // Filter by date range
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    query.createdAt = { $gte: daysAgo };
    
    const skip = (page - 1) * limit;
    
    const logs = await ActivityLog.find(query)
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await ActivityLog.countDocuments(query);
    
    res.json({
      logs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get activity logs error:", error);
    res.status(500).json({ message: "Failed to fetch activity logs" });
  }
});

// Get activity log statistics (admin only)
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const totalLogs = await ActivityLog.countDocuments();
    const logsToday = await ActivityLog.countDocuments({ createdAt: { $gte: oneDayAgo } });
    const logsThisWeek = await ActivityLog.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    
    const byCategory = await ActivityLog.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const topActions = await ActivityLog.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const topUsers = await ActivityLog.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Populate user details
    const populatedTopUsers = await Promise.all(
      topUsers.map(async (item) => {
        const user = await ActivityLog.findOne({ userId: item._id })
          .populate("userId", "name email")
          .select("userId");
        return {
          user: user?.userId || { name: "Unknown", email: "unknown" },
          count: item.count
        };
      })
    );
    
    res.json({
      overview: {
        total: totalLogs,
        today: logsToday,
        thisWeek: logsThisWeek
      },
      byCategory,
      topActions,
      topUsers: populatedTopUsers
    });
  } catch (error) {
    console.error("Get activity log stats error:", error);
    res.status(500).json({ message: "Failed to fetch activity log statistics" });
  }
});

export default router;
