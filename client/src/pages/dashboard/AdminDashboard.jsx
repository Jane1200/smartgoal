import { useEffect, useState } from "react";
import api from "@/utils/api.js";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: {
      total: 0,
      active: 0,
      newThisWeek: 0,
      byRole: { admin: 0, goalSetter: 0, buyer: 0 },
      byProvider: { local: 0, google: 0 }
    },
    goals: {
      total: 0,
      active: 0,
      completed: 0
    },
    system: {
      health: "Good",
      uptime: "99.9%"
    },
    geo: {
      byCountry: [],
      byState: [],
      byCity: []
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const { data } = await api.get("/admin/stats");
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
      // Fallback to mock data if API fails
      setStats({
        users: {
          total: 0,
          active: 0,
          newThisWeek: 0,
          byRole: { admin: 0, goalSetter: 0, buyer: 0 },
          byProvider: { local: 0, google: 0 }
        },
        goals: {
          total: 0,
          active: 0,
          completed: 0
        },
        system: {
          health: "Good",
          uptime: "99.9%"
        },
        geo: {
          byCountry: [],
          byState: [],
          byCity: []
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-xxl py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "1400px" }}>
      {/* Header */}
      <div className="mb-4">
        <h2 className="mb-1 fw-bold">Admin Dashboard</h2>
        <p className="text-muted mb-0">Monitor system statistics and user activity</p>
      </div>

      {/* Key Metrics */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small mb-2">Total Users</div>
                  <h2 className="mb-0 fw-bold">{stats.users.total.toLocaleString()}</h2>
                  <div className="text-success small mt-1">
                    <span>+{stats.users.newThisWeek} this week</span>
                  </div>
                </div>
                <div className="bg-primary bg-opacity-10 p-3 rounded">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 0 0-7-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small mb-2">Active Users</div>
                  <h2 className="mb-0 fw-bold text-success">{stats.users.active.toLocaleString()}</h2>
                  <div className="text-muted small mt-1">
                    <span>{stats.users.total > 0 ? Math.round((stats.users.active / stats.users.total) * 100) : 0}% of total</span>
                  </div>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small mb-2">Total Goals</div>
                  <h2 className="mb-0 fw-bold text-info">{stats.goals.total.toLocaleString()}</h2>
                  <div className="text-muted small mt-1">
                    <span>{stats.goals.completed} completed</span>
                  </div>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-muted small mb-2">System Health</div>
                  <h2 className="mb-0 fw-bold text-warning">{stats.system.health}</h2>
                  <div className="text-muted small mt-1">
                    <span>{stats.system.uptime} uptime</span>
                  </div>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* User Roles Breakdown */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0 fw-semibold">User Roles</h6>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-danger bg-opacity-10 p-2 rounded">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-danger">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <span className="fw-medium">Admins</span>
                </div>
                <span className="badge bg-danger">{stats.users.byRole.admin}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary bg-opacity-10 p-2 rounded">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <span className="fw-medium">Goal Setters</span>
                </div>
                <span className="badge bg-primary">{stats.users.byRole.goalSetter}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-success bg-opacity-10 p-2 rounded">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success">
                      <path d="M3 3h18v18H3z"/>
                      <path d="M9 9h6v6H9z"/>
                    </svg>
                  </div>
                  <span className="fw-medium">Buyers</span>
                </div>
                <span className="badge bg-success">{stats.users.byRole.buyer}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Providers */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0 fw-semibold">Authentication</h6>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-info bg-opacity-10 p-2 rounded">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </div>
                  <span className="fw-medium">Local Auth</span>
                </div>
                <span className="badge bg-info">{stats.users.byProvider.local}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-warning bg-opacity-10 p-2 rounded">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 2v20M2 12h20"/>
                    </svg>
                  </div>
                  <span className="fw-medium">Google OAuth</span>
                </div>
                <span className="badge bg-warning">{stats.users.byProvider.google}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Goals Overview */}
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0 fw-semibold">Goals Overview</h6>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary bg-opacity-10 p-2 rounded">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  </div>
                  <span className="fw-medium">Active Goals</span>
                </div>
                <span className="badge bg-primary">{stats.goals.active}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-success bg-opacity-10 p-2 rounded">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <span className="fw-medium">Completed</span>
                </div>
                <span className="badge bg-success">{stats.goals.completed}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Quick Actions */}
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0 fw-semibold">Quick Actions</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <a href="/admin/users" className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    Manage Users
                  </a>
                </div>
                <div className="col-md-3">
                  <a href="/admin/goals" className="btn btn-outline-success w-100 d-flex align-items-center justify-content-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    View Goals
                  </a>
                </div>
                <div className="col-md-3">
                  <button className="btn btn-outline-info w-100 d-flex align-items-center justify-content-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h18v18H3z"/>
                      <path d="M9 9h6v6H9z"/>
                    </svg>
                    Marketplace
                  </button>
                </div>
                <div className="col-md-3">
                  <button className="btn btn-outline-warning w-100 d-flex align-items-center justify-content-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M2 12h20"/>
                    </svg>
                    Analytics
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        {/* Geographic Analytics Section */}
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-semibold d-flex align-items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                Geographic User Distribution
              </h6>
              <span className="badge bg-primary">Live Data</span>
            </div>
            <div className="card-body">
              <div className="row g-4">
                {/* By Country */}
                <div className="col-md-4">
                  <h6 className="text-muted mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <path d="M3 3h18v18H3z"/>
                    </svg>
                    By Country
                  </h6>
                  <div className="list-group list-group-flush">
                    {stats.geo.byCountry && stats.geo.byCountry.length > 0 ? (
                      stats.geo.byCountry.slice(0, 5).map((item, index) => (
                        <div key={index} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <span className="badge bg-primary rounded-circle me-2" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                              {index + 1}
                            </span>
                            <span className="fw-medium">{item._id || 'Unknown'}</span>
                          </div>
                          <div className="text-end">
                            <span className="badge bg-success">{item.count}</span>
                            <small className="text-muted ms-2">
                              {stats.users.total > 0 ? ((item.count / stats.users.total) * 100).toFixed(1) : 0}%
                            </small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-3 text-muted">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2 opacity-50">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4M12 8h.01"/>
                        </svg>
                        <p className="mb-0 small">No country data available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* By State */}
                <div className="col-md-4">
                  <h6 className="text-muted mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    By State/Region
                  </h6>
                  <div className="list-group list-group-flush">
                    {stats.geo.byState && stats.geo.byState.length > 0 ? (
                      stats.geo.byState.slice(0, 5).map((item, index) => (
                        <div key={index} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <span className="badge bg-info rounded-circle me-2" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                              {index + 1}
                            </span>
                            <span className="fw-medium">{item._id || 'Unknown'}</span>
                          </div>
                          <div className="text-end">
                            <span className="badge bg-success">{item.count}</span>
                            <small className="text-muted ms-2">
                              {stats.users.total > 0 ? ((item.count / stats.users.total) * 100).toFixed(1) : 0}%
                            </small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-3 text-muted">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2 opacity-50">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4M12 8h.01"/>
                        </svg>
                        <p className="mb-0 small">No state data available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* By City */}
                <div className="col-md-4">
                  <h6 className="text-muted mb-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    By City
                  </h6>
                  <div className="list-group list-group-flush">
                    {stats.geo.byCity && stats.geo.byCity.length > 0 ? (
                      stats.geo.byCity.slice(0, 5).map((item, index) => (
                        <div key={index} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <span className="badge bg-warning rounded-circle me-2" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                              {index + 1}
                            </span>
                            <span className="fw-medium">{item._id || 'Unknown'}</span>
                          </div>
                          <div className="text-end">
                            <span className="badge bg-success">{item.count}</span>
                            <small className="text-muted ms-2">
                              {stats.users.total > 0 ? ((item.count / stats.users.total) * 100).toFixed(1) : 0}%
                            </small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-3 text-muted">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2 opacity-50">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4M12 8h.01"/>
                        </svg>
                        <p className="mb-0 small">No city data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="row mt-4 pt-4 border-top">
                <div className="col-md-3 text-center">
                  <div className="text-muted small mb-1">Total Countries</div>
                  <div className="h4 mb-0 text-primary">
                    {stats.geo.byCountry ? stats.geo.byCountry.length : 0}
                  </div>
                </div>
                <div className="col-md-3 text-center">
                  <div className="text-muted small mb-1">Total States</div>
                  <div className="h4 mb-0 text-info">
                    {stats.geo.byState ? stats.geo.byState.length : 0}
                  </div>
                </div>
                <div className="col-md-3 text-center">
                  <div className="text-muted small mb-1">Total Cities</div>
                  <div className="h4 mb-0 text-warning">
                    {stats.geo.byCity ? stats.geo.byCity.length : 0}
                  </div>
                </div>
                <div className="col-md-3 text-center">
                  <div className="text-muted small mb-1">Coverage</div>
                  <div className="h4 mb-0 text-success">
                    {stats.geo.byCountry && stats.geo.byCountry.length > 0 ? 'Global' : 'Local'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
