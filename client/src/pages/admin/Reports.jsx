import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    type: "all"
  });

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [filters]);

  const fetchReports = async () => {
    try {
      const { data } = await api.get("/reports", { params: filters });
      setReports(data.reports);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get("/reports/stats");
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleStatusUpdate = async (reportId, status) => {
    try {
      await api.patch(`/reports/${reportId}`, { status });
      toast.success("Report updated successfully");
      fetchReports();
      fetchStats();
    } catch (error) {
      console.error("Failed to update report:", error);
      toast.error("Failed to update report");
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
        <h2 className="mb-1 fw-bold">Reports & Disputes</h2>
        <p className="text-muted mb-0">Handle user complaints and disputes</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small mb-1">Pending</div>
                <h3 className="mb-0 text-warning">{stats.byStatus.pending}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small mb-1">Reviewing</div>
                <h3 className="mb-0 text-info">{stats.byStatus.reviewing}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small mb-1">Resolved</div>
                <h3 className="mb-0 text-success">{stats.byStatus.resolved}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="text-muted small mb-1">Total</div>
                <h3 className="mb-0">{stats.total}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label small">Status</label>
              <select 
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small">Category</label>
              <select 
                className="form-select"
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="all">All Categories</option>
                <option value="spam">Spam</option>
                <option value="fraud">Fraud</option>
                <option value="inappropriate">Inappropriate</option>
                <option value="harassment">Harassment</option>
                <option value="fake">Fake</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small">Type</label>
              <select 
                className="form-select"
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
              >
                <option value="all">All Types</option>
                <option value="user">User</option>
                <option value="marketplace_item">Marketplace Item</option>
                <option value="goal">Goal</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {reports.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p>No reports found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Reporter</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report._id}>
                      <td>{report.reporterId?.name || "Unknown"}</td>
                      <td>
                        <span className="badge bg-secondary">{report.type}</span>
                      </td>
                      <td>
                        <span className="badge bg-info">{report.category}</span>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: "200px" }}>
                        {report.description}
                      </td>
                      <td>
                        <span className={`badge ${
                          report.status === "pending" ? "bg-warning" :
                          report.status === "reviewing" ? "bg-info" :
                          report.status === "resolved" ? "bg-success" :
                          "bg-secondary"
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${
                          report.priority === "urgent" ? "bg-danger" :
                          report.priority === "high" ? "bg-warning" :
                          "bg-secondary"
                        }`}>
                          {report.priority}
                        </span>
                      </td>
                      <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          {report.status === "pending" && (
                            <button 
                              className="btn btn-outline-info"
                              onClick={() => handleStatusUpdate(report._id, "reviewing")}
                            >
                              Review
                            </button>
                          )}
                          {report.status === "reviewing" && (
                            <>
                              <button 
                                className="btn btn-outline-success"
                                onClick={() => handleStatusUpdate(report._id, "resolved")}
                              >
                                Resolve
                              </button>
                              <button 
                                className="btn btn-outline-secondary"
                                onClick={() => handleStatusUpdate(report._id, "dismissed")}
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        </div>
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
