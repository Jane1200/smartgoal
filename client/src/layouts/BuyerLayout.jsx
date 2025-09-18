import { Outlet, NavLink, useNavigate } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import DashboardHeader from "@/components/DashboardHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function BuyerLayout() {
  const auth = useAuth();
  const logout = auth?.logout;
  const navigate = useNavigate();

  const onLogout = () => { logout(); navigate("/login"); };

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
            <button className="btn btn-outline-secondary text-start d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
              </svg>
              My Wishlist
            </button>
            <button className="btn btn-outline-secondary text-start d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Messages
            </button>
            <button className="btn btn-outline-secondary text-start d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
              Purchase History
            </button>
            <NavLink to="/buyer-profile" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Profile
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
            <hr className="my-2" />
            <button className="btn btn-outline-danger text-start d-flex align-items-center gap-2" onClick={onLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </nav>
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
