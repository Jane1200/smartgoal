import jwt from "jsonwebtoken";

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  // Allow hardcoded admin token for development
  if (token === "hardcoded-admin-token") {
    req.user = { id: "admin-hardcoded", role: "admin", roles: ["admin"], isAdmin: true };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Check if user has admin role in roles array or legacy role field
    const hasAdminRole = decoded?.isAdmin || 
                        (Array.isArray(decoded?.roles) && decoded.roles.includes("admin")) ||
                        decoded?.role === "admin";
    
    if (!hasAdminRole) {
      return res.status(403).json({ message: "Forbidden" });
    }
    req.user = decoded;
    next();
  } catch (_e) {
    return res.status(401).json({ message: "Invalid token" });
  }
}


