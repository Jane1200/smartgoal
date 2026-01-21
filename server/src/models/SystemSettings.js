import mongoose from "mongoose";

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  category: {
    type: String,
    enum: ["general", "features", "email", "notifications", "marketplace", "security"],
    default: "general"
  },
  description: {
    type: String
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, {
  timestamps: true
});

export default mongoose.model("SystemSettings", systemSettingsSchema);
