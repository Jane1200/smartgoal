import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Marketplace from "../models/Marketplace.js";
import MarketplaceIncome from "../models/MarketplaceIncome.js";
import Wishlist from "../models/Wishlist.js";
import PaymentPlan from "../models/PaymentPlan.js";
import PurchaseExpense from "../models/PurchaseExpense.js";
import Finance from "../models/Finance.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { checkSufficientSavings, calculateProjectedSavingsWithEMI } from "../utils/financeUtils.js";
import { generateBuyerReport } from "../utils/pdfGenerator.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = Router();

// Initialize Razorpay only if credentials are provided
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized');
} else {
  console.warn('⚠️ Razorpay not configured - payment features will be disabled');
}

// Create order from cart (checkout)
router.post("/checkout", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethod, shippingAddress, paymentPlan, emiMonths } = req.body;

    // Validate payment method
    const validPaymentMethods = ["cod", "upi", "card", "netbanking", "wallet"];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: "Valid payment method is required" });
    }

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || 
        !shippingAddress.addressLine1 || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.pincode) {
      return res.status(400).json({ message: "Complete shipping address is required" });
    }

    // Validate payment plan
    const validPaymentPlans = ["full", "emi"];
    const finalPaymentPlan = paymentPlan || "full";
    if (!validPaymentPlans.includes(finalPaymentPlan)) {
      return res.status(400).json({ message: "Valid payment plan is required" });
    }

    // Get cart with full population
    let cart = await Cart.findOne({ userId });
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // ===== NEW: VALIDATE SUFFICIENT SAVINGS =====
    const totalAmount = cart.totalAmount;
    
    // TEMPORARILY DISABLED FOR TESTING - REMOVE THIS IN PRODUCTION
    // Check savings based on payment plan
    if (false && finalPaymentPlan === "full") { // Changed: if (false && ...) to disable check
      // For full payment, check if user has enough savings now
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
          },
          notification: {
            type: "error",
            title: "Insufficient Savings",
            message: `You need ₹${totalAmount.toLocaleString()} but only have ₹${savingsCheck.availableSavings.toLocaleString()} in savings. Please add ₹${savingsCheck.shortfall.toLocaleString()} more to your savings before purchasing.`
          }
        });
      }
    } else if (false && finalPaymentPlan === "emi") { // TEMPORARILY DISABLED FOR TESTING
      // For EMI, check if user can afford monthly installments
      const months = emiMonths || 3;
      const monthlyAmount = Math.ceil(totalAmount / months);
      
      const projection = await calculateProjectedSavingsWithEMI(userId, monthlyAmount, months);
      
      if (!projection.isAffordable) {
        return res.status(400).json({
          success: false,
          message: "Your projected savings may not support this EMI plan",
          error: "EMI_NOT_AFFORDABLE",
          details: {
            totalAmount,
            monthlyAmount,
            numberOfMonths: months,
            currentSavings: projection.currentSavings,
            avgMonthlySavings: projection.avgMonthlySavings,
            projection: projection.projection
          },
          notification: {
            type: "warning",
            title: "EMI Affordability Warning",
            message: `Your average monthly savings (₹${projection.avgMonthlySavings.toLocaleString()}) may not be enough to cover the ₹${monthlyAmount.toLocaleString()} monthly installment. Consider choosing a longer EMI period or full payment after saving more.`
          }
        });
      }
    } else if (finalPaymentPlan === "bnpl") {
      // For BNPL, check if user will have enough savings in 14 days
      const savingsCheck = await checkSufficientSavings(userId, totalAmount);
      
      if (!savingsCheck.hasSufficient) {
        return res.status(400).json({
          success: false,
          message: "Insufficient savings for Buy Now Pay Later",
          error: "INSUFFICIENT_SAVINGS_BNPL",
          details: {
            requiredAmount: totalAmount,
            availableSavings: savingsCheck.availableSavings,
            shortfall: savingsCheck.shortfall
          },
          notification: {
            type: "warning",
            title: "BNPL - Insufficient Savings",
            message: `You'll need to pay ₹${totalAmount.toLocaleString()} after delivery. Currently you have ₹${savingsCheck.availableSavings.toLocaleString()} in savings. Make sure to add ₹${savingsCheck.shortfall.toLocaleString()} before the payment is due.`
          }
        });
      }
    } else if (finalPaymentPlan === "split") {
      // For split payment, check immediate amount
      const splitPercent = req.body.splitPercent || 50;
      const immediateAmount = Math.ceil((totalAmount * splitPercent) / 100);
      
      const savingsCheck = await checkSufficientSavings(userId, immediateAmount);
      
      if (!savingsCheck.hasSufficient) {
        return res.status(400).json({
          success: false,
          message: "Insufficient savings for immediate split payment",
          error: "INSUFFICIENT_SAVINGS_SPLIT",
          details: {
            totalAmount,
            immediateAmount,
            availableSavings: savingsCheck.availableSavings,
            shortfall: savingsCheck.shortfall
          },
          notification: {
            type: "error",
            title: "Insufficient Savings",
            message: `You need ₹${immediateAmount.toLocaleString()} now for the ${splitPercent}% upfront payment, but only have ₹${savingsCheck.availableSavings.toLocaleString()} in savings.`
          }
        });
      }
    }

    // Fully populate cart items with marketplace info and seller info
    await cart.populate({
      path: 'items.marketplaceItemId',
      populate: {
        path: 'userId',
        select: 'name email avatar'
      }
    });

    // Verify all items are still available
    for (const item of cart.items) {
      if (!item.marketplaceItemId) {
        return res.status(400).json({ 
          message: `Cart contains invalid item reference` 
        });
      }
      
      const marketplaceItem = await Marketplace.findById(item.marketplaceItemId._id);
      
      if (!marketplaceItem || marketplaceItem.status !== 'active') {
        const itemTitle = item.marketplaceItemId?.title || 'Unknown item';
        return res.status(400).json({ 
          message: `Item "${itemTitle}" is no longer available` 
        });
      }
    }

    // Create order
    const order = await Order.createFromCart(userId, cart, paymentMethod, shippingAddress);

    // If COD, mark as confirmed immediately
    if (paymentMethod === 'cod') {
      order.status = 'confirmed';
      order.paymentStatus = 'pending';
      await order.save();
    }

    // Handle payment plan and create deductions
    let paymentPlanRecord = null;
    let purchaseExpenseRecord = null;

    if (finalPaymentPlan === "full") {
      // Full Payment: Create payment plan and deduct immediately
      paymentPlanRecord = await PaymentPlan.create({
        orderId: order._id,
        buyerId: userId,
        totalAmount: cart.totalAmount,
        planType: "full",
        installments: [{
          installmentNumber: 1,
          amount: cart.totalAmount,
          dueDate: new Date(),
          status: "paid",
          paidDate: new Date()
        }],
        totalPaid: cart.totalAmount,
        pendingAmount: 0,
        status: "completed"
      });

      // Create purchase expense record
      purchaseExpenseRecord = await PurchaseExpense.create({
        buyerId: userId,
        orderId: order._id,
        paymentPlanId: paymentPlanRecord._id,
        totalAmount: cart.totalAmount,
        deductionDetails: {
          deducted_amount: cart.totalAmount,
          remainingAmount: 0,
          deductions: [{
            amount: cart.totalAmount,
            date: new Date(),
            reason: "full_payment",
            status: "deducted"
          }]
        },
        paymentStatus: "completed",
        status: "completed"
      });

      // Create Finance record for immediate deduction (expense)
      const financeRecord = await Finance.create({
        userId,
        type: "expense",
        amount: cart.totalAmount,
        category: "shopping",
        description: `Marketplace purchase - Order ${order.orderId}`,
        date: new Date(),
        tags: ["marketplace", "purchase"]
      });

      // Link finance record to purchase expense
      purchaseExpenseRecord.financeRecordIds.push(financeRecord._id);
      await purchaseExpenseRecord.save();

    } else if (finalPaymentPlan === "emi") {
      // EMI: Create payment plan with monthly installments
      const months = emiMonths || 3;
      const monthlyAmount = Math.ceil(cart.totalAmount / months);

      paymentPlanRecord = await PaymentPlan.create(
        PaymentPlan.schema.statics.createEMISchedule(
          order._id,
          userId,
          cart.totalAmount,
          months,
          0 // No interest for now
        )
      );

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
        status: "active"
      });

      // Note: Finance deductions for EMI will be created when each payment is made
      // This will be handled by a separate endpoint for recording EMI payments

    } else if (finalPaymentPlan === "bnpl") {
      // BNPL: Create payment plan with payment due after delivery
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 5); // Estimated delivery in 5 days

      paymentPlanRecord = await PaymentPlan.create(
        PaymentPlan.schema.statics.createBNPLSchedule(
          order._id,
          userId,
          cart.totalAmount,
          deliveryDate
        )
      );

      // Create purchase expense record
      purchaseExpenseRecord = await PurchaseExpense.create({
        buyerId: userId,
        orderId: order._id,
        paymentPlanId: paymentPlanRecord._id,
        totalAmount: cart.totalAmount,
        deductionDetails: {
          deducted_amount: 0,
          remainingAmount: cart.totalAmount,
          deductions: [{
            amount: cart.totalAmount,
            date: new Date(),
            reason: "bnpl_payment",
            status: "pending"
          }]
        },
        paymentStatus: "pending",
        status: "active",
        notes: `Payment due after delivery. Delivery expected by ${deliveryDate.toDateString()}`
      });

      // Note: Finance deduction for BNPL will be created after delivery confirmation
    }

    // Mark marketplace items as pending/sold
    // If COD or full payment, mark as sold immediately
    // Otherwise mark as pending until payment is confirmed
    const itemStatus = (paymentMethod === 'cod' || finalPaymentPlan === 'full') ? 'sold' : 'pending';
    const sellerIncomes = {}; // { sellerId: { amount, items: [] } }
    
    for (const item of cart.items) {
      const itemId = item.marketplaceItemId?._id || item.marketplaceItemId;
      const marketplaceItem = await Marketplace.findById(itemId);
      if (marketplaceItem) {
        marketplaceItem.status = itemStatus;
        await marketplaceItem.save();
        console.log(`✅ Marked item ${marketplaceItem.title} as ${itemStatus.toUpperCase()}`);
        
        // Collect seller income data (only if sold immediately)
        if (itemStatus === 'sold') {
          const sellerId = item.sellerId?.toString() || marketplaceItem.userId?.toString();
          console.log(`📊 Seller ID extraction: item.sellerId=${item.sellerId}, marketplaceItem.userId=${marketplaceItem.userId}, final=${sellerId}`);
          if (sellerId) {
            if (!sellerIncomes[sellerId]) {
              sellerIncomes[sellerId] = { amount: 0, items: [] };
            }
            sellerIncomes[sellerId].amount += (item.price * item.quantity);
            sellerIncomes[sellerId].items.push(item.title || marketplaceItem.title);
          } else {
            console.error(`❌ No seller ID found for item: ${marketplaceItem.title}`);
          }
        }
      }
    }
    
    // Create income entries for sellers (goal setters) if items were sold immediately
    if (itemStatus === 'sold') {
      for (const [sellerId, incomeData] of Object.entries(sellerIncomes)) {
        try {
          const incomeEntry = await Finance.create({
            userId: sellerId,
            type: 'income',
            amount: incomeData.amount,
            source: 'marketplace-sale',
            description: `Marketplace sale: ${incomeData.items.join(', ')} - Order ${order.orderId}`,
            date: new Date(),
            tags: ['marketplace', 'sale', 'income']
          });
          console.log(`✅ Created income entry for seller ${sellerId}: ₹${incomeData.amount}`);
        } catch (error) {
          console.error(`❌ Failed to create income for seller ${sellerId}:`, error);
        }
      }
    }

    // Clear cart
    await cart.clearCart();

    // Populate order data
    const populatedOrder = await Order.findById(order._id)
      .populate('items.sellerId', 'name email avatar')
      .populate('buyerId', 'name email');

    res.json({
      message: "Order placed successfully",
      order: populatedOrder,
      paymentPlan: {
        id: paymentPlanRecord._id,
        type: finalPaymentPlan,
        details: paymentPlanRecord
      }
    });
  } catch (error) {
    console.error("Checkout error:", error.message);
    console.error("Error stack:", error.stack);
    console.error("Full error:", error);
    res.status(500).json({ 
      message: "Failed to create order",
      error: error.message 
    });
  }
});

// Create Razorpay order for UPI payment
router.post("/create-razorpay-order", requireAuth, async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    // Create Razorpay order
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: orderId || `order_${Date.now()}`,
      payment_capture: 1 // Auto capture payment
    };

    const razorpayOrder = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to create Razorpay order",
      error: error.message 
    });
  }
});

// Verify Razorpay payment
router.post("/verify-razorpay-payment", requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    
    // Debug logging
    console.log("🔍 Payment verification request:", {
      razorpay_order_id,
      razorpay_payment_id,
      orderId,
      has_signature: !!razorpay_signature,
      has_secret: !!process.env.RAZORPAY_KEY_SECRET
    });
    
    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      console.error("❌ Missing required fields:", { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId });
      return res.status(400).json({ 
        success: false, 
        message: "Missing required payment verification fields" 
      });
    }
    
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("❌ RAZORPAY_KEY_SECRET not found in environment!");
      return res.status(500).json({ 
        success: false, 
        message: "Payment gateway configuration error" 
      });
    }
    
    // Verify signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');
    
    console.log("🔐 Signature verification:", {
      expected: expectedSignature,
      received: razorpay_signature,
      match: expectedSignature === razorpay_signature
    });
    
    if (expectedSignature === razorpay_signature) {
      // Payment is verified, update order status
      const order = await Order.findById(orderId).populate('items.marketplaceItemId');
      if (order) {
        console.log("✅ Order found, updating status:", orderId);
        
        // Use the built-in confirmPayment method
        await order.confirmPayment(razorpay_payment_id, 'razorpay');
        
        // Store additional Razorpay details
        order.razorpayOrderId = razorpay_order_id;
        order.razorpayPaymentId = razorpay_payment_id;
        await order.save();
        
        // Mark marketplace items as SOLD (payment confirmed)
        // AND create income for goal setters
        const sellerIncomes = {}; // { sellerId: { amount, items: [] } }
        
        for (const item of order.items) {
          const itemId = item.marketplaceItemId?._id || item.marketplaceItemId;
          if (itemId) {
            const marketplaceItem = await Marketplace.findById(itemId);
            if (marketplaceItem && marketplaceItem.status === 'pending') {
              marketplaceItem.status = 'sold';
              await marketplaceItem.save();
              console.log(`✅ Marked item ${marketplaceItem.title} as SOLD`);
              
              // Collect seller income data
              const sellerId = item.sellerId?.toString() || marketplaceItem.userId?.toString();
              console.log(`📊 [Razorpay] Seller ID extraction: item.sellerId=${item.sellerId}, marketplaceItem.userId=${marketplaceItem.userId}, final=${sellerId}`);
              if (sellerId) {
                if (!sellerIncomes[sellerId]) {
                  sellerIncomes[sellerId] = { amount: 0, items: [] };
                }
                sellerIncomes[sellerId].amount += (item.price * item.quantity);
                sellerIncomes[sellerId].items.push(item.title || marketplaceItem.title);
              } else {
                console.error(`❌ [Razorpay] No seller ID found for item: ${marketplaceItem.title}`);
              }
            }
          }
        }
        
        // Create income entries for each seller (goal setter)
        for (const [sellerId, incomeData] of Object.entries(sellerIncomes)) {
          try {
            const incomeEntry = await Finance.create({
              userId: sellerId,
              type: 'income',
              amount: incomeData.amount,
              source: 'marketplace-sale',
              description: `Marketplace sale: ${incomeData.items.join(', ')} - Order ${order.orderId}`,
              date: new Date(),
              tags: ['marketplace', 'sale', 'income']
            });
            console.log(`✅ Created income entry for seller ${sellerId}: ₹${incomeData.amount}`);
          } catch (error) {
            console.error(`❌ Failed to create income for seller ${sellerId}:`, error);
          }
        }
        
        console.log("✅ Payment verified successfully for order:", orderId);
        
        res.json({
          success: true,
          message: "Payment verified successfully",
          order
        });
      } else {
        console.error("❌ Order not found:", orderId);
        res.status(404).json({ success: false, message: "Order not found" });
      }
    } else {
      console.error("❌ Signature mismatch!");
      res.status(400).json({ 
        success: false, 
        message: "Payment verification failed - Invalid signature" 
      });
    }
  } catch (error) {
    console.error("❌ Payment verification error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false,
      message: "Failed to verify payment",
      error: error.message 
    });
  }
});

// Record EMI payment and create Finance deduction
router.post("/:orderId/pay-emi-installment", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { installmentNumber, transactionId, paymentMethod: payMethod } = req.body;

    // Find the payment plan
    const paymentPlan = await PaymentPlan.findOne({ orderId, buyerId: userId });
    if (!paymentPlan) {
      return res.status(404).json({ message: "Payment plan not found" });
    }

    if (paymentPlan.planType !== "emi") {
      return res.status(400).json({ message: "This order is not an EMI payment plan" });
    }

    // Find the installment
    const installment = paymentPlan.installments.find(
      inst => inst.installmentNumber === installmentNumber
    );

    if (!installment) {
      return res.status(404).json({ message: "Installment not found" });
    }

    if (installment.status === "paid") {
      return res.status(400).json({ message: "This installment has already been paid" });
    }

    // Update installment status
    installment.status = "paid";
    installment.paidDate = new Date();
    installment.transactionId = transactionId;
    installment.paymentMethod = payMethod || "other";

    paymentPlan.totalPaid += installment.amount;
    paymentPlan.pendingAmount -= installment.amount;

    if (paymentPlan.pendingAmount <= 0) {
      paymentPlan.status = "completed";
    }

    await paymentPlan.save();

    // Create Finance record for this installment deduction
    const financeRecord = await Finance.create({
      userId,
      type: "expense",
      amount: installment.amount,
      category: "shopping",
      description: `EMI Payment ${installmentNumber} - Order ${orderId}`,
      date: new Date(),
      tags: ["marketplace", "purchase", "emi", `installment_${installmentNumber}`]
    });

    // Update purchase expense record
    const purchaseExpense = await PurchaseExpense.findOne({ orderId, buyerId: userId });
    if (purchaseExpense) {
      purchaseExpense.deductionDetails.deductions.push({
        amount: installment.amount,
        date: new Date(),
        reason: `emi_installment_${installmentNumber}`,
        installmentNumber,
        status: "deducted"
      });

      purchaseExpense.deductionDetails.deducted_amount += installment.amount;
      purchaseExpense.deductionDetails.remainingAmount -= installment.amount;

      if (paymentPlan.status === "completed") {
        purchaseExpense.paymentStatus = "completed";
        purchaseExpense.status = "completed";
      } else {
        purchaseExpense.paymentStatus = "partial";
      }

      purchaseExpense.financeRecordIds.push(financeRecord._id);
      await purchaseExpense.save();
    }

    res.json({
      message: `EMI installment ${installmentNumber} paid successfully`,
      paymentPlan,
      financeRecordId: financeRecord._id
    });
  } catch (error) {
    console.error("EMI payment error:", error);
    res.status(500).json({ message: "Failed to record EMI payment", error: error.message });
  }
});

// Trigger BNPL deduction after delivery confirmation
router.post("/:orderId/confirm-bnpl-payment", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Find the payment plan
    const paymentPlan = await PaymentPlan.findOne({ orderId, buyerId: userId });
    if (!paymentPlan) {
      return res.status(404).json({ message: "Payment plan not found" });
    }

    if (paymentPlan.planType !== "bnpl") {
      return res.status(400).json({ message: "This order is not a BNPL payment plan" });
    }

    // Get the BNPL installment
    const installment = paymentPlan.installments[0];
    if (!installment) {
      return res.status(404).json({ message: "BNPL installment not found" });
    }

    // Mark as paid
    installment.status = "paid";
    installment.paidDate = new Date();

    paymentPlan.totalPaid = installment.amount;
    paymentPlan.pendingAmount = 0;
    paymentPlan.status = "completed";

    await paymentPlan.save();

    // Create Finance record for BNPL deduction (only after delivery)
    const financeRecord = await Finance.create({
      userId,
      type: "expense",
      amount: installment.amount,
      category: "shopping",
      description: `BNPL Payment - Order ${orderId} (Delivery Confirmed)`,
      date: new Date(),
      tags: ["marketplace", "purchase", "bnpl"]
    });

    // Update purchase expense record
    const purchaseExpense = await PurchaseExpense.findOne({ orderId, buyerId: userId });
    if (purchaseExpense) {
      purchaseExpense.deductionDetails.deductions[0].status = "deducted";
      purchaseExpense.deductionDetails.deducted_amount = installment.amount;
      purchaseExpense.deductionDetails.remainingAmount = 0;
      purchaseExpense.paymentStatus = "completed";
      purchaseExpense.status = "completed";
      purchaseExpense.financeRecordIds.push(financeRecord._id);
      await purchaseExpense.save();
    }

    res.json({
      message: "BNPL payment confirmed and deducted successfully",
      paymentPlan,
      financeRecordId: financeRecord._id
    });
  } catch (error) {
    console.error("BNPL confirmation error:", error);
    res.status(500).json({ message: "Failed to confirm BNPL payment", error: error.message });
  }
});

// Process payment (for online payment methods)
router.post("/:orderId/payment", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { transactionId, paymentGateway } = req.body;

    const order = await Order.findOne({ _id: orderId, buyerId: userId });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === 'completed') {
      return res.status(400).json({ message: "Payment already completed" });
    }

    // Confirm payment
    await order.confirmPayment(transactionId, paymentGateway);

    // Mark marketplace items as sold and create income entries
    for (const item of order.items) {
      const marketplaceItem = await Marketplace.findById(item.marketplaceItemId);
      if (marketplaceItem) {
        await marketplaceItem.markAsSold(userId);

        // Create marketplace income entry for the seller
        const sellerId = item.sellerId;
        await MarketplaceIncome.create({
          sellerId,
          marketplaceItemId: marketplaceItem._id,
          orderId: order._id,
          itemTitle: marketplaceItem.title,
          amount: item.price,
          status: "confirmed",
          soldAt: new Date()
        });
      }
    }

    const updatedOrder = await Order.findById(order._id)
      .populate('items.sellerId', 'name email avatar')
      .populate('buyerId', 'name email');

    res.json({
      message: "Payment confirmed successfully",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Payment confirmation error:", error);
    res.status(500).json({ message: "Failed to confirm payment" });
  }
});

// Get buyer stats
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get order stats
    const orders = await Order.find({ buyerId: userId });
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Get wishlist stats
    const wishlistItems = await Wishlist.find({ userId, status: "wishlist" });
    const savedItems = wishlistItems.length;

    // Get active watches (items being watched - for now using saved items count)
    const activeWatches = wishlistItems.filter(item => item.priority === "high").length;

    res.json({
      totalOrders,
      totalSpent,
      savedItems,
      activeWatches
    });
  } catch (error) {
    console.error("Get buyer stats error:", error);
    res.status(500).json({ message: "Failed to fetch buyer stats" });
  }
});

// Get buyer's orders (default route without /my-orders for dashboard)
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.getBuyerOrders(userId);
    res.json(orders);
  } catch (error) {
    console.error("Get buyer orders error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Get buyer's orders
router.get("/my-orders", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.getBuyerOrders(userId);
    res.json(orders);
  } catch (error) {
    console.error("Get buyer orders error:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Get seller's orders (items they sold)
router.get("/seller-orders", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.getSellerOrders(userId);
    res.json(orders);
  } catch (error) {
    console.error("Get seller orders error:", error);
    res.status(500).json({ message: "Failed to fetch seller orders" });
  }
});

// Get single order details
router.get("/:orderId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({
      $or: [
        { _id: orderId, buyerId: userId },
        { _id: orderId, 'items.sellerId': userId }
      ]
    })
    .populate('items.sellerId', 'name email avatar')
    .populate('buyerId', 'name email avatar');

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

// Cancel order
router.post("/:orderId/cancel", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ _id: orderId, buyerId: userId });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({ message: "Cannot cancel this order" });
    }

    await order.cancelOrder(reason || 'Cancelled by buyer');

    // Mark marketplace items as active again
    for (const item of order.items) {
      const marketplaceItem = await Marketplace.findById(item.marketplaceItemId);
      if (marketplaceItem && marketplaceItem.status === 'pending') {
        marketplaceItem.status = 'active';
        await marketplaceItem.save();
      }
    }

    const updatedOrder = await Order.findById(order._id)
      .populate('items.sellerId', 'name email avatar')
      .populate('buyerId', 'name email');

    res.json({
      message: "Order cancelled successfully",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ message: "Failed to cancel order" });
  }
});

// Update order status (for sellers)
router.put("/:orderId/status", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ["confirmed", "processing", "shipped", "delivered"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Valid status is required" });
    }

    const order = await Order.findOne({ 
      _id: orderId, 
      'items.sellerId': userId 
    });
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await order.updateStatus(status);

    const updatedOrder = await Order.findById(order._id)
      .populate('items.sellerId', 'name email avatar')
      .populate('buyerId', 'name email');

    res.json({
      message: "Order status updated successfully",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
});

// Get payment plan details
router.get("/:orderId/payment-plan", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const paymentPlan = await PaymentPlan.findOne({ orderId, buyerId: userId });
    if (!paymentPlan) {
      return res.status(404).json({ message: "Payment plan not found" });
    }

    const purchaseExpense = await PurchaseExpense.findOne({ orderId, buyerId: userId });

    res.json({
      paymentPlan,
      purchaseExpense,
      summary: {
        planType: paymentPlan.planType,
        totalAmount: paymentPlan.totalAmount,
        totalPaid: paymentPlan.totalPaid,
        pendingAmount: paymentPlan.pendingAmount,
        status: paymentPlan.status,
        installments: paymentPlan.planType === "emi" ? {
          total: paymentPlan.installments.length,
          paid: paymentPlan.installments.filter(i => i.status === "paid").length,
          pending: paymentPlan.installments.filter(i => i.status === "pending").length,
          schedule: paymentPlan.installments.map(i => ({
            number: i.installmentNumber,
            amount: i.amount,
            dueDate: i.dueDate,
            status: i.status,
            paidDate: i.paidDate
          }))
        } : paymentPlan.planType === "bnpl" ? {
          paymentDueDate: paymentPlan.bnplDetails.paymentDueDate,
          deliveryDate: paymentPlan.bnplDetails.deliveryDate,
          status: paymentPlan.installments[0]?.status
        } : null
      }
    });
  } catch (error) {
    console.error("Get payment plan error:", error);
    res.status(500).json({ message: "Failed to fetch payment plan" });
  }
});

// Get buyer purchase expenses summary
router.get("/expenses/summary", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const expenses = await PurchaseExpense.find({ buyerId: userId })
      .populate("orderId", "orderId totalAmount status items")
      .sort({ createdAt: -1 });

    const summary = await PurchaseExpense.aggregate([
      { $match: { buyerId: require("mongoose").Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: "$totalAmount" },
          totalDeducted: { $sum: "$deductionDetails.deducted_amount" },
          totalRemaining: { $sum: "$deductionDetails.remainingAmount" },
          completedPurchases: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          activePurchases: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      expenses,
      summary: summary[0] || {
        totalExpenses: 0,
        totalDeducted: 0,
        totalRemaining: 0,
        completedPurchases: 0,
        activePurchases: 0
      }
    });
  } catch (error) {
    console.error("Get expenses summary error:", error);
    res.status(500).json({ message: "Failed to fetch expenses summary" });
  }
});

// Delete a cancelled order
router.delete("/:orderId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Find the order
    const order = await Order.findOne({ _id: orderId, buyerId: userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only allow deletion of cancelled orders
    if (order.status !== "cancelled") {
      return res.status(400).json({ 
        message: "Only cancelled orders can be deleted. Please cancel the order first." 
      });
    }

    // Delete related payment plan
    await PaymentPlan.deleteMany({ orderId: order._id });

    // Delete related purchase expense
    await PurchaseExpense.deleteMany({ orderId: order._id });

    // Delete the order
    await Order.findByIdAndDelete(orderId);

    res.json({ 
      success: true, 
      message: "Order deleted successfully" 
    });
  } catch (error) {
    console.error("Delete order error:", error);
    res.status(500).json({ 
      message: "Failed to delete order",
      error: error.message 
    });
  }
});

// Recreate cart from pending order (for retry payment)
router.post("/:orderId/recreate-cart", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    console.log(`🔄 Recreating cart from order ${orderId}...`);

    // Find the order
    const order = await Order.findOne({ _id: orderId, buyerId: userId })
      .populate('items.marketplaceItemId');
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only allow recreation for pending orders
    if (order.status !== "pending") {
      return res.status(400).json({ 
        message: "Only pending orders can be retried. This order is already processed." 
      });
    }

    // Mark marketplace items back to active (from pending)
    for (const orderItem of order.items) {
      const itemId = orderItem.marketplaceItemId?._id || orderItem.marketplaceItemId;
      if (itemId) {
        const marketplaceItem = await Marketplace.findById(itemId);
        if (marketplaceItem && marketplaceItem.status === 'pending') {
          marketplaceItem.status = 'active';
          await marketplaceItem.save();
          console.log(`✅ Reverted item ${marketplaceItem.title} to ACTIVE`);
        }
      }
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Clear existing cart items
    cart.items = [];

    // Add order items to cart
    for (const orderItem of order.items) {
      // Check if marketplace item still exists and is available
      const marketplaceItem = await Marketplace.findById(orderItem.marketplaceItemId);
      
      if (!marketplaceItem) {
        return res.status(400).json({ 
          message: `Item "${orderItem.title}" is no longer available` 
        });
      }

      if (marketplaceItem.status !== "active") {
        return res.status(400).json({ 
          message: `Item "${orderItem.title}" is not available for purchase` 
        });
      }

      // Add to cart
      cart.items.push({
        marketplaceItemId: orderItem.marketplaceItemId,
        sellerId: orderItem.sellerId,
        quantity: orderItem.quantity,
        price: marketplaceItem.price // Use current price
      });
    }

    // Calculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    await cart.save();

    // Populate cart for response
    await cart.populate('items.marketplaceItemId');

    // Cancel the old order since we're retrying
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = 'User retrying payment with new order';
    await order.save();

    console.log(`✅ Cart recreated: ${cart.items.length} items, old order cancelled`);

    res.json({ 
      success: true, 
      message: "Items added to cart successfully",
      cart 
    });
  } catch (error) {
    console.error("Recreate cart error:", error);
    res.status(500).json({ 
      message: "Failed to recreate cart",
      error: error.message 
    });
  }
});

// Handle payment failure/cancellation - rollback order and add items to cart
router.post("/:orderId/payment-failed", requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    console.log(`💔 Payment failed for order ${orderId}, rolling back...`);

    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify order belongs to user
    if (order.buyerId.toString() !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only process if order is pending
    if (order.status !== "pending") {
      return res.status(400).json({ 
        message: "Order is not in pending status" 
      });
    }

    // Mark marketplace items back to active (rollback from pending)
    for (const item of order.items) {
      const itemId = item.marketplaceItemId?._id || item.marketplaceItemId;
      if (itemId) {
        const marketplaceItem = await Marketplace.findById(itemId);
        if (marketplaceItem && marketplaceItem.status === 'pending') {
          marketplaceItem.status = 'active';
          await marketplaceItem.save();
          console.log(`✅ Reverted item ${marketplaceItem.title} back to ACTIVE`);
        }
      }
    }

    // Find or create cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Clear existing cart items
    cart.items = [];

    // Add order items back to cart
    for (const orderItem of order.items) {
      const marketplaceItem = await Marketplace.findById(orderItem.marketplaceItemId);
      
      if (marketplaceItem && marketplaceItem.status === 'active') {
        cart.items.push({
          marketplaceItemId: orderItem.marketplaceItemId,
          sellerId: orderItem.sellerId,
          quantity: orderItem.quantity,
          price: marketplaceItem.price
        });
      }
    }

    // Calculate totals
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    await cart.save();
    await cart.populate('items.marketplaceItemId');

    // Update order status to cancelled
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = 'Payment failed/cancelled by user';
    await order.save();

    console.log(`✅ Payment failure handled: Order cancelled, ${cart.items.length} items added back to cart`);

    res.json({ 
      success: true, 
      message: "Items have been added back to your cart",
      cart,
      itemsCount: cart.items.length
    });
  } catch (error) {
    console.error("❌ Payment failure handler error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      message: "Failed to process payment failure",
      error: error.message 
    });
  }
});

// Utility endpoint to retroactively create income for sold marketplace items
router.post("/sync-marketplace-income", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`🔄 Starting marketplace income sync for user ${userId}...`);
    
    // Find all confirmed/completed orders that contain this user's marketplace items
    const orders = await Order.find({
      status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] },
      paymentStatus: 'completed'
    })
    .populate('items.sellerId')
    .populate('items.marketplaceItemId');
    
    console.log(`📊 Found ${orders.length} completed orders to check`);
    
    let incomesCreated = 0;
    let totalAmount = 0;
    const processedItems = [];
    
    for (const order of orders) {
      console.log(`🔍 Checking order ${order.orderId} with ${order.items.length} items`);
      
      for (const item of order.items) {
        // Check if this item belongs to the current user (goal setter)
        const sellerId = item.sellerId?._id?.toString() || item.sellerId?.toString();
        
        console.log(`   Item: ${item.title}, Seller ID: ${sellerId}, Current User: ${userId}, Match: ${sellerId === userId}`);
        
        if (sellerId === userId) {
          // Check if income already exists for this order item
          const existingIncome = await Finance.findOne({
            userId: userId,
            type: 'income',
            source: 'marketplace-sale',
            description: { $regex: order.orderId }
          });
          
          if (!existingIncome) {
            // Create income entry
            const itemTitle = item.title || item.marketplaceItemId?.title || 'Marketplace item';
            const incomeAmount = item.price * item.quantity;
            
            console.log(`💰 Creating income entry for ${itemTitle}: ₹${incomeAmount}`);
            
            const incomeData = {
              userId: userId,
              type: 'income',
              amount: incomeAmount,
              source: 'marketplace-sale',
              description: `Marketplace sale: ${itemTitle} - Order ${order.orderId}`,
              date: order.paymentDetails?.paidAt || order.createdAt
            };
            
            // Only add tags if Finance model supports it
            try {
              incomeData.tags = ['marketplace', 'sale', 'income', 'synced'];
            } catch (e) {
              console.log("   Tags not supported, creating without tags");
            }
            
            await Finance.create(incomeData);
            
            incomesCreated++;
            totalAmount += incomeAmount;
            processedItems.push({
              orderId: order.orderId,
              item: itemTitle,
              amount: incomeAmount
            });
            
            console.log(`✅ Created retroactive income: ${itemTitle} - ₹${incomeAmount}`);
          } else {
            console.log(`   Income already exists for order ${order.orderId}`);
          }
        }
      }
    }
    
    console.log(`✅ Sync complete: ${incomesCreated} incomes created, total: ₹${totalAmount}`);
    
    res.json({
      success: true,
      message: `Sync completed! Created ${incomesCreated} income entries.`,
      incomesCreated,
      totalAmount,
      items: processedItems
    });
  } catch (error) {
    console.error("❌ Sync marketplace income error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to sync marketplace income",
      error: error.message,
      details: error.stack
    });
  }
});

// Generate Monthly PDF Report for Buyers
router.get("/generate-buyer-report", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data
    const user = await User.findById(userId).select('name email profile');
    
    // Get all orders
    const orders = await Order.find({ buyerId: userId })
      .populate('items.listingId')
      .sort({ createdAt: -1 });
    
    // Get finance summary
    const currentDate = new Date();
    const financeSummary = await Finance.getUserFinanceSummary(userId, {
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear()
    });
    
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    financeSummary.forEach(item => {
      if (item._id === 'income') monthlyIncome = item.total;
      if (item._id === 'expense') monthlyExpense = item.total;
    });
    
    const monthlySavings = monthlyIncome - monthlyExpense;
    
    // Calculate total spent and order count
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
    
    // Calculate current month spending
    const currentMonth = currentDate.getMonth();
    const monthlySpending = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === currentMonth;
    }).reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    // Calculate category breakdown
    const categoryBreakdown = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        const category = item.category || 'Uncategorized';
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + (item.price || 0);
      });
    });
    
    const categoryBreakdownArray = Object.entries(categoryBreakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    // Get top purchases
    const topPurchases = orders
      .slice(0, 5)
      .map(order => ({
        title: order.items?.[0]?.title || 'Unknown Item',
        price: order.totalAmount,
        date: order.createdAt,
        category: order.items?.[0]?.category
      }));
    
    // Prepare buyer analytics data for PDF
    const buyerAnalytics = {
      overview: {
        totalSpent,
        totalOrders,
        avgOrderValue,
        monthlySpending,
        availableSavings: monthlySavings
      },
      categoryBreakdown: categoryBreakdownArray,
      topPurchases
    };
    
    const userData = {
      name: user.name || user.profile?.name,
      email: user.email
    };
    
    // Generate PDF
    const pdfBuffer = await generateBuyerReport(userData, buyerAnalytics);
    
    // Set response headers for PDF download
    const filename = `SmartGoal_Buyer_Report_${currentDate.toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Generate buyer report error:', error);
    res.status(500).json({ message: 'Failed to generate buyer report' });
  }
});

export default router;