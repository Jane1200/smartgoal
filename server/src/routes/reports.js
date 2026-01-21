import { Router } from "express";
import Report from "../models/Report.js";
import User from "../models/User.js";
import Marketplace from "../models/Marketplace.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import ActivityLog from "../models/ActivityLog.js";

const router = Router();

// Create a report (any authenticated user)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { reportedUserId, reportedItemId, type, category, description } = req.body;
    
    const report = new Report({
      reporterId: req.user.id,
      reportedUserId,
      reportedItemId,
      type,
      category,
      description,
      status: "pending",
      priority: category === "fraud" || category === "harassment" ? "high" : "medium"
    });
    
    await report.save();
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: "create_report",
      category: "report",
      description: `Created ${type} report for ${category}`,
      targetId: report._id,
      targetType: "Report"
    });
    
    res.status(201).json({ message: "Report submitted successfully", report });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({ message: "Failed to submit report" });
  }
});

// Get all reports (admin only)
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { status, category, type, priority, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status && status !== "all") query.status = status;
    if (category && category !== "all") query.category = category;
    if (type && type !== "all") query.type = type;
    if (priority && priority !== "all") query.priority = priority;
    
    const skip = (page - 1) * limit;
    
    const reports = await Report.find(query)
      .populate("reporterId", "name email")
      .populate("reportedUserId", "name email")
      .populate("reportedItemId", "title")
      .populate("resolvedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Report.countDocuments(query);
    
    res.json({
      reports,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

// Get report statistics (admin only)
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    const total = await Report.countDocuments();
    const pending = await Report.countDocuments({ status: "pending" });
    const reviewing = await Report.countDocuments({ status: "reviewing" });
    const resolved = await Report.countDocuments({ status: "resolved" });
    const dismissed = await Report.countDocuments({ status: "dismissed" });
    
    const byCategory = await Report.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const byType = await Report.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      total,
      byStatus: { pending, reviewing, resolved, dismissed },
      byCategory,
      byType
    });
  } catch (error) {
    console.error("Get report stats error:", error);
    res.status(500).json({ message: "Failed to fetch report statistics" });
  }
});

// Update report status (admin only)
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes, resolution, priority } = req.body;
    
    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === "resolved" || status === "dismissed") {
        updateData.resolvedBy = req.user.id;
        updateData.resolvedAt = new Date();
      }
    }
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (resolution) updateData.resolution = resolution;
    if (priority) updateData.priority = priority;
    
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("reporterId reportedUserId reportedItemId resolvedBy");
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: "update_report",
      category: "report",
      description: `Updated report status to ${status}`,
      targetId: report._id,
      targetType: "Report"
    });
    
    res.json({ message: "Report updated successfully", report });
  } catch (error) {
    console.error("Update report error:", error);
    res.status(500).json({ message: "Failed to update report" });
  }
});

// Delete report (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: "delete_report",
      category: "report",
      description: `Deleted report ${req.params.id}`,
      targetId: req.params.id,
      targetType: "Report"
    });
    
    res.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({ message: "Failed to delete report" });
  }
});

export default router;
