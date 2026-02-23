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

  const handleStartSelling = () => {
    navigate("/marketplace");
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Resell Unused Items</h2>
          <p className="text-muted mb-0">Turn your unused items into cash by listing them for resale</p>
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

      <div className="card mb-4 border-0 bg-light">
        <div className="card-body p-4">
          <div className="d-flex align-items-start gap-3">
            <div className="p-3 bg-white rounded-3 shadow-sm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
            </div>
            <div className="flex-grow-1">
              <h4 className="mb-2">List Your Items for Resale</h4>
              <p className="mb-3 text-muted">Upload photos, add details, and publish your listings to reach local buyers.</p>
              <button className="btn btn-primary fw-semibold" onClick={handleStartSelling}>
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
            <p className="text-muted mb-4">Start selling your unused items by creating your first listing</p>
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
                            {/* Condition Badge */}
                            <span className={getConditionBadgeClass(item.condition)}>
                              {item.condition?.replace('-', ' ').toUpperCase() || 'GOOD'}
                            </span>
                            {/* Status Badge */}
                            <span className={getStatusBadgeClass(item.status)}>
                              {item.status?.toUpperCase() || 'LISTED'}
                            </span>
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

                    {/* Price */}
                    <div className="col-auto text-end">
                      <div className="mb-2">
                        <small className="text-muted d-block">Price</small>
                        <h3 className="mb-0 text-success">₹{item.price?.toLocaleString()}</h3>
                      </div>
                      {item.originalPrice && item.originalPrice !== item.price && (
                        <small className="text-muted">
                          <del>₹{item.originalPrice.toLocaleString()}</del>
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
