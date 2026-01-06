import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Notification from "../models/Notification.js";
import { runNotificationChecks } from "../utils/notificationService.js";

const router = Router();

// Get user notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, includeRead = "true" } = req.query;

    const notifications = await Notification.getRecentNotifications(
      userId,
      parseInt(limit),
      includeRead === "true"
    );

    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      notifications,
      unreadCount,
      total: notifications.length
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch notifications" 
    });
  }
});

// Get unread notifications count
router.get("/unread-count", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to get unread count" 
    });
  }
});

// Mark notification as read
router.put("/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOne({ _id: id, userId });

    if (!notification) {
      return res.status(404).json({ 
        success: false,
        message: "Notification not found" 
      });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: "Notification marked as read",
      notification
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to mark notification as read" 
    });
  }
});

// Mark all notifications as read
router.put("/mark-all-read", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({
      success: true,
      message: "All notifications marked as read"
    });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to mark all notifications as read" 
    });
  }
});

// Delete notification
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await Notification.findOneAndDelete({ _id: id, userId });

    if (!result) {
      return res.status(404).json({ 
        success: false,
        message: "Notification not found" 
      });
    }

    res.json({
      success: true,
      message: "Notification deleted"
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete notification" 
    });
  }
});

// Clear all read notifications
router.delete("/clear-read", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.deleteMany({ userId, isRead: true });

    res.json({
      success: true,
      message: "All read notifications cleared",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Clear read notifications error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to clear notifications" 
    });
  }
});

// Trigger notification checks manually (for testing or on-demand)
router.post("/check", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const notifications = await runNotificationChecks(userId);

    res.json({
      success: true,
      message: `Created ${notifications.length} new notifications`,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("Error running notification checks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to run notification checks",
    });
  }
});

export default router;


