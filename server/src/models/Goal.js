import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    targetAmount: { type: Number, min: 0 },
    currentAmount: { type: Number, min: 0, default: 0 },
    dueDate: { type: Date },
    status: { type: String, enum: ["planned", "in_progress", "completed", "archived"], default: "planned" },
    category: { 
      type: String, 
      enum: ["emergency_fund", "debt_repayment", "essential_purchase", "education", "investment", "discretionary", "other"], 
      default: "other" 
    },
    priority: { type: Number, min: 1, max: 5, default: 3 }, // 1=Critical, 2=High, 3=Medium, 4=Low, 5=Very Low
    isAutoSuggested: { type: Boolean, default: false }, // Track if goal was auto-suggested
    timePeriod: {
      type: String,
      enum: ["short-term", "long-term"],
      default: "long-term"
    }, // NEW: Track if goal is short-term (0-1 year) or long-term (1+ years)
    wantsIncomeAllocation: {
      type: Number,
      min: 0,
      default: 0
    }, // NEW: Percentage of wants income to allocate to this goal (0-100)
    sourceWishlistId: { type: mongoose.Schema.Types.ObjectId, ref: "Wishlist", default: null } // Link to source wishlist item if created from wishlist
  },
  { timestamps: true }
);

export default mongoose.model("Goal", goalSchema);



