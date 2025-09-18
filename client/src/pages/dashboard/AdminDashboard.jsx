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
    </div>
  );
}
