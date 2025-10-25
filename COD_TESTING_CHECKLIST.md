# ✅ COD Checkout - Quick Testing Checklist

## 🚀 Quick Start (5 minutes)

### Step 1: Start Services
```powershell
# Terminal 1 - Backend
cd c:\Users\anton\OneDrive\Desktop\ppr\smartgoal\smartgoal\server
npm run dev

# Terminal 2 - Frontend
cd c:\Users\anton\OneDrive\Desktop\ppr\smartgoal\smartgoal\client
npm run dev
```

### Step 2: Setup Test Data
```javascript
// MongoDB - Add test item to marketplace
db.marketplaces.insertOne({
  userId: ObjectId("seller_id_here"),
  title: "Test Item - COD Testing",
  description: "This is a test item for COD checkout",
  price: 500,
  category: "electronics",
  condition: "new",
  status: "active",
  images: [{
    url: "test-image.jpg"
  }],
  views: 0,
  likes: 0,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## ✅ Test Cases

### TEST 1: Default Payment Method
```
🎯 Goal: Verify COD is selected by default

📍 Location: /checkout
✅ Steps:
   1. Add item to cart
   2. Click "Proceed to Checkout"
   3. Look at Payment Method section

✅ Expected Result:
   - Radio button for "Cash on Delivery (COD)" is CHECKED
   - It says "Pay when you receive the item"

❌ Failed? Check:
   - Line 13 in Checkout.jsx: useState('cod')
```

### TEST 2: Checkout Form Validation
```
🎯 Goal: Verify form validation works

📍 Location: /checkout
✅ Steps:
   1. Leave all address fields empty
   2. Click "Place Order"

✅ Expected Result:
   - Toast message: "Please fill in all required fields"
   - Order NOT created

❌ Failed? Check:
   - validateForm() function in Checkout.jsx lines 52-71
```

### TEST 3: Phone Number Validation
```
🎯 Goal: Verify phone number must be 10 digits

📍 Location: /checkout
✅ Steps:
   1. Fill address form
   2. Phone field: Enter "98765" (5 digits)
   3. Click "Place Order"

✅ Expected Result:
   - Toast error: "Please enter a valid 10-digit phone number"
   - Order NOT created

❌ Failed? Check:
   - Line 60 in Checkout.jsx: /^\d{10}$/
```

### TEST 4: Pincode Validation
```
🎯 Goal: Verify pincode must be 6 digits

📍 Location: /checkout
✅ Steps:
   1. Fill address form
   2. Pincode field: Enter "11000" (5 digits)
   3. Click "Place Order"

✅ Expected Result:
   - Toast error: "Please enter a valid 6-digit pincode"
   - Order NOT created

❌ Failed? Check:
   - Line 65 in Checkout.jsx: /^\d{6}$/
```

### TEST 5: Complete Order with COD
```
🎯 Goal: Successfully place COD order

📍 Location: /checkout
✅ Steps:
   1. Fill in ALL address fields:
      - Full Name: "John Doe"
      - Phone: "9876543210"
      - Address Line 1: "123 Main Street"
      - City: "New Delhi"
      - State: "Delhi"
      - Pincode: "110001"
   2. Verify payment method is "COD"
   3. Click "Place Order"

✅ Expected Result:
   ✓ Processing spinner shows
   ✓ Success toast: "Order placed successfully!"
   ✓ Redirects to /orders page
   ✓ Order appears in list with:
     - Status: "confirmed" (blue badge)
     - Payment Status: "pending" (yellow badge)
     - Items details
     - Shipping address visible

❌ Failed? Check:
   - Backend console for errors
   - Network tab → POST /orders/checkout
   - Database: Order created with correct status
```

### TEST 6: Item Hidden from Marketplace
```
🎯 Goal: Verify purchased item hidden from Browse Items

📍 Location: /buyer-marketplace
✅ Steps:
   1. Complete TEST 5 (place order)
   2. Go to /buyer-marketplace
   3. Look for the item you just ordered

✅ Expected Result:
   - Item is NO LONGER visible in the list
   - Item count decreased
   - Only active/featured items shown

❌ Failed? Check:
   - Marketplace.js line 411: status: { $in: ['active', 'featured'] }
   - Database: Marketplace item status should be "pending"
   - Query: db.marketplaces.find({ _id: ObjectId("...") })
```

### TEST 7: Cart Cleared After Order
```
🎯 Goal: Verify cart is empty after order

📍 Location: /cart
✅ Steps:
   1. Complete TEST 5 (place order)
   2. Navigate to /cart

✅ Expected Result:
   - Cart is empty
   - Shows "Your cart is empty"
   - "Browse Marketplace" button visible

❌ Failed? Check:
   - orders.js line 65: await cart.clearCart()
   - Database: Cart.items should be empty array
```

### TEST 8: Order Appears in My Orders
```
🎯 Goal: Verify order visible in orders page

📍 Location: /orders
✅ Steps:
   1. Complete TEST 5 (place order)
   2. Should already be on /orders
   3. Scroll down to see order

✅ Expected Result:
   - Order card displays with:
     ✓ Order ID
     ✓ Created date
     ✓ Total amount
     ✓ Status badge: "confirmed"
     ✓ Payment status badge: "pending"
     ✓ Items count and details
     ✓ Shipping address

❌ Failed? Check:
   - Backend: GET /orders/my-orders endpoint
   - Orders.jsx line 19: api.get('/orders/my-orders')
   - Database: Order saved with correct buyerId
```

### TEST 9: Multiple Items in Order
```
🎯 Goal: Verify multiple items can be ordered together

📍 Location: /cart → /checkout
✅ Steps:
   1. Add 3 different items to cart
   2. Modify quantities (e.g., Item 1: qty 2, Item 2: qty 1, Item 3: qty 3)
   3. Go to checkout
   4. Fill address, select COD
   5. Click "Place Order"

✅ Expected Result:
   ✓ All items ordered successfully
   ✓ Total amount = sum of (price × quantity)
   ✓ All items hidden from marketplace
   ✓ Order shows all items in My Orders
   ✓ Cart is empty

❌ Failed? Check:
   - Order.js line 136-143: createFromCart mapping items
   - Cart clearing logic
```

### TEST 10: Order Details View
```
🎯 Goal: Verify order details can be viewed

📍 Location: /orders
✅ Steps:
   1. Complete TEST 5 (place order)
   2. Look for the order in list
   3. Click on order details (if clickable)

✅ Expected Result:
   - Order ID, date, total visible
   - All items listed with:
     ✓ Item image
     ✓ Item title
     ✓ Price per unit
     ✓ Quantity
     ✓ Seller name
   - Shipping address displayed
   - Payment method: "COD"
   - Status: "confirmed"

❌ Failed? Check:
   - Orders.jsx rendering
   - Order.populate() in backend
```

---

## 🔍 Database Verification

### Check if order was created
```javascript
// MongoDB
db.orders.find({ buyerId: ObjectId("your_user_id") })

// Expected fields:
{
  _id: ObjectId("..."),
  buyerId: ObjectId("..."),
  items: [
    {
      marketplaceItemId: ObjectId("..."),
      sellerId: ObjectId("..."),
      title: "Test Item",
      price: 500,
      quantity: 1
    }
  ],
  totalAmount: 500,
  status: "confirmed",  // ← Should be "confirmed" for COD
  paymentStatus: "pending",  // ← Should be "pending"
  paymentMethod: "cod",
  shippingAddress: {
    fullName: "John Doe",
    phone: "9876543210",
    addressLine1: "123 Main Street",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    country: "India"
  },
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Check if item was marked pending
```javascript
// MongoDB
db.marketplaces.find({ _id: ObjectId("item_you_ordered") })

// Expected:
{
  _id: ObjectId("..."),
  status: "pending",  // ← Changed from "active"
  ...
}
```

### Check if cart was cleared
```javascript
// MongoDB
db.carts.find({ userId: ObjectId("your_user_id") })

// Expected:
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  items: [],  // ← Should be empty array
  totalItems: 0,
  totalAmount: 0,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

## 🖥️ Browser Console Checks

### Network Tab - POST /orders/checkout
```
Request Headers:
✅ Authorization: Bearer <token>
✅ Content-Type: application/json

Request Body:
✅ paymentMethod: "cod"
✅ shippingAddress: {...}

Response:
✅ Status: 200 OK
✅ message: "Order placed successfully"
✅ order: {...with all details...}
```

### Console Errors
```
❌ Should NOT see:
- "Cannot read property 'map' of undefined"
- "Cart is empty"
- "Failed to create order"
- "Validation failed"

✅ Should see:
- API call successful
- Order created log
- Redirect to /orders
```

---

## 🚨 Common Issues & Solutions

### Issue: "Your cart is empty" after adding items
```
Cause: Cart not saved correctly
Solution:
1. Check cart.addItem() in Cart.js
2. Verify item exists in marketplace
3. Item status should be "active"
4. Check browser network tab for 400 errors
```

### Issue: Order created but cart not cleared
```
Cause: cart.clearCart() not called or failed
Solution:
1. Check orders.js line 65
2. Verify Cart model clearCart() method
3. Check database - cart should have empty items array
4. Backend console for errors
```

### Issue: Item still visible in marketplace
```
Cause: Item status not updated to "pending"
Solution:
1. Check orders.js lines 56-62
2. Verify Marketplace.save() succeeded
3. Check database - item status should be "pending"
4. Refresh marketplace page (Ctrl+R)
5. Backend console for errors
```

### Issue: Order not appearing in "My Orders"
```
Cause: Order not fetched or wrong buyerId
Solution:
1. Check orders.js GET /orders/my-orders
2. Verify buyerId matches current user
3. Check database - order should have correct buyerId
4. Refresh page (Ctrl+R)
5. Check Orders.jsx fetchOrders()
```

### Issue: Form validation not working
```
Cause: Regex pattern issue
Solution:
1. Phone must be: /^\d{10}$/ (exactly 10 digits)
2. Pincode must be: /^\d{6}$/ (exactly 6 digits)
3. Check validateForm() in Checkout.jsx
4. Try entering: Phone: 9876543210, Pincode: 110001
```

---

## ✅ Final Verification

### Before going to production:

```
□ Test 1 - Default COD selected          ✅ Pass / ❌ Fail
□ Test 2 - Form validation working       ✅ Pass / ❌ Fail
□ Test 3 - Phone validation working      ✅ Pass / ❌ Fail
□ Test 4 - Pincode validation working    ✅ Pass / ❌ Fail
□ Test 5 - Complete order placed         ✅ Pass / ❌ Fail
□ Test 6 - Item hidden from marketplace  ✅ Pass / ❌ Fail
□ Test 7 - Cart cleared                  ✅ Pass / ❌ Fail
□ Test 8 - Order in My Orders            ✅ Pass / ❌ Fail
□ Test 9 - Multiple items ordered        ✅ Pass / ❌ Fail
□ Test 10 - Order details visible        ✅ Pass / ❌ Fail

Database Verifications:
□ Order created with correct fields      ✅ Pass / ❌ Fail
□ Item status changed to "pending"       ✅ Pass / ❌ Fail
□ Cart items array is empty              ✅ Pass / ❌ Fail
```

---

## 📞 Support

If any test fails:

1. **Check browser console** for error messages
2. **Check backend console** for API errors
3. **Check MongoDB** for data verification
4. **Check Network tab** for failed requests
5. **Compare with COD_CHECKOUT_IMPLEMENTATION.md** for expected behavior

---

**All Tests Passed? ✅ COD is ready for production!**

**Status:** Ready for Razorpay integration for online payments (Phase 2)