import mongoose from "mongoose";
import Finance from "./src/models/Finance.js";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smartgoal";

async function migratePaymentMethods() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all finance entries without paymentMethod
    const entriesWithoutPaymentMethod = await Finance.find({
      $or: [
        { paymentMethod: { $exists: false } },
        { paymentMethod: null }
      ]
    });

    console.log(`Found ${entriesWithoutPaymentMethod.length} entries without paymentMethod`);

    if (entriesWithoutPaymentMethod.length === 0) {
      console.log("✅ All entries already have paymentMethod set");
      process.exit(0);
    }

    // Update entries based on tags or description
    let cashCount = 0;
    let upiCount = 0;
    let otherCount = 0;

    for (const entry of entriesWithoutPaymentMethod) {
      let paymentMethod = "other"; // default

      // Check if it's a cash transaction based on tags or description
      if (entry.tags?.includes("cash-transaction") || 
          entry.description?.toLowerCase().includes("[cash]")) {
        paymentMethod = "cash";
        cashCount++;
      } 
      // Check if it's UPI based on description
      else if (entry.description?.toLowerCase().includes("upi") ||
               entry.description?.toLowerCase().includes("phonepe") ||
               entry.description?.toLowerCase().includes("paytm") ||
               entry.description?.toLowerCase().includes("gpay")) {
        paymentMethod = "upi";
        upiCount++;
      }
      // Otherwise, assume it's bank/other (from bank statement uploads)
      else {
        paymentMethod = "other";
        otherCount++;
      }

      entry.paymentMethod = paymentMethod;
      await entry.save();
    }

    console.log(`✅ Migration complete!`);
    console.log(`   - Cash: ${cashCount}`);
    console.log(`   - UPI: ${upiCount}`);
    console.log(`   - Other: ${otherCount}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migratePaymentMethods();
