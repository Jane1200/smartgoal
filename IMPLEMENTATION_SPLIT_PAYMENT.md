# Split Payment Implementation - Ready to Use

## 🎯 What is Split Payment?

Pay **50% now, 50% later** (or any custom split like 30%-70%, 40%-60%)
- Lower initial payment than full amount
- Faster than EMI (only 2 payments instead of 3-12)
- More manageable than one-time deduction

---

## Step 1: Update PaymentPlan Model

Add this to `server/src/models/PaymentPlan.js`:

```javascript
// Add to paymentPlanSchema (around line 24, after planType)

    // For Split Payment (NEW)
    splitDetails: {
      immediateAmount: { type: Number, default: null },
      immediatePercent: { type: Number, default: 50 }, // 0-100
      deferredAmount: { type: Number, default: null },
      deferredPercent: { type: Number, default: 50 }, // 0-100
      deferredDueDate: { type: Date, default: null },
      immediatePaid: { type: Boolean, default: false },
      deferredPaid: { type: Boolean, default: false }
    },
```

Update the planType enum (around line 25):
```javascript
planType: {
  type: String,
  enum: ["full", "emi", "bnpl", "split"], // Added "split"
  default: "full"
},
```

Add static method at the end of the file (before `export default`):

```javascript
// Generate Split Payment schedule
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

---

## Step 2: Update Orders Route

Add this to `server/src/routes/orders.js` in the **checkout** route (around line 175, after BNPL handling):

```javascript
    } else if (finalPaymentPlan === "bnpl") {
      // ... existing BNPL code ...
      
    } else if (finalPaymentPlan === "split") {
      // ===== NEW: SPLIT PAYMENT HANDLING =====
      // Split Payment: Pay X% now, rest later
      const splitPercent = req.body.splitPercent || 50; // Default 50%
      const deferredDays = req.body.deferredDays || 30; // Default 30 days

      // Validate split percentage
      if (splitPercent < 10 || splitPercent > 90) {
        return res.status(400).json({ 
          message: "Split percentage must be between 10% and 90%" 
        });
      }

      // Create split payment plan
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
        status: "active",
        notes: `Split payment: ${splitPercent}% now, ${100-splitPercent}% in ${deferredDays} days`
      });

      // Deduct immediate payment
      const financeRecord = await Finance.create({
        userId,
        type: "expense",
        amount: immediateAmount,
        category: "shopping",
        description: `Split Payment (Immediate ${splitPercent}%) - Order ${order.orderId}`,
        date: new Date(),
        tags: ["marketplace", "purchase", "split_immediate"]
      });

      // Update payment plan - mark first installment as paid
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

---

## Step 3: Add Deferred Payment Route

Add this **NEW ROUTE** in `server/src/routes/orders.js` (after the existing EMI and BNPL payment routes, around line 407):

```javascript
// Pay deferred amount for split payment
router.post("/:orderId/pay-split-deferred", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { transactionId, paymentMethod: payMethod } = req.body;

    // Find payment plan
    const paymentPlan = await PaymentPlan.findOne({ orderId, buyerId: userId });
    if (!paymentPlan) {
      return res.status(404).json({ message: "Payment plan not found" });
    }

    if (paymentPlan.planType !== "split") {
      return res.status(400).json({ message: "This order is not a split payment plan" });
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

    // Create Finance record for deferred payment
    const financeRecord = await Finance.create({
      userId,
      type: "expense",
      amount: deferredAmount,
      category: "shopping",
      description: `Split Payment (Deferred ${paymentPlan.splitDetails.deferredPercent}%) - Order ${orderId}`,
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
    res.status(500).json({ 
      message: "Failed to process deferred payment", 
      error: error.message 
    });
  }
});
```

---

## Step 4: Frontend - Checkout Page

Update your checkout page (`client/src/pages/dashboard/BuyerMarketplace.jsx` or wherever checkout is):

```jsx
// Add state for split payment
const [paymentPlan, setPaymentPlan] = useState("full");
const [splitPercent, setSplitPercent] = useState(50);
const [deferredDays, setDeferredDays] = useState(30);

// Payment plan selection UI
<div className="payment-options">
  <label>
    <input 
      type="radio" 
      name="paymentPlan" 
      value="full" 
      checked={paymentPlan === "full"}
      onChange={(e) => setPaymentPlan(e.target.value)}
    />
    <div>
      <strong>Full Payment</strong>
      <p>Pay ₹{totalAmount} now</p>
    </div>
  </label>

  <label>
    <input 
      type="radio" 
      name="paymentPlan" 
      value="emi" 
      checked={paymentPlan === "emi"}
      onChange={(e) => setPaymentPlan(e.target.value)}
    />
    <div>
      <strong>EMI (3 Months)</strong>
      <p>Pay ₹{Math.ceil(totalAmount / 3)}/month</p>
    </div>
  </label>

  <label>
    <input 
      type="radio" 
      name="paymentPlan" 
      value="bnpl" 
      checked={paymentPlan === "bnpl"}
      onChange={(e) => setPaymentPlan(e.target.value)}
    />
    <div>
      <strong>Buy Now Pay Later</strong>
      <p>Pay after delivery (14 days)</p>
    </div>
  </label>

  {/* NEW: Split Payment Option */}
  <label>
    <input 
      type="radio" 
      name="paymentPlan" 
      value="split" 
      checked={paymentPlan === "split"}
      onChange={(e) => setPaymentPlan(e.target.value)}
    />
    <div>
      <strong>Split Payment</strong>
      <p>Pay {splitPercent}% now (₹{Math.ceil(totalAmount * splitPercent / 100)}), 
         {100-splitPercent}% in {deferredDays} days (₹{Math.ceil(totalAmount * (100-splitPercent) / 100)})</p>
    </div>
  </label>

  {/* Split Payment Configuration */}
  {paymentPlan === "split" && (
    <div className="split-config">
      <div>
        <label>Initial Payment %</label>
        <input 
          type="range" 
          min="10" 
          max="90" 
          value={splitPercent}
          onChange={(e) => setSplitPercent(parseInt(e.target.value))}
        />
        <span>{splitPercent}%</span>
      </div>
      <div>
        <label>Pay remaining in</label>
        <select 
          value={deferredDays}
          onChange={(e) => setDeferredDays(parseInt(e.target.value))}
        >
          <option value="15">15 days</option>
          <option value="30">30 days</option>
          <option value="45">45 days</option>
          <option value="60">60 days</option>
        </select>
      </div>
    </div>
  )}
</div>

// Checkout API call
const handleCheckout = async () => {
  try {
    const response = await fetch("/api/orders/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        paymentMethod: selectedPaymentMethod,
        shippingAddress: shippingAddress,
        paymentPlan: paymentPlan,
        emiMonths: emiMonths,
        splitPercent: splitPercent,  // NEW
        deferredDays: deferredDays   // NEW
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      alert("Order placed successfully!");
      navigate("/orders");
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Checkout error:", error);
    alert("Failed to place order");
  }
};
```

---

## Step 5: Frontend - Pay Deferred Amount

Create a component to show pending deferred payments:

```jsx
// SplitPaymentReminder.jsx
import { useState, useEffect } from "react";

const SplitPaymentReminder = () => {
  const [pendingPayments, setPendingPayments] = useState([]);

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      const response = await fetch("/api/orders/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const orders = await response.json();

      // Find orders with pending split payments
      const pending = [];
      for (const order of orders) {
        const paymentPlan = await fetch(`/api/orders/${order._id}/payment-plan`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json());

        if (
          paymentPlan.paymentPlan?.planType === "split" &&
          !paymentPlan.paymentPlan.splitDetails.deferredPaid
        ) {
          pending.push({
            orderId: order._id,
            orderNumber: order.orderId,
            deferredAmount: paymentPlan.paymentPlan.splitDetails.deferredAmount,
            dueDate: paymentPlan.paymentPlan.splitDetails.deferredDueDate
          });
        }
      }

      setPendingPayments(pending);
    } catch (error) {
      console.error("Error fetching pending payments:", error);
    }
  };

  const handlePayDeferred = async (orderId) => {
    if (!confirm("Pay deferred amount now?")) return;

    try {
      const response = await fetch(`/api/orders/${orderId}/pay-split-deferred`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          transactionId: `TXN-${Date.now()}`,
          paymentMethod: "wallet"
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert("Payment successful!");
        fetchPendingPayments(); // Refresh
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment failed");
    }
  };

  return (
    <div className="split-payment-reminder">
      <h3>Pending Split Payments</h3>
      {pendingPayments.length === 0 ? (
        <p>No pending payments</p>
      ) : (
        pendingPayments.map((payment) => (
          <div key={payment.orderId} className="payment-card">
            <div>
              <strong>Order: {payment.orderNumber}</strong>
              <p>Amount Due: ₹{payment.deferredAmount}</p>
              <p>Due Date: {new Date(payment.dueDate).toLocaleDateString()}</p>
            </div>
            <button onClick={() => handlePayDeferred(payment.orderId)}>
              Pay Now
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default SplitPaymentReminder;
```

---

## Step 6: Add CSS (Optional)

```css
/* Split Payment Styles */
.split-config {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
}

.split-config > div {
  margin-bottom: 1rem;
}

.split-config label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.split-config input[type="range"] {
  width: 100%;
}

.split-config span {
  margin-left: 1rem;
  font-weight: bold;
  color: #4CAF50;
}

.split-payment-reminder {
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.payment-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  margin-top: 0.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.payment-card button {
  padding: 0.5rem 1rem;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.payment-card button:hover {
  background: #45a049;
}
```

---

## Testing Guide

### Test 1: Create Split Payment Order

```bash
# POST /api/orders/checkout
{
  "paymentMethod": "upi",
  "shippingAddress": {
    "fullName": "John Doe",
    "phone": "9876543210",
    "addressLine1": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "paymentPlan": "split",
  "splitPercent": 60,
  "deferredDays": 30
}

# Expected Result:
# - PaymentPlan created with type "split"
# - 60% deducted immediately
# - Finance record created (expense)
# - PurchaseExpense shows "partial" payment
```

### Test 2: Pay Deferred Amount

```bash
# POST /api/orders/:orderId/pay-split-deferred
{
  "transactionId": "TXN-123456",
  "paymentMethod": "upi"
}

# Expected Result:
# - Remaining 40% deducted
# - Finance record created (expense)
# - PurchaseExpense shows "completed"
# - PaymentPlan status = "completed"
```

### Test 3: Check Finance Records

```bash
# GET /api/finance
# Expected: 2 expense entries
# 1. split_immediate (60%)
# 2. split_deferred (40%)
```

---

## Summary

✅ **Split Payment Implemented**
- 2 payments instead of 3-12 (faster than EMI)
- Flexible percentage split (10%-90%)
- Customizable deferred period (15-60 days)
- Full integration with Finance tracking
- User-friendly frontend UI

🎯 **Benefits**
- Lower barrier than full payment
- Faster than EMI
- More predictable than BNPL
- Great for mid-range purchases (₹2,000 - ₹20,000)

🔧 **Next Steps**
1. Copy code to respective files
2. Restart server
3. Test checkout with split payment
4. Add reminder notifications (email/SMS)
5. Add auto-deduction option for deferred payment

---

## API Endpoints Created

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orders/checkout` | POST | Create order with split payment |
| `/api/orders/:orderId/pay-split-deferred` | POST | Pay remaining amount |
| `/api/orders/:orderId/payment-plan` | GET | View payment plan details |

---

Ready to use! 🚀


