import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireAdmin({ children }) {
  const auth = useAuth();
  const user = auth?.user;
  
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

