import { Outlet, NavLink, useNavigate } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import DashboardHeader from "@/components/DashboardHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function UserLayout() {
  const auth = useAuth();
  const logout = auth?.logout;
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <DashboardHeader variant="user" />
      <div className="app-wrap">
        <aside className="sidebar p-3">
          <nav className="nav flex-column gap-2">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `btn ${isActive ? "btn-dark" : "btn-outline-secondary"} text-start d-flex align-items-center gap-2`
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
              </svg>
              Dashboard
            </NavLink>
            <NavLink
              to="/goals"
              className={({ isActive }) =>
                `btn ${isActive ? "btn-dark" : "btn-outline-secondary"} text-start d-flex align-items-center gap-2`
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
              My Goals & Wishlist
            </NavLink>
            <NavLink
              to="/marketplace"
              className={({ isActive }) =>
                `btn ${isActive ? "btn-dark" : "btn-outline-secondary"} text-start d-flex align-items-center gap-2`
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 3h18v18H3zM9 9h6v6H9z" />
                <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6" />
              </svg>
              Marketplace
            </NavLink>
            <NavLink
              to="/finances"
              className={({ isActive }) =>
                `btn ${isActive ? "btn-dark" : "btn-outline-secondary"} text-start d-flex align-items-center gap-2`
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M6 10h12" />
                <path d="M6 14h12" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              My Finances
            </NavLink>

            <NavLink
              to="/analytics"
              className={({ isActive }) =>
                `btn ${isActive ? "btn-dark" : "btn-outline-secondary"} text-start d-flex align-items-center gap-2`
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
              </svg>
              Analytics
            </NavLink>
            <NavLink
              to="/connections"
              className={({ isActive }) =>
                `btn ${isActive ? "btn-dark" : "btn-outline-secondary"} text-start d-flex align-items-center gap-2`
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Connections
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `btn ${isActive ? "btn-dark" : "btn-outline-secondary"} text-start d-flex align-items-center gap-2`
              }
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
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
