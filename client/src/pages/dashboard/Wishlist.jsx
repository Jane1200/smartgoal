import WishlistManager from "@/sections/WishlistManager.jsx";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";

export default function WishlistPage() {
  const authContext = useAuth();
  const user = authContext?.user;

  // Redirect if not authenticated
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if not a goal setter
  if (user?.profile?.role !== "goal_setter") {
    return <Navigate to="/dashboard-redirect" replace />;
  }

  return (
    <div className="container-xxl py-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-1">My Wishlist</h1>
          <p className="text-muted mb-0">Save online goals you want to achieve</p>
        </div>
      </div>
      <WishlistManager />
    </div>
  );
}





