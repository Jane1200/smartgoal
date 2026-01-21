import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose";
import CashNote from "../models/CashNote.js";
import Finance from "../models/Finance.js";
import { requireAuth } from "../middleware/auth.js";
import { validateExpenseBalance } from "../utils/balanceValidator.js";

const router = Router();

router.use(requireAuth);

// Get all cash notes (unconverted or all)
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { showConverted } = req.query;
    
    const query = { userId };
    if (showConverted !== 'true') {
      query.isConverted = false; // Only show unconverted by default
    }
    
    const notes = await CashNote.find(query).sort({ noteDate: -1 });
    
    res.json(notes);
  } catch (error) {
    console.error("Get cash notes error:", error);
    res.status(500).json({ message: "Failed to fetch cash notes" });
  }
});

// Create cash note
router.post(
  "/",
  [
    body("type").isIn(["income", "expense"]).withMessage("Type must be income or expense"),
    body("amount")
      .isInt({ min: 1, max: 100000 })
      .withMessage("Amount must be a whole number between ₹1 and ₹1,00,000"),
    body("description")
      .isString()
      .trim()
      .isLength({ min: 3, max: 500 })
      .withMessage("Description must be between 3 and 500 characters")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: errors.array()[0].msg,
          errors: errors.array() 
        });
      }

      const userId = req.user.id;
      const { type, amount, description } = req.body;

      // Ensure amount is an integer
      const amountInt = parseInt(amount, 10);
      if (isNaN(amountInt) || amountInt < 1 || amountInt > 100000) {
        return res.status(400).json({ 
          message: "Amount must be a whole number between ₹1 and ₹1,00,000"
        });
      }

      // Always use today's date for cash notes
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day

      // Validate balance if it's an expense
      if (type === 'expense') {
        const balanceCheck = await validateExpenseBalance(userId, amountInt, 'cash');
        if (!balanceCheck.valid) {
          return res.status(400).json({ 
            message: balanceCheck.message,
            currentBalance: balanceCheck.currentBalance,
            requiredBalance: balanceCheck.requiredBalance,
            shortfall: balanceCheck.shortfall
          });
        }
      }

      const note = await CashNote.create({
        userId,
        type,
        amount: amountInt,
        description,
        noteDate: today
      });

      console.log(`✅ Cash note created: ${type} - ₹${amountInt} - ${description} (Today's date)`);

      // Automatically convert to finance entry immediately
      const financeEntry = await Finance.create({
        userId,
        type: note.type,
        amount: note.amount,
        source: note.type === 'income' ? 'other' : undefined,
        category: note.type === 'expense' ? 'other' : undefined,
        description: `[Cash] ${note.description}`,
        date: note.noteDate,
        paymentMethod: 'cash',
        tags: ['cash-transaction', 'auto-converted']
      });

      // Mark note as converted immediately
      note.isConverted = true;
      note.convertedAt = new Date();
      note.convertedFinanceId = financeEntry._id;
      await note.save();

      console.log(`✅ Cash note auto-converted to finance entry: ${type} - ₹${amountInt}`);

      res.status(201).json({ 
        note, 
        financeEntry,
        message: "Cash note recorded and added to finances"
      });
    } catch (error) {
      console.error("Create cash note error:", error);
      res.status(500).json({ message: "Failed to create cash note" });
    }
  }
);

// Update cash note
router.put(
  "/:id",
  [
    param("id").isMongoId(),
    body("type").optional().isIn(["income", "expense"]).withMessage("Type must be income or expense"),
    body("amount")
      .optional()
      .isInt({ min: 1, max: 100000 })
      .withMessage("Amount must be a whole number between ₹1 and ₹1,00,000"),
    body("description")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 3, max: 500 })
      .withMessage("Description must be between 3 and 500 characters")
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: errors.array()[0].msg,
          errors: errors.array() 
        });
      }

      const userId = req.user.id;
      const note = await CashNote.findOne({ _id: req.params.id, userId, isConverted: false });

      if (!note) {
        return res.status(404).json({ message: "Cash note not found or already converted" });
      }

      // Update only allowed fields (not noteDate or category)
      const { type, amount, description } = req.body;
      if (type) note.type = type;
      if (amount) {
        const amountInt = parseInt(amount, 10);
        if (isNaN(amountInt) || amountInt < 1 || amountInt > 100000) {
          return res.status(400).json({ 
            message: "Amount must be a whole number between ₹1 and ₹1,00,000"
          });
        }
        note.amount = amountInt;
      }
      if (description) note.description = description;
      
      await note.save();

      res.json(note);
    } catch (error) {
      console.error("Update cash note error:", error);
      res.status(500).json({ message: "Failed to update cash note" });
    }
  }
);

// Delete cash note
router.delete("/:id", [param("id").isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const userId = req.user.id;
    const result = await CashNote.findOneAndDelete({ 
      _id: req.params.id, 
      userId, 
      isConverted: false 
    });

    if (!result) {
      return res.status(404).json({ message: "Cash note not found or already converted" });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Delete cash note error:", error);
    res.status(500).json({ message: "Failed to delete cash note" });
  }
});

// Convert single cash note to finance entry
router.post("/:id/convert", [param("id").isMongoId()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const userId = req.user.id;
    const note = await CashNote.findOne({ _id: req.params.id, userId, isConverted: false });

    if (!note) {
      return res.status(404).json({ message: "Cash note not found or already converted" });
    }

    // Create finance entry
    const financeEntry = await Finance.create({
      userId,
      type: note.type,
      amount: note.amount,
      source: note.type === 'income' ? 'other' : undefined,
      category: note.type === 'expense' ? 'other' : undefined,
      description: `[Cash] ${note.description}`,
      date: note.noteDate,
      paymentMethod: 'cash',
      tags: ['cash-transaction', 'converted-from-note']
    });

    // Mark note as converted
    note.isConverted = true;
    note.convertedAt = new Date();
    note.convertedFinanceId = financeEntry._id;
    await note.save();

    console.log(`✅ Cash note converted: ${note.type} - ₹${note.amount}`);

    res.json({
      success: true,
      message: "Cash note converted to finance entry",
      note,
      financeEntry
    });
  } catch (error) {
    console.error("Convert cash note error:", error);
    res.status(500).json({ message: "Failed to convert cash note" });
  }
});

// Convert all unconverted notes for current month
router.post("/convert-month", async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.body;

    // Default to current month if not specified
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    // Get start and end of month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Find all unconverted notes for this month
    const notes = await CashNote.find({
      userId,
      isConverted: false,
      noteDate: { $gte: startDate, $lte: endDate }
    });

    if (notes.length === 0) {
      return res.json({
        success: true,
        message: "No unconverted cash notes found for this month",
        converted: 0
      });
    }

    // Convert each note
    const converted = [];
    for (const note of notes) {
      const financeEntry = await Finance.create({
        userId,
        type: note.type,
        amount: note.amount,
        source: note.type === 'income' ? 'other' : undefined,
        category: note.type === 'expense' ? 'other' : undefined,
        description: `[Cash] ${note.description}`,
        date: note.noteDate,
        paymentMethod: 'cash',
        tags: ['cash-transaction', 'converted-from-note', 'month-end-conversion']
      });

      note.isConverted = true;
      note.convertedAt = new Date();
      note.convertedFinanceId = financeEntry._id;
      await note.save();

      converted.push({
        noteId: note._id,
        financeId: financeEntry._id,
        type: note.type,
        amount: note.amount
      });
    }

    console.log(`✅ Month-end conversion: ${converted.length} cash notes converted`);

    res.json({
      success: true,
      message: `Converted ${converted.length} cash notes to finance entries`,
      converted,
      month: targetMonth,
      year: targetYear
    });
  } catch (error) {
    console.error("Convert month notes error:", error);
    res.status(500).json({ message: "Failed to convert month notes" });
  }
});

// Get summary of unconverted notes
router.get("/summary", async (req, res) => {
  try {
    const userId = req.user.id;

    const summary = await CashNote.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isConverted: false } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      totalIncome: 0,
      totalExpense: 0,
      incomeCount: 0,
      expenseCount: 0
    };

    summary.forEach(item => {
      if (item._id === 'income') {
        result.totalIncome = item.total;
        result.incomeCount = item.count;
      } else if (item._id === 'expense') {
        result.totalExpense = item.total;
        result.expenseCount = item.count;
      }
    });

    res.json(result);
  } catch (error) {
    console.error("Get cash notes summary error:", error);
    res.status(500).json({ message: "Failed to get summary" });
  }
});

export default router;
