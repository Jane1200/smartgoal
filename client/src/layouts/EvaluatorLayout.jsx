import { Outlet, NavLink, useNavigate } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import DashboardHeader from "@/components/DashboardHeader.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function EvaluatorLayout() {
  const auth = useAuth();
  const logout = auth?.logout;
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <DashboardHeader variant="evaluator" />
      <div className="app-wrap">
        <aside className="sidebar p-3">
          <div className="mb-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div className="badge bg-info">EVALUATOR</div>
              <small className="text-muted">User Evaluation</small>
            </div>
          </div>
          <nav className="nav flex-column gap-2">
            <NavLink
              to="/evaluator-dashboard"
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
              Evaluator Dashboard
            </NavLink>
            <NavLink
              to="/evaluator/users"
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
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              View Users
            </NavLink>
            <NavLink
              to="/evaluator/goals"
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
              View Goals
            </NavLink>
            <NavLink
              to="/evaluator/analytics"
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
          </nav>
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </>
  );
}
