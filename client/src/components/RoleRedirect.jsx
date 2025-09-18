import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { auth } from "@/lib/firebase"; // make sure auth is exported from this file

export default function RoleRedirect() {
  const auth = useAuth();
  const user = auth?.user;
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function decide() {
      // Not signed in according to context — send to login
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        // If there's a firebase client user, prefer checking its emailVerified flag
        if (auth?.currentUser) {
          // reload to ensure we have the latest emailVerified value
          await auth.currentUser.reload();
          if (!auth.currentUser.emailVerified) {
            if (!mounted) return;
            navigate("/verify-email", { replace: true });
            return;
          }
        }

        // Fallback: if your server provides an isVerified flag on the profile, respect it
        const isVerifiedFromProfile = user?.profile?.isVerified;
        if (isVerifiedFromProfile === false) {
          navigate("/verify-email", { replace: true });
          return;
        }

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

    return () => {
      mounted = false;
    };
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
