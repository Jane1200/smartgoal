import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import { 
  MdLocationOn,
  MdStar,
  MdStore,
  MdPerson,
  MdEmail,
  MdPhone,
  MdVerifiedUser
} from "react-icons/md";
import TrustBadge from "@/components/TrustBadge.jsx";

export default function Connections() {
  const navigate = useNavigate();
  const [goalSetters, setGoalSetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maxDistance, setMaxDistance] = useState(5);

  useEffect(() => {
    fetchNearbyGoalSetters();
  }, [maxDistance]);

  const fetchNearbyGoalSetters = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/profile/nearby-goal-setters?maxDistance=${maxDistance}`);
      setGoalSetters(data.goalSetters || []);
    } catch (error) {
      console.error("Failed to fetch nearby goal setters:", error);
      if (error.response?.status === 400) {
        toast.error("Please set your location in profile to find nearby goal setters");
      } else {
        toast.error("Failed to load nearby goal setters");
      }
      setGoalSetters([]);
    } finally {
      setLoading(false);
    }
  };

  const viewSellerItems = (sellerId) => {
    // Navigate to marketplace filtered by this seller
    navigate(`/dashboard/buyer-marketplace?seller=${sellerId}`);
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

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="mb-2" style={{ fontWeight: '700' }}>
          <MdPerson className="me-2" size={32} style={{ verticalAlign: 'middle' }} />
          Nearby Goal Setters
        </h2>
        <p className="text-muted mb-0">
          Connect with goal setters in your area who are selling items
        </p>
      </div>

      {/* Distance Filter */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-body p-3">
          <div className="row align-items-center">
            <div className="col-md-3">
              <label className="form-label mb-0 fw-semibold">Search Radius</label>
            </div>
            <div className="col-md-6">
              <input
                type="range"
                className="form-range"
                min="1"
                max="5"
                step="1"
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseInt(e.target.value))}
              />
            </div>
            <div className="col-md-3 text-end">
              <span className="badge bg-primary" style={{ fontSize: '1rem', padding: '8px 16px' }}>
                Within {maxDistance} km
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-3">
        <p className="text-muted mb-0">
          {goalSetters.length} {goalSetters.length === 1 ? 'goal setter' : 'goal setters'} found nearby
        </p>
      </div>

      {/* Goal Setters Grid */}
      {goalSetters.length === 0 ? (
        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
          <div className="card-body text-center py-5">
            <MdPerson size={64} color="#ccc" className="mb-3" />
            <h5 className="mb-2">No goal setters found nearby</h5>
            <p className="text-muted mb-3">
              Try increasing your search radius or check back later
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => setMaxDistance(5)}
            >
              Expand Search to 5 km
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {goalSetters.map((seller) => (
            <div key={seller._id} className="col-md-6 col-lg-4">
              <div 
                className="card border-0 shadow-sm h-100" 
                style={{ 
                  borderRadius: '12px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
              >
                <div className="card-body">
                  {/* Profile Section */}
                  <div className="d-flex align-items-start gap-3 mb-3">
                    {/* Avatar */}
                    <div style={{ position: 'relative' }}>
                      {seller.avatar ? (
                        <img
                          src={getFileUrl(seller.avatar)}
                          alt={seller.name}
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '12px',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #4d5fd9 0%, #6d7ee6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '24px',
                          fontWeight: '700'
                        }}>
                          {seller.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {seller.isVerified && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          background: 'white',
                          borderRadius: '50%',
                          padding: '2px'
                        }}>
                          <MdVerifiedUser size={20} color="#10b981" />
                        </div>
                      )}
                    </div>

                    {/* Name & Trust Badge */}
                    <div className="flex-grow-1">
                      <h5 className="mb-1" style={{ fontWeight: '600' }}>
                        {seller.name}
                      </h5>
                      {seller.trustBadge && (
                        <div className="mb-2">
                          <TrustBadge level={seller.trustBadge.level} compact={true} />
                        </div>
                      )}
                      {seller.averageRating > 0 && (
                        <div className="d-flex align-items-center gap-1">
                          <MdStar size={16} color="#ffc107" />
                          <span className="small fw-semibold">{seller.averageRating.toFixed(1)}</span>
                          <span className="text-muted small">({seller.totalReviews} reviews)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="d-flex align-items-center gap-2 mb-3 text-muted">
                    <MdLocationOn size={18} />
                    <span className="small">
                      {seller.distance ? `${seller.distance.toFixed(1)} km away` : 'Distance unknown'} • {seller.city || 'Location not set'}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <div className="text-center p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <div className="fw-bold text-primary">{seller.activeListings || 0}</div>
                        <small className="text-muted">Active Items</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-center p-2" style={{ background: '#f8f9fa', borderRadius: '8px' }}>
                        <div className="fw-bold text-success">{seller.soldListings || 0}</div>
                        <small className="text-muted">Items Sold</small>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  {(seller.email || seller.phone) && (
                    <div className="mb-3 pb-3 border-bottom">
                      {seller.email && (
                        <div className="d-flex align-items-center gap-2 mb-1 text-muted small">
                          <MdEmail size={14} />
                          <span style={{ fontSize: '0.85rem' }}>{seller.email}</span>
                        </div>
                      )}
                      {seller.phone && (
                        <div className="d-flex align-items-center gap-2 text-muted small">
                          <MdPhone size={14} />
                          <span style={{ fontSize: '0.85rem' }}>{seller.phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    className="btn btn-primary w-100"
                    onClick={() => viewSellerItems(seller._id)}
                    style={{ borderRadius: '8px' }}
                  >
                    <MdStore size={18} className="me-2" />
                    View Items ({seller.activeListings || 0})
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="card border-0 shadow-sm mt-4" style={{ 
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #f8f9ff 0%, #e8ecff 100%)'
      }}>
        <div className="card-body p-4">
          <h6 className="mb-2" style={{ fontWeight: '600' }}>
            💡 About Connections
          </h6>
          <p className="text-muted mb-0 small">
            Connect with goal setters in your area who are selling items to fund their goals. 
            Browse their listings, check their ratings, and buy quality second-hand electronics 
            while helping others achieve their dreams!
          </p>
        </div>
      </div>
    </div>
  );
}
