import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate, useNavigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";

export default function ResellItems() {
  const authContext = useAuth();
  const user = authContext?.user;
  const navigate = useNavigate();

  // Redirect if not authenticated
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if not a goal setter
  if (user?.profile?.role !== "goal_setter") {
    return <Navigate to="/dashboard-redirect" replace />;
  }

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/marketplace/my-listings");
      setItems(response.data || []);
    } catch (error) {
      console.error("Failed to fetch listings:", error);
      toast.error("Failed to load your listings");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getConditionBadgeClass = (condition) => {
    const badgeMap = {
      'new': 'success',
      'like-new': 'success',
      'excellent': 'success',
      'good': 'info',
      'fair': 'warning',
      'poor': 'danger',
      'needs-repair': 'danger'
    };
    return `badge bg-${badgeMap[condition] || 'secondary'}`;
  };

  const getStatusBadgeClass = (status) => {
    const badgeMap = {
      'active': 'primary',
      'listed': 'primary',
      'sold': 'dark',
      'pending': 'warning',
      'archived': 'secondary'
    };
    return `badge bg-${badgeMap[status] || 'secondary'}`;
  };

  const getAIScoreColor = (score) => {
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-info';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const handleStartSelling = () => {
    navigate("/marketplace");
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Resell Unused Items</h2>
          <p className="text-muted mb-0">Turn your unused items into cash with AI-powered pricing</p>
        </div>
        <button 
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={handleStartSelling}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          List New Item
        </button>
      </div>

      {/* AI-Powered Product Analysis Section */}
      <div className="card mb-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
        <div className="card-body text-white p-4">
          <div className="d-flex align-items-start gap-3">
            <div className="p-3 bg-white bg-opacity-25 rounded-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
            </div>
            <div className="flex-grow-1">
              <h4 className="mb-2">AI-Powered Product Analysis</h4>
              <p className="mb-3 opacity-90">Upload photos of your unused items and our AI will analyze the condition, suggest optimal pricing, and help you list them for sale.</p>
              <button 
                className="btn btn-light fw-semibold"
                onClick={handleStartSelling}
              >
                Start Selling
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-3">Loading your items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="mb-4">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="7.5 4.21 12 6.81 16.5 4.21"/>
                <polyline points="7.5 19.79 7.5 14.6 3 12"/>
                <polyline points="21 12 16.5 14.6 16.5 19.79"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <h4 className="mb-2">No Items Listed Yet</h4>
            <p className="text-muted mb-4">Start selling your unused items with AI-powered pricing assistance</p>
            <button className="btn btn-primary" onClick={handleStartSelling}>
              List Your First Item
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {items.map((item) => (
            <div key={item._id} className="col-12">
              <div className="card hover-shadow transition-all">
                <div className="card-body p-4">
                  <div className="row align-items-center">
                    {/* Product Image */}
                    <div className="col-auto">
                      <div 
                        className="rounded-3 overflow-hidden bg-light"
                        style={{ width: '120px', height: '120px' }}
                      >
                        {item.images && item.images.length > 0 ? (
                          <img 
                            src={getFileUrl(item.images[0].url || item.images[0])} 
                            alt={item.title}
                            className="w-100 h-100 object-fit-cover"
                          />
                        ) : (
                          <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21,15 16,10 5,21"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="col">
                      <div className="d-flex flex-column gap-2">
                        <div>
                          <h5 className="mb-1">{item.title}</h5>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            {/* AI Score */}
                            {item.aiScore && (
                              <span className={`fw-bold ${getAIScoreColor(item.aiScore)}`}>
                                AI Score: {item.aiScore}/100
                              </span>
                            )}
                            {/* Condition Badge */}
                            <span className={getConditionBadgeClass(item.condition)}>
                              {item.condition?.replace('-', ' ').toUpperCase() || 'GOOD'}
                            </span>
                            {/* Status Badge */}
                            <span className={getStatusBadgeClass(item.status)}>
                              {item.status?.toUpperCase() || 'LISTED'}
                            </span>
                            {/* Auto-priced indicator */}
                            {item.autoPriced && (
                              <span className="badge bg-info">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                  <path d="M2 17l10 5 10-5"/>
                                  <path d="M2 12l10 5 10-5"/>
                                </svg>
                                AI Priced
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Description */}
                        {item.description && (
                          <p className="text-muted mb-0 small" style={{ maxWidth: '600px' }}>
                            {item.description.length > 100 
                              ? `${item.description.substring(0, 100)}...` 
                              : item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Estimated Price */}
                    <div className="col-auto text-end">
                      <div className="mb-2">
                        <small className="text-muted d-block">Estimated Price</small>
                        <h3 className="mb-0 text-success">₹{item.price?.toLocaleString()}</h3>
                      </div>
                      {item.originalPrice && item.originalPrice !== item.price && (
                        <small className="text-muted">
                          <del>₹{item.originalPrice.toLocaleString()}</del>
                        </small>
                      )}
                    </div>
                  </div>

                  {/* Condition Analysis Details (if available) */}
                  {item.conditionAnalysis && (
                    <div className="mt-3 pt-3 border-top">
                      <div className="row g-2 small">
                        <div className="col-auto">
                          <span className="text-muted">Confidence:</span>
                          <span className="fw-semibold ms-1">{item.conditionAnalysis.confidence?.toFixed(1)}%</span>
                        </div>
                        {item.conditionAnalysis.features?.sharpness && (
                          <div className="col-auto">
                            <span className="text-muted">Sharpness:</span>
                            <span className="fw-semibold ms-1">{item.conditionAnalysis.features.sharpness.toFixed(0)}</span>
                          </div>
                        )}
                        {item.conditionAnalysis.features?.contrast && (
                          <div className="col-auto">
                            <span className="text-muted">Contrast:</span>
                            <span className="fw-semibold ms-1">{item.conditionAnalysis.features.contrast.toFixed(0)}</span>
                          </div>
                        )}
                        {item.conditionAnalysis.tampered && (
                          <div className="col-auto">
                            <span className="badge bg-warning">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                <line x1="12" y1="9" x2="12" y2="13"/>
                                <line x1="12" y1="17" x2="12.01" y2="17"/>
                              </svg>
                              Tampered Detection
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
