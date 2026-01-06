import mongoose from "mongoose";

const marketplaceSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true 
    },
    title: { 
      type: String, 
      required: true, 
      trim: true, 
      maxlength: 200 
    },
    description: { 
      type: String, 
      trim: true, 
      maxlength: 2000 
    },
    price: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    category: { 
      type: String, 
      enum: ["electronics", "fashion", "home", "sports", "books", "vehicles", "other"],
      default: "other"
    },
    subCategory: {
      type: String,
      enum: ["phone", "smartwatch", "earphones", "laptop", "tablet", "other"],
      default: "other"
    },
    condition: { 
      type: String, 
      enum: ["new", "like-new", "excellent", "good", "fair", "needs-repair"],
      default: "good"
    },
    status: { 
      type: String, 
      enum: ["active", "sold", "pending", "archived", "blocked", "pending_review"], 
      default: "active" 
    },
    images: [{
      url: { type: String, required: true },
      filename: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }],
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    // Fraud detection
    fraudReport: {
      suspicionScore: { type: Number, default: 0 },
      riskLevel: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
      flags: [{
        type: String,
        severity: String,
        message: String
      }],
      analyzedAt: { type: Date, default: Date.now },
      recommendation: {
        action: String,
        message: String,
        userWarning: String
      }
    },
    location: {
      city: String,
      state: String,
      country: { type: String, default: "India" }
    },
    contactInfo: {
      phone: String,
      email: String,
      preferredContact: { type: String, enum: ["phone", "email", "both"], default: "email" }
    },
    tags: [String],
    soldAt: Date,
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // AI-powered condition analysis
    aiScore: { 
      type: Number, 
      min: 0, 
      max: 100,
      default: null 
    },
    conditionAnalysis: {
      condition: String,
      confidence: Number,
      tampered: Boolean,
      features: {
        sharpness: Number,
        color_variance: Number,
        edge_density: Number,
        brightness: Number,
        contrast: Number
      }
    },
    autoPriced: { type: Boolean, default: false },
    originalPrice: { type: Number, min: 0 },
    priceBreakdown: {
      basePrice: Number,
      conditionAdjustment: Number,
      locationFactor: Number,
      finalPrice: Number
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better performance
marketplaceSchema.index({ userId: 1, status: 1 });
marketplaceSchema.index({ category: 1, status: 1 });
marketplaceSchema.index({ price: 1, status: 1 });
marketplaceSchema.index({ createdAt: -1 });
marketplaceSchema.index({ featured: 1, status: 1 });

// Virtual for formatted price
marketplaceSchema.virtual('formattedPrice').get(function() {
  return `₹${this.price.toLocaleString()}`;
});

// Virtual for days since listed
marketplaceSchema.virtual('daysListed').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Pre-save middleware to validate images
marketplaceSchema.pre('save', function(next) {
  if (this.images && this.images.length === 0) {
    return next(new Error('At least one image is required'));
  }
  next();
});

// Instance methods
marketplaceSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

marketplaceSchema.methods.markAsSold = function(buyerId) {
  this.status = 'sold';
  this.soldAt = new Date();
  this.buyerId = buyerId;
  return this.save();
};

// Static methods
marketplaceSchema.statics.getFeaturedItems = function(limit = 8) {
  return this.find({ 
    status: 'active', 
    featured: true 
  })
  .populate('userId', 'name email')
  .sort({ createdAt: -1 })
  .limit(limit);
};

marketplaceSchema.statics.getUserListings = function(userId) {
  return this.find({ userId })
    .sort({ createdAt: -1 });
};

marketplaceSchema.statics.getActiveListings = function(filters = {}) {
  const query = { status: 'active' };
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = filters.minPrice;
    if (filters.maxPrice) query.price.$lte = filters.maxPrice;
  }
  
  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { tags: { $in: [new RegExp(filters.search, 'i')] } }
    ];
  }
  
  return this.find(query)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });
};

export default mongoose.model("Marketplace", marketplaceSchema);





