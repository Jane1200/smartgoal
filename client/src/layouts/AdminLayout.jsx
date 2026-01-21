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
              Dashboard
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
                <path d="M12 6v6l4 2"/>
              </svg>
              Goals
            </NavLink>
            <NavLink to="/admin/marketplace" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3h18v18H3z"/>
                <path d="M9 9h6v6H9z"/>
              </svg>
              Marketplace
            </NavLink>
            <NavLink to="/admin/reports" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Reports & Disputes
            </NavLink>
            <NavLink to="/admin/moderation" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              Content Moderation
            </NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
              </svg>
              System Settings
            </NavLink>
            <NavLink to="/admin/activity-logs" className={({ isActive }) => 
              `btn ${isActive ? 'btn-dark' : 'btn-outline-secondary'} text-start d-flex align-items-center gap-2`
            }>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              Activity Logs
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