import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Cart from "../models/Cart.js";
import Marketplace from "../models/Marketplace.js";

const router = Router();

// Get user's cart
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.getOrCreateCart(userId);
    
    // Filter out items that are no longer active
    const validItems = cart.items.filter(item => 
      item.marketplaceItemId && 
      item.marketplaceItemId.status === 'active'
    );
    
    // Update cart if items were removed
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
    }
    
    res.json(cart);
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
});

// Add item to cart
router.post("/add", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { marketplaceItemId, quantity = 1 } = req.body;

    if (!marketplaceItemId) {
      return res.status(400).json({ message: "Marketplace item ID is required" });
    }

    // Check if item exists and is active
    const item = await Marketplace.findById(marketplaceItemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (item.status !== 'active') {
      return res.status(400).json({ message: "This item is no longer available" });
    }

    // Check if user is trying to add their own item
    if (item.userId.toString() === userId) {
      return res.status(400).json({ message: "You cannot add your own item to cart" });
    }

    // Get or create cart
    const cart = await Cart.getOrCreateCart(userId);

    // Add item to cart
    await cart.addItem(marketplaceItemId, item.price, quantity);

    // Reload cart with populated data
    const updatedCart = await Cart.findById(cart._id).populate({
      path: 'items.marketplaceItemId',
      populate: {
        path: 'userId',
        select: 'name email avatar'
      }
    });

    res.json({
      message: "Item added to cart successfully",
      cart: updatedCart
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: "Failed to add item to cart" });
  }
});

// Update item quantity
router.put("/update/:itemId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 0) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    await cart.updateItemQuantity(itemId, quantity);

    // Reload cart with populated data
    const updatedCart = await Cart.findById(cart._id).populate({
      path: 'items.marketplaceItemId',
      populate: {
        path: 'userId',
        select: 'name email avatar'
      }
    });

    res.json({
      message: "Cart updated successfully",
      cart: updatedCart
    });
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({ message: error.message || "Failed to update cart" });
  }
});

// Remove item from cart
router.delete("/remove/:itemId", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    await cart.removeItem(itemId);

    // Reload cart with populated data
    const updatedCart = await Cart.findById(cart._id).populate({
      path: 'items.marketplaceItemId',
      populate: {
        path: 'userId',
        select: 'name email avatar'
      }
    });

    res.json({
      message: "Item removed from cart",
      cart: updatedCart
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ message: "Failed to remove item from cart" });
  }
});

// Clear cart
router.delete("/clear", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    await cart.clearCart();

    res.json({
      message: "Cart cleared successfully",
      cart
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ message: "Failed to clear cart" });
  }
});

export default router;