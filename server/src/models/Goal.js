import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    targetAmount: { type: Number, min: 0 },
    currentAmount: { type: Number, min: 0, default: 0 },
    dueDate: { type: Date },
    status: { type: String, enum: ["planned", "in_progress", "completed", "archived"], default: "planned" },
  },
  { timestamps: true }
);

export default mongoose.model("Goal", goalSchema);



