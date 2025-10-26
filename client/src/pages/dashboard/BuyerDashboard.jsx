import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate, useNavigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const authContext = useAuth();
  const user = authContext?.user;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketplaceItems, setMarketplaceItems] = useState([]);
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

  useEffect(() => {
    fetchBuyerData(false);
    
    // Refresh data every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchBuyerData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchBuyerData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const [ordersRes, itemsRes, statsRes, financeRes] = await Promise.allSettled([
        api.get("/orders"),
        api.get("/marketplace/browse?limit=6"),
        api.get("/orders/stats"),
        api.get("/finance/summary")
      ]);

      if (ordersRes.status === 'fulfilled') {
        setOrders(ordersRes.value.data || []);
      }

      if (itemsRes.status === 'fulfilled') {
        setMarketplaceItems(itemsRes.value.data || []);
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
      {/* Header */}
      <div className="dashboard-hero">
        <div className="welcome-content">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h1 className="title d-flex align-items-center gap-2">
                Welcome{user?.profile?.name ? `, ${user.profile.name}` : ", hey"}
                <div className="welcome-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 3L5 7m4-4l4 4M3 5h18v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z"/>
                  </svg>
                </div>
              </h1>
              <div className="subtitle">
                Browse, save, and purchase amazing items from our marketplace
              </div>
            </div>
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={() => fetchBuyerData()}
              title="Refresh dashboard data"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', marginRight: '6px'}}>
                <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Finance & Buying Stats */}
      <div className="row g-4 mb-4">
        {/* Finance Summary - Available Savings */}
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm border-success" style={{ borderWidth: '2px' }}>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="6" width="20" height="12" rx="2"/>
                      <path d="M6 10h12"/>
                      <path d="M6 14h12"/>
                      <circle cx="12" cy="12" r="2"/>
                    </svg>
                  </div>
                  <h5 className="card-title mb-0">Available Savings</h5>
                </div>
                <a href="/buyer-finances" className="btn btn-sm btn-outline-success">View Details</a>
              </div>
              
              <div className="mb-3">
                <div className="h2 mb-1 text-success">₹{financeData.monthlySavings?.toLocaleString() || '0'}</div>
                <small className="text-muted">💰 Your current purchasing power</small>
              </div>
              
              <div className="alert alert-info mb-0 py-2 px-3" style={{ fontSize: '0.875rem' }}>
                <div className="d-flex align-items-start gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-1">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <div>
                    <strong>Before you purchase:</strong> You can only buy items if you have sufficient savings. 
                    {financeData.monthlySavings > 0 ? (
                      <span className="text-success d-block mt-1">✓ You have ₹{financeData.monthlySavings?.toLocaleString()} available for purchases</span>
                    ) : (
                      <span className="text-warning d-block mt-1">⚠️ Add income to your finances to start shopping</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buyer Stats */}
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                    </svg>
                  </div>
                  <h5 className="card-title mb-0">Buying Summary</h5>
                </div>
                
              </div>
              <div className="row g-3 text-center">
                <div className="col-6">
                  <div className="small text-muted">Total Orders</div>
                  <div className="h4 mb-0 text-primary">{stats.totalOrders}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Total Spent</div>
                  <div className="h4 mb-0 text-danger">₹{(stats.totalSpent || 0).toLocaleString()}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Saved Items</div>
                  <div className="h4 mb-0 text-info">{stats.savedItems}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Watching</div>
                  <div className="h4 mb-0 text-warning">{stats.activeWatches}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                  </div>
                  <h5 className="card-title mb-0">Recent Orders</h5>
                </div>
                <a href="/orders" className="btn btn-sm btn-outline-primary">View All</a>
              </div>
              {orders.length === 0 ? (
                <div className="text-center py-4">
                  <div className="text-muted mb-2">No orders yet</div>
                  <small className="text-muted">Start shopping to see your order history</small>
                </div>
              ) : (
                <div className="d-grid gap-3">
                  {orders.slice(0, 3).map((order) => (
                    <div key={order._id} className="d-flex align-items-center justify-content-between p-3 border rounded">
                      <div className="flex-grow-1">
                        <div className="fw-semibold small">{order.itemTitle || 'Item'}</div>
                        <div className="small text-muted">Order #{order._id?.substring(0, 8)}</div>
                      </div>
                      <div className="text-end">
                        <div className="text-success fw-bold small">₹{(order.total || 0).toLocaleString()}</div>
                        <span className={`badge ${getOrderStatusColor(order.status)} small`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Featured Items for Purchase */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-2">
                  <div className="card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="21" r="1"/>
                      <circle cx="20" cy="21" r="1"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                  </div>
                  <h5 className="card-title mb-0">Featured Listings</h5>
                </div>
                <a href="/marketplace" className="btn btn-sm btn-outline-primary">Browse More</a>
              </div>

              {marketplaceItems.length === 0 ? (
                <div className="text-center py-5">
                  <div className="text-muted mb-3">No items available</div>
                  <small className="text-muted">Check back later for new listings</small>
                </div>
              ) : (
                <div className="row g-3">
                  {marketplaceItems.slice(0, 6).map((item) => (
                    <div key={item._id} className="col-md-6 col-lg-4">
                      <div className="card h-100 marketplace-item-card">
                        <div className="position-relative">
                          {item.images && item.images[0] ? (
                            <img
                              src={getFileUrl(item.images[0]?.url || item.images[0])}
                              alt={item.title}
                              className="card-img-top"
                              style={{ height: '150px', objectFit: 'cover' }}
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
                            style={{ height: '150px', display: item.images && item.images[0] ? 'none' : 'flex' }}
                          >
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21,15 16,10 5,21"/>
                            </svg>
                          </div>

                          <span className={`badge ${getConditionBadgeColor(item.condition)} position-absolute`} style={{ top: '8px', right: '8px' }}>
                            {getConditionLabel(item.condition)}
                          </span>
                        </div>

                        <div className="card-body d-flex flex-column">
                          <h6 className="card-title small">{item.title}</h6>
                          <p className="card-text text-muted small flex-grow-1">
                            {item.category && <span className="badge bg-light text-dark me-2">{item.category}</span>}
                          </p>

                          <div className="mt-auto">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="h6 text-primary mb-0">₹{(item.price || 0).toLocaleString()}</div>
                              <small className="text-muted">{item.views || 0} views</small>
                            </div>
                            <div className="d-grid gap-2">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleContactSeller(item)}
                              >
                                Contact Seller
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="row g-4 mb-4">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="card-title mb-3">Shopping Insights</h6>
              <div className="row g-3 text-center">
                <div className="col-6 col-md-3">
                  <div className="small text-muted">This Month</div>
                  <div className="h5 mb-0 text-primary">
                    {orders.filter(o => new Date(o.createdAt) > new Date(Date.now() - 30*24*60*60*1000)).length} purchases
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="small text-muted">Average Order</div>
                  <div className="h5 mb-0 text-success">
                    ₹{orders.length > 0 ? Math.round((stats.totalSpent || 0) / orders.length).toLocaleString() : '0'}
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="small text-muted">Most Viewed</div>
                  <div className="h5 mb-0 text-info">
                    {marketplaceItems.length > 0 ? Math.max(...marketplaceItems.map(i => i.views || 0)) : '0'} views
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="small text-muted">Marketplace Items</div>
                  <div className="h5 mb-0 text-warning">{marketplaceItems.length} available</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
