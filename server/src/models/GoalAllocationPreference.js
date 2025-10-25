import mongoose from "mongoose";

const goalAllocationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true
    },
    // Distribution ratio between short-term and long-term goals
    shortTermRatio: {
      type: Number,
      min: 0,
      max: 100,
      default: 70 // 70% of wants income goes to short-term goals
    },
    longTermRatio: {
      type: Number,
      min: 0,
      max: 100,
      default: 30 // 30% goes to long-term goals
    },
    // Whether to use automatic or manual allocation
    allocationMode: {
      type: String,
      enum: ["automatic", "manual"],
      default: "automatic"
    },
    // Manual goal-specific allocations
    manualAllocations: [
      {
        goalId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Goal"
        },
        percentage: {
          type: Number,
          min: 0,
          max: 100
        }
      }
    ],
    // Track allocation history for analytics
    allocationHistory: [
      {
        date: { type: Date, default: Date.now },
        wantsIncomeAmount: Number,
        allocations: [
          {
            goalId: mongoose.Schema.Types.ObjectId,
            amount: Number,
            method: String // "automatic" or "manual"
          }
        ]
      }
    ]
  },
  {
    timestamps: true
  }
);

// Validate that short-term + long-term = 100 (for automatic mode)
goalAllocationPreferenceSchema.pre("save", function(next) {
  if (this.allocationMode === "automatic") {
    const total = this.shortTermRatio + this.longTermRatio;
    if (total !== 100) {
      return next(
        new Error(
          "Short-term and long-term ratios must add up to 100% in automatic mode"
        )
      );
    }
  }

  next();
});

// Validate that manual allocations add up to 100 (for manual mode)
goalAllocationPreferenceSchema.pre("save", function(next) {
  if (this.allocationMode === "manual" && this.manualAllocations.length > 0) {
    const total = this.manualAllocations.reduce((sum, alloc) => sum + alloc.percentage, 0);
    if (total !== 100) {
      return next(
        new Error("Manual goal allocations must add up to 100%")
      );
    }
  }

  next();
});

export default mongoose.model("GoalAllocationPreference", goalAllocationPreferenceSchema);