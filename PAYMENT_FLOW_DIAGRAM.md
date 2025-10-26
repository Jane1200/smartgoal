# Payment Flow Diagram - Dual Role User (Buyer + Seller)

## 🎭 Same User, Two Roles

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER: John (₹5,000 initial)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
         ┌──────────────────┐  ┌──────────────────┐
         │   SELLER ROLE    │  │   BUYER ROLE     │
         │                  │  │                  │
         │  Lists item for  │  │  Buys item for   │
         │    ₹2,000        │  │    ₹1,500        │
         └──────────────────┘  └──────────────────┘
                    │                   │
                    ▼                   ▼
         ┌──────────────────┐  ┌──────────────────┐
         │  Item Sells      │  │  Chooses Payment │
         │                  │  │     Method       │
         └──────────────────┘  └──────────────────┘
                    │                   │
                    ▼                   ▼
         ┌──────────────────┐  ┌──────────────────────────────┐
         │ MarketplaceIncome│  │      Payment Plan            │
         │  +₹2,000         │  │  • Full / EMI / BNPL         │
         └──────────────────┘  │  • Split / Custom            │
                    │           │  • Marketplace Deduct        │
                    │           └──────────────────────────────┘
                    ▼                   │
         ┌──────────────────┐          │
         │ Finance Record   │          │
         │ Type: "income"   │          │
         │ Amount: +₹2,000  │          │
         └──────────────────┘          │
                    │                   │
                    ▼                   ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ Balance: ₹7,000  │  │ PurchaseExpense  │
         │ (₹5K + ₹2K)      │  │  Creates record  │
         └──────────────────┘  └──────────────────┘
                                        │
                                        ▼
                         ┌──────────────────────────┐
                         │   Deduction Timeline     │
                         │   (Based on Plan Type)   │
                         └──────────────────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
        ▼                               ▼                               ▼
┌──────────────────┐        ┌──────────────────┐         ┌──────────────────┐
│  FULL PAYMENT    │        │   EMI (3 months) │         │      BNPL        │
├──────────────────┤        ├──────────────────┤         ├──────────────────┤
│ Day 0: -₹1,500   │        │ Month 1: -₹500   │         │ Day 0: ₹0        │
│                  │        │ Month 2: -₹500   │         │ Day 5: ₹0        │
│ Balance: ₹5,500  │        │ Month 3: -₹500   │         │ Day 14: -₹1,500  │
│                  │        │                  │         │                  │
│ Finance:         │        │ Final: ₹6,500    │         │ Balance: ₹5,500  │
│ 1 expense entry  │        │                  │         │                  │
│                  │        │ Finance:         │         │ Finance:         │
│                  │        │ 3 expense entries│         │ 1 expense entry  │
└──────────────────┘        └──────────────────┘         └──────────────────┘
```

---

## 📊 Full Transaction Timeline Example

### Scenario: User sells 1 item, buys 2 items with different payment plans

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DAY 0: Starting Balance = ₹0                                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TRANSACTION 1: SELL laptop for ₹25,000                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ ✅ Action: Someone buys your laptop                                     │
│ 📊 MarketplaceIncome: +₹25,000                                          │
│ 💰 Finance: Type=income, Amount=₹25,000                                 │
│ 💵 Balance: ₹0 → ₹25,000                                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TRANSACTION 2: BUY headphones for ₹5,000 (FULL PAYMENT)                │
├─────────────────────────────────────────────────────────────────────────┤
│ 🛒 Action: You buy headphones                                           │
│ 📝 PaymentPlan: Type=full, Amount=₹5,000                                │
│ 📉 PurchaseExpense: -₹5,000 (immediate)                                 │
│ 💸 Finance: Type=expense, Amount=₹5,000                                 │
│ 💵 Balance: ₹25,000 → ₹20,000                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ TRANSACTION 3: BUY phone for ₹18,000 (3-MONTH EMI)                     │
├─────────────────────────────────────────────────────────────────────────┤
│ 🛒 Action: You buy phone with EMI                                       │
│ 📝 PaymentPlan: Type=emi, Months=3, Monthly=₹6,000                      │
│ 💵 Balance: ₹20,000 (no change yet)                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ MONTH 1: EMI Payment #1                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ 📅 Auto reminder: "EMI due: ₹6,000"                                     │
│ 💸 Finance: Type=expense, Amount=₹6,000, Tag=emi_installment_1          │
│ 📉 PurchaseExpense: Deducted=₹6,000, Remaining=₹12,000                  │
│ 💵 Balance: ₹20,000 → ₹14,000                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ MONTH 2: EMI Payment #2                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│ 📅 Auto reminder: "EMI due: ₹6,000"                                     │
│ 💸 Finance: Type=expense, Amount=₹6,000, Tag=emi_installment_2          │
│ 📉 PurchaseExpense: Deducted=₹12,000, Remaining=₹6,000                  │
│ 💵 Balance: ₹14,000 → ₹8,000                                            │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ MONTH 3: EMI Payment #3 (Final)                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ 📅 Auto reminder: "Final EMI due: ₹6,000"                               │
│ 💸 Finance: Type=expense, Amount=₹6,000, Tag=emi_installment_3          │
│ 📉 PurchaseExpense: Deducted=₹18,000, Remaining=₹0 ✅                   │
│ 💵 Balance: ₹8,000 → ₹2,000                                             │
│ ✅ EMI Completed!                                                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ FINAL SUMMARY                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│ Income (Sold): +₹25,000                                                 │
│ Expenses (Bought): -₹23,000 (₹5,000 + ₹18,000)                          │
│ Final Balance: ₹2,000                                                   │
│                                                                          │
│ Finance Records:                                                         │
│ • 1 income entry (+₹25,000)                                             │
│ • 4 expense entries (₹5K full + 3×₹6K EMI)                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Payment Method Comparison Flow

```
                    USER CHOOSES PAYMENT METHOD
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
    ┌──────────┐        ┌──────────┐       ┌──────────┐
    │   FULL   │        │   EMI    │       │   BNPL   │
    └──────────┘        └──────────┘       └──────────┘
          │                   │                   │
          ▼                   ▼                   ▼
   ┌────────────┐      ┌────────────┐     ┌────────────┐
   │ Deduct NOW │      │Deduct LATER│     │ Deduct     │
   │  (Day 0)   │      │ (Monthly)  │     │AFTER DELIV │
   └────────────┘      └────────────┘     └────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
   ┌────────────┐      ┌────────────┐     ┌────────────┐
   │  1 Finance │      │ N Finance  │     │  1 Finance │
   │   Record   │      │  Records   │     │   Record   │
   └────────────┘      └────────────┘     └────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
   ┌────────────┐      ┌────────────┐     ┌────────────┐
   │  Instant   │      │  Gradual   │     │  Delayed   │
   │  Balance↓  │      │  Balance↓  │     │  Balance↓  │
   └────────────┘      └────────────┘     └────────────┘
```

---

## 💡 Recommended Payment Methods by Purchase Amount

```
Purchase Amount: ₹500 - ₹2,000
├─ Recommended: FULL PAYMENT
└─ Reason: Small amount, easy to pay upfront

Purchase Amount: ₹2,000 - ₹10,000
├─ Recommended: SPLIT or 3-MONTH EMI
└─ Reason: Medium amount, split reduces burden

Purchase Amount: ₹10,000 - ₹50,000
├─ Recommended: 6-MONTH or 12-MONTH EMI
└─ Reason: Large amount, long EMI manageable

Purchase Amount: > ₹50,000
├─ Recommended: LAYAWAY or CUSTOM SCHEDULE
└─ Reason: Very large, flexible plan needed

New User (First Purchase):
├─ Recommended: BNPL
└─ Reason: Build trust, lower risk for buyer

Active Seller (Has marketplace income):
├─ Recommended: PAY FROM MARKETPLACE INCOME
└─ Reason: Use earnings, no main balance impact
```

---

## 🎯 Decision Tree for Users

```
                    "I want to buy ₹10,000 item"
                              │
                              ▼
                    Do you have ₹10,000 now?
                              │
                ┌─────────────┴─────────────┐
                │                           │
               YES                         NO
                │                           │
                ▼                           ▼
       ┌─────────────────┐       Do you have marketplace
       │  FULL PAYMENT   │            income?
       │  (Pay now)      │                 │
       └─────────────────┘     ┌───────────┴───────────┐
                               │                       │
                              YES                     NO
                               │                       │
                               ▼                       ▼
                   ┌─────────────────────┐   Can you pay monthly?
                   │ PAY FROM MARKETPLACE│            │
                   │     INCOME          │    ┌───────┴───────┐
                   └─────────────────────┘    │               │
                                             YES             NO
                                              │               │
                                              ▼               ▼
                                   ┌──────────────┐  ┌──────────────┐
                                   │     EMI      │  │     BNPL     │
                                   │  (3/6/12 mo) │  │ (Pay after   │
                                   └──────────────┘  │  delivery)   │
                                                     └──────────────┘
```

---

## 📈 Balance Impact Over Time

### Scenario: ₹10,000 purchase with different payment methods

```
Balance Impact Chart (Starting: ₹15,000)

₹15,000 ┤                                                    BNPL ──────┐
        │                                                    EMI ─────┐ │
        │                                                            │ │
₹12,000 ┤                                          EMI ────┐         │ │
        │                                                  │         │ │
₹10,000 ┤                                    EMI ──┐       │         │ │
        │                                          │       │         │ │
₹8,000  ┤                              EMI ─┐      │       │         │ │
        │                                   │      │       │         │ │
₹5,000  ┤ Full Payment ─────────────────────┘      │       │         │ │
        │                                          │       │         │ │
        └────┬─────┬─────┬─────┬─────┬─────┬──────┬───────┬─────────┬─┘
           Day 0  Day 30 Day 60 Day 90 Day 120 Day 150 Day 180 Day 210

Legend:
─────  Full Payment (immediate drop)
─ ─ ─  EMI (gradual decline)
─ · ─  BNPL (delayed drop)
```

---

## 🔐 Security & Verification Flow

```
┌───────────────────────────────────────────────────────────────┐
│ BUYER INITIATES PAYMENT                                       │
└─────────────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────┐
│ SYSTEM VERIFICATIONS                                          │
├───────────────────────────────────────────────────────────────┤
│ ✓ Cart not empty                                              │
│ ✓ Items still available                                       │
│ ✓ Shipping address valid                                      │
│ ✓ Payment method valid                                        │
│ ✓ Payment plan valid                                          │
└─────────────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────┐
│ CREATE RECORDS                                                │
├───────────────────────────────────────────────────────────────┤
│ 1. Order                                                      │
│ 2. PaymentPlan                                                │
│ 3. PurchaseExpense                                            │
│ 4. Finance (if immediate deduction)                           │
└─────────────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────┐
│ UPDATE STATUS                                                 │
├───────────────────────────────────────────────────────────────┤
│ • Marketplace items → "pending"                               │
│ • Clear cart                                                  │
│ • Send notifications                                          │
└─────────────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────┐
│ SUCCESS RESPONSE                                              │
└───────────────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend User Experience Flow

```
┌─────────────────────────────────────────────────────────────┐
│              CHECKOUT PAGE                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cart Items: [Laptop - ₹25,000]                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Payment Plan Selection                              │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ○ Full Payment - Pay ₹25,000 now                    │   │
│  │                                                      │   │
│  │ ◉ EMI - 3 months × ₹8,333/month                     │   │
│  │   ├─ Month 1: ₹8,333 (Due: Feb 25)                  │   │
│  │   ├─ Month 2: ₹8,333 (Due: Mar 25)                  │   │
│  │   └─ Month 3: ₹8,334 (Due: Apr 25)                  │   │
│  │                                                      │   │
│  │ ○ Buy Now Pay Later - Pay after delivery            │   │
│  │   (Due: 14 days after delivery)                     │   │
│  │                                                      │   │
│  │ ○ Split Payment - ₹12,500 now + ₹12,500 in 30 days │   │
│  │                                                      │   │
│  │ ○ Pay from Marketplace Earnings                     │   │
│  │   (Available: ₹30,000)                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Place Order] ────────────────────────────────────────>    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│           ORDER CONFIRMATION PAGE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✅ Order #ORD-12345 placed successfully!                   │
│                                                             │
│  Payment Plan: 3-Month EMI                                 │
│  First Payment: ₹8,333 deducted                            │
│  Next Payment: ₹8,333 due on Feb 25, 2025                  │
│                                                             │
│  📊 Updated Balance:                                        │
│     Previous: ₹50,000                                      │
│     Deducted: -₹8,333                                      │
│     Current: ₹41,667                                       │
│                                                             │
│  [View Order Details] [Track Payment Schedule]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Payment Reminder System

```
┌────────────────────────────────────────────────────────────┐
│ EMI PAYMENT REMINDER (Day Before Due)                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 🔔 Reminder: EMI Payment Due Tomorrow                      │
│                                                            │
│ Order: #ORD-12345 (Laptop)                                │
│ Installment: 2 of 3                                       │
│ Amount Due: ₹8,333                                        │
│ Due Date: Feb 25, 2025                                    │
│                                                            │
│ Current Balance: ₹41,667 ✅ (Sufficient)                  │
│                                                            │
│ [Pay Now] [Skip This Time] [View Details]                │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ OVERDUE REMINDER (After Due Date)                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ⚠️ Payment Overdue                                         │
│                                                            │
│ Order: #ORD-12345 (Laptop)                                │
│ Installment: 2 of 3                                       │
│ Amount Due: ₹8,333                                        │
│ Overdue By: 3 days                                        │
│ Late Fee: ₹50                                             │
│                                                            │
│ Total Amount: ₹8,383                                      │
│                                                            │
│ [Pay Now] [Contact Support]                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Summary

- ✅ **Dual Role Works**: Same user can be buyer and seller
- ✅ **Income Increases**: When selling items
- ✅ **Income Decreases**: When buying items (based on payment plan)
- ✅ **Flexible Payments**: Multiple payment options available
- ✅ **Gradual Deduction**: EMI, BNPL, Split avoid one-time impact
- ✅ **Finance Tracking**: All transactions recorded in Finance model
- ✅ **Audit Trail**: Complete history of payments and deductions


