// src/routes/RequireAuth.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";



export default function RequireAuth({ children }) {
  const authContext = useAuth();
  const user = authContext?.user;

  // If not logged in, redirect to login
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  // Temporarily bypass email verification gating
  return children;
}
