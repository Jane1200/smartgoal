import { connectDB } from "../src/config/db.js";
import { app } from "../src/server.js";

/**
 * Vercel serverless entry: all requests are sent here via vercel.json rewrites.
 * Connects to MongoDB on cold start (connection is reused on warm invocations).
 */
export default async function handler(req, res) {
  try {
    await connectDB(process.env.MONGO_URI);
  } catch (err) {
    console.error("DB connect failed:", err.message);
    return res.status(503).json({ error: "Database unavailable" });
  }
  return app(req, res);
}
