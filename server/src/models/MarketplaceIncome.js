import mongoose from "mongoose";

const marketplaceIncomeSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    marketplaceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Marketplace",
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    itemTitle: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "distributed", "cancelled"],
      default: "pending"
    },
    distributionStatus: {
      // Track how this income has been distributed to goals
      isDistributed: { type: Boolean, default: false },
      distributedAt: Date,
      goalDistributions: [
        {
          goalId: mongoose.Schema.Types.ObjectId,
          amount: Number,
          timestamp: { type: Date, default: Date.now }
        }
      ]
    },
    soldAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for better performance
marketplaceIncomeSchema.index({ sellerId: 1, status: 1 });
marketplaceIncomeSchema.index({ sellerId: 1, soldAt: -1 });

// Static method to get seller's total marketplace income
marketplaceIncomeSchema.statics.getSellerTotalIncome = function(sellerId, filters = {}) {
  const query = { sellerId, status: { $ne: "cancelled" } };

  if (filters.startDate || filters.endDate) {
    query.soldAt = {};
    if (filters.startDate) query.soldAt.$gte = filters.startDate;
    if (filters.endDate) query.soldAt.$lte = filters.endDate;
  }

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalIncome: { $sum: "$amount" },
        totalSales: { $sum: 1 },
        confirmedAmount: {
          $sum: {
            $cond: [{ $eq: ["$status", "confirmed"] }, "$amount", 0]
          }
        }
      }
    }
  ]);
};

// Static method to get undistributed marketplace income
marketplaceIncomeSchema.statics.getUndistributedIncome = function(sellerId) {
  return this.find({
    sellerId,
    status: "confirmed",
    "distributionStatus.isDistributed": false
  }).sort({ soldAt: -1 });
};

export default mongoose.model("MarketplaceIncome", marketplaceIncomeSchema);