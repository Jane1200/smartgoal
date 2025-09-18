import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import { validateForm, validationRules, validateFileUpload } from "@/utils/validations.js";

export default function Profile() {
  const authContext = useAuth();
  const user = authContext?.user;

  // Redirect if not authenticated
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if not a goal setter
  if (user?.profile?.role !== "goal_setter") {
    return <Navigate to="/dashboard-redirect" replace />;
  }

  const { updateUser } = authContext;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showAvatarForm, setShowAvatarForm] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    role: "",
    isVerified: false,
    avatar: "",
    createdAt: "",
    updatedAt: ""
  });
  
  const [editForm, setEditForm] = useState({
    name: "",
    email: ""
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [avatarForm, setAvatarForm] = useState({
    avatar: ""
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/profile");
      setProfileData(response.data);
      setEditForm({
        name: response.data.name,
        email: response.data.email
      });
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    
    // Validate profile form
    const profileValidation = validateForm(editForm, {
      name: validationRules.profile.name
    });

    if (!profileValidation.isValid) {
      setFormErrors(profileValidation.errors);
      toast.error("Please fix the validation errors");
      return;
    }

    setFormErrors({});

    try {
      setSaving(true);
      const response = await api.put("/profile", {
        name: editForm.name.trim()
      });

      toast.success("Profile updated successfully!");
      setProfileData(response.data);
      updateUser(response.data);
      setShowEditForm(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validate password form
    const passwordValidation = validateForm(passwordForm, {
      currentPassword: { required: true, message: "Current password is required" },
      newPassword: { required: true, minLength: 6, message: "New password must be at least 6 characters" },
      confirmPassword: { required: true, message: "Please confirm your new password" }
    });

    if (!passwordValidation.isValid) {
      setFormErrors(passwordValidation.errors);
      toast.error("Please fix the validation errors");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFormErrors({ confirmPassword: "Passwords do not match" });
      toast.error("New passwords do not match");
      return;
    }

    setFormErrors({});

    try {
      setSaving(true);
      await api.put("/profile/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      toast.success("Password changed successfully!");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setShowPasswordForm(false);
    } catch (error) {
      console.error("Failed to change password:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to change password");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    try {
      setUploadingAvatar(true);
      
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post("/profile/avatar-upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success("Avatar updated successfully!");
      setProfileData(response.data);
      updateUser(response.data);
      setShowAvatarForm(false);
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to upload avatar");
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const handleUpdateAvatar = async (e) => {
    e.preventDefault();
    
    if (!avatarForm.avatar.trim()) {
      toast.error("Avatar URL is required");
      return;
    }

    try {
      setSaving(true);
      const response = await api.put("/profile/avatar", {
        avatar: avatarForm.avatar.trim()
      });

      toast.success("Avatar updated successfully!");
      setProfileData(response.data);
      updateUser(response.data);
      setAvatarForm({ avatar: "" });
      setShowAvatarForm(false);
    } catch (error) {
      console.error("Failed to update avatar:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update avatar");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = "DELETE MY ACCOUNT";
    const userInput = window.prompt(
      `Are you sure you want to delete your account? This action cannot be undone.\n\nType "${confirmText}" to confirm:`
    );

    if (userInput !== confirmText) {
      toast.info("Account deletion cancelled");
      return;
    }

    try {
      setSaving(true);
      await api.delete("/profile");
      toast.success("Account deleted successfully");
      // Redirect to login will be handled by auth context
      window.location.href = "/login";
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete account");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-danger';
      case 'buyer': return 'bg-warning';
      case 'goal_setter': return 'bg-primary';
      default: return 'bg-secondary';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'buyer': return 'Buyer';
      case 'goal_setter': return 'Goal Setter';
      default: return 'User';
    }
  };

  if (loading) {
    return (
      <div className="container-xxl py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">My Profile</h1>
              <p className="text-muted mb-0">Manage your account settings and preferences</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowEditForm(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit Profile
            </button>
          </div>

          {/* Profile Overview */}
          <div className="row g-4 mb-4">
            <div className="col-md-8">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Profile Information</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label text-muted">Full Name</label>
                      <div className="h5 mb-0">{profileData.name}</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted">Email Address</label>
                      <div className="h6 mb-0">{profileData.email}</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted">Account Role</label>
                      <div>
                        <span className={`badge ${getRoleBadgeColor(profileData.role)} fs-6`}>
                          {getRoleDisplayName(profileData.role)}
                        </span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted">Account Status</label>
                      <div>
                        <span className={`badge ${profileData.isVerified ? 'bg-success' : 'bg-warning'} fs-6`}>
                          {profileData.isVerified ? 'Verified' : 'Pending Verification'}
                        </span>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted">Member Since</label>
                      <div className="text-muted">{formatDate(profileData.createdAt)}</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-muted">Last Updated</label>
                      <div className="text-muted">{formatDate(profileData.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Profile Picture</h5>
                </div>
                <div className="card-body text-center">
                  {(profileData.avatar && !avatarError) ? (
                    <img
                      src={getFileUrl(profileData.avatar)}
                      alt="Profile"
                      className="rounded-circle mb-3"
                      style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div 
                      className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mb-3"
                      style={{ 
                        width: '120px', 
                        height: '120px', 
                        fontSize: '48px'
                      }}
                    >
                      {profileData.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setShowAvatarForm(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Update Avatar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Account Actions</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <button
                        className="btn btn-warning w-100"
                        onClick={() => setShowPasswordForm(true)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <circle cx="12" cy="16" r="1"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        Change Password
                      </button>
                    </div>
                    <div className="col-md-6">
                      <button
                        className="btn btn-danger w-100"
                        onClick={handleDeleteAccount}
                        disabled={saving}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                        </svg>
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Profile Modal */}
          {showEditForm && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Edit Profile</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowEditForm(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#6c757d',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        lineHeight: '1',
                        width: '2rem',
                        height: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Close"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={handleEditProfile}>
                    <div className="modal-body">
                      <div className="row g-3">
                        <div className="col-12">
                          <label htmlFor="editName" className="form-label">Full Name *</label>
                          <input
                            type="text"
                            id="editName"
                            className="form-control"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter your full name"
                            required
                          />
                        </div>
                        <div className="col-12">
                          <label htmlFor="editEmail" className="form-label">Email Address</label>
                          <input
                            type="email"
                            id="editEmail"
                            className="form-control"
                            value={editForm.email}
                            disabled
                            placeholder="Email cannot be changed"
                          />
                          <div className="form-text text-muted">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Email address cannot be changed for security reasons
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowEditForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Change Password Modal */}
          {showPasswordForm && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Change Password</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowPasswordForm(false)}
                    ></button>
                  </div>
                  <form onSubmit={handleChangePassword}>
                    <div className="modal-body">
                      <div className="row g-3">
                        <div className="col-12">
                          <label htmlFor="currentPassword" className="form-label">Current Password *</label>
                          <input
                            type="password"
                            id="currentPassword"
                            className="form-control"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="Enter your current password"
                            required
                          />
                        </div>
                        <div className="col-12">
                          <label htmlFor="newPassword" className="form-label">New Password *</label>
                          <input
                            type="password"
                            id="newPassword"
                            className="form-control"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="Enter your new password"
                            required
                            minLength="6"
                          />
                        </div>
                        <div className="col-12">
                          <label htmlFor="confirmPassword" className="form-label">Confirm New Password *</label>
                          <input
                            type="password"
                            id="confirmPassword"
                            className="form-control"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder="Confirm your new password"
                            required
                            minLength="6"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowPasswordForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-warning"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Changing...
                          </>
                        ) : (
                          'Change Password'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Update Avatar Modal */}
          {showAvatarForm && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Update Avatar</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowAvatarForm(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="row g-3">
                      {/* File Upload Section */}
                      <div className="col-12">
                        <label className="form-label">Upload Image File</label>
                        <div
                          className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          style={{
                            border: '2px dashed #dee2e6',
                            borderRadius: '8px',
                            padding: '2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: dragActive ? '#f8f9fa' : 'transparent',
                            borderColor: dragActive ? '#007bff' : '#dee2e6'
                          }}
                          onClick={() => document.getElementById('avatarFile').click()}
                        >
                          {uploadingAvatar ? (
                            <div>
                              <div className="spinner-border text-primary mb-2" role="status">
                                <span className="visually-hidden">Uploading...</span>
                              </div>
                              <p className="mb-0">Uploading image...</p>
                            </div>
                          ) : (
                            <div>
                              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted mb-2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              <p className="mb-1">Click to upload or drag and drop</p>
                              <p className="text-muted small mb-0">PNG, JPG, GIF up to 5MB</p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          id="avatarFile"
                          className="d-none"
                          accept="image/*"
                          onChange={handleFileSelect}
                        />
                      </div>
                      
                      {/* Divider */}
                      <div className="col-12">
                        <hr />
                        <div className="text-center text-muted small">OR</div>
                        <hr />
                      </div>
                      
                      {/* URL Input Section */}
                      <div className="col-12">
                        <form onSubmit={handleUpdateAvatar}>
                          <label htmlFor="avatarUrl" className="form-label">Avatar URL</label>
                          <div className="input-group">
                            <input
                              type="url"
                              id="avatarUrl"
                              className="form-control"
                              value={avatarForm.avatar}
                              onChange={(e) => setAvatarForm(prev => ({ ...prev, avatar: e.target.value }))}
                              placeholder="https://example.com/your-avatar.jpg"
                            />
                            <button
                              type="submit"
                              className="btn btn-outline-primary"
                              disabled={saving || !avatarForm.avatar.trim()}
                            >
                              {saving ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Updating...
                                </>
                              ) : (
                                'Use URL'
                              )}
                            </button>
                          </div>
                          <div className="form-text">
                            Enter a URL to an image for your profile picture
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowAvatarForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
