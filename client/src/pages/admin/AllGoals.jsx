import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "@/utils/api.js";

export default function AllGoals() {
  // Add custom scrollbar styles
  const scrollbarStyles = `
    .goals-table-scrollable {
      scrollbar-width: auto !important;
      scrollbar-color: #667eea #e9ecef !important;
    }
    .goals-table-scrollable::-webkit-scrollbar {
      width: 12px !important;
      height: 12px !important;
    }
    .goals-table-scrollable::-webkit-scrollbar-track {
      background: #e9ecef !important;
      border-radius: 6px !important;
      margin: 2px !important;
    }
    .goals-table-scrollable::-webkit-scrollbar-thumb {
      background: #667eea !important;
      border-radius: 6px !important;
      border: 2px solid #e9ecef !important;
    }
    .goals-table-scrollable::-webkit-scrollbar-thumb:hover {
      background: #5568d3 !important;
      border-color: #d1d5db !important;
    }
    .goals-table-scrollable::-webkit-scrollbar-corner {
      background: #e9ecef !important;
    }
  `;

  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    limit: 100 // Increased default to show more goals
  });
  const [filters, setFilters] = useState({
    status: 'all', // Default to "all" to show all goals
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);

  useEffect(() => {
    fetchGoals();
    fetchStats();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchGoals(true); // Silent refresh
      fetchStats(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [filters, pagination.current]);

  const fetchGoals = async (silent = false) => {
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

      console.log('🔍 Fetching goals with filters:', {
        status: filters.status,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: pagination.current
      });

      const { data } = await api.get(`/admin/goals?${params}`);
      
      console.log('✅ Goals fetched:', {
        totalGoals: data.goals.length,
        pagination: data.pagination,
        summary: data.summary,
        goals: data.goals.map(g => ({
          title: g.title,
          user: g.user.name,
          status: g.status,
          createdAt: g.createdAt
        }))
      });

      setGoals(data.goals);
      setPagination(data.pagination);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("❌ Failed to fetch goals:", error);
      toast.error(error.response?.data?.message || "Failed to load goals");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStats = async (silent = false) => {
    try {
      const { data } = await api.get("/admin/goals/stats");
      setStats(data);
      
      // Log real-time stats
      if (!silent) {
        console.log('📊 Real-time Admin Goal Stats:', {
          total: data.overview.total,
          active: data.overview.active,
          completed: data.overview.completed,
          overdue: data.overview.overdue,
          breakdown: data.breakdown
        });
      }
    } catch (error) {
      console.error("❌ Failed to fetch goal stats:", error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setPagination(prev => ({ ...prev, current: 1 }));
    toast.info('Filters cleared');
  };

  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
  };

  const handleDeleteGoal = async (goalId, goalTitle) => {
    if (!window.confirm(`Are you sure you want to delete the overdue goal "${goalTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      await api.delete(`/admin/goals/${goalId}`);
      toast.success(`Goal "${goalTitle}" deleted successfully`);
      fetchGoals(true); // Refresh the list
      fetchStats(true); // Refresh stats
    } catch (error) {
      console.error("Failed to delete goal:", error);
      toast.error(error.response?.data?.message || "Failed to delete goal");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAllOverdue = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL overdue goals? This action cannot be undone and will affect multiple users.`)) {
      return;
    }

    setDeleting(true);
    try {
      const { data } = await api.delete("/admin/goals/overdue");
      toast.success(data.message);
      fetchGoals(true); // Refresh the list
      fetchStats(true); // Refresh stats
      setShowDeleteAllModal(false);
    } catch (error) {
      console.error("Failed to delete overdue goals:", error);
      toast.error(error.response?.data?.message || "Failed to delete overdue goals");
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

  const getStatusBadge = (status, isOverdue) => {
    const statusClasses = {
      planned: 'bg-secondary',
      in_progress: 'bg-primary',
      completed: 'bg-success',
      archived: 'bg-dark'
    };
    
    if (isOverdue) return 'bg-danger';
    return statusClasses[status] || 'bg-secondary';
  };

  const getProgressBarColor = (percentage) => {
    if (percentage >= 100) return 'bg-success';
    if (percentage >= 75) return 'bg-info';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-danger';
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
    <div className="container-xxl py-4 admin-goals">
      {/* Custom scrollbar styles */}
      <style>{scrollbarStyles}</style>
      
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">All Goals Management</h2>
          <p className="text-muted mb-0">
            Real-time monitoring of all user goals • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="badge bg-success">Live Data</div>
          {stats && stats.overview.overdue > 0 && (
            <button 
              className="btn btn-danger btn-sm"
              onClick={handleDeleteAllOverdue}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Deleting...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                  </svg>
                  Delete All Overdue ({stats.overview.overdue})
                </>
              )}
            </button>
          )}
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => fetchGoals()}
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
        <>
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3">
              <div className="card admin-stat-card admin-stat-primary h-100">
                <div className="card-body text-center">
                  <h6 className="card-title">Total Goals</h6>
                  <h3 className="mb-0">{stats.overview.total.toLocaleString()}</h3>
                  {stats.breakdown && (
                    <small className="text-muted d-block mt-1">
                      Valid goals only
                    </small>
                  )}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card admin-stat-card admin-stat-info h-100">
                <div className="card-body text-center">
                  <h6 className="card-title">Active Goals</h6>
                  <h3 className="mb-0">{stats.overview.active.toLocaleString()}</h3>
                  {stats.breakdown && (
                    <small className="text-muted d-block mt-1">
                      {stats.breakdown.planned} planned, {stats.breakdown.in_progress} in progress
                    </small>
                  )}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card admin-stat-card admin-stat-success h-100">
                <div className="card-body text-center">
                  <h6 className="card-title">Completed</h6>
                  <h3 className="mb-0">{stats.overview.completed.toLocaleString()}</h3>
                  {stats.breakdown && stats.breakdown.archived > 0 && (
                    <small className="text-muted d-block mt-1">
                      {stats.breakdown.archived} archived
                    </small>
                  )}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className={`card admin-stat-card ${stats.overview.overdue > 0 ? 'admin-stat-danger' : 'admin-stat-warning'} h-100`}>
                <div className="card-body text-center">
                  <h6 className="card-title">
                    Overdue
                    {stats.overview.overdue > 0 && (
                      <span className="badge bg-danger ms-2">Deletable</span>
                    )}
                  </h6>
                  <h3 className="mb-0">{stats.overview.overdue.toLocaleString()}</h3>
                  {stats.overview.overdue > 0 && (
                    <small className="text-muted">Click delete button to remove</small>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Orphaned Goals Warning */}
          {stats.breakdown && stats.breakdown.orphaned > 0 && (
            <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2 flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div className="flex-grow-1">
                <strong>Database Cleanup Needed:</strong> Found {stats.breakdown.orphaned} orphaned goal(s) (goals with deleted users). 
                <button 
                  className="btn btn-sm btn-warning ms-2"
                  onClick={() => {
                    if (window.confirm(`Clean up ${stats.breakdown.orphaned} orphaned goals? This will permanently delete goals whose users no longer exist.`)) {
                      toast.info('Please run: node server/cleanup-orphaned-goals.js --confirm');
                    }
                  }}
                >
                  View Cleanup Instructions
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Filters & Search</h6>
          {(filters.status !== 'all' || filters.search || filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc') && (
            <button 
              className="btn btn-sm btn-outline-danger"
              onClick={handleClearFilters}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Clear All Filters
            </button>
          )}
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">
                Status Filter 
                {filters.status !== 'all' && (
                  <span className="badge bg-primary ms-2">Active Filter</span>
                )}
              </label>
              <select 
                className="form-select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
                <option value="overdue">Overdue (Deletable)</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Sort By</label>
              <select 
                className="form-select"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="createdAt">Created Date</option>
                <option value="updatedAt">Last Updated</option>
                <option value="dueDate">Due Date</option>
                <option value="title">Title</option>
                <option value="targetAmount">Target Amount</option>
              </select>
            </div>
            <div className="col-md-2">
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
            <div className="col-md-4">
              <label className="form-label">
                Search
                {filters.search && (
                  <span className="badge bg-primary ms-2">Searching</span>
                )}
              </label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search goals..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
                {filters.search && (
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => handleFilterChange('search', '')}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Filters Alert */}
      {(filters.status !== 'all' || filters.search) && (
        <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2 flex-shrink-0">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
          </svg>
          <div className="flex-grow-1">
            <strong>⚠️ Filters Active:</strong> Some goals may be hidden. 
            {filters.status !== 'all' && <span className="badge bg-warning text-dark ms-2">Status: {filters.status}</span>}
            {filters.search && <span className="badge bg-warning text-dark ms-2">Search: "{filters.search}"</span>}
            <button 
              className="btn btn-sm btn-warning ms-2"
              onClick={handleClearFilters}
            >
              Clear All Filters to See All Goals
            </button>
          </div>
        </div>
      )}

      {/* Info Banner */}
      {goals.length < pagination.count && (
        <div className="alert alert-info d-flex align-items-center mb-3" role="alert">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2 flex-shrink-0">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
          <div className="flex-grow-1">
            <strong>Limited View:</strong> Showing only {goals.length} of {pagination.count} goals. 
            <button 
              className="btn btn-sm btn-info ms-2"
              onClick={() => setPagination(prev => ({ 
                ...prev, 
                limit: pagination.count || 1000,
                current: 1 
              }))}
            >
              Click here to load all {pagination.count} goals
            </button>
          </div>
        </div>
      )}

      {/* Goals Table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">
            Goals List ({pagination.count.toLocaleString()} total)
          </h5>
          <div className="d-flex align-items-center gap-3">
            <small className={goals.length < pagination.count ? 'text-warning fw-bold' : 'text-muted'}>
              Showing {goals.length} of {pagination.count}
              {goals.length < pagination.count && ' ⚠️'}
            </small>
            {goals.length < pagination.count && (
              <button 
                className="btn btn-sm btn-primary"
                onClick={() => setPagination(prev => ({ 
                  ...prev, 
                  limit: pagination.count || 1000,
                  current: 1 
                }))}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Show All {pagination.count} Goals
              </button>
            )}
            <div className="d-flex align-items-center gap-2">
              <label className="mb-0 small text-muted">Per page:</label>
              <select 
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={pagination.limit}
                onChange={(e) => setPagination(prev => ({ 
                  ...prev, 
                  limit: parseInt(e.target.value),
                  current: 1 
                }))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>All</option>
              </select>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {goals.length === 0 ? (
            <div className="text-center py-5">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted mb-3">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
              <h5 className="text-muted">No goals found</h5>
              <p className="text-muted">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div 
              className="table-responsive goals-table-scrollable" 
              style={{ 
                maxHeight: '70vh', // Use viewport height for better responsive behavior
                minHeight: '400px',
                overflowY: 'scroll', // Always show scrollbar track
                overflowX: 'auto',
                position: 'relative',
                border: '1px solid #dee2e6',
                borderRadius: '0.25rem'
              }}
            >
              {goals.length > 3 && (
                <div 
                  className="position-absolute text-center w-100" 
                  style={{ 
                    bottom: '5px', 
                    left: 0, 
                    right: '15px', // Account for scrollbar
                    background: 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 50%, transparent 100%)',
                    padding: '30px 0 15px',
                    pointerEvents: 'none',
                    zIndex: 5
                  }}
                >
                  <small className="text-primary fw-bold" style={{ textShadow: '0 0 3px white' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="me-1">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    Scroll down to see {goals.length - 3} more goals
                  </small>
                </div>
              )}
              <table className="table table-hover mb-0">
                <thead className="table-light" style={{ 
                  position: 'sticky', 
                  top: 0, 
                  zIndex: 10,
                  backgroundColor: '#f8f9fa'
                }}>
                  <tr>
                    <th style={{ backgroundColor: '#f8f9fa' }}>Goal</th>
                    <th style={{ backgroundColor: '#f8f9fa' }}>User</th>
                    <th style={{ backgroundColor: '#f8f9fa' }}>Progress</th>
                    <th style={{ backgroundColor: '#f8f9fa' }}>Amount</th>
                    <th style={{ backgroundColor: '#f8f9fa' }}>Due Date</th>
                    <th style={{ backgroundColor: '#f8f9fa' }}>Status</th>
                    <th style={{ backgroundColor: '#f8f9fa' }}>Created</th>
                    <th style={{ backgroundColor: '#f8f9fa' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map((goal) => (
                    <tr key={goal.id}>
                      <td>
                        <div>
                          <div className="fw-semibold">{goal.title}</div>
                          {goal.description && (
                            <small className="text-muted d-block" style={{ maxWidth: '200px' }}>
                              {goal.description.length > 50 
                                ? `${goal.description.substring(0, 50)}...` 
                                : goal.description
                              }
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-semibold">{goal.user.name}</div>
                          <small className="text-muted d-block">{goal.user.email}</small>
                          <span className={`badge badge-sm ${
                            goal.user.role === 'admin' ? 'bg-danger' :
                            goal.user.role === 'buyer' ? 'bg-success' : 'bg-primary'
                          }`}>
                            {goal.user.role}
                          </span>
                        </div>
                      </td>
                      <td>
                        {goal.targetAmount && goal.targetAmount > 0 ? (
                          <div>
                            <div className="progress mb-1" style={{ width: '100px' }}>
                              <div 
                                className={`progress-bar ${getProgressBarColor(goal.progressPercentage)}`}
                                style={{ width: `${goal.progressPercentage}%` }}
                              ></div>
                            </div>
                            <small className="text-muted">{goal.progressPercentage}%</small>
                          </div>
                        ) : (
                          <span className="text-muted">No target</span>
                        )}
                      </td>
                      <td>
                        {goal.targetAmount ? (
                          <div>
                            <div className="fw-semibold">{formatCurrency(goal.currentAmount)}</div>
                            <small className="text-muted">of {formatCurrency(goal.targetAmount)}</small>
                          </div>
                        ) : (
                          <span className="text-muted">No amount</span>
                        )}
                      </td>
                      <td>
                        {goal.dueDate ? (
                          <div>
                            <div className={goal.isOverdue ? 'text-danger fw-semibold' : ''}>
                              {formatDate(goal.dueDate)}
                            </div>
                            {goal.daysUntilDue !== null && (
                              <small className={goal.isOverdue ? 'text-danger' : 'text-muted'}>
                                {goal.isOverdue ? `${Math.abs(goal.daysUntilDue)} days overdue` : `${goal.daysUntilDue} days left`}
                              </small>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted">No due date</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(goal.status, goal.isOverdue)}`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div>
                          <div>{formatDate(goal.createdAt)}</div>
                          <small className="text-muted">
                            {new Date(goal.createdAt).toLocaleTimeString()}
                          </small>
                        </div>
                      </td>
                      <td>
                        {goal.isOverdue ? (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteGoal(goal.id, goal.title)}
                            disabled={deleting}
                            title="Delete overdue goal"
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
                        ) : (
                          <span className="text-muted">-</span>
                        )}
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
            <nav aria-label="Goals pagination">
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
