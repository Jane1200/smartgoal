# Payment Plans & Income Deduction Implementation Guide

## Overview
This guide implements multiple payment options (Full, EMI, BNPL) and tracks income deduction when a user makes purchases.

## Key Concepts

### 1. Income Flow
```
SELLER SIDE: Marketplace → Income ↑ (added to Finance)
BUYER SIDE: Purchase → Income ↓ (deducted from Finance)
```

### 2. Payment Models

#### A) Full Payment (Default)
- User pays 100% upfront
- Income deducted immediately when order is placed
- Payment status: "pending" → "completed"

#### B) EMI (Equated Monthly Installments)
- User pays over 3/6/12 months
- Income deducted monthly as each installment is paid
- Each month: Income ↓ by (totalAmount / months)
- Example: ₹1200 → 3 EMIs of ₹400/month

#### C) BNPL (Buy Now Pay Later)
- User receives item first
- Pays after delivery (typically 7-14 days)
- Income deducted only after delivery confirmation
- Incentivizes purchase without immediate payment

---

## Database Models

### PaymentPlan Schema
```javascript
{
  orderId: ObjectId,
  buyerId: ObjectId,
  totalAmount: Number,
  planType: "full" | "emi" | "bnpl",
  
  emiDetails: {
    numberOfMonths: 3 | 6 | 12,
    monthlyAmount: Number,
    interestRate: 0-12,
    startDate: Date
  },
  
  bnplDetails: {
    paymentDueDate: Date,
    deliveryDate: Date
  },
  
  installments: [
    {
      installmentNumber: 1,
      amount: 400,
      dueDate: Date,
      paidDate: Date,
      status: "pending" | "paid" | "overdue" | "failed"
    }
  ]
}
```

### PurchaseExpense Schema
```javascript
{
  buyerId: ObjectId,
  orderId: ObjectId,
  totalAmount: Number,
  
  deductionDetails: {
    deducted_amount: 0,
    remainingAmount: 1200,
    deductions: [
      {
        amount: 400,
        date: Date,
        reason: "emi_installment_1",
        status: "pending" | "deducted" | "failed"
      }
    ]
  },
  
  paymentStatus: "pending" | "partial" | "completed",
  financeRecordIds: [ObjectId] // Links to Finance entries
}
```

---

## Implementation Flow

### Step 1: Backend - Checkout Endpoint

```javascript
// server/src/routes/orders.js
import Order from "../models/Order.js";
import PaymentPlan from "../models/PaymentPlan.js";
import PurchaseExpense from "../models/PurchaseExpense.js";
import Finance from "../models/Finance.js";

router.post("/checkout", authenticateToken, async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { paymentMethod, shippingAddress, paymentPlanType = "full", emiMonths = 3 } = req.body;

    // 1. Get cart
    const cart = await Cart.findOne({ buyerId }).populate("items.marketplaceItemId");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // 2. Create order
    const order = await Order.createFromCart(buyerId, cart, paymentMethod, shippingAddress);

    // 3. Create payment plan
    let paymentPlan;
    if (paymentPlanType === "emi") {
      const planData = PaymentPlan.createEMISchedule(
        order._id,
        buyerId,
        cart.totalAmount,
        emiMonths,
        2 // 2% interest rate
      );
      paymentPlan = await PaymentPlan.create(planData);
    } else if (paymentPlanType === "bnpl") {
      const estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7); // 7 days
      
      const planData = PaymentPlan.createBNPLSchedule(
        order._id,
        buyerId,
        cart.totalAmount,
        estimatedDeliveryDate
      );
      paymentPlan = await PaymentPlan.create(planData);
    } else {
      // Full payment
      paymentPlan = await PaymentPlan.create({
        orderId: order._id,
        buyerId,
        totalAmount: cart.totalAmount,
        planType: "full",
        installments: [{
          installmentNumber: 1,
          amount: cart.totalAmount,
          dueDate: new Date(),
          status: "pending"
        }],
        pendingAmount: cart.totalAmount
      });
    }

    // 4. Create purchase expense tracker
    const purchaseExpense = await PurchaseExpense.create({
      buyerId,
      orderId: order._id,
      paymentPlanId: paymentPlan._id,
      totalAmount: cart.totalAmount,
      deductionDetails: {
        remainingAmount: cart.totalAmount,
        deductions: paymentPlan.installments.map((inst, idx) => ({
          amount: inst.amount,
          reason: paymentPlanType === "emi" 
            ? `emi_installment_${inst.installmentNumber}`
            : paymentPlanType === "bnpl" 
            ? "bnpl_payment"
            : "full_payment",
          installmentNumber: inst.installmentNumber,
          status: "pending"
        }))
      },
      financeRecordIds: []
    });

    // 5. Handle income deduction based on plan type
    let financeRecords = [];
    
    if (paymentPlanType === "full") {
      // Deduct full amount immediately
      const financeRecord = await Finance.create({
        userId: buyerId,
        type: "expense",
        amount: cart.totalAmount,
        category: "shopping",
        description: `Marketplace purchase - Order ${order.orderId}`,
        date: new Date(),
        tags: ["marketplace", "purchase"]
      });
      financeRecords.push(financeRecord._id);
      
      await purchaseExpense.deductionDetails.deductions[0].status = "deducted";
      purchaseExpense.deductionDetails.deducted_amount = cart.totalAmount;
      purchaseExpense.deductionDetails.remainingAmount = 0;
      purchaseExpense.paymentStatus = "completed";
      purchaseExpense.financeRecordIds = financeRecords;
      await purchaseExpense.save();
    } 
    else if (paymentPlanType === "emi") {
      // For EMI, create deductions for each installment (will be triggered when paid)
      // Schedule background jobs to deduct on due dates
      for (let i = 0; i < paymentPlan.installments.length; i++) {
        await scheduleEMIDeduction(buyerId, purchaseExpense._id, i, paymentPlan.installments[i]);
      }
    } 
    else if (paymentPlanType === "bnpl") {
      // For BNPL, deduction happens after delivery confirmation
      // Store the pending deduction to be triggered on delivery
      purchaseExpense.financeRecordIds = [];
      await purchaseExpense.save();
    }

    // 6. Clear cart
    await Cart.findByIdAndDelete(cart._id);

    // 7. Send response
    res.json({
      order,
      paymentPlan,
      purchaseExpense,
      message: `Order created successfully with ${paymentPlanType.toUpperCase()} payment plan`
    });

  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: error.message });
  }
});
```

### Step 2: Handle EMI Installment Payment

```javascript
// When buyer makes EMI payment
router.post("/orders/:orderId/pay-installment", authenticateToken, async (req, res) => {
  try {
    const { installmentNumber, transactionId, paymentMethod } = req.body;
    const buyerId = req.user.id;

    // Get payment plan
    const paymentPlan = await PaymentPlan.findOne({ orderId: req.params.orderId });
    if (!paymentPlan) {
      return res.status(404).json({ error: "Payment plan not found" });
    }

    // Record installment payment
    await paymentPlan.recordInstallmentPayment(
      installmentNumber,
      transactionId,
      paymentMethod
    );

    // Create Finance expense entry for this installment
    const installment = paymentPlan.installments[installmentNumber - 1];
    const financeRecord = await Finance.create({
      userId: buyerId,
      type: "expense",
      amount: installment.amount,
      category: "shopping",
      description: `Marketplace EMI Payment - Installment ${installmentNumber}/${paymentPlan.emiDetails.numberOfMonths}`,
      date: new Date(),
      tags: ["marketplace", "emi", `installment_${installmentNumber}`]
    });

    // Update purchase expense
    const purchaseExpense = await PurchaseExpense.findOne({
      orderId: req.params.orderId,
      buyerId
    });

    purchaseExpense.deductionDetails.deductions[installmentNumber - 1].status = "deducted";
    purchaseExpense.deductionDetails.deducted_amount += installment.amount;
    purchaseExpense.deductionDetails.remainingAmount -= installment.amount;
    purchaseExpense.financeRecordIds.push(financeRecord._id);
    
    if (paymentPlan.status === "completed") {
      purchaseExpense.paymentStatus = "completed";
      purchaseExpense.status = "completed";
    }
    
    await purchaseExpense.save();

    res.json({
      message: "Installment payment recorded",
      paymentPlan,
      purchaseExpense
    });

  } catch (error) {
    console.error("Installment payment error:", error);
    res.status(500).json({ error: error.message });
  }
});
```

### Step 3: Handle BNPL Payment (After Delivery)

```javascript
// Triggered when order is marked as delivered
router.patch("/orders/:orderId/delivered", authenticateToken, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status: "delivered", deliveryDate: new Date() },
      { new: true }
    );

    // If BNPL, deduct income now
    const paymentPlan = await PaymentPlan.findOne({ orderId: order._id });
    if (paymentPlan && paymentPlan.planType === "bnpl") {
      
      const buyerId = order.buyerId;
      
      // Create Finance expense entry
      const financeRecord = await Finance.create({
        userId: buyerId,
        type: "expense",
        amount: order.totalAmount,
        category: "shopping",
        description: `Marketplace BNPL Payment - Order ${order.orderId}`,
        date: new Date(),
        tags: ["marketplace", "bnpl", "delivered"]
      });

      // Update purchase expense
      const purchaseExpense = await PurchaseExpense.findOne({
        orderId: order._id,
        buyerId
      });

      purchaseExpense.deductionDetails.deductions[0].status = "deducted";
      purchaseExpense.deductionDetails.deducted_amount = order.totalAmount;
      purchaseExpense.deductionDetails.remainingAmount = 0;
      purchaseExpense.paymentStatus = "completed";
      purchaseExpense.financeRecordIds.push(financeRecord._id);
      await purchaseExpense.save();
    }

    res.json({ order, message: "Order marked as delivered and payment deducted" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Frontend Implementation

### Step 1: Update Checkout.jsx

Add payment plan selection:

```jsx
const [paymentPlanType, setPaymentPlanType] = useState('full');
const [emiMonths, setEmiMonths] = useState(3);

const handlePlaceOrder = async () => {
  if (!validateForm()) return;

  setProcessing(true);
  try {
    const { data } = await api.post('/orders/checkout', {
      paymentMethod,
      shippingAddress,
      paymentPlanType,
      emiMonths: paymentPlanType === 'emi' ? emiMonths : null
    });

    toast.success('Order placed successfully!');
    
    if (paymentMethod !== 'cod' && paymentPlanType === 'full') {
      navigate(`/payment/${data.order._id}`);
    } else {
      navigate('/orders');
    }
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to place order');
  } finally {
    setProcessing(false);
  }
};
```

Add payment plan selection UI:

```jsx
<div className="card mb-4">
  <div className="card-header">
    <h6 className="card-title mb-0">Payment Plan</h6>
  </div>
  <div className="card-body">
    <div className="form-check mb-3">
      <input 
        className="form-check-input" 
        type="radio" 
        name="paymentPlan" 
        id="paymentFull"
        value="full"
        checked={paymentPlanType === 'full'}
        onChange={(e) => setPaymentPlanType(e.target.value)}
      />
      <label className="form-check-label" htmlFor="paymentFull">
        <strong>Pay Now (Full Amount)</strong>
        <p className="text-muted small mb-0">Pay ₹{cart?.totalAmount} today</p>
      </label>
    </div>

    <div className="form-check mb-3">
      <input 
        className="form-check-input" 
        type="radio" 
        name="paymentPlan" 
        id="paymentEmi"
        value="emi"
        checked={paymentPlanType === 'emi'}
        onChange={(e) => setPaymentPlanType(e.target.value)}
      />
      <label className="form-check-label" htmlFor="paymentEmi">
        <strong>EMI (0% Interest)</strong>
        <p className="text-muted small mb-0">Pay in installments</p>
        {paymentPlanType === 'emi' && (
          <select 
            className="form-select form-select-sm mt-2"
            value={emiMonths}
            onChange={(e) => setEmiMonths(parseInt(e.target.value))}
          >
            <option value={3}>3 months - ₹{Math.ceil(cart?.totalAmount / 3)} x 3</option>
            <option value={6}>6 months - ₹{Math.ceil(cart?.totalAmount / 6)} x 6</option>
            <option value={12}>12 months - ₹{Math.ceil(cart?.totalAmount / 12)} x 12</option>
          </select>
        )}
      </label>
    </div>

    <div className="form-check">
      <input 
        className="form-check-input" 
        type="radio" 
        name="paymentPlan" 
        id="paymentBnpl"
        value="bnpl"
        checked={paymentPlanType === 'bnpl'}
        onChange={(e) => setPaymentPlanType(e.target.value)}
      />
      <label className="form-check-label" htmlFor="paymentBnpl">
        <strong>Buy Now, Pay Later</strong>
        <p className="text-muted small mb-0">Pay after delivery (14 days)</p>
      </label>
    </div>
  </div>
</div>
```

---

## Income Impact Summary

### User as Seller
```
Action: List item and sell
Result: Income ↑ (added to Finance)
Timing: Immediate (or after delivery confirmation)
```

### User as Buyer - Full Payment
```
Action: Purchase with full payment
Result: Income ↓ (deducted from Finance)
Timing: Immediately
```

### User as Buyer - EMI
```
Action: Purchase with 3-month EMI
Result: Income ↓ progressively
Timing: Monthly (1st month ↓ ₹400, 2nd month ↓ ₹400, 3rd month ↓ ₹400)
```

### User as Buyer - BNPL
```
Action: Purchase with BNPL
Result: Income stays same initially, then ↓ after delivery
Timing: After delivery confirmation (usually 7-14 days)
```

---

## Additional Features to Implement

### 1. Dashboard Widget
Show current spending vs income:
```
Income This Month: ₹5,000 (from sales)
Expenses This Month: ₹2,000 (from purchases)
Net: ₹3,000
EMI Pending: ₹1,200 (next month)
```

### 2. Payment Reminders
Send notifications for:
- EMI due dates
- BNPL payment deadline
- Overdue payments

### 3. Reports
Monthly reports showing:
- Total sold
- Total purchased
- Net income
- EMI vs full payment usage

---

## Testing Checklist

- [ ] User sells item → Income increases
- [ ] User buys with full payment → Income decreases immediately
- [ ] User buys with 3-month EMI → Finance shows monthly deductions
- [ ] User buys with BNPL → Income deducted after delivery
- [ ] Finance records show detailed breakdown
- [ ] User dashboard shows correct balance
- [ ] EMI payment reminders work
- [ ] Overdue EMI handling