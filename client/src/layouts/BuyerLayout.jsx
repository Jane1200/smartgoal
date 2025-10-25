import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Brand from "../components/Brand.jsx";
import DashboardHeader from "@/components/DashboardHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "@/utils/api.js";

export default function BuyerLayout() {
  const auth = useAuth();
  const logout = auth?.logout;
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

  const onLogout = () => { logout(); navigate("/login"); };

  // Fetch cart count
  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const { data } = await api.get("/cart");
        setCartCount(data.totalItems || 0);
      } catch (error) {
        console.error("Failed to fetch cart count:", error);
      }
    };

    fetchCartCount();
    
    // Refresh cart count every 30 seconds
    const interval = setInterval(fetchCartCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <DashboardHeader variant="buyer" />
      <div className="app-wrap">
         <aside className="sidebar p-3">
          <nav className="nav flex-column gap-2">
            <NavLink to="/buyer-dashboard" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              Dashboard
            </NavLink>
            <NavLink to="/buyer-marketplace" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
              </svg>
              Browse Items
            </NavLink>
            <NavLink to="/cart" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2 position-relative`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              Shopping Cart
              {cartCount > 0 && (
                <span className="badge bg-danger rounded-pill ms-auto">{cartCount}</span>
              )}
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
              My Orders
            </NavLink>
            <NavLink to="/find-goal-setters" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Find Goal Setters
            </NavLink>
            <NavLink to="/buyer-profile" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Profile
            </NavLink>
            
          </nav>
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
