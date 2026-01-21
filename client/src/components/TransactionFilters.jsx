import { useState } from "react";
import { Search, FilterList, Close } from "@mui/icons-material";

export default function TransactionFilters({ onFilterChange, onSearch }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [amountRanges, setAmountRanges] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);

  const dateOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "this-week", label: "This Week" },
    { value: "last-30-days", label: "Last 30 Days" },
    { value: "last-90-days", label: "Last 90 Days" }
  ];

  const amountOptions = [
    { value: "0-200", label: "Up to ₹200" },
    { value: "200-500", label: "₹200 - ₹500" },
    { value: "500-1000", label: "₹500 - ₹1,000" },
    { value: "1000-5000", label: "₹1,000 - ₹5,000" },
    { value: "5000-10000", label: "₹5,000 - ₹10,000" },
    { value: "10000+", label: "Above ₹10,000" }
  ];

  const paymentTypeOptions = [
    { value: "income", label: "Money Received" },
    { value: "expense", label: "Money Sent" },
    { value: "self-transfer", label: "Self Transfer" },
    { value: "cashback", label: "Cashback" }
  ];

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleDateChange = (value) => {
    setDateFilter(value);
    applyFilters({ dateFilter: value, amountRanges, paymentTypes });
  };

  const handleAmountToggle = (value) => {
    const newRanges = amountRanges.includes(value)
      ? amountRanges.filter(r => r !== value)
      : [...amountRanges, value];
    setAmountRanges(newRanges);
    applyFilters({ dateFilter, amountRanges: newRanges, paymentTypes });
  };

  const handlePaymentTypeToggle = (value) => {
    const newTypes = paymentTypes.includes(value)
      ? paymentTypes.filter(t => t !== value)
      : [...paymentTypes, value];
    setPaymentTypes(newTypes);
    applyFilters({ dateFilter, amountRanges, paymentTypes: newTypes });
  };

  const applyFilters = (filters) => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
    setAmountRanges([]);
    setPaymentTypes([]);
    if (onSearch) onSearch("");
    if (onFilterChange) {
      onFilterChange({ dateFilter: "all", amountRanges: [], paymentTypes: [] });
    }
  };

  const activeFilterCount = 
    (dateFilter !== "all" ? 1 : 0) + 
    amountRanges.length + 
    paymentTypes.length;

  return (
    <div className="transaction-filters">
      <style>{`
        .transaction-filters {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .search-bar {
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

        .clear-search-btn {
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
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .clear-search-btn:hover {
          background: #f1f5f9;
          color: #334155;
        }

        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .filter-toggle {
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

        .filter-toggle:hover {
          border-color: #161da3;
          background: #f8f9ff;
        }

        .filter-toggle.active {
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

        .filters-content {
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

        .filter-section {
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .filter-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
          padding-bottom: 0;
        }

        .filter-title {
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .radio-group {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.5rem;
        }

        .radio-option {
          display: flex;
          align-items: center;
          padding: 0.5rem 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }

        .radio-option:hover {
          border-color: #161da3;
          background: #f8f9ff;
        }

        .radio-option.selected {
          border-color: #161da3;
          background: #161da3;
          color: white;
        }

        .radio-option input[type="radio"] {
          margin-right: 0.5rem;
          cursor: pointer;
        }

        .checkbox-group {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 0.5rem;
        }

        .checkbox-option {
          display: flex;
          align-items: center;
          padding: 0.5rem 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }

        .checkbox-option:hover {
          border-color: #161da3;
          background: #f8f9ff;
        }

        .checkbox-option.selected {
          border-color: #161da3;
          background: #e0e7ff;
        }

        .checkbox-option input[type="checkbox"] {
          margin-right: 0.5rem;
          cursor: pointer;
        }

        .payment-type-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }

        .payment-type-option:hover {
          border-color: #161da3;
          background: #f8f9ff;
        }

        .payment-type-option.selected {
          border-color: #161da3;
          background: #e0e7ff;
        }

        .payment-type-icon {
          font-size: 1.5rem;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f1f5f9;
        }

        .payment-type-option.selected .payment-type-icon {
          background: #161da3;
          color: white;
        }

        .clear-filters {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          color: #64748b;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .clear-filters:hover {
          border-color: #ef4444;
          color: #ef4444;
          background: #fef2f2;
        }

        .active-filters-summary {
          background: #f8f9ff;
          border: 1px solid #e0e7ff;
          border-radius: 8px;
          padding: 0.75rem;
          margin-top: 1rem;
        }

        .active-filters-summary .badge {
          margin-right: 0.5rem;
          margin-bottom: 0.5rem;
        }
      `}</style>

      {/* Search Bar */}
      <div className="search-bar">
        <Search className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search transactions by description, category, or amount..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search-btn" onClick={() => handleSearchChange("")}>
            <Close fontSize="small" />
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="filter-header">
        <button
          className={`filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <FilterList fontSize="small" />
          Filters
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button className="clear-filters" onClick={clearAllFilters}>
            Clear All
          </button>
        )}
      </div>

      {/* Filters Content */}
      {showFilters && (
        <div className="filters-content">
          {/* Date Filter */}
          <div className="filter-section">
            <div className="filter-title">Date Range</div>
            <div className="radio-group">
              {dateOptions.map(option => (
                <label
                  key={option.value}
                  className={`radio-option ${dateFilter === option.value ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="dateFilter"
                    value={option.value}
                    checked={dateFilter === option.value}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Amount Range Filter */}
          <div className="filter-section">
            <div className="filter-title">Amount Range</div>
            <div className="checkbox-group">
              {amountOptions.map(option => (
                <label
                  key={option.value}
                  className={`checkbox-option ${amountRanges.includes(option.value) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={amountRanges.includes(option.value)}
                    onChange={() => handleAmountToggle(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Payment Type Filter */}
          <div className="filter-section">
            <div className="filter-title">Payment Type</div>
            <div className="checkbox-group">
              {paymentTypeOptions.map(option => (
                <label
                  key={option.value}
                  className={`checkbox-option ${paymentTypes.includes(option.value) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={paymentTypes.includes(option.value)}
                    onChange={() => handlePaymentTypeToggle(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="active-filters-summary">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="text-muted small fw-semibold">Active Filters:</span>
                {dateFilter !== "all" && (
                  <span className="badge bg-primary">
                    {dateOptions.find(o => o.value === dateFilter)?.label}
                  </span>
                )}
                {amountRanges.map(range => (
                  <span key={range} className="badge bg-success">
                    {amountOptions.find(o => o.value === range)?.label}
                  </span>
                ))}
                {paymentTypes.map(type => (
                  <span key={type} className="badge bg-info">
                    {paymentTypeOptions.find(o => o.value === type)?.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
