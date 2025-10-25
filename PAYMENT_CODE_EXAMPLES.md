# Payment Implementation - Code Examples

## Complete Working Example

### Backend: Checkout Endpoint (Simplified)

```javascript
// server/src/routes/orders.js

import express from 'express';
import Order from '../models/Order.js';
import PaymentPlan from '../models/PaymentPlan.js';
import PurchaseExpense from '../models/PurchaseExpense.js';
import Finance from '../models/Finance.js';
import Cart from '../models/Cart.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/checkout', authenticateToken, async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { 
      paymentMethod, 
      shippingAddress,
      paymentPlanType = 'full',
      emiMonths = 3 
    } = req.body;

    // 1. Fetch cart
    const cart = await Cart.findOne({ buyerId })
      .populate('items.marketplaceItemId');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    console.log(`✅ Cart found: ${cart.items.length} items, Total: ₹${cart.totalAmount}`);

    // 2. Create order
    const order = await Order.createFromCart(
      buyerId,
      cart,
      paymentMethod,
      shippingAddress
    );

    console.log(`✅ Order created: ${order.orderId}`);

    // 3. Create payment plan based on type
    let paymentPlan;
    
    if (paymentPlanType === 'emi') {
      // EMI Plan
      const planData = PaymentPlan.createEMISchedule(
        order._id,
        buyerId,
        cart.totalAmount,
        emiMonths,
        2 // 2% interest
      );
      paymentPlan = await PaymentPlan.create(planData);
      console.log(`✅ EMI Plan created: ${emiMonths} months of ₹${planData.emiDetails.monthlyAmount}`);
    } 
    else if (paymentPlanType === 'bnpl') {
      // BNPL Plan (14 days after delivery)
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);
      
      const planData = PaymentPlan.createBNPLSchedule(
        order._id,
        buyerId,
        cart.totalAmount,
        estimatedDelivery
      );
      paymentPlan = await PaymentPlan.create(planData);
      console.log(`✅ BNPL Plan created: Pay by ${planData.bnplDetails.paymentDueDate}`);
    } 
    else {
      // Full Payment
      paymentPlan = await PaymentPlan.create({
        orderId: order._id,
        buyerId,
        totalAmount: cart.totalAmount,
        planType: 'full',
        installments: [{
          installmentNumber: 1,
          amount: cart.totalAmount,
          dueDate: new Date(),
          status: 'pending'
        }],
        pendingAmount: cart.totalAmount,
        totalPaid: 0,
        status: 'active'
      });
      console.log(`✅ Full Payment Plan created`);
    }

    // 4. Create purchase expense tracker
    const purchaseExpense = await PurchaseExpense.create({
      buyerId,
      orderId: order._id,
      paymentPlanId: paymentPlan._id,
      totalAmount: cart.totalAmount,
      deductionDetails: {
        remainingAmount: cart.totalAmount,
        deductions: paymentPlan.installments.map(inst => ({
          amount: inst.amount,
          reason: paymentPlanType === 'emi' 
            ? `emi_installment_${inst.installmentNumber}`
            : paymentPlanType === 'bnpl'
            ? 'bnpl_payment'
            : 'full_payment',
          installmentNumber: inst.installmentNumber,
          status: 'pending'
        }))
      },
      financeRecordIds: []
    });

    console.log(`✅ Purchase Expense tracker created`);

    // 5. Handle income deduction based on plan type
    let financeRecords = [];

    if (paymentPlanType === 'full') {
      // Deduct FULL amount immediately
      console.log(`💰 Deducting full payment: ₹${cart.totalAmount}`);
      
      const financeRecord = await Finance.create({
        userId: buyerId,
        type: 'expense',
        amount: cart.totalAmount,
        category: 'shopping',
        description: `Marketplace purchase - Order ${order.orderId}`,
        date: new Date(),
        tags: ['marketplace', 'purchase', 'full_payment']
      });

      financeRecords.push(financeRecord._id);
      purchaseExpense.deductionDetails.deductions[0].status = 'deducted';
      purchaseExpense.deductionDetails.deducted_amount = cart.totalAmount;
      purchaseExpense.deductionDetails.remainingAmount = 0;
      purchaseExpense.paymentStatus = 'completed';
      purchaseExpense.financeRecordIds = financeRecords;
      
      console.log(`✅ Finance record created - Balance reduced by ₹${cart.totalAmount}`);
    } 
    else if (paymentPlanType === 'emi') {
      // For EMI: deductions happen monthly (not now)
      console.log(`⏰ EMI scheduled - Deduction will happen monthly`);
      purchaseExpense.financeRecordIds = [];
    } 
    else if (paymentPlanType === 'bnpl') {
      // For BNPL: deduction happens after delivery
      console.log(`📦 BNPL scheduled - Deduction will happen after delivery`);
      purchaseExpense.financeRecordIds = [];
    }

    await purchaseExpense.save();

    // 6. Clear cart
    await Cart.findByIdAndDelete(cart._id);
    console.log(`✅ Cart cleared`);

    // 7. Response
    res.json({
      success: true,
      order,
      paymentPlan,
      purchaseExpense,
      message: `Order created with ${paymentPlanType.toUpperCase()} payment`
    });

  } catch (error) {
    console.error('❌ Checkout error:', error);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Handle EMI Installment Payment
router.post('/:orderId/pay-installment', authenticateToken, async (req, res) => {
  try {
    const buyerId = req.user.id;
    const { installmentNumber, transactionId, paymentMethod } = req.body;

    console.log(`💳 Processing EMI payment for installment ${installmentNumber}`);

    // Get payment plan
    const paymentPlan = await PaymentPlan.findOne({ orderId: req.params.orderId });
    if (!paymentPlan) {
      return res.status(404).json({ error: 'Payment plan not found' });
    }

    // Record payment
    await paymentPlan.recordInstallmentPayment(
      installmentNumber,
      transactionId,
      paymentMethod
    );

    // Get installment details
    const installment = paymentPlan.installments[installmentNumber - 1];

    // Create Finance record for this installment
    const financeRecord = await Finance.create({
      userId: buyerId,
      type: 'expense',
      amount: installment.amount,
      category: 'shopping',
      description: `EMI Payment - Installment ${installmentNumber}/${paymentPlan.emiDetails.numberOfMonths} for Order ${paymentPlan.orderId}`,
      date: new Date(),
      tags: ['marketplace', 'emi', `installment_${installmentNumber}`]
    });

    console.log(`✅ Finance record created for ₹${installment.amount}`);

    // Update purchase expense
    const purchaseExpense = await PurchaseExpense.findOne({
      orderId: req.params.orderId,
      buyerId
    });

    purchaseExpense.deductionDetails.deductions[installmentNumber - 1].status = 'deducted';
    purchaseExpense.deductionDetails.deducted_amount += installment.amount;
    purchaseExpense.deductionDetails.remainingAmount -= installment.amount;
    purchaseExpense.financeRecordIds.push(financeRecord._id);

    if (paymentPlan.status === 'completed') {
      purchaseExpense.paymentStatus = 'completed';
      purchaseExpense.status = 'completed';
      console.log(`✅ All EMI payments completed!`);
    } else {
      purchaseExpense.paymentStatus = 'partial';
    }

    await purchaseExpense.save();

    res.json({
      success: true,
      message: `Installment ${installmentNumber} paid successfully`,
      paymentPlan,
      purchaseExpense
    });

  } catch (error) {
    console.error('❌ EMI payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle BNPL Payment (triggered on delivery)
router.patch('/:orderId/mark-delivered', authenticateToken, async (req, res) => {
  try {
    const Order = require('../models/Order.js').default;
    
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { 
        status: 'delivered',
        deliveryDate: new Date()
      },
      { new: true }
    );

    console.log(`📦 Order ${order.orderId} marked as delivered`);

    // Check if BNPL payment
    const paymentPlan = await PaymentPlan.findOne({ orderId: order._id });

    if (paymentPlan && paymentPlan.planType === 'bnpl') {
      console.log(`💳 Triggering BNPL payment deduction for ₹${order.totalAmount}`);

      // Create Finance record for BNPL payment
      const financeRecord = await Finance.create({
        userId: order.buyerId,
        type: 'expense',
        amount: order.totalAmount,
        category: 'shopping',
        description: `BNPL Payment - Order ${order.orderId}`,
        date: new Date(),
        tags: ['marketplace', 'bnpl', 'delivered']
      });

      console.log(`✅ Finance record created - Balance reduced by ₹${order.totalAmount}`);

      // Update purchase expense
      const purchaseExpense = await PurchaseExpense.findOne({
        orderId: order._id
      });

      purchaseExpense.deductionDetails.deductions[0].status = 'deducted';
      purchaseExpense.deductionDetails.deducted_amount = order.totalAmount;
      purchaseExpense.deductionDetails.remainingAmount = 0;
      purchaseExpense.paymentStatus = 'completed';
      purchaseExpense.financeRecordIds.push(financeRecord._id);
      await purchaseExpense.save();
    }

    res.json({
      success: true,
      order,
      message: 'Order marked as delivered'
    });

  } catch (error) {
    console.error('❌ Delivery error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

### Frontend: Checkout Page (Simplified)

```jsx
// client/src/pages/dashboard/Checkout.jsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext.jsx";

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  
  // NEW: Payment plan state
  const [paymentPlanType, setPaymentPlanType] = useState('full');
  const [emiMonths, setEmiMonths] = useState(3);

  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/cart');
      if (!data || data.items.length === 0) {
        toast.error('Your cart is empty');
        navigate('/cart');
        return;
      }
      setCart(data);
    } catch (error) {
      console.error('Fetch cart error:', error);
      toast.error('Failed to load cart');
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!shippingAddress.fullName || !shippingAddress.phone || 
        !shippingAddress.addressLine1 || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.pincode) {
      toast.error('Please fill in all required fields');
      return false;
    }

    if (!/^\d{10}$/.test(shippingAddress.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }

    if (!/^\d{6}$/.test(shippingAddress.pincode)) {
      toast.error('Please enter a valid 6-digit pincode');
      return false;
    }

    return true;
  };

  const calculateEMIAmount = () => {
    if (!cart) return 0;
    return Math.ceil(cart.totalAmount / emiMonths);
  };

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
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.error || 'Failed to place order');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="container-xxl py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4">
      <div className="mb-4">
        <h2 className="mb-1">Checkout</h2>
        <p className="text-muted mb-0">Complete your order</p>
      </div>

      <div className="row g-4">
        {/* LEFT: Form */}
        <div className="col-lg-8">
          {/* Shipping Address */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="card-title mb-0">Shipping Address</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={shippingAddress.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone Number *</label>
                  <input 
                    type="tel"
                    className="form-control"
                    placeholder="10-digit number"
                    value={shippingAddress.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Address Line 1 *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={shippingAddress.addressLine1}
                    onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Address Line 2</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={shippingAddress.addressLine2}
                    onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">City *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={shippingAddress.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">State *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={shippingAddress.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Pincode *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={shippingAddress.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* NEW: Payment Plan */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="card-title mb-0">Payment Plan</h6>
            </div>
            <div className="card-body">
              {/* Full Payment */}
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
                  <p className="text-muted small mb-0">
                    Pay {formatCurrency(cart?.totalAmount)} today
                  </p>
                </label>
              </div>

              {/* EMI */}
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
                  <strong>EMI (Easy Monthly Installments)</strong>
                  <p className="text-muted small mb-0">Pay in monthly installments with 0% interest</p>
                  {paymentPlanType === 'emi' && (
                    <select 
                      className="form-select form-select-sm mt-2"
                      value={emiMonths}
                      onChange={(e) => setEmiMonths(parseInt(e.target.value))}
                    >
                      <option value={3}>3 months - {formatCurrency(Math.ceil(cart?.totalAmount / 3))} × 3</option>
                      <option value={6}>6 months - {formatCurrency(Math.ceil(cart?.totalAmount / 6))} × 6</option>
                      <option value={12}>12 months - {formatCurrency(Math.ceil(cart?.totalAmount / 12))} × 12</option>
                    </select>
                  )}
                </label>
              </div>

              {/* BNPL */}
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
                  <p className="text-muted small mb-0">Get item now, pay after delivery (within 14 days)</p>
                </label>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Payment Method</h6>
            </div>
            <div className="card-body">
              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="radio" 
                  name="paymentMethod" 
                  id="cod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <label className="form-check-label" htmlFor="cod">
                  <strong>Cash on Delivery (COD)</strong>
                  <p className="text-muted small mb-0">Pay when you receive the item</p>
                </label>
              </div>

              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="radio" 
                  name="paymentMethod" 
                  id="upi"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <label className="form-check-label" htmlFor="upi">
                  <strong>UPI</strong>
                  <p className="text-muted small mb-0">Pay using Google Pay, PhonePe, Paytm, etc.</p>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Order Summary */}
        <div className="col-lg-4">
          <div className="card sticky-top" style={{ top: '20px' }}>
            <div className="card-header">
              <h6 className="card-title mb-0">Order Summary</h6>
            </div>
            <div className="card-body">
              {/* Items */}
              <div className="mb-3">
                <h6 className="mb-2">Items ({cart?.items.length || 0})</h6>
                {cart?.items.map((item) => (
                  <div key={item._id} className="d-flex gap-2 mb-2">
                    <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                      {item.marketplaceItemId?.images?.[0] && (
                        <img 
                          src={item.marketplaceItemId.images[0]}
                          alt={item.marketplaceItemId.title}
                          className="w-100 h-100 rounded"
                          style={{ objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <div className="flex-grow-1">
                      <p className="mb-0 small">{item.marketplaceItemId?.title}</p>
                      <small className="text-muted">Qty: {item.quantity}</small>
                    </div>
                    <div className="text-end">
                      <small>{formatCurrency(item.price * item.quantity)}</small>
                    </div>
                  </div>
                ))}
              </div>

              <hr />

              {/* Pricing */}
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <span>{formatCurrency(cart?.totalAmount || 0)}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span>Shipping</span>
                <span className="text-success">FREE</span>
              </div>
              <hr />

              {/* Payment Plan Info */}
              {paymentPlanType === 'emi' && (
                <div className="alert alert-info small mb-3">
                  <strong>EMI Breakdown:</strong><br/>
                  {emiMonths} months × {formatCurrency(calculateEMIAmount())}
                </div>
              )}
              {paymentPlanType === 'bnpl' && (
                <div className="alert alert-info small mb-3">
                  <strong>Pay after delivery:</strong><br/>
                  Due within 14 days of receiving item
                </div>
              )}

              <div className="d-flex justify-content-between mb-3">
                <span className="fw-bold">Total</span>
                <span className="fw-bold text-primary fs-5">
                  {formatCurrency(cart?.totalAmount || 0)}
                </span>
              </div>

              {/* Buttons */}
              <button 
                className="btn btn-success w-100 mb-2"
                onClick={handlePlaceOrder}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Processing...
                  </>
                ) : (
                  'Place Order'
                )}
              </button>
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => navigate('/cart')}
                disabled={processing}
              >
                Back to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Key Points Summary

### When User is SELLER
```javascript
// Income increases
await Finance.create({
  userId: sellerId,
  type: 'income',        // ✅ INCOME
  amount: salePrice,
  source: 'marketplace',
  description: `Sold item via marketplace`
});
```

### When User is BUYER - Full Payment
```javascript
// Income decreases immediately
await Finance.create({
  userId: buyerId,
  type: 'expense',       // ❌ EXPENSE
  amount: purchasePrice,
  category: 'shopping',
  description: `Marketplace purchase - Full payment`
});
```

### When User is BUYER - EMI
```javascript
// NO immediate deduction
// Created when payment plan is set up

// Deduction happens EACH MONTH
for (each month) {
  await Finance.create({
    userId: buyerId,
    type: 'expense',     // ❌ EXPENSE
    amount: monthlyAmount,
    description: `EMI installment ${monthNumber}`
  });
}
```

### When User is BUYER - BNPL
```javascript
// NO immediate deduction
// Created when payment plan is set up

// Deduction happens AFTER delivery
if (orderStatus === 'delivered') {
  await Finance.create({
    userId: buyerId,
    type: 'expense',     // ❌ EXPENSE
    amount: totalAmount,
    description: `BNPL payment after delivery`
  });
}
```

---

## Testing with cURL

```bash
# Test Full Payment Checkout
curl -X POST http://localhost:3000/api/orders/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "paymentMethod": "cod",
    "paymentPlanType": "full",
    "shippingAddress": {
      "fullName": "John Doe",
      "phone": "9876543210",
      "addressLine1": "123 Main St",
      "city": "Mumbai",
      "state": "MH",
      "pincode": "400001"
    }
  }'

# Test EMI Checkout
curl -X POST http://localhost:3000/api/orders/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "paymentMethod": "upi",
    "paymentPlanType": "emi",
    "emiMonths": 3,
    "shippingAddress": {
      "fullName": "Jane Doe",
      "phone": "9876543210",
      "addressLine1": "456 Oak Ave",
      "city": "Delhi",
      "state": "DL",
      "pincode": "110001"
    }
  }'

# Pay EMI Installment
curl -X POST http://localhost:3000/api/orders/ORD-ABC-123/pay-installment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "installmentNumber": 1,
    "transactionId": "UPI-12345",
    "paymentMethod": "upi"
  }'
```

---

## Final Notes

✅ **Full Payment** - Simplest, immediate deduction  
✅ **EMI** - Spread over months, monthly deductions  
✅ **BNPL** - Deferred, paid after delivery  

All models track deductions via `Finance` model for proper accounting!