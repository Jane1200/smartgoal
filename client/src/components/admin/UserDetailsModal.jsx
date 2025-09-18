import React, { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function UserDetailsModal({ isOpen, onClose, user, onUserUpdate }) {
  const [userGoals, setUserGoals] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchUserDetails = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user goals
      const goalsResponse = await api.get(`/admin/users/${user.id}/goals`);
      setUserGoals(goalsResponse.data || []);

      // Fetch user activity
      const activityResponse = await api.get(`/admin/users/${user.id}/activity`);
      setUserActivity(activityResponse.data || []);
    } catch (error) {
      console.error("Failed to fetch user details:", error);
      setUserGoals([]);
      setUserActivity([]);
      
      if (error.response?.status === 401) {
        toast.error("Unauthorized access. Please log in again.");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to view user details.");
      } else if (error.response?.status === 404) {
        toast.error("User not found.");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("Failed to load user details. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch details when modal opens
  useEffect(() => {
    if (isOpen && user) {
      fetchUserDetails();
    }
  }, [isOpen, user]);

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-danger';
      case 'goal_setter':
        return 'bg-primary';
      case 'buyer':
        return 'bg-secondary';
      default:
        return 'bg-light text-dark';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'goal_setter':
        return 'Goal Setter';
      case 'buyer':
        return 'Buyer';
      default:
        return role;
    }
  };

  const getStatusBadgeClass = (status) => {
    return status === 'active' ? 'bg-success' : 'bg-warning';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleStatusToggle = async () => {
    if (!user) return;
    
    try {
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await api.patch(`/admin/users/${user.id}/status`, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      onUserUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to update user status:", error);
      
      if (error.response?.status === 400) {
        toast.error("Invalid request. Please check the user data.");
      } else if (error.response?.status === 401) {
        toast.error("Unauthorized access. Please log in again.");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to update user status.");
      } else if (error.response?.status === 404) {
        toast.error("User not found.");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("Failed to update user status. Please try again.");
      }
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <div className="d-flex align-items-center">
              <div className="avatar-lg bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h5 className="modal-title mb-1">{user.name}</h5>
                <p className="text-muted mb-0">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body">
            {/* User Status and Role */}
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted">Role:</span>
                  <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                    {getRoleDisplayName(user.role)}
                  </span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted">Status:</span>
                  <span className={`badge ${getStatusBadgeClass(user.status)}`}>
                    {user.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <ul className="nav nav-tabs" role="tablist">
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
              </li>
              {user.role === 'goal_setter' && (
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'goals' ? 'active' : ''}`}
                    onClick={() => setActiveTab('goals')}
                  >
                    Goals ({userGoals.length})
                  </button>
                </li>
              )}
              {user.role === 'buyer' && (
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'purchases' ? 'active' : ''}`}
                    onClick={() => setActiveTab('purchases')}
                  >
                    Purchases (0)
                  </button>
                </li>
              )}
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeTab === 'activity' ? 'active' : ''}`}
                  onClick={() => setActiveTab('activity')}
                >
                  Activity ({userActivity.length})
                </button>
              </li>
            </ul>

            {/* Tab Content */}
            <div className="tab-content mt-3">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="row g-4">
                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header">
                        <h6 className="card-title mb-0">Account Information</h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-2">
                          <div className="col-6">
                            <small className="text-muted">User ID</small>
                            <div className="font-monospace small">{user.id}</div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted">Email</small>
                            <div>{user.email}</div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted">Role</small>
                            <div>
                              <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                                {getRoleDisplayName(user.role)}
                              </span>
                            </div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted">Status</small>
                            <div>
                              <span className={`badge ${getStatusBadgeClass(user.status)}`}>
                                {user.status === 'active' ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted">Joined</small>
                            <div>{formatDate(user.joinedAt)}</div>
                          </div>
                          <div className="col-6">
                            <small className="text-muted">Last Login</small>
                            <div>{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="card">
                      <div className="card-header">
                        <h6 className="card-title mb-0">Statistics</h6>
                      </div>
                      <div className="card-body">
                        <div className="row g-3">
                          {user.role === 'goal_setter' ? (
                            <>
                              <div className="col-6">
                                <div className="text-center">
                                  <div className="h4 mb-1 text-primary">{userGoals.length}</div>
                                  <div className="small text-muted">Goals Created</div>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="text-center">
                                  <div className="h4 mb-1 text-success">
                                    {userGoals.filter(g => g.status === 'completed').length}
                                  </div>
                                  <div className="small text-muted">Goals Completed</div>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="text-center">
                                  <div className="h4 mb-1 text-warning">
                                    ₹{userGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0).toLocaleString()}
                                  </div>
                                  <div className="small text-muted">Total Saved</div>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="text-center">
                                  <div className="h4 mb-1 text-info">
                                    ₹{userGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0).toLocaleString()}
                                  </div>
                                  <div className="small text-muted">Total Target</div>
                                </div>
                              </div>
                            </>
                          ) : user.role === 'buyer' ? (
                            <>
                              <div className="col-6">
                                <div className="text-center">
                                  <div className="h4 mb-1 text-primary">0</div>
                                  <div className="small text-muted">Items Purchased</div>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="text-center">
                                  <div className="h4 mb-1 text-success">₹0</div>
                                  <div className="small text-muted">Total Spent</div>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="text-center">
                                  <div className="h4 mb-1 text-warning">0</div>
                                  <div className="small text-muted">Wishlist Items</div>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="text-center">
                                  <div className="h4 mb-1 text-info">Buyer</div>
                                  <div className="small text-muted">Account Type</div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="col-6">
                                <div className="text-center">
                                  <div className="h4 mb-1 text-primary">Admin</div>
                                  <div className="small text-muted">User Role</div>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="text-center">
                                  <div className="h4 mb-1 text-success">
                                    {user.status === 'active' ? 'Active' : 'Inactive'}
                                  </div>
                                  <div className="small text-muted">Account Status</div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Goals Tab */}
              {activeTab === 'goals' && user.role === 'goal_setter' && (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Goal Title</th>
                        <th>Target Amount</th>
                        <th>Current Amount</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="text-center">
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            <span className="ms-2">Loading goals...</span>
                          </td>
                        </tr>
                      ) : userGoals.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center text-muted">
                            No goals found
                          </td>
                        </tr>
                      ) : (
                        userGoals.map(goal => (
                          <tr key={goal.id}>
                            <td>{goal.title}</td>
                            <td>₹{goal.targetAmount.toLocaleString()}</td>
                            <td>₹{(goal.currentAmount || 0).toLocaleString()}</td>
                            <td>
                              <div className="progress" style={{ height: '6px' }}>
                                <div 
                                  className="progress-bar" 
                                  style={{ 
                                    width: `${Math.min((goal.currentAmount || 0) / goal.targetAmount * 100, 100)}%` 
                                  }}
                                ></div>
                              </div>
                              <small className="text-muted">
                                {Math.round((goal.currentAmount || 0) / goal.targetAmount * 100)}%
                              </small>
                            </td>
                            <td>
                              <span className={`badge ${
                                goal.status === 'completed' ? 'bg-success' : 
                                goal.status === 'active' ? 'bg-primary' : 'bg-secondary'
                              }`}>
                                {goal.status}
                              </span>
                            </td>
                            <td>{new Date(goal.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Purchases Tab */}
              {activeTab === 'purchases' && user.role === 'buyer' && (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Item Title</th>
                        <th>Seller</th>
                        <th>Price</th>
                        <th>Purchase Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          <div className="text-muted">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-muted mb-3">
                              <path d="M16 11V7a4 4 0 0 0-8 0v4"/>
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <circle cx="12" cy="16" r="1"/>
                            </svg>
                            <h6 className="text-muted">No purchases found</h6>
                            <p className="text-muted small mb-0">
                              This buyer hasn't made any purchases yet.
                            </p>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Details</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="3" className="text-center">
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            <span className="ms-2">Loading activity...</span>
                          </td>
                        </tr>
                      ) : userActivity.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="text-center text-muted">
                            No activity found
                          </td>
                        </tr>
                      ) : (
                        userActivity.map(activity => (
                          <tr key={activity.id}>
                            <td>
                              <span className="badge bg-light text-dark">
                                {activity.action}
                              </span>
                            </td>
                            <td>{activity.details}</td>
                            <td>{formatDate(activity.timestamp)} {new Date(activity.timestamp).toLocaleTimeString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className={`btn ${user.status === 'active' ? 'btn-warning' : 'btn-success'}`}
              onClick={handleStatusToggle}
            >
              {user.status === 'active' ? 'Deactivate User' : 'Activate User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
