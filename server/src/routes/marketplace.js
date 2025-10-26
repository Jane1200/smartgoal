import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import Marketplace from "../models/Marketplace.js";
import User from "../models/User.js";
import MarketplaceIncome from "../models/MarketplaceIncome.js";
import Order from "../models/Order.js";
import MarketplaceFeedback from "../models/MarketplaceFeedback.js";

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/marketplace';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Upload image endpoint
router.post('/upload-image', requireAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Return the file path or URL
    const imageUrl = `/uploads/marketplace/${req.file.filename}`;
    
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

// Upload multiple images endpoint
router.post('/upload-images', requireAuth, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    const imageUrls = req.files.map(file => ({
      url: `/uploads/marketplace/${file.filename}`,
      filename: file.filename
    }));
    
    res.json({
      message: 'Images uploaded successfully',
      images: imageUrls
    });
  } catch (error) {
    console.error('Images upload error:', error);
    res.status(500).json({ message: 'Failed to upload images' });
  }
});

// Get featured marketplace items (public but filters out user's own items if authenticated)
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    
    // Build query to exclude current user's listings if authenticated
    // Exclude sold, archived, or pending items (show active and items without status)
    const query = { 
      status: { $nin: ['sold', 'archived', 'pending'] }
    };
    if (req.user?.id) {
      // Convert JWT string ID to MongoDB ObjectId for query comparison
      const currentUserId = new mongoose.Types.ObjectId(req.user.id);
      query.userId = { $ne: currentUserId };
    }
    
    // Get featured items from database
    const featuredItems = await Marketplace.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    // Filter out items with null/deleted users
    const validFeaturedItems = featuredItems.filter(item => item.userId && item.userId._id);
    
    res.json(validFeaturedItems);
  } catch (error) {
    console.error('Featured items error:', error);
    res.status(500).json({ message: 'Failed to fetch featured items' });
  }
});

// Get user's listings
router.get('/my-listings', requireAuth, async (req, res) => {
  try {
    // Convert JWT string ID to MongoDB ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id);
    
    // Get user's listings from database
    const listings = await Marketplace.getUserListings(userId);
    
    res.json(listings);
  } catch (error) {
    console.error('My listings error:', error);
    res.status(500).json({ message: 'Failed to fetch listings' });
  }
});

// Create new listing
router.post('/list-item', requireAuth, async (req, res) => {
  try {
    // Convert JWT string ID to MongoDB ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { title, description, price, category, condition, images } = req.body;

    // Validate required fields
    if (!title || !price || !images || images.length === 0) {
      return res.status(400).json({ 
        message: 'Title, price, and at least one image are required' 
      });
    }

    // Validate images array format
    if (!Array.isArray(images)) {
      return res.status(400).json({ 
        message: 'Images must be an array' 
      });
    }

    // Validate price is a number
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ 
        message: 'Price must be a valid positive number' 
      });
    }

    // Create new marketplace listing
    const newListing = new Marketplace({
      userId,
      title: title.trim(),
      description: (description || '').trim(),
      price: numPrice,
      category: category || 'other',
      condition: condition || 'good',
      status: 'active',
      images: images.map(url => {
        const filename = typeof url === 'string' ? url.split('/').pop() : 'image';
        return {
          url,
          filename,
          uploadedAt: new Date()
        };
      })
    });

    // Save to database
    const savedListing = await newListing.save();

    // Populate user data for response
    await savedListing.populate('userId', 'name email');

    res.json({
      message: 'Item listed successfully',
      listing: savedListing
    });
  } catch (error) {
    console.error('List item error:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('Full error:', error);
    res.status(500).json({ 
      message: 'Failed to list item',
      error: error.message 
    });
  }
});

// Update listing (allows editing title, description, and category only)
router.put('/listings/:id', requireAuth, async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { title, description, category } = req.body;

    // Find the listing and verify ownership
    const listing = await Marketplace.findOne({ _id: listingId, userId });
    
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found or you do not have permission to edit it' });
    }

    // Build update object with only allowed fields
    const updateData = {};
    
    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ message: 'Title cannot be empty' });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      if (description && description.trim().length < 10) {
        return res.status(400).json({ message: 'Description must be at least 10 characters' });
      }
      updateData.description = (description || '').trim();
    }

    if (category !== undefined) {
      const validCategories = ['electronics', 'fashion', 'sports', 'books', 'other'];
      if (category && !validCategories.includes(category)) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      updateData.category = category || 'other';
    }

    // Update the listing
    const updatedListing = await Marketplace.findByIdAndUpdate(
      listingId,
      { $set: updateData },
      { new: true, runValidators: false }
    ).populate('userId', 'name email');

    res.json({
      message: 'Listing updated successfully',
      listing: updatedListing
    });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ message: 'Failed to update listing' });
  }
});

// Delete listing
router.delete('/listings/:id', requireAuth, async (req, res) => {
  try {
    const listingId = req.params.id;
    // Convert JWT string ID to MongoDB ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Find the listing and verify ownership
    const listing = await Marketplace.findOne({ _id: listingId, userId });
    
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found or you do not have permission to delete it' });
    }

    // Delete the listing
    await Marketplace.findByIdAndDelete(listingId);

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ message: 'Failed to delete listing' });
  }
});

// Browse marketplace items (for buyers only)
router.get("/browse", requireAuth, async (req, res) => {
  try {
    // Check if user is a buyer
    if (!req.user.isBuyer) {
      return res.status(403).json({ 
        message: "Only buyers can browse marketplace items. Please switch to buyer role to browse items." 
      });
    }

    // Convert JWT string ID to MongoDB ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = 12
    } = req.query;

    // Build query - exclude current user's listings
    const query = { 
      status: "active",
      userId: { $ne: userId }  // Exclude items listed by current user
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Build sort
    let sortOption = {};
    switch (sort) {
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "price_low":
        sortOption = { price: 1 };
        break;
      case "price_high":
        sortOption = { price: -1 };
        break;
      case "popular":
        sortOption = { views: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const items = await Marketplace.find(query)
      .sort(sortOption)
      .populate("userId", "name email avatar marketplaceStats trustBadge")
      .select("title description price category condition status images views likes createdAt userId")
      .limit(parseInt(limit) * 1)
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Filter out items with null/deleted users
    const validItems = items.filter(item => item.userId && item.userId._id);
    
    // Map items with seller info and ratings
    const itemsWithSeller = await Promise.all(validItems.map(async (item) => {
      const itemObj = item.toObject();
      
      // Get seller rating (with defensive check)
      const sellerRating = await MarketplaceFeedback.getSellerRating(item.userId._id);
      
      return {
        ...itemObj,
        sellerName: item.userId?.name || "Unknown Seller",
        sellerAvatar: item.userId?.avatar,
        sellerRating: sellerRating.averageRating,
        sellerTrustBadge: item.userId?.trustBadge?.level || "new",
        totalReviews: sellerRating.totalReviews,
        marketplaceStats: item.userId?.marketplaceStats
      };
    }));

    res.json(itemsWithSeller);
  } catch (error) {
    console.error("Failed to browse marketplace items:", error);
    res.status(500).json({ message: "Failed to browse marketplace items" });
  }
});

// Get marketplace items from nearby goal setters (for buyers only)
router.get("/nearby-items", requireAuth, async (req, res) => {
  try {
    // Check if user is a buyer
    if (!req.user.isBuyer) {
      return res.status(403).json({ 
        message: "Only buyers can browse nearby marketplace items. Please switch to buyer role." 
      });
    }

    // Convert JWT string ID to MongoDB ObjectId
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const { maxDistance = 50, category, limit = 20, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get current user (buyer)
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user has location
    if (!currentUser.location?.latitude || !currentUser.location?.longitude) {
      return res.status(400).json({ 
        message: "Please update your location first to find nearby items" 
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
    let allGoalSetters = await User.find({
      roles: 'goal_setter',
      _id: { $ne: userId },
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    }).select('_id name email avatar location geoPreferences');
    
    // Filter by allowLocationSharing in JavaScript since the query seems to have issues
    let goalSetters = allGoalSetters.filter(gs => gs.geoPreferences?.allowLocationSharing === true);
    
    // If no goal setters found with exact coordinates, include those with location sharing enabled
    // but without exact coordinates (as a fallback)
    if (goalSetters.length === 0) {
      console.log('No goal setters with exact coordinates found for marketplace, searching for fallback options...');
      const fallbackGoalSetters = await User.find({
        roles: 'goal_setter',
        _id: { $ne: userId }
      }).select('_id name email avatar location geoPreferences');
      
      // Filter by allowLocationSharing in JavaScript
      goalSetters = fallbackGoalSetters.filter(gs => gs.geoPreferences?.allowLocationSharing === true);
    }
    
    // Calculate distances and filter nearby goal setters
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
          distance: distance ? Math.round(distance * 10) / 10 : null,
          hasExactLocation,
          location: {
            city: goalSetter.location?.city || "Unknown",
            state: goalSetter.location?.state || "Unknown",
            country: goalSetter.location?.country || "India"
          }
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
      });
    
    // Get IDs of nearby goal setters
    const nearbyGoalSetterIds = nearbyGoalSetters.map(gs => gs.id);
    
    if (nearbyGoalSetterIds.length === 0) {
      return res.json({
        items: [],
        pagination: {
          current: parseInt(page),
          total: 0,
          count: 0,
          limit: parseInt(limit)
        },
        nearbyGoalSetters: [],
        searchCriteria: {
          maxDistance: parseInt(maxDistance),
          category: category || 'all',
          userLocation: {
            latitude: currentUser.location.latitude,
            longitude: currentUser.location.longitude,
            city: currentUser.location.city,
            state: currentUser.location.state
          }
        }
      });
    }
    
    // Build query for marketplace items
    // Show active items or items without explicit status (backwards compatibility)
    let query = {
      userId: { $in: nearbyGoalSetterIds }
    };
    
    // Add category filter if specified
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Exclude sold, archived, or pending items
    query.status = { $nin: ['sold', 'archived', 'pending'] };
    
    // Debug logging
    console.log('Nearby marketplace query:', JSON.stringify(query, null, 2));
    console.log('Nearby goal setter IDs:', nearbyGoalSetterIds);
    
    // Get marketplace items from nearby goal setters
    const items = await Marketplace.find(query)
      .populate('userId', 'name email avatar location')
      .sort({ featured: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    console.log(`Found ${items.length} marketplace items from nearby sellers`);
    
    const total = await Marketplace.countDocuments(query);
    
    // Format items with seller distance information
    const formattedItems = items
      .filter(item => item.userId && item.userId._id && item.userId._id.toString() !== userId)
      .map(item => {
        const seller = nearbyGoalSetters.find(gs => gs.id.toString() === item.userId._id.toString());
        const daysAgo = Math.ceil((new Date() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24));
        const isRecent = daysAgo <= 7;
        
        return {
          id: item._id,
          title: item.title,
          description: item.description,
          price: item.price,
          category: item.category,
          condition: item.condition,
          status: item.status,
          images: item.images,
          views: item.views,
          likes: item.likes,
          featured: item.featured,
          location: item.location,
          contactInfo: item.contactInfo,
          tags: item.tags,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          daysAgo: daysAgo,
          isRecent: isRecent,
          seller: {
            id: item.userId._id,
            name: item.userId.name,
            email: item.userId.email,
            avatar: item.userId.avatar,
            distance: seller?.distance || 0,
            location: seller?.location || {
              city: item.userId.location?.city || '',
              state: item.userId.location?.state || ''
            }
          }
        };
      });
    
    // Count goal setters with and without exact location
    const withExactLocation = nearbyGoalSetters.filter(gs => gs.hasExactLocation).length;
    const withoutExactLocation = nearbyGoalSetters.filter(gs => !gs.hasExactLocation).length;
    
    res.json({
      items: formattedItems,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: total,
        limit: parseInt(limit)
      },
      nearbyGoalSetters: nearbyGoalSetters.slice(0, 10), // Show top 10 nearby sellers
      locationStats: {
        withExactLocation,
        withoutExactLocation,
        hasFallbackResults: withoutExactLocation > 0
      },
      searchCriteria: {
        maxDistance: parseInt(maxDistance),
        category: category || 'all',
        userLocation: {
          latitude: currentUser.location.latitude,
          longitude: currentUser.location.longitude,
          city: currentUser.location.city,
          state: currentUser.location.state
        }
      }
    });
  } catch (error) {
    console.error("Get nearby marketplace items error:", error);
    res.status(500).json({ message: "Failed to fetch nearby marketplace items" });
  }
});

// Get seller stats for goal setter dashboard
router.get("/stats/seller", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get active marketplace listings
    const activeListings = await Marketplace.countDocuments({ 
      userId, 
      status: 'active' 
    });

    // Get sold listings
    const soldListings = await Marketplace.countDocuments({ 
      userId, 
      status: 'sold' 
    });

    // Get total earnings from sold items
    const earnings = await MarketplaceIncome.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(userId), status: 'confirmed' } },
      { $group: { _id: null, totalEarnings: { $sum: '$amount' } } }
    ]);

    const totalEarnings = earnings.length > 0 ? earnings[0].totalEarnings : 0;

    // Get pending marketplace items
    const pendingListings = await Marketplace.countDocuments({ 
      userId, 
      status: 'pending' 
    });

    res.json({
      activeListings,
      soldListings,
      totalEarnings,
      pendingListings
    });
  } catch (error) {
    console.error("Get seller stats error:", error);
    res.status(500).json({ message: "Failed to fetch seller stats" });
  }
});

// ==================== FEEDBACK & RATING ENDPOINTS ====================

// Submit feedback/rating for a purchased item
router.post('/feedback/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { rating, categoryRatings, isGenuine, comment, orderId } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Validate comment length
    if (comment && (comment.length < 5 || comment.length > 500)) {
      return res.status(400).json({ message: 'Comment must be between 5 and 500 characters' });
    }

    // Get the item details
    const item = await Marketplace.findById(itemId).populate('userId', 'name');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (!item.userId || !item.userId._id) {
      return res.status(400).json({ message: 'Item seller not found' });
    }

    const sellerId = item.userId._id;

    // Check if buyer already left feedback for this item
    const existingFeedback = await MarketplaceFeedback.findOne({
      itemId: new mongoose.Types.ObjectId(itemId),
      buyerId
    });

    if (existingFeedback) {
      return res.status(400).json({ message: 'You have already left feedback for this item' });
    }

    // Verify buyer purchased this item (check order)
    if (orderId) {
      const order = await Order.findById(orderId);
      if (!order || order.buyerId.toString() !== buyerId.toString()) {
        return res.status(403).json({ message: 'Invalid purchase verification' });
      }
    }

    // Create feedback record
    const feedback = new MarketplaceFeedback({
      itemId: new mongoose.Types.ObjectId(itemId),
      orderId: orderId ? new mongoose.Types.ObjectId(orderId) : null,
      buyerId,
      sellerId,
      rating,
      categoryRatings: categoryRatings || {},
      isGenuine: isGenuine !== false,
      comment: comment?.trim() || '',
      buyerName: req.user.name,
      itemTitle: item.title,
      // Auto-verify 5-star genuine reviews
      verified: rating === 5 && isGenuine
    });

    await feedback.save();

    // Update seller stats
    const sellerRating = await MarketplaceFeedback.getSellerRating(sellerId);
    await User.findByIdAndUpdate(sellerId, {
      'marketplaceStats.averageRating': sellerRating.averageRating,
      'marketplaceStats.totalReviews': sellerRating.totalReviews,
      'marketplaceStats.genuinePercentage': sellerRating.genuinePercentage,
      'trustBadge.level': sellerRating.trustLevel,
      'trustBadge.lastUpdated': new Date()
    });

    res.json({
      message: 'Feedback submitted successfully',
      feedback: feedback,
      sellerRating
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
});

// Get seller reviews
router.get('/reviews/seller/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 5 } = req.query;

    const result = await MarketplaceFeedback.getSellerReviews(
      sellerId,
      parseInt(page),
      parseInt(limit)
    );

    res.json(result);
  } catch (error) {
    console.error('Get seller reviews error:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Get seller profile with rating and stats
router.get('/seller-profile/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;

    // Get seller user info
    const seller = await User.findById(sellerId).select(
      'name avatar email marketplaceStats trustBadge location'
    );

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    // Get seller rating
    const rating = await MarketplaceFeedback.getSellerRating(sellerId);

    // Get recent reviews
    const reviews = await MarketplaceFeedback.getSellerReviews(sellerId, 1, 5);

    res.json({
      seller: seller.toObject(),
      rating,
      recentReviews: reviews.reviews
    });
  } catch (error) {
    console.error('Get seller profile error:', error);
    res.status(500).json({ message: 'Failed to fetch seller profile' });
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
