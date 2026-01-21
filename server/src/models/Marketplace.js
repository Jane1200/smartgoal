import mongoose from "mongoose";
import validator from 'validator';

const marketplaceSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: [true, 'User ID is required'],
      index: true 
    },
    title: { 
      type: String, 
      required: [true, 'Title is required'],
      trim: true, 
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: { 
      type: String, 
      trim: true, 
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    price: { 
      type: Number, 
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      max: [10000000, 'Price cannot exceed 1 crore'],
      validate: {
        validator: function(v) {
          return Number.isFinite(v) && v >= 0;
        },
        message: 'Price must be a valid positive number'
      }
    },
    category: { 
      type: String, 
      required: [true, 'Category is required'],
      enum: {
        values: ["electronics", "fashion", "home", "sports", "books", "vehicles", "other"],
        message: '{VALUE} is not a valid category'
      },
      default: "other"
    },
    subCategory: {
      type: String,
      enum: {
        values: ["phone", "smartwatch", "earphones", "laptop", "tablet", "other"],
        message: '{VALUE} is not a valid subcategory'
      },
      default: "other"
    },
    condition: { 
      type: String, 
      required: [true, 'Condition is required'],
      enum: {
        values: ["new", "like-new", "excellent", "good", "fair", "needs-repair"],
        message: '{VALUE} is not a valid condition'
      },
      default: "good"
    },
    status: { 
      type: String, 
      enum: {
        values: ["active", "sold", "pending", "archived", "blocked", "pending_review"],
        message: '{VALUE} is not a valid status'
      },
      default: "active" 
    },
    images: {
      type: [{
        url: { 
          type: String, 
          required: [true, 'Image URL is required'],
          validate: {
            validator: function(v) {
              return validator.isURL(v, { protocols: ['http', 'https'] });
            },
            message: 'Image URL must be a valid URL'
          }
        },
        filename: { 
          type: String, 
          required: [true, 'Image filename is required']
        },
        uploadedAt: { type: Date, default: Date.now }
      }],
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.length > 0 && v.length <= 10;
        },
        message: 'Must have between 1 and 10 images'
      }
    },
    views: { 
      type: Number, 
      default: 0,
      min: [0, 'Views cannot be negative']
    },
    likes: { 
      type: Number, 
      default: 0,
      min: [0, 'Likes cannot be negative']
    },
    featured: { type: Boolean, default: false },
    
    // Fraud detection
    fraudReport: {
      suspicionScore: { 
        type: Number, 
        default: 0,
        min: [0, 'Suspicion score cannot be negative'],
        max: [100, 'Suspicion score cannot exceed 100']
      },
      riskLevel: { 
        type: String, 
        enum: {
          values: ["low", "medium", "high", "critical"],
          message: '{VALUE} is not a valid risk level'
        },
        default: "low" 
      },
      flags: [{
        type: { 
          type: String,
          required: true
        },
        severity: { 
          type: String,
          enum: ["low", "medium", "high", "critical"]
        },
        message: String
      }],
      analyzedAt: { type: Date, default: Date.now },
      recommendation: {
        action: { 
          type: String,
          enum: ["approve", "review", "block", "warn"]
        },
        message: String,
        userWarning: String
      }
    },
    
    location: {
      city: { 
        type: String,
        trim: true,
        maxlength: [100, 'City name cannot exceed 100 characters']
      },
      state: { 
        type: String,
        trim: true,
        maxlength: [100, 'State name cannot exceed 100 characters']
      },
      country: { 
        type: String, 
        default: "India",
        trim: true,
        maxlength: [100, 'Country name cannot exceed 100 characters']
      }
    },
    
    contactInfo: {
      phone: { 
        type: String,
        trim: true,
        validate: {
          validator: function(v) {
            if (!v) return true;
            return /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/.test(v);
          },
          message: 'Please provide a valid phone number'
        }
      },
      email: { 
        type: String,
        trim: true,
        lowercase: true,
        validate: {
          validator: function(v) {
            if (!v) return true;
            return validator.isEmail(v);
          },
          message: 'Please provide a valid email address'
        }
      },
      preferredContact: { 
        type: String, 
        enum: {
          values: ["phone", "email", "both"],
          message: '{VALUE} is not a valid contact preference'
        },
        default: "email" 
      }
    },
    
    tags: {
      type: [String],
      validate: {
        validator: function(v) {
          return v.length <= 10;
        },
        message: 'Cannot have more than 10 tags'
      }
    },
    
    soldAt: { type: Date },
    buyerId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    
    // Goal integration fields
    linkedGoalBySeller: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Goal",
      default: null,
      index: true
    }, // Goal that seller is funding with this sale
    linkedGoalByBuyer: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Goal",
      default: null,
      index: true
    }, // Goal that buyer is fulfilling with this purchase
    contributedToGoal: { type: Boolean, default: false },
    goalContributionAmount: { type: Number, min: 0, default: 0 },
    
    // AI-powered condition analysis
    aiScore: { 
      type: Number, 
      min: [0, 'AI score cannot be negative'],
      max: [100, 'AI score cannot exceed 100'],
      default: null 
    },
    conditionAnalysis: {
      condition: String,
      confidence: { 
        type: Number,
        min: [0, 'Confidence cannot be negative'],
        max: [100, 'Confidence cannot exceed 100']
      },
      tampered: Boolean,
      features: {
        sharpness: { 
          type: Number,
          min: [0, 'Sharpness cannot be negative'],
          max: [100, 'Sharpness cannot exceed 100']
        },
        color_variance: { 
          type: Number,
          min: [0, 'Color variance cannot be negative'],
          max: [100, 'Color variance cannot exceed 100']
        },
        edge_density: { 
          type: Number,
          min: [0, 'Edge density cannot be negative'],
          max: [100, 'Edge density cannot exceed 100']
        },
        brightness: { 
          type: Number,
          min: [0, 'Brightness cannot be negative'],
          max: [100, 'Brightness cannot exceed 100']
        },
        contrast: { 
          type: Number,
          min: [0, 'Contrast cannot be negative'],
          max: [100, 'Contrast cannot exceed 100']
        }
      }
    },
    
    autoPriced: { type: Boolean, default: false },
    originalPrice: { 
      type: Number, 
      min: [0, 'Original price cannot be negative'],
      max: [10000000, 'Original price cannot exceed 1 crore']
    },
    priceBreakdown: {
      basePrice: { 
        type: Number,
        min: [0, 'Base price cannot be negative']
      },
      conditionAdjustment: Number,
      locationFactor: Number,
      finalPrice: { 
        type: Number,
        min: [0, 'Final price cannot be negative']
      }
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
marketplaceSchema.index({ 'location.city': 1, 'location.state': 1 });
marketplaceSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Virtual for formatted price
marketplaceSchema.virtual('formattedPrice').get(function() {
  return `₹${this.price.toLocaleString('en-IN')}`;
});

// Virtual for days since listed
marketplaceSchema.virtual('daysListed').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for discount percentage
marketplaceSchema.virtual('discountPercentage').get(function() {
  if (!this.originalPrice || this.originalPrice === 0) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

// Pre-validate middleware
marketplaceSchema.pre('validate', function(next) {
  // Ensure at least one contact method is provided
  if (this.contactInfo && !this.contactInfo.phone && !this.contactInfo.email) {
    return next(new Error('At least one contact method (phone or email) is required'));
  }
  
  // Validate sold status has buyerId
  if (this.status === 'sold' && !this.buyerId) {
    return next(new Error('Buyer ID is required when status is sold'));
  }
  
  // Validate sold status has soldAt date
  if (this.status === 'sold' && !this.soldAt) {
    this.soldAt = new Date();
  }
  
  next();
});

// Pre-save middleware
marketplaceSchema.pre('save', function(next) {
  // Trim and lowercase tags
  if (this.tags && Array.isArray(this.tags)) {
    this.tags = this.tags.map(tag => tag.toLowerCase().trim()).filter(tag => tag.length > 0);
    this.tags = [...new Set(this.tags)]; // Remove duplicates
  }
  
  // Validate price breakdown consistency
  if (this.priceBreakdown && this.priceBreakdown.finalPrice) {
    if (Math.abs(this.priceBreakdown.finalPrice - this.price) > 1) {
      this.priceBreakdown.finalPrice = this.price;
    }
  }
  
  next();
});

// Instance methods
marketplaceSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save({ validateBeforeSave: false });
};

marketplaceSchema.methods.markAsSold = function(buyerId) {
  if (!buyerId) {
    throw new Error('Buyer ID is required');
  }
  this.status = 'sold';
  this.soldAt = new Date();
  this.buyerId = buyerId;
  return this.save();
};

marketplaceSchema.methods.canEdit = function(userId) {
  return this.userId.toString() === userId.toString() && this.status !== 'sold';
};

// Static methods
marketplaceSchema.statics.getFeaturedItems = function(limit = 8) {
  return this.find({ 
    status: 'active', 
    featured: true 
  })
  .populate('userId', 'name email avatar trustBadge')
  .sort({ createdAt: -1 })
  .limit(limit);
};

marketplaceSchema.statics.getUserListings = function(userId, status = null) {
  const query = { userId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

marketplaceSchema.statics.getActiveListings = function(filters = {}) {
  const query = { status: 'active' };
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.condition) {
    query.condition = filters.condition;
  }
  
  if (filters.minPrice || filters.maxPrice) {
    query.price = {};
    if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
    if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
  }
  
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  
  if (filters.city) {
    query['location.city'] = new RegExp(filters.city, 'i');
  }
  
  return this.find(query)
    .populate('userId', 'name email avatar trustBadge marketplaceStats')
    .sort(filters.sort || { createdAt: -1 })
    .limit(filters.limit || 50);
};

export default mongoose.model("Marketplace", marketplaceSchema);
