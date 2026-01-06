import jwt from "jsonwebtoken";
import { deriveRoleMetadata } from "../utils/roles.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  
  console.log("🔐 Auth check - Header:", header ? "Present" : "Missing");
  console.log("🎫 Token:", token ? "Present" : "Missing");
  
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const roleMetadata = deriveRoleMetadata(decoded);

    req.user = {
      ...decoded,
      ...roleMetadata,
    };

    console.log("✅ User authenticated:", decoded.email || decoded._id);
    next();
  } catch (e) {
    console.error("❌ Auth error:", e.message);
    if (e.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
}

/**
 * Authenticate token middleware (alias for requireAuth)
 */
export function authenticateToken(req, res, next) {
  return requireAuth(req, res, next);
}

/**
 * Authorize admin middleware - ensures user has admin role
 */
export function authorizeAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userRole = req.user.role || req.user.profile?.role;
  
  if (userRole !== 'admin') {
    return res.status(403).json({ 
      message: "Forbidden - Admin access required",
      userRole: userRole
    });
  }

  next();
}