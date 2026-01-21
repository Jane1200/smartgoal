import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  IndianRupee,
  Target,
  TrendingUp,
  Star,
  Phone,
  Navigation,
  Filter,
  Loader,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import TrustBadge from './TrustBadge';
import SellerInfoCard from './SellerInfoCard';
import api, { getFileUrl } from '../utils/api';

/**
 * MatchedSellers Component
 * Shows ML-matched sellers based on buyer's location and preferences
 * Displays in the same format as the standard marketplace view
 */
const MatchedSellers = ({
  buyerLatitude = 0,
  buyerLongitude = 0,
  budgetMin = 0,
  budgetMax = 100000,
  preferredCategory = 'electronics',
  preferredCondition = 'good',
  maxDistance = 10,
  sellers = []
}) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(false);
  const [addingToCart, setAddingToCart] = useState({});
  const [selectedSellerId, setSelectedSellerId] = useState(null);

  useEffect(() => {
    if (sellers.length > 0 && buyerLatitude && buyerLongitude) {
      findMatches();
    }
  }, [sellers, buyerLatitude, buyerLongitude, budgetMin, budgetMax, maxDistance]);

  const findMatches = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:5000/api/ml-pricing/match-sellers', {
        sellers: sellers.map(seller => {
          // Get image URL properly
          let imageUrl = '';
          if (seller.images && seller.images.length > 0) {
            if (typeof seller.images[0] === 'string') {
              imageUrl = seller.images[0];
            } else if (seller.images[0]?.url) {
              imageUrl = seller.images[0].url;
            }
          }

          // Debug logging
          console.log('📦 Seller data:', {
            id: seller.id,
            title: seller.title,
            price: seller.price,
            distance: seller.seller?.distance,
            location: seller.seller?.location
          });

          return {
            sellerId: seller.seller?.id || seller.userId?._id || seller.userId || seller.sellerId,
            sellerName: seller.seller?.name || seller.sellerName || seller.userName || 'Unknown Seller',
            sellerAvatar: seller.seller?.avatar || seller.sellerAvatar || '',
            sellerCity: seller.seller?.location?.city || seller.sellerCity || 'Unknown',
            sellerDistance: seller.seller?.distance || 0, // Use pre-calculated distance
            productId: seller._id || seller.id || seller.productId,
            productTitle: seller.title || seller.productTitle,
            productDescription: seller.description || '',
            productPrice: seller.price || seller.productPrice || 0,
            productCategory: seller.category || seller.productCategory,
            productCondition: seller.condition || seller.productCondition,
            productImage: imageUrl,
            productFeatured: seller.featured || false,
            productDaysAgo: seller.daysAgo || 0,
            latitude: buyerLatitude, // Use buyer's location for now (will use seller distance)
            longitude: buyerLongitude,
            location: `${seller.seller?.location?.city || 'Unknown'}, ${seller.seller?.location?.state || ''}`
          };
        }),
        buyer: {
          latitude: buyerLatitude,
          longitude: buyerLongitude,
          budgetMin,
          budgetMax,
          preferredCategory,
          preferredCondition,
          maxDistance
        }
      });

      if (response.data.success) {
        const matchesData = response.data.matches || [];
        console.log('🎯 ML Matches received:', matchesData.length, 'sellers');
        console.log('Sample match:', matchesData[0]);
        
        // Override ML-calculated distance and ensure correct data with actual seller data
        const correctedMatches = matchesData.map(match => {
          const originalSeller = sellers.find(s => 
            (s.id || s._id) === match.productId || 
            (s.seller?.id) === match.sellerId
          );
          
          if (originalSeller) {
            console.log('🔍 Correcting match for:', match.productTitle);
            console.log('   Original price:', originalSeller.price, 'Match price:', match.productPrice);
            console.log('   Original distance:', originalSeller.seller?.distance, 'Match distance:', match.distance);
            
            return {
              ...match,
              // Use original seller data to ensure accuracy
              productPrice: originalSeller.price || match.productPrice,
              distance: originalSeller.seller?.distance || match.distance,
              location: `${originalSeller.seller?.location?.city || ''}, ${originalSeller.seller?.location?.state || ''}`.trim().replace(/^,\s*/, ''),
              sellerName: originalSeller.seller?.name || match.sellerName,
              sellerAvatar: originalSeller.seller?.avatar || match.sellerAvatar
            };
          }
          return match;
        });
        
        console.log('✅ Corrected matches with real distances:', correctedMatches[0]);
        setMatches(correctedMatches);
        setStats(response.data.statistics);
      } else {
        setError(response.data.message || 'Failed to find matches');
      }
    } catch (err) {
      console.error('❌ Matching error:', err);
      setError('Failed to find matching sellers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = showOnlyRecommended
    ? matches.filter(m => m.recommended)
    : matches;

  const getConditionBadge = (condition) => {
    const badges = {
      'brand_new': 'bg-success',
      'excellent': 'bg-info',
      'good': 'bg-primary',
      'fair': 'bg-warning',
      'poor': 'bg-secondary'
    };
    return badges[condition] || 'bg-secondary';
  };

  const getCategoryIcon = (category) => {
    const icons = {
      electronics: '📱',
      sports: '⚽',
      books: '📚',
      furniture: '🛋️',
      clothing: '👕',
      other: '📦'
    };
    return icons[category] || '📦';
  };

  const getDistanceIcon = (distance) => {
    if (distance < 5) return '🎯';
    if (distance < 15) return '📍';
    return '🗺️';
  };

  const getDistanceColor = (distance) => {
    if (distance < 5) return 'text-success';
    if (distance < 15) return 'text-primary';
    return 'text-warning';
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const handleAddToCart = async (productId) => {
    setAddingToCart(prev => ({ ...prev, [productId]: true }));
    try {
      await api.post('/cart/add', { marketplaceItemId: productId, quantity: 1 });
      toast.success('Item added to cart!');
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error(error.response?.data?.message || 'Failed to add item to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [productId]: false }));
    }
  };

  const getMatchScoreBadge = (score) => {
    if (score >= 80) return { bg: 'bg-success', text: 'Perfect Match', icon: '🎯' };
    if (score >= 60) return { bg: 'bg-primary', text: 'Great Match', icon: '✨' };
    if (score >= 40) return { bg: 'bg-warning', text: 'Good Match', icon: '👍' };
    return { bg: 'bg-secondary', text: 'Fair Match', icon: '📊' };
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-gray-600">Finding best matches using AI...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <AlertCircle className="w-5 h-5 inline-block mr-2" />
        {error}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 bg-white rounded-lg border border-gray-200">
        <Search className="w-16 h-16 text-gray-400 mx-auto mb-3" />
        <h5 className="text-muted mb-2">No matching sellers found</h5>
        <p className="text-muted small">
          Try adjusting your budget range or search distance
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Stats */}
      <div className="card mb-3 text-white" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-1">
                🎯 AI Matched Sellers
                <span className="badge bg-warning text-dark ms-2 small">ML POWERED</span>
              </h5>
              <p className="mb-0 small opacity-75">
                {matches.length} sellers found • {matches.filter(m => m.recommended).length} highly recommended
              </p>
            </div>
          </div>

          {stats && (
            <div className="row g-2">
              <div className="col-3">
                <div className="rounded p-2 text-center" style={{backgroundColor: 'rgba(255, 255, 255, 0.25)'}}>
                  <MapPin className="w-4 h-4 mx-auto mb-1" style={{width: '16px', height: '16px'}} />
                  <small className="d-block">
                    {typeof stats.averageDistance === 'number' 
                      ? stats.averageDistance.toFixed(1) 
                      : stats.averageDistance} km
                  </small>
                </div>
              </div>
              <div className="col-3">
                <div className="rounded p-2 text-center" style={{backgroundColor: 'rgba(255, 255, 255, 0.25)'}}>
                  <IndianRupee className="w-4 h-4 mx-auto mb-1" style={{width: '16px', height: '16px'}} />
                  <small className="d-block">₹{(stats.averagePrice/1000).toFixed(0)}k</small>
                </div>
              </div>
              <div className="col-3">
                <div className="rounded p-2 text-center" style={{backgroundColor: 'rgba(255, 255, 255, 0.25)'}}>
                  <CheckCircle className="w-4 h-4 mx-auto mb-1" style={{width: '16px', height: '16px'}} />
                  <small className="d-block">{stats.withinBudget} in budget</small>
                </div>
              </div>
              <div className="col-3">
                <div className="rounded p-2 text-center" style={{backgroundColor: 'rgba(255, 255, 255, 0.25)'}}>
                  <Navigation className="w-4 h-4 mx-auto mb-1" style={{width: '16px', height: '16px'}} />
                  <small className="d-block">{stats.withinDistance} nearby</small>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <Filter className="me-2" style={{width: '16px', height: '16px'}} />
              <small className="fw-semibold">Quick Filter</small>
            </div>
            <button
              onClick={() => setShowOnlyRecommended(!showOnlyRecommended)}
              className={`btn btn-sm ${showOnlyRecommended ? 'btn-primary' : 'btn-outline-secondary'}`}
            >
              {showOnlyRecommended ? '✓ Recommended Only' : 'Show All Items'}
            </button>
          </div>
        </div>
      </div>

      {/* Items Grid - MATCHING STANDARD VIEW */}
      <div className="card">
        <div className="card-header">
          <h6 className="card-title mb-0">Available Items ({filteredMatches.length})</h6>
        </div>
        <div className="card-body">
          {filteredMatches.length === 0 ? (
            <div className="text-center py-5">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-3" style={{width: '64px', height: '64px'}} />
              <h5 className="text-muted">No recommended sellers found</h5>
              <p className="text-muted">Try showing all matches</p>
            </div>
          ) : (
            <div className="row g-3">
              {filteredMatches.map((match) => (
                <div key={match.productId} className="col-md-6 col-lg-4">
                  <div className="card h-100 position-relative">
                    {/* Match Score Badge - TOP RIGHT CORNER */}
                    <div className="position-absolute" style={{top: '8px', left: '8px', zIndex: 10}}>
                      <span className={`badge ${getMatchScoreBadge(match.matchScore).bg} shadow`}>
                        {getMatchScoreBadge(match.matchScore).icon} {match.matchScore}% Match
                      </span>
                    </div>

                    {/* Product Image */}
                    {match.productImage ? (
                      <div className="card-img-top" style={{height: '200px', overflow: 'hidden'}}>
                        <img 
                          src={getFileUrl(match.productImage)} 
                          alt={match.productTitle}
                          className="w-100 h-100"
                          style={{objectFit: 'cover'}}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="card-img-top bg-light d-none align-items-center justify-content-center"
                          style={{height: '200px'}}
                        >
                          <div className="text-center">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted mb-2">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21,15 16,10 5,21"/>
                            </svg>
                            <p className="text-muted small">No Image</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="card-img-top bg-light d-flex align-items-center justify-content-center"
                        style={{height: '200px'}}
                      >
                        <div className="text-center">
                          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted mb-2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21,15 16,10 5,21"/>
                          </svg>
                          <p className="text-muted small">No Image</p>
                        </div>
                      </div>
                    )}

                    <div className="card-body d-flex flex-column">
                      {/* Title and Featured Badge */}
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="card-title mb-0">{match.productTitle}</h6>
                        {match.productFeatured && (
                          <span className="badge bg-warning">Featured</span>
                        )}
                      </div>
                      
                      {/* Description */}
                      <p className="card-text text-muted small mb-3">
                        {match.productDescription && match.productDescription.length > 100 
                          ? `${match.productDescription.substring(0, 100)}...` 
                          : match.productDescription || 'No description available'}
                      </p>
                      
                      {/* Price and Condition */}
                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold text-primary">
                            {formatCurrency(match.productPrice)}
                          </span>
                          <span className={`badge ${getConditionBadge(match.productCondition)}`}>
                            {match.productCondition?.replace('_', ' ') || 'good'}
                          </span>
                        </div>
                        {/* Category */}
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span>{getCategoryIcon(match.productCategory)}</span>
                          <small className="text-muted text-capitalize">
                            {match.productCategory}
                          </small>
                        </div>
                      </div>
                      
                      {/* Location and Seller Info */}
                      <div className="mb-3">
                        {/* Distance */}
                        <div className="d-flex align-items-center mb-1">
                          <span className="me-2">{getDistanceIcon(match.distance)}</span>
                          <span className={`fw-semibold ${getDistanceColor(match.distance)}`}>
                            {typeof match.distance === 'number' ? match.distance.toFixed(1) : match.distance} km away
                          </span>
                        </div>
                        
                        {/* Seller Avatar and Name */}
                        <div className="d-flex align-items-center mb-2">
                          {match.sellerAvatar ? (
                            <img 
                              src={getFileUrl(match.sellerAvatar)} 
                              alt={match.sellerName}
                              className="rounded-circle me-2"
                              style={{width: '20px', height: '20px', objectFit: 'cover'}}
                            />
                          ) : (
                            <div 
                              className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white me-2"
                              style={{width: '20px', height: '20px', fontSize: '10px'}}
                            >
                              {match.sellerName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          <small className="text-muted">
                            {match.sellerName} • {match.location}
                          </small>
                        </div>
                      </div>
                      
                      {/* Buttons */}
                      <div className="mt-auto">
                        <div className="d-flex gap-2 mb-2">
                          <button 
                            className="btn btn-success flex-grow-1"
                            onClick={() => handleAddToCart(match.productId)}
                            disabled={addingToCart[match.productId]}
                          >
                            {addingToCart[match.productId] ? (
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
                            onClick={() => setSelectedSellerId(match.sellerId)}
                            title="View seller profile"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                          </button>
                        </div>
                        <small className="text-muted d-block">
                          Listed {match.productDaysAgo || 0} days ago
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
    </div>
  );
};

export default MatchedSellers;
