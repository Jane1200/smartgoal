import { Outlet, NavLink, useNavigate } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import DashboardHeader from "@/components/DashboardHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function AdminLayout() {
  const auth = useAuth();
  const logout = auth?.logout;
  const navigate = useNavigate();

  const onLogout = () => { logout(); navigate("/login"); };

  return (
    <>
      <DashboardHeader variant="admin" />
      <div className="app-wrap">
         <aside className="sidebar p-3">
          <div className="mb-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div className="badge bg-danger">ADMIN</div>
              <small className="text-muted">System Control</small>
            </div>
          </div>
          <nav className="nav flex-column gap-2">
            <NavLink to="/admin-dashboard" className="btn btn-dark text-start d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
              Admin Dashboard
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              User Management
            </NavLink>
            <NavLink to="/admin/goals" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
              All Goals
            </NavLink>
            <NavLink to="/admin/marketplace" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
              </svg>
              Marketplace Control
            </NavLink>
            <NavLink to="/admin/finance" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <path d="M6 10h12"/>
                <path d="M6 14h12"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              Financial Overview
            </NavLink>
            <NavLink to="/admin/analytics" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
              </svg>
              System Analytics
            </NavLink>
            <NavLink to="/admin-dashboard" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Geo Analytics
            </NavLink>
            <button className="btn btn-outline-secondary text-start d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Payment Management
            </button>
            <button className="btn btn-outline-secondary text-start d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              Reports
            </button>
            <button className="btn btn-outline-info text-start d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
              </svg>
              Database Management
            </button>
            <button className="btn btn-outline-secondary text-start d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              System Logs
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