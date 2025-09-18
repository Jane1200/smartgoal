import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Connection from "../models/Connection.js";
import User from "../models/User.js";

const router = Router();

// Send connection request (buyer to goal setter OR goal setter to buyer)
router.post("/send-request", requireAuth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { targetUserId, message, connectionType = 'general', itemId } = req.body;

    // Validate required fields
    if (!targetUserId) {
      return res.status(400).json({ message: "Target user ID is required" });
    }

    // Check if user is trying to connect to themselves
    if (senderId === targetUserId) {
      return res.status(400).json({ message: "Cannot connect to yourself" });
    }

    // Get sender and target user info
    const sender = await User.findById(senderId);
    const targetUser = await User.findById(targetUserId);
    
    if (!sender || !targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Determine buyer and goal setter based on roles
    let buyerId, goalSetterId;
    if (sender.role === 'buyer' && targetUser.role === 'goal_setter') {
      buyerId = senderId;
      goalSetterId = targetUserId;
    } else if (sender.role === 'goal_setter' && targetUser.role === 'buyer') {
      buyerId = targetUserId;
      goalSetterId = senderId;
    } else {
      return res.status(400).json({ 
        message: "Connection requests are only allowed between buyers and goal setters" 
      });
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      buyerId,
      goalSetterId
    });

    if (existingConnection) {
      return res.status(400).json({ 
        message: "Connection request already exists",
        status: existingConnection.status
      });
    }

    // Get buyer location for distance calculation
    const buyer = await User.findById(buyerId);
    let buyerLocation = null;
    let distance = null;

    if (buyer.location?.latitude && buyer.location?.longitude && 
        targetUser.location?.latitude && targetUser.location?.longitude) {
      
      // Calculate distance
      distance = calculateDistance(
        buyer.location.latitude,
        buyer.location.longitude,
        targetUser.location.latitude,
        targetUser.location.longitude
      );

      buyerLocation = {
        latitude: buyer.location.latitude,
        longitude: buyer.location.longitude,
        city: buyer.location.city,
        state: buyer.location.state,
        distance: Math.round(distance * 10) / 10
      };
    }

    // Create connection request
    const connection = new Connection({
      buyerId,
      goalSetterId,
      message: message?.trim() || "",
      connectionType,
      buyerLocation,
      metadata: {
        source: 'geo_matching',
        itemId: itemId || null,
        notes: `Connection request from ${sender.name} to ${targetUser.name}`
      }
    });

    await connection.save();

    // Populate the response with user details
    await connection.populate([
      { path: 'buyerId', select: 'name email avatar' },
      { path: 'goalSetterId', select: 'name email avatar' }
    ]);

    res.status(201).json({
      message: "Connection request sent successfully",
      connection: {
        id: connection._id,
        status: connection.status,
        message: connection.message,
        connectionType: connection.connectionType,
        buyerLocation: connection.buyerLocation,
        createdAt: connection.createdAt,
        buyer: {
          id: connection.buyerId._id,
          name: connection.buyerId.name,
          email: connection.buyerId.email,
          avatar: connection.buyerId.avatar
        },
        goalSetter: {
          id: connection.goalSetterId._id,
          name: connection.goalSetterId.name,
          email: connection.goalSetterId.email,
          avatar: connection.goalSetterId.avatar
        }
      }
    });
  } catch (error) {
    console.error("Send connection request error:", error);
    res.status(500).json({ message: "Failed to send connection request" });
  }
});

// Get connection requests for goal setter
router.get("/requests", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'pending', limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get user to check role
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let query = {};
    
    if (user.role === 'goal_setter') {
      // Goal setter receives requests
      query.goalSetterId = userId;
    } else if (user.role === 'buyer') {
      // Buyer sees their sent requests
      query.buyerId = userId;
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    if (status !== 'all') {
      query.status = status;
    }

    const connections = await Connection.find(query)
      .populate('buyerId', 'name email avatar')
      .populate('goalSetterId', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Connection.countDocuments(query);

    const formattedConnections = connections.map(conn => ({
      id: conn._id,
      status: conn.status,
      message: conn.message,
      connectionType: conn.connectionType,
      buyerLocation: conn.buyerLocation,
      responseMessage: conn.responseMessage,
      respondedAt: conn.respondedAt,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
      buyer: {
        id: conn.buyerId._id,
        name: conn.buyerId.name,
        email: conn.buyerId.email,
        avatar: conn.buyerId.avatar
      },
      goalSetter: {
        id: conn.goalSetterId._id,
        name: conn.goalSetterId.name,
        email: conn.goalSetterId.email,
        avatar: conn.goalSetterId.avatar
      }
    }));

    res.json({
      connections: formattedConnections,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get connection requests error:", error);
    res.status(500).json({ message: "Failed to fetch connection requests" });
  }
});

// Respond to connection request (goal setter)
router.put("/respond/:connectionId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { connectionId } = req.params;
    const { status, responseMessage } = req.body;

    // Validate required fields
    if (!status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        message: "Status must be 'accepted' or 'rejected'" 
      });
    }

    // Find connection
    const connection = await Connection.findById(connectionId)
      .populate('buyerId', 'name email avatar')
      .populate('goalSetterId', 'name email avatar');

    if (!connection) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    // Verify user is the goal setter
    if (connection.goalSetterId._id.toString() !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if already responded
    if (connection.status !== 'pending') {
      return res.status(400).json({ 
        message: "Connection request already responded to" 
      });
    }

    // Update connection
    connection.status = status;
    connection.responseMessage = responseMessage?.trim() || "";
    connection.respondedAt = new Date();
    await connection.save();

    res.json({
      message: `Connection request ${status} successfully`,
      connection: {
        id: connection._id,
        status: connection.status,
        message: connection.message,
        responseMessage: connection.responseMessage,
        respondedAt: connection.respondedAt,
        buyer: {
          id: connection.buyerId._id,
          name: connection.buyerId.name,
          email: connection.buyerId.email,
          avatar: connection.buyerId.avatar
        },
        goalSetter: {
          id: connection.goalSetterId._id,
          name: connection.goalSetterId.name,
          email: connection.goalSetterId.email,
          avatar: connection.goalSetterId.avatar
        }
      }
    });
  } catch (error) {
    console.error("Respond to connection error:", error);
    res.status(500).json({ message: "Failed to respond to connection request" });
  }
});

// Get accepted buyers for goal setter
router.get("/accepted-buyers", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user to check role
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only goal setters can view accepted buyers
    if (user.role !== 'goal_setter') {
      return res.status(403).json({ message: "Access denied. Only goal setters can view accepted buyers." });
    }

    // Get all accepted connections for this goal setter
    const acceptedConnections = await Connection.find({
      goalSetterId: userId,
      status: 'accepted'
    })
      .populate('buyerId', 'name email avatar bio location interests')
      .sort({ respondedAt: -1 });

    // Format the buyers data
    const buyers = acceptedConnections.map(conn => ({
      id: conn.buyerId._id,
      name: conn.buyerId.name,
      email: conn.buyerId.email,
      avatar: conn.buyerId.avatar,
      bio: conn.buyerId.bio,
      location: conn.buyerId.location,
      interests: conn.buyerId.interests || [],
      connectedAt: conn.respondedAt,
      connectionType: conn.connectionType,
      originalMessage: conn.message,
      responseMessage: conn.responseMessage,
      buyerLocation: conn.buyerLocation
    }));

    res.json({ 
      buyers,
      count: buyers.length,
      message: `Found ${buyers.length} accepted buyers`
    });
  } catch (error) {
    console.error("Get accepted buyers error:", error);
    res.status(500).json({ message: "Failed to fetch accepted buyers" });
  }
});

// Get connection analytics
router.get("/analytics", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user to check role
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let query = {};
    if (user.role === 'goal_setter') {
      query.goalSetterId = userId;
    } else if (user.role === 'buyer') {
      query.buyerId = userId;
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get connection analytics
    const analytics = await Connection.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalConnections: { $sum: 1 },
          acceptedConnections: {
            $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
          },
          rejectedConnections: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          pendingConnections: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          avgResponseTime: {
            $avg: {
              $cond: [
                { $ne: ['$respondedAt', null] },
                {
                  $divide: [
                    { $subtract: ['$respondedAt', '$createdAt'] },
                    1000 * 60 * 60 // Convert to hours
                  ]
                },
                null
              ]
            }
          },
          fastestResponse: {
            $min: {
              $cond: [
                { $ne: ['$respondedAt', null] },
                {
                  $divide: [
                    { $subtract: ['$respondedAt', '$createdAt'] },
                    1000 * 60 * 60 // Convert to hours
                  ]
                },
                null
              ]
            }
          },
          slowestResponse: {
            $max: {
              $cond: [
                { $ne: ['$respondedAt', null] },
                {
                  $divide: [
                    { $subtract: ['$respondedAt', '$createdAt'] },
                    1000 * 60 * 60 // Convert to hours
                  ]
                },
                null
              ]
            }
          }
        }
      }
    ]);

    const result = analytics[0] || {
      totalConnections: 0,
      acceptedConnections: 0,
      rejectedConnections: 0,
      pendingConnections: 0,
      avgResponseTime: 0,
      fastestResponse: 0,
      slowestResponse: 0
    };

    const acceptanceRate = result.totalConnections > 0 
      ? (result.acceptedConnections / result.totalConnections) * 100 
      : 0;
    
    const rejectionRate = result.totalConnections > 0 
      ? (result.rejectedConnections / result.totalConnections) * 100 
      : 0;

    res.json({
      analytics: {
        responseTime: {
          average: Math.round((result.avgResponseTime || 0) * 100) / 100,
          fastest: Math.round((result.fastestResponse || 0) * 100) / 100,
          slowest: Math.round((result.slowestResponse || 0) * 100) / 100
        },
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
        rejectionRate: Math.round(rejectionRate * 100) / 100,
        insights: generateConnectionInsights(acceptanceRate, rejectionRate, result.avgResponseTime, result.totalConnections),
        trends: {
          daily: [],
          weekly: [],
          monthly: []
        }
      }
    });
  } catch (error) {
    console.error("Get connection analytics error:", error);
    res.status(500).json({ message: "Failed to fetch connection analytics" });
  }
});

// Helper function to generate connection insights
function generateConnectionInsights(acceptanceRate, rejectionRate, avgResponseTime, totalConnections) {
  const insights = [];
  
  if (acceptanceRate >= 70) {
    insights.push("Excellent acceptance rate! You're building strong connections.");
  } else if (acceptanceRate >= 50) {
    insights.push("Good acceptance rate. Consider improving your profile to attract better matches.");
  } else if (acceptanceRate >= 30) {
    insights.push("Fair acceptance rate. Review your profile and connection preferences.");
  } else {
    insights.push("Low acceptance rate. Consider updating your profile and being more selective.");
  }
  
  if (avgResponseTime <= 24) {
    insights.push("Great response time! You're very responsive to connection requests.");
  } else if (avgResponseTime <= 72) {
    insights.push("Good response time. Try to respond within 24 hours for better engagement.");
  } else {
    insights.push("Slow response time. Consider setting up notifications to respond faster.");
  }
  
  if (totalConnections === 0) {
    insights.push("No connection requests yet. Make sure your profile is complete and visible.");
  } else if (totalConnections < 5) {
    insights.push("Few connection requests. Consider expanding your network and improving visibility.");
  } else if (totalConnections >= 20) {
    insights.push("Active network! You're receiving many connection requests.");
  }
  
  return insights;
}

// Get connection statistics
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let query = {};
    if (user.role === 'goal_setter') {
      query.goalSetterId = userId;
    } else if (user.role === 'buyer') {
      query.buyerId = userId;
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    const stats = await Connection.aggregate([
      { $match: query },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);

    const formattedStats = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      blocked: 0,
      total: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });

    res.json({ stats: formattedStats });
  } catch (error) {
    console.error("Get connection stats error:", error);
    res.status(500).json({ message: "Failed to fetch connection statistics" });
  }
});

// Delete connection request
router.delete("/:connectionId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { connectionId } = req.params;

    const connection = await Connection.findById(connectionId);
    if (!connection) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    // Verify user is either buyer or goal setter
    if (connection.buyerId.toString() !== userId && 
        connection.goalSetterId.toString() !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Connection.findByIdAndDelete(connectionId);

    res.json({ message: "Connection request deleted successfully" });
  } catch (error) {
    console.error("Delete connection error:", error);
    res.status(500).json({ message: "Failed to delete connection request" });
  }
});

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

export default router;
