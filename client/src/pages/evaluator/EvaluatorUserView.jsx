import { useEffect, useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import UserDetailsModal from "@/components/admin/UserDetailsModal.jsx";

export default function EvaluatorUserView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);

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
        ...(filterRole !== "all" && { role: filterRole }),
      });

      const { data } = await api.get(`/evaluator/users?${params}`);
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
      } else if (error.code === "NETWORK_ERROR") {
        toast.error("Network error. Please check your connection.");
      } else {
        toast.error("Failed to load users. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (userId) => {
    const user = users.find((u) => u.id === userId || u._id === userId);
    setSelectedUser(user);
    setShowUserDetailsModal(true);
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "admin":
        return "bg-danger";
      case "goal_setter":
        return "bg-primary";
      case "buyer":
        return "bg-success";
      case "evaluator":
        return "bg-info";
      default:
        return "bg-light text-dark";
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "goal_setter":
        return "Goal Setter";
      case "buyer":
        return "Buyer";
      case "admin":
        return "Admin";
      case "evaluator":
        return "Evaluator";
      default:
        return role;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString();
    } catch (error) {
      return "Invalid Date";
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      !searchTerm ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="container-xxl py-5">
        <div className="text-center">
          <div className="spinner-border text-info" role="status">
            <span className="visually-hidden">Loading users...</span>
          </div>
          <p className="mt-3">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4 evaluator-user-view">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h2 mb-2">User View</h1>
              <p className="text-muted">View and evaluate all users in the system</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="search" className="form-label">
                Search Users
              </label>
              <input
                type="text"
                id="search"
                className="form-control"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="col-md-6">
              <label htmlFor="roleFilter" className="form-label">
                Filter by Role
              </label>
              <select
                id="roleFilter"
                className="form-select"
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Roles</option>
                <option value="goal_setter">Goal Setter</option>
                <option value="buyer">Buyer</option>
                <option value="admin">Admin</option>
                <option value="evaluator">Evaluator</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            Users ({filteredUsers.length})
          </h5>
        </div>
        <div className="card-body">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-5">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-muted mb-3"
              >
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-muted">No users found</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id || user._id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2">
                              {user.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <span className="fw-medium">
                              {user.name || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="text-muted">{user.email || "N/A"}</span>
                        </td>
                        <td>
                          <span
                            className={`badge ${getRoleBadgeClass(
                              user.role
                            )}`}
                          >
                            {getRoleDisplayName(user.role)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              user.status === "active"
                                ? "bg-success"
                                : "bg-secondary"
                            }`}
                          >
                            {user.status || "active"}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted">
                            {formatDate(user.createdAt || user.created_at)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-info"
                            onClick={() =>
                              handleViewUser(user.id || user._id)
                            }
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <nav className="mt-4">
                  <ul className="pagination justify-content-center">
                    <li
                      className={`page-item ${
                        currentPage === 1 ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <li
                          key={page}
                          className={`page-item ${
                            currentPage === page ? "active" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </li>
                      )
                    )}
                    <li
                      className={`page-item ${
                        currentPage === totalPages ? "disabled" : ""
                      }`}
                    >
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
              )}
            </>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <UserDetailsModal
          isOpen={showUserDetailsModal}
          user={selectedUser}
          onClose={() => {
            setShowUserDetailsModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}
