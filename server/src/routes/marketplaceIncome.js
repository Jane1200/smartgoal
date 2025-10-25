import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import MarketplaceIncome from "../models/MarketplaceIncome.js";

const router = Router();

router.use(requireAuth);

// Get all marketplace income for seller
router.get("/", async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { status = "all", limit = 50, page = 1 } = req.query;

    const query = { sellerId };
    if (status !== "all") {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const incomeRecords = await MarketplaceIncome.find(query)
      .sort({ soldAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate("marketplaceItemId", "title price");

    const total = await MarketplaceIncome.countDocuments(query);

    res.json({
      incomeRecords,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Failed to fetch marketplace income:", error);
    res.status(500).json({ message: "Failed to fetch marketplace income" });
  }
});

// Get undistributed marketplace income
router.get("/undistributed", async (req, res) => {
  try {
    const sellerId = req.user.id;

    const undistributedIncome = await MarketplaceIncome.getUndistributedIncome(sellerId);

    // Calculate total undistributed amount
    const totalAmount = undistributedIncome.reduce((sum, item) => sum + item.amount, 0);

    res.json({
      undistributedIncome,
      totalUndistributedAmount: totalAmount
    });
  } catch (error) {
    console.error("Failed to fetch undistributed income:", error);
    res.status(500).json({ message: "Failed to fetch undistributed income" });
  }
});

// Get marketplace income summary
router.get("/summary", async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const summary = await MarketplaceIncome.getSellerTotalIncome(sellerId, filters);

    if (summary.length === 0) {
      return res.json({
        totalIncome: 0,
        totalSales: 0,
        confirmedAmount: 0
      });
    }

    res.json(summary[0]);
  } catch (error) {
    console.error("Failed to fetch marketplace income summary:", error);
    res.status(500).json({ message: "Failed to fetch marketplace income summary" });
  }
});

// Get single income record
router.get("/:incomeId", async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { incomeId } = req.params;

    const incomeRecord = await MarketplaceIncome.findOne({
      _id: incomeId,
      sellerId
    })
      .populate("marketplaceItemId")
      .populate("orderId");

    if (!incomeRecord) {
      return res.status(404).json({ message: "Income record not found" });
    }

    res.json(incomeRecord);
  } catch (error) {
    console.error("Failed to fetch income record:", error);
    res.status(500).json({ message: "Failed to fetch income record" });
  }
});

export default router;