# 🗑️ Order Management Features - Delete & Retry Payment

## Overview
Added two new features for better order management:
1. **Delete Cancelled Orders** - Users can permanently delete cancelled orders
2. **Retry Payment for Pending Orders** - Users can complete payment for pending orders

---

## ✅ What Was Added

### 1. Frontend Changes (`client/src/pages/dashboard/Orders.jsx`)

#### **New State Variables:**
```javascript
const [deleting, setDeleting] = useState({});
const [retryingPayment, setRetryingPayment] = useState({});
```

#### **New Functions:**

**Delete Order:**
```javascript
const handleDeleteOrder = async (orderId) => {
  if (!confirm('Are you sure you want to delete this order?')) return;
  
  await api.delete(`/orders/${orderId}`);
  toast.success('Order deleted successfully');
  fetchOrders(); // Refresh orders
};
```

**Retry Payment:**
```javascript
const handleRetryPayment = async (orderId) => {
  // Recreate cart from order items
  await api.post(`/orders/${orderId}/recreate-cart`);
  toast.success('Items added to cart! Redirecting to checkout...');
  navigate('/checkout');
};
```

#### **New UI Buttons:**

**Pending Orders Show:**
- ⚠️ **"Complete Payment"** button (yellow)
- ❌ **"Cancel Order"** button

**Cancelled Orders Show:**
- 🗑️ **"Delete Order"** button (red)

---

### 2. Backend Changes (`server/src/routes/orders.js`)

#### **New API Endpoints:**

### 1. Delete Cancelled Order
**Endpoint:** `DELETE /api/orders/:orderId`

**What it does:**
- Deletes a cancelled order permanently
- Removes associated payment plan
- Removes associated purchase expense
- Only works for cancelled orders

**Request:**
```javascript
DELETE /api/orders/507f1f77bcf86cd799439011
Headers: { Authorization: "Bearer <token>" }
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Order deleted successfully"
}
```

**Response (Error - Not Cancelled):**
```json
{
  "message": "Only cancelled orders can be deleted. Please cancel the order first."
}
```

---

### 2. Recreate Cart from Order
**Endpoint:** `POST /api/orders/:orderId/recreate-cart`

**What it does:**
- Takes pending order items
- Recreates cart with those items
- Validates items are still available
- Redirects user to checkout to complete payment

**Request:**
```javascript
POST /api/orders/507f1f77bcf86cd799439011/recreate-cart
Headers: { Authorization: "Bearer <token>" }
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Items added to cart successfully",
  "cart": {
    "_id": "...",
    "items": [...],
    "totalAmount": 5000,
    "totalItems": 2
  }
}
```

**Response (Error - Item Unavailable):**
```json
{
  "message": "Item 'iPhone 13' is no longer available"
}
```

**Response (Error - Not Pending):**
```json
{
  "message": "Only pending orders can be retried. This order is already processed."
}
```

---

## 🔄 User Flows

### Flow 1: Delete Cancelled Order

```
User has cancelled order
  ↓
Sees "Delete Order" button (red)
  ↓
Clicks "Delete Order"
  ↓
Confirmation dialog: "Are you sure?"
  ↓
User confirms
  ↓
Order + Payment Plan + Purchase Expense deleted
  ↓
Toast: "Order deleted successfully"
  ↓
Orders list refreshes (order removed)
  ↓
Done! ✅
```

**Before:**
```
┌────────────────────────────────┐
│ Order #12345                   │
│ Status: CANCELLED              │
│                                │
│ [View Details]                 │
└────────────────────────────────┘
```

**After:**
```
┌────────────────────────────────┐
│ Order #12345                   │
│ Status: CANCELLED              │
│                                │
│ [View Details] [🗑️ Delete Order]│
└────────────────────────────────┘
```

---

### Flow 2: Retry Payment for Pending Order

```
User placed order but didn't complete payment
  ↓
Order status: PENDING
  ↓
Sees "Complete Payment" button (yellow)
  ↓
Clicks "Complete Payment"
  ↓
Backend recreates cart from order items
  ↓
Validates items still available
  ↓
Cart populated with items
  ↓
Toast: "Items added to cart! Redirecting..."
  ↓
User redirected to /checkout
  ↓
User completes payment
  ↓
Order status updated to CONFIRMED
  ↓
Done! ✅
```

**Before:**
```
┌────────────────────────────────┐
│ Order #12345                   │
│ Status: PENDING                │
│ Payment: PENDING               │
│                                │
│ [View Details] [Cancel Order]  │
└────────────────────────────────┘
```

**After:**
```
┌────────────────────────────────┐
│ Order #12345                   │
│ Status: PENDING                │
│ Payment: PENDING               │
│                                │
│ [View Details]                 │
│ [⚠️ Complete Payment]           │
│ [Cancel Order]                 │
└────────────────────────────────┘
```

---

## 🎨 UI Changes

### Order Status Buttons Matrix

| Order Status | Payment Status | Available Actions |
|-------------|----------------|-------------------|
| **Pending** | Pending | ⚠️ Complete Payment, ❌ Cancel Order |
| **Confirmed** | Any | ❌ Cancel Order |
| **Processing** | Any | View Details only |
| **Shipped** | Any | View Details only |
| **Delivered** | Any | ⭐ Leave Review |
| **Cancelled** | Any | 🗑️ Delete Order |

### Button Styles

**Complete Payment Button:**
```jsx
<button className="btn btn-sm btn-warning">
  <RefreshIcon /> Complete Payment
</button>
```
- Color: Yellow/Warning
- Icon: Refresh/Retry icon
- Shows loading spinner when processing

**Delete Order Button:**
```jsx
<button className="btn btn-sm btn-danger">
  <TrashIcon /> Delete Order
</button>
```
- Color: Red/Danger
- Icon: Trash icon
- Shows loading spinner when deleting

---

## 🔒 Security & Validation

### Delete Order
✅ **User Authentication** - Must be logged in  
✅ **Order Ownership** - Can only delete own orders  
✅ **Status Check** - Only cancelled orders can be deleted  
✅ **Cascade Delete** - Removes related payment plan and expense records  

### Recreate Cart
✅ **User Authentication** - Must be logged in  
✅ **Order Ownership** - Can only retry own orders  
✅ **Status Check** - Only pending orders can be retried  
✅ **Item Availability** - Validates items still exist and are available  
✅ **Price Update** - Uses current price (not old order price)  

---

## 📋 Example Scenarios

### Scenario 1: User Cancels and Deletes Order

**Step 1: Cancel Order**
```
User: Clicks "Cancel Order" on pending order
System: Updates order status to "cancelled"
Result: Order shows CANCELLED status
```

**Step 2: Delete Order**
```
User: Clicks "Delete Order" on cancelled order
System: Confirms deletion
System: Deletes order + payment plan + expense
Result: Order removed from list
```

---

### Scenario 2: User Retries Payment

**Step 1: Order Created but Payment Incomplete**
```
User: Placed order via UPI
User: Closed Razorpay modal without paying
Result: Order status = PENDING, Payment status = PENDING
```

**Step 2: Retry Payment**
```
User: Returns to Orders page
User: Sees "Complete Payment" button
User: Clicks "Complete Payment"
System: Recreates cart with order items
System: Redirects to /checkout
User: Completes payment via UPI
System: Updates order status to CONFIRMED
Result: Order confirmed! ✅
```

---

### Scenario 3: Item No Longer Available

**Step 1: User Tries to Retry**
```
User: Clicks "Complete Payment" on old pending order
System: Attempts to recreate cart
System: Checks if items still available
Result: Item was sold to someone else
```

**Step 2: Error Handling**
```
System: Returns error message
Toast: "Item 'iPhone 13' is no longer available"
User: Cannot retry payment for this order
Action: User should cancel the order
```

---

## 🧪 Testing Guide

### Test 1: Delete Cancelled Order

**Steps:**
1. Create an order
2. Cancel the order
3. Click "Delete Order"
4. Confirm deletion

**Expected:**
- ✅ Confirmation dialog appears
- ✅ Order is deleted
- ✅ Order removed from list
- ✅ Success toast shown

**Validation:**
- Check database: Order deleted
- Check database: PaymentPlan deleted
- Check database: PurchaseExpense deleted

---

### Test 2: Retry Payment Success

**Steps:**
1. Add item to cart
2. Go to checkout
3. Place order with UPI
4. Close payment modal without paying
5. Go to Orders page
6. Click "Complete Payment"

**Expected:**
- ✅ Toast: "Items added to cart!"
- ✅ Redirected to /checkout
- ✅ Cart has order items
- ✅ Can complete payment

---

### Test 3: Retry Payment - Item Unavailable

**Steps:**
1. Create pending order for Item A
2. As another user, buy Item A
3. Original user tries to retry payment

**Expected:**
- ❌ Error toast: "Item 'X' is no longer available"
- ❌ Cannot proceed to checkout
- ℹ️ Suggests cancelling the order

---

### Test 4: Delete Non-Cancelled Order

**Steps:**
1. Create a confirmed order
2. Try to delete via API: `DELETE /api/orders/{id}`

**Expected:**
- ❌ Error: "Only cancelled orders can be deleted"
- ✅ Order not deleted
- ✅ Button not visible in UI

---

## 🚨 Error Handling

### Frontend Errors

**Delete Failed:**
```javascript
toast.error('Failed to delete order');
// Button remains clickable, user can retry
```

**Retry Payment Failed:**
```javascript
toast.error('Item "X" is no longer available');
// User should cancel the order instead
```

### Backend Errors

**Delete Non-Cancelled Order:**
```json
{
  "message": "Only cancelled orders can be deleted. Please cancel the order first."
}
```

**Retry Already Processed Order:**
```json
{
  "message": "Only pending orders can be retried. This order is already processed."
}
```

**Item No Longer Available:**
```json
{
  "message": "Item 'iPhone 13' is no longer available"
}
```

---

## 📊 Database Impact

### Delete Order Operation

**Records Deleted:**
1. `Order` document
2. Associated `PaymentPlan` documents
3. Associated `PurchaseExpense` documents

**SQL Equivalent:**
```sql
-- Cascade delete
DELETE FROM PaymentPlans WHERE orderId = ?;
DELETE FROM PurchaseExpenses WHERE orderId = ?;
DELETE FROM Orders WHERE _id = ? AND status = 'cancelled';
```

### Recreate Cart Operation

**Records Updated:**
1. `Cart` - cleared and repopulated with order items
2. `Cart.items` - replaced with order items
3. `Cart.totalAmount` - recalculated
4. `Cart.totalItems` - recalculated

---

## 🎯 Benefits

### For Users 👤

✅ **Clean Order History** - Delete unwanted cancelled orders  
✅ **Second Chance** - Retry payment if accidentally closed  
✅ **Better UX** - Don't lose order just because payment failed  
✅ **Clear Actions** - Know what options are available  

### For System 🖥️

✅ **Reduced Clutter** - Cancelled orders can be removed  
✅ **Data Integrity** - Cascade deletes maintain consistency  
✅ **Revenue Recovery** - Users can complete pending orders  
✅ **Better Conversion** - Fewer abandoned orders  

---

## 📝 Important Notes

### Pending Orders
- User can retry payment anytime
- Items must still be available
- Uses current price (not old price)
- Cart is cleared and repopulated

### Cancelled Orders
- Can only be deleted when cancelled
- Permanently removes from database
- Cannot be recovered
- Cascade deletes related records

### Security
- Users can only manage their own orders
- Authentication required
- Validation on every operation
- Status checks prevent misuse

---

## 🎉 Summary

**Added Features:**
✅ Delete button for cancelled orders  
✅ Complete payment button for pending orders  
✅ Backend endpoints for delete and recreate cart  
✅ Error handling and validation  
✅ Loading states and user feedback  
✅ Database cascade operations  

**User Experience:**
🎯 Cleaner order history  
🎯 Ability to retry failed payments  
🎯 Clear visual indicators  
🎯 Confirmation dialogs  
🎯 Success/error messages  

**Everything is ready to use!** 🚀


