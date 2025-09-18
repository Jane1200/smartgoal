import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "@/utils/api.js";

export default function MarketplaceControl() {
  const [activeTab, setActiveTab] = useState('listings');
  const [listings, setListings] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    limit: 50
  });
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
    fetchStats();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchData(true); // Silent refresh
      fetchStats(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab, filters, pagination.current]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current,
        limit: pagination.limit,
        status: filters.status,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      if (activeTab === 'listings') {
        if (filters.category !== 'all') params.append('category', filters.category);
        const { data } = await api.get(`/admin/marketplace/listings?${params}`);
        setListings(data.listings);
        setPagination(data.pagination);
      } else {
        const { data } = await api.get(`/admin/marketplace/purchases?${params}`);
        setPurchases(data.purchases);
        setPagination(data.pagination);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStats = async (silent = false) => {
    try {
      const { data } = await api.get("/admin/marketplace/stats");
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch marketplace stats:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
  };

  const handleUpdateListing = async (listingId, updates) => {
    setUpdating(true);
    try {
      await api.patch(`/admin/marketplace/listings/${listingId}`, updates);
      toast.success("Listing updated successfully");
      fetchData(true);
    } catch (error) {
      console.error("Failed to update listing:", error);
      toast.error(error.response?.data?.message || "Failed to update listing");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteListing = async (listingId, listingTitle) => {
    if (!window.confirm(`Are you sure you want to delete the listing "${listingTitle}"? This action cannot be undone.`)) {
      return;
    }

    setUpdating(true);
    try {
      await api.delete(`/admin/marketplace/listings/${listingId}`);
      toast.success(`Listing "${listingTitle}" deleted successfully`);
      fetchData(true);
      fetchStats(true);
    } catch (error) {
      console.error("Failed to delete listing:", error);
      toast.error(error.response?.data?.message || "Failed to delete listing");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePurchase = async (purchaseId, updates) => {
    setUpdating(true);
    try {
      await api.patch(`/admin/marketplace/purchases/${purchaseId}`, updates);
      toast.success("Purchase updated successfully");
      fetchData(true);
    } catch (error) {
      console.error("Failed to update purchase:", error);
      toast.error(error.response?.data?.message || "Failed to update purchase");
    } finally {
      setUpdating(false);
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: 'bg-success',
      sold: 'bg-primary',
      pending: 'bg-warning',
      archived: 'bg-secondary',
      completed: 'bg-success',
      cancelled: 'bg-danger',
      refunded: 'bg-info'
    };
    return statusClasses[status] || 'bg-secondary';
  };

  const getCategoryBadge = (category) => {
    const categoryClasses = {
      electronics: 'bg-primary',
      sports: 'bg-warning',
      books: 'bg-info',
      other: 'bg-secondary'
    };
    return categoryClasses[category] || 'bg-secondary';
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
    <div className="container-xxl py-4 marketplace-control">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Marketplace Control Center</h2>
          <p className="text-muted mb-0">
            Real-time monitoring of marketplace activity • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="badge bg-success">Live Data</div>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => fetchData()}
            disabled={updating}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card admin-stat-card admin-stat-primary h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Total Listings</h6>
                <h3 className="mb-0">{stats.overview.totalListings.toLocaleString()}</h3>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card admin-stat-card admin-stat-success h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Active Listings</h6>
                <h3 className="mb-0">{stats.overview.activeListings.toLocaleString()}</h3>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card admin-stat-card admin-stat-info h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Sold Items</h6>
                <h3 className="mb-0">{stats.overview.soldListings.toLocaleString()}</h3>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card admin-stat-card admin-stat-warning h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Total Revenue</h6>
                <h3 className="mb-0">{formatCurrency(stats.financial.totalRevenue)}</h3>
                <small className="text-muted">This month</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card mb-4">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'listings' ? 'active' : ''}`}
                onClick={() => setActiveTab('listings')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                  <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
                </svg>
                Listings ({stats?.overview.totalListings || 0})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'purchases' ? 'active' : ''}`}
                onClick={() => setActiveTab('purchases')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                  <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
                </svg>
                Purchases ({stats?.purchases.total || 0})
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          {/* Filters */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <label className="form-label">Status Filter</label>
              <select 
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Status</option>
                {activeTab === 'listings' ? (
                  <>
                    <option value="active">Active</option>
                    <option value="sold">Sold</option>
                    <option value="pending">Pending</option>
                    <option value="archived">Archived</option>
                  </>
                ) : (
                  <>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </>
                )}
              </select>
            </div>
            {activeTab === 'listings' && (
              <div className="col-md-3">
                <label className="form-label">Category Filter</label>
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
            )}
            <div className="col-md-3">
              <label className="form-label">Sort By</label>
              <select 
                className="form-select"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="createdAt">Created Date</option>
                <option value="updatedAt">Last Updated</option>
                {activeTab === 'listings' ? (
                  <>
                    <option value="price">Price</option>
                    <option value="views">Views</option>
                    <option value="title">Title</option>
                  </>
                ) : (
                  <>
                    <option value="purchaseDate">Purchase Date</option>
                    <option value="itemPrice">Price</option>
                  </>
                )}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Order</label>
              <select 
                className="form-select"
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Search</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder={`Search ${activeTab}...`}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => handleFilterChange('search', '')}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {activeTab === 'listings' ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Listing</th>
                    <th>Seller</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.id}>
                      <td>
                        <div>
                          <div className="fw-semibold">{listing.title}</div>
                          {listing.description && (
                            <small className="text-muted d-block" style={{ maxWidth: '200px' }}>
                              {listing.description.length > 50 
                                ? `${listing.description.substring(0, 50)}...` 
                                : listing.description
                              }
                            </small>
                          )}
                          {listing.featured && (
                            <span className="badge bg-warning badge-sm">Featured</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-semibold">{listing.seller.name}</div>
                          <small className="text-muted d-block">{listing.seller.email}</small>
                          <span className={`badge badge-sm ${
                            listing.seller.role === 'admin' ? 'bg-danger' :
                            listing.seller.role === 'buyer' ? 'bg-success' : 'bg-primary'
                          }`}>
                            {listing.seller.role}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold">{formatCurrency(listing.price)}</div>
                        {listing.buyer && (
                          <small className="text-muted d-block">
                            Sold to: {listing.buyer.name}
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getCategoryBadge(listing.category)}`}>
                          {listing.category}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(listing.status)}`}>
                          {listing.status}
                        </span>
                      </td>
                      <td>
                        <div>{listing.views}</div>
                        <small className="text-muted">{listing.likes} likes</small>
                      </td>
                      <td>
                        <div>{formatDate(listing.createdAt)}</div>
                        <small className="text-muted">
                          {listing.daysListed} days ago
                        </small>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          {listing.status === 'active' && (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleUpdateListing(listing.id, { featured: !listing.featured })}
                                disabled={updating}
                                title={listing.featured ? "Remove from featured" : "Mark as featured"}
                              >
                                {listing.featured ? '★' : '☆'}
                              </button>
                              <button
                                className="btn btn-warning btn-sm"
                                onClick={() => handleUpdateListing(listing.id, { status: 'archived' })}
                                disabled={updating}
                                title="Archive listing"
                              >
                                📁
                              </button>
                            </>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteListing(listing.id, listing.title)}
                            disabled={updating}
                            title="Delete listing"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Buyer</th>
                    <th>Seller</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Purchase Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>
                        <div>
                          <div className="fw-semibold">{purchase.itemTitle}</div>
                          {purchase.marketplaceItem && (
                            <small className="text-muted d-block">
                              ID: {purchase.marketplaceItem.id}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-semibold">{purchase.buyer.name}</div>
                          <small className="text-muted d-block">{purchase.buyer.email}</small>
                          <span className={`badge badge-sm ${
                            purchase.buyer.role === 'admin' ? 'bg-danger' :
                            purchase.buyer.role === 'buyer' ? 'bg-success' : 'bg-primary'
                          }`}>
                            {purchase.buyer.role}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-semibold">{purchase.seller.name}</div>
                          <small className="text-muted d-block">{purchase.seller.email}</small>
                          <span className={`badge badge-sm ${
                            purchase.seller.role === 'admin' ? 'bg-danger' :
                            purchase.seller.role === 'buyer' ? 'bg-success' : 'bg-primary'
                          }`}>
                            {purchase.seller.role}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold">{formatCurrency(purchase.itemPrice)}</div>
                        <small className="text-muted">{purchase.paymentMethod}</small>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(purchase.status)}`}>
                          {purchase.status}
                        </span>
                      </td>
                      <td>
                        <div>{formatDate(purchase.purchaseDate)}</div>
                        <small className="text-muted">
                          {new Date(purchase.purchaseDate).toLocaleTimeString()}
                        </small>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          {purchase.status === 'pending' && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleUpdatePurchase(purchase.id, { status: 'completed' })}
                              disabled={updating}
                              title="Mark as completed"
                            >
                              ✓
                            </button>
                          )}
                          {purchase.status !== 'cancelled' && (
                            <button
                              className="btn btn-warning btn-sm"
                              onClick={() => handleUpdatePurchase(purchase.id, { status: 'cancelled' })}
                              disabled={updating}
                              title="Cancel purchase"
                            >
                              ✗
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {pagination.total > 1 && (
          <div className="card-footer">
            <nav aria-label="Pagination">
              <ul className="pagination pagination-sm justify-content-center mb-0">
                <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => handlePageChange(pagination.current - 1)}
                    disabled={pagination.current === 1}
                  >
                    Previous
                  </button>
                </li>
                
                {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <li key={page} className={`page-item ${pagination.current === page ? 'active' : ''}`}>
                      <button 
                        className="page-link"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    </li>
                  );
                })}
                
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
      </div>
    </div>
  );
}


