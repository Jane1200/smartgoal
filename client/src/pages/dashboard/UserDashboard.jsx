import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate, Link } from "react-router-dom";
import api from "@/utils/api.js";
import {
  EmojiEvents,
  TrendingUp,
  TrendingDown,
  FavoriteBorder,
  Storefront,
  Refresh,
  AccountBalanceWallet,
  AttachMoney,
  CalendarToday,
  TrendingFlat,
  CheckCircle,
  Warning,
  Add,
} from "@mui/icons-material";

export default function UserDashboard() {
  const auth = useAuth();
  const user = auth?.user;

  const [goals, setGoals] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [marketplaceListings, setMarketplaceListings] = useState([]);
  const [financeData, setFinanceData] = useState({
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlySavings: 0
  });
  const [sellerStats, setSellerStats] = useState({
    activeListings: 0,
    soldListings: 0,
    totalEarnings: 0,
    pendingListings: 0
  });
  const [todayActivities, setTodayActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchUserData(false);
    
    const interval = setInterval(() => {
      fetchUserData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchUserData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [goalsResponse, wishlistResponse, financeResponse, marketplaceResponse, sellerStatsResponse, activitiesResponse] = await Promise.allSettled([
        api.get("/goals"),
        api.get("/wishlist"),
        api.get("/finance/summary"),
        api.get("/marketplace/my-listings"),
        api.get("/marketplace/stats/seller"),
        api.get("/analytics/today-activity")
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

      if (sellerStatsResponse.status === 'fulfilled') {
        setSellerStats(sellerStatsResponse.value.data || {
          activeListings: 0,
          soldListings: 0,
          totalEarnings: 0,
          pendingListings: 0
        });
      }

      if (activitiesResponse.status === 'fulfilled') {
        setTodayActivities(activitiesResponse.value.data?.activities || []);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      if (isManualRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const activeGoals = goals.filter((g) => g.status !== "archived" && g.status !== "completed");
  const completedGoals = goals.filter((g) => g.status === "completed");
  
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

  // Calculate urgent goals (due within 7 days)
  const urgentGoals = activeGoals.filter(g => {
    if (!g.dueDate) return false;
    const daysRemaining = Math.ceil((new Date(g.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysRemaining >= 0 && daysRemaining <= 7;
  });

  // Calculate overdue goals
  const overdueGoals = activeGoals.filter(g => {
    if (!g.dueDate) return false;
    const daysRemaining = Math.ceil((new Date(g.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysRemaining < 0;
  });

  // Calculate total amount needed
  const totalAmountNeeded = activeGoals.reduce((sum, g) => {
    const remaining = (g.targetAmount || 0) - (g.currentAmount || 0);
    return sum + Math.max(0, remaining);
  }, 0);

  // Calculate total target
  const totalTarget = activeGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);

  // Calculate total saved toward goals
  const totalSaved = activeGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);

  // Get next milestone goal (closest due date with progress < 100%)
  const nextMilestone = activeGoals
    .filter(g => g.dueDate && g.targetAmount > (g.currentAmount || 0))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

  // Auth check - must be after all hooks
  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
      {/* Header - Matching Buyer Dashboard Style */}
      <div className="dashboard-hero">
        <div className="welcome-content">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h1 className="title d-flex align-items-center gap-2">
                Welcome{user?.profile?.name ? `, ${user.profile.name}` : ", hey"}
                <div className="welcome-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </h1>
              <div className="subtitle">
                Track your goals, manage finances, and achieve your dreams
              </div>
            </div>
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={() => fetchUserData(true)}
              disabled={refreshing}
              title="Refresh dashboard data"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', marginRight: '6px'}}>
                <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Goal Progress Ring */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body text-center">
              <div className="position-relative d-inline-block mb-3">
                <svg width="180" height="180" viewBox="0 0 180 180">
                  {/* Background circle */}
                  <circle
                    cx="90"
                    cy="90"
                    r="70"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="12"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="90"
                    cy="90"
                    r="70"
                    fill="none"
                    stroke="#161da3"
                    strokeWidth="12"
                    strokeDasharray={`${(avgProgress / 100) * 439.8} 439.8`}
                    strokeLinecap="round"
                    transform="rotate(-90 90 90)"
                  />
                </svg>
                <div className="position-absolute top-50 start-50 translate-middle text-center">
                  <div className="h1 mb-0 fw-bold text-primary">{avgProgress}%</div>
                  <small className="text-muted">Average Progress</small>
                </div>
              </div>
              <h6 className="text-muted mb-0">Overall Goal Progress</h6>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="row g-3 h-100">
            <div className="col-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="card-icon">
                      <EmojiEvents fontSize="small" />
                    </div>
                    <small className="text-muted">Active Goals</small>
                  </div>
                  <div className="h3 mb-0 text-primary">{activeGoals.length}</div>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="card-icon">
                      <CheckCircle fontSize="small" />
                    </div>
                    <small className="text-muted">Completed</small>
                  </div>
                  <div className="h3 mb-0 text-success">{completedGoals.length}</div>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="card-icon">
                      <AccountBalanceWallet fontSize="small" />
                    </div>
                    <small className="text-muted">Total Saved</small>
                  </div>
                  <div className="h4 mb-0 text-info">₹{totalSaved.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="card-icon">
                      <TrendingUp fontSize="small" />
                    </div>
                    <small className="text-muted">Amount Needed</small>
                  </div>
                  <div className="h4 mb-0 text-warning">₹{totalAmountNeeded.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Urgent Actions Section */}
      {(urgentGoals.length > 0 || overdueGoals.length > 0 || nextMilestone) && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-warning border-2">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Warning className="text-warning" />
                  <h5 className="mb-0">🔥 Needs Your Attention</h5>
                </div>

                <div className="row g-3">
                  {overdueGoals.length > 0 && (
                    <div className="col-md-4">
                      <div className="alert alert-danger mb-0">
                        <div className="fw-bold mb-1">⏰ {overdueGoals.length} Overdue Goal{overdueGoals.length > 1 ? 's' : ''}</div>
                        <small>These goals have passed their due date</small>
                        <Link to="/goals" className="btn btn-sm btn-danger mt-2 w-100">
                          Review Now
                        </Link>
                      </div>
                    </div>
                  )}

                  {urgentGoals.length > 0 && (
                    <div className="col-md-4">
                      <div className="alert alert-warning mb-0">
                        <div className="fw-bold mb-1">⚡ {urgentGoals.length} Urgent Goal{urgentGoals.length > 1 ? 's' : ''}</div>
                        <small>Due within 7 days</small>
                        <Link to="/goals" className="btn btn-sm btn-warning mt-2 w-100">
                          Take Action
                        </Link>
                      </div>
                    </div>
                  )}

                  {nextMilestone && (
                    <div className="col-md-4">
                      <div className="alert alert-info mb-0">
                        <div className="fw-bold mb-1">🎯 Next Milestone</div>
                        <small className="d-block mb-1">{nextMilestone.title}</small>
                        <small className="text-muted">
                          ₹{((nextMilestone.targetAmount || 0) - (nextMilestone.currentAmount || 0)).toLocaleString()} needed
                        </small>
                        <Link to="/goals" className="btn btn-sm btn-info mt-2 w-100">
                          View Goal
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Goals & Finance */}
      <div className="row g-4 mb-4">
        {/* Active Goals Section */}
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                  <EmojiEvents className="text-primary me-2" />
                  Your Active Goals
                </h5>
                <Link to="/goals" className="btn btn-sm btn-primary">
                  <Add fontSize="small" className="me-1" />
                  New Goal
                </Link>
              </div>

              {activeGoals.length === 0 ? (
                <div className="text-center py-5">
                  <EmojiEvents style={{ fontSize: '64px', opacity: 0.3 }} />
                  <h6 className="text-muted mt-3">No active goals yet</h6>
                  <p className="text-muted small mb-3">Start your financial journey by creating your first goal!</p>
                  <Link to="/goals" className="btn btn-primary">
                    Create Your First Goal
                  </Link>
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {activeGoals.slice(0, 4).map((g) => {
                    const current = Number(g.currentAmount || 0);
                    const target = Number(g.targetAmount || 0);
                    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                    const remaining = target - current;
                    const daysRemaining = g.dueDate ? Math.ceil((new Date(g.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                    const isOverdue = daysRemaining !== null && daysRemaining < 0;
                    const isUrgent = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;

                    return (
                      <div key={g._id} className={`border rounded p-3 ${isOverdue ? 'border-danger' : isUrgent ? 'border-warning' : ''}`}>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <h6 className="mb-0">{g.title}</h6>
                              {daysRemaining !== null && (
                                <span className={`badge ${isOverdue ? 'bg-danger' : isUrgent ? 'bg-warning text-dark' : 'bg-info'}`}>
                                  {isOverdue ? `${Math.abs(daysRemaining)}d overdue` : `${daysRemaining}d left`}
                                </span>
                              )}
                            </div>
                            {g.description && (
                              <small className="text-muted d-block mb-2">{g.description.substring(0, 80)}{g.description.length > 80 ? '...' : ''}</small>
                            )}
                          </div>
                          <div className="text-end ms-3">
                            <div className="fw-bold text-primary">{pct}%</div>
                            <small className="text-muted">₹{remaining.toLocaleString()} left</small>
                          </div>
                        </div>
                        
                        <div className="progress mb-2" style={{ height: '10px' }}>
                          <div 
                            className={`progress-bar ${pct >= 75 ? 'bg-success' : pct >= 50 ? 'bg-info' : pct >= 25 ? 'bg-warning' : 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">₹{current.toLocaleString()} / ₹{target.toLocaleString()}</small>
                          {g.dueDate && (
                            <small className="text-muted">
                              <CalendarToday fontSize="inherit" className="me-1" />
                              {new Date(g.dueDate).toLocaleDateString()}
                            </small>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {activeGoals.length > 4 && (
                    <Link to="/goals" className="btn btn-outline-primary">
                      View All {activeGoals.length} Goals →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Finance Summary & Quick Actions */}
        <div className="col-12 col-lg-4">
          <div className="d-grid gap-3">
            {/* Monthly Finance Card */}
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="mb-3">
                  <AttachMoney className="text-success me-1" />
                  This Month
                </h6>
                
                <div className="d-grid gap-2">
                  <div className="d-flex justify-content-between align-items-center p-2 bg-success bg-opacity-10 rounded">
                    <div className="d-flex align-items-center gap-2">
                      <TrendingUp fontSize="small" className="text-success" />
                      <small>Income</small>
                    </div>
                    <span className="fw-bold text-success">₹{financeData.monthlyIncome?.toLocaleString() || '0'}</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center p-2 bg-danger bg-opacity-10 rounded">
                    <div className="d-flex align-items-center gap-2">
                      <TrendingDown fontSize="small" className="text-danger" />
                      <small>Expenses</small>
                    </div>
                    <span className="fw-bold text-danger">₹{financeData.monthlyExpense?.toLocaleString() || '0'}</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center p-2 bg-primary bg-opacity-10 rounded">
                    <div className="d-flex align-items-center gap-2">
                      <AccountBalanceWallet fontSize="small" className="text-primary" />
                      <small>Savings</small>
                    </div>
                    <span className="fw-bold text-primary">₹{financeData.monthlySavings?.toLocaleString() || '0'}</span>
                  </div>
                </div>

                <Link to="/finances" className="btn btn-outline-success btn-sm w-100 mt-3">
                  View Finances
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card shadow-sm">
              <div className="card-body">
                <h6 className="mb-3">Quick Actions</h6>
                <div className="d-grid gap-2">
                  <Link to="/goals" className="btn btn-primary btn-sm">
                    <Add fontSize="small" className="me-1" />
                    Create New Goal
                  </Link>
                  <Link to="/finances" className="btn btn-success btn-sm">
                    <TrendingUp fontSize="small" className="me-1" />
                    Add Income
                  </Link>
                  <Link to="/wishlist" className="btn btn-outline-danger btn-sm">
                    <FavoriteBorder fontSize="small" className="me-1" />
                    View Wishlist ({wishlist.length})
                  </Link>
                  <Link to="/marketplace" className="btn btn-outline-warning btn-sm">
                    <Storefront fontSize="small" className="me-1" />
                    Marketplace ({marketplaceListings.length})
                  </Link>
                </div>
              </div>
            </div>

            {/* Motivational Card */}
            {activeGoals.length > 0 && (
              <div className="card shadow-sm bg-gradient" style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div className="card-body text-center">
                  <div className="mb-2" style={{ fontSize: '2rem' }}>🎯</div>
                  <h6 className="mb-2">Keep Going!</h6>
                  <p className="small mb-0 opacity-75">
                    You're {avgProgress}% closer to achieving your financial goals. Every step counts!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="mb-3">
                  <CheckCircle className="text-success me-2" />
                  Recently Completed Goals
                </h5>
                <div className="row g-3">
                  {completedGoals.slice(0, 3).map((g) => (
                    <div key={g._id} className="col-md-4">
                      <div className="border border-success rounded p-3 bg-success bg-opacity-10">
                        <div className="d-flex align-items-start gap-2">
                          <CheckCircle className="text-success mt-1" fontSize="small" />
                          <div className="flex-grow-1">
                            <h6 className="mb-1">{g.title}</h6>
                            <div className="text-success fw-bold">₹{(g.targetAmount || 0).toLocaleString()}</div>
                            <small className="text-muted">
                              Completed {new Date(g.updatedAt).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
