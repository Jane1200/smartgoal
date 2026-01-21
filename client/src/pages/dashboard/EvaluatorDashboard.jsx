import { useEffect, useState } from "react";
import api from "@/utils/api.js";
import { useNavigate } from "react-router-dom";

export default function EvaluatorDashboard() {
  const [stats, setStats] = useState({
    users: {
      total: 0,
      active: 0,
      byRole: { goal_setter: 0, buyer: 0, admin: 0, evaluator: 0 },
    },
    goals: {
      total: 0,
      active: 0,
      completed: 0,
    },
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvaluatorStats();
  }, []);

  const fetchEvaluatorStats = async () => {
    try {
      const { data } = await api.get("/evaluator/stats");
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch evaluator stats:", error);
      // Fallback to empty stats if API fails
      setStats({
        users: {
          total: 0,
          active: 0,
          byRole: { goal_setter: 0, buyer: 0, admin: 0, evaluator: 0 },
        },
        goals: {
          total: 0,
          active: 0,
          completed: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-xxl py-5">
        <div className="text-center">
          <div className="spinner-border text-info" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4 evaluator-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Evaluator Dashboard</h1>
          <p className="text-muted mb-0">
            Monitor and evaluate user activity and system metrics
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-info h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title text-muted">Total Users</h6>
                  <h2 className="mb-0 text-info">
                    {stats.users.total.toLocaleString()}
                  </h2>
                </div>
                <div className="align-self-center">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-info"
                  >
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-success h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title text-muted">Active Users</h6>
                  <h2 className="mb-0 text-success">
                    {stats.users.active.toLocaleString()}
                  </h2>
                </div>
                <div className="align-self-center">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-success"
                  >
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-primary h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title text-muted">Total Goals</h6>
                  <h2 className="mb-0 text-primary">
                    {stats.goals.total.toLocaleString()}
                  </h2>
                </div>
                <div className="align-self-center">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-primary"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6 col-lg-3">
          <div className="card border-warning h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="card-title text-muted">Active Goals</h6>
                  <h2 className="mb-0 text-warning">
                    {stats.goals.active.toLocaleString()}
                  </h2>
                </div>
                <div className="align-self-center">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-warning"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Overview */}
      <div className="row g-4">
        <div className="col-12 col-lg-8">
          <div className="card h-100">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">User Overview</h5>
              <button
                className="btn btn-sm btn-info"
                onClick={() => navigate("/evaluator/users")}
              >
                View All Users
              </button>
            </div>
            <div className="card-body">
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="avatar-lg bg-primary text-white rounded-circle d-flex align-items-center justify-content-center">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">User Management</h6>
                      <p className="text-muted mb-0">
                        View and evaluate all system users
                      </p>
                      <button
                        className="btn btn-sm btn-outline-primary mt-2"
                        onClick={() => navigate("/evaluator/users")}
                      >
                        View Users
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="avatar-lg bg-success text-white rounded-circle d-flex align-items-center justify-content-center">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                          <line x1="9" y1="9" x2="9.01" y2="9" />
                          <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Goals Analytics</h6>
                      <p className="text-muted mb-0">
                        Monitor goal completion and progress
                      </p>
                      <button
                        className="btn btn-sm btn-outline-success mt-2"
                        onClick={() => navigate("/evaluator/goals")}
                      >
                        View Goals
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
                  <div className="small text-muted">Goal Setters</div>
                  <div className="h5 mb-0 text-primary">
                    {stats.users.byRole.goal_setter || 0}
                  </div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Buyers</div>
                  <div className="h5 mb-0 text-success">
                    {stats.users.byRole.buyer || 0}
                  </div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Completed Goals</div>
                  <div className="h5 mb-0 text-warning">
                    {stats.goals.completed || 0}
                  </div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Active Goals</div>
                  <div className="h5 mb-0 text-info">
                    {stats.goals.active || 0}
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
