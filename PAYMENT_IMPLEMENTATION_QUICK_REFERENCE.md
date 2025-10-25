# Payment Models - Quick Reference

## Three Payment Options at Checkout

### 1️⃣ Full Payment (Pay Now)
```
User chooses: "Full Payment"
Amount: Pay ₹X now
Income deduction: Immediately
Finance record: Created right away
Timeline: 0 days
```

**What happens:**
```
1. User clicks checkout → selects "Full Payment"
2. API: POST /orders/checkout with paymentPlan="full"
3. Backend creates:
   - Order (status="confirmed")
   - PaymentPlan (status="completed", totalPaid=amount)
   - PurchaseExpense (status="completed")
   - Finance record (type="expense")
4. User's income: -₹X immediately
```

---

### 2️⃣ EMI - Easy Monthly Installments
```
User chooses: "EMI" + duration (3, 6, or 12 months)
Amount: ₹(X/months) per month
Income deduction: Monthly with each payment
Finance record: Created for each payment
Timeline: Spread over months
```

**What happens:**
```
1. User clicks checkout → selects "EMI" → chooses "3 Months"
2. API: POST /orders/checkout with paymentPlan="emi", emiMonths=3
3. Backend creates:
   - Order (status="confirmed")
   - PaymentPlan (status="active", 3 installments created)
   - PurchaseExpense (status="active", deducted_amount=0)
   - NO Finance record yet
4. User's income: No change yet

5. Month 1: User pays first installment
   API: POST /orders/{orderId}/pay-emi-installment
         with installmentNumber=1
   - PaymentPlan: installment 1 marked as "paid"
   - Finance record created for ₹(X/3)
   - User's income: -₹(X/3)

6. Month 2: User pays second installment
   API: POST /orders/{orderId}/pay-emi-installment
         with installmentNumber=2
   - PaymentPlan: installment 2 marked as "paid"
   - Finance record created for ₹(X/3)
   - User's income: -₹(X/3)

7. Month 3: User pays third installment
   API: POST /orders/{orderId}/pay-emi-installment
         with installmentNumber=3
   - PaymentPlan: status="completed"
   - Finance record created for ₹(X/3)
   - PurchaseExpense: status="completed"
   - User's income: -₹(X/3)
```

**Monthly Amounts:**
- 3 months: ₹(X/3) per month
- 6 months: ₹(X/6) per month
- 12 months: ₹(X/12) per month

---

### 3️⃣ BNPL - Buy Now, Pay Later
```
User chooses: "BNPL"
Amount: Pay ₹X within 14 days after delivery
Income deduction: Only after delivery confirmation
Finance record: Created after delivery
Timeline: Up to 14 days after delivery
```

**What happens:**
```
1. User clicks checkout → selects "BNPL"
2. API: POST /orders/checkout with paymentPlan="bnpl"
3. Backend creates:
   - Order (status="confirmed")
   - PaymentPlan (status="active", due date = today + 14 days)
   - PurchaseExpense (status="active", deducted_amount=0)
   - NO Finance record yet
4. User's income: No change yet

5. Day 0-5: Item in transit
   User's income: Still no change

6. Day 5: Item delivered
   User's income: Still no change
   (Waiting for confirmation)

7. Admin/System confirms delivery
   API: POST /orders/{orderId}/confirm-bnpl-payment
   - PaymentPlan: status="completed"
   - Finance record created for ₹X
   - PurchaseExpense: status="completed"
   - User's income: -₹X
```

---

## Real-World Example

**Scenario:** User named "Priya" 🧑‍💼

### Initial Balance
```
Priya's Income: ₹0
```

### Step 1: Priya sells an item for ₹12,000
```
Finance record created: +₹12,000 (income)
Priya's Balance: ₹12,000
```

### Step 2: Priya buys item for ₹6,000 with 3-month EMI
```
Checkout response:
{
  "paymentPlan": {
    "type": "emi",
    "totalAmount": 6000,
    "emiDetails": { "numberOfMonths": 3, "monthlyAmount": 2000 }
  }
}

PaymentPlan created with:
- Installment 1: ₹2,000 due on Day 30
- Installment 2: ₹2,000 due on Day 60
- Installment 3: ₹2,000 due on Day 90

Priya's Balance: Still ₹12,000 (no deduction yet)
```

### Step 3: Priya pays first EMI on Day 30
```
API Call: POST /orders/{orderId}/pay-emi-installment
{
  "installmentNumber": 1,
  "transactionId": "TXN001",
  "paymentMethod": "upi"
}

Finance record created: -₹2,000 (expense)
Priya's Balance: ₹12,000 - ₹2,000 = ₹10,000
```

### Step 4: Priya pays second EMI on Day 60
```
API Call: POST /orders/{orderId}/pay-emi-installment
{
  "installmentNumber": 2,
  "transactionId": "TXN002",
  "paymentMethod": "upi"
}

Finance record created: -₹2,000 (expense)
Priya's Balance: ₹10,000 - ₹2,000 = ₹8,000
```

### Step 5: Priya pays final EMI on Day 90
```
API Call: POST /orders/{orderId}/pay-emi-installment
{
  "installmentNumber": 3,
  "transactionId": "TXN003",
  "paymentMethod": "upi"
}

Finance record created: -₹2,000 (expense)
Priya's Balance: ₹8,000 - ₹2,000 = ₹6,000

PaymentPlan status: "completed"
PurchaseExpense status: "completed"
```

**Final Result:**
```
Income from sale: +₹12,000
Expenses from purchase: -₹6,000 (spread over 3 months)
Final Balance: ₹6,000
```

---

## Data Flow Diagram

### Full Payment
```
Checkout
   ↓
Create Order + PaymentPlan + PurchaseExpense + Finance
   ↓
PaymentPlan.status = "completed"
PurchaseExpense.status = "completed"
Finance.amount deducted immediately
   ↓
Balance Updated
```

### EMI
```
Checkout
   ↓
Create Order + PaymentPlan (active) + PurchaseExpense (active)
NO Finance record yet
   ↓
→ Payment 1 → Create Finance → Update PaymentPlan → Balance -₹(X/months)
→ Payment 2 → Create Finance → Update PaymentPlan → Balance -₹(X/months)
→ Payment 3 → Create Finance → Update PaymentPlan → Balance -₹(X/months)
   ↓
PaymentPlan.status = "completed"
PurchaseExpense.status = "completed"
```

### BNPL
```
Checkout
   ↓
Create Order + PaymentPlan (active) + PurchaseExpense (active)
NO Finance record yet
   ↓
Waiting for Delivery...
   ↓
Delivery Confirmed
   ↓
Create Finance record
PaymentPlan.status = "completed"
PurchaseExpense.status = "completed"
   ↓
Balance Updated
```

---

## API Endpoints Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/orders/checkout` | POST | Create order with payment plan |
| `/orders/{id}/pay-emi-installment` | POST | Record EMI payment |
| `/orders/{id}/confirm-bnpl-payment` | POST | Trigger BNPL deduction |
| `/orders/{id}/payment-plan` | GET | Get payment schedule |
| `/orders/expenses/summary` | GET | Get expense summary |

---

## Key Points to Remember

✅ **Full Payment:**
- Income deducted immediately
- One Finance record created
- PaymentPlan completed right away

✅ **EMI:**
- No immediate deduction
- Multiple Finance records (one per payment)
- PaymentPlan tracks installments
- Each payment creates a new deduction

✅ **BNPL:**
- No immediate deduction
- Waits for delivery confirmation
- One Finance record created after confirmation
- PaymentPlan marks complete after delivery

✅ **Dual-Role Scenario:**
- Seller income: +amount
- Buyer expense: -amount
- Net balance = total income - total expenses
- No conflicts between roles

---

## Testing Checklist

- [ ] Full Payment: Verify Finance record created immediately
- [ ] Full Payment: Check balance decreased right away
- [ ] EMI: Verify no deduction at checkout
- [ ] EMI: Pay installment 1, verify Finance record
- [ ] EMI: Pay installment 2, verify Finance record
- [ ] EMI: Pay installment 3, verify PaymentPlan completed
- [ ] EMI: Check total deductions = purchase amount
- [ ] BNPL: Verify no deduction at checkout
- [ ] BNPL: Confirm delivery, verify Finance record
- [ ] BNPL: Check balance decreased
- [ ] Dual-role: Sell item, buy item, verify net balance

---

## Common Scenarios

### Scenario 1: Cancel Order with EMI
```
If order cancelled after Payment 1 of 3:
- Finance records: Keep existing deductions
- PaymentPlan: Mark as "cancelled"
- Remaining installments: Not required
- Recommendation: Manual review for refund
```

### Scenario 2: Late EMI Payment
```
If user doesn't pay on due date:
- PaymentPlan: Installment status = "overdue"
- Finance: Not created until payment made
- Recommendation: Send reminder notification
```

### Scenario 3: BNPL Not Paid
```
If user doesn't pay within 14 days:
- PaymentPlan: Still "active"
- Finance: Not created yet
- PurchaseExpense: Still "active"
- Recommendation: Send overdue notice, consider blocking future purchases
```

---

## Database Queries

### Get user's pending EMI payments
```javascript
db.paymentplans.find({
  buyerId: userId,
  planType: "emi",
  status: "active"
})
```

### Get total deducted from purchases
```javascript
db.finance.aggregate([
  { $match: { userId, type: "expense", tags: "purchase" } },
  { $group: { _id: null, total: { $sum: "$amount" } } }
])
```

### Get active BNPL payments
```javascript
db.paymentplans.find({
  buyerId: userId,
  planType: "bnpl",
  status: "active"
})
```

### Get user's purchase expense summary
```javascript
db.purchaseexpenses.findOne({ buyerId: userId, status: "active" })
```

---

## Response Examples

### Checkout Response (EMI)
```json
{
  "message": "Order placed successfully",
  "order": {
    "_id": "507f1f77bcf86cd799439011",
    "orderId": "ORD-ABC123",
    "totalAmount": 6000,
    "status": "confirmed",
    "paymentMethod": "cod"
  },
  "paymentPlan": {
    "id": "507f1f77bcf86cd799439012",
    "type": "emi",
    "details": {
      "planType": "emi",
      "totalAmount": 6000,
      "emiDetails": {
        "numberOfMonths": 3,
        "monthlyAmount": 2000,
        "interestRate": 0
      },
      "installments": [
        {
          "installmentNumber": 1,
          "amount": 2000,
          "dueDate": "2024-02-01",
          "status": "pending"
        },
        {
          "installmentNumber": 2,
          "amount": 2000,
          "dueDate": "2024-03-01",
          "status": "pending"
        },
        {
          "installmentNumber": 3,
          "amount": 2000,
          "dueDate": "2024-04-01",
          "status": "pending"
        }
      ],
      "status": "active"
    }
  }
}
```

### Payment Plan Details Response
```json
{
  "paymentPlan": {
    "_id": "507f1f77bcf86cd799439012",
    "orderId": "507f1f77bcf86cd799439011",
    "buyerId": "507f1f77bcf86cd799439013",
    "totalAmount": 6000,
    "planType": "emi",
    "totalPaid": 4000,
    "pendingAmount": 2000,
    "status": "active"
  },
  "purchaseExpense": {
    "_id": "507f1f77bcf86cd799439014",
    "totalAmount": 6000,
    "deductionDetails": {
      "deducted_amount": 4000,
      "remainingAmount": 2000,
      "deductions": [
        {
          "amount": 2000,
          "date": "2024-01-01",
          "reason": "emi_installment_1",
          "status": "deducted"
        },
        {
          "amount": 2000,
          "date": "2024-02-01",
          "reason": "emi_installment_2",
          "status": "deducted"
        }
      ]
    },
    "paymentStatus": "partial",
    "status": "active"
  },
  "summary": {
    "planType": "emi",
    "totalAmount": 6000,
    "totalPaid": 4000,
    "pendingAmount": 2000,
    "status": "active",
    "installments": {
      "total": 3,
      "paid": 2,
      "pending": 1,
      "schedule": [
        {
          "number": 1,
          "amount": 2000,
          "dueDate": "2024-01-01",
          "status": "paid",
          "paidDate": "2024-01-01"
        },
        {
          "number": 2,
          "amount": 2000,
          "dueDate": "2024-02-01",
          "status": "paid",
          "paidDate": "2024-02-01"
        },
        {
          "number": 3,
          "amount": 2000,
          "dueDate": "2024-03-01",
          "status": "pending",
          "paidDate": null
        }
      ]
    }
  }
}
```

---

## Summary

**The Three Payment Options:**
1. 💰 **Full Payment** → Pay now, deduct immediately
2. 📅 **EMI** → Pay monthly, deduct monthly
3. 📦 **BNPL** → Pay after delivery, deduct after delivery

**Core Principle:**
- When user buys → creates deduction from their income
- When user sells → creates income
- Net balance = income - expenses
- Finance records maintain complete audit trail

🚀 **Ready to use!**