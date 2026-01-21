import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import goalsRoutes from "./routes/goals.js";
import wishlistRoutes from "./routes/wishlist.js";
import marketplaceRoutes from "./routes/marketplace.js";
import marketplaceIncomeRoutes from "./routes/marketplaceIncome.js";
import financeRoutes from "./routes/finance.js";
import connectionRoutes from "./routes/connections.js";
import analyticsRoutes from "./routes/analytics.js";
import profileRoutes from "./routes/profile.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import autoTransferRoutes from "./routes/autoTransfer.js";
import notificationRoutes from "./routes/notifications.js";
import mlPricingRoutes from './routes/ml-pricing.js';
import cashNotesRoutes from "./routes/cashNotes.js";
import emailTestRoutes from "./routes/emailTest.js";
import evaluatorRoutes from "./routes/evaluator.js";
import reportsRoutes from "./routes/reports.js";
import activityLogsRoutes from "./routes/activityLogs.js";
import systemSettingsRoutes from "./routes/systemSettings.js";
import { startMonthlyReportJob } from "./jobs/monthlyReportJob.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"], credentials: true }));

app.get("/api/health", (_, res) => res.json({ ok: true }));

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/goals", goalsRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/marketplace-income", marketplaceIncomeRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auto-transfer", autoTransferRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/evaluator", evaluatorRoutes);

app.use('/api/ml-pricing', mlPricingRoutes);
app.use("/api/cash-notes", cashNotesRoutes);
app.use("/api/email-test", emailTestRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/activity-logs", activityLogsRoutes);
app.use("/api/system-settings", systemSettingsRoutes);

const port = process.env.PORT || 5000;
connectDB(process.env.MONGO_URI).then(() => {
  app.listen(port, () => {
    console.log(`✅ API listening on http://localhost:${port}`);
    
    // Start scheduled jobs
    console.log("\n📅 Starting scheduled jobs...");
    startMonthlyReportJob();
    console.log("✅ All jobs initialized\n");
  });
});