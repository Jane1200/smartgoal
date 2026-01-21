import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: "all",
    days: 7
  });

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      const { data } = await api.get("/activity-logs", { params: filters });
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/activity-logs/stats");
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "1400px" }}>
      <div className="mb-4">
        <h2 className="mb-1 fw-bold">Activity Logs</h2>
        <p className="text-muted mb-0">Monitor system activity and user actions</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small mb-1">Today</div>
                <h3 className="mb-0">{stats.overview.today}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small mb-1">This Week</div>
                <h3 className="mb-0">{stats.overview.thisWeek}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small mb-1">Total</div>
                <h3 className="mb-0">{stats.overview.total}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small">Category</label>
              <select 
                className="form-select"
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="all">All Categories</option>
                <option value="user">User</option>
                <option value="goal">Goal</option>
                <option value="marketplace">Marketplace</option>
                <option value="report">Report</option>
                <option value="system">System</option>
                <option value="auth">Authentication</option>
                <option value="security">Security</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label small">Time Range</label>
              <select 
                className="form-select"
                value={filters.days}
                onChange={(e) => setFilters({...filters, days: e.target.value})}
              >
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {logs.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p>No activity logs found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Action</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>{log.userId?.name || "System"}</td>
                      <td>
                        <code className="small">{log.action}</code>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{log.category}</span>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: "300px" }}>
                        {log.description}
                      </td>
                      <td className="small text-muted">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
