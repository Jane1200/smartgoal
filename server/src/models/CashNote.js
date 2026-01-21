import mongoose from "mongoose";

const cashNoteSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true 
    },
    type: { 
      type: String, 
      enum: ["income", "expense"], 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true, 
      min: 0 
    },
    description: { 
      type: String, 
      required: true,
      trim: true, 
      maxlength: 500 
    },
    noteDate: { 
      type: Date, 
      required: true,
      default: Date.now 
    },
    isConverted: {
      type: Boolean,
      default: false
    },
    convertedAt: {
      type: Date
    },
    convertedFinanceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Finance"
    }
  },
  { timestamps: true }
);

// Index for efficient queries
cashNoteSchema.index({ userId: 1, isConverted: 1 });
cashNoteSchema.index({ userId: 1, noteDate: 1 });

// FIXED: Add validation to ensure data integrity
cashNoteSchema.pre('save', function(next) {
  // Validate that if converted, must have financeId
  if (this.isConverted && !this.convertedFinanceId) {
    return next(new Error('Converted finance ID is required when cash note is marked as converted'));
  }
  
  // Set convertedAt timestamp when marking as converted
  if (this.isConverted && !this.convertedAt) {
    this.convertedAt = new Date();
  }
  
  next();
});

export default mongoose.model("CashNote", cashNoteSchema);
