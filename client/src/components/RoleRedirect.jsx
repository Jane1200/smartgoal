import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
// import { auth as firebaseAuth } from "@/lib/firebase"; // Not needed here; remove to avoid name conflicts

export default function RoleRedirect() {
  const authCtx = useAuth();
  const user = authCtx?.user;
  const navigate = useNavigate();

  useEffect(() => {
    async function decide() {
      // Not signed in according to context — send to login
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        // Role-based redirect
        const role = user?.profile?.role;
        if (role === "admin") {
          navigate("/admin-dashboard", { replace: true });
        } else if (role === "buyer") {
          navigate("/buyer-dashboard", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (err) {
        console.error("RoleRedirect error:", err);
        // On unexpected errors, fallback to main dashboard
        navigate("/dashboard", { replace: true });
      }
    }

    decide();
  }, [user, navigate]);

  return (
    <div className="container py-5">
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Redirecting...</span>
        </div>
        <p className="mt-2">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
