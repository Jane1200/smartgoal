import { useState, useEffect } from "react";
import { Search, FilterList, Close, TuneOutlined } from "@mui/icons-material";

export default function MarketplaceSearch({ onSearch, onFilterChange, initialFilters = {} }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: initialFilters.category || "",
    condition: initialFilters.condition || "",
    minPrice: initialFilters.minPrice || "",
    maxPrice: initialFilters.maxPrice || "",
    sortBy: initialFilters.sortBy || "newest",
    location: initialFilters.location || "",
    maxDistance: initialFilters.maxDistance || "50"
  });

  const categories = [
    "Electronics",
    "Furniture",
    "Clothing",
    "Books",
    "Sports",
    "Toys",
    "Home & Garden",
    "Vehicles",
    "Other"
  ];

  const conditions = [
    { value: "new", label: "New" },
    { value: "like-new", label: "Like New" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" }
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
    { value: "most-viewed", label: "Most Viewed" },
    { value: "nearest", label: "Nearest to Me" }
  ];

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (onSearch) {
        onSearch(searchQuery);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      condition: "",
      minPrice: "",
      maxPrice: "",
      sortBy: "newest",
      location: "",
      maxDistance: "50"
    });
    setSearchQuery("");
  };

  const activeFilterCount = Object.values(filters).filter(v => v && v !== "newest" && v !== "50").length;

  return (
    <div className="marketplace-search">
      <style>{`
        .marketplace-search {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .search-input-wrapper {
          position: relative;
          margin-bottom: 1rem;
        }

        .search-input {
          width: 100%;
          padding: 0.75rem 3rem 0.75rem 3rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #161da3;
          box-shadow: 0 0 0 3px rgba(22, 29, 163, 0.1);
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .clear-search {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .clear-search:hover {
          background: #f1f5f9;
          color: #334155;
        }

        .filter-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .filter-toggle-btn:hover {
          border-color: #161da3;
          background: #f8f9ff;
        }

        .filter-toggle-btn.active {
          border-color: #161da3;
          background: #161da3;
          color: white;
        }

        .filter-badge {
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .filters-panel {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 2px solid #e2e8f0;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .filter-group {
          margin-bottom: 1rem;
        }

        .filter-label {
          display: block;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .filter-select,
        .filter-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .filter-select:focus,
        .filter-input:focus {
          outline: none;
          border-color: #161da3;
          box-shadow: 0 0 0 3px rgba(22, 29, 163, 0.1);
        }

        .price-range-inputs {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 0.5rem;
          align-items: center;
        }

        .clear-filters-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          color: #64748b;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .clear-filters-btn:hover {
          border-color: #ef4444;
          color: #ef4444;
          background: #fef2f2;
        }
      `}</style>

      {/* Search Input */}
      <div className="search-input-wrapper">
        <Search className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search for items... (e.g., iPhone, Laptop, Furniture)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search" onClick={() => setSearchQuery("")}>
            <Close fontSize="small" />
          </button>
        )}
      </div>

      {/* Filter Toggle & Sort */}
      <div className="d-flex gap-2 align-items-center flex-wrap">
        <button
          className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <TuneOutlined fontSize="small" />
          Filters
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </button>

        <select
          className="filter-select"
          style={{ width: 'auto', minWidth: '180px' }}
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
        >
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {activeFilterCount > 0 && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            Clear All Filters
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="row g-3">
            {/* Category Filter */}
            <div className="col-md-4">
              <div className="filter-group">
                <label className="filter-label">Category</label>
                <select
                  className="filter-select"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Condition Filter */}
            <div className="col-md-4">
              <div className="filter-group">
                <label className="filter-label">Condition</label>
                <select
                  className="filter-select"
                  value={filters.condition}
                  onChange={(e) => handleFilterChange('condition', e.target.value)}
                >
                  <option value="">Any Condition</option>
                  {conditions.map(cond => (
                    <option key={cond.value} value={cond.value}>{cond.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Max Distance Filter */}
            <div className="col-md-4">
              <div className="filter-group">
                <label className="filter-label">
                  Max Distance: {filters.maxDistance} km
                </label>
                <input
                  type="range"
                  className="form-range"
                  min="5"
                  max="100"
                  step="5"
                  value={filters.maxDistance}
                  onChange={(e) => handleFilterChange('maxDistance', e.target.value)}
                />
                <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
                  <span>5 km</span>
                  <span>100 km</span>
                </div>
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="col-md-6">
              <div className="filter-group">
                <label className="filter-label">Price Range (₹)</label>
                <div className="price-range-inputs">
                  <input
                    type="number"
                    className="filter-input"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    min="0"
                  />
                  <span className="text-muted">to</span>
                  <input
                    type="number"
                    className="filter-input"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Location Filter */}
            <div className="col-md-6">
              <div className="filter-group">
                <label className="filter-label">Location</label>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="City or area..."
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="mt-3 p-3 bg-light rounded">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="text-muted small fw-semibold">Active Filters:</span>
                {filters.category && (
                  <span className="badge bg-primary">{filters.category}</span>
                )}
                {filters.condition && (
                  <span className="badge bg-info">{conditions.find(c => c.value === filters.condition)?.label}</span>
                )}
                {filters.minPrice && (
                  <span className="badge bg-success">Min: ₹{filters.minPrice}</span>
                )}
                {filters.maxPrice && (
                  <span className="badge bg-success">Max: ₹{filters.maxPrice}</span>
                )}
                {filters.location && (
                  <span className="badge bg-warning">{filters.location}</span>
                )}
                {filters.maxDistance !== "50" && (
                  <span className="badge bg-secondary">Within {filters.maxDistance} km</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
