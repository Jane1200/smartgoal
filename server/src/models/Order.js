import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  marketplaceItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Marketplace",
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  image: String
});

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "pending"
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "upi", "card", "netbanking", "wallet"],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending"
    },
    paymentDetails: {
      transactionId: String,
      paidAt: Date,
      paymentGateway: String
    },
    shippingAddress: {
      fullName: String,
      phone: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: "India" }
    },
    deliveryDate: Date,
    trackingNumber: String,
    notes: String,
    cancelledAt: Date,
    cancelReason: String
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generate unique order ID
orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.orderId = `ORD-${timestamp}-${random}`;
  }
  next();
});

// Virtual for formatted total
orderSchema.virtual('formattedTotal').get(function() {
  return `₹${this.totalAmount.toLocaleString()}`;
});

// Instance methods
orderSchema.methods.confirmPayment = function(transactionId, paymentGateway) {
  this.paymentStatus = 'completed';
  this.paymentDetails = {
    transactionId,
    paidAt: new Date(),
    paymentGateway
  };
  this.status = 'confirmed';
  return this.save();
};

orderSchema.methods.cancelOrder = function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;
  return this.save();
};

orderSchema.methods.updateStatus = function(status) {
  this.status = status;
  if (status === 'delivered') {
    this.deliveryDate = new Date();
  }
  return this.save();
};

// Static methods
orderSchema.statics.createFromCart = async function(buyerId, cart, paymentMethod, shippingAddress) {
  try {
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty or invalid');
    }

    const items = cart.items.map((item, index) => {
      if (!item.marketplaceItemId) {
        throw new Error(`Item at index ${index} is missing marketplace reference`);
      }

      const mItem = item.marketplaceItemId;

      // Extract seller ID from userId - could be ObjectId or populated User object
      let sellerId = mItem.userId;
      if (typeof sellerId === 'object' && sellerId !== null) {
        sellerId = sellerId._id || sellerId;
      }

      if (!sellerId) {
        throw new Error(`Seller ID not found for item: ${mItem.title}`);
      }

      return {
        marketplaceItemId: mItem._id,
        sellerId: sellerId.toString ? sellerId.toString() : sellerId,
        title: mItem.title || 'Unknown Item',
        price: item.price || 0,
        quantity: item.quantity || 1,
        image: mItem.images?.[0]?.url || ''
      };
    });

    // Generate orderId upfront to avoid pre-save hook timing issues
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderId = `ORD-${timestamp}-${random}`;

    const order = await this.create({
      orderId,
      buyerId,
      items,
      totalAmount: cart.totalAmount || 0,
      paymentMethod,
      shippingAddress
    });

    return order;
  } catch (error) {
    console.error('Order creation error details:', {
      message: error.message,
      stack: error.stack,
      cartItems: cart?.items?.length,
      buyerId
    });
    throw new Error(`Failed to create order: ${error.message}`);
  }
};

orderSchema.statics.getBuyerOrders = function(buyerId) {
  return this.find({ buyerId })
    .populate('items.sellerId', 'name email avatar')
    .sort({ createdAt: -1 });
};

orderSchema.statics.getSellerOrders = function(sellerId) {
  return this.find({ 'items.sellerId': sellerId })
    .populate('buyerId', 'name email avatar')
    .sort({ createdAt: -1 });
};

export default mongoose.model("Order", orderSchema);