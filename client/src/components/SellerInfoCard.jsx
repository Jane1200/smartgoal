import { useState, useEffect } from "react";
import api, { getFileUrl } from "@/utils/api.js";
import TrustBadge from "./TrustBadge.jsx";

export default function SellerInfoCard({ sellerId, sellerName, sellerAvatar, compact = false }) {
  const [sellerProfile, setSellerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetchSellerProfile();
  }, [sellerId]);

  const fetchSellerProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/marketplace/seller-profile/${sellerId}`);
      setSellerProfile(response.data);
      setReviews(response.data.recentReviews || []);
    } catch (error) {
      console.error("Failed to fetch seller profile:", error);
    } finally {
      setLoading(true);
    }
  };

  if (loading) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center">
          <div className="spinner-border spinner-border-sm text-primary"></div>
        </div>
      </div>
    );
  }

  if (!sellerProfile) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center text-muted">
          <small>Could not load seller information</small>
        </div>
      </div>
    );
  }

  const { seller, rating } = sellerProfile;

  if (compact) {
    return (
      <div className="d-flex align-items-center gap-2">
        {sellerAvatar && (
          <img
            src={getFileUrl(sellerAvatar)}
            alt={sellerName}
            className="rounded-circle"
            style={{ width: "40px", height: "40px", objectFit: "cover" }}
          />
        )}
        <div className="flex-grow-1 small">
          <div className="fw-medium">{sellerName}</div>
          <TrustBadge
            level={rating.trustLevel}
            rating={rating.averageRating}
            reviewCount={rating.totalReviews}
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className="seller-info-card">
      <div className="card shadow-sm">
        <div className="card-body">
          {/* Seller Header */}
          <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
            {sellerAvatar && (
              <img
                src={getFileUrl(sellerAvatar)}
                alt={sellerName}
                className="rounded-circle"
                style={{ width: "60px", height: "60px", objectFit: "cover" }}
              />
            )}
            <div className="flex-grow-1">
              <h5 className="mb-1">{sellerName}</h5>
              <small className="text-muted">{seller.email}</small>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="mb-3">
            <TrustBadge
              level={rating.trustLevel}
              rating={rating.averageRating}
              reviewCount={rating.totalReviews}
            />
          </div>

          {/* Stats */}
          <div className="row g-2 mb-3">
            <div className="col-6">
              <div className="p-2 bg-light rounded text-center">
                <div className="small text-muted">Items Sold</div>
                <div className="h6 mb-0">{seller.marketplaceStats?.soldListings || 0}</div>
              </div>
            </div>
            <div className="col-6">
              <div className="p-2 bg-light rounded text-center">
                <div className="small text-muted">Total Earnings</div>
                <div className="h6 mb-0">₹{(seller.marketplaceStats?.totalEarnings || 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="col-6">
              <div className="p-2 bg-light rounded text-center">
                <div className="small text-muted">Avg Rating</div>
                <div className="h6 mb-0">{rating.averageRating.toFixed(1)} ⭐</div>
              </div>
            </div>
            <div className="col-6">
              <div className="p-2 bg-light rounded text-center">
                <div className="small text-muted">Genuine Items</div>
                <div className="h6 mb-0">{rating.genuinePercentage}%</div>
              </div>
            </div>
          </div>

          {/* Location */}
          {seller.location?.city && (
            <div className="mb-3 small">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <strong>{seller.location.city}</strong>
              {seller.location.state && `, ${seller.location.state}`}
            </div>
          )}

          {/* Reviews Section */}
          <div className="mt-3 pt-3 border-top">
            <button
              className="btn btn-sm btn-outline-secondary w-100"
              onClick={() => setShowReviews(!showReviews)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {showReviews ? "Hide Reviews" : "View Recent Reviews"} ({rating.totalReviews})
            </button>

            {showReviews && reviews.length > 0 && (
              <div className="mt-3">
                {reviews.map((review) => (
                  <div key={review._id} className="p-2 mb-2 border-bottom small">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <strong className="small">{review.buyerName}</strong>
                      <span className="text-warning">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                    </div>
                    {review.comment && (
                      <p className="mb-1 text-muted" style={{ fontSize: "0.85rem" }}>
                        {review.comment}
                      </p>
                    )}
                    <small className="text-muted d-block">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}