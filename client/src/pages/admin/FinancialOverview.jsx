import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "@/utils/api.js";

export default function FinancialOverview() {
  const [activeTab, setActiveTab] = useState('overview');
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    limit: 50
  });
  const [filters, setFilters] = useState({
    type: 'all',
    source: 'all',
    category: 'all',
    search: '',
    month: '',
    year: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [deleting, setDeleting] = useState(false);

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
        type: filters.type,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });

      if (filters.source !== 'all') params.append('source', filters.source);
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);

      const { data } = await api.get(`/admin/finance/records?${params}`);
      setRecords(data.records);
      setPagination(data.pagination);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch financial records:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStats = async (silent = false) => {
    try {
      const { data } = await api.get("/admin/finance/stats");
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch financial stats:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
  };

  const handleDeleteRecord = async (recordId, recordDescription) => {
    if (!window.confirm(`Are you sure you want to delete the financial record "${recordDescription}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/admin/finance/records/${recordId}`);
      toast.success(`Financial record "${recordDescription}" deleted successfully`);
      fetchData(true);
      fetchStats(true);
    } catch (error) {
      console.error("Failed to delete financial record:", error);
      toast.error(error.response?.data?.message || "Failed to delete financial record");
    } finally {
      setDeleting(false);
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

  const getTypeBadge = (type) => {
    return type === 'income' ? 'bg-success' : 'bg-danger';
  };

  const getSourceBadge = (source) => {
    const sourceClasses = {
      salary: 'bg-primary',
      freelance: 'bg-info',
      business: 'bg-success',
      investment: 'bg-warning',
      rental: 'bg-secondary',
      other: 'bg-dark'
    };
    return sourceClasses[source] || 'bg-secondary';
  };

  const getCategoryBadge = (category) => {
    const categoryClasses = {
      food: 'bg-danger',
      transport: 'bg-warning',
      housing: 'bg-primary',
      healthcare: 'bg-success',
      entertainment: 'bg-info',
      shopping: 'bg-pink',
      education: 'bg-secondary',
      travel: 'bg-dark',
      other: 'bg-light'
    };
    return categoryClasses[category] || 'bg-secondary';
  };

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || '';
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
    <div className="container-xxl py-4 financial-overview">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Financial Overview</h2>
          <p className="text-muted mb-0">
            Real-time monitoring of all financial activity • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="badge bg-success">Live Data</div>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => fetchData()}
            disabled={deleting}
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
            <div className="card admin-stat-card admin-stat-success h-100">
              <div className="card-body text-center">
                <div className="text-success mb-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="6" width="20" height="12" rx="2"/>
                    <path d="M6 10h12"/>
                    <path d="M6 14h12"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
                <h6 className="card-title">Total Income</h6>
                <h3 className="mb-0">{formatCurrency(stats.overview.totalIncome)}</h3>
                <small className="text-muted">{stats.overview.totalIncomeRecords} records</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card admin-stat-card admin-stat-danger h-100">
              <div className="card-body text-center">
                <div className="text-danger mb-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="6" width="20" height="12" rx="2"/>
                    <path d="M6 10h12"/>
                    <path d="M6 14h12"/>
                    <circle cx="12" cy="12" r="2"/>
                  </svg>
                </div>
                <h6 className="card-title">Total Expenses</h6>
                <h3 className="mb-0">{formatCurrency(stats.overview.totalExpense)}</h3>
                <small className="text-muted">{stats.overview.totalExpenseRecords} records</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card admin-stat-card admin-stat-info h-100">
              <div className="card-body text-center">
                <h6 className="card-title">Net Savings</h6>
                <h3 className={`mb-0 ${stats.overview.netSavings >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(stats.overview.netSavings)}
                </h3>
                <small className="text-muted">All time</small>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card admin-stat-card admin-stat-warning h-100">
              <div className="card-body text-center">
                <h6 className="card-title">This Month</h6>
                <h3 className="mb-0">{formatCurrency(stats.monthly.savings)}</h3>
                <small className="text-muted">{stats.monthly.records} records</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">Top Income Sources</h6>
              </div>
              <div className="card-body">
                {stats.breakdown.incomeSources.slice(0, 5).map((source, index) => (
                  <div key={source._id} className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <span className="badge bg-success me-2">{source._id}</span>
                      <small className="text-muted">{source.count} records</small>
                    </div>
                    <div className="fw-semibold">{formatCurrency(source.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">Top Expense Categories</h6>
              </div>
              <div className="card-body">
                {stats.breakdown.expenseCategories.slice(0, 5).map((category, index) => (
                  <div key={category._id} className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <span className="badge bg-danger me-2">{category._id}</span>
                      <small className="text-muted">{category.count} records</small>
                    </div>
                    <div className="fw-semibold">{formatCurrency(category.total)}</div>
                  </div>
                ))}
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
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <rect x="2" y="6" width="20" height="12" rx="2"/>
                  <path d="M6 10h12"/>
                  <path d="M6 14h12"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
                Financial Records ({stats?.overview.totalRecords || 0})
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          {/* Filters */}
          <div className="row g-3 mb-4">
            <div className="col-md-2">
              <label className="form-label">Type</label>
              <select 
                className="form-select"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Source</label>
              <select 
                className="form-select"
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
              >
                <option value="all">All Sources</option>
                <option value="salary">Salary</option>
                <option value="freelance">Freelance</option>
                <option value="business">Business</option>
                <option value="investment">Investment</option>
                <option value="rental">Rental</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Category</label>
              <select 
                className="form-select"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="food">Food</option>
                <option value="transport">Transport</option>
                <option value="housing">Housing</option>
                <option value="healthcare">Healthcare</option>
                <option value="entertainment">Entertainment</option>
                <option value="shopping">Shopping</option>
                <option value="education">Education</option>
                <option value="travel">Travel</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Month</label>
              <select 
                className="form-select"
                value={filters.month}
                onChange={(e) => handleFilterChange('month', e.target.value)}
              >
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Year</label>
              <select 
                className="form-select"
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
              >
                <option value="">All Years</option>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Sort By</label>
              <select 
                className="form-select"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
                <option value="createdAt">Created</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Search</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search descriptions..."
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

          {/* Records Table */}
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Source/Category</th>
                  <th>Description</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <span className={`badge ${getTypeBadge(record.type)}`}>
                        {record.type}
                      </span>
                    </td>
                    <td>
                      <div className={`fw-semibold ${record.type === 'income' ? 'text-success' : 'text-danger'}`}>
                        {record.type === 'income' ? '+' : '-'}{formatCurrency(record.amount)}
                      </div>
                    </td>
                    <td>
                      {record.type === 'income' ? (
                        <span className={`badge ${getSourceBadge(record.source)}`}>
                          {record.source}
                        </span>
                      ) : (
                        <span className={`badge ${getCategoryBadge(record.category)}`}>
                          {record.category}
                        </span>
                      )}
                    </td>
                    <td>
                      <div>
                        <div className="fw-semibold">{record.description || 'No description'}</div>
                        {record.tags && record.tags.length > 0 && (
                          <div className="mt-1">
                            {record.tags.map((tag, index) => (
                              <span key={index} className="badge bg-light text-dark badge-sm me-1">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <div className="fw-semibold">{record.user.name}</div>
                        <small className="text-muted d-block">{record.user.email}</small>
                        <span className={`badge badge-sm ${
                          record.user.role === 'admin' ? 'bg-danger' :
                          record.user.role === 'buyer' ? 'bg-success' : 'bg-primary'
                        }`}>
                          {record.user.role}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>{formatDate(record.date)}</div>
                      <small className="text-muted">
                        {record.daysAgo} days ago
                        {record.isRecent && <span className="text-success ms-1">• Recent</span>}
                      </small>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteRecord(record.id, record.description || 'Untitled')}
                        disabled={deleting}
                        title="Delete financial record"
                      >
                        {deleting ? (
                          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Pagination */}
        {pagination.total > 1 && (
          <div className="card-footer">
            <nav aria-label="Financial records pagination">
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


