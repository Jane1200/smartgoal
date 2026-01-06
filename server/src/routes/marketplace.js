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
import { detectConditionFromFile, getEnhancedPricePrediction } from "../utils/conditionDetection.js";
import { detectFraud, analyzeSellerBehavior, generateFraudReport } from "../utils/fraudDetection.js";
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

// NEW ENDPOINT: Estimate price from CV analysis (called after image upload)
router.post('/estimate-price-cv', requireAuth, async (req, res) => {
  try {
    const { imagePath, category, subCategory, brand, title } = req.body;

    if (!imagePath) {
      return res.status(400).json({ 
        success: false,
        message: 'Image path is required' 
      });
    }

    // Get full path to uploaded image
    const fullImagePath = path.join(process.cwd(), imagePath);
    
    console.log(`\n🤖 CV PRICE ESTIMATION REQUEST:`);
    console.log(`   📸 Image: ${imagePath}`);
    console.log(`   📦 Category: ${category}, SubCategory: ${subCategory}`);
    console.log(`   🏷️ Brand: ${brand}`);

    // Get enhanced price prediction with condition detection
    const pricingData = {
      title: title || `${brand} ${subCategory}`,
      category: category || 'electronics',
      subCategory: subCategory || 'other',
      brand: brand || 'generic',
      location: req.user.profile?.location || 'India'
    };

    const predictionResult = await getEnhancedPricePrediction(pricingData, fullImagePath);

    if (predictionResult.success) {
      console.log(`✅ CV estimation successful: ₹${predictionResult.predicted_price}`);
      
      res.json({
        success: true,
        predicted_price: predictionResult.predicted_price,
        ai_score: predictionResult.ai_score,
        condition_detected: predictionResult.cv_insights?.condition || 'good',
        confidence: predictionResult.cv_insights?.confidence || 70,
        cv_insights: predictionResult.cv_insights,
        pricing_breakdown: predictionResult.pricing_breakdown
      });
    } else {
      throw new Error(predictionResult.message || 'CV pricing failed');
    }
  } catch (error) {
    console.error('❌ CV price estimation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to estimate price from image',
      error: error.message 
    });
  }
});

// Detect condition from uploaded image
router.post('/detect-condition', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // Get full path to uploaded image
    const imagePath = path.join(process.cwd(), 'uploads/marketplace', req.file.filename);
    
    // Detect condition using computer vision
    const conditionResult = await detectConditionFromFile(imagePath);
    
    res.json({
      message: 'Condition detected successfully',
      ...conditionResult
    });
  } catch (error) {
    console.error('Condition detection error:', error);
    res.status(500).json({ 
      message: 'Failed to detect condition',
      error: error.message 
    });
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
    const { title, description, price, category, condition, images, subCategory, brand } = req.body;

    // Validate required fields
    // Title is now optional - we can auto-generate it
    if (!images || images.length === 0) {
      return res.status(400).json({ 
        message: 'At least one image is required for automatic CV pricing' 
      });
    }

    // Validate images array format
    if (!Array.isArray(images)) {
      return res.status(400).json({ 
        message: 'Images must be an array' 
      });
    }

    let finalPrice = null;
    let conditionAnalysis = null;
    let aiScore = null;
    let autoPriced = true;
    
    // ALWAYS use computer vision for AUTOMATIC price estimation - NO MANUAL PRICING
    try {
      // Get the first image for condition analysis
      const firstImageUrl = images[0];
      const filename = typeof firstImageUrl === 'string' ? firstImageUrl.split('/').pop() : 'image';
      const imagePath = path.join(process.cwd(), 'uploads/marketplace', filename);
      
      // Automatically generate title if not provided
      const autoTitle = title || `${brand || 'Resale'} ${subCategory || 'Item'} ${Date.now()}`;
      
      // Get enhanced CV price prediction - NO originalPrice or purchaseDate needed
      const pricingData = {
        title: autoTitle,
        category: category || 'electronics',
        subCategory: subCategory || 'other',
        brand: brand || 'generic',
        location: req.user.profile?.location || 'India'
        // NO originalPrice or purchaseDate - CV estimates directly from condition
      };
      
      console.log(`\n🤖 AUTOMATIC CV PRICING INITIATED for: ${autoTitle}`);
      console.log(`   📦 Category: ${pricingData.category}, SubCategory: ${pricingData.subCategory}`);
      console.log(`   🏷️ Brand: ${pricingData.brand}, Location: ${pricingData.location}`);
      
      console.log(`\n🤖 AUTOMATIC CV PRICING INITIATED for: ${autoTitle}`);
      console.log(`   📦 Category: ${pricingData.category}, SubCategory: ${pricingData.subCategory}`);
      console.log(`   🏷️ Brand: ${pricingData.brand}, Location: ${pricingData.location}`);
      
      const predictionResult = await getEnhancedPricePrediction(pricingData, imagePath);
      
      if (predictionResult.success) {
        finalPrice = predictionResult.predicted_price;
        aiScore = predictionResult.ai_score;
        
        // Extract condition analysis from cv_insights or condition_result
        conditionAnalysis = predictionResult.cv_insights || predictionResult.condition_result || {};
        
        // Log comprehensive pricing breakdown
        console.log(`\n✅ AUTOMATIC CV PRICING SUCCESSFUL:`);
        console.log(`   💰 Estimated Price: ₹${finalPrice}`);
        console.log(`   📊 AI Score: ${aiScore || 'N/A'}/100`);
        console.log(`   🔍 Detected Condition: ${conditionAnalysis.condition || 'unknown'}`);
        console.log(`   ✅ Confidence: ${conditionAnalysis.confidence ? conditionAnalysis.confidence.toFixed(1) + '%' : 'N/A'}`);
        
        if (conditionAnalysis.features) {
          console.log(`   📸 Image Quality Metrics:`);
          console.log(`      - Sharpness: ${conditionAnalysis.features.sharpness || 'N/A'}`);
          console.log(`      - Contrast: ${conditionAnalysis.features.contrast || 'N/A'}`);
          console.log(`      - Brightness: ${conditionAnalysis.features.brightness || 'N/A'}`);
          console.log(`      - Edge Density: ${conditionAnalysis.features.edge_density || 'N/A'}`);
        }
        
        if (predictionResult.pricing_breakdown) {
          console.log(`   💡 Price Breakdown:`);
          console.log(`      - Base Market Price: ₹${predictionResult.pricing_breakdown.base_market_price || 'N/A'}`);
          console.log(`      - Brand Adjusted: ₹${predictionResult.pricing_breakdown.brand_adjusted || 'N/A'}`);
          console.log(`      - Location Adjusted: ₹${predictionResult.pricing_breakdown.location_adjusted || 'N/A'}`);
          console.log(`      - Final (Condition Applied): ₹${predictionResult.pricing_breakdown.condition_adjusted || finalPrice}`);
        }
        
        // Add tampered image warning if detected
        if (conditionAnalysis.tampered) {
          console.warn(`   🚨 WARNING: Tampered/edited image detected - pricing may be less accurate`);
        }
      } else {
        throw new Error(predictionResult.message || 'CV pricing failed');
      }
    } catch (pricingError) {
      console.error('❌ Automatic CV pricing failed:', pricingError.message);
      console.error('   Stack:', pricingError.stack);
      
      // If automatic pricing completely fails, reject the listing
      // We don't want fallback pricing - CV is required
      return res.status(500).json({
        message: 'Failed to estimate price from image. Please try uploading a clearer image.',
        error: pricingError.message,
        suggestion: 'Ensure image is well-lit, in focus, and shows the product clearly'
      });
    }

    // Validate we got a valid price from CV
    const numPrice = parseFloat(finalPrice);
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(500).json({ 
        message: 'Failed to generate valid price estimate. Please try a different image.',
        details: 'Computer vision could not accurately assess the product condition'
      });
    }

    // Use CV-detected condition, fallback to provided or default
    const finalCondition = (conditionAnalysis?.condition) || condition || 'good';

    // Create new marketplace listing with CV-estimated price
    const newListing = new Marketplace({
      userId,
      title: (title || `${brand || 'Resale'} ${subCategory || 'Item'}`).trim(),
      description: (description || 'Quality resale item with AI-verified condition').trim(),
      price: numPrice,
      originalPrice: undefined, // Not needed for CV-only pricing
      purchaseDate: undefined,  // Not needed for CV-only pricing
      category: category || 'electronics',
      subCategory: subCategory || 'other',
      brand: brand || 'generic',
      condition: finalCondition,
      status: 'active',
      aiScore: aiScore,
      conditionAnalysis: conditionAnalysis ? {
        condition: conditionAnalysis.condition,
        confidence: conditionAnalysis.confidence,
        tampered: conditionAnalysis.tampered || false,
        features: conditionAnalysis.features || {}
      } : undefined,
      autoPriced: true, // Always true - CV automatic pricing
      priceBreakdown: predictionResult?.pricing_breakdown ? {
        basePrice: predictionResult.pricing_breakdown.base_market_price || numPrice,
        brandAdjusted: predictionResult.pricing_breakdown.brand_adjusted || numPrice,
        locationAdjusted: predictionResult.pricing_breakdown.location_adjusted || numPrice,
        conditionAdjusted: predictionResult.pricing_breakdown.condition_adjusted || numPrice,
        finalPrice: numPrice
      } : undefined,
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

    // Run fraud detection analysis
    console.log("\n🔍 Running fraud detection...");
    const fraudAnalysis = detectFraud({
      ...savedListing.toObject(),
      seller: { createdAt: req.user.createdAt }
    });

    // Check seller behavior if listing is suspicious
    if (fraudAnalysis.suspicionScore >= 20) {
      const sellerListings = await Marketplace.find({ userId: savedListing.userId });
      const sellerAnalysis = analyzeSellerBehavior(req.user, sellerListings);
      const fraudReport = generateFraudReport(savedListing, sellerAnalysis);

      console.log(`⚠️  FRAUD ALERT - Suspicion Score: ${fraudAnalysis.suspicionScore}/100`);
      console.log(`   Risk Level: ${fraudAnalysis.riskLevel}`);
      console.log(`   Flags: ${fraudAnalysis.flags.map(f => f.type).join(", ")}`);

      // If high risk, mark listing for review or block
      if (fraudAnalysis.shouldBlock) {
        savedListing.status = "blocked";
        savedListing.fraudReport = fraudReport;
        await savedListing.save();

        return res.status(403).json({
          success: false,
          message: "Listing blocked due to fraud detection",
          fraudAnalysis: {
            riskLevel: fraudAnalysis.riskLevel,
            suspicionScore: fraudAnalysis.suspicionScore,
            recommendation: fraudAnalysis.recommendation
          }
        });
      } else if (fraudAnalysis.requiresReview) {
        savedListing.status = "pending_review";
        savedListing.fraudReport = fraudReport;
        await savedListing.save();
      }
    }

    // Populate user data for response
    await savedListing.populate('userId', 'name email');

    console.log(`\n✅ LISTING CREATED SUCCESSFULLY:`);
    console.log(`   📝 Title: ${savedListing.title}`);
    console.log(`   💰 Auto-Estimated Price: ₹${savedListing.price}`);
    console.log(`   📊 AI Score: ${savedListing.aiScore}/100`);
    console.log(`   🔍 Condition: ${savedListing.condition}`);

    res.json({
      message: 'Item listed successfully with automatic CV price estimation',
      listing: savedListing,
      conditionAnalysis,
      autoPriced: true,
      aiScore: savedListing.aiScore,
      estimatedPrice: finalPrice,
      priceConfidence: predictionResult?.confidence || conditionAnalysis?.confidence || 70,
      priceBreakdown: predictionResult?.pricing_breakdown || null,
      pricingMethod: 'cv_automatic',
      message_detail: `Price automatically estimated at ₹${finalPrice} based on ${finalCondition} condition detected from image analysis`
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

    // Build query - exclude current user's listings and blocked/pending review items
    const query = { 
      status: "active",
      userId: { $ne: userId },  // Exclude items listed by current user
      $or: [
        { "fraudReport.riskLevel": { $in: ["low", null] } },
        { fraudReport: { $exists: false } }
      ]
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

// Admin endpoint: Get flagged listings for review
router.get('/admin/flagged-listings', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { riskLevel, status = "pending_review" } = req.query;

    const query = {
      $or: [
        { status: "pending_review" },
        { status: "blocked" },
        { "fraudReport.riskLevel": { $in: ["medium", "high", "critical"] } }
      ]
    };

    if (riskLevel) {
      query["fraudReport.riskLevel"] = riskLevel;
    }

    const flaggedListings = await Marketplace.find(query)
      .populate('userId', 'name email createdAt')
      .sort({ 'fraudReport.suspicionScore': -1 })
      .limit(50);

    res.json({
      success: true,
      count: flaggedListings.length,
      listings: flaggedListings
    });
  } catch (error) {
    console.error('Get flagged listings error:', error);
    res.status(500).json({ message: 'Failed to fetch flagged listings' });
  }
});

// Admin endpoint: Approve or reject flagged listing
router.patch('/admin/review-listing/:id', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { id } = req.params;
    const { action, reason } = req.body; // action: "approve" or "block"

    const listing = await Marketplace.findById(id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (action === "approve") {
      listing.status = "active";
      listing.fraudReport.riskLevel = "low";
      listing.fraudReport.suspicionScore = 0;
    } else if (action === "block") {
      listing.status = "blocked";
      if (reason) {
        listing.fraudReport.recommendation = {
          ...listing.fraudReport.recommendation,
          adminReason: reason
        };
      }
    }

    await listing.save();

    res.json({
      success: true,
      message: `Listing ${action === "approve" ? "approved" : "blocked"} successfully`,
      listing
    });
  } catch (error) {
    console.error('Review listing error:', error);
    res.status(500).json({ message: 'Failed to review listing' });
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
