import mongoose from "mongoose";

export async function connectDB(uri) {
  try {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(uri, { dbName: "smartgoal" });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("Mongo error", err.message);
    if (process.env.VERCEL) throw err;
    process.exit(1);
  }
}