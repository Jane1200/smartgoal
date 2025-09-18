import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function UserModal({ 
  isOpen, 
  onClose, 
  user, 
  onSave, 
  mode = "create" // "create" or "edit"
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "goal_setter",
    status: "active",
    password: "",
    confirmPassword: ""
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && user) {
        setFormData({
          name: user.name || "",
          email: user.email || "",
          role: user.role || "goal_setter",
          status: user.status || "active",
          password: "",
          confirmPassword: ""
        });
      } else {
        setFormData({
          name: "",
          email: "",
          role: "goal_setter",
          status: "active",
          password: "",
          confirmPassword: ""
        });
      }
      setErrors({});
    }
  }, [isOpen, mode, user]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (mode === "create") {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    } else if (mode === "edit" && formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        status: formData.status
      };

      if (mode === "create" || (mode === "edit" && formData.password)) {
        userData.password = formData.password;
      }

      await onSave(userData);
      onClose();
    } catch (error) {
      console.error("Failed to save user:", error);
      toast.error("Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {mode === "create" ? "Create New User" : "Edit User"}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={loading}
            ></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <div className="invalid-feedback">{errors.name}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <div className="invalid-feedback">{errors.email}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">Role *</label>
                  <select
                    className="form-select"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="goal_setter">Goal Setter</option>
                    <option value="buyer">Buyer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Status *</label>
                  <select
                    className="form-select"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Password {mode === "create" ? "*" : "(leave blank to keep current)"}
                  </label>
                  <input
                    type="password"
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={mode === "create" ? "Enter password" : "Enter new password"}
                  />
                  {errors.password && (
                    <div className="invalid-feedback">{errors.password}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label">
                    Confirm Password {mode === "create" ? "*" : "(if changing password)"}
                  </label>
                  <input
                    type="password"
                    className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                  />
                  {errors.confirmPassword && (
                    <div className="invalid-feedback">{errors.confirmPassword}</div>
                  )}
                </div>
              </div>

              {mode === "edit" && user && (
                <div className="mt-4">
                  <h6>User Information</h6>
                  <div className="row g-2">
                    <div className="col-6">
                      <small className="text-muted">Joined:</small>
                      <div>{new Date(user.joinedAt).toLocaleDateString()}</div>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Last Login:</small>
                      <div>{new Date(user.lastLogin).toLocaleDateString()}</div>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">Goals Created:</small>
                      <div>{user.goalsCount || 0}</div>
                    </div>
                    <div className="col-6">
                      <small className="text-muted">User ID:</small>
                      <div className="font-monospace small">{user.id}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    {mode === "create" ? "Creating..." : "Saving..."}
                  </>
                ) : (
                  mode === "create" ? "Create User" : "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

