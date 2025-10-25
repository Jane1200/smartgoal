import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  marketplaceItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Marketplace",
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      default: 0
    },
    totalItems: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Calculate totals before saving
cartSchema.pre('save', function(next) {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalAmount = this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  next();
});

// Instance methods
cartSchema.methods.addItem = async function(marketplaceItemId, price, quantity = 1) {
  const existingItemIndex = this.items.findIndex(
    item => item.marketplaceItemId.toString() === marketplaceItemId.toString()
  );

  if (existingItemIndex > -1) {
    // Update quantity if item already exists
    this.items[existingItemIndex].quantity += quantity;
  } else {
    // Add new item
    this.items.push({
      marketplaceItemId,
      price,
      quantity
    });
  }

  return this.save();
};

cartSchema.methods.removeItem = async function(marketplaceItemId) {
  this.items = this.items.filter(
    item => item.marketplaceItemId.toString() !== marketplaceItemId.toString()
  );
  return this.save();
};

cartSchema.methods.updateItemQuantity = async function(marketplaceItemId, quantity) {
  const item = this.items.find(
    item => item.marketplaceItemId.toString() === marketplaceItemId.toString()
  );

  if (item) {
    if (quantity <= 0) {
      return this.removeItem(marketplaceItemId);
    }
    item.quantity = quantity;
    return this.save();
  }

  throw new Error('Item not found in cart');
};

cartSchema.methods.clearCart = async function() {
  this.items = [];
  return this.save();
};

// Static methods
cartSchema.statics.getOrCreateCart = async function(userId) {
  let cart = await this.findOne({ userId }).populate({
    path: 'items.marketplaceItemId',
    populate: {
      path: 'userId',
      select: 'name email avatar'
    }
  });

  if (!cart) {
    cart = await this.create({ userId, items: [] });
    cart = await cart.populate({
      path: 'items.marketplaceItemId',
      populate: {
        path: 'userId',
        select: 'name email avatar'
      }
    });
  }

  return cart;
};

export default mongoose.model("Cart", cartSchema);