# Additional Payment Options Implementation Guide

## Overview
This guide provides additional flexible payment options beyond Full, EMI, and BNPL.

---

## 1. Split Payment (Part Now, Part Later)

### Use Case
Customer wants to pay 50% now and 50% after 30 days (lower initial burden than full payment, but faster than EMI).

### Database Schema Addition

```javascript
// Add to PaymentPlan schema
splitDetails: {
  immediateAmount: { type: Number, default: null },
  immediatePercent: { type: Number, default: 50 }, // 0-100
  deferredAmount: { type: Number, default: null },
  deferredPercent: { type: Number, default: 50 }, // 0-100
  deferredDueDate: { type: Date, default: null },
  immediatePaid: { type: Boolean, default: false },
  deferredPaid: { type: Boolean, default: false }
}
```

### Create Split Payment Plan

```javascript
// In PaymentPlan.js - Add static method
paymentPlanSchema.statics.createSplitSchedule = function(
  orderId,
  buyerId,
  totalAmount,
  immediatePercent = 50,
  deferredDays = 30
) {
  const immediateAmount = Math.ceil((totalAmount * immediatePercent) / 100);
  const deferredAmount = totalAmount - immediateAmount;
  
  const deferredDueDate = new Date();
  deferredDueDate.setDate(deferredDueDate.getDate() + deferredDays);

  return {
    orderId,
    buyerId,
    totalAmount,
    planType: "split",
    splitDetails: {
      immediateAmount,
      immediatePercent,
      deferredAmount,
      deferredPercent: 100 - immediatePercent,
      deferredDueDate,
      immediatePaid: false,
      deferredPaid: false
    },
    installments: [
      {
        installmentNumber: 1,
        amount: immediateAmount,
        dueDate: new Date(),
        status: "pending"
      },
      {
        installmentNumber: 2,
        amount: deferredAmount,
        dueDate: deferredDueDate,
        status: "pending"
      }
    ],
    pendingAmount: totalAmount,
    totalPaid: 0,
    status: "active"
  };
};
```

### Checkout Implementation

```javascript
// In orders.js checkout route - Add split payment handling
else if (finalPaymentPlan === "split") {
  // Split Payment: 50% now, 50% later
  const splitPercent = req.body.splitPercent || 50;
  const deferredDays = req.body.deferredDays || 30;

  paymentPlanRecord = await PaymentPlan.create(
    PaymentPlan.schema.statics.createSplitSchedule(
      order._id,
      userId,
      cart.totalAmount,
      splitPercent,
      deferredDays
    )
  );

  const immediateAmount = paymentPlanRecord.splitDetails.immediateAmount;

  // Create purchase expense record
  purchaseExpenseRecord = await PurchaseExpense.create({
    buyerId: userId,
    orderId: order._id,
    paymentPlanId: paymentPlanRecord._id,
    totalAmount: cart.totalAmount,
    deductionDetails: {
      deducted_amount: 0,
      remainingAmount: cart.totalAmount,
      deductions: []
    },
    paymentStatus: "pending",
    status: "active"
  });

  // Deduct immediate payment
  const financeRecord = await Finance.create({
    userId,
    type: "expense",
    amount: immediateAmount,
    category: "shopping",
    description: `Split Payment (Immediate) - Order ${order.orderId}`,
    date: new Date(),
    tags: ["marketplace", "purchase", "split_immediate"]
  });

  // Update payment plan
  paymentPlanRecord.installments[0].status = "paid";
  paymentPlanRecord.installments[0].paidDate = new Date();
  paymentPlanRecord.totalPaid = immediateAmount;
  paymentPlanRecord.pendingAmount -= immediateAmount;
  paymentPlanRecord.splitDetails.immediatePaid = true;
  await paymentPlanRecord.save();

  // Update purchase expense
  purchaseExpenseRecord.deductionDetails.deductions.push({
    amount: immediateAmount,
    date: new Date(),
    reason: "split_immediate",
    installmentNumber: 1,
    status: "deducted"
  });
  purchaseExpenseRecord.deductionDetails.deducted_amount = immediateAmount;
  purchaseExpenseRecord.deductionDetails.remainingAmount -= immediateAmount;
  purchaseExpenseRecord.paymentStatus = "partial";
  purchaseExpenseRecord.financeRecordIds.push(financeRecord._id);
  await purchaseExpenseRecord.save();
}
```

### Deferred Payment Collection

```javascript
// In orders.js - Add new route
router.post("/:orderId/pay-split-deferred", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { transactionId, paymentMethod: payMethod } = req.body;

    // Find payment plan
    const paymentPlan = await PaymentPlan.findOne({ orderId, buyerId: userId });
    if (!paymentPlan || paymentPlan.planType !== "split") {
      return res.status(404).json({ message: "Split payment plan not found" });
    }

    if (paymentPlan.splitDetails.deferredPaid) {
      return res.status(400).json({ message: "Deferred payment already completed" });
    }

    const deferredAmount = paymentPlan.splitDetails.deferredAmount;

    // Update installment
    const deferredInstallment = paymentPlan.installments[1];
    deferredInstallment.status = "paid";
    deferredInstallment.paidDate = new Date();
    deferredInstallment.transactionId = transactionId;
    deferredInstallment.paymentMethod = payMethod || "other";

    paymentPlan.totalPaid += deferredAmount;
    paymentPlan.pendingAmount = 0;
    paymentPlan.status = "completed";
    paymentPlan.splitDetails.deferredPaid = true;
    await paymentPlan.save();

    // Create Finance record
    const financeRecord = await Finance.create({
      userId,
      type: "expense",
      amount: deferredAmount,
      category: "shopping",
      description: `Split Payment (Deferred) - Order ${orderId}`,
      date: new Date(),
      tags: ["marketplace", "purchase", "split_deferred"]
    });

    // Update purchase expense
    const purchaseExpense = await PurchaseExpense.findOne({ orderId, buyerId: userId });
    if (purchaseExpense) {
      purchaseExpense.deductionDetails.deductions.push({
        amount: deferredAmount,
        date: new Date(),
        reason: "split_deferred",
        installmentNumber: 2,
        status: "deducted"
      });

      purchaseExpense.deductionDetails.deducted_amount += deferredAmount;
      purchaseExpense.deductionDetails.remainingAmount = 0;
      purchaseExpense.paymentStatus = "completed";
      purchaseExpense.status = "completed";
      purchaseExpense.financeRecordIds.push(financeRecord._id);
      await purchaseExpense.save();
    }

    res.json({
      message: "Deferred payment completed successfully",
      paymentPlan,
      financeRecordId: financeRecord._id
    });
  } catch (error) {
    console.error("Split deferred payment error:", error);
    res.status(500).json({ message: "Failed to process deferred payment" });
  }
});
```

---

## 2. Pay from Marketplace Income (Auto-Deduct from Sales)

### Use Case
User has marketplace income from selling items. Instead of deducting from main balance, deduct from marketplace earnings.

### Database Schema Addition

```javascript
// Add to PaymentPlan schema
marketplaceDeductionDetails: {
  useMarketplaceIncome: { type: Boolean, default: false },
  autoDeduct: { type: Boolean, default: false },
  minBalanceRequired: { type: Number, default: 0 },
  deductionHistory: [
    {
      amount: Number,
      marketplaceIncomeId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketplaceIncome" },
      date: { type: Date, default: Date.now }
    }
  ]
}
```

### Implementation

```javascript
// In orders.js checkout - Add marketplace deduction option
else if (finalPaymentPlan === "marketplace_auto_deduct") {
  // Check if user has enough marketplace income
  const marketplaceIncome = await MarketplaceIncome.aggregate([
    {
      $match: {
        sellerId: mongoose.Types.ObjectId(userId),
        status: "confirmed"
      }
    },
    {
      $group: {
        _id: null,
        totalIncome: { $sum: "$amount" }
      }
    }
  ]);

  const availableIncome = marketplaceIncome[0]?.totalIncome || 0;

  if (availableIncome < cart.totalAmount) {
    return res.status(400).json({ 
      message: `Insufficient marketplace income. Available: ₹${availableIncome}, Required: ₹${cart.totalAmount}` 
    });
  }

  // Create payment plan
  paymentPlanRecord = await PaymentPlan.create({
    orderId: order._id,
    buyerId: userId,
    totalAmount: cart.totalAmount,
    planType: "marketplace_deduct",
    marketplaceDeductionDetails: {
      useMarketplaceIncome: true,
      autoDeduct: true,
      minBalanceRequired: 0,
      deductionHistory: []
    },
    installments: [{
      installmentNumber: 1,
      amount: cart.totalAmount,
      dueDate: new Date(),
      status: "paid",
      paidDate: new Date()
    }],
    totalPaid: cart.totalAmount,
    pendingAmount: 0,
    status: "completed"
  });

  // Create purchase expense
  purchaseExpenseRecord = await PurchaseExpense.create({
    buyerId: userId,
    orderId: order._id,
    paymentPlanId: paymentPlanRecord._id,
    totalAmount: cart.totalAmount,
    deductionDetails: {
      deducted_amount: cart.totalAmount,
      remainingAmount: 0,
      deductions: [{
        amount: cart.totalAmount,
        date: new Date(),
        reason: "marketplace_income_deduction",
        status: "deducted"
      }]
    },
    paymentStatus: "completed",
    status: "completed",
    notes: "Paid from marketplace earnings"
  });

  // Create Finance record (expense from marketplace income)
  const financeRecord = await Finance.create({
    userId,
    type: "expense",
    amount: cart.totalAmount,
    category: "shopping",
    description: `Purchase from Marketplace Income - Order ${order.orderId}`,
    date: new Date(),
    tags: ["marketplace", "purchase", "marketplace_income_deduct"]
  });

  purchaseExpenseRecord.financeRecordIds.push(financeRecord._id);
  await purchaseExpenseRecord.save();
}
```

---

## 3. Layaway Plan (Pay in Parts, Get Item After Full Payment)

### Use Case
User pays in installments but only receives the item after completing all payments. Lower risk for seller.

### Schema Addition

```javascript
// Add to PaymentPlan schema
layawayDetails: {
  isLayaway: { type: Boolean, default: false },
  itemHoldStartDate: Date,
  itemReleaseDate: Date,
  cancellationPolicy: String,
  refundAmount: { type: Number, default: 0 }
}
```

### Order Model Update

```javascript
// Add field to Order schema
deliveryStatus: {
  type: String,
  enum: ["pending", "held_for_layaway", "ready_for_delivery", "delivered"],
  default: "pending"
}
```

### Implementation

```javascript
// In orders.js checkout - Add layaway handling
else if (finalPaymentPlan === "layaway") {
  const months = emiMonths || 3;
  const monthlyAmount = Math.ceil(cart.totalAmount / months);

  paymentPlanRecord = await PaymentPlan.create({
    ...PaymentPlan.schema.statics.createEMISchedule(
      order._id,
      userId,
      cart.totalAmount,
      months,
      0
    ),
    planType: "layaway",
    layawayDetails: {
      isLayaway: true,
      itemHoldStartDate: new Date(),
      itemReleaseDate: null,
      cancellationPolicy: "50% refund if cancelled before completion"
    }
  });

  // Hold the item (don't deliver until full payment)
  order.deliveryStatus = "held_for_layaway";
  await order.save();

  // Create purchase expense
  purchaseExpenseRecord = await PurchaseExpense.create({
    buyerId: userId,
    orderId: order._id,
    paymentPlanId: paymentPlanRecord._id,
    totalAmount: cart.totalAmount,
    deductionDetails: {
      deducted_amount: 0,
      remainingAmount: cart.totalAmount,
      deductions: []
    },
    paymentStatus: "pending",
    status: "active",
    notes: "Layaway plan - Item will be released after full payment"
  });
}

// Add route to handle layaway completion
router.post("/:orderId/complete-layaway", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const paymentPlan = await PaymentPlan.findOne({ orderId, buyerId: userId });
    if (!paymentPlan || paymentPlan.planType !== "layaway") {
      return res.status(404).json({ message: "Layaway plan not found" });
    }

    if (paymentPlan.status !== "completed") {
      return res.status(400).json({ message: "Layaway not yet completed" });
    }

    // Release item for delivery
    const order = await Order.findById(orderId);
    order.deliveryStatus = "ready_for_delivery";
    order.status = "confirmed";
    paymentPlan.layawayDetails.itemReleaseDate = new Date();
    
    await order.save();
    await paymentPlan.save();

    res.json({
      message: "Layaway completed! Item ready for delivery.",
      order,
      paymentPlan
    });
  } catch (error) {
    console.error("Layaway completion error:", error);
    res.status(500).json({ message: "Failed to complete layaway" });
  }
});
```

---

## 4. Flexible Custom Schedule

### Use Case
User wants custom payment schedule: 30% now, 30% in 1 month, 40% in 2 months.

### Schema Addition

```javascript
// Add to PaymentPlan schema
customSchedule: {
  isCustom: { type: Boolean, default: false },
  scheduleApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  approvalDate: Date
}
```

### Implementation

```javascript
// In orders.js checkout - Add custom schedule
else if (finalPaymentPlan === "custom") {
  const { customSchedule } = req.body; // Array: [{ percent: 30, days: 0 }, { percent: 30, days: 30 }, { percent: 40, days: 60 }]

  if (!customSchedule || !Array.isArray(customSchedule)) {
    return res.status(400).json({ message: "Custom schedule is required" });
  }

  const totalPercent = customSchedule.reduce((sum, s) => sum + s.percent, 0);
  if (totalPercent !== 100) {
    return res.status(400).json({ message: "Total percentage must equal 100" });
  }

  const installments = customSchedule.map((schedule, index) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + schedule.days);
    const amount = Math.ceil((cart.totalAmount * schedule.percent) / 100);

    return {
      installmentNumber: index + 1,
      amount,
      dueDate,
      status: "pending"
    };
  });

  paymentPlanRecord = await PaymentPlan.create({
    orderId: order._id,
    buyerId: userId,
    totalAmount: cart.totalAmount,
    planType: "custom",
    customSchedule: {
      isCustom: true,
      scheduleApprovedBy: userId,
      approvalDate: new Date()
    },
    installments,
    pendingAmount: cart.totalAmount,
    totalPaid: 0,
    status: "active"
  });

  // Create purchase expense
  purchaseExpenseRecord = await PurchaseExpense.create({
    buyerId: userId,
    orderId: order._id,
    paymentPlanId: paymentPlanRecord._id,
    totalAmount: cart.totalAmount,
    deductionDetails: {
      deducted_amount: 0,
      remainingAmount: cart.totalAmount,
      deductions: []
    },
    paymentStatus: "pending",
    status: "active",
    notes: "Custom payment schedule"
  });

  // If first installment is immediate (days: 0), process it
  if (customSchedule[0].days === 0) {
    const firstAmount = installments[0].amount;

    const financeRecord = await Finance.create({
      userId,
      type: "expense",
      amount: firstAmount,
      category: "shopping",
      description: `Custom Payment 1/${installments.length} - Order ${order.orderId}`,
      date: new Date(),
      tags: ["marketplace", "purchase", "custom_schedule"]
    });

    paymentPlanRecord.installments[0].status = "paid";
    paymentPlanRecord.installments[0].paidDate = new Date();
    paymentPlanRecord.totalPaid = firstAmount;
    paymentPlanRecord.pendingAmount -= firstAmount;
    await paymentPlanRecord.save();

    purchaseExpenseRecord.deductionDetails.deductions.push({
      amount: firstAmount,
      date: new Date(),
      reason: "custom_installment_1",
      installmentNumber: 1,
      status: "deducted"
    });
    purchaseExpenseRecord.deductionDetails.deducted_amount = firstAmount;
    purchaseExpenseRecord.deductionDetails.remainingAmount -= firstAmount;
    purchaseExpenseRecord.paymentStatus = "partial";
    purchaseExpenseRecord.financeRecordIds.push(financeRecord._id);
    await purchaseExpenseRecord.save();
  }
}
```

---

## Summary Comparison

| Payment Method | Initial Payment | Deduction Timing | Best For |
|---------------|----------------|------------------|----------|
| **Full** | 100% | Immediate | High-trust buyers |
| **EMI** | 0% | Monthly installments | Budget-conscious buyers |
| **BNPL** | 0% | After delivery | New customers building trust |
| **Split** | 50% | 50% now + 50% later | Balanced risk/reward |
| **Marketplace Deduct** | 0% (from sales) | Immediate from earnings | Active sellers |
| **Layaway** | Monthly | After full payment | High-value items |
| **Custom** | Variable | Custom schedule | Flexible arrangements |

---

## Frontend Integration Example

```jsx
// Checkout page - Payment plan selector
<div className="payment-options">
  <label>
    <input type="radio" name="paymentPlan" value="full" />
    Full Payment (Pay ₹{totalAmount} now)
  </label>

  <label>
    <input type="radio" name="paymentPlan" value="emi" />
    EMI - Pay in {emiMonths} months (₹{monthlyAmount}/month)
  </label>

  <label>
    <input type="radio" name="paymentPlan" value="bnpl" />
    Buy Now Pay Later (Pay after delivery)
  </label>

  <label>
    <input type="radio" name="paymentPlan" value="split" />
    Split Payment (₹{totalAmount / 2} now + ₹{totalAmount / 2} in 30 days)
  </label>

  {hasMarketplaceIncome && (
    <label>
      <input type="radio" name="paymentPlan" value="marketplace_auto_deduct" />
      Pay from Marketplace Earnings (Available: ₹{marketplaceBalance})
    </label>
  )}

  <label>
    <input type="radio" name="paymentPlan" value="layaway" />
    Layaway Plan (Pay in installments, get item after completion)
  </label>

  <label>
    <input type="radio" name="paymentPlan" value="custom" />
    Custom Schedule (Create your own payment plan)
  </label>
</div>
```

---

## Testing Checklist

- [ ] Full payment: Immediate deduction works
- [ ] EMI: Monthly deductions create Finance records
- [ ] BNPL: Deduction only after delivery
- [ ] Split: 50% now + 50% later deduction
- [ ] Marketplace deduct: Uses seller income
- [ ] Layaway: Item held until full payment
- [ ] Custom: Flexible schedule works
- [ ] Dual role: Same user can sell (income ↑) and buy (income ↓)

---

## Next Steps

1. **Choose which additional payment methods to implement**
2. **Update PaymentPlan schema** with new payment types
3. **Add routes for new payment flows**
4. **Update frontend** with payment selection UI
5. **Test thoroughly** with different scenarios
6. **Add payment reminders** (email/SMS for due payments)
7. **Implement refund logic** for cancellations

Let me know which payment method you'd like to implement first! 🚀


