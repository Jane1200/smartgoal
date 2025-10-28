import { useEffect, useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import UserDetailsModal from "@/components/admin/UserDetailsModal.jsx";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filterRole, searchTerm]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(filterRole !== "all" && { role: filterRole })
      });

      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
      setTotalPages(1);
      
      if (error.response?.status === 401) {
        toast.error("Unauthorized access. Please log in again.");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to view users.");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("Failed to load users. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };


  const handleUserAction = async (userId, action) => {
    try {
      switch (action) {
        case 'view':
          const user = users.find(u => u.id === userId);
          setSelectedUser(user);
          setShowUserDetailsModal(true);
          break;
        case 'delete':
          if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            await api.delete(`/admin/users/${userId}`);
            toast.success("User deleted successfully");
            fetchUsers();
          }
          break;
        case 'toggle-status':
          const userToUpdate = users.find(u => u.id === userId);
          const newStatus = userToUpdate.status === 'active' ? 'inactive' : 'active';
          await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
          toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
          fetchUsers();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Failed to perform ${action}:`, error);
      
      if (error.response?.status === 400) {
        toast.error("Invalid request. Please check the user data.");
      } else if (error.response?.status === 401) {
        toast.error("Unauthorized access. Please log in again.");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to perform this action.");
      } else if (error.response?.status === 404) {
        toast.error("User not found.");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error(`Failed to ${action} user. Please try again.`);
      }
    }
  };

  const handleExportUsers = async () => {
    try {
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(filterRole !== "all" && { role: filterRole })
      });

      const response = await api.get(`/admin/users/export?${params}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Users exported successfully");
    } catch (error) {
      console.error("Failed to export users:", error);
      
      if (error.response?.status === 401) {
        toast.error("Unauthorized access. Please log in again.");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to export users.");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("Failed to export users. Please try again.");
      }
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast.warning("Please select users first");
      return;
    }

    try {
      switch (action) {
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) {
            await api.delete("/admin/users/bulk", { 
              data: { userIds: selectedUsers } 
            });
            toast.success(`${selectedUsers.length} users deleted successfully`);
            setSelectedUsers([]);
            fetchUsers();
          }
          break;
        case 'activate':
          await api.patch("/admin/users/bulk", {
            userIds: selectedUsers,
            status: 'active'
          });
          toast.success(`${selectedUsers.length} users activated successfully`);
          setSelectedUsers([]);
          fetchUsers();
          break;
        case 'deactivate':
          await api.patch("/admin/users/bulk", {
            userIds: selectedUsers,
            status: 'inactive'
          });
          toast.success(`${selectedUsers.length} users deactivated successfully`);
          setSelectedUsers([]);
          fetchUsers();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error(`Failed to perform bulk ${action}:`, error);
      
      if (error.response?.status === 400) {
        toast.error("Invalid request. Please check your selection.");
      } else if (error.response?.status === 401) {
        toast.error("Unauthorized access. Please log in again.");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to perform bulk actions.");
      } else if (error.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (error.code === 'NETWORK_ERROR') {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error(`Failed to ${action} users. Please try again.`);
      }
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

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

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
                         user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const result = matchesSearch && matchesRole;
    
    // Debug logging
    if (filterRole === "goal_setter" && user.role === "goal_setter") {
      console.log("Filtering user:", user.name, "matchesRole:", matchesRole, "matchesSearch:", matchesSearch, "result:", result);
    }
    
    return result;
  });

  if (loading) {
    return (
      <div className="container-xxl py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading users...</span>
          </div>
          <p className="mt-3">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4 user-management">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h2 mb-2">User Management</h1>
              <p className="text-muted">Manage all users in the system</p>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-primary"
                onClick={handleExportUsers}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                Export Users
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Search Users</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Filter by Role</label>
                  <select
                    className="form-select"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="goal_setter">Goal Setter</option>
                    <option value="buyer">Buyer</option>
                  </select>
                </div>
                <div className="col-md-3 d-flex align-items-end">
                  <button className="btn btn-outline-secondary w-100" onClick={fetchUsers}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                      <polyline points="23,4 23,10 17,10"/>
                      <polyline points="1,20 1,14 7,14"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="alert alert-info d-flex justify-content-between align-items-center">
              <span>
                <strong>{selectedUsers.length}</strong> user{selectedUsers.length !== 1 ? 's' : ''} selected
              </span>
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-sm btn-success"
                  onClick={() => handleBulkAction('activate')}
                >
                  Activate
                </button>
                <button 
                  className="btn btn-sm btn-warning"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  Deactivate
                </button>
                <button 
                  className="btn btn-sm btn-danger"
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete
                </button>
                <button 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setSelectedUsers([])}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                Users ({filteredUsers.length})
              </h5>
              <div className="d-flex gap-2">
                <span className="badge bg-primary">
                  {users.filter(u => (u.activeRoles || [u.role]).includes('goal_setter')).length} Goal Setters
                </span>
                <span className="badge bg-secondary">
                  {users.filter(u => (u.activeRoles || [u.role]).includes('buyer')).length} Buyers
                </span>
                <span className="badge bg-danger">
                  {users.filter(u => (u.activeRoles || [u.role]).includes('admin')).length} Admins
                </span>
                <span className="badge bg-warning text-dark">
                  {users.filter(u => {
                    const roles = u.activeRoles || [u.role];
                    return (roles.includes('goal_setter') && roles.includes('buyer'));
                  }).length} Both Roles
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="text-muted small">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-muted small">User</th>
                      <th className="text-muted small">Role</th>
                      <th className="text-muted small">Status</th>
                      <th className="text-muted small">Activity</th>
                      <th className="text-muted small">Joined</th>
                      <th className="text-muted small">Last Login</th>
                      <th className="text-muted small text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <div className="spinner-border spinner-border-sm" role="status"></div>
                          <span className="ms-2">Loading users...</span>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-5">
                          <div className="text-muted">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-muted mb-3">
                              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                            <h6 className="text-muted">No users found</h6>
                            <p className="text-muted small mb-0">
                              {searchTerm || filterRole !== "all" 
                                ? "Try adjusting your search criteria or filters."
                                : "No users have been registered yet."
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                          />
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-semibold">{user.name}</div>
                              <div className="text-muted small">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {(user.activeRoles || [user.role]).map((role, index) => (
                              <span key={index} className={`badge ${getRoleBadgeClass(role)}`}>
                                {getRoleDisplayName(role)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${user.status === 'active' ? 'bg-success' : 'bg-warning'}`}>
                            {user.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {user.listingsCount > 0 && (
                              <span className="badge bg-primary text-white">
                                {user.listingsCount} listing{user.listingsCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {user.goalsCount > 0 && (
                              <span className="badge bg-info text-white">
                                {user.goalsCount} goal{user.goalsCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {user.purchasesCount > 0 && (
                              <span className="badge bg-secondary text-white">
                                {user.purchasesCount} purchase{user.purchasesCount !== 1 ? 's' : ''}
                              </span>
                            )}
                            {!user.listingsCount && !user.goalsCount && !user.purchasesCount && (
                              <span className="badge bg-light text-dark">No activity</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="text-muted small">
                            {formatDate(user.joinedAt)}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted small">
                            {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group btn-group-sm" role="group">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => handleUserAction(user.id, 'view')}
                              title="View Details"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                            <button
                              className={`btn ${user.status === 'active' ? 'btn-outline-warning' : 'btn-outline-success'}`}
                              onClick={() => handleUserAction(user.id, 'toggle-status')}
                              title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {user.status === 'active' ? (
                                  <path d="M18 6L6 18M6 6l12 12"/>
                                ) : (
                                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                )}
                              </svg>
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => handleUserAction(user.id, 'delete')}
                              title="Delete User"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="row mt-4">
          <div className="col-12">
            <nav aria-label="User pagination">
              <ul className="pagination justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(totalPages)].map((_, index) => (
                  <li key={index} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {/* Modals */}
      <UserDetailsModal
        isOpen={showUserDetailsModal}
        onClose={() => {
          setShowUserDetailsModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onUserUpdate={fetchUsers}
      />
    </div>
  );
}
