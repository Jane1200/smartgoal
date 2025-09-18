import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase"; // <- ensure this exports `auth`
import { useAuth } from "@/context/AuthContext.jsx";

import AuthLayout from "@/layouts/AuthLayout.jsx";
import AdminLayout from "@/layouts/AdminLayout.jsx";
import UserLayout from "@/layouts/UserLayout.jsx";
import BuyerLayout from "@/layouts/BuyerLayout.jsx";

import Login from "@/pages/auth/Login.jsx";
import Register from "@/pages/auth/Register.jsx";
import ResetPassword from "@/pages/auth/ResetPassword.jsx";
import VerifyEmail from "@/pages/auth/VerifyEmail.jsx";

import AdminDashboard from "@/pages/dashboard/AdminDashboard.jsx";
import UserDashboard from "@/pages/dashboard/UserDashboard.jsx";
import BuyerDashboard from "@/pages/dashboard/BuyerDashboard.jsx";
import BuyerProfile from "@/pages/dashboard/BuyerProfile.jsx";
import UserManagement from "@/pages/admin/UserManagement.jsx";
import AllGoals from "@/pages/admin/AllGoals.jsx";
import MarketplaceControl from "@/pages/admin/MarketplaceControl.jsx";
import FinancialOverview from "@/pages/admin/FinancialOverview.jsx";
import SystemAnalytics from "@/pages/admin/SystemAnalytics.jsx";
import GeoMatching from "@/sections/GeoMatching.jsx";
import BuyerGeoMatching from "@/sections/BuyerGeoMatching.jsx";
import BuyerMarketplace from "@/pages/dashboard/BuyerMarketplace.jsx";
import ConnectionRequests from "@/sections/ConnectionRequests.jsx";
import GoalsPage from "@/pages/dashboard/Goals.jsx";
import WishlistPage from "@/pages/dashboard/Wishlist.jsx";
import MarketplacePage from "@/pages/dashboard/Marketplace.jsx";
import FinancesPage from "@/pages/dashboard/Finances.jsx";
import AnalyticsPage from "@/pages/dashboard/Analytics.jsx";
import ProfilePage from "@/pages/dashboard/Profile.jsx";

import Home from "@/pages/public/Home.jsx";
import About from "@/pages/public/About.jsx";

import RoleRedirect from "@/components/RoleRedirect.jsx";
import RequireAuth from "@/routes/RequireAuth.jsx";
import RequireAdmin from "@/routes/RequireAdmin.jsx";
import RequireUser from "@/routes/RequireUser.jsx";
import RequireBuyer from "@/routes/RequireBuyer.jsx";

import { ToastContainer } from "react-toastify";
import PublicLayout from "@/layouts/PublicLayout.jsx";
import Footer from "@/components/Footer.jsx";
import "./assets/scss/app.scss";

export default function App() {
  const navigate = useNavigate();
  const [initialChecked, setInitialChecked] = useState(false);
  const authContext = useAuth();
  const appUser = authContext?.user;

  useEffect(() => {
    // Paths we consider "public"
    const PUBLIC_PATHS = new Set([
      "/",
      "/about",
      "/login",
      "/register",
      "/reset",
      "/verify-email",
    ]);

    // If the app already has a backend-authenticated user (JWT),
    // skip Firebase verification gating entirely.
    if (appUser) {
      setInitialChecked(true);
      return; // no Firebase listener needed when using backend auth
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // ensure emailVerified flag is fresh
          await user.reload();

          const currentPath = window.location.pathname;
          // If backend JWT session exists, do not gate via Firebase verification
          const hasBackendAuth = !!localStorage.getItem("sg_auth") || !!appUser;
          if (hasBackendAuth) {
            return;
          }

          // If user signed in but not verified, block access to non-public pages
          if (!user.emailVerified && !PUBLIC_PATHS.has(currentPath)) {
            navigate("/verify-email", { replace: true });
          }

          // If verified and stuck on verify-email, send them to role redirect
          if (user.emailVerified && currentPath === "/verify-email") {
            navigate("/dashboard-redirect", { replace: true });
          }
        }
      } catch (e) {
        console.error("Auth state handler error", e);
      } finally {
        setInitialChecked(true);
      }
    });

    return () => unsub();
  }, [navigate, appUser]);

  return (
    <>
      <Routes>
        {/* Public Pages */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Route>

        {/* Auth Pages */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset" element={<ResetPassword />} />
        </Route>

        {/* Admin Routes */}
        <Route
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            </RequireAuth>
          }
        >
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/goals" element={<AllGoals />} />
          <Route path="/admin/marketplace" element={<MarketplaceControl />} />
          <Route path="/admin/finance" element={<FinancialOverview />} />
          <Route path="/admin/analytics" element={<SystemAnalytics />} />
        </Route>

{/* User Routes */}
        <Route
          element={
            <RequireAuth>
              <RequireUser>
                <UserLayout />
              </RequireUser>
            </RequireAuth>
          }
        >
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/finances" element={<FinancesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/find-buyers" element={<GeoMatching />} />
          <Route path="/connection-requests" element={<ConnectionRequests />} />
        </Route>

        {/* Buyer Routes */}
        <Route
          element={
            <RequireAuth>
              <RequireBuyer>
                <BuyerLayout />
              </RequireBuyer>
            </RequireAuth>
          }
        >
          <Route path="/buyer-dashboard" element={<BuyerDashboard />} />
          <Route path="/buyer-profile" element={<BuyerProfile />} />
          <Route path="/find-goal-setters" element={<BuyerGeoMatching />} />
          <Route path="/buyer-marketplace" element={<BuyerMarketplace />} />
        </Route>

        {/* Role-based redirect */}
        <Route
          element={
            <RequireAuth>
              <RoleRedirect />
            </RequireAuth>
          }
        >
          <Route path="/dashboard-redirect" element={<div />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Footer />
      <ToastContainer position="top-right" autoClose={2000} />
    </>
  );
}
