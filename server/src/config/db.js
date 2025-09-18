import mongoose from "mongoose";

export async function connectDB(uri) {
  try {
    await mongoose.connect(uri, { dbName: "smartgoal" });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("Mongo error", err.message);
    process.exit(1);
  }
}