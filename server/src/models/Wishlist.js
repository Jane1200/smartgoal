import mongoose from "mongoose";
import validator from 'validator';

const wishlistSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      index: true, 
      required: [true, 'User ID is required']
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
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    url: { 
      type: String, 
      trim: true, 
      maxlength: [2048, 'URL cannot exceed 2048 characters'],
      validate: {
        validator: function(v) {
          if (!v) return true;
          return validator.isURL(v, { 
            protocols: ['http', 'https'],
            require_protocol: true
          });
        },
        message: 'Please provide a valid URL with http:// or https://'
      }
    },
    price: { 
      type: Number, 
      min: [0, 'Price cannot be negative'],
      max: [10000000, 'Price cannot exceed 1 crore'],
      validate: {
        validator: function(v) {
          if (v === null || v === undefined) return true;
          return Number.isFinite(v) && v >= 0;
        },
        message: 'Price must be a valid positive number'
      }
    },
    currency: { 
      type: String, 
      default: "INR", 
      enum: {
        values: ["INR", "USD", "EUR", "GBP", "AUD"],
        message: '{VALUE} is not a supported currency'
      }
    },
    priority: { 
      type: String, 
      enum: {
        values: ["low", "medium", "high"],
        message: '{VALUE} is not a valid priority level'
      },
      default: "medium" 
    },
    category: { 
      type: String, 
      trim: true, 
      maxlength: [100, 'Category cannot exceed 100 characters']
    },
    imageUrl: { 
      type: String, 
      trim: true, 
      maxlength: [2048, 'Image URL cannot exceed 2048 characters'],
      validate: {
        validator: function(v) {
          if (!v) return true;
          return validator.isURL(v, { protocols: ['http', 'https'] });
        },
        message: 'Image URL must be a valid URL'
      }
    },
    status: { 
      type: String, 
      enum: {
        values: ["wishlist", "purchased", "removed", "converted_to_goal"],
        message: '{VALUE} is not a valid status'
      },
      default: "wishlist" 
    },
    notes: { 
      type: String, 
      trim: true, 
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    dueDate: { 
      type: Date,
      validate: {
        validator: function(v) {
          if (!v) return true;
          return v > new Date();
        },
        message: 'Due date must be in the future'
      }
    },
    // Track if converted to goal
    convertedToGoalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal"
    },
    convertedAt: {
      type: Date
    },
    // Purchase tracking
    purchasedAt: {
      type: Date
    },
    actualPrice: {
      type: Number,
      min: [0, 'Actual price cannot be negative']
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
wishlistSchema.index({ userId: 1, status: 1 });
wishlistSchema.index({ userId: 1, priority: 1 });
wishlistSchema.index({ userId: 1, dueDate: 1 });
wishlistSchema.index({ createdAt: -1 });

// Virtual for formatted price
wishlistSchema.virtual('formattedPrice').get(function() {
  if (!this.price) return 'N/A';
  const symbols = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AUD: 'A$' };
  const symbol = symbols[this.currency] || this.currency;
  return `${symbol}${this.price.toLocaleString()}`;
});

// Virtual for days until due
wishlistSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const diffTime = this.dueDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for is overdue
wishlistSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate) return false;
  return new Date() > this.dueDate && this.status === 'wishlist';
});

// Pre-validate middleware
wishlistSchema.pre('validate', function(next) {
  // If status is purchased, ensure purchasedAt is set
  if (this.status === 'purchased' && !this.purchasedAt) {
    this.purchasedAt = new Date();
  }
  
  // If status is converted_to_goal, ensure convertedToGoalId is set
  if (this.status === 'converted_to_goal' && !this.convertedToGoalId) {
    return next(new Error('Goal ID is required when status is converted_to_goal'));
  }
  
  // If converted to goal, set convertedAt
  if (this.status === 'converted_to_goal' && !this.convertedAt) {
    this.convertedAt = new Date();
  }
  
  next();
});

// Pre-save middleware
wishlistSchema.pre('save', function(next) {
  // Validate actual price is set when purchased
  if (this.status === 'purchased' && !this.actualPrice && this.price) {
    this.actualPrice = this.price;
  }
  
  next();
});

// Instance methods
wishlistSchema.methods.markAsPurchased = function(actualPrice = null) {
  this.status = 'purchased';
  this.purchasedAt = new Date();
  if (actualPrice !== null) {
    this.actualPrice = actualPrice;
  } else if (this.price) {
    this.actualPrice = this.price;
  }
  return this.save();
};

wishlistSchema.methods.convertToGoal = function(goalId) {
  if (!goalId) {
    throw new Error('Goal ID is required');
  }
  this.status = 'converted_to_goal';
  this.convertedToGoalId = goalId;
  this.convertedAt = new Date();
  return this.save();
};

wishlistSchema.methods.canEdit = function(userId) {
  return this.userId.toString() === userId.toString() && 
         this.status === 'wishlist';
};

// Static methods
wishlistSchema.statics.getUserWishlist = function(userId, filters = {}) {
  const query = { userId };
  
  if (filters.status) {
    query.status = filters.status;
  } else {
    query.status = 'wishlist'; // Default to active wishlist items
  }
  
  if (filters.priority) {
    query.priority = filters.priority;
  }
  
  if (filters.category) {
    query.category = new RegExp(filters.category, 'i');
  }
  
  const sort = filters.sort || { priority: -1, createdAt: -1 };
  
  return this.find(query).sort(sort);
};

wishlistSchema.statics.getOverdueItems = function(userId) {
  return this.find({
    userId,
    status: 'wishlist',
    dueDate: { $lt: new Date() }
  }).sort({ dueDate: 1 });
};

wishlistSchema.statics.getUpcomingItems = function(userId, days = 30) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);
  
  return this.find({
    userId,
    status: 'wishlist',
    dueDate: { $gte: now, $lte: futureDate }
  }).sort({ dueDate: 1 });
};

export default mongoose.model("Wishlist", wishlistSchema);
