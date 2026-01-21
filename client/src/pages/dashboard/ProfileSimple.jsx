import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import ProfileSetup from "@/components/ProfileSetup.jsx";

export default function ProfileSimple() {
  const navigate = useNavigate();
  const authContext = useAuth();
  const user = authContext?.user;
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/profile");
      setProfileData(data);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    await fetchProfile();
    setShowEditModal(false);
    toast.success("Profile updated successfully!");
  };

  const handleSwitchRole = async () => {
    const target = profileData.role === 'goal_setter' ? 'buyer' : 'goal_setter';
    try {
      const res = await authContext.switchRole(target);
      if (res?.ok) {
        setProfileData((prev) => ({ ...prev, role: res.user.role }));
        if (res.user.role === 'buyer') navigate('/buyer-dashboard');
        else if (res.user.role === 'goal_setter') navigate('/dashboard');
      }
    } catch (error) {
      toast.error("Failed to switch role");
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">Failed to load profile data</div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-primary bg-opacity-10 p-3 rounded-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <h2 className="mb-0">My Profile</h2>
            <p className="text-muted mb-0 small">Manage your account settings and preferences</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit Profile
        </button>
      </div>

      <div className="row g-4">
        {/* Profile Information Card */}
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">Profile Information</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="text-muted small">Full Name</label>
                  <p className="mb-0 fw-semibold">{profileData.name}</p>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Email Address</label>
                  <p className="mb-0">{profileData.email}</p>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Phone Number</label>
                  <p className="mb-0">{profileData.phone || 'Not provided'}</p>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Address</label>
                  <p className="mb-0">{profileData.address || 'Not provided'}</p>
                </div>

                {/* Location Section */}
                {profileData.location && (
                  <>
                    <div className="col-12 mt-4">
                      <h6 className="text-muted mb-3">📍 Location</h6>
                    </div>
                    <div className="col-md-6">
                      <label className="text-muted small">City</label>
                      <p className="mb-0">{profileData.location.city || 'Not set'}</p>
                    </div>
                    <div className="col-md-6">
                      <label className="text-muted small">State</label>
                      <p className="mb-0">{profileData.location.state || 'Not set'}</p>
                    </div>
                    {profileData.location.latitude && profileData.location.longitude && (
                      <div className="col-12">
                        <label className="text-muted small">Coordinates</label>
                        <p className="mb-0 font-monospace">
                          {Number(profileData.location.latitude).toFixed(6)}, {Number(profileData.location.longitude).toFixed(6)}
                        </p>
                        <small className="text-muted">Used for nearby buyer-seller matching (within 5 km)</small>
                      </div>
                    )}
                  </>
                )}

                {/* Age and Occupation */}
                <div className="col-md-6 mt-4">
                  <label className="text-muted small">🎂 Age</label>
                  <p className="mb-0">{profileData.age ? `${profileData.age} years` : 'Not provided'}</p>
                </div>
                <div className="col-md-6 mt-4">
                  <label className="text-muted small">💼 Occupation</label>
                  <p className="mb-0">
                    {profileData.occupation === 'student' ? '🎓 Student' :
                     profileData.occupation === 'working_professional' ? '💼 Working Professional' :
                     profileData.occupation === 'freelancer' ? '💻 Freelancer' :
                     profileData.occupation === 'entrepreneur' ? '🚀 Entrepreneur' :
                     profileData.occupation === 'other' ? '👤 Other' : 'Not provided'}
                  </p>
                </div>

                {/* Account Role and Status */}
                <div className="col-md-6 mt-4">
                  <label className="text-muted small">Account Role</label>
                  <div className="d-flex align-items-center gap-2">
                    <span className={`badge ${profileData.role === 'buyer' ? 'bg-warning' : 'bg-primary'}`}>
                      {profileData.role === 'buyer' ? 'Buyer' : 'Goal Setter'}
                    </span>
                    {profileData.role !== 'admin' && (
                      <button className="btn btn-sm btn-outline-primary" onClick={handleSwitchRole}>
                        Switch to {profileData.role === 'goal_setter' ? 'Buyer' : 'Goal Setter'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-md-6 mt-4">
                  <label className="text-muted small">Account Status</label>
                  <div>
                    <span className={`badge ${profileData.isVerified ? 'bg-success' : 'bg-warning'}`}>
                      {profileData.isVerified ? '✓ Verified' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Picture Card */}
        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-0">Profile Picture</h5>
            </div>
            <div className="card-body text-center">
              {profileData.avatar ? (
                <img
                  src={getFileUrl(profileData.avatar)}
                  alt="Profile"
                  className="rounded-circle mb-3"
                  style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mb-3 mx-auto"
                style={{ 
                  width: '150px', 
                  height: '150px', 
                  fontSize: '64px',
                  display: profileData.avatar ? 'none' : 'flex'
                }}
              >
                {profileData.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <button className="btn btn-outline-primary btn-sm" onClick={() => setShowEditModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                Update Avatar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Profile</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">
                <ProfileSetup 
                  onComplete={handleProfileUpdate}
                  initialData={profileData}
                  isUpdate={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
