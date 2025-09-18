import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import Wishlist from "../models/Wishlist.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// List wishlist items for current user
router.get("/", async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ userId: req.user.id, status: "wishlist" })
      .sort({ priority: -1, createdAt: -1 });
    res.json(wishlist);
  } catch (error) {
    console.error("Wishlist list error:", error);
    res.status(500).json({ message: "Failed to fetch wishlist" });
  }
});

// Create wishlist item
router.post(
  "/",
  [
    body("title").isString().isLength({ min: 1, max: 200 }),
    body("description").optional().isString().isLength({ max: 2000 }),
    body("url").optional().isURL().isLength({ max: 500 }),
    body("price").optional().isFloat({ min: 0 }),
    body("currency").optional().isIn(["INR", "USD", "EUR"]),
    body("priority").optional().isIn(["low", "medium", "high"]),
    body("category").optional().isString().isLength({ max: 100 }),
    body("imageUrl").optional().isURL().isLength({ max: 500 }),
    body("notes").optional().isString().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid data", errors: errors.array() });
      }

      const wishlistItem = await Wishlist.create({ ...req.body, userId: req.user.id });
      res.status(201).json(wishlistItem);
    } catch (error) {
      console.error("Create wishlist error:", error);
      res.status(500).json({ message: "Failed to create wishlist item" });
    }
  }
);

// Update wishlist item
router.put(
  "/:id",
  [
    param("id").isMongoId(),
    body("title").optional().isString().isLength({ min: 1, max: 200 }),
    body("description").optional().isString().isLength({ max: 2000 }),
    body("url").optional().isURL().isLength({ max: 500 }),
    body("price").optional().isFloat({ min: 0 }),
    body("currency").optional().isIn(["INR", "USD", "EUR"]),
    body("priority").optional().isIn(["low", "medium", "high"]),
    body("category").optional().isString().isLength({ max: 100 }),
    body("imageUrl").optional().isURL().isLength({ max: 500 }),
    body("notes").optional().isString().isLength({ max: 1000 }),
    body("status").optional().isIn(["wishlist", "purchased", "removed"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid data", errors: errors.array() });
      }

      const wishlistItem = await Wishlist.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        req.body,
        { new: true }
      );
      
      if (!wishlistItem) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }
      
      res.json(wishlistItem);
    } catch (error) {
      console.error("Update wishlist error:", error);
      res.status(500).json({ message: "Failed to update wishlist item" });
    }
  }
);

// Delete wishlist item
router.delete(
  "/:id",
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const result = await Wishlist.findOneAndDelete({ 
        _id: req.params.id, 
        userId: req.user.id 
      });
      
      if (!result) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }
      
      res.json({ ok: true });
    } catch (error) {
      console.error("Delete wishlist error:", error);
      res.status(500).json({ message: "Failed to delete wishlist item" });
    }
  }
);

// Mark as purchased
router.patch(
  "/:id/purchase",
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const wishlistItem = await Wishlist.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { status: "purchased" },
        { new: true }
      );
      
      if (!wishlistItem) {
        return res.status(404).json({ message: "Wishlist item not found" });
      }
      
      res.json(wishlistItem);
    } catch (error) {
      console.error("Purchase wishlist error:", error);
      res.status(500).json({ message: "Failed to mark as purchased" });
    }
  }
);

export default router;




