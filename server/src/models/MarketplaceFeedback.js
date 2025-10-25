import mongoose from "mongoose";

const marketplaceFeedbackSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Marketplace",
      required: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    
    // Rating: 1-5 stars
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      enum: [1, 2, 3, 4, 5]
    },
    
    // Category-wise ratings (optional)
    categoryRatings: {
      quality: { type: Number, min: 1, max: 5 },
      description: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      shipping: { type: Number, min: 1, max: 5 }
    },
    
    // Is the item genuine?
    isGenuine: {
      type: Boolean,
      default: true
    },
    
    // Detailed feedback text
    comment: {
      type: String,
      trim: true,
      minlength: 5,
      maxlength: 500
    },
    
    // Admin verification
    verified: {
      type: Boolean,
      default: false
    },
    
    // Helpful votes from other users
    helpfulCount: {
      type: Number,
      default: 0
    },
    
    // Buyer's name for display (snapshot)
    buyerName: String,
    
    // Item title for reference
    itemTitle: String
  },
  {
    timestamps: true,
    indexes: [
      { sellerId: 1, createdAt: -1 },
      { itemId: 1, buyerId: 1 }
    ]
  }
);

// Prevent duplicate feedback for same item/buyer
marketplaceFeedbackSchema.index(
  { itemId: 1, buyerId: 1 },
  { unique: true }
);

// Calculate average rating for a seller
marketplaceFeedbackSchema.statics.getSellerRating = async function(sellerId) {
  try {
    const result = await this.aggregate([
      { $match: { sellerId: new mongoose.Types.ObjectId(sellerId), verified: true } },
      {
        $group: {
          _id: "$sellerId",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          genuineCount: {
            $sum: { $cond: ["$isGenuine", 1, 0] }
          }
        }
      }
    ]);

    if (result.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        genuinePercentage: 0,
        trustLevel: "new"
      };
    }

    const data = result[0];
    const genuinePercentage = data.totalReviews > 0 
      ? Math.round((data.genuineCount / data.totalReviews) * 100)
      : 0;

    // Determine trust level based on reviews and rating
    let trustLevel = "new";
    if (data.totalReviews >= 1) trustLevel = "verified";
    if (data.totalReviews >= 5 && data.averageRating >= 3.5) trustLevel = "trusted";
    if (data.totalReviews >= 10 && data.averageRating >= 4.0 && genuinePercentage >= 85) trustLevel = "silver";
    if (data.totalReviews >= 20 && data.averageRating >= 4.5 && genuinePercentage >= 90) trustLevel = "gold";
    if (data.totalReviews >= 50 && data.averageRating >= 4.8 && genuinePercentage >= 95) trustLevel = "platinum";

    return {
      averageRating: Math.round(data.averageRating * 10) / 10,
      totalReviews: data.totalReviews,
      genuinePercentage,
      trustLevel
    };
  } catch (error) {
    console.error("Error calculating seller rating:", error);
    return {
      averageRating: 0,
      totalReviews: 0,
      genuinePercentage: 0,
      trustLevel: "new"
    };
  }
};

// Get verified reviews for a seller with pagination
marketplaceFeedbackSchema.statics.getSellerReviews = async function(sellerId, page = 1, limit = 5) {
  try {
    const skip = (page - 1) * limit;
    const reviews = await this.find({ sellerId, verified: true })
      .populate('buyerId', 'name avatar')
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await this.countDocuments({ sellerId, verified: true });

    return {
      reviews,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error("Error fetching seller reviews:", error);
    return {
      reviews: [],
      pagination: { total: 0, page, limit, pages: 0 }
    };
  }
};

export default mongoose.model("MarketplaceFeedback", marketplaceFeedbackSchema);