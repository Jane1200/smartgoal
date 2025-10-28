import { useState, useEffect } from "react";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext.jsx";
import TrustBadge from "@/components/TrustBadge.jsx";
import SellerInfoCard from "@/components/SellerInfoCard.jsx";
import MatchedSellers from "@/components/MatchedSellers.jsx";

export default function BuyerMarketplace() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nearbyGoalSetters, setNearbyGoalSetters] = useState([]);
  const [searchCriteria, setSearchCriteria] = useState(null);
  const [locationStats, setLocationStats] = useState(null);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    maxDistance: 50,
    sortBy: 'distance'
  });
  const [viewMode, setViewMode] = useState('standard'); // 'standard' or 'ai-matched'
  const [budgetRange, setBudgetRange] = useState({ min: 5000, max: 50000 });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    count: 0,
    limit: 20
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [addingToCart, setAddingToCart] = useState({});
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [needsLocation, setNeedsLocation] = useState(false);

  useEffect(() => {
    fetchNearbyItems();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchNearbyItems(true); // Silent refresh
    }, 30000);

    return () => clearInterval(interval);
  }, [filters]);

  const fetchNearbyItems = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        maxDistance: filters.maxDistance.toString(),
        category: filters.category,
        limit: pagination.limit.toString(),
        page: pagination.current.toString()
      });

      const { data } = await api.get(`/marketplace/nearby-items?${params}`);
      setItems(data.items || []);
      setNearbyGoalSetters(data.nearbyGoalSetters || []);
      setSearchCriteria(data.searchCriteria);
      setPagination(data.pagination);
      setLocationStats(data.locationStats);
      setLastUpdated(new Date());
      
      // Show info message if fallback results are being shown
      if (data.locationStats?.hasFallbackResults && !silent) {
        toast.info(`Showing items from ${data.locationStats.withoutExactLocation} goal setters who need to update their location for precise distance calculation`);
      }
    } catch (error) {
      console.error("Failed to fetch nearby items:", error);
      if (!silent) {
        if (error.response?.status === 400) {
          setNeedsLocation(true);
          toast.error("Please set your location to see nearby items");
        } else if (error.response?.status === 403) {
          toast.error("Location sharing is disabled. Please enable it in your geo preferences");
        } else {
          toast.error("Failed to load nearby items");
        }
      }
      setItems([]);
      setNearbyGoalSetters([]);
    } finally {
      if (!silent) setLoading(false);
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
          setNeedsLocation(false);
          toast.success("Location updated successfully!");
          
          // Refresh nearby items
          fetchNearbyItems();
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 })); // Reset to first page
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDistanceColor = (distance) => {
    if (distance <= 5) return 'text-success';
    if (distance <= 15) return 'text-warning';
    return 'text-info';
  };

  const getDistanceIcon = (distance) => {
    if (distance <= 5) return '📍'; // Very close
    if (distance <= 15) return '🏠'; // Close
    if (distance <= 30) return '🚗'; // Moderate distance
    return '🗺️'; // Far
  };

  const getConditionBadge = (condition) => {
    const conditionClasses = {
      'new': 'bg-success',
      'like_new': 'bg-primary',
      'good': 'bg-info',
      'fair': 'bg-warning',
      'poor': 'bg-secondary'
    };
    return conditionClasses[condition] || 'bg-secondary';
  };

  const getCategoryIcon = (category) => {
    const categoryIcons = {
      'electronics': '📱',
      'sports': '⚽',
      'books': '📚',
      'other': '📦'
    };
    return categoryIcons[category] || '📦';
  };

  const handleAddToCart = async (itemId) => {
    setAddingToCart(prev => ({ ...prev, [itemId]: true }));
    try {
      await api.post('/cart/add', { marketplaceItemId: itemId, quantity: 1 });
      toast.success('Item added to cart!');
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error(error.response?.data?.message || 'Failed to add item to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [itemId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="container-xxl py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4 buyer-marketplace">
      {/* Location Setup Alert */}
      {needsLocation && (
        <div className="alert alert-warning alert-dismissible fade show mb-4" role="alert">
          <div className="d-flex align-items-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-3">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <div className="flex-grow-1">
              <h6 className="alert-heading mb-1">📍 Location Required</h6>
              <p className="mb-0">To see items from goal setters in your area, please share your location. This helps us show you nearby resale items!</p>
            </div>
            <button 
              className="btn btn-warning ms-3"
              onClick={() => setShowLocationModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              Set Location
            </button>
          </div>
          <button type="button" className="btn-close" onClick={() => setNeedsLocation(false)}></button>
        </div>
      )}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">
            {viewMode === 'ai-matched' ? '🤖 AI Matched Sellers' : 'Nearby Marketplace'}
          </h2>
          <p className="text-muted mb-0">
            {viewMode === 'ai-matched' 
              ? 'Intelligent matching based on your budget, location, and preferences'
              : `Items from goal setters in your area • Last updated: ${lastUpdated.toLocaleTimeString()}`
            }
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="badge bg-success">Live Location</div>
          {viewMode === 'ai-matched' && <div className="badge bg-warning">AI Powered</div>}
          {viewMode === 'standard' && <div className="badge bg-info">Auto Refresh</div>}
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => fetchNearbyItems()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="card mb-4 bg-gradient" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-white">
              <h6 className="mb-1">
                {viewMode === 'standard' ? '📍 Standard View' : '🤖 AI Matched View'}
              </h6>
              <small className="opacity-75">
                {viewMode === 'standard' 
                  ? 'Browse all nearby items sorted by distance'
                  : 'See sellers matched by our ML algorithm based on your preferences'
                }
              </small>
            </div>
            <button
              className={`btn ${viewMode === 'ai-matched' ? 'btn-light' : 'btn-warning'}`}
              onClick={() => setViewMode(viewMode === 'standard' ? 'ai-matched' : 'standard')}
            >
              {viewMode === 'standard' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  Try AI Matching
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                  Standard View
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search Criteria Info */}
      {searchCriteria && (
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">Search Area</h6>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold">
                    📍 {searchCriteria.userLocation.city}, {searchCriteria.userLocation.state}
                  </span>
                  <span className="badge bg-primary">
                    Within {searchCriteria.maxDistance} km
                  </span>
                </div>
                <small className="text-muted">
                  Showing items from {nearbyGoalSetters.length} nearby goal setters
                </small>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">Results</h6>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-semibold">
                    {pagination.count} items found
                  </span>
                  <span className="badge bg-info">
                    Page {pagination.current} of {pagination.total}
                  </span>
                </div>
                <small className="text-muted">
                  Category: {filters.category === 'all' ? 'All' : filters.category}
                </small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="card-title mb-0">
            {viewMode === 'ai-matched' ? 'AI Matching Preferences' : 'Filters'}
          </h6>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {viewMode === 'ai-matched' ? (
              <>
                <div key="budget-filter" className="col-md-6">
                  <label className="form-label">Budget Range</label>
                  <div className="d-flex gap-2 align-items-center">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Min"
                      value={budgetRange.min}
                      onChange={(e) => setBudgetRange({...budgetRange, min: Number(e.target.value)})}
                    />
                    <span>to</span>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Max"
                      value={budgetRange.max}
                      onChange={(e) => setBudgetRange({...budgetRange, max: Number(e.target.value)})}
                    />
                  </div>
                  <small className="text-muted">
                    Current: ₹{budgetRange.min.toLocaleString()} - ₹{budgetRange.max.toLocaleString()}
                  </small>
                </div>
                <div key="category-filter" className="col-md-3">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-select"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="electronics">Electronics</option>
                    <option value="phone">Phone</option>
                    <option value="laptop">Laptop</option>
                    <option value="sports">Sports</option>
                    <option value="books">Books</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div key="distance-filter" className="col-md-3">
                  <label className="form-label">Max Distance</label>
                  <select 
                    className="form-select"
                    value={filters.maxDistance}
                    onChange={(e) => handleFilterChange('maxDistance', parseInt(e.target.value))}
                  >
                    <option value={5}>Within 5 km</option>
                    <option value={10}>Within 10 km</option>
                    <option value={25}>Within 25 km</option>
                    <option value={50}>Within 50 km</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <div key="standard-category" className="col-md-4">
                  <label className="form-label">Category</label>
                  <select 
                    className="form-select"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="electronics">Electronics</option>
                    <option value="sports">Sports</option>
                    <option value="books">Books</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div key="standard-distance" className="col-md-4">
                  <label className="form-label">Max Distance</label>
                  <select 
                    className="form-select"
                    value={filters.maxDistance}
                    onChange={(e) => handleFilterChange('maxDistance', parseInt(e.target.value))}
                  >
                    <option value={10}>Within 10 km</option>
                    <option value={25}>Within 25 km</option>
                    <option value={50}>Within 50 km</option>
                    <option value={100}>Within 100 km</option>
                  </select>
                </div>
                <div key="standard-sort" className="col-md-4">
                  <label className="form-label">Sort By</label>
                  <select 
                    className="form-select"
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  >
                    <option value="distance">Distance (Closest First)</option>
                    <option value="price_low">Price (Low to High)</option>
                    <option value="price_high">Price (High to Low)</option>
                    <option value="newest">Newest First</option>
                    <option value="featured">Featured First</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI Matched Sellers View */}
      {viewMode === 'ai-matched' && searchCriteria?.userLocation && (
        <MatchedSellers
          buyerLatitude={searchCriteria.userLocation.latitude}
          buyerLongitude={searchCriteria.userLocation.longitude}
          budgetMin={budgetRange.min}
          budgetMax={budgetRange.max}
          preferredCategory={filters.category === 'all' ? 'electronics' : filters.category}
          preferredCondition="good"
          maxDistance={filters.maxDistance}
          sellers={items}
        />
      )}

      {/* Standard Items Grid */}
      {viewMode === 'standard' && (
        <div className="card">
          <div className="card-header">
            <h6 className="card-title mb-0">Available Items ({pagination.count})</h6>
          </div>
          <div className="card-body">
          {items.length === 0 ? (
            <div className="text-center py-5">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted mb-3">
                <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
              </svg>
              <h5 className="text-muted">No items found nearby</h5>
              <p className="text-muted">
                Try increasing your search distance or check if location sharing is enabled.
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {items.map((item) => (
                <div key={item.id} className="col-md-6 col-lg-4">
                  <div className="card h-100">
                    {item.images && item.images.length > 0 && (
                      <div className="card-img-top" style={{height: '200px', overflow: 'hidden'}}>
                        <img 
                          src={getFileUrl(item.images[0]?.url || item.images[0])} 
                          alt={item.title}
                          className="w-100 h-100"
                          style={{objectFit: 'cover'}}
                        />
                      </div>
                    )}
                    <div className="card-body d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="card-title mb-0">{item.title}</h6>
                        {item.featured && (
                          <span className="badge bg-warning">Featured</span>
                        )}
                      </div>
                      
                      <p className="card-text text-muted small mb-3">
                        {item.description.length > 100 
                          ? `${item.description.substring(0, 100)}...` 
                          : item.description}
                      </p>
                      
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold text-primary">
                            {formatCurrency(item.price)}
                          </span>
                          <span className={`badge ${getConditionBadge(item.condition)}`}>
                            {item.condition.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span>{getCategoryIcon(item.category)}</span>
                          <small className="text-muted text-capitalize">
                            {item.category}
                          </small>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="d-flex align-items-center mb-1">
                          <span className="me-2">{getDistanceIcon(item.seller.distance)}</span>
                          <span className={`fw-semibold ${getDistanceColor(item.seller.distance)}`}>
                            {item.seller.distance} km away
                          </span>
                        </div>
                        <div className="d-flex align-items-center mb-2">
                          {item.seller.avatar ? (
                            <img 
                              src={getFileUrl(item.seller.avatar)} 
                              alt={item.seller.name}
                              className="rounded-circle me-2"
                              style={{width: '20px', height: '20px', objectFit: 'cover'}}
                            />
                          ) : (
                            <div 
                              className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white me-2"
                              style={{width: '20px', height: '20px', fontSize: '10px'}}
                            >
                              {item.seller.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <small className="text-muted">
                            {item.seller.name} • {item.seller.location.city}
                          </small>
                        </div>
                        
                        {/* Seller Rating & Trust Badge */}
                        {item.trustBadge && (
                          <div className="d-flex align-items-center gap-2">
                            <TrustBadge 
                              level={item.trustBadge.level} 
                              compact={true}
                            />
                            <small className="text-muted">
                              {item.averageRating ? (
                                <>
                                  ⭐ {item.averageRating.toFixed(1)} ({item.totalReviews} review{item.totalReviews !== 1 ? 's' : ''})
                                </>
                              ) : (
                                <>No reviews yet</>
                              )}
                            </small>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-auto">
                        <div className="d-flex gap-2 mb-2">
                          <button 
                            className="btn btn-success flex-grow-1"
                            onClick={() => handleAddToCart(item.id)}
                            disabled={addingToCart[item.id]}
                          >
                            {addingToCart[item.id] ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Adding...
                              </>
                            ) : (
                              <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                                  <circle cx="9" cy="21" r="1"/>
                                  <circle cx="20" cy="21" r="1"/>
                                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                                </svg>
                                Add to Cart
                              </>
                            )}
                          </button>
                          <button 
                            className="btn btn-outline-secondary"
                            onClick={() => setSelectedSellerId(item.seller.id)}
                            title="View seller profile"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                          </button>
                        </div>
                        <small className="text-muted d-block">
                          Listed {item.daysAgo} days ago
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Pagination */}
      {viewMode === 'standard' && pagination.total > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav>
            <ul className="pagination">
              <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link"
                  onClick={() => handlePageChange(pagination.current - 1)}
                  disabled={pagination.current === 1}
                >
                  Previous
                </button>
              </li>
              {Array.from({ length: pagination.total }, (_, i) => i + 1).map(page => (
                <li key={page} className={`page-item ${page === pagination.current ? 'active' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                </li>
              ))}
              <li className={`page-item ${pagination.current === pagination.total ? 'disabled' : ''}`}>
                <button 
                  className="page-link"
                  onClick={() => handlePageChange(pagination.current + 1)}
                  disabled={pagination.current === pagination.total}
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Seller Info Modal */}
      {selectedSellerId && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Seller Profile</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedSellerId(null)}
                />
              </div>
              <div className="modal-body">
                <SellerInfoCard sellerId={selectedSellerId} />
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

