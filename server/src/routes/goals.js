import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import Goal from "../models/Goal.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

// List goals for current user
router.get("/", async (req, res) => {
  const goals = await Goal.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(goals);
});

// Create goal
router.post(
  "/",
  [
    body("title").isString().isLength({ min: 1 }),
    body("description").optional().isString(),
    body("targetAmount").optional().isFloat({ min: 0 }),
    body("currentAmount").optional().isFloat({ min: 0 }),
    body("dueDate").optional().isISO8601(),
    body("status").optional().isIn(["planned", "in_progress", "completed", "archived"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid data", errors: errors.array() });

    const goal = await Goal.create({ ...req.body, userId: req.user.id });
    res.status(201).json(goal);
  }
);

// Update goal
router.put(
  "/:id",
  [
    param("id").isMongoId(),
    body("title").optional().isString().isLength({ min: 1 }),
    body("description").optional().isString(),
    body("targetAmount").optional().isFloat({ min: 0 }),
    body("currentAmount").optional().isFloat({ min: 0 }),
    body("dueDate").optional().isISO8601(),
    body("status").optional().isIn(["planned", "in_progress", "completed", "archived"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid data", errors: errors.array() });

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.json(goal);
  }
);

// Delete goal
router.delete(
  "/:id",
  [param("id").isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: "Invalid id" });

    const result = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ message: "Goal not found" });
    res.json({ ok: true });
  }
);

export default router;



