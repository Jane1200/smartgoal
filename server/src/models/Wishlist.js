import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    url: { type: String, trim: true, maxlength: 2048 },
    price: { type: Number, min: 0 },
    currency: { type: String, default: "INR", enum: ["INR", "USD", "EUR"] },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    category: { type: String, trim: true, maxlength: 100 },
    imageUrl: { type: String, trim: true, maxlength: 2048 },
    status: { type: String, enum: ["wishlist", "purchased", "removed"], default: "wishlist" },
    notes: { type: String, trim: true, maxlength: 1000 },
    dueDate: { type: Date }, // When user wants to purchase this item by
  },
  { timestamps: true }
);

export default mongoose.model("Wishlist", wishlistSchema);
