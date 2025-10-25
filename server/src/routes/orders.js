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

const router = Router();

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
    const validPaymentPlans = ["full", "emi", "bnpl"];
    const finalPaymentPlan = paymentPlan || "full";
    if (!validPaymentPlans.includes(finalPaymentPlan)) {
      return res.status(400).json({ message: "Valid payment plan is required" });
    }

    // Get cart with full population
    let cart = await Cart.findOne({ userId });
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
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
    for (const item of cart.items) {
      const itemId = item.marketplaceItemId?._id || item.marketplaceItemId;
      const marketplaceItem = await Marketplace.findById(itemId);
      if (marketplaceItem) {
        marketplaceItem.status = 'pending';
        await marketplaceItem.save();
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

export default router;