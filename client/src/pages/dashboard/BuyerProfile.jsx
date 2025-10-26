import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function BuyerProfile() {
  const navigate = useNavigate();
  const authContext = useAuth();
  // Access is enforced by route guards; avoid in-component redirects to keep hook order stable.

  const [profileData, setProfileData] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [geoPreferences, setGeoPreferences] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/profile");
      setProfileData(response.data);
      setEditForm({
        name: response.data.name || "",
        email: response.data.email || "",
        phone: response.data.phone || "",
        address: response.data.address || ""
      });
      setGeoPreferences(response.data.geoPreferences);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermission = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    setLocationPermission("requesting");
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocoding to get address
          const address = await reverseGeocode(latitude, longitude);
          
          await api.put("/profile/location", {
            latitude,
            longitude,
            ...address
          });
          
          setLocationPermission("granted");
          setShowLocationModal(false);
          toast.success("Location updated successfully!");
          
          // Refresh profile
          fetchProfile();
        } catch (error) {
          console.error("Failed to update location:", error);
          toast.error("Failed to update location");
          setLocationPermission("denied");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationPermission("denied");
        toast.error("Location access denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      return {
        address: data.localityInfo?.administrative?.[0]?.name || "",
        city: data.city || data.localityInfo?.administrative?.[1]?.name || "Unknown City",
        state: data.principalSubdivision || data.localityInfo?.administrative?.[2]?.name || "Unknown State",
        country: data.countryName || "India",
        postalCode: data.postcode || ""
      };
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      return {
        address: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        city: "Unknown City",
        state: "Unknown State", 
        country: "India",
        postalCode: ""
      };
    }
  };

  const handleUpdateGeoPreferences = async (newPrefs) => {
    try {
      setSaving(true);
      await api.put("/profile/geo-preferences", newPrefs);
      setGeoPreferences(newPrefs);
      toast.success("Location preferences updated!");
      fetchProfile();
    } catch (error) {
      console.error("Failed to update preferences:", error);
      toast.error("Failed to update preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      const { email, ...profileData } = editForm; // Remove email from the data
      const response = await api.put("/profile", profileData);
      setProfileData(response.data);
      setShowEditModal(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setSaving(true);
      await api.put("/profile/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordModal(false);
      toast.success("Password changed successfully!");
    } catch (error) {
      console.error("Failed to change password:", error);
      toast.error("Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    try {
      setSaving(true);
      await api.delete("/profile");
      toast.success("Account deleted successfully");
      // Redirect to login or home page
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete account");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container-xxl py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">Buyer Profile</h1>
              <p className="text-muted mb-0">Manage your buyer account information</p>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-primary"
                onClick={() => setShowEditModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit Profile
              </button>
              <button
                className="btn btn-outline-warning"
                onClick={() => setShowPasswordModal(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Change Password
              </button>
              <button
                className="btn btn-outline-primary"
                onClick={async () => {
                  try {
                    const res = await authContext.switchRole('goal_setter');
                    if (res?.ok) {
                      navigate('/dashboard');
                    }
                  } catch {}
                }}
              >
                Switch to Goal Setter
              </button>
            </div>
          </div>

          {/* Profile Information */}
          <div className="row g-4">
            <div className="col-md-8">
              {/* Location Card */}
              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Location & Preferences
                  </h5>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setShowLocationModal(true)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    Update Location
                  </button>
                </div>
                <div className="card-body">
                  {profileData?.location ? (
                    <>
                      <div className="row g-3 mb-3">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small text-muted">City</label>
                          <div className="d-flex align-items-center">
                            <span className="fs-5">📍</span>
                            <span className="ms-2">{profileData.location.city}</span>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-semibold small text-muted">State</label>
                          <div>{profileData.location.state}</div>
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-semibold small text-muted">Last Updated</label>
                          <div className="text-muted small">
                            {profileData.location.lastUpdated ? new Date(profileData.location.lastUpdated).toLocaleString('en-IN') : 'Not available'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-top pt-3">
                        <h6 className="mb-3">Privacy Settings</h6>
                        <div className="form-check mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="allowLocationSharing"
                            checked={geoPreferences?.allowLocationSharing || false}
                            onChange={(e) => handleUpdateGeoPreferences({
                              ...geoPreferences,
                              allowLocationSharing: e.target.checked
                            })}
                          />
                          <label className="form-check-label" htmlFor="allowLocationSharing">
                            Allow location sharing
                            <small className="d-block text-muted">Let goal setters find you when listing nearby items</small>
                          </label>
                        </div>
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="showExactLocation"
                            checked={geoPreferences?.showExactLocation || false}
                            onChange={(e) => handleUpdateGeoPreferences({
                              ...geoPreferences,
                              showExactLocation: e.target.checked
                            })}
                          />
                          <label className="form-check-label" htmlFor="showExactLocation">
                            Show exact coordinates
                            <small className="d-block text-muted">Display precise location to sellers (otherwise only city shown)</small>
                          </label>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted mb-3">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <p className="text-muted mb-3">Location not set</p>
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowLocationModal(true)}
                      >
                        Set Your Location
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Account Information</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Full Name</label>
                      <div className="form-control-plaintext">{profileData?.name || "Not provided"}</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Email Address</label>
                      <div className="form-control-plaintext">{profileData?.email || "Not provided"}</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Phone Number</label>
                      <div className="form-control-plaintext">{profileData?.phone || "Not provided"}</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Account Type</label>
                      <div className="form-control-plaintext">
                        <span className="badge bg-success">Buyer</span>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Address</label>
                      <div className="form-control-plaintext">{profileData?.address || "Not provided"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">Account Statistics</h5>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted">Member Since</span>
                    <span className="fw-medium">
                      {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString('en-IN') : "N/A"}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted">Last Updated</span>
                    <span className="fw-medium">
                      {profileData?.updatedAt ? new Date(profileData.updatedAt).toLocaleDateString('en-IN') : "N/A"}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Account Status</span>
                    <span className="badge bg-success">Active</span>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="card border-danger mt-4">
                <div className="card-header bg-danger text-white">
                  <h6 className="card-title mb-0">Danger Zone</h6>
                </div>
                <div className="card-body">
                  <p className="card-text small text-muted mb-3">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleDeleteAccount}
                    disabled={saving}
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Profile</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
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
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
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
                <div className="mb-3">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpdateProfile}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Change Password</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowPasswordModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleChangePassword}
                  disabled={saving}
                >
                  {saving ? "Changing..." : "Change Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location Setup Modal */}
      {showLocationModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  Set Your Location
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setShowLocationModal(false)}
                ></button>
              </div>
              <div className="modal-body text-center py-4">
                <div className="mb-4">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary mb-3">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <h6 className="mb-3">Why we need your location</h6>
                  <p className="text-muted mb-0">
                    To show you items from goal setters nearby (like in Kanjirapalli), we need to know your location. 
                    This helps you find items that are easy to collect and reduces shipping costs!
                  </p>
                </div>
                
                <div className="alert alert-info text-start mb-4">
                  <div className="d-flex align-items-start">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2 flex-shrink-0">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <div>
                      <strong>Privacy:</strong> Your exact location is kept private. Goal setters only see your city and approximate distance.
                    </div>
                  </div>
                </div>

                <button 
                  className="btn btn-primary btn-lg"
                  onClick={requestLocationPermission}
                  disabled={locationPermission === "requesting"}
                >
                  {locationPermission === "requesting" ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      Share My Location
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




