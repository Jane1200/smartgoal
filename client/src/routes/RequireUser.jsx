import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireUser({ children }) {
  const auth = useAuth();
  const user = auth?.user;
  
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.profile?.role === "admin") {
    return <Navigate to="/admin-dashboard" replace />;
  }
  
  return children;
}

