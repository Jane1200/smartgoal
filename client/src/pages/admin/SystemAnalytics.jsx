import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "@/utils/api.js";

export default function SystemAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchAnalytics();
    fetchMetrics();
    
    // Set up real-time updates every 15 seconds for system metrics
    const interval = setInterval(() => {
      fetchAnalytics(true); // Silent refresh
      fetchMetrics(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get("/admin/analytics/system");
      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch system analytics:", error);
      if (!silent) toast.error("Failed to fetch system analytics");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMetrics = async (silent = false) => {
    try {
      const { data } = await api.get("/admin/analytics/metrics");
      setMetrics(data);
    } catch (error) {
      console.error("Failed to fetch system metrics:", error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadge = (role) => {
    const roleClasses = {
      admin: 'bg-danger',
      goal_setter: 'bg-primary',
      buyer: 'bg-success'
    };
    return roleClasses[role] || 'bg-secondary';
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: 'bg-success',
      completed: 'bg-primary',
      pending: 'bg-warning',
      archived: 'bg-secondary',
      sold: 'bg-info'
    };
    return statusClasses[status] || 'bg-secondary';
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
    <div className="container-xxl py-4 system-analytics">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">System Analytics</h2>
          <p className="text-muted mb-0">
            Real-time system monitoring and analytics • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="badge bg-success">Live Data</div>
          <div className="badge bg-info">Auto Refresh</div>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => fetchAnalytics()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* System Health Status */}
      {metrics && (
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card admin-stat-card admin-stat-success h-100">
              <div className="card-body text-center">
                <h6 className="card-title">System Uptime</h6>
                <h4 className="mb-0">{formatUptime(metrics.uptime)}</h4>
                <small className="text-muted">Running</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card admin-stat-card admin-stat-info h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Memory Usage</h6>
                <h4 className="mb-0">{formatBytes(metrics.memory.heapUsed)}</h4>
                <small className="text-muted">of {formatBytes(metrics.memory.heapTotal)}</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card admin-stat-card admin-stat-warning h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Node Version</h6>
                <h4 className="mb-0">{metrics.platform.nodeVersion}</h4>
                <small className="text-muted">{metrics.platform.platform}</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card admin-stat-card admin-stat-primary h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Database Status</h6>
                <h4 className="mb-0 text-success">✓ Connected</h4>
                <small className="text-muted">All systems operational</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      {analytics && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card admin-stat-card admin-stat-primary h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Total Users</h6>
                <h3 className="mb-0">{analytics.overview.totalUsers.toLocaleString()}</h3>
                <small className="text-muted">{analytics.overview.verifiedUsers} verified</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card admin-stat-card admin-stat-info h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Total Goals</h6>
                <h3 className="mb-0">{analytics.overview.totalGoals.toLocaleString()}</h3>
                <small className="text-muted">{analytics.goals.completedThisWeek} completed this week</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card admin-stat-card admin-stat-success h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Financial Records</h6>
                <h3 className="mb-0">{analytics.overview.totalFinancialRecords.toLocaleString()}</h3>
                <small className="text-muted">{formatCurrency(analytics.overview.totalIncome)} total income</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card admin-stat-card admin-stat-warning h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Marketplace</h6>
                <h3 className="mb-0">{analytics.overview.totalMarketplaceListings.toLocaleString()}</h3>
                <small className="text-muted">{formatCurrency(analytics.overview.marketplaceRevenue)} revenue</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Overview */}
      {analytics && (
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">Activity Last 24 Hours</h6>
              </div>
              <div className="card-body">
                <div className="row g-2">
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Users Active</span>
                      <span className="fw-semibold">{analytics.activity.last24Hours.users}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Goals Updated</span>
                      <span className="fw-semibold">{analytics.activity.last24Hours.goals}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Financial Records</span>
                      <span className="fw-semibold">{analytics.activity.last24Hours.finances}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Marketplace Activity</span>
                      <span className="fw-semibold">{analytics.activity.last24Hours.marketplace}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Purchases</span>
                      <span className="fw-semibold">{analytics.activity.last24Hours.purchases}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">This Week's Activity</h6>
              </div>
              <div className="card-body">
                <div className="row g-2">
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>New Users</span>
                      <span className="fw-semibold text-success">+{analytics.activity.thisWeek.users}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Goals Created</span>
                      <span className="fw-semibold text-primary">+{analytics.activity.thisWeek.goals}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Financial Records</span>
                      <span className="fw-semibold text-info">+{analytics.activity.thisWeek.finances}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Marketplace Listings</span>
                      <span className="fw-semibold text-warning">+{analytics.activity.thisWeek.marketplace}</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex justify-content-between">
                      <span>Purchases</span>
                      <span className="fw-semibold text-danger">+{analytics.activity.thisWeek.purchases}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Analytics */}
      <div className="card mb-4">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
                Overview
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                Users
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'goals' ? 'active' : ''}`}
                onClick={() => setActiveTab('goals')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
                Goals
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'finances' ? 'active' : ''}`}
                onClick={() => setActiveTab('finances')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <rect x="2" y="6" width="20" height="12" rx="2"/>
                  <path d="M6 10h12"/>
                  <path d="M6 14h12"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
                Finances
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'marketplace' ? 'active' : ''}`}
                onClick={() => setActiveTab('marketplace')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                  <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
                </svg>
                Marketplace
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          {activeTab === 'overview' && analytics && (
            <div className="row g-4">
              <div className="col-md-6">
                <h6>System Health</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td>Database Status</td>
                        <td><span className="badge bg-success">Connected</span></td>
                      </tr>
                      <tr>
                        <td>System Uptime</td>
                        <td>{formatUptime(analytics.systemHealth.uptime)}</td>
                      </tr>
                      <tr>
                        <td>Node Version</td>
                        <td>{analytics.systemHealth.nodeVersion}</td>
                      </tr>
                      <tr>
                        <td>Platform</td>
                        <td>{analytics.systemHealth.platform}</td>
                      </tr>
                      <tr>
                        <td>Last Updated</td>
                        <td>{formatDate(analytics.systemHealth.timestamp)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="col-md-6">
                <h6>Quick Stats</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td>Total Users</td>
                        <td className="fw-semibold">{analytics.overview.totalUsers.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Total Goals</td>
                        <td className="fw-semibold">{analytics.overview.totalGoals.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Financial Records</td>
                        <td className="fw-semibold">{analytics.overview.totalFinancialRecords.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Marketplace Listings</td>
                        <td className="fw-semibold">{analytics.overview.totalMarketplaceListings.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Total Purchases</td>
                        <td className="fw-semibold">{analytics.overview.totalPurchases.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && analytics && (
            <div className="row g-4">
              <div className="col-md-6">
                <h6>Users by Role</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Count</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.users.byRole.map((role, index) => (
                        <tr key={role._id}>
                          <td>
                            <span className={`badge ${getRoleBadge(role._id)}`}>
                              {role._id}
                            </span>
                          </td>
                          <td className="fw-semibold">{role.count}</td>
                          <td>
                            {((role.count / analytics.overview.totalUsers) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="col-md-6">
                <h6>Top Active Users</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Activity</th>
                        <th>Goals</th>
                        <th>Finances</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.users.topActive.slice(0, 5).map((user, index) => (
                        <tr key={user._id}>
                          <td>
                            <div>
                              <div className="fw-semibold">{user.name}</div>
                              <small className="text-muted">{user.email}</small>
                            </div>
                          </td>
                          <td className="fw-semibold">{user.totalActivity}</td>
                          <td>{user.goalsCount}</td>
                          <td>{user.financesCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'goals' && analytics && (
            <div className="row g-4">
              <div className="col-md-6">
                <h6>Goals by Status</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Count</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.goals.byStatus.map((status, index) => (
                        <tr key={status._id}>
                          <td>
                            <span className={`badge ${getStatusBadge(status._id)}`}>
                              {status._id}
                            </span>
                          </td>
                          <td className="fw-semibold">{status.count}</td>
                          <td>
                            {((status.count / analytics.overview.totalGoals) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="col-md-6">
                <h6>Goal Activity</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td>Goals Created This Week</td>
                        <td className="fw-semibold text-primary">{analytics.goals.createdThisWeek}</td>
                      </tr>
                      <tr>
                        <td>Goals Completed This Week</td>
                        <td className="fw-semibold text-success">{analytics.goals.completedThisWeek}</td>
                      </tr>
                      <tr>
                        <td>Completion Rate</td>
                        <td className="fw-semibold">
                          {analytics.overview.totalGoals > 0 
                            ? ((analytics.goals.completedThisWeek / analytics.goals.createdThisWeek) * 100).toFixed(1)
                            : 0}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'finances' && analytics && (
            <div className="row g-4">
              <div className="col-md-6">
                <h6>Financial Overview</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td>Total Income</td>
                        <td className="fw-semibold text-success">{formatCurrency(analytics.finances.totalIncome)}</td>
                      </tr>
                      <tr>
                        <td>Total Expenses</td>
                        <td className="fw-semibold text-danger">{formatCurrency(analytics.finances.totalExpense)}</td>
                      </tr>
                      <tr>
                        <td>Net Savings</td>
                        <td className={`fw-semibold ${analytics.finances.netSavings >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(analytics.finances.netSavings)}
                        </td>
                      </tr>
                      <tr>
                        <td>Records This Week</td>
                        <td className="fw-semibold">{analytics.finances.recordsThisWeek}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="col-md-6">
                <h6>Financial Health</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td>Savings Rate</td>
                        <td className="fw-semibold">
                          {analytics.finances.totalIncome > 0 
                            ? ((analytics.finances.netSavings / analytics.finances.totalIncome) * 100).toFixed(1)
                            : 0}%
                        </td>
                      </tr>
                      <tr>
                        <td>Average Income</td>
                        <td className="fw-semibold">
                          {analytics.finances.recordsThisWeek > 0 
                            ? formatCurrency(analytics.finances.totalIncome / analytics.finances.recordsThisWeek)
                            : formatCurrency(0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'marketplace' && analytics && (
            <div className="row g-4">
              <div className="col-md-6">
                <h6>Marketplace by Status</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Count</th>
                        <th>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.marketplace.byStatus.map((status, index) => (
                        <tr key={status._id}>
                          <td>
                            <span className={`badge ${getStatusBadge(status._id)}`}>
                              {status._id}
                            </span>
                          </td>
                          <td className="fw-semibold">{status.count}</td>
                          <td>
                            {((status.count / analytics.overview.totalMarketplaceListings) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="col-md-6">
                <h6>Marketplace Activity</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td>Listings Created This Week</td>
                        <td className="fw-semibold text-primary">{analytics.marketplace.listingsCreatedThisWeek}</td>
                      </tr>
                      <tr>
                        <td>Total Revenue</td>
                        <td className="fw-semibold text-success">{formatCurrency(analytics.marketplace.revenue)}</td>
                      </tr>
                      <tr>
                        <td>Average Sale Price</td>
                        <td className="fw-semibold">
                          {analytics.marketplace.byStatus.find(s => s._id === 'sold')?.count > 0
                            ? formatCurrency(analytics.marketplace.revenue / analytics.marketplace.byStatus.find(s => s._id === 'sold').count)
                            : formatCurrency(0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


