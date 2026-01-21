import { useState, useEffect } from "react";
import { MdClose, MdShoppingCart, MdFavorite, MdFavoriteBorder, MdLocationOn, MdStar, MdVerifiedUser, MdPhone, MdEmail, MdCalendarToday, MdCategory, MdCheckCircle } from "react-icons/md";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import TrustBadge from "@/components/TrustBadge.jsx";

export default function ProductDetailsModal({ itemId, onClose, onAddToCart }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [similarItems, setSimilarItems] = useState([]);

  useEffect(() => {
    if (itemId) {
      fetchItemDetails();
      checkWishlistStatus();
      fetchSimilarItems();
    }
  }, [itemId]);

  const fetchItemDetails = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/marketplace/items/${itemId}`);
      setItem(data);
    } catch (error) {
      console.error("Failed to fetch item details:", error);
      toast.error("Failed to load item details");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const checkWishlistStatus = async () => {
    try {
      const { data } = await api.get("/wishlist");
      // data is an array directly, not { items: [] }
      const inWishlist = Array.isArray(data) && data.some(w => w.marketplaceItemId?._id === itemId || w._id === itemId);
      setIsInWishlist(inWishlist);
    } catch (error) {
      console.error("Failed to check wishlist:", error);
    }
  };

  const fetchSimilarItems = async () => {
    try {
      const { data } = await api.get(`/marketplace/items/${itemId}/similar?limit=4`);
      setSimilarItems(data.items || []);
    } catch (error) {
      console.error("Failed to fetch similar items:", error);
    }
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      await api.post("/cart/add", { marketplaceItemId: itemId, quantity: 1 });
      toast.success("Item added to cart!");
      if (onAddToCart) onAddToCart();
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error(error.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    setAddingToWishlist(true);
    try {
      if (isInWishlist) {
        await api.delete(`/wishlist/remove/${itemId}`);
        toast.success("Removed from wishlist");
        setIsInWishlist(false);
      } else {
        await api.post("/wishlist/add", { marketplaceItemId: itemId });
        toast.success("Added to wishlist!");
        setIsInWishlist(true);
      }
    } catch (error) {
      console.error("Wishlist error:", error);
      toast.error(error.response?.data?.message || "Failed to update wishlist");
    } finally {
      setAddingToWishlist(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getConditionColor = (condition) => {
    const colors = {
      new: "success",
      like_new: "primary",
      good: "info",
      fair: "warning",
      poor: "secondary",
    };
    return colors[condition] || "secondary";
  };

  const getConditionLabel = (condition) => {
    const labels = {
      new: "Brand New",
      like_new: "Like New",
      good: "Good",
      fair: "Fair",
      poor: "Poor",
    };
    return labels[condition] || condition;
  };

  if (loading) {
    return (
      <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog modal-xl modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header border-0">
            <h5 className="modal-title">Product Details</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          {/* Body */}
          <div className="modal-body">
            <div className="row g-4">
              {/* Left: Images */}
              <div className="col-lg-6">
                {/* Main Image */}
                <div className="mb-3" style={{ position: "relative" }}>
                  <img
                    src={getFileUrl(item.images?.[selectedImage]?.url || item.images?.[selectedImage] || "/placeholder.png")}
                    alt={item.title}
                    className="w-100 rounded"
                    style={{ height: "400px", objectFit: "cover" }}
                  />
                  {item.featured && (
                    <span className="badge bg-warning position-absolute top-0 start-0 m-3">
                      Featured
                    </span>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {item.images && item.images.length > 1 && (
                  <div className="d-flex gap-2 overflow-auto">
                    {item.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={getFileUrl(img?.url || img)}
                        alt={`${item.title} ${idx + 1}`}
                        className={`rounded cursor-pointer ${selectedImage === idx ? "border border-primary border-3" : ""}`}
                        style={{ width: "80px", height: "80px", objectFit: "cover", cursor: "pointer" }}
                        onClick={() => setSelectedImage(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Details */}
              <div className="col-lg-6">
                {/* Title & Price */}
                <h3 className="mb-3">{item.title}</h3>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <h2 className="text-primary mb-0">{formatCurrency(item.price)}</h2>
                  <span className={`badge bg-${getConditionColor(item.condition)} fs-6`}>
                    {getConditionLabel(item.condition)}
                  </span>
                </div>

                {/* Category & Date */}
                <div className="d-flex gap-3 mb-3">
                  <span className="text-muted">
                    <MdCategory className="me-1" />
                    {item.category}
                  </span>
                  <span className="text-muted">
                    <MdCalendarToday className="me-1" />
                    Listed {formatDate(item.createdAt)}
                  </span>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <h6 className="mb-2">Description</h6>
                  <p className="text-muted">{item.description}</p>
                </div>

                {/* Confidence Score Breakdown */}
                {item.confidenceScore && (
                  <div className="card mb-4" style={{ background: "linear-gradient(135deg, #28a74515 0%, #20c99715 100%)" }}>
                    <div className="card-body">
                      <h6 className="mb-3">
                        <span className="badge me-2" style={{ backgroundColor: item.confidenceColor || '#28a745' }}>
                          {Math.round(item.confidenceScore)}%
                        </span>
                        {item.confidenceLabel || 'Match Score'}
                      </h6>
                      {item.recommendationReasons && item.recommendationReasons.length > 0 && (
                        <div className="mb-2">
                          <small className="text-muted d-block mb-2">Why this is recommended:</small>
                          {item.recommendationReasons.map((reason, idx) => (
                            <div key={idx} className="d-flex align-items-start mb-1">
                              <span className="text-success me-2">✓</span>
                              <small>{reason}</small>
                            </div>
                          ))}
                        </div>
                      )}
                      <small className="text-muted">
                        Based on price competitiveness, seller rating, and proximity
                      </small>
                    </div>
                  </div>
                )}

                {/* Seller Information */}
                <div className="card mb-4" style={{ background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)" }}>
                  <div className="card-body">
                    <h6 className="mb-3">Seller Information</h6>
                    <div className="d-flex align-items-center mb-3">
                      {item.userId?.avatar ? (
                        <img
                          src={getFileUrl(item.userId.avatar)}
                          alt={item.userId.name}
                          className="rounded-circle me-3"
                          style={{ width: "50px", height: "50px", objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white me-3"
                          style={{ width: "50px", height: "50px", fontSize: "20px" }}
                        >
                          {item.userId?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-grow-1">
                        <h6 className="mb-0">{item.userId?.name}</h6>
                        {item.trustBadge && (
                          <div className="mt-1">
                            <TrustBadge level={item.trustBadge.level} compact={true} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seller Stats */}
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="d-flex align-items-center">
                          <MdStar className="text-warning me-1" />
                          <small>
                            {item.averageRating ? (
                              <>{item.averageRating.toFixed(1)} ({item.totalReviews} reviews)</>
                            ) : (
                              <>No reviews yet</>
                            )}
                          </small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="d-flex align-items-center">
                          <MdLocationOn className="text-danger me-1" />
                          <small>
                            {item.seller?.distance ? `${item.seller.distance} km away` : item.userId?.city || "Location not set"}
                          </small>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info */}
                    {item.userId?.email && (
                      <div className="mb-2">
                        <small className="text-muted">
                          <MdEmail className="me-1" />
                          {item.userId.email}
                        </small>
                      </div>
                    )}
                    {item.userId?.phone && (
                      <div>
                        <small className="text-muted">
                          <MdPhone className="me-1" />
                          {item.userId.phone}
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex gap-2 mb-3">
                  <button
                    className="btn btn-success flex-grow-1"
                    onClick={handleAddToCart}
                    disabled={addingToCart || item.status !== "available"}
                  >
                    {addingToCart ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Adding...
                      </>
                    ) : (
                      <>
                        <MdShoppingCart className="me-2" />
                        Add to Cart
                      </>
                    )}
                  </button>
                  <button
                    className={`btn ${isInWishlist ? "btn-danger" : "btn-outline-danger"}`}
                    onClick={handleToggleWishlist}
                    disabled={addingToWishlist}
                    style={{ minWidth: "120px" }}
                  >
                    {addingToWishlist ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : isInWishlist ? (
                      <>
                        <MdFavorite className="me-2" />
                        Saved
                      </>
                    ) : (
                      <>
                        <MdFavoriteBorder className="me-2" />
                        Save
                      </>
                    )}
                  </button>
                </div>

                {item.status !== "available" && (
                  <div className="alert alert-warning">
                    <MdCheckCircle className="me-2" />
                    This item is no longer available
                  </div>
                )}

                {/* Additional Info */}
                <div className="card">
                  <div className="card-body">
                    <h6 className="mb-3">Additional Information</h6>
                    <div className="row g-2">
                      <div className="col-6">
                        <small className="text-muted">Condition:</small>
                        <p className="mb-0">{getConditionLabel(item.condition)}</p>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Category:</small>
                        <p className="mb-0 text-capitalize">{item.category}</p>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Status:</small>
                        <p className="mb-0 text-capitalize">{item.status}</p>
                      </div>
                      <div className="col-6">
                        <small className="text-muted">Views:</small>
                        <p className="mb-0">{item.views || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Similar Items */}
            {similarItems.length > 0 && (
              <div className="mt-5">
                <h5 className="mb-3">Similar Items</h5>
                <div className="row g-3">
                  {similarItems.map((similar) => (
                    <div key={similar._id} className="col-md-3">
                      <div className="card h-100 cursor-pointer" onClick={() => {
                        setItem(null);
                        setLoading(true);
                        setSelectedImage(0);
                        fetchItemDetails();
                      }}>
                        <img
                          src={getFileUrl(similar.images?.[0]?.url || similar.images?.[0])}
                          alt={similar.title}
                          className="card-img-top"
                          style={{ height: "150px", objectFit: "cover" }}
                        />
                        <div className="card-body">
                          <h6 className="card-title text-truncate">{similar.title}</h6>
                          <p className="text-primary fw-bold mb-0">{formatCurrency(similar.price)}</p>
                          <small className="text-muted">{getConditionLabel(similar.condition)}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
