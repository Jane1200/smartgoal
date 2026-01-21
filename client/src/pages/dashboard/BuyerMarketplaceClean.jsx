import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import { 
  MdSearch, 
  MdFilterList,
  MdShoppingCart,
  MdFavoriteBorder,
  MdLocationOn,
  MdStar,
  MdClose
} from "react-icons/md";
import ProductDetailsModal from "@/components/ProductDetailsModal.jsx";

export default function BuyerMarketplace() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    maxDistance: 50,
    minPrice: '',
    maxPrice: '',
    condition: 'all',
    sortBy: 'newest'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [addingToCart, setAddingToCart] = useState({});

  useEffect(() => {
    fetchItems();
  }, [filters, searchQuery]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: filters.category !== 'all' ? filters.category : '',
        condition: filters.condition !== 'all' ? filters.condition : '',
        minPrice: filters.minPrice || '',
        maxPrice: filters.maxPrice || '',
        sortBy: filters.sortBy,
        search: searchQuery,
        limit: '50'
      });

      // Try nearby items first (with location)
      let data;
      try {
        const nearbyResponse = await api.get(`/marketplace/nearby-items?${params}&maxDistance=${filters.maxDistance}`);
        data = nearbyResponse.data;
      } catch (nearbyError) {
        // If nearby fails (no location set), fall back to browse endpoint
        console.log("Nearby items failed, using browse endpoint");
        const browseResponse = await api.get(`/marketplace/browse?${params}`);
        data = browseResponse.data;
      }

      setItems(data.items || []);
    } catch (error) {
      console.error("Failed to fetch items:", error);
      toast.error("Failed to load marketplace items");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (itemId, e) => {
    e.stopPropagation();
    setAddingToCart(prev => ({ ...prev, [itemId]: true }));
    try {
      await api.post('/cart/add', { marketplaceItemId: itemId, quantity: 1 });
      toast.success('Added to cart!');
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getConditionColor = (condition) => {
    const colors = {
      new: 'success',
      like_new: 'primary',
      good: 'info',
      fair: 'warning',
      poor: 'secondary'
    };
    return colors[condition] || 'secondary';
  };

  const getConditionLabel = (condition) => {
    const labels = {
      new: 'New',
      like_new: 'Like New',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor'
    };
    return labels[condition] || condition;
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
        <h2 className="mb-2" style={{ fontWeight: '700' }}>Marketplace</h2>
        <p className="text-muted mb-0">Discover quality electronics from goal setters nearby</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            {/* Search */}
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <MdSearch size={20} color="#6c757d" />
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ boxShadow: 'none' }}
                />
                {searchQuery && (
                  <button 
                    className="btn btn-link text-muted"
                    onClick={() => setSearchQuery("")}
                  >
                    <MdClose size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filters */}
            <div className="col-md-4">
              <select 
                className="form-select"
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
              >
                <option value="all">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="phone">Phones</option>
                <option value="laptop">Laptops</option>
                <option value="tablet">Tablets</option>
                <option value="watch">Watches</option>
              </select>
            </div>

            {/* Filter Toggle */}
            <div className="col-md-2">
              <button 
                className={`btn ${showFilters ? 'btn-primary' : 'btn-outline-primary'} w-100`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <MdFilterList size={20} className="me-1" />
                Filters
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="row g-3 mt-2 pt-3 border-top">
              <div className="col-md-3">
                <label className="form-label small text-muted">Min Price</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="₹ Min"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small text-muted">Max Price</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="₹ Max"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small text-muted">Condition</label>
                <select 
                  className="form-select"
                  value={filters.condition}
                  onChange={(e) => setFilters({...filters, condition: e.target.value})}
                >
                  <option value="all">All Conditions</option>
                  <option value="new">New</option>
                  <option value="like_new">Like New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small text-muted">Sort By</label>
                <select 
                  className="form-select"
                  value={filters.sortBy}
                  onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                >
                  <option value="newest">Newest First</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="distance">Nearest First</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0">
          {items.length} {items.length === 1 ? 'item' : 'items'} found
        </p>
        {(searchQuery || filters.category !== 'all' || filters.condition !== 'all' || filters.minPrice || filters.maxPrice) && (
          <button 
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setSearchQuery("");
              setFilters({
                category: 'all',
                maxDistance: 50,
                minPrice: '',
                maxPrice: '',
                condition: 'all',
                sortBy: 'newest'
              });
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Products Grid */}
      {items.length === 0 ? (
        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
          <div className="card-body text-center py-5">
            <MdSearch size={64} color="#ccc" className="mb-3" />
            <h5 className="mb-2">No items found</h5>
            <p className="text-muted mb-3">
              Try adjusting your search or filters
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setSearchQuery("");
                setFilters({...filters, category: 'all', condition: 'all', minPrice: '', maxPrice: ''});
              }}
            >
              Clear All Filters
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {items.map((item) => (
            <div key={item.id || item._id} className="col-md-6 col-lg-4 col-xl-3">
              <div 
                className="card border-0 shadow-sm h-100" 
                style={{ 
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onClick={() => setSelectedItemId(item.id || item._id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
              >
                {/* Image */}
                <div style={{ position: 'relative', paddingTop: '75%', overflow: 'hidden', borderRadius: '12px 12px 0 0' }}>
                  {item.images && item.images[0] ? (
                    <img
                      src={getFileUrl(item.images[0]?.url || item.images[0])}
                      alt={item.title}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: '#f8f9fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <MdShoppingCart size={48} color="#dee2e6" />
                    </div>
                  )}
                  
                  {/* Condition Badge */}
                  <span 
                    className={`badge bg-${getConditionColor(item.condition)} position-absolute`}
                    style={{ top: '8px', right: '8px', fontSize: '0.75rem' }}
                  >
                    {getConditionLabel(item.condition)}
                  </span>

                  {/* Confidence Badge */}
                  {item.isRecommended && item.confidenceScore && (
                    <span 
                      className="badge position-absolute"
                      style={{ 
                        top: '40px', 
                        right: '8px', 
                        fontSize: '0.75rem',
                        backgroundColor: item.confidenceColor || '#28a745'
                      }}
                    >
                      ⭐ {item.confidenceLabel || 'Recommended'}
                    </span>
                  )}

                  {/* Wishlist Button */}
                  <button
                    className="btn btn-light btn-sm position-absolute"
                    style={{ top: '8px', left: '8px', borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Add to wishlist
                      toast.info('Wishlist feature coming soon!');
                    }}
                  >
                    <MdFavoriteBorder size={18} />
                  </button>
                </div>

                {/* Content */}
                <div className="card-body">
                  <h6 className="card-title mb-2" style={{ 
                    fontWeight: '600',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.title}
                  </h6>

                  {/* Price */}
                  <h5 className="text-primary mb-2" style={{ fontWeight: '700' }}>
                    {formatCurrency(item.price)}
                  </h5>

                  {/* Seller Info */}
                  <div className="d-flex align-items-center gap-2 mb-3 text-muted small">
                    <MdLocationOn size={14} />
                    <span>{item.seller?.distance ? `${item.seller.distance} km away` : 'Location not set'}</span>
                  </div>

                  {/* Confidence Score */}
                  {item.confidenceScore && (
                    <div className="mb-2">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <small className="text-muted">Match Score</small>
                        <small className="fw-bold" style={{ color: item.confidenceColor || '#28a745' }}>
                          {Math.round(item.confidenceScore)}%
                        </small>
                      </div>
                      <div className="progress" style={{ height: '4px' }}>
                        <div 
                          className="progress-bar" 
                          style={{ 
                            width: `${item.confidenceScore}%`,
                            backgroundColor: item.confidenceColor || '#28a745'
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Rating */}
                  {item.averageRating > 0 && (
                    <div className="d-flex align-items-center gap-1 mb-3">
                      <MdStar size={16} color="#ffc107" />
                      <span className="small">{item.averageRating.toFixed(1)}</span>
                      <span className="text-muted small">({item.totalReviews})</span>
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  <button
                    className="btn btn-primary w-100"
                    onClick={(e) => handleAddToCart(item.id || item._id, e)}
                    disabled={addingToCart[item.id || item._id]}
                    style={{ borderRadius: '8px' }}
                  >
                    {addingToCart[item.id || item._id] ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Adding...
                      </>
                    ) : (
                      <>
                        <MdShoppingCart size={18} className="me-2" />
                        Add to Cart
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Details Modal */}
      {selectedItemId && (
        <ProductDetailsModal
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
          onAddToCart={() => fetchItems()}
        />
      )}
    </div>
  );
}
