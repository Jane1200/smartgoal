import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate, useNavigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import MarketplaceSearch from "@/components/MarketplaceSearch.jsx";
import ProductDetailsModal from "@/components/ProductDetailsModal.jsx";
import { 
  MdSearch, 
  MdClose, 
  MdShoppingCart, 
  MdAccountBalanceWallet,
  MdPhoneAndroid,
  MdLaptop,
  MdWatch,
  MdHeadphones,
  MdTablet,
  MdApps,
  MdStar,
  MdLocationOn,
  MdArrowForward
} from "react-icons/md";

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const authContext = useAuth();
  const user = authContext?.user;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    savedItems: 0,
    activeWatches: 0
  });
  const [financeData, setFinanceData] = useState({
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlySavings: 0,
    totalSavings: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [filters, setFilters] = useState({});
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0
  });

  // Categories for quick filtering
  const categories = [
    { id: "all", label: "All Items", icon: MdApps, color: "#4d5fd9" },
    { id: "phone", label: "Phones", icon: MdPhoneAndroid, color: "#5a6ee0" },
    { id: "laptop", label: "Laptops", icon: MdLaptop, color: "#6d7ee6" },
    { id: "smartwatch", label: "Watches", icon: MdWatch, color: "#808eed" },
    { id: "earphones", label: "Audio", icon: MdHeadphones, color: "#939ef3" },
    { id: "tablet", label: "Tablets", icon: MdTablet, color: "#a6aef9" }
  ];

  useEffect(() => {
    fetchBuyerData(false);
    fetchFeaturedItems();
    fetchRecentItems();
  }, []);

  // Fetch marketplace items when search/filters/category change
  useEffect(() => {
    fetchMarketplaceItems();
  }, [searchQuery, filters, activeCategory]);

  const fetchBuyerData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const [ordersRes, statsRes, financeRes] = await Promise.allSettled([
        api.get("/orders"),
        api.get("/orders/stats"),
        api.get("/finance/summary")
      ]);

      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.data || []);
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data || {
          totalOrders: 0,
          totalSpent: 0,
          savedItems: 0,
          activeWatches: 0
        });
      }

      if (financeRes.status === 'fulfilled') {
        const financeDataRes = financeRes.value.data;
        setFinanceData({
          monthlyIncome: financeDataRes.monthlyIncome || 0,
          monthlyExpense: financeDataRes.monthlyExpense || 0,
          monthlySavings: financeDataRes.monthlySavings || 0,
          totalSavings: Math.max(0, (financeDataRes.monthlyIncome || 0) - (financeDataRes.monthlyExpense || 0))
        });
      }
    } catch (error) {
      console.error("Failed to fetch buyer data:", error);
    } finally {
      if (isManualRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const fetchFeaturedItems = async () => {
    try {
      const response = await api.get("/marketplace/featured?limit=4");
      setFeaturedItems(response.data || []);
    } catch (error) {
      console.error("Failed to fetch featured items:", error);
    }
  };

  const fetchRecentItems = async () => {
    try {
      const response = await api.get("/marketplace/browse?limit=8&sortBy=newest");
      setRecentItems(response.data.items || response.data || []);
    } catch (error) {
      console.error("Failed to fetch recent items:", error);
    }
  };

  const fetchMarketplaceItems = async (page = 1) => {
    try {
      // Build query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(searchQuery && { search: searchQuery }),
        ...(activeCategory !== "all" && { subCategory: activeCategory }),
        ...(filters.condition && { condition: filters.condition }),
        ...(filters.minPrice && { minPrice: filters.minPrice }),
        ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
        ...(filters.location && { location: filters.location }),
        ...(filters.maxDistance && { maxDistance: filters.maxDistance }),
        ...(filters.sortBy && { sortBy: filters.sortBy })
      });

      const response = await api.get(`/marketplace/browse?${params}`);
      
      if (response.data.items) {
        setMarketplaceItems(response.data.items);
        setPagination(response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0
        });
      } else {
        setMarketplaceItems(response.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch marketplace items:", error);
      toast.error("Failed to load marketplace items");
    }
  };

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    setSearchQuery(""); // Clear search when changing category
  };

  const handleViewItem = (item) => {
    // Open product details modal
    setSelectedItemId(item._id);
  };

  const handleContactSeller = (item) => {
    // Open contact/chat modal
    toast.info(`Contact seller for "${item.title}"`);
  };

  const handleAddToCart = (item) => {
    toast.success(`${item.title} added to cart!`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getConditionBadgeColor = (condition) => {
    switch (condition) {
      case 'new': return 'bg-success';
      case 'like-new': return 'bg-primary';
      case 'good': return 'bg-info';
      case 'fair': return 'bg-warning';
      case 'poor': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getConditionLabel = (condition) => {
    switch (condition) {
      case 'new': return 'New';
      case 'like-new': return 'Like New';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      default: return condition;
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-success';
      case 'pending': return 'bg-warning';
      case 'cancelled': return 'bg-danger';
      case 'processing': return 'bg-info';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5 dashboard-page buyer-dashboard">
      {/* Attractive Header with Gradient */}
      <div className="mb-5">
        <div className="d-flex align-items-center gap-3 mb-2">
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4d5fd9 0%, #6d7ee6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            boxShadow: '0 4px 12px rgba(77, 95, 217, 0.3)'
          }}>
            🛍️
          </div>
          <div>
            <h2 className="mb-0">Welcome back{user?.profile?.name ? `, ${user.profile.name}` : ""}!</h2>
            <p className="text-muted mb-0">Discover quality electronics at great prices</p>
          </div>
        </div>
      </div>

      {/* Modern Search Bar with Icon */}
      <div className="mb-5">
        <div className="card border-0 shadow-sm" style={{ 
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #f8f9ff 0%, #e8ecff 100%)'
        }}>
          <div className="card-body p-4">
            <div className="input-group input-group-lg">
              <span className="input-group-text bg-white border-0" style={{ borderRadius: '12px 0 0 12px' }}>
                <MdSearch size={28} color="#4d5fd9" />
              </span>
              <input
                type="text"
                className="form-control border-0 ps-3"
                placeholder="Search for phones, laptops, watches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  fontSize: '1.1rem',
                  borderRadius: '0 12px 12px 0',
                  boxShadow: 'none'
                }}
              />
              {searchQuery && (
                <button 
                  className="btn btn-link text-muted"
                  onClick={() => setSearchQuery("")}
                  style={{ position: 'absolute', right: '10px', zIndex: 10 }}
                >
                  <MdClose size={24} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attractive Category Pills with Icons */}
      <div className="mb-5">
        <div className="d-flex gap-3 flex-wrap justify-content-center">
          {categories.map(cat => {
            const IconComponent = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                className={`btn btn-lg ${isActive ? '' : 'btn-outline-secondary'}`}
                onClick={() => handleCategoryClick(cat.id)}
                style={{ 
                  minWidth: '140px',
                  borderRadius: '12px',
                  border: isActive ? 'none' : '2px solid #e0e0e0',
                  background: isActive ? `linear-gradient(135deg, ${cat.color} 0%, ${cat.color}dd 100%)` : 'white',
                  color: isActive ? 'white' : '#666',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                }}
              >
                <IconComponent size={24} className="me-2" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Beautiful Stats Cards with Lighter Brand Color Gradients */}
      <div className="row g-4 mb-5">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100" style={{ 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            color: 'white'
          }}>
            <div className="card-body text-center p-4">
              <div className="mb-3">
                <MdAccountBalanceWallet size={56} style={{ opacity: 0.95 }} />
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>
                ₹{financeData.monthlySavings?.toLocaleString() || '0'}
              </h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: 0.95 }}>Available Budget</p>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100" style={{ 
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #4d5fd9 0%, #6d7ee6 100%)',
            color: 'white'
          }}>
            <div className="card-body text-center p-4">
              <div className="mb-3">
                <MdShoppingCart size={56} style={{ opacity: 0.95 }} />
              </div>
              <h2 className="mb-2" style={{ fontSize: '2.5rem', fontWeight: '700' }}>
                {stats.totalOrders}
              </h2>
              <p className="mb-0" style={{ fontSize: '1.1rem', opacity: 0.95 }}>Total Orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Browse Items - Beautiful Grid */}
      <div className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0" style={{ fontWeight: '700', fontSize: '1.5rem' }}>
            {searchQuery ? `Results for "${searchQuery}"` : 
             activeCategory !== "all" ? categories.find(c => c.id === activeCategory)?.label : 
             "Browse Electronics"}
          </h4>
          {pagination.totalItems > 0 && (
            <span className="badge bg-primary fs-6" style={{ borderRadius: '8px', padding: '8px 16px' }}>
              {pagination.totalItems} items
            </span>
          )}
        </div>

        {marketplaceItems.length === 0 ? (
          <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
            <div className="card-body text-center py-5">
              <MdSearch size={80} color="#ccc" className="mb-4" />
              <h5 className="mb-3">No items found</h5>
              <p className="text-muted mb-4">
                {searchQuery || activeCategory !== "all"
                  ? "Try adjusting your search or filters"
                  : "Check back later for new listings"}
              </p>
              {(searchQuery || activeCategory !== "all") && (
                <button 
                  className="btn btn-primary btn-lg"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }}
                  style={{ borderRadius: '12px' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="row g-4 mb-5">
              {marketplaceItems.map((item) => (
                <div key={item._id} className="col-md-6 col-lg-4">
                  <div 
                    className="card border-0 shadow-sm h-100" 
                    style={{ 
                      cursor: 'pointer',
                      borderRadius: '16px',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      overflow: 'hidden'
                    }} 
                    onClick={() => handleViewItem(item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)';
                      e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                  >
                    <div className="position-relative">
                      {item.images && item.images[0] ? (
                        <img
                          src={getFileUrl(item.images[0]?.url || item.images[0])}
                          alt={item.title}
                          className="card-img-top"
                          style={{ height: '240px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextElementSibling) {
                              e.target.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className="card-img-top bg-light d-flex align-items-center justify-content-center"
                        style={{ height: '240px', display: item.images && item.images[0] ? 'none' : 'flex' }}
                      >
                        <MdApps size={64} color="#ccc" />
                      </div>

                      <span 
                        className={`badge ${getConditionBadgeColor(item.condition)} position-absolute`} 
                        style={{ 
                          top: '12px', 
                          right: '12px', 
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontWeight: '600'
                        }}
                      >
                        {getConditionLabel(item.condition)}
                      </span>
                    </div>

                    <div className="card-body p-4">
                      <h5 className="card-title mb-3" style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                        {item.title}
                      </h5>
                      
                      <div className="d-flex align-items-center gap-2 mb-3 text-muted">
                        <small style={{ fontSize: '0.9rem' }}>{item.sellerName}</small>
                        {item.sellerRating > 0 && (
                          <div className="d-flex align-items-center gap-1">
                            <MdStar size={16} color="#ffc107" />
                            <small style={{ fontSize: '0.9rem', color: '#ffc107', fontWeight: '600' }}>
                              {item.sellerRating.toFixed(1)}
                            </small>
                          </div>
                        )}
                      </div>

                      <div className="d-flex justify-content-between align-items-center">
                        <h3 className="text-primary mb-0" style={{ fontWeight: '700', fontSize: '1.8rem' }}>
                          ₹{(item.price || 0).toLocaleString()}
                        </h3>
                        <button
                          className="btn btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContactSeller(item);
                          }}
                          style={{ 
                            borderRadius: '10px',
                            fontWeight: '600',
                            padding: '10px 20px'
                          }}
                        >
                          View <MdArrowForward size={18} className="ms-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modern Pagination */}
            {pagination.totalPages > 1 && (
              <div className="d-flex justify-content-center">
                <nav>
                  <ul className="pagination pagination-lg">
                    <li className={`page-item ${pagination.currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => fetchMarketplaceItems(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        style={{ borderRadius: '10px 0 0 10px', fontWeight: '600' }}
                      >
                        Previous
                      </button>
                    </li>
                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <li key={pageNum} className={`page-item ${pagination.currentPage === pageNum ? 'active' : ''}`}>
                          <button 
                            className="page-link"
                            onClick={() => fetchMarketplaceItems(pageNum)}
                            style={{ fontWeight: '600' }}
                          >
                            {pageNum}
                          </button>
                        </li>
                      );
                    })}
                    <li className={`page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => fetchMarketplaceItems(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        style={{ borderRadius: '0 10px 10px 0', fontWeight: '600' }}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </>
        )}
      </div>

      {/* Attractive CTA with Lighter Brand Color */}
      <div className="text-center py-5">
        <div className="card border-0 shadow-sm" style={{ 
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #4d5fd9 0%, #6d7ee6 100%)',
          color: 'white'
        }}>
          <div className="card-body p-5">
            <h4 className="mb-3" style={{ fontWeight: '700' }}>💡 Want to plan your finances?</h4>
            <p className="mb-4" style={{ fontSize: '1.1rem', opacity: 0.95 }}>
              Switch to Goal Setter mode to save for your dreams
            </p>
            <button 
              className="btn btn-light btn-lg"
              onClick={() => navigate("/profile")}
              style={{ 
                borderRadius: '12px',
                fontWeight: '600',
                padding: '12px 32px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              Switch to Goal Setter <MdArrowForward size={20} className="ms-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedItemId && (
        <ProductDetailsModal
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
          onAddToCart={() => {
            fetchMarketplaceItems();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}
