# Savings-Based Purchase & Goal System - Implementation Guide

## 🎯 Overview

This system ensures that **all purchases and goal allocations** are deducted from **user savings** (not directly from income).

### Key Concept
```
SAVINGS = Total Income - Total Expenses

✅ Purchases deduct from SAVINGS
✅ Goal allocations deduct from SAVINGS
❌ Cannot spend more than available SAVINGS
```

---

## 📊 How It Works

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER FINANCIAL FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Step 1: USER ADDS INCOME
  ├─ Salary: +₹50,000
  ├─ Freelance: +₹10,000
  └─ Marketplace Sale: +₹5,000
  ═══════════════════════════
  Total Income: ₹65,000

Step 2: USER HAS EXPENSES
  ├─ Rent: -₹15,000
  ├─ Food: -₹8,000
  └─ Transport: -₹3,000
  ═══════════════════════════
  Total Expenses: ₹26,000

Step 3: SAVINGS CALCULATED
  ├─ Savings = Income - Expenses
  └─ Savings = ₹65,000 - ₹26,000
  ═══════════════════════════
  ✅ AVAILABLE SAVINGS: ₹39,000

Step 4: USER WANTS TO PURCHASE (₹20,000)
  ├─ Check: ₹20,000 ≤ ₹39,000? YES ✅
  ├─ Deduct from savings
  └─ New Savings: ₹39,000 - ₹20,000 = ₹19,000

Step 5: USER WANTS TO ALLOCATE TO GOALS (₹25,000)
  ├─ Check: ₹25,000 ≤ ₹19,000? NO ❌
  ├─ BLOCKED: Insufficient savings
  └─ Notification sent to user
```

---

## 🔧 Implementation Details

### 1. Backend Utility Functions

**File:** `server/src/utils/financeUtils.js`

#### Calculate User Savings
```javascript
import { calculateUserSavings } from "../utils/financeUtils.js";

const savings = await calculateUserSavings(userId);
// Returns:
// {
//   totalIncome: 65000,
//   totalExpenses: 26000,
//   totalSavings: 39000,
//   marketplaceIncome: 5000,
//   availableBalance: 39000
// }
```

#### Check Sufficient Savings
```javascript
import { checkSufficientSavings } from "../utils/financeUtils.js";

const check = await checkSufficientSavings(userId, 20000);
// Returns:
// {
//   hasSufficient: true,
//   availableSavings: 39000,
//   requiredAmount: 20000,
//   shortfall: 0
// }
```

#### Calculate EMI Affordability
```javascript
import { calculateProjectedSavingsWithEMI } from "../utils/financeUtils.js";

const projection = await calculateProjectedSavingsWithEMI(userId, 5000, 6);
// Returns:
// {
//   currentSavings: 39000,
//   avgMonthlyIncome: 21666,
//   avgMonthlyExpenses: 8666,
//   avgMonthlySavings: 13000,
//   installmentAmount: 5000,
//   numberOfMonths: 6,
//   projection: [
//     { month: 1, projectedSavings: 47000, installmentPaid: 5000, isAffordable: true },
//     { month: 2, projectedSavings: 55000, installmentPaid: 5000, isAffordable: true },
//     ...
//   ],
//   isAffordable: true,
//   warning: null
// }
```

---

### 2. Purchase Validation (Checkout)

**File:** `server/src/routes/orders.js`

#### Full Payment Validation
```javascript
// Validate savings before purchase
const savingsCheck = await checkSufficientSavings(userId, totalAmount);

if (!savingsCheck.hasSufficient) {
  // Create notification
  await Notification.createPurchaseBlockedNotification(
    userId,
    totalAmount,
    savingsCheck.availableSavings
  );

  return res.status(400).json({
    success: false,
    message: "Insufficient savings to complete this purchase",
    error: "INSUFFICIENT_SAVINGS",
    details: {
      requiredAmount: totalAmount,
      availableSavings: savingsCheck.availableSavings,
      shortfall: savingsCheck.shortfall
    }
  });
}
```

#### EMI Affordability Validation
```javascript
const projection = await calculateProjectedSavingsWithEMI(userId, monthlyAmount, months);

if (!projection.isAffordable) {
  return res.status(400).json({
    success: false,
    message: "Your projected savings may not support this EMI plan",
    error: "EMI_NOT_AFFORDABLE",
    details: {
      monthlyAmount,
      currentSavings: projection.currentSavings,
      avgMonthlySavings: projection.avgMonthlySavings,
      projection: projection.projection
    }
  });
}
```

---

### 3. Goal Allocation Validation

**File:** `server/src/routes/goals.js`

```javascript
// Validate savings before allocating to goals
const savingsCheck = await checkSufficientSavings(userId, wantsIncomeAmount);

if (!savingsCheck.hasSufficient) {
  // Create notification
  await Notification.createGoalAllocationBlockedNotification(
    userId,
    wantsIncomeAmount,
    savingsCheck.availableSavings
  );

  return res.status(400).json({
    success: false,
    message: "Insufficient savings to allocate to goals",
    error: "INSUFFICIENT_SAVINGS_FOR_GOALS",
    details: {
      requestedAmount: wantsIncomeAmount,
      availableSavings: savingsCheck.availableSavings,
      shortfall: savingsCheck.shortfall
    }
  });
}
```

---

### 4. Notification System

**File:** `server/src/models/Notification.js`

#### Notification Types

1. **Purchase Blocked**
```javascript
await Notification.createPurchaseBlockedNotification(
  userId,
  purchaseAmount,
  availableSavings
);
```

2. **Goal Allocation Blocked**
```javascript
await Notification.createGoalAllocationBlockedNotification(
  userId,
  allocationAmount,
  availableSavings
);
```

3. **Custom Notification**
```javascript
await Notification.create({
  userId,
  type: "error",
  category: "savings",
  title: "Insufficient Savings",
  message: "Your message here",
  details: { /* custom details */ },
  actionUrl: "/finances",
  actionLabel: "View Finances"
});
```

---

## 📡 API Endpoints

### Finance Endpoints

```bash
# Get user's total savings
GET /api/finance/savings
Response:
{
  "success": true,
  "savings": {
    "totalIncome": 65000,
    "totalExpenses": 26000,
    "totalSavings": 39000,
    "marketplaceIncome": 5000,
    "availableBalance": 39000
  },
  "message": "You have ₹39,000 in total savings"
}

# Get monthly savings breakdown
GET /api/finance/savings/breakdown?months=6
Response:
{
  "success": true,
  "breakdown": [
    {
      "month": 10,
      "year": 2025,
      "monthName": "October",
      "income": 65000,
      "expenses": 26000,
      "savings": 39000,
      "savingsRate": 60
    },
    ...
  ],
  "summary": {
    "avgMonthlySavings": 35000,
    "avgSavingsRate": 55,
    "totalSavings": 210000
  }
}
```

### Notification Endpoints

```bash
# Get user notifications
GET /api/notifications?limit=20&includeRead=true

# Get unread count
GET /api/notifications/unread-count

# Mark as read
PUT /api/notifications/:id/read

# Mark all as read
PUT /api/notifications/mark-all-read

# Delete notification
DELETE /api/notifications/:id

# Clear all read notifications
DELETE /api/notifications/clear-read
```

---

## 💻 Frontend Integration

### 1. Display Savings on Dashboard

```jsx
// Fetch savings
const [savings, setSavings] = useState(null);

useEffect(() => {
  fetch('/api/finance/savings', {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => setSavings(data.savings));
}, []);

// Display
<div className="savings-card">
  <h3>Available Savings</h3>
  <p className="amount">₹{savings?.totalSavings.toLocaleString()}</p>
  <div className="breakdown">
    <span>Income: ₹{savings?.totalIncome.toLocaleString()}</span>
    <span>Expenses: ₹{savings?.totalExpenses.toLocaleString()}</span>
  </div>
</div>
```

### 2. Handle Insufficient Savings on Checkout

```jsx
const handleCheckout = async () => {
  try {
    const response = await fetch('/api/orders/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        paymentMethod: selectedPaymentMethod,
        shippingAddress: shippingAddress,
        paymentPlan: paymentPlan
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error === 'INSUFFICIENT_SAVINGS') {
        // Show insufficient savings alert
        alert(`Insufficient Savings!\n\n` +
              `Required: ₹${data.details.requiredAmount.toLocaleString()}\n` +
              `Available: ₹${data.details.availableSavings.toLocaleString()}\n` +
              `Shortfall: ₹${data.details.shortfall.toLocaleString()}\n\n` +
              `Please add more income or reduce expenses to increase your savings.`);
        
        // Redirect to finances page
        navigate('/finances');
        return;
      }
      
      throw new Error(data.message);
    }

    // Success
    alert('Order placed successfully!');
    navigate('/orders');
  } catch (error) {
    console.error('Checkout error:', error);
    alert(error.message);
  }
};
```

### 3. Display Notifications

```jsx
const [notifications, setNotifications] = useState([]);
const [unreadCount, setUnreadCount] = useState(0);

useEffect(() => {
  fetchNotifications();
}, []);

const fetchNotifications = async () => {
  const response = await fetch('/api/notifications', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json();
  setNotifications(data.notifications);
  setUnreadCount(data.unreadCount);
};

return (
  <div className="notifications">
    <div className="notification-icon">
      <BellIcon />
      {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
    </div>
    
    <div className="notification-list">
      {notifications.map(notification => (
        <div key={notification._id} className={`notification ${notification.type}`}>
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>
          {notification.actionUrl && (
            <button onClick={() => navigate(notification.actionUrl)}>
              {notification.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);
```

### 4. Pre-Checkout Savings Check

```jsx
const checkSavingsBeforeCheckout = async () => {
  const cartTotal = cart.totalAmount;
  
  const savingsResponse = await fetch('/api/finance/savings', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const { savings } = await savingsResponse.json();
  
  if (savings.totalSavings < cartTotal) {
    const shortfall = cartTotal - savings.totalSavings;
    
    const confirmed = confirm(
      `⚠️ Insufficient Savings\n\n` +
      `Cart Total: ₹${cartTotal.toLocaleString()}\n` +
      `Your Savings: ₹${savings.totalSavings.toLocaleString()}\n` +
      `Shortfall: ₹${shortfall.toLocaleString()}\n\n` +
      `You need to add ₹${shortfall.toLocaleString()} more to your savings.\n\n` +
      `Go to Finances page to add income?`
    );
    
    if (confirmed) {
      navigate('/finances');
    }
    return false;
  }
  
  return true;
};

// Use before proceeding to checkout
const handleProceedToCheckout = async () => {
  const hasSufficientSavings = await checkSavingsBeforeCheckout();
  if (hasSufficientSavings) {
    navigate('/checkout');
  }
};
```

---

## 🎨 UI/UX Recommendations

### 1. Savings Display Component

```jsx
<div className="savings-display">
  <div className="savings-header">
    <h3>Your Savings</h3>
    <InfoTooltip>
      Savings = Total Income - Total Expenses
    </InfoTooltip>
  </div>
  
  <div className="savings-amount">
    ₹{savings.totalSavings.toLocaleString()}
  </div>
  
  <div className="savings-breakdown">
    <div className="income">
      <span>Income</span>
      <span>+₹{savings.totalIncome.toLocaleString()}</span>
    </div>
    <div className="expenses">
      <span>Expenses</span>
      <span>-₹{savings.totalExpenses.toLocaleString()}</span>
    </div>
  </div>
  
  <ProgressBar 
    current={savings.totalSavings} 
    total={savings.totalIncome} 
    label="Savings Rate"
  />
</div>
```

### 2. Insufficient Savings Alert Modal

```jsx
<Modal show={showInsufficientSavingsModal}>
  <div className="alert-icon error">⚠️</div>
  <h2>Insufficient Savings</h2>
  <p>You don't have enough savings to complete this action.</p>
  
  <div className="amount-breakdown">
    <div className="row">
      <span>Required Amount:</span>
      <span className="amount">₹{requiredAmount.toLocaleString()}</span>
    </div>
    <div className="row">
      <span>Your Savings:</span>
      <span className="amount">₹{availableSavings.toLocaleString()}</span>
    </div>
    <div className="row highlight">
      <span>Shortfall:</span>
      <span className="amount error">₹{shortfall.toLocaleString()}</span>
    </div>
  </div>
  
  <div className="actions">
    <button onClick={() => navigate('/finances')} className="primary">
      Add Income
    </button>
    <button onClick={() => navigate('/expenses')} className="secondary">
      Review Expenses
    </button>
    <button onClick={closeModal} className="tertiary">
      Cancel
    </button>
  </div>
</Modal>
```

### 3. Checkout Page Warning Banner

```jsx
{savings && cartTotal > savings.totalSavings && (
  <div className="warning-banner">
    <div className="icon">⚠️</div>
    <div className="message">
      <strong>Warning:</strong> Your cart total (₹{cartTotal.toLocaleString()})
      exceeds your available savings (₹{savings.totalSavings.toLocaleString()}).
      Please add ₹{(cartTotal - savings.totalSavings).toLocaleString()} to your savings
      before proceeding.
    </div>
    <button onClick={() => navigate('/finances')}>
      Add Income
    </button>
  </div>
)}
```

---

## 🧪 Testing Guide

### Test Case 1: Sufficient Savings - Purchase Allowed

```bash
# Setup
1. User has ₹50,000 in savings
2. User tries to purchase ₹30,000 item

# Expected Result
✅ Purchase allowed
✅ Expense created: -₹30,000
✅ New savings: ₹20,000
```

### Test Case 2: Insufficient Savings - Purchase Blocked

```bash
# Setup
1. User has ₹10,000 in savings
2. User tries to purchase ₹30,000 item

# Expected Result
❌ Purchase blocked
❌ Error: "INSUFFICIENT_SAVINGS"
✅ Notification created
✅ Details show shortfall: ₹20,000
```

### Test Case 3: EMI Affordability Check

```bash
# Setup
1. User has ₹5,000 in savings
2. Average monthly savings: ₹3,000
3. User tries 6-month EMI of ₹5,000/month

# Expected Result
❌ EMI blocked (₹5,000 > ₹3,000 avg)
❌ Error: "EMI_NOT_AFFORDABLE"
✅ Projection shows months with negative savings
```

### Test Case 4: Goal Allocation

```bash
# Setup
1. User has ₹20,000 in savings
2. User tries to allocate ₹25,000 to goals

# Expected Result
❌ Allocation blocked
❌ Error: "INSUFFICIENT_SAVINGS_FOR_GOALS"
✅ Notification created
✅ Shortfall: ₹5,000
```

---

## 📝 Error Codes Reference

| Error Code | Meaning | Action |
|-----------|---------|--------|
| `INSUFFICIENT_SAVINGS` | Not enough savings for purchase | Add income or reduce expenses |
| `EMI_NOT_AFFORDABLE` | Monthly EMI exceeds avg savings | Choose longer EMI period or save more |
| `INSUFFICIENT_SAVINGS_BNPL` | Not enough savings for BNPL payment | Add income before delivery date |
| `INSUFFICIENT_SAVINGS_SPLIT` | Not enough for split payment upfront | Add income or choose EMI |
| `INSUFFICIENT_SAVINGS_FOR_GOALS` | Not enough savings to allocate to goals | Add income or reduce expenses |
| `INSUFFICIENT_SAVINGS_FOR_MARKETPLACE_ALLOCATION` | Marketplace income exceeds savings | Clear pending expenses first |

---

## 🚀 Deployment Checklist

- [ ] Backend utility functions created (`financeUtils.js`)
- [ ] Savings validation added to checkout route
- [ ] Savings validation added to goal allocation routes
- [ ] Notification model created
- [ ] Notification routes created and registered
- [ ] Finance savings endpoints added
- [ ] Frontend displays savings on dashboard
- [ ] Frontend handles insufficient savings errors
- [ ] Frontend displays notifications
- [ ] Pre-checkout savings check implemented
- [ ] UI alerts and modals created
- [ ] All test cases pass
- [ ] Documentation reviewed

---

## 💡 Benefits of This System

✅ **Prevents Overspending:** Users cannot buy more than they have saved  
✅ **Transparent:** Clear distinction between income, expenses, and savings  
✅ **Realistic:** Reflects actual financial capacity  
✅ **Predictive:** EMI affordability checks future months  
✅ **Educational:** Teaches users to save before spending  
✅ **Flexible:** Supports multiple payment methods with appropriate checks  
✅ **Auditable:** Complete transaction trail in Finance model  

---

## 🔗 Related Files

- **Backend:**
  - `server/src/utils/financeUtils.js` - Savings calculation utilities
  - `server/src/routes/orders.js` - Purchase validation
  - `server/src/routes/goals.js` - Goal allocation validation
  - `server/src/routes/finance.js` - Savings endpoints
  - `server/src/routes/notifications.js` - Notification management
  - `server/src/models/Notification.js` - Notification schema
  - `server/src/models/Finance.js` - Income/expense tracking

- **Frontend:**
  - `client/src/pages/dashboard/Finances.jsx` - Savings display
  - `client/src/pages/dashboard/BuyerMarketplace.jsx` - Checkout validation
  - `client/src/components/NotificationCenter.jsx` - Notification display

---

## 📞 Support

If you encounter issues:
1. Check console logs for detailed error messages
2. Verify Finance records are accurate
3. Test savings calculation manually
4. Check notification creation
5. Review frontend error handling

---

**System Status:** ✅ Fully Implemented and Ready for Testing

Last Updated: October 25, 2025


