import mongoose from "mongoose";
import Finance from "./src/models/Finance.js";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/smartgoal";

async function checkPaymentMethods() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const allEntries = await Finance.find({}).select('type amount paymentMethod description tags');
    
    console.log(`\nTotal entries: ${allEntries.length}\n`);

    const grouped = allEntries.reduce((acc, entry) => {
      const method = entry.paymentMethod || 'undefined';
      if (!acc[method]) acc[method] = { count: 0, income: 0, expense: 0 };
      acc[method].count++;
      if (entry.type === 'income') acc[method].income += entry.amount;
      if (entry.type === 'expense') acc[method].expense += entry.amount;
      return acc;
    }, {});

    console.log("Payment Method Breakdown:");
    console.log("========================");
    Object.entries(grouped).forEach(([method, data]) => {
      console.log(`\n${method.toUpperCase()}:`);
      console.log(`  Count: ${data.count}`);
      console.log(`  Income: ₹${data.income.toLocaleString()}`);
      console.log(`  Expense: ₹${data.expense.toLocaleString()}`);
      console.log(`  Balance: ₹${(data.income - data.expense).toLocaleString()}`);
    });

    // Show sample entries
    console.log("\n\nSample entries:");
    console.log("===============");
    allEntries.slice(0, 5).forEach(entry => {
      console.log(`${entry.type} | ₹${entry.amount} | ${entry.paymentMethod} | ${entry.description?.substring(0, 50)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkPaymentMethods();
