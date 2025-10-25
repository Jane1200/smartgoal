# Payment Models Comparison

## Quick Reference Table

| Feature | Full Payment | EMI (3 months) | BNPL (14 days) |
|---------|--------------|----------------|----------------|
| **Upfront Payment** | 100% now | 0% now | 0% now |
| **Payment Schedule** | Immediate | Monthly | After delivery |
| **Income Deduction** | Immediate | Month 1, 2, 3 | Day 15-21 after purchase |
| **Interest/Charges** | 0% | 0-2% | 0% |
| **When Goods Arrive** | Paid ✅ | Not paid yet ❌ | Not paid yet ❌ |
| **Risk to Seller** | None | Medium | High |
| **Best For** | Premium buyers | Regular buyers | New/discount items |
| **Adoption Rate** | ~40% | ~35% | ~25% |

---

## Visual Timeline

### 1. Full Payment Model
```
┌─────────────────────────────────────────────────────────┐
│  Customer Journey                                        │
└─────────────────────────────────────────────────────────┘

DAY 0 (Purchase)
├─ User places order
├─ User pays full ₹1000
├─ Finance: -₹1000 (expense recorded)
└─ Order status: "confirmed"

DAY 1-3 (Delivery)
├─ Item shipped
├─ Order status: "shipped"
└─ Order status: "delivered"

INCOME IMPACT:
User Income Flow:
₹5000 (initial) → Pay ₹1000 → ₹4000 (remaining)
```

### 2. EMI Model (3 Months at ₹1000)
```
┌─────────────────────────────────────────────────────────┐
│  Customer Journey                                        │
└─────────────────────────────────────────────────────────┘

DAY 0 (Purchase)
├─ User places order
├─ User makes NO payment
├─ Finance: (nothing deducted)
└─ Payment Plan created: 3 x ₹333.33

DAY 1-3 (Delivery)
├─ Item shipped
└─ Order status: "delivered"

MONTH 1 (EMI Due)
├─ Finance: -₹333.33 (1st installment)
└─ Payment Status: "partial"

MONTH 2 (EMI Due)
├─ Finance: -₹333.33 (2nd installment)
└─ Payment Status: "partial"

MONTH 3 (EMI Due)
├─ Finance: -₹333.33 (3rd installment)
└─ Payment Status: "completed"

INCOME IMPACT:
User Income Flow:
DAY 0:  ₹5000 (unchanged - EMI not deducted yet)
M1:     ₹5000 → Pay ₹333 → ₹4667
M2:     ₹4667 → Pay ₹333 → ₹4334
M3:     ₹4334 → Pay ₹333 → ₹4001
```

### 3. BNPL Model (Pay within 14 days of delivery)
```
┌─────────────────────────────────────────────────────────┐
│  Customer Journey                                        │
└─────────────────────────────────────────────────────────┘

DAY 0 (Purchase)
├─ User places order
├─ User makes NO payment
├─ Finance: (nothing deducted)
└─ Payment Due: Day 14 after delivery

DAY 1-3 (Delivery)
├─ Item shipped
├─ Order status: "delivered"
└─ Finance: (still nothing deducted)

DAY 15 (BNPL Payment Due)
├─ Payment reminder sent
├─ User can pay full ₹1000
└─ Finance: -₹1000 (payment deducted)

INCOME IMPACT:
User Income Flow:
DAY 0-14: ₹5000 (unchanged - BNPL not deducted yet)
DAY 15:   ₹5000 → Pay ₹1000 → ₹4000
```

---

## User Balance Tracking

### Scenario: User With ₹5000 Income

#### Option A: Buys ₹1000 item with FULL PAYMENT
```
Timeline:
├─ Day 0: Balance = ₹5000 - ₹1000 = ₹4000
├─ Day 1: Balance = ₹4000 (unchanged)
└─ Day 30: Balance = ₹4000 (unchanged)

Finance Record:
Amount: ₹1000
Category: shopping
Type: expense
Date: Day 0
```

#### Option B: Buys ₹1000 item with 3-MONTH EMI
```
Timeline:
├─ Day 0: Balance = ₹5000 (unchanged)
├─ Day 30: Balance = ₹5000 - ₹333 = ₹4667
├─ Day 60: Balance = ₹4667 - ₹333 = ₹4334
└─ Day 90: Balance = ₹4334 - ₹333 = ₹4001

Finance Records (3 entries):
1. Amount: ₹333 | Date: Day 30 | Tag: emi_installment_1
2. Amount: ₹333 | Date: Day 60 | Tag: emi_installment_2
3. Amount: ₹333 | Date: Day 90 | Tag: emi_installment_3
```

#### Option C: Buys ₹1000 item with BNPL
```
Timeline:
├─ Day 0: Balance = ₹5000 (unchanged)
├─ Day 7: Balance = ₹5000 (unchanged, item delivered)
├─ Day 14: Balance = ₹5000 - ₹1000 = ₹4000
└─ Day 30: Balance = ₹4000 (unchanged)

Finance Record:
Amount: ₹1000
Category: shopping
Type: expense
Date: Day 14 (after delivery)
Tag: bnpl_payment
```

---

## Seller Income Impact (Same User as Seller)

### Scenario: User Sells Item for ₹2000

```
Timeline:
├─ Item Listed: No impact
├─ Item Sold (Full/EMI/BNPL): Income recorded immediately*
└─ After Delivery: Confirmed

Finance Record Created:
Amount: ₹2000
Type: income
Source: marketplace
Description: "Sold [Item Name]"
Date: Order placed (or delivery confirmed)

User Balance:
Before: ₹4000
After Sale: ₹4000 + ₹2000 = ₹6000

*Timing depends on policy:
- Immediate: Income added when order is placed
- On Delivery: Income added when item is delivered
- On Payment: Income added when payment is received
```

---

## Decision Tree for Users

```
Customer purchasing ₹1000 item:

                    ┌─────────────────┐
                    │ Choose Payment  │
                    └────────┬────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
         ┌──────▼────┐  ┌───▼─────┐  ┌──▼──────────┐
         │Full       │  │EMI      │  │BNPL        │
         │Payment    │  │         │  │            │
         └──────┬────┘  └───┬─────┘  └──┬─────────┘
                │           │          │
           ┌────▼────┐  ┌────▼───┐  ┌──▼─────┐
           │Pay ₹1000│  │Choose  │  │Pay ₹0  │
           │today    │  │months  │  │today   │
           └────┬────┘  └────┬───┘  └──┬─────┘
                │            │         │
           ┌────▼────┐  ┌────▼───┐  ┌──▼─────┐
           │Balance  │  │Pay ₹333│  │Balance │
           │↓₹1000   │  │monthly │  │↓₹1000  │
           │NOW      │  │x3      │  │after   │
           │         │  │        │  │delivery│
           └─────────┘  └────────┘  └────────┘

BEST FOR:
- Premium/loyal customers
- Customers with funds
- High-value items

BEST FOR:
- Regular customers
- Budget-conscious
- Medium-value items

BEST FOR:
- New customers
- Low-value items
- Building trust
```

---

## Database Query Examples

### Get User's Financial Summary
```javascript
// Total income from sales
const salesIncome = await Finance.find({
  userId: buyerId,
  type: 'income',
  source: 'marketplace'
}).sum('amount');

// Total expenses from purchases
const purchaseExpenses = await Finance.find({
  userId: buyerId,
  type: 'expense',
  category: 'shopping'
}).sum('amount');

// Net balance
const netBalance = salesIncome - purchaseExpenses;
```

### Get Pending EMI Payments
```javascript
const pendingEMIs = await PaymentPlan.find({
  buyerId: userId,
  planType: 'emi',
  status: 'active'
}).populate('orderId', 'orderId totalAmount createdAt');

// Calculate total EMI pending
const totalPending = pendingEMIs.reduce((sum, plan) => {
  const unpaidInstallments = plan.installments.filter(inst => inst.status === 'pending');
  return sum + unpaidInstallments.reduce((s, inst) => s + inst.amount, 0);
}, 0);
```

### Get Overdue Payments
```javascript
const overduePayments = await PaymentPlan.find({
  buyerId: userId,
  'installments.dueDate': { $lt: new Date() },
  'installments.status': 'pending'
}).populate('orderId');
```

---

## Implementation Priority

### Phase 1 (MVP)
- [x] Full Payment (already working)
- [ ] BNPL (simpler to implement)
- [ ] Income deduction tracking

### Phase 2
- [ ] EMI support
- [ ] Interest calculation
- [ ] EMI payment reminders

### Phase 3
- [ ] Auto-deduction from goals
- [ ] Missed payment handling
- [ ] Flexible EMI adjustment

---

## Edge Cases to Handle

1. **User runs out of balance during EMI**
   - Option A: Block EMI purchase until balance available
   - Option B: Allow negative balance (debt)
   - Option C: Deduct from savings goals

2. **User misses EMI payment**
   - Send reminder at day 5
   - Mark as overdue at day 7
   - Charge late fee (optional)
   - After 30 days: block marketplace access

3. **User requests EMI cancellation**
   - Refund remaining amount to marketplace wallet
   - Or mark order as cancelled (seller gets refund)

4. **Order cancelled mid-EMI**
   - Refund paid installments
   - Cancel remaining installments
   - Restore to income

5. **Item return/refund mid-BNPL**
   - If not yet paid: cancel payment plan
   - If already paid: process refund