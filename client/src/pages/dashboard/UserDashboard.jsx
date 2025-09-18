import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import QuickActions from "@/sections/QuickActions.jsx";
import { useEffect, useState } from "react";
import api from "@/utils/api.js";

export default function UserDashboard() {
  const auth = useAuth();
  const user = auth?.user;
  const logout = auth?.logout;

  // Redirect if not authenticated
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if not a goal setter
  if (user?.profile?.role !== "goal_setter") {
    return <Navigate to="/dashboard-redirect" replace />;
  }

  const [goals, setGoals] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [marketplaceListings, setMarketplaceListings] = useState([]);
  const [financeData, setFinanceData] = useState({
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlySavings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const [goalsResponse, wishlistResponse, financeResponse, marketplaceResponse] = await Promise.allSettled([
        api.get("/goals"),
        api.get("/wishlist"),
        api.get("/finance/summary"),
        api.get("/marketplace/my-listings")
      ]);

      if (goalsResponse.status === 'fulfilled') {
        setGoals(goalsResponse.value.data);
      }

      if (wishlistResponse.status === 'fulfilled') {
        setWishlist(wishlistResponse.value.data);
      }

      if (financeResponse.status === 'fulfilled') {
        setFinanceData(financeResponse.value.data);
      }

      if (marketplaceResponse.status === 'fulfilled') {
        setMarketplaceListings(marketplaceResponse.value.data);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh marketplace data (can be called from other components)
  const refreshMarketplaceData = async () => {
    try {
      const response = await api.get("/marketplace/my-listings");
      setMarketplaceListings(response.data);
    } catch (error) {
      console.error("Failed to refresh marketplace data:", error);
    }
  };

  const activeGoals = goals.filter((g) => g.status !== "archived");
  const activeCount = activeGoals.length;
  const avgProgress = (() => {
    if (activeGoals.length === 0) return 0;
    const sum = activeGoals.reduce((acc, g) => {
      const cur = Number(g.currentAmount || 0);
      const tgt = Number(g.targetAmount || 0);
      const pct = tgt > 0 ? Math.min(100, (cur / tgt) * 100) : 0;
      return acc + pct;
    }, 0);
    return Math.round(sum / activeGoals.length);
  })();

  const savedPctThisMonth = 0;
  const recentActivity = [];

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5 dashboard-page user-dashboard">
      <div className="dashboard-hero">
        <div className="welcome-content">
          <h1 className="title d-flex align-items-center gap-2">
            Welcome{user?.profile?.name ? `, ${user.profile.name}` : ", hey"}
            <div className="welcome-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </div>
          </h1>
          <div className="subtitle">Your goals, finances, and marketplace at a glance</div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Goal Progress */}
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </div>
                <h5 className="card-title mb-0">Goal Progress</h5>
              </div>
              {activeGoals.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-muted mb-2">No active goals yet</div>
                  <small className="text-muted">Create your first goal to get started!</small>
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {activeGoals.slice(0, 3).map((g) => {
                    const current = Number(g.currentAmount || 0);
                    const target = Number(g.targetAmount || 0);
                    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                    return (
                      <div key={g._id} className="goal-item">
                        <div className="d-flex justify-content-between small mb-2">
                          <div className="fw-semibold">{g.title}</div>
                          <div className="text-primary fw-bold">{pct}%</div>
                        </div>
                        <div className="progress">
                          <div className="progress-bar" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Income & Expense Summary */}
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div className="card-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="6" width="20" height="12" rx="2"/>
                    <path d="M6 10h12"/>
                    <path d="M6 14h12"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
                <h5 className="card-title mb-0">Income & Expense</h5>
              </div>
              <div className="row g-3">
                <div className="col">
                  <div className="small text-muted">This Month Income</div>
                  <div className="h4 mb-0">
                    {loading ? (
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : (
                      `₹${financeData.monthlyIncome?.toLocaleString() || '0'}`
                    )}
                  </div>
                </div>
                <div className="col">
                  <div className="small text-muted">This Month Expense</div>
                  <div className="h4 mb-0">
                    {loading ? (
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : (
                      `₹${financeData.monthlyExpense?.toLocaleString() || '0'}`
                    )}
                  </div>
                </div>
                <div className="col">
                  <div className="small text-muted">Saved</div>
                  <div className="h4 mb-0">
                    {loading ? (
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : (
                      `₹${financeData.monthlySavings?.toLocaleString() || '0'}`
                    )}
                  </div>
                  <div className="small text-muted">
                    {financeData.monthlyIncome > 0 ? 'Track your progress' : 'Connect finance to see trends'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Smart Wishlist Overview */}
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                    </svg>
                  </div>
                  <h5 className="card-title mb-0">Smart Wishlist</h5>
                </div>
                <button className="btn btn-sm btn-outline-primary">View Wishlist</button>
              </div>
              <div className="text-muted">
                {loading ? (
                  <div className="d-flex align-items-center gap-2">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Loading wishlist...
                  </div>
                ) : wishlist.length === 0 ? (
                  "No wishlist items yet."
                ) : (
                  `${wishlist.length} item${wishlist.length !== 1 ? 's' : ''} in your wishlist`
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Marketplace Listings */}
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                      <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
                    </svg>
                  </div>
                  <h5 className="card-title mb-0">Marketplace Listings</h5>
                </div>
                <a href="/marketplace" className="btn btn-sm btn-outline-primary">Manage</a>
              </div>
              
              {loading ? (
                <div className="d-flex align-items-center gap-2">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  Loading listings...
                </div>
              ) : marketplaceListings.length === 0 ? (
                <div className="text-muted">
                  No marketplace listings yet.
                  <br />
                  <small>Start selling items to fund your goals!</small>
                </div>
              ) : (
                <div className="d-grid gap-2">
                  {marketplaceListings.slice(0, 3).map((listing) => (
                    <div key={listing._id} className="d-flex align-items-center gap-3 p-2 border rounded">
                      <div className="flex-shrink-0">
                        <img
                          src={
                            listing.images?.[0]?.url || 
                            listing.images?.[0] || 
                            "https://via.placeholder.com/50x50?text=No+Image"
                          }
                          alt={listing.title}
                          className="rounded"
                          style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                        />
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-medium small">{listing.title}</div>
                        <div className="text-success fw-bold">₹{listing.price?.toLocaleString()}</div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`badge ${
                          listing.status === 'active' ? 'bg-success' : 
                          listing.status === 'sold' ? 'bg-primary' : 'bg-warning'
                        }`}>
                          {listing.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {marketplaceListings.length > 3 && (
                    <div className="text-center mt-2">
                      <small className="text-muted">
                        +{marketplaceListings.length - 3} more listings
                      </small>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="card-title mb-0">Recent Activity</h5>
              </div>
              <div className="text-muted">No recent activity yet.</div>
            </div>
          </div>
        </div>

        {/* Personal Stats */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="card-title">Your Progress</h6>
              <div className="row g-3 text-center">
                <div className="col-6">
                  <div className="small text-muted">Active Goals</div>
                  <div className="h4 mb-0 text-primary">{activeCount}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Avg Progress</div>
                  <div className="h4 mb-0 text-success">{avgProgress}%</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Listings</div>
                  <div className="h4 mb-0 text-info">{marketplaceListings.length}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Active Sales</div>
                  <div className="h4 mb-0 text-warning">
                    {marketplaceListings.filter(l => l.status === 'active').length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuickActions />
    </div>
  );
}
