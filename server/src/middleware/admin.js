import jwt from "jsonwebtoken";

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  // Allow hardcoded admin token for development
  if (token === "hardcoded-admin-token") {
    req.user = { id: "admin-hardcoded", role: "admin" };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.user = decoded;
    next();
  } catch (_e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}


