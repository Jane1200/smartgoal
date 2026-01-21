import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  reportedItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Marketplace"
  },
  type: {
    type: String,
    enum: ["user", "marketplace_item", "goal", "other"],
    required: true
  },
  category: {
    type: String,
    enum: ["spam", "fraud", "inappropriate", "harassment", "fake", "other"],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "reviewing", "resolved", "dismissed"],
    default: "pending"
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  adminNotes: {
    type: String
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  resolvedAt: {
    type: Date
  },
  resolution: {
    type: String
  }
}, {
  timestamps: true
});

export default mongoose.model("Report", reportSchema);
