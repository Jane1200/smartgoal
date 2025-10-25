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
    <>
      <style>{`
        .wishlist-hero {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 16px;
          padding: 3rem 2rem;
          margin-bottom: 2rem;
          position: relative;
          overflow: hidden;
        }

        .wishlist-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23cbd5e1' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          opacity: 0.5;
        }

        .wishlist-hero-content {
          position: relative;
          z-index: 1;
        }

        .wishlist-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(22, 29, 163, 0.1);
          color: #161da3;
          padding: 0.5rem 1rem;
          border-radius: 50px;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 1rem;
        }

        .wishlist-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 0.5rem;
          line-height: 1.1;
        }

        .wishlist-description {
          font-size: 1.125rem;
          color: #64748b;
          max-width: 600px;
          line-height: 1.6;
        }
      `}</style>

      <div className="container-xxl py-4">
        {/* Hero Section */}
        <div className="wishlist-hero">
          <div className="wishlist-hero-content">
            <div className="wishlist-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
              </svg>
              
            </div>
            
            <p className="wishlist-description">Save products you want, set priorities, and track your progress toward purchasing your dream items. Turn wishes into achievable goals!</p>
          </div>
        </div>

        <WishlistManager />
      </div>
    </>
  );
}





