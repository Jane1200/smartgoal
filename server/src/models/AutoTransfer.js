import mongoose from "mongoose";

const autoTransferSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      index: true, 
      required: true 
    },
    goalId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Goal", 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true, 
      min: 1 
    },
    frequency: { 
      type: String, 
      enum: ["monthly", "weekly", "biweekly"], 
      default: "monthly" 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    nextTransferDate: { 
      type: Date, 
      required: true 
    },
    lastTransferDate: { 
      type: Date 
    },
    totalTransferred: { 
      type: Number, 
      default: 0 
    },
    transferCount: { 
      type: Number, 
      default: 0 
    }
  },
  { timestamps: true }
);

// Index for efficient queries
autoTransferSchema.index({ userId: 1, goalId: 1 });
autoTransferSchema.index({ nextTransferDate: 1, isActive: 1 });

export default mongoose.model("AutoTransfer", autoTransferSchema);