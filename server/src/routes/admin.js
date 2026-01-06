import { Router } from "express";
import User from "../models/User.js";
import Goal from "../models/Goal.js";
import Purchase from "../models/Purchase.js";
import Marketplace from "../models/Marketplace.js";
import Finance from "../models/Finance.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();

// Get admin dashboard statistics
router.get("/stats", requireAdmin, async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    // Count users by roles array (users can have multiple roles)
    const adminUsers = await User.countDocuments({ roles: "admin" });
    const goalSetterUsers = await User.countDocuments({ roles: "goal_setter" });
    const buyerUsers = await User.countDocuments({ roles: "buyer" });
    
    // Calculate active users (users with goals or recently active)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get users who have goals
    const usersWithGoals = await Goal.distinct('userId');
    
    // Get recently active users (updated in last 30 days)
    const recentlyActiveUsers = await User.find({
      updatedAt: { $gte: thirtyDaysAgo },
      isVerified: true
    }).select('_id');
    
    // Combine and get unique active users
    const activeUserIds = [...new Set([
      ...usersWithGoals.map(id => id.toString()),
      ...recentlyActiveUsers.map(user => user._id.toString())
    ])];
    
    const activeUsers = activeUserIds.length;
    
    // Get goal statistics
    const totalGoals = await Goal.countDocuments();
    const activeGoals = await Goal.countDocuments({ status: { $ne: "archived" } });
    const completedGoals = await Goal.countDocuments({ status: "completed" });
    
    // Get recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });
    
    // Get users by provider
    const localUsers = await User.countDocuments({ provider: "local" });
    const googleUsers = await User.countDocuments({ provider: "google" });
    
    // Calculate system health (basic metrics)
    const systemHealth = activeUsers > 0 ? "Good" : "Warning";
    
    // Get geographic distribution
    const geoByCountry = await User.aggregate([
      { $match: { 'location.country': { $exists: true, $ne: null } } },
      { $group: { _id: '$location.country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const geoByState = await User.aggregate([
      { $match: { 'location.state': { $exists: true, $ne: null } } },
      { $group: { _id: '$location.state', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    const geoByCity = await User.aggregate([
      { $match: { 'location.city': { $exists: true, $ne: null } } },
      { $group: { _id: '$location.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        verified: verifiedUsers,
        newThisWeek: newUsersThisWeek,
        byRole: {
          admin: adminUsers,
          goalSetter: goalSetterUsers,
          buyer: buyerUsers
        },
        byProvider: {
          local: localUsers,
          google: googleUsers
        }
      },
      goals: {
        total: totalGoals,
        active: activeGoals,
        completed: completedGoals
      },
      system: {
        health: systemHealth,
        uptime: "99.9%"
      },
      geo: {
        byCountry: geoByCountry,
        byState: geoByState,
        byCity: geoByCity
      }
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ message: "Failed to fetch admin statistics" });
  }
});

// Get recent users for admin dashboard
router.get("/users/recent", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const users = await User.find({}, {
      name: 1,
      email: 1,
      role: 1,
      roles: 1,
      provider: 1,
      isVerified: 1,
      createdAt: 1
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    // Format the data for frontend
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || (user.roles && user.roles[0]) || "goal_setter",
      roles: user.roles || [user.role || "goal_setter"],
      provider: user.provider,
      isVerified: user.isVerified,
      joinedAt: formatTimeAgo(user.createdAt)
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error("Recent users error:", error);
    res.status(500).json({ message: "Failed to fetch recent users" });
  }
});

// Get all users with pagination
router.get("/users", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const role = req.query.role;
    const search = req.query.search;
    
    // Build query
    let query = {};
    if (role && role !== "all") {
      // Query roles array for users with this role
      query.roles = role;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    
    const users = await User.find(query, {
      name: 1,
      email: 1,
      role: 1,
      roles: 1,
      provider: 1,
      isVerified: 1,
      createdAt: 1,
      updatedAt: 1
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    const total = await User.countDocuments(query);
    
    // Get goals count for each user
    const userIds = users.map(user => user._id);
    const goalsCounts = await Goal.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } }
    ]);
    
    // Get purchase count for buyers
    const purchaseCounts = await Purchase.aggregate([
      { $match: { buyerId: { $in: userIds } } },
      { $group: { _id: "$buyerId", count: { $sum: 1 } } }
    ]);
    
    // Get marketplace listings count for goal setters
    const listingsCounts = await Marketplace.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } }
    ]);
    
    // Create a map of userId to goals count
    const goalsCountMap = {};
    goalsCounts.forEach(item => {
      goalsCountMap[item._id.toString()] = item.count;
    });
    
    // Create a map of userId to purchase count
    const purchaseCountMap = {};
    purchaseCounts.forEach(item => {
      purchaseCountMap[item._id.toString()] = item.count;
    });
    
    // Create a map of userId to listings count
    const listingsCountMap = {};
    listingsCounts.forEach(item => {
      listingsCountMap[item._id.toString()] = item.count;
    });
    
    // Format the data
    const formattedUsers = users.map(user => {
      const userId = user._id.toString();
      const goalsCount = goalsCountMap[userId] || 0;
      const purchasesCount = purchaseCountMap[userId] || 0;
      const listingsCount = listingsCountMap[userId] || 0;
      
      // Get user roles array
      const userRoles = user.roles || [user.role || "goal_setter"];
      const primaryRole = user.role || userRoles[0] || "goal_setter";
      
      // Determine ACTIVE roles based on actual usage
      // Only show roles that the user is actively using
      const activeRoles = [];
      
      // Always include admin role if user has it
      if (userRoles.includes('admin')) {
        activeRoles.push('admin');
      }
      
      // Include goal_setter role if user has listings or goals
      if (userRoles.includes('goal_setter')) {
        const hasActivity = listingsCount > 0 || goalsCount > 0;
        if (hasActivity) {
          activeRoles.push('goal_setter');
        }
      }
      
      // Include buyer role if user has purchases
      if (userRoles.includes('buyer')) {
        const hasPurchases = purchasesCount > 0;
        if (hasPurchases) {
          activeRoles.push('buyer');
        }
      }
      
      // If no active roles found but user has roles, use the first role
      // This handles newly registered users who haven't made any activity yet
      if (activeRoles.length === 0 && userRoles.length > 0) {
        activeRoles.push(userRoles[0]);
      }
      
      // Determine overall user status
      let isActive = user.isVerified && activeRoles.length > 0;
      
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: primaryRole,
        roles: userRoles, // All assigned roles
        activeRoles: activeRoles, // Only roles user is actually using
        provider: user.provider,
        status: isActive ? 'active' : 'inactive',
        isVerified: user.isVerified,
        goalsCount: goalsCount,
        purchasesCount: purchasesCount,
        listingsCount: listingsCount,
        joinedAt: user.createdAt,
        lastLogin: user.updatedAt
      };
    });
    
    res.json({
      users: formattedUsers,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: total,
        limit
      }
    });
  } catch (error) {
    console.error("Users list error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Get user details
router.get("/users/:id", requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id, {
      name: 1,
      email: 1,
      role: 1,
      roles: 1,
      provider: 1,
      isVerified: 1,
      createdAt: 1,
      updatedAt: 1
    });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Get user's goals
    const userGoals = await Goal.find({ userId: req.params.id });
    
    // Calculate goals count and determine status
    const goalsCount = userGoals.length;
    const hasGoals = goalsCount > 0;
    const recentlyActive = (Date.now() - user.updatedAt.getTime()) < (30 * 24 * 60 * 60 * 1000); // 30 days
    const isActive = user.isVerified && (hasGoals || recentlyActive);
    
    const userRoles = user.roles || [user.role || "goal_setter"];
    const primaryRole = user.role || userRoles[0] || "goal_setter";
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: primaryRole,
        roles: userRoles,
        provider: user.provider,
        status: isActive ? 'active' : 'inactive',
        isVerified: user.isVerified,
        goalsCount: goalsCount,
        joinedAt: user.createdAt,
        lastLogin: user.updatedAt
      },
      goals: userGoals
    });
  } catch (error) {
    console.error("User details error:", error);
    res.status(500).json({ message: "Failed to fetch user details" });
  }
});

// Update user role or status
router.patch("/users/:id", requireAdmin, async (req, res) => {
  try {
    const { role, roles, isVerified } = req.body;
    const userId = req.params.id;
    
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Prevent removing admin role if it's the only admin
    const currentUserRoles = currentUser.roles || [currentUser.role];
    const isCurrentlyAdmin = currentUserRoles.includes("admin");
    
    if (isCurrentlyAdmin) {
      const adminCount = await User.countDocuments({ roles: "admin" });
      
      // Check if we're trying to remove admin role
      const newRoles = roles || (role ? [role] : null);
      const willRemoveAdmin = newRoles && !newRoles.includes("admin");
      
      if (willRemoveAdmin && adminCount <= 1) {
        return res.status(400).json({ 
          message: "Cannot remove admin role from the only admin user" 
        });
      }
    }
    
    const updateData = {};
    
    // Handle roles array update
    if (roles && Array.isArray(roles) && roles.length > 0) {
      updateData.roles = roles;
      updateData.role = roles[0]; // Keep legacy field in sync
    } else if (role) {
      // If single role provided, update both fields
      updateData.role = role;
      // Add to roles array if not already present
      if (!currentUserRoles.includes(role)) {
        updateData.roles = [...currentUserRoles.filter(r => r !== role), role];
      }
    }
    
    if (typeof isVerified === "boolean") updateData.isVerified = isVerified;
    
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: "name email role roles isVerified" }
    );
    
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// Get user goals for user details modal
router.get("/users/:id/goals", requireAdmin, async (req, res) => {
  try {
    const userGoals = await Goal.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to recent 50 goals
    
    res.json(userGoals);
  } catch (error) {
    console.error("User goals error:", error);
    res.status(500).json({ message: "Failed to fetch user goals" });
  }
});

// Get user activity for user details modal
router.get("/users/:id/activity", requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get recent goals as activity
    const recentGoals = await Goal.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title status updatedAt targetAmount currentAmount');
    
    // Format as activity entries
    const activities = recentGoals.map(goal => ({
      action: `Goal ${goal.status === 'completed' ? 'completed' : 'updated'}`,
      details: goal.title,
      timestamp: goal.updatedAt,
      metadata: {
        goalId: goal._id,
        status: goal.status,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount
      }
    }));
    
    // Add user creation as first activity
    const user = await User.findById(userId, 'createdAt name');
    if (user) {
      activities.unshift({
        action: 'Account created',
        details: `User account created`,
        timestamp: user.createdAt,
        metadata: {}
      });
    }
    
    res.json(activities);
  } catch (error) {
    console.error("User activity error:", error);
    res.status(500).json({ message: "Failed to fetch user activity" });
  }
});

// Delete user
router.delete("/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Prevent deleting the only admin
    const userRoles = user.roles || [user.role];
    const isAdmin = userRoles.includes("admin");
    
    if (isAdmin) {
      const adminCount = await User.countDocuments({ roles: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          message: "Cannot delete the only admin user" 
        });
      }
    }
    
    await User.findByIdAndDelete(userId);
    
    // Also delete user's goals
    await Goal.deleteMany({ userId });
    
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// Get all goals with user details for admin dashboard
router.get("/goals", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';
    
    // Build query
    let query = {};
    if (status && status !== "all") {
      if (status === "overdue") {
        // Special handling for overdue filter
        query.dueDate = { $lt: new Date() };
        query.status = { $ne: 'completed' };
      } else {
        query.status = status;
      }
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get goals with user details
    const goals = await Goal.find(query)
      .populate('userId', 'name email role roles')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean for better performance
    
    const total = await Goal.countDocuments(query);
    
    // Log query details
    console.log('📋 Admin Goals Query:', {
      filters: { status, search, sortBy, sortOrder },
      totalFound: goals.length,
      withValidUsers: goals.filter(g => g.userId).length,
      page,
      limit
    });

    // Log individual goals for debugging
    console.log('📝 Goals found:', goals
      .filter(g => g.userId)
      .map(g => ({
        title: g.title,
        user: g.userId?.name || 'No User',
        status: g.status,
        createdAt: g.createdAt
      }))
    );

    // Format goals with additional calculated fields
    const formattedGoals = goals
      .filter(goal => goal.userId) // Filter out goals with deleted users
      .map(goal => {
        const progressPercentage = goal.targetAmount && goal.targetAmount > 0 
          ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
          : 0;
        
        const isOverdue = goal.dueDate && new Date(goal.dueDate) < new Date() && goal.status !== 'completed';
        const daysUntilDue = goal.dueDate 
          ? Math.ceil((new Date(goal.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
          : null;
        
        // Handle cases where userId might be null or not populated
        const user = goal.userId ? {
          id: goal.userId._id,
          name: goal.userId.name || 'Unknown User',
          email: goal.userId.email || 'unknown@email.com',
          role: goal.userId.role || (goal.userId.roles && goal.userId.roles[0]) || "goal_setter",
          roles: goal.userId.roles || [goal.userId.role || "goal_setter"]
        } : {
          id: 'unknown',
          name: 'Deleted User',
          email: 'deleted@user.com',
          role: 'goal_setter',
          roles: ['goal_setter']
        };
        
        return {
          id: goal._id,
          title: goal.title,
          description: goal.description,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          progressPercentage: Math.min(progressPercentage, 100),
          dueDate: goal.dueDate,
          status: goal.status,
          isOverdue: isOverdue,
          daysUntilDue: daysUntilDue,
          createdAt: goal.createdAt,
          updatedAt: goal.updatedAt,
          user: user
        };
      });
    
    res.json({
      goals: formattedGoals,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: total,
        limit
      },
      summary: {
        total: total,
        planned: await Goal.countDocuments({ ...query, status: 'planned' }),
        inProgress: await Goal.countDocuments({ ...query, status: 'in_progress' }),
        completed: await Goal.countDocuments({ ...query, status: 'completed' }),
        archived: await Goal.countDocuments({ ...query, status: 'archived' }),
        overdue: await Goal.countDocuments({ 
          ...query, 
          dueDate: { $lt: new Date() }, 
          status: { $ne: 'completed' } 
        })
      }
    });
  } catch (error) {
    console.error("❌ Admin goals error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: "Failed to fetch goals",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get goal statistics for admin dashboard (MUST come before :id routes)
router.get("/goals/stats", requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get all goals with user data to filter out orphaned ones
    const allGoalsWithUsers = await Goal.find({})
      .populate('userId', '_id')
      .lean();
    
    // Filter out goals with deleted users
    const validGoals = allGoalsWithUsers.filter(goal => goal.userId);
    const validGoalIds = validGoals.map(g => g._id);
    
    // Basic counts (only valid goals)
    const totalGoals = validGoals.length;
    const activeGoals = validGoals.filter(g => 
      g.status === 'planned' || g.status === 'in_progress'
    ).length;
    const completedGoals = validGoals.filter(g => g.status === 'completed').length;
    const overdueGoals = validGoals.filter(g => 
      g.dueDate && new Date(g.dueDate) < now && g.status !== 'completed'
    ).length;
    
    // Recent activity (only valid goals)
    const goalsCreatedThisWeek = validGoals.filter(g => 
      new Date(g.createdAt) >= sevenDaysAgo
    ).length;
    const goalsCompletedThisWeek = validGoals.filter(g => 
      g.status === 'completed' && new Date(g.updatedAt) >= sevenDaysAgo
    ).length;
    
    // Progress analytics (only valid goals)
    const goalsWithAmounts = validGoals.filter(g => 
      g.targetAmount && g.targetAmount > 0 && 
      (g.status === 'planned' || g.status === 'in_progress')
    );
    
    const totalTargetAmount = goalsWithAmounts.reduce((sum, goal) => sum + (goal.targetAmount || 0), 0);
    const totalCurrentAmount = goalsWithAmounts.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0);
    const averageProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
    
    // User engagement (only valid goals)
    const usersWithGoals = [...new Set(validGoals.map(g => g.userId._id.toString()))].length;
    const activeUsersWithGoals = [...new Set(
      validGoals
        .filter(g => new Date(g.updatedAt) >= thirtyDaysAgo)
        .map(g => g.userId._id.toString())
    )].length;
    
    // Log real-time stats for debugging
    console.log('📊 Real-time Goal Stats:', {
      totalGoalsInDB: allGoalsWithUsers.length,
      goalsWithValidUsers: validGoals.length,
      orphanedGoals: allGoalsWithUsers.length - validGoals.length,
      breakdown: {
        planned: validGoals.filter(g => g.status === 'planned').length,
        in_progress: validGoals.filter(g => g.status === 'in_progress').length,
        completed: completedGoals,
        archived: validGoals.filter(g => g.status === 'archived').length,
        overdue: overdueGoals
      }
    });

    res.json({
      overview: {
        total: totalGoals,
        active: activeGoals,
        completed: completedGoals,
        overdue: overdueGoals
      },
      recentActivity: {
        createdThisWeek: goalsCreatedThisWeek,
        completedThisWeek: goalsCompletedThisWeek
      },
      progress: {
        totalTargetAmount: totalTargetAmount,
        totalCurrentAmount: totalCurrentAmount,
        averageProgress: Math.round(averageProgress * 100) / 100
      },
      engagement: {
        usersWithGoals: usersWithGoals,
        activeUsersWithGoals: activeUsersWithGoals
      },
      // Add detailed breakdown for admin
      breakdown: {
        planned: validGoals.filter(g => g.status === 'planned').length,
        in_progress: validGoals.filter(g => g.status === 'in_progress').length,
        completed: completedGoals,
        archived: validGoals.filter(g => g.status === 'archived').length,
        overdue: overdueGoals,
        orphaned: allGoalsWithUsers.length - validGoals.length
      }
    });
  } catch (error) {
    console.error("❌ Admin goals stats error:", error);
    res.status(500).json({ message: "Failed to fetch goal statistics" });
  }
});

// Delete overdue goals (admin only) - MUST come before :id route
router.delete("/goals/overdue", requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    
    // Find and delete overdue goals
    const overdueGoals = await Goal.find({
      dueDate: { $lt: now },
      status: { $ne: 'completed' }
    });
    
    if (overdueGoals.length === 0) {
      return res.json({ 
        message: "No overdue goals found to delete",
        deletedCount: 0,
        deletedGoals: []
      });
    }
    
    // Delete the overdue goals
    const deleteResult = await Goal.deleteMany({
      dueDate: { $lt: now },
      status: { $ne: 'completed' }
    });
    
    // Format deleted goals info for response
    const deletedGoalsInfo = overdueGoals.map(goal => ({
      id: goal._id,
      title: goal.title,
      userId: goal.userId,
      dueDate: goal.dueDate,
      status: goal.status
    }));
    
    res.json({
      message: `Successfully deleted ${deleteResult.deletedCount} overdue goals`,
      deletedCount: deleteResult.deletedCount,
      deletedGoals: deletedGoalsInfo
    });
  } catch (error) {
    console.error("Delete overdue goals error:", error);
    res.status(500).json({ message: "Failed to delete overdue goals" });
  }
});

// Delete specific goal (admin only)
router.delete("/goals/:id", requireAdmin, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }
    
    // Check if goal is overdue
    const isOverdue = goal.dueDate && new Date(goal.dueDate) < new Date() && goal.status !== 'completed';
    
    if (!isOverdue) {
      return res.status(400).json({ 
        message: "Only overdue goals can be deleted by admin",
        goalStatus: goal.status,
        isOverdue: false
      });
    }
    
    await Goal.findByIdAndDelete(req.params.id);
    
    res.json({
      message: "Overdue goal deleted successfully",
      deletedGoal: {
        id: goal._id,
        title: goal.title,
        userId: goal.userId,
        dueDate: goal.dueDate,
        status: goal.status
      }
    });
  } catch (error) {
    console.error("Delete goal error:", error);
    res.status(500).json({ message: "Failed to delete goal" });
  }
});

// Get all marketplace listings for admin control
router.get("/marketplace/listings", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const category = req.query.category;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';
    
    // Build query
    let query = {};
    if (status && status !== "all") {
      query.status = status;
    }
    if (category && category !== "all") {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get listings with user details
    const listings = await Marketplace.find(query)
      .populate('userId', 'name email role roles')
      .populate('buyerId', 'name email role roles')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await Marketplace.countDocuments(query);
    
    // Format listings with additional calculated fields
    const formattedListings = listings.map(listing => {
      const daysListed = Math.ceil((new Date() - new Date(listing.createdAt)) / (1000 * 60 * 60 * 24));
      const isOldListing = daysListed > 30;
      
      return {
        id: listing._id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        condition: listing.condition,
        status: listing.status,
        views: listing.views,
        likes: listing.likes,
        featured: listing.featured,
        daysListed: daysListed,
        isOldListing: isOldListing,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        soldAt: listing.soldAt,
        seller: {
          id: listing.userId._id,
          name: listing.userId.name,
          email: listing.userId.email,
          role: listing.userId.role || (listing.userId.roles && listing.userId.roles[0]) || "goal_setter",
          roles: listing.userId.roles || [listing.userId.role || "goal_setter"]
        },
        buyer: listing.buyerId ? {
          id: listing.buyerId._id,
          name: listing.buyerId.name,
          email: listing.buyerId.email,
          role: listing.buyerId.role || (listing.buyerId.roles && listing.buyerId.roles[0]) || "buyer",
          roles: listing.buyerId.roles || [listing.buyerId.role || "buyer"]
        } : null,
        images: listing.images
      };
    });
    
    res.json({
      listings: formattedListings,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: total,
        limit
      },
      summary: {
        total: total,
        active: await Marketplace.countDocuments({ ...query, status: 'active' }),
        sold: await Marketplace.countDocuments({ ...query, status: 'sold' }),
        pending: await Marketplace.countDocuments({ ...query, status: 'pending' }),
        archived: await Marketplace.countDocuments({ ...query, status: 'archived' }),
        featured: await Marketplace.countDocuments({ ...query, featured: true }),
        oldListings: await Marketplace.countDocuments({ 
          ...query, 
          createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          status: 'active'
        })
      }
    });
  } catch (error) {
    console.error("Admin marketplace listings error:", error);
    res.status(500).json({ message: "Failed to fetch marketplace listings" });
  }
});

// Get marketplace statistics for admin dashboard
router.get("/marketplace/stats", requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Basic counts
    const totalListings = await Marketplace.countDocuments();
    const activeListings = await Marketplace.countDocuments({ status: 'active' });
    const soldListings = await Marketplace.countDocuments({ status: 'sold' });
    const featuredListings = await Marketplace.countDocuments({ featured: true });
    
    // Recent activity
    const listingsCreatedThisWeek = await Marketplace.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });
    const listingsSoldThisWeek = await Marketplace.countDocuments({ 
      status: 'sold',
      soldAt: { $gte: sevenDaysAgo }
    });
    
    // Financial analytics
    const soldListingsWithPrice = await Marketplace.find({ 
      status: 'sold',
      soldAt: { $gte: thirtyDaysAgo }
    });
    
    const totalRevenue = soldListingsWithPrice.reduce((sum, listing) => sum + (listing.price || 0), 0);
    const averageSalePrice = soldListingsWithPrice.length > 0 ? totalRevenue / soldListingsWithPrice.length : 0;
    
    // User engagement
    const sellersWithListings = await Marketplace.distinct('userId');
    const activeSellers = await Marketplace.distinct('userId', {
      updatedAt: { $gte: thirtyDaysAgo }
    });
    
    // Category breakdown
    const categoryStats = await Marketplace.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Purchase analytics
    const totalPurchases = await Purchase.countDocuments();
    const completedPurchases = await Purchase.countDocuments({ status: 'completed' });
    const pendingPurchases = await Purchase.countDocuments({ status: 'pending' });
    
    res.json({
      overview: {
        totalListings: totalListings,
        activeListings: activeListings,
        soldListings: soldListings,
        featuredListings: featuredListings
      },
      recentActivity: {
        createdThisWeek: listingsCreatedThisWeek,
        soldThisWeek: listingsSoldThisWeek
      },
      financial: {
        totalRevenue: totalRevenue,
        averageSalePrice: Math.round(averageSalePrice * 100) / 100,
        revenueThisMonth: totalRevenue
      },
      engagement: {
        sellersWithListings: sellersWithListings.length,
        activeSellers: activeSellers.length
      },
      categories: categoryStats,
      purchases: {
        total: totalPurchases,
        completed: completedPurchases,
        pending: pendingPurchases
      }
    });
  } catch (error) {
    console.error("Admin marketplace stats error:", error);
    res.status(500).json({ message: "Failed to fetch marketplace statistics" });
  }
});

// Get all purchases for admin control
router.get("/marketplace/purchases", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const sortBy = req.query.sortBy || 'purchaseDate';
    const sortOrder = req.query.sortOrder || 'desc';
    
    // Build query
    let query = {};
    if (status && status !== "all") {
      query.status = status;
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get purchases with user details
    const purchases = await Purchase.find(query)
      .populate('buyerId', 'name email role roles')
      .populate('sellerId', 'name email role roles')
      .populate('marketplaceItemId', 'title price images')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await Purchase.countDocuments(query);
    
    // Format purchases
    const formattedPurchases = purchases.map(purchase => ({
      id: purchase._id,
      itemTitle: purchase.itemTitle,
      itemPrice: purchase.itemPrice,
      purchaseDate: purchase.purchaseDate,
      status: purchase.status,
      paymentMethod: purchase.paymentMethod,
      notes: purchase.notes,
      createdAt: purchase.createdAt,
      updatedAt: purchase.updatedAt,
      buyer: {
        id: purchase.buyerId._id,
        name: purchase.buyerId.name,
        email: purchase.buyerId.email,
        role: purchase.buyerId.role || (purchase.buyerId.roles && purchase.buyerId.roles[0]) || "buyer",
        roles: purchase.buyerId.roles || [purchase.buyerId.role || "buyer"]
      },
      seller: {
        id: purchase.sellerId._id,
        name: purchase.sellerId.name,
        email: purchase.sellerId.email,
        role: purchase.sellerId.role || (purchase.sellerId.roles && purchase.sellerId.roles[0]) || "goal_setter",
        roles: purchase.sellerId.roles || [purchase.sellerId.role || "goal_setter"]
      },
      marketplaceItem: purchase.marketplaceItemId ? {
        id: purchase.marketplaceItemId._id,
        title: purchase.marketplaceItemId.title,
        price: purchase.marketplaceItemId.price,
        images: purchase.marketplaceItemId.images
      } : null
    }));
    
    res.json({
      purchases: formattedPurchases,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: total,
        limit
      },
      summary: {
        total: total,
        pending: await Purchase.countDocuments({ ...query, status: 'pending' }),
        completed: await Purchase.countDocuments({ ...query, status: 'completed' }),
        cancelled: await Purchase.countDocuments({ ...query, status: 'cancelled' }),
        refunded: await Purchase.countDocuments({ ...query, status: 'refunded' })
      }
    });
  } catch (error) {
    console.error("Admin marketplace purchases error:", error);
    res.status(500).json({ message: "Failed to fetch marketplace purchases" });
  }
});

// Update marketplace listing status (admin only)
router.patch("/marketplace/listings/:id", requireAdmin, async (req, res) => {
  try {
    const { status, featured } = req.body;
    const listingId = req.params.id;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (typeof featured === "boolean") updateData.featured = featured;
    
    const listing = await Marketplace.findByIdAndUpdate(
      listingId,
      updateData,
      { new: true }
    ).populate('userId', 'name email role roles');
    
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    
    res.json({
      message: "Listing updated successfully",
      listing: {
        id: listing._id,
        title: listing.title,
        status: listing.status,
        featured: listing.featured,
        seller: {
          id: listing.userId._id,
          name: listing.userId.name,
          email: listing.userId.email,
          role: listing.userId.role || (listing.userId.roles && listing.userId.roles[0]) || "goal_setter",
          roles: listing.userId.roles || [listing.userId.role || "goal_setter"]
        }
      }
    });
  } catch (error) {
    console.error("Update marketplace listing error:", error);
    res.status(500).json({ message: "Failed to update listing" });
  }
});

// Delete marketplace listing (admin only)
router.delete("/marketplace/listings/:id", requireAdmin, async (req, res) => {
  try {
    const listingId = req.params.id;
    
    const listing = await Marketplace.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    
    await Marketplace.findByIdAndDelete(listingId);
    
    res.json({
      message: "Listing deleted successfully",
      deletedListing: {
        id: listing._id,
        title: listing.title,
        sellerId: listing.userId,
        status: listing.status
      }
    });
  } catch (error) {
    console.error("Delete marketplace listing error:", error);
    res.status(500).json({ message: "Failed to delete listing" });
  }
});

// Update purchase status (admin only)
router.patch("/marketplace/purchases/:id", requireAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const purchaseId = req.params.id;
    
    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    
    const purchase = await Purchase.findByIdAndUpdate(
      purchaseId,
      updateData,
      { new: true }
    ).populate('buyerId', 'name email role')
     .populate('sellerId', 'name email role');
    
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }
    
    res.json({
      message: "Purchase updated successfully",
      purchase: {
        id: purchase._id,
        itemTitle: purchase.itemTitle,
        itemPrice: purchase.itemPrice,
        status: purchase.status,
        notes: purchase.notes,
        buyer: {
          id: purchase.buyerId._id,
          name: purchase.buyerId.name,
          email: purchase.buyerId.email,
          role: purchase.buyerId.role
        },
        seller: {
          id: purchase.sellerId._id,
          name: purchase.sellerId.name,
          email: purchase.sellerId.email,
          role: purchase.sellerId.role
        }
      }
    });
  } catch (error) {
    console.error("Update purchase error:", error);
    res.status(500).json({ message: "Failed to update purchase" });
  }
});

// Get all financial records for admin overview
router.get("/finance/records", requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const type = req.query.type;
    const source = req.query.source;
    const category = req.query.category;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder || 'desc';
    const month = req.query.month;
    const year = req.query.year;
    
    // Build query
    let query = {};
    if (type && type !== "all") {
      query.type = type;
    }
    if (source && source !== "all") {
      query.source = source;
    }
    if (category && category !== "all") {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } }
      ];
    }
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    // Get financial records with user details
    const records = await Finance.find(query)
      .populate('userId', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await Finance.countDocuments(query);
    
    // Format records with additional calculated fields
    const formattedRecords = records.map(record => {
      const daysAgo = Math.ceil((new Date() - new Date(record.date)) / (1000 * 60 * 60 * 24));
      const isRecent = daysAgo <= 7;
      
      return {
        id: record._id,
        type: record.type,
        amount: record.amount,
        source: record.source,
        category: record.category,
        description: record.description,
        date: record.date,
        tags: record.tags,
        recurring: record.recurring,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        daysAgo: daysAgo,
        isRecent: isRecent,
        user: {
          id: record.userId._id,
          name: record.userId.name,
          email: record.userId.email,
          role: record.userId.role
        }
      };
    });
    
    res.json({
      records: formattedRecords,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: total,
        limit
      },
      summary: {
        total: total,
        income: await Finance.countDocuments({ ...query, type: 'income' }),
        expense: await Finance.countDocuments({ ...query, type: 'expense' }),
        totalIncome: await Finance.aggregate([
          { $match: { ...query, type: 'income' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(result => result[0]?.total || 0),
        totalExpense: await Finance.aggregate([
          { $match: { ...query, type: 'expense' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(result => result[0]?.total || 0)
      }
    });
  } catch (error) {
    console.error("Admin finance records error:", error);
    res.status(500).json({ message: "Failed to fetch financial records" });
  }
});

// Get financial statistics for admin dashboard
router.get("/finance/stats", requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Basic counts
    const totalRecords = await Finance.countDocuments();
    const totalIncomeRecords = await Finance.countDocuments({ type: 'income' });
    const totalExpenseRecords = await Finance.countDocuments({ type: 'expense' });
    
    // Recent activity
    const recordsThisWeek = await Finance.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });
    const recordsThisMonth = await Finance.countDocuments({
      date: { 
        $gte: new Date(currentYear, currentMonth - 1, 1),
        $lte: new Date(currentYear, currentMonth, 0)
      }
    });
    
    // Financial totals
    const totalIncome = await Finance.aggregate([
      { $match: { type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);
    
    const totalExpense = await Finance.aggregate([
      { $match: { type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);
    
    // Monthly totals
    const monthlyIncome = await Finance.aggregate([
      { 
        $match: { 
          type: 'income',
          date: { 
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lte: new Date(currentYear, currentMonth, 0)
          }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);
    
    const monthlyExpense = await Finance.aggregate([
      { 
        $match: { 
          type: 'expense',
          date: { 
            $gte: new Date(currentYear, currentMonth - 1, 1),
            $lte: new Date(currentYear, currentMonth, 0)
          }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);
    
    const monthlySavings = monthlyIncome - monthlyExpense;
    
    // User engagement
    const usersWithFinance = await Finance.distinct('userId');
    const activeUsersWithFinance = await Finance.distinct('userId', {
      updatedAt: { $gte: thirtyDaysAgo }
    });
    
    // Source breakdown for income
    const incomeSources = await Finance.aggregate([
      { $match: { type: 'income' } },
      { $group: { _id: '$source', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    
    // Category breakdown for expenses
    const expenseCategories = await Finance.aggregate([
      { $match: { type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    
    // Monthly trends (last 6 months)
    const monthlyTrends = await Finance.aggregate([
      {
        $match: {
          date: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      overview: {
        totalRecords: totalRecords,
        totalIncomeRecords: totalIncomeRecords,
        totalExpenseRecords: totalExpenseRecords,
        totalIncome: totalIncome,
        totalExpense: totalExpense,
        netSavings: totalIncome - totalExpense
      },
      monthly: {
        income: monthlyIncome,
        expense: monthlyExpense,
        savings: monthlySavings,
        records: recordsThisMonth
      },
      recentActivity: {
        recordsThisWeek: recordsThisWeek,
        recordsThisMonth: recordsThisMonth
      },
      engagement: {
        usersWithFinance: usersWithFinance.length,
        activeUsersWithFinance: activeUsersWithFinance.length
      },
      breakdown: {
        incomeSources: incomeSources,
        expenseCategories: expenseCategories
      },
      trends: monthlyTrends
    });
  } catch (error) {
    console.error("Admin finance stats error:", error);
    res.status(500).json({ message: "Failed to fetch financial statistics" });
  }
});

// Get user financial summary for admin
router.get("/finance/users/:userId/summary", requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const { month, year, all } = req.query;
    
    // Get user info
    const user = await User.findById(userId, 'name email role');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    let summary;
    
    if (all === 'true') {
      summary = await Finance.getUserFinanceSummary(userId);
    } else {
      const currentDate = new Date();
      const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
      const targetYear = year ? parseInt(year) : currentDate.getFullYear();
      
      summary = await Finance.getUserFinanceSummary(userId, {
        month: targetMonth,
        year: targetYear
      });
    }
    
    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    
    summary.forEach(item => {
      if (item._id === 'income') {
        totalIncome = item.total;
        incomeCount = item.count;
      } else if (item._id === 'expense') {
        totalExpense = item.total;
        expenseCount = item.count;
      }
    });
    
    const netSavings = totalIncome - totalExpense;
    
    // Get recent transactions
    const recentTransactions = await Finance.find({ userId })
      .sort({ date: -1 })
      .limit(10);
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      summary: {
        totalIncome,
        totalExpense,
        netSavings,
        incomeCount,
        expenseCount,
        viewMode: all === 'true' ? 'all-time' : 'current-month'
      },
      recentTransactions: recentTransactions
    });
  } catch (error) {
    console.error("Admin user finance summary error:", error);
    res.status(500).json({ message: "Failed to fetch user financial summary" });
  }
});

// Delete financial record (admin only)
router.delete("/finance/records/:id", requireAdmin, async (req, res) => {
  try {
    const recordId = req.params.id;
    
    const record = await Finance.findById(recordId).populate('userId', 'name email role');
    if (!record) {
      return res.status(404).json({ message: "Financial record not found" });
    }
    
    await Finance.findByIdAndDelete(recordId);
    
    res.json({
      message: "Financial record deleted successfully",
      deletedRecord: {
        id: record._id,
        type: record.type,
        amount: record.amount,
        description: record.description,
        userId: record.userId._id,
        userName: record.userId.name
      }
    });
  } catch (error) {
    console.error("Delete financial record error:", error);
    res.status(500).json({ message: "Failed to delete financial record" });
  }
});

// Get comprehensive system analytics
router.get("/analytics/system", requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // User Analytics
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const newUsersThisWeek = await User.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });
    const newUsersThisMonth = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });
    
    // Goal Analytics
    const totalGoals = await Goal.countDocuments();
    const goalsByStatus = await Goal.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const goalsCreatedThisWeek = await Goal.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });
    const goalsCompletedThisWeek = await Goal.countDocuments({ 
      status: 'completed',
      updatedAt: { $gte: sevenDaysAgo }
    });
    
    // Financial Analytics
    const totalFinancialRecords = await Finance.countDocuments();
    const totalIncome = await Finance.aggregate([
      { $match: { type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);
    
    const totalExpense = await Finance.aggregate([
      { $match: { type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(result => result[0]?.total || 0);
    
    const financialRecordsThisWeek = await Finance.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });
    
    // Marketplace Analytics
    const totalMarketplaceListings = await Marketplace.countDocuments();
    const marketplaceByStatus = await Marketplace.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const marketplaceRevenue = await Marketplace.aggregate([
      { $match: { status: 'sold' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]).then(result => result[0]?.total || 0);
    
    const listingsCreatedThisWeek = await Marketplace.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });
    
    // Purchase Analytics
    const totalPurchases = await Purchase.countDocuments();
    const purchasesByStatus = await Purchase.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const purchasesThisWeek = await Purchase.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });
    
    // Activity Analytics (last 24 hours)
    const recentActivity = {
      users: await User.countDocuments({ updatedAt: { $gte: oneDayAgo } }),
      goals: await Goal.countDocuments({ updatedAt: { $gte: oneDayAgo } }),
      finances: await Finance.countDocuments({ createdAt: { $gte: oneDayAgo } }),
      marketplace: await Marketplace.countDocuments({ updatedAt: { $gte: oneDayAgo } }),
      purchases: await Purchase.countDocuments({ createdAt: { $gte: oneDayAgo } })
    };
    
    // Monthly Trends (last 6 months)
    const monthlyTrends = {
      users: await User.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      goals: await Goal.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      finances: await Finance.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ])
    };
    
    // System Health Metrics
    const systemHealth = {
      database: 'Connected',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date()
    };
    
    // Top Active Users (by recent activity)
    const topActiveUsers = await User.aggregate([
      {
        $lookup: {
          from: 'goals',
          localField: '_id',
          foreignField: 'userId',
          as: 'goals'
        }
      },
      {
        $lookup: {
          from: 'finances',
          localField: '_id',
          foreignField: 'userId',
          as: 'finances'
        }
      },
      {
        $addFields: {
          totalActivity: {
            $add: [
              { $size: '$goals' },
              { $size: '$finances' }
            ]
          },
          lastActivity: {
            $max: ['$updatedAt', { $max: '$goals.updatedAt' }, { $max: '$finances.createdAt' }]
          }
        }
      },
      {
        $match: {
          lastActivity: { $gte: thirtyDaysAgo }
        }
      },
      {
        $sort: { totalActivity: -1 }
      },
      {
        $limit: 10
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          totalActivity: 1,
          lastActivity: 1,
          goalsCount: { $size: '$goals' },
          financesCount: { $size: '$finances' }
        }
      }
    ]);
    
    res.json({
      overview: {
        totalUsers,
        verifiedUsers,
        totalGoals,
        totalFinancialRecords,
        totalMarketplaceListings,
        totalPurchases,
        totalIncome,
        totalExpense,
        marketplaceRevenue
      },
      users: {
        byRole: usersByRole,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        topActive: topActiveUsers
      },
      goals: {
        byStatus: goalsByStatus,
        createdThisWeek: goalsCreatedThisWeek,
        completedThisWeek: goalsCompletedThisWeek
      },
      finances: {
        recordsThisWeek: financialRecordsThisWeek,
        totalIncome,
        totalExpense,
        netSavings: totalIncome - totalExpense
      },
      marketplace: {
        byStatus: marketplaceByStatus,
        listingsCreatedThisWeek,
        revenue: marketplaceRevenue
      },
      purchases: {
        byStatus: purchasesByStatus,
        thisWeek: purchasesThisWeek
      },
      activity: {
        last24Hours: recentActivity,
        thisWeek: {
          users: newUsersThisWeek,
          goals: goalsCreatedThisWeek,
          finances: financialRecordsThisWeek,
          marketplace: listingsCreatedThisWeek,
          purchases: purchasesThisWeek
        }
      },
      trends: monthlyTrends,
      systemHealth
    });
  } catch (error) {
    console.error("System analytics error:", error);
    res.status(500).json({ message: "Failed to fetch system analytics" });
  }
});

// Get real-time system metrics
router.get("/analytics/metrics", requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Real-time metrics
    const metrics = {
      timestamp: now,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      database: {
        users: await User.countDocuments(),
        goals: await Goal.countDocuments(),
        finances: await Finance.countDocuments(),
        marketplace: await Marketplace.countDocuments(),
        purchases: await Purchase.countDocuments()
      },
      activity: {
        lastHour: {
          users: await User.countDocuments({ updatedAt: { $gte: oneHourAgo } }),
          goals: await Goal.countDocuments({ updatedAt: { $gte: oneHourAgo } }),
          finances: await Finance.countDocuments({ createdAt: { $gte: oneHourAgo } }),
          marketplace: await Marketplace.countDocuments({ updatedAt: { $gte: oneHourAgo } }),
          purchases: await Purchase.countDocuments({ createdAt: { $gte: oneHourAgo } })
        },
        lastDay: {
          users: await User.countDocuments({ updatedAt: { $gte: oneDayAgo } }),
          goals: await Goal.countDocuments({ updatedAt: { $gte: oneDayAgo } }),
          finances: await Finance.countDocuments({ createdAt: { $gte: oneDayAgo } }),
          marketplace: await Marketplace.countDocuments({ updatedAt: { $gte: oneDayAgo } }),
          purchases: await Purchase.countDocuments({ createdAt: { $gte: oneDayAgo } })
        }
      }
    };
    
    res.json(metrics);
  } catch (error) {
    console.error("System metrics error:", error);
    res.status(500).json({ message: "Failed to fetch system metrics" });
  }
});

// =====================================================
// IMPORTANT: Specific routes must come before :userId routes!
// Order: /users -> /users/export -> /users/bulk -> /users/:userId
// =====================================================

// Create new user
router.post("/users", requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, roles, phone, address } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: 'Name, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    // Determine user roles
    let userRoles = roles && Array.isArray(roles) && roles.length > 0 
      ? roles 
      : (role ? [role] : ['goal_setter']);

    // Validate roles
    const allowedRoles = ['goal_setter', 'buyer', 'admin'];
    const invalidRoles = userRoles.filter(r => !allowedRoles.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ 
        message: `Invalid roles: ${invalidRoles.join(', ')}` 
      });
    }

    // Hash password
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: userRoles[0],
      roles: [...new Set(userRoles)], // Remove duplicates
      phone,
      address,
      provider: 'local',
      isVerified: true
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Export users to CSV (MUST come before :userId routes)
router.get("/users/export", requireAdmin, async (req, res) => {
  try {
    const role = req.query.role;
    const search = req.query.search;
    
    // Build query
    let query = {};
    if (role && role !== "all") {
      query.roles = role;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }
    
    const users = await User.find(query).select('name email role roles provider isVerified createdAt').sort({ createdAt: -1 });
    
    // Create CSV
    const csvHeaders = 'Name,Email,Role,Roles,Provider,Status,Joined\n';
    const csvRows = users.map(user => {
      const userRoles = user.roles || [user.role || 'goal_setter'];
      return `"${user.name}","${user.email}","${user.role || userRoles[0]}","${userRoles.join(', ')}","${user.provider}","${user.isVerified ? 'Active' : 'Inactive'}","${user.createdAt.toISOString()}"`;
    }).join('\n');
    
    const csv = csvHeaders + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({ message: 'Failed to export users' });
  }
});

// Bulk delete users (MUST come before :userId routes)
router.delete("/users/bulk", requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'userIds must be a non-empty array' });
    }

    // Prevent deleting yourself
    if (userIds.includes(req.user.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Delete users
    const result = await User.deleteMany({ _id: { $in: userIds } });

    res.json({
      message: `${result.deletedCount} user(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete users error:', error);
    res.status(500).json({ message: 'Failed to delete users' });
  }
});

// Bulk update user status (MUST come before :userId routes)
router.patch("/users/bulk", requireAdmin, async (req, res) => {
  try {
    const { userIds, status } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'userIds must be a non-empty array' });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'status must be either "active" or "inactive"' });
    }

    // Update users
    const isVerified = status === 'active';
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { isVerified } }
    );

    res.json({
      message: `${result.modifiedCount} user(s) updated successfully`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk update users error:', error);
    res.status(500).json({ message: 'Failed to update users' });
  }
});

// Update user (full update)
router.put("/users/:userId", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, roles, status, phone, address } = req.body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic fields
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;

    // Update roles if provided
    if (roles && Array.isArray(roles) && roles.length > 0) {
      const allowedRoles = ['goal_setter', 'buyer', 'admin'];
      const invalidRoles = roles.filter(r => !allowedRoles.includes(r));
      
      if (invalidRoles.length > 0) {
        return res.status(400).json({ 
          message: `Invalid roles: ${invalidRoles.join(', ')}` 
        });
      }
      
      user.roles = [...new Set(roles)]; // Remove duplicates
      user.role = user.roles[0]; // Set primary role
    } else if (role) {
      // Handle single role update for backward compatibility
      const allowedRoles = ['goal_setter', 'buyer', 'admin'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      user.role = role;
      user.roles = [role];
    }

    // Update status/verification
    if (status === 'active') {
      user.isVerified = true;
    } else if (status === 'inactive') {
      user.isVerified = false;
    }

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles,
        phone: user.phone,
        address: user.address,
        status: user.isVerified ? 'active' : 'inactive'
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Toggle user status (activate/deactivate)
router.patch("/users/:userId/status", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'status must be either "active" or "inactive"' });
    }

    // Find and update user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update status
    user.isVerified = status === 'active';
    await user.save();

    res.json({
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.isVerified ? 'active' : 'inactive'
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

// Delete user
router.delete("/users/:userId", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself
    if (req.user.id === userId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Update user roles (add/remove roles)
router.patch("/users/:userId/roles", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { roles } = req.body;

    // Validate roles
    const allowedRoles = ['goal_setter', 'buyer', 'admin'];
    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ message: 'Roles must be a non-empty array' });
    }

    const invalidRoles = roles.filter(r => !allowedRoles.includes(r));
    if (invalidRoles.length > 0) {
      return res.status(400).json({ 
        message: `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${allowedRoles.join(', ')}` 
      });
    }

    // Find and update user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update roles
    user.roles = [...new Set(roles)]; // Remove duplicates
    user.role = user.roles[0]; // Set primary role to first role

    await user.save();

    res.json({
      message: 'User roles updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update user roles error:', error);
    res.status(500).json({ message: 'Failed to update user roles' });
  }
});

// Helper function to format time ago
function formatTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

export default router;

