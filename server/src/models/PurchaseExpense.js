import mongoose from "mongoose";

const purchaseExpenseSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },
    paymentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentPlan",
      default: null
    },
    
    // Total purchase details
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Deduction tracking
    deductionDetails: {
      // For full payment: deduct all at once
      // For EMI: deduct monthly
      // For BNPL: deduct after delivery confirmation
      deductedAmount: {
        type: Number,
        default: 0
      },
      remainingAmount: {
        type: Number,
        required: true
      },
      deductions: [
        {
          amount: Number,
          date: { type: Date, default: Date.now },
          reason: String, // "full_payment", "emi_installment_1", "bnpl_payment", etc.
          installmentNumber: Number,
          status: {
            type: String,
            enum: ["pending", "deducted", "failed"],
            default: "pending"
          }
        }
      ]
    },
    
    // Payment status
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "completed", "failed"],
      default: "pending"
    },
    
    // Link to finance records for audit trail
    financeRecordIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Finance"
      }
    ],
    
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active"
    },
    
    notes: String
  },
  { timestamps: true }
);

// Record a deduction
purchaseExpenseSchema.methods.recordDeduction = async function(
  amount,
  reason,
  installmentNumber = null
) {
  const deduction = {
    amount,
    date: new Date(),
    reason,
    installmentNumber,
    status: "pending"
  };

  this.deductionDetails.deductions.push(deduction);
  this.deductionDetails.deducted_amount += amount;
  this.deductionDetails.remainingAmount -= amount;

  if (this.deductionDetails.remainingAmount <= 0) {
    this.paymentStatus = "completed";
    this.status = "completed";
  } else if (this.deductionDetails.deducted_amount > 0) {
    this.paymentStatus = "partial";
  }

  return this.save();
};

// Get all purchase expenses for a user
purchaseExpenseSchema.statics.getUserPurchaseExpenses = function(
  buyerId,
  filters = {}
) {
  const query = { buyerId };

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = filters.startDate;
    if (filters.endDate) query.createdAt.$lte = filters.endDate;
  }

  return this.find(query)
    .populate("orderId", "orderId items totalAmount")
    .sort({ createdAt: -1 });
};

// Calculate total spent by user
purchaseExpenseSchema.statics.getUserTotalSpent = function(buyerId) {
  return this.aggregate([
    {
      $match: {
        buyerId: mongoose.Types.ObjectId(buyerId),
        status: { $ne: "cancelled" }
      }
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: "$totalAmount" },
        deducted: { $sum: "$deductionDetails.deducted_amount" },
        remaining: { $sum: "$deductionDetails.remainingAmount" }
      }
    }
  ]);
};

export default mongoose.model("PurchaseExpense", purchaseExpenseSchema);