import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middleware/auth.js";
import Marketplace from "../models/Marketplace.js";
import User from "../models/User.js";

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

// Get featured marketplace items
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    
    // Get featured items from database
    const featuredItems = await Marketplace.getFeaturedItems(limit);
    
    // If no featured items, get recent active items
    if (featuredItems.length === 0) {
      const recentItems = await Marketplace.find({ status: 'active' })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit);
      
      return res.json(recentItems);
    }
    
    res.json(featuredItems);
  } catch (error) {
    console.error('Featured items error:', error);
    res.status(500).json({ message: 'Failed to fetch featured items' });
  }
});

// Get user's listings
router.get('/my-listings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
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
    const userId = req.user.id;
    const { title, description, price, category, condition, images } = req.body;

    // Validate required fields
    if (!title || !price || !images || images.length === 0) {
      return res.status(400).json({ 
        message: 'Title, price, and at least one image are required' 
      });
    }

    // Create new marketplace listing
    const newListing = new Marketplace({
      userId,
      title,
      description: description || '',
      price: parseFloat(price),
      category: category || 'other',
      condition: condition || 'good',
      status: 'active',
      images: images.map(url => ({
        url,
        filename: url.split('/').pop(), // Extract filename from URL
        uploadedAt: new Date()
      }))
    });

    // Save to database
    await newListing.save();

    // Populate user data for response
    await newListing.populate('userId', 'name email');

    res.json({
      message: 'Item listed successfully',
      listing: newListing
    });
  } catch (error) {
    console.error('List item error:', error);
    res.status(500).json({ message: 'Failed to list item' });
  }
});

// Delete listing
router.delete('/listings/:id', requireAuth, async (req, res) => {
  try {
    const listingId = req.params.id;
    const userId = req.user.id;

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

// Browse marketplace items (for buyers)
router.get("/browse", async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = 12
    } = req.query;

    // Build query
    const query = { status: "active" };

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
      .populate("userId", "name")
      .select("title description price category condition status images views likes createdAt")
      .limit(parseInt(limit) * 1)
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Add seller name to each item
    const itemsWithSeller = items.map(item => ({
      ...item.toObject(),
      sellerName: item.userId?.name || "Unknown Seller"
    }));

    res.json(itemsWithSeller);
  } catch (error) {
    console.error("Failed to browse marketplace items:", error);
    res.status(500).json({ message: "Failed to browse marketplace items" });
  }
});

// Get marketplace items from nearby goal setters (for buyers)
router.get("/nearby-items", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
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
      role: 'goal_setter',
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
        role: 'goal_setter',
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
    let query = {
      userId: { $in: nearbyGoalSetterIds },
      status: { $in: ['active', 'featured'] }
    };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Get marketplace items from nearby goal setters
    const items = await Marketplace.find(query)
      .populate('userId', 'name email avatar location')
      .sort({ featured: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Marketplace.countDocuments(query);
    
    // Format items with seller distance information
    const formattedItems = items.map(item => {
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
