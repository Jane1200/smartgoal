import { Link, NavLink } from "react-router-dom";
import Brand from "@/components/Brand.jsx";
import { useAuth } from "@/context/AuthContext.jsx";

export default function DashboardHeader({ variant = "user" }) {
  const auth = useAuth();
  const user = auth?.user;
  const logout = auth?.logout;

  return (
    <header className="site-header is-scrolled">
      <div className="container-xxl">
        <div className="header-content">
          <div className="header-brand d-flex align-items-center gap-2">
            <Brand />
            <span className={`badge ${variant === "admin" ? "bg-danger" : variant === "buyer" ? "bg-success" : "bg-primary"}`}>
              {variant === "admin" ? "Admin" : variant === "buyer" ? "Buyer" : "Dashboard"}
            </span>
          </div>

          <nav className="header-nav d-none d-lg-flex">
            {variant === "admin" ? (
              <>
                <NavLink to="/admin-dashboard" className="nav-link">Overview</NavLink>
                <NavLink to="/admin-dashboard?tab=users" className="nav-link">Users</NavLink>
                <NavLink to="/admin-dashboard?tab=settings" className="nav-link">Settings</NavLink>
              </>
            ) : variant === "buyer" ? (
              <>
                <NavLink to="/buyer-dashboard" className="nav-link">Browse Items</NavLink>
                <NavLink to="/buyer-dashboard" className="nav-link">My Wishlist</NavLink>
                <NavLink to="/buyer-dashboard" className="nav-link">Purchase History</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/dashboard" className="nav-link">Overview</NavLink>
                <NavLink to="/goals" className="nav-link">My Goals</NavLink>
                <NavLink to="/marketplace" className="nav-link">Marketplace</NavLink>
              </>
            )}
          </nav>

          <div className="header-actions d-flex align-items-center gap-2">
            <span className="small text-muted d-none d-md-inline">
              {user?.profile?.name || user?.profile?.email || ""}
            </span>
            <button className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}



