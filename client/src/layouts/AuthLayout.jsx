import { Outlet } from "react-router-dom";
import AuthHeader from "@/components/AuthHeader.jsx";

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <AuthHeader />
      <div className="card-like auth-card p-4">
        <Outlet />
      </div>
    </div>
  );
}