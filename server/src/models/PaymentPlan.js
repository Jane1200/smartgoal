import mongoose from "mongoose";

const paymentPlanSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Payment type: 'full' (pay now), 'emi', 'bnpl'
    planType: {
      type: String,
      enum: ["full", "emi", "bnpl"],
      default: "full"
    },
    
    // For EMI
    emiDetails: {
      numberOfMonths: { type: Number, default: null },
      monthlyAmount: { type: Number, default: null },
      interestRate: { type: Number, default: 0 }, // 0-12% range
      startDate: { type: Date, default: null }
    },
    
    // For BNPL (Buy Now Pay Later)
    bnplDetails: {
      paymentDueDate: { type: Date, default: null }, // Usually 7-14 days after delivery
      deliveryDate: { type: Date, default: null }
    },
    
    // Payment schedule and tracking
    installments: [
      {
        installmentNumber: Number,
        amount: Number,
        dueDate: Date,
        paidDate: { type: Date, default: null },
        status: {
          type: String,
          enum: ["pending", "paid", "failed", "overdue"],
          default: "pending"
        },
        paymentMethod: String,
        transactionId: String
      }
    ],
    
    // Tracking
    totalPaid: {
      type: Number,
      default: 0
    },
    pendingAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["active", "completed", "failed", "cancelled"],
      default: "active"
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Calculate next due installment
paymentPlanSchema.methods.getNextDueInstallment = function() {
  return this.installments.find(inst => inst.status === "pending");
};

// Record payment for installment
paymentPlanSchema.methods.recordInstallmentPayment = async function(
  installmentNumber,
  transactionId,
  paymentMethod
) {
  const installment = this.installments.find(
    inst => inst.installmentNumber === installmentNumber
  );

  if (!installment) {
    throw new Error("Installment not found");
  }

  installment.status = "paid";
  installment.paidDate = new Date();
  installment.transactionId = transactionId;
  installment.paymentMethod = paymentMethod;

  this.totalPaid += installment.amount;
  this.pendingAmount -= installment.amount;

  if (this.pendingAmount <= 0) {
    this.status = "completed";
  }

  return this.save();
};

// Generate installment schedule for EMI
paymentPlanSchema.statics.createEMISchedule = function(
  orderId,
  buyerId,
  totalAmount,
  numberOfMonths = 3,
  interestRate = 0
) {
  const monthlyAmount = Math.ceil(
    (totalAmount * (1 + interestRate / 100)) / numberOfMonths
  );

  const installments = [];
  const startDate = new Date();

  for (let i = 1; i <= numberOfMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    installments.push({
      installmentNumber: i,
      amount: monthlyAmount,
      dueDate,
      status: "pending"
    });
  }

  return {
    orderId,
    buyerId,
    totalAmount,
    planType: "emi",
    emiDetails: {
      numberOfMonths,
      monthlyAmount,
      interestRate,
      startDate
    },
    installments,
    pendingAmount: totalAmount,
    totalPaid: 0,
    status: "active"
  };
};

// Generate BNPL schedule
paymentPlanSchema.statics.createBNPLSchedule = function(
  orderId,
  buyerId,
  totalAmount,
  deliveryDate
) {
  const paymentDueDate = new Date(deliveryDate);
  paymentDueDate.setDate(paymentDueDate.getDate() + 14); // Pay 14 days after delivery

  return {
    orderId,
    buyerId,
    totalAmount,
    planType: "bnpl",
    bnplDetails: {
      paymentDueDate,
      deliveryDate
    },
    installments: [
      {
        installmentNumber: 1,
        amount: totalAmount,
        dueDate: paymentDueDate,
        status: "pending"
      }
    ],
    pendingAmount: totalAmount,
    totalPaid: 0,
    status: "active"
  };
};

export default mongoose.model("PaymentPlan", paymentPlanSchema);