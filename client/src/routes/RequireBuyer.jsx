import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireBuyer({ children }) {
  const auth = useAuth();
  const user = auth?.user;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.profile?.role !== "buyer") {
    return <Navigate to="/dashboard-redirect" replace />;
  }
  
  return children;
}

