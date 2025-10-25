import mongoose from "mongoose";

const transferHistorySchema = new mongoose.Schema(
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
    autoTransferId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "AutoTransfer" 
    },
    amount: { 
      type: Number, 
      required: true 
    },
    type: { 
      type: String, 
      enum: ["automated", "manual"], 
      default: "automated" 
    },
    status: { 
      type: String, 
      enum: ["success", "failed", "skipped"], 
      default: "success" 
    },
    reason: { 
      type: String 
    },
    transferDate: { 
      type: Date, 
      default: Date.now 
    }
  },
  { timestamps: true }
);

// Index for efficient queries
transferHistorySchema.index({ userId: 1, transferDate: -1 });
transferHistorySchema.index({ goalId: 1, transferDate: -1 });

export default mongoose.model("TransferHistory", transferHistorySchema);