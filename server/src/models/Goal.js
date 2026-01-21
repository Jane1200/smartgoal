import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    // FIXED: Made targetAmount required for non-wishlist goals to prevent division by zero
    targetAmount: { 
      type: Number, 
      min: 0,
      required: function() {
        return this.category !== 'wishlist' && !this.isWishlistItem;
      }
    },
    currentAmount: { type: Number, min: 0, default: 0 },
    dueDate: { type: Date },
    // FIXED: Removed duplicate "achieved" status - use "completed" only
    status: { 
      type: String, 
      enum: ["planned", "in_progress", "completed", "archived", "wishlist", "purchased"], 
      default: "planned" 
    },
    category: { 
      type: String, 
      enum: ["emergency_fund", "debt_repayment", "essential_purchase", "education", "investment", "discretionary", "wishlist", "other"], 
      default: "other" 
    },
    priority: { type: Number, min: 1, max: 5, default: 3 }, // 1=Critical, 2=High, 3=Medium, 4=Low, 5=Very Low
    isAutoSuggested: { type: Boolean, default: false }, // Track if goal was auto-suggested
    timePeriod: {
      type: String,
      enum: ["short-term", "long-term"],
      default: "long-term"
    },
    // FIXED: Added max validation for percentage
    wantsIncomeAllocation: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    sourceWishlistId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Wishlist", 
      default: null,
      index: true // FIXED: Added index for better query performance
    },
    
    // Wishlist-specific fields (when category is 'wishlist')
    isWishlistItem: { type: Boolean, default: false },
    marketplaceItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Marketplace' },
    url: { type: String, trim: true, maxlength: 2048 },
    productUrl: { type: String, trim: true, maxlength: 2048 }, // Product URL for shopping-based goals
    imageUrl: { type: String, trim: true, maxlength: 2048 },
    currency: { type: String, default: "INR", enum: ["INR", "USD", "EUR"] },
    notes: { type: String, trim: true, maxlength: 1000 },
    
    // Marketplace integration fields
    linkedMarketplaceItem: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Marketplace", 
      default: null,
      index: true
    },
    purchasedFromMarketplace: { type: Boolean, default: false },
    marketplacePurchaseDate: { type: Date },
    marketplaceSavings: { type: Number, min: 0, default: 0 } // Amount saved by buying used vs new
  },
  { timestamps: true }
);

// FIXED: Add validation to prevent division by zero in progress calculations
goalSchema.pre('save', function(next) {
  // Ensure targetAmount exists for non-wishlist goals
  if (!this.isWishlistItem && this.category !== 'wishlist' && (!this.targetAmount || this.targetAmount === 0)) {
    return next(new Error('Target amount is required for non-wishlist goals'));
  }
  
  // Ensure currentAmount doesn't exceed targetAmount
  if (this.targetAmount && this.currentAmount > this.targetAmount) {
    this.currentAmount = this.targetAmount;
  }
  
  // Auto-update status based on progress
  if (this.targetAmount && this.currentAmount >= this.targetAmount && this.status === 'in_progress') {
    this.status = 'completed';
  }
  
  next();
});

// Virtual for progress percentage
goalSchema.virtual('progress').get(function() {
  if (!this.targetAmount || this.targetAmount === 0) {
    return 0;
  }
  return Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100));
});

// Indexes for better performance
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, category: 1 });
goalSchema.index({ userId: 1, dueDate: 1 });

export default mongoose.model("Goal", goalSchema);
