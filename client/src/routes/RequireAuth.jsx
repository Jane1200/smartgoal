// src/routes/RequireAuth.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireAuth({ children }) {
  const authContext = useAuth();
  const user = authContext?.user;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.token) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  // Block render until navigation decision is made
  if (!user?.token) return null;
  return children;
}
