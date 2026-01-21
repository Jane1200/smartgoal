import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RequireBuyer({ children }) {
  const auth = useAuth();
  const user = auth?.user;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.token) {
      console.log("RequireBuyer: No token, redirecting to login");
      navigate("/login", { replace: true });
      return;
    }
    if (user.profile?.role !== "buyer") {
      console.log("RequireBuyer: Not a buyer, redirecting to dashboard-redirect");
      navigate("/dashboard-redirect", { replace: true });
      return;
    }
  }, [user, navigate]);

  // If no user or not a buyer, show loading while redirect happens
  if (!user?.token || user.profile?.role !== "buyer") {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and is a buyer, render children
  return children;
}
