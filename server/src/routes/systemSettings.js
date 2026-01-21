import { Router } from "express";
import SystemSettings from "../models/SystemSettings.js";
import { requireAdmin } from "../middleware/admin.js";
import ActivityLog from "../models/ActivityLog.js";

const router = Router();

// Get all system settings (admin only)
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { category } = req.query;
    
    const query = {};
    if (category && category !== "all") {
      query.category = category;
    }
    
    const settings = await SystemSettings.find(query)
      .populate("updatedBy", "name email")
      .sort({ category: 1, key: 1 });
    
    res.json({ settings });
  } catch (error) {
    console.error("Get system settings error:", error);
    res.status(500).json({ message: "Failed to fetch system settings" });
  }
});

// Get single setting by key
router.get("/:key", requireAdmin, async (req, res) => {
  try {
    const setting = await SystemSettings.findOne({ key: req.params.key })
      .populate("updatedBy", "name email");
    
    if (!setting) {
      return res.status(404).json({ message: "Setting not found" });
    }
    
    res.json({ setting });
  } catch (error) {
    console.error("Get setting error:", error);
    res.status(500).json({ message: "Failed to fetch setting" });
  }
});

// Create or update system setting (admin only)
router.put("/:key", requireAdmin, async (req, res) => {
  try {
    const { value, category, description } = req.body;
    
    const setting = await SystemSettings.findOneAndUpdate(
      { key: req.params.key },
      {
        key: req.params.key,
        value,
        category: category || "general",
        description,
        updatedBy: req.user.id
      },
      { new: true, upsert: true }
    ).populate("updatedBy", "name email");
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: "update_system_setting",
      category: "system",
      description: `Updated system setting: ${req.params.key}`,
      targetId: setting._id,
      targetType: "System",
      metadata: { key: req.params.key, value }
    });
    
    res.json({ message: "Setting updated successfully", setting });
  } catch (error) {
    console.error("Update setting error:", error);
    res.status(500).json({ message: "Failed to update setting" });
  }
});

// Delete system setting (admin only)
router.delete("/:key", requireAdmin, async (req, res) => {
  try {
    const setting = await SystemSettings.findOneAndDelete({ key: req.params.key });
    
    if (!setting) {
      return res.status(404).json({ message: "Setting not found" });
    }
    
    // Log activity
    await ActivityLog.create({
      userId: req.user.id,
      action: "delete_system_setting",
      category: "system",
      description: `Deleted system setting: ${req.params.key}`,
      metadata: { key: req.params.key }
    });
    
    res.json({ message: "Setting deleted successfully" });
  } catch (error) {
    console.error("Delete setting error:", error);
    res.status(500).json({ message: "Failed to delete setting" });
  }
});

// Initialize default settings (admin only)
router.post("/initialize", requireAdmin, async (req, res) => {
  try {
    const defaultSettings = [
      {
        key: "maintenance_mode",
        value: false,
        category: "general",
        description: "Enable maintenance mode to prevent user access"
      },
      {
        key: "user_registration_enabled",
        value: true,
        category: "general",
        description: "Allow new user registrations"
      },
      {
        key: "marketplace_enabled",
        value: true,
        category: "features",
        description: "Enable marketplace feature"
      },
      {
        key: "email_notifications_enabled",
        value: true,
        category: "notifications",
        description: "Enable email notifications"
      },
      {
        key: "max_goals_per_user",
        value: 50,
        category: "features",
        description: "Maximum number of goals per user"
      },
      {
        key: "max_marketplace_listings_per_user",
        value: 20,
        category: "marketplace",
        description: "Maximum marketplace listings per user"
      }
    ];
    
    const results = [];
    for (const setting of defaultSettings) {
      const existing = await SystemSettings.findOne({ key: setting.key });
      if (!existing) {
        const newSetting = await SystemSettings.create({
          ...setting,
          updatedBy: req.user.id
        });
        results.push(newSetting);
      }
    }
    
    res.json({ 
      message: `Initialized ${results.length} default settings`,
      settings: results
    });
  } catch (error) {
    console.error("Initialize settings error:", error);
    res.status(500).json({ message: "Failed to initialize settings" });
  }
});

export default router;
