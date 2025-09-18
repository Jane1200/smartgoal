import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function BuyerDashboard() {
  const [loading, setLoading] = useState(true);
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("newest");

  const categories = [
    { value: "", label: "All Categories" },
    { value: "electronics", label: "Electronics" },
    { value: "fashion", label: "Fashion" },
    { value: "sports", label: "Sports & Fitness" },
    { value: "books", label: "Books" },
    { value: "other", label: "Other" }
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
    { value: "popular", label: "Most Popular" }
  ];

  useEffect(() => {
    fetchMarketplaceItems();
  }, [searchTerm, selectedCategory, priceRange, sortBy]);

  const fetchMarketplaceItems = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategory) params.append("category", selectedCategory);
      if (priceRange.min) params.append("minPrice", priceRange.min);
      if (priceRange.max) params.append("maxPrice", priceRange.max);
      params.append("sort", sortBy);

      const response = await api.get(`/marketplace/browse?${params.toString()}`);
      setMarketplaceItems(response.data || []);
    } catch (error) {
      console.error("Failed to fetch marketplace items:", error);
      toast.error("Failed to load marketplace items");
    } finally {
      setLoading(false);
    }
  };

  const handleContactSeller = (item) => {
    // For now, show contact info in an alert
    // In a real app, this would open a chat or contact modal
    alert(`Contact seller for "${item.title}"\n\nSeller: ${item.sellerName}\nPrice: ₹${item.price.toLocaleString()}\n\nThis feature will be implemented soon!`);
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

  if (loading) {
    return (
      <div className="container-xxl py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading marketplace items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4">
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">Buyer Features</h1>
              <p className="text-muted mb-0">Discover great deals and purchase items from sellers</p>
            </div>
            <div className="text-end">
              <div className="h5 text-primary mb-1">{marketplaceItems.length}</div>
              <div className="small text-muted">Available Items</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="searchInput" className="form-label">Search Items</label>
                  <input
                    type="text"
                    id="searchInput"
                    className="form-control"
                    placeholder="Search for items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="categorySelect" className="form-label">Category</label>
                  <select
                    id="categorySelect"
                    className="form-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="sortSelect" className="form-label">Sort By</label>
                  <select
                    id="sortSelect"
                    className="form-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="minPrice" className="form-label">Min Price (₹)</label>
                  <input
                    type="number"
                    id="minPrice"
                    className="form-control"
                    placeholder="0"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                  />
                </div>
                <div className="col-md-3">
                  <label htmlFor="maxPrice" className="form-label">Max Price (₹)</label>
                  <input
                    type="number"
                    id="maxPrice"
                    className="form-control"
                    placeholder="No limit"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Marketplace Items Grid */}
          <div className="row g-4">
            {marketplaceItems.length === 0 ? (
              <div className="col-12">
                <div className="text-center py-5">
                  <div className="text-muted mb-3">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                      <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
                    </svg>
                  </div>
                  <h4 className="text-muted">No items found</h4>
                  <p className="text-muted">Try adjusting your search criteria or check back later for new listings.</p>
                </div>
              </div>
            ) : (
              marketplaceItems.map(item => (
                <div key={item._id} className="col-lg-4 col-md-6">
                  <div className="card h-100 marketplace-item-card">
                    {/* Item Image */}
                    <div className="position-relative">
                      {item.images && item.images[0] ? (
                        <img
                          src={item.images[0].url}
                          alt={item.title}
                          className="card-img-top"
                          style={{ height: '200px', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="card-img-top bg-light d-flex align-items-center justify-content-center"
                        style={{ height: '200px', display: item.images && item.images[0] ? 'none' : 'flex' }}
                      >
                        <div className="text-center text-muted">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21,15 16,10 5,21"/>
                          </svg>
                          <div className="small mt-2">No Image</div>
                        </div>
                      </div>
                      
                      {/* Condition Badge */}
                      <span className={`badge ${getConditionBadgeColor(item.condition)} position-absolute`} style={{ top: '10px', right: '10px' }}>
                        {getConditionLabel(item.condition)}
                      </span>
                      
                      {/* Status Badge */}
                      <span className={`badge ${item.status === 'active' ? 'bg-success' : 'bg-secondary'} position-absolute`} style={{ top: '10px', left: '10px' }}>
                        {item.status === 'active' ? 'Available' : item.status}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="card-body d-flex flex-column">
                      <div className="flex-grow-1">
                        <h5 className="card-title">{item.title}</h5>
                        <p className="card-text text-muted small">
                          {item.description?.length > 100 
                            ? `${item.description.substring(0, 100)}...` 
                            : item.description || 'No description provided'}
                        </p>
                        
                        {/* Item Details */}
                        <div className="row g-2 mb-3">
                          <div className="col-6">
                            <div className="small text-muted">Category</div>
                            <div className="small fw-medium text-capitalize">{item.category || 'Other'}</div>
                          </div>
                          <div className="col-6">
                            <div className="small text-muted">Listed</div>
                            <div className="small fw-medium">{formatDate(item.createdAt)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Price and Actions */}
                      <div className="mt-auto">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="h5 text-primary mb-0">₹{item.price?.toLocaleString()}</div>
                          <div className="small text-muted">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                              <circle cx="12" cy="12" r="3"/>
                            </svg>
                            {item.views || 0} views
                          </div>
                        </div>
                        
                        <div className="d-grid gap-2">
                          <button
                            className="btn btn-primary"
                            onClick={() => handleContactSeller(item)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            Contact Seller
                          </button>
                          <button className="btn btn-outline-secondary btn-sm">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                            </svg>
                            Save for Later
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
