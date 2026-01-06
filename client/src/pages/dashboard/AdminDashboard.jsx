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
    <div className="container-xxl py-4 admin-dashboard">

      {/* Key Metrics */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card admin-stat-card admin-stat-primary h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Total Users</h6>
                  <h2 className="mb-0">{stats.users.total.toLocaleString()}</h2>
                </div>
                <div className="align-self-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 0 0-7-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card admin-stat-card admin-stat-success h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Active Users</h6>
                  <h2 className="mb-0">{stats.users.active.toLocaleString()}</h2>
                </div>
                <div className="align-self-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card admin-stat-card admin-stat-info h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">Total Goals</h6>
                  <h2 className="mb-0">{stats.goals.total.toLocaleString()}</h2>
                </div>
                <div className="align-self-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card admin-stat-card admin-stat-warning h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="card-title">New This Week</h6>
                  <h2 className="mb-0">{stats.users.newThisWeek.toLocaleString()}</h2>
                </div>
                <div className="align-self-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2" y="6" width="20" height="12" rx="2"/>
                    <path d="M6 10h12"/>
                    <path d="M6 14h12"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* System Overview */}
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">System Overview</h5>
              <div className="btn-group" role="group">
                <button className="btn btn-sm btn-outline-primary">Export Data</button>
                <button className="btn btn-sm btn-primary">Generate Report</button>
              </div>
            </div>
            <div className="card-body">
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="avatar-lg bg-primary text-white rounded-circle d-flex align-items-center justify-content-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">User Management</h6>
                      <p className="text-muted mb-0">Manage all system users, roles, and permissions</p>
                      <a href="/admin/users" className="btn btn-sm btn-outline-primary mt-2">
                        Go to User Management
                      </a>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="avatar-lg bg-success text-white rounded-circle d-flex align-items-center justify-content-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                          <line x1="9" y1="9" x2="9.01" y2="9"/>
                          <line x1="15" y1="9" x2="15.01" y2="9"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Goals Analytics</h6>
                      <p className="text-muted mb-0">Monitor goal completion rates and user progress</p>
                      <button className="btn btn-sm btn-outline-success mt-2">
                        View Analytics
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="avatar-lg bg-info text-white rounded-circle d-flex align-items-center justify-content-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                          <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Marketplace Control</h6>
                      <p className="text-muted mb-0">Manage marketplace listings and transactions</p>
                      <button className="btn btn-sm btn-outline-info mt-2">
                        Manage Marketplace
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="avatar-lg bg-warning text-white rounded-circle d-flex align-items-center justify-content-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="6" width="20" height="12" rx="2"/>
                          <path d="M6 10h12"/>
                          <path d="M6 14h12"/>
                          <circle cx="12" cy="12" r="2"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Financial Overview</h6>
                      <p className="text-muted mb-0">Track revenue, transactions, and financial metrics</p>
                      <button className="btn btn-sm btn-outline-warning mt-2">
                        View Financials
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="col-12 col-lg-4">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Quick Stats</h6>
            </div>
            <div className="card-body">
              <div className="row g-2 text-center">
                <div className="col-6">
                  <div className="small text-muted">New This Week</div>
                  <div className="h5 mb-0 text-success">+{stats.users.newThisWeek}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Goals Completed</div>
                  <div className="h5 mb-0 text-primary">{stats.goals.completed}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Active Goals</div>
                  <div className="h5 mb-0 text-warning">{stats.goals.active}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">System Uptime</div>
                  <div className="h5 mb-0 text-info">{stats.system.uptime}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Geographic Analytics Section */}
      <div className="row g-4 mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                Geographic User Distribution
              </h5>
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
