import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  action: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ["user", "goal", "marketplace", "report", "system", "auth", "security"],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  targetType: {
    type: String,
    enum: ["User", "Goal", "Marketplace", "Report", "System"]
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for faster queries
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ category: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

export default mongoose.model("ActivityLog", activityLogSchema);
