import { Router } from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import { buildAuthPayload, buildUserResponse, ensureUserRoleArray } from "../utils/roles.js";

const router = Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId_timestamp_originalname
    const userId = req.user.id;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${userId}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Get user profile
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('-passwordHash -firebaseUid');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// Update user profile (name, phone, address - email cannot be changed)
router.put("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, address } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        message: "Name is required" 
      });
    }
    
    // Build update object
    const updateData = {
      name: name.trim(),
      updatedAt: new Date()
    };
    
    // Add optional fields if provided
    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null;
    }
    
    if (address !== undefined) {
      updateData.address = address ? address.trim() : null;
    }
    
    // Update user profile (name, phone, address; email cannot be changed)
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-passwordHash -firebaseUid' }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(updatedUser);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Change password
router.put("/password", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: "Current password and new password are required" 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: "New password must be at least 6 characters long" 
      });
    }
    
    // Get user with password hash
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        message: "Current password is incorrect" 
      });
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await User.findByIdAndUpdate(userId, {
      passwordHash: newPasswordHash,
      updatedAt: new Date()
    });
    
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

// Upload avatar file
router.post("/avatar-upload", requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ 
        message: "No image file uploaded" 
      });
    }
    
    // Get the current user to check for existing avatar
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Delete old avatar file if it exists and is not a URL
    if (currentUser.avatar && !currentUser.avatar.startsWith('http')) {
      const oldAvatarPath = path.join('uploads/avatars', currentUser.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }
    
    // Update user with new avatar path
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        avatar: avatarUrl,
        updatedAt: new Date()
      },
      { new: true, select: '-passwordHash -firebaseUid' }
    );
    
    res.json(updatedUser);
  } catch (error) {
    console.error("Avatar upload error:", error);
    
    // Clean up uploaded file if there was an error
    if (req.file) {
      const filePath = path.join('uploads/avatars', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    res.status(500).json({ message: "Failed to upload avatar" });
  }
});

// Update avatar (URL method)
router.put("/avatar", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { avatar } = req.body;
    
    // Validate required fields
    if (!avatar) {
      return res.status(400).json({ 
        message: "Avatar URL is required" 
      });
    }
    
    // Basic URL validation
    try {
      new URL(avatar);
    } catch (urlError) {
      return res.status(400).json({ 
        message: "Please provide a valid URL for the avatar" 
      });
    }
    
    // Get the current user to check for existing avatar
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Delete old avatar file if it exists and is not a URL
    if (currentUser.avatar && !currentUser.avatar.startsWith('http')) {
      const oldAvatarPath = path.join('uploads/avatars', path.basename(currentUser.avatar));
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }
    
    // Update avatar
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        avatar: avatar.trim(),
        updatedAt: new Date()
      },
      { new: true, select: '-passwordHash -firebaseUid' }
    );
    
    res.json(updatedUser);
  } catch (error) {
    console.error("Update avatar error:", error);
    res.status(500).json({ message: "Failed to update avatar" });
  }
});

// Delete user account
router.delete("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user exists
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Delete user account
    await User.findByIdAndDelete(userId);
    
    // Note: In a production app, you might want to:
    // 1. Soft delete (mark as deleted instead of removing)
    // 2. Anonymize user data instead of deleting
    // 3. Delete related data (goals, finances, etc.)
    // 4. Send confirmation email
    // 5. Log the deletion for audit purposes
    
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ message: "Failed to delete account" });
  }
});

// Get profile statistics (optional feature)
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Import models for statistics
    const Goal = (await import("../models/Goal.js")).default;
    const Finance = (await import("../models/Finance.js")).default;
    const Marketplace = (await import("../models/Marketplace.js")).default;
    
    // Get user statistics
    const [goalsCount, financeCount, marketplaceCount] = await Promise.all([
      Goal.countDocuments({ userId, status: { $ne: 'archived' } }),
      Finance.countDocuments({ userId }),
      Marketplace.countDocuments({ userId })
    ]);
    
    // Get recent activity
    const recentGoals = await Goal.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(3)
      .select('title status updatedAt');
    
    const recentFinance = await Finance.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('type amount description createdAt');
    
    const recentMarketplace = await Marketplace.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(3)
      .select('title status price updatedAt');
    
    res.json({
      stats: {
        goalsCount,
        financeCount,
        marketplaceCount
      },
      recentActivity: {
        goals: recentGoals,
        finance: recentFinance,
        marketplace: recentMarketplace
      }
    });
  } catch (error) {
    console.error("Get profile stats error:", error);
    res.status(500).json({ message: "Failed to fetch profile statistics" });
  }
});

// Switch role (goal_setter <-> buyer). Admin cannot be switched here.
router.put(
  "/role",
  requireAuth,
  [body("role").isIn(["goal_setter", "buyer"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid role" });
    }

    try {
      const userId = req.user.id;
      const { role } = req.body;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role === "admin") return res.status(403).json({ message: "Admin role cannot be switched" });

      await ensureUserRoleArray(user);

      let rolesUpdated = false;
      if (!Array.isArray(user.roles)) {
        user.roles = [];
        rolesUpdated = true;
      }

      if (!user.roles.includes(role)) {
        user.roles.push(role);
        rolesUpdated = true;
      }

      const roleChanged = user.role !== role;
      if (roleChanged) {
        user.role = role;
        rolesUpdated = true;
      }

      if (rolesUpdated) {
        await user.save();
      }

      const message = roleChanged ? "Role updated" : "Role unchanged";

      const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
      const authPayload = buildAuthPayload(user);
      const token = jwt.sign(authPayload, JWT_SECRET, { expiresIn: "7d" });
      const responseUser = buildUserResponse(user);

      return res.json({
        message,
        token,
        user: responseUser,
      });
    } catch (e) {
      console.error("Switch role error", e);
      return res.status(500).json({ message: "Failed to switch role" });
    }
  }
);

export default router;

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Update user location
router.put("/location", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, address, city, state, country, postalCode } = req.body;
    
    // Validate required fields
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        message: "Latitude and longitude are required" 
      });
    }
    
    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ 
        message: "Invalid latitude or longitude values" 
      });
    }
    
    // Update user location
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address: address?.trim() || "",
          city: city?.trim() || "",
          state: state?.trim() || "",
          country: country?.trim() || "India",
          postalCode: postalCode?.trim() || "",
          lastUpdated: new Date()
        },
        updatedAt: new Date()
      },
      { new: true, select: '-passwordHash -firebaseUid' }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      message: "Location updated successfully",
      location: updatedUser.location
    });
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({ message: "Failed to update location" });
  }
});

// Update geo preferences
router.put("/geo-preferences", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { maxDistance, allowLocationSharing, showExactLocation } = req.body;
    
    // Validate maxDistance
    if (maxDistance !== undefined && (maxDistance < 1 || maxDistance > 500)) {
      return res.status(400).json({ 
        message: "Max distance must be between 1 and 500 kilometers" 
      });
    }
    
    // Update geo preferences
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        geoPreferences: {
          maxDistance: maxDistance || 50,
          allowLocationSharing: allowLocationSharing !== undefined ? allowLocationSharing : true,
          showExactLocation: showExactLocation !== undefined ? showExactLocation : false
        },
        updatedAt: new Date()
      },
      { new: true, select: '-passwordHash -firebaseUid' }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      message: "Geo preferences updated successfully",
      geoPreferences: updatedUser.geoPreferences
    });
  } catch (error) {
    console.error("Update geo preferences error:", error);
    res.status(500).json({ message: "Failed to update geo preferences" });
  }
});

// Find nearby buyers for goal setters
router.get("/nearby-buyers", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { maxDistance = 50, category, limit = 20 } = req.query;
    
    // Get current user
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user has location
    if (!currentUser.location?.latitude || !currentUser.location?.longitude) {
      return res.status(400).json({ 
        message: "Please update your location first to find nearby buyers" 
      });
    }
    
    // Check if user allows location sharing
    if (!currentUser.geoPreferences?.allowLocationSharing) {
      return res.status(403).json({ 
        message: "Location sharing is disabled. Please enable it in your geo preferences" 
      });
    }
    
    // Find buyers with location data
    const allBuyers = await User.find({
      roles: 'buyer',
      _id: { $ne: userId },
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    }).select('name email avatar location geoPreferences createdAt');
    
    // Filter by allowLocationSharing in JavaScript since the query seems to have issues
    const buyers = allBuyers.filter(buyer => buyer.geoPreferences?.allowLocationSharing === true);
    
    // Calculate distances and filter
    const nearbyBuyers = buyers
      .map(buyer => {
        const distance = calculateDistance(
          currentUser.location.latitude,
          currentUser.location.longitude,
          buyer.location.latitude,
          buyer.location.longitude
        );
        
        return {
          id: buyer._id,
          name: buyer.name,
          email: buyer.email,
          avatar: buyer.avatar,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
          location: {
            city: buyer.location.city,
            state: buyer.location.state,
            country: buyer.location.country,
            showExactLocation: buyer.geoPreferences?.showExactLocation || false,
            // Only show exact coordinates if user allows it
            latitude: buyer.geoPreferences?.showExactLocation ? buyer.location.latitude : null,
            longitude: buyer.geoPreferences?.showExactLocation ? buyer.location.longitude : null
          },
          joinedDate: buyer.createdAt
        };
      })
      .filter(buyer => buyer.distance <= parseInt(maxDistance))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, parseInt(limit));
    
    res.json({
      nearbyBuyers,
      totalFound: nearbyBuyers.length,
      searchCriteria: {
        maxDistance: parseInt(maxDistance),
        userLocation: {
          latitude: currentUser.location.latitude,
          longitude: currentUser.location.longitude,
          city: currentUser.location.city,
          state: currentUser.location.state
        }
      }
    });
  } catch (error) {
    console.error("Find nearby buyers error:", error);
    res.status(500).json({ message: "Failed to find nearby buyers" });
  }
});

// Find nearby goal setters for buyers
router.get("/nearby-goal-setters", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { maxDistance = 50, limit = 20 } = req.query;
    
    // Get current user
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user has location
    if (!currentUser.location?.latitude || !currentUser.location?.longitude) {
      return res.status(400).json({ 
        message: "Please update your location first to find nearby goal setters" 
      });
    }
    
    // Check if user allows location sharing
    if (!currentUser.geoPreferences?.allowLocationSharing) {
      return res.status(403).json({ 
        message: "Location sharing is disabled. Please enable it in your geo preferences" 
      });
    }
    
    // Find goal setters with location data
    // First try to find goal setters with exact coordinates
    let goalSetters = await User.find({
      roles: 'goal_setter',
      _id: { $ne: userId },
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    }).select('name email avatar location geoPreferences createdAt');
    
    // Filter by allowLocationSharing in JavaScript since the query seems to have issues
    goalSetters = goalSetters.filter(gs => gs.geoPreferences?.allowLocationSharing === true);
    
    // If no goal setters found with exact coordinates, include those with location sharing enabled
    // but without exact coordinates (as a fallback)
    if (goalSetters.length === 0) {
      console.log('No goal setters with exact coordinates found, searching for fallback options...');
      const allGoalSetters = await User.find({
        roles: 'goal_setter',
        _id: { $ne: userId }
      }).select('name email avatar location geoPreferences createdAt');
      
      // Filter by allowLocationSharing in JavaScript
      goalSetters = allGoalSetters.filter(gs => gs.geoPreferences?.allowLocationSharing === true);
    }
    
    // Calculate distances and filter
    const nearbyGoalSetters = goalSetters
      .map(goalSetter => {
        let distance = null;
        let hasExactLocation = false;
        
        // Calculate distance only if both users have exact coordinates
        if (goalSetter.location?.latitude && goalSetter.location?.longitude) {
          distance = calculateDistance(
            currentUser.location.latitude,
            currentUser.location.longitude,
            goalSetter.location.latitude,
            goalSetter.location.longitude
          );
          hasExactLocation = true;
        }
        
        return {
          id: goalSetter._id,
          name: goalSetter.name,
          email: goalSetter.email,
          avatar: goalSetter.avatar,
          distance: distance ? Math.round(distance * 10) / 10 : null, // Round to 1 decimal place
          hasExactLocation,
          location: {
            city: goalSetter.location?.city || "Unknown",
            state: goalSetter.location?.state || "Unknown",
            country: goalSetter.location?.country || "India",
            showExactLocation: goalSetter.geoPreferences?.showExactLocation || false,
            // Only show exact coordinates if user allows it and has them
            latitude: (goalSetter.geoPreferences?.showExactLocation && goalSetter.location?.latitude) ? goalSetter.location.latitude : null,
            longitude: (goalSetter.geoPreferences?.showExactLocation && goalSetter.location?.longitude) ? goalSetter.location.longitude : null
          },
          joinedDate: goalSetter.createdAt,
          needsLocationUpdate: !hasExactLocation
        };
      })
      .filter(goalSetter => {
        // Include goal setters with exact location within distance
        if (goalSetter.hasExactLocation && goalSetter.distance <= parseInt(maxDistance)) {
          return true;
        }
        // Include goal setters without exact location as fallback (show all)
        if (!goalSetter.hasExactLocation) {
          return true;
        }
        return false;
      })
      .sort((a, b) => {
        // Sort by distance first (exact locations), then by name
        if (a.hasExactLocation && b.hasExactLocation) {
          return a.distance - b.distance;
        }
        if (a.hasExactLocation && !b.hasExactLocation) {
          return -1;
        }
        if (!a.hasExactLocation && b.hasExactLocation) {
          return 1;
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, parseInt(limit));
    
    // Count goal setters with and without exact location
    const withExactLocation = nearbyGoalSetters.filter(gs => gs.hasExactLocation).length;
    const withoutExactLocation = nearbyGoalSetters.filter(gs => !gs.hasExactLocation).length;
    
    res.json({
      nearbyGoalSetters,
      totalFound: nearbyGoalSetters.length,
      locationStats: {
        withExactLocation,
        withoutExactLocation,
        hasFallbackResults: withoutExactLocation > 0
      },
      searchCriteria: {
        maxDistance: parseInt(maxDistance),
        userLocation: {
          latitude: currentUser.location.latitude,
          longitude: currentUser.location.longitude,
          city: currentUser.location.city,
          state: currentUser.location.state
        }
      }
    });
  } catch (error) {
    console.error("Find nearby goal setters error:", error);
    res.status(500).json({ message: "Failed to find nearby goal setters" });
  }
});

// Get user's location and geo preferences
router.get("/location", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('location geoPreferences');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      location: user.location,
      geoPreferences: user.geoPreferences
    });
  } catch (error) {
    console.error("Get location error:", error);
    res.status(500).json({ message: "Failed to fetch location" });
  }
});
