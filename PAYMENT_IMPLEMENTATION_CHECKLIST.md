# Payment Implementation Checklist

## Phase 1: Core Setup ✅

### Backend Models
- [x] PaymentPlan.js - Created
- [x] PurchaseExpense.js - Created
- [x] Order.js - Already exists (may need tweaks)
- [x] Finance.js - Already exists

### Database Updates Needed
```bash
# Run these migrations:
db.paymentplans.createIndex({ orderId: 1 })
db.paymentplans.createIndex({ buyerId: 1 })
db.purchaseexpenses.createIndex({ buyerId: 1 })
db.purchaseexpenses.createIndex({ orderId: 1 })
```

---

## Phase 2: Backend Routes

### Routes to Create/Update

#### 1. Update: POST /orders/checkout
**Location:** `server/src/routes/orders.js`

```javascript
// ADD these parameters to existing route
{
  paymentPlanType: "full|emi|bnpl",  // NEW
  emiMonths: 3|6|12,                 // NEW (if EMI)
  // existing: paymentMethod, shippingAddress
}

// CHANGES NEEDED:
1. Import new models:
   - const PaymentPlan = require('../models/PaymentPlan');
   - const PurchaseExpense = require('../models/PurchaseExpense');

2. After order creation:
   - Create PaymentPlan based on planType
   - Create PurchaseExpense tracker
   - Trigger income deduction logic

3. Return response with:
   - order
   - paymentPlan
   - purchaseExpense
```

#### 2. New: POST /orders/:orderId/pay-installment
**Location:** `server/src/routes/orders.js`

```javascript
// When user pays EMI installment
router.post('/:orderId/pay-installment', auth, async (req, res) => {
  // installmentNumber, transactionId, paymentMethod
  // Record payment in PaymentPlan
  // Create Finance expense entry
  // Update PurchaseExpense
})
```

#### 3. Update: PATCH /orders/:orderId/delivered
**Location:** `server/src/routes/orders.js`

```javascript
// When order marked as delivered
// If BNPL: trigger income deduction
```

#### 4. New: GET /purchase-history
**Location:** `server/src/routes/users.js` or `orders.js`

```javascript
// Get user's purchase expenses
// Show pending EMIs, BNPL status, etc.
router.get('/purchase-history', auth, async (req, res) => {
  const expenses = await PurchaseExpense.getUserPurchaseExpenses(
    req.user.id,
    { startDate, endDate } // query params
  );
  res.json(expenses);
})
```

#### 5. New: GET /payment-plans/:planId
**Location:** `server/src/routes/orders.js`

```javascript
// Get detailed payment plan info
router.get('/payment-plans/:planId', auth, async (req, res) => {
  const plan = await PaymentPlan.findById(req.params.planId);
  res.json(plan);
})
```

---

## Phase 3: Frontend Components

### Files to Update/Create

#### 1. Update: client/src/pages/dashboard/Checkout.jsx
```
Current state:
- paymentMethod (cod, upi, card, netbanking)

ADD:
- paymentPlanType (full, emi, bnpl)
- emiMonths (3, 6, 12)

ADD UI SECTION:
- "Payment Plan" card above "Payment Method"
- Show 3 options with descriptions
- EMI: Show monthly amounts
- BNPL: Show payment due date

UPDATE handlePlaceOrder():
- Send paymentPlanType and emiMonths
```

#### 2. Create: client/src/components/PaymentPlanSelector.jsx
```jsx
export default function PaymentPlanSelector({
  totalAmount,
  selectedPlan,
  emiMonths,
  onPlanChange,
  onEmiMonthsChange
}) {
  // Renders radio buttons for Full/EMI/BNPL
  // Shows EMI breakdown
  // Shows BNPL terms
}
```

#### 3. Create: client/src/components/EMICalculator.jsx
```jsx
export default function EMICalculator({ amount, months, interestRate = 0 }) {
  // Calculates and displays:
  // - Monthly payment
  // - Total interest
  // - Payment schedule
}
```

#### 4. Update: client/src/pages/dashboard/Orders.jsx
```
ADD:
- Payment status column
- Payment plan type badge
- "View Payment Plan" button
- For pending EMIs: show next due date & amount
```

#### 5. Create: client/src/pages/dashboard/MyPayments.jsx
```jsx
// New page showing:
// - All active payment plans
// - EMI schedule with paid/pending status
// - BNPL payment status
// - Pay EMI button
// - Payment history
```

#### 6. Update: client/src/pages/dashboard/Finances.jsx
```
ADD:
- New "Purchases" section
- Show total spent
- Show pending EMI commitments
- Calculate available balance considering future EMIs
```

---

## Phase 4: API Integration

### Update: client/src/utils/api.js

```javascript
// NEW endpoints to add:

// Checkout with payment plan
export const checkoutWithPaymentPlan = (data) => 
  api.post('/orders/checkout', data);

// Pay EMI installment
export const payEMIInstallment = (orderId, data) => 
  api.post(`/orders/${orderId}/pay-installment`, data);

// Get purchase expenses
export const getPurchaseHistory = (filters) => 
  api.get('/purchase-history', { params: filters });

// Get payment plan details
export const getPaymentPlan = (planId) => 
  api.get(`/payment-plans/${planId}`);

// Get pending EMIs
export const getPendingEMIs = () => 
  api.get('/payment-plans/pending');
```

---

## Phase 5: Frontend UI Updates

### Checkout Page Changes

```jsx
// Before:
Payment Method
├─ COD
├─ UPI
├─ Card
└─ Net Banking

// After:
Payment Plan
├─ Full Payment (Pay now)
├─ EMI (3/6/12 months)
└─ BNPL (Pay after delivery)
    │
    └─ [When selected: show calculator]

Payment Method (existing)
├─ COD
└─ UPI
    │
    └─ [For online payments]
```

### Orders Page Changes

```
Order List
├─ Order ID
├─ Items
├─ Amount
├─ Status
├─ Payment Type          [NEW]
├─ Payment Status        [NEW]
└─ Action Buttons

For EMI orders:
├─ "View Payment Plan" button
├─ Shows: Installment 2/3, Due: 15 Jan, Amount: ₹400
└─ "Pay Now" button
```

### New Payments Dashboard Page

```
My Payments

Active EMIs
├─ Order ORD-123
│  ├─ Total: ₹1200
│  ├─ Progress: 1/3 paid
│  ├─ Next Due: ₹400 on 15 Jan
│  └─ [Pay Now]
│
├─ Order ORD-456
│  ├─ Total: ₹2000
│  ├─ Progress: 2/4 paid
│  ├─ Next Due: ₹500 on 20 Jan
│  └─ [Pay Now]

BNPL Status
├─ Order ORD-789
│  ├─ Amount: ₹800
│  ├─ Status: Delivered, Pay by 25 Jan
│  └─ [Pay Now]

Recent Payments
├─ Order ORD-123 | ₹400 | Paid on 15 Dec | EMI #1
├─ Order ORD-456 | ₹500 | Paid on 10 Dec | EMI #2
└─ Order ORD-001 | ₹1500 | Paid on 05 Dec | Full Payment
```

---

## Phase 6: Notifications & Reminders

### Email Notifications

```javascript
// EMI Due Reminder (5 days before due date)
Subject: "Your EMI payment of ₹400 is due on 15 Jan"
Body: "Order ORD-123, Next payment: ₹400"

// BNPL Payment Reminder (3 days before due date)
Subject: "Your BNPL payment of ₹800 is due on 25 Jan"
Body: "Order ORD-789, Item: [Item Name]"

// Overdue Payment Alert (on due date)
Subject: "Your payment of ₹400 is now overdue"
Body: "Please pay immediately to avoid late charges"

// Payment Confirmation
Subject: "Payment confirmed for ₹400"
Body: "EMI 2/3 paid, Next due: 15 Feb"
```

### In-App Notifications

```javascript
// Toast notifications on:
1. Order placed with EMI/BNPL
2. EMI payment successful
3. Upcoming EMI due (1 week before)
4. Overdue payment (1 day after)
5. BNPL payment received
```

---

## Phase 7: Testing

### Test Cases

#### Full Payment Flow
- [ ] User buys ₹1000 item with full payment
- [ ] Finance record created immediately
- [ ] Balance deducted by ₹1000
- [ ] Order status: confirmed

#### EMI Flow (3 months)
- [ ] User buys ₹1000 item with EMI
- [ ] PaymentPlan created with 3 installments
- [ ] Finance records NOT created yet
- [ ] Balance remains unchanged
- [ ] Next due date shown correctly
- [ ] User pays installment 1
- [ ] Finance record created for ₹333.33
- [ ] Balance deducted by ₹333.33
- [ ] Payment plan updated (partial)
- [ ] User pays installment 2
- [ ] Finance record created for ₹333.33
- [ ] Balance deducted by ₹333.33
- [ ] User pays installment 3
- [ ] Finance record created for ₹333.34
- [ ] Balance deducted by ₹333.34
- [ ] Payment plan marked completed

#### BNPL Flow
- [ ] User buys ₹1000 item with BNPL
- [ ] PaymentPlan created (1 installment)
- [ ] Finance records NOT created
- [ ] Order delivered
- [ ] Payment due date notification sent
- [ ] User payment not yet made
- [ ] Balance unchanged
- [ ] User makes payment after delivery
- [ ] Finance record created
- [ ] Balance deducted by ₹1000

#### Mixed Scenario (Seller + Buyer)
- [ ] User sells item for ₹2000
- [ ] Finance: +₹2000 (income)
- [ ] Balance: ₹7000 → ₹9000
- [ ] User buys item for ₹500 (full)
- [ ] Finance: -₹500 (expense)
- [ ] Balance: ₹9000 → ₹8500
- [ ] User buys item for ₹600 (EMI)
- [ ] Balance: ₹8500 (unchanged, EMI pending)

---

## Phase 8: Admin Features

### Admin Payments Dashboard

```
User Payment Statistics
├─ Total EMIs Active: ₹50,000
├─ Total BNPL Active: ₹30,000
├─ Overdue Payments: ₹5,000
├─ Default Rate: 2.3%

User EMI Details
├─ User: John Doe
├─ Total EMI: ₹10,000
├─ Paid: ₹3,333
├─ Pending: ₹6,667
├─ Next Due: 15 Jan
└─ Action: [View] [Adjust] [Forgive]
```

---

## Rollout Strategy

### Week 1: Backend
- [ ] Create models
- [ ] Create API routes
- [ ] Database migrations
- [ ] Basic testing

### Week 2: Frontend
- [ ] Update Checkout page
- [ ] Create Payment Plan Selector
- [ ] Create My Payments page
- [ ] Update Orders page

### Week 3: Polish
- [ ] Add notifications
- [ ] Add reminders
- [ ] Admin dashboard
- [ ] User testing

### Week 4: Launch
- [ ] Beta to 10% users
- [ ] Monitor issues
- [ ] Full rollout
- [ ] Documentation

---

## Quick Start Commands

```bash
# Add models to existing setup
cp PaymentPlan.js server/src/models/
cp PurchaseExpense.js server/src/models/

# Update routes
# Edit server/src/routes/orders.js (add checkout params)

# Create frontend components
mkdir -p client/src/components/PaymentComponents
# Add PaymentPlanSelector.jsx, EMICalculator.jsx

# Update checkout
# Edit client/src/pages/dashboard/Checkout.jsx

# Create new page
# Create client/src/pages/dashboard/MyPayments.jsx
```

---

## Common Issues & Solutions

### Issue: EMI calculation shows wrong amount
**Solution:** Check interestRate parameter, ensure Math.ceil() is used

### Issue: Finance records not created
**Solution:** Ensure Finance model import, check buyerId is valid ObjectId

### Issue: BNPL payment not deducted
**Solution:** Check order delivery status is updated before deduction logic

### Issue: User's balance goes negative
**Solution:** Add balance check before purchase, or allow negative (debt system)

---

## Success Metrics

- [ ] 30% orders using EMI within 2 weeks
- [ ] 15% orders using BNPL within 2 weeks
- [ ] <1% payment failures
- [ ] <5% missed EMI payments
- [ ] Average EMI completion rate >95%