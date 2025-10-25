import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api, { getFileUrl } from "@/utils/api.js";

export default function ConnectionRequests() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    total: 0
  });
  const [activeTab, setActiveTab] = useState('pending');
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    count: 0,
    limit: 20
  });
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [acceptedBuyers, setAcceptedBuyers] = useState([]);
  const [acceptedBuyersLoading, setAcceptedBuyersLoading] = useState(false);

  useEffect(() => {
    fetchConnections();
    fetchStats();
    fetchAcceptedBuyers();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchConnections(true); // Silent refresh
      fetchStats(true);
      fetchAcceptedBuyers(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab, pagination.current]);

  const fetchConnections = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        status: activeTab,
        limit: pagination.limit.toString(),
        page: pagination.current.toString()
      });

      const { data } = await api.get(`/connections/requests?${params}`);
      setConnections(data.connections || []);
      setPagination(data.pagination);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch connections:", error);
      if (!silent) toast.error("Failed to fetch connection requests");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchStats = async (silent = false) => {
    try {
      const { data } = await api.get("/connections/stats");
      setStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch connection stats:", error);
    }
  };

  const fetchAcceptedBuyers = async (silent = false) => {
    if (!silent) setAcceptedBuyersLoading(true);
    try {
      const { data } = await api.get("/connections/accepted-buyers");
      setAcceptedBuyers(data.buyers || []);
    } catch (error) {
      console.error("Failed to fetch accepted buyers:", error);
      if (!silent) toast.error("Failed to load accepted buyers");
    } finally {
      if (!silent) setAcceptedBuyersLoading(false);
    }
  };

  const respondToConnection = async (connectionId, status, responseMessage = "") => {
    try {
      await api.put(`/connections/respond/${connectionId}`, {
        status,
        responseMessage
      });
      
      toast.success(`Connection request ${status} successfully!`);
      
      // Refresh connections, stats, and accepted buyers
      fetchConnections();
      fetchStats();
      fetchAcceptedBuyers();
    } catch (error) {
      console.error("Failed to respond to connection:", error);
      toast.error(`Failed to ${status} connection request`);
    }
  };

  const deleteConnection = async (connectionId) => {
    try {
      await api.delete(`/connections/${connectionId}`);
      toast.success("Connection request deleted successfully!");
      
      // Refresh connections, stats, and accepted buyers
      fetchConnections();
      fetchStats();
      fetchAcceptedBuyers();
    } catch (error) {
      console.error("Failed to delete connection:", error);
      toast.error("Failed to delete connection request");
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-warning',
      accepted: 'bg-success',
      rejected: 'bg-danger',
      blocked: 'bg-secondary'
    };
    return statusClasses[status] || 'bg-secondary';
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
    <div className="container-xxl py-4 connection-requests">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          
          <p className="text-muted mb-0">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => fetchConnections()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card admin-stat-card admin-stat-warning h-100">
            <div className="card-body text-center">
              <h6 className="card-title">Pending</h6>
              <h3 className="mb-0">{stats.pending}</h3>
              <small className="text-muted">Awaiting response</small>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card admin-stat-card admin-stat-success h-100">
            <div className="card-body text-center">
              <h6 className="card-title">Accepted</h6>
              <h3 className="mb-0">{stats.accepted}</h3>
              <small className="text-muted">Connected</small>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card admin-stat-card admin-stat-danger h-100">
            <div className="card-body text-center">
              <h6 className="card-title">Rejected</h6>
              <h3 className="mb-0">{stats.rejected}</h3>
              <small className="text-muted">Declined</small>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card admin-stat-card admin-stat-info h-100">
            <div className="card-body text-center">
              <h6 className="card-title">Total</h6>
              <h3 className="mb-0">{stats.total}</h3>
              <small className="text-muted">All requests</small>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Requests */}
      <div className="card">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                Pending ({stats.pending})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'accepted' ? 'active' : ''}`}
                onClick={() => setActiveTab('accepted')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                Accepted ({stats.accepted})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'rejected' ? 'active' : ''}`}
                onClick={() => setActiveTab('rejected')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Rejected ({stats.rejected})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'buyers' ? 'active' : ''}`}
                onClick={() => setActiveTab('buyers')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Accepted Buyers ({acceptedBuyers.length})
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button 
                className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                  <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                </svg>
                All ({stats.total})
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          {activeTab === 'buyers' ? (
            // Accepted Buyers Tab
            <div>
              {acceptedBuyersLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading accepted buyers...</p>
                </div>
              ) : acceptedBuyers.length === 0 ? (
                <div className="text-center py-5">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted mb-3">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <h5 className="text-muted">No accepted buyers found</h5>
                  <p className="text-muted">You haven't accepted any connection requests yet.</p>
                </div>
              ) : (
                <div className="row g-3">
                  {acceptedBuyers.map((buyer) => (
                    <div key={buyer.id} className="col-12">
                      <div className="card border-success">
                        <div className="card-body">
                          <div className="row align-items-center">
                            <div className="col-md-8">
                              <div className="d-flex align-items-center mb-2">
                                <div className="avatar me-3">
                                  {buyer.avatar ? (
                                    <img 
                                      src={getFileUrl(buyer.avatar)} 
                                      alt={buyer.name}
                                      className="rounded-circle"
                                      style={{width: '50px', height: '50px', objectFit: 'cover'}}
                                    />
                                  ) : (
                                    <div 
                                      className="rounded-circle bg-success d-flex align-items-center justify-content-center text-white"
                                      style={{width: '50px', height: '50px'}}
                                    >
                                      {buyer.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-grow-1">
                                  <h6 className="mb-0">{buyer.name}</h6>
                                  <small className="text-muted">{buyer.email}</small>
                                  <div className="mt-1">
                                    <span className="badge bg-success">Connected</span>
                                    <span className="badge bg-info ms-1">Buyer</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="row g-2">
                                <div className="col-md-6">
                                  <div className="d-flex align-items-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted me-2">
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                      <circle cx="12" cy="10" r="3"/>
                                    </svg>
                                    <small className="text-muted">
                                      {buyer.location ? `${buyer.location.city}, ${buyer.location.state}` : 'Location not specified'}
                                    </small>
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="d-flex align-items-center">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted me-2">
                                      <circle cx="12" cy="12" r="10"/>
                                      <path d="M12 6v6l4 2"/>
                                    </svg>
                                    <small className="text-muted">
                                      Connected {formatTimeAgo(buyer.connectedAt)}
                                    </small>
                                  </div>
                                </div>
                              </div>
                              
                              {buyer.bio && (
                                <div className="mt-2">
                                  <small className="text-muted">Bio:</small>
                                  <p className="mb-0 small">{buyer.bio}</p>
                                </div>
                              )}
                              
                              {buyer.interests && buyer.interests.length > 0 && (
                                <div className="mt-2">
                                  <small className="text-muted">Interests:</small>
                                  <div className="mt-1">
                                    {buyer.interests.map((interest, index) => (
                                      <span key={index} className="badge bg-light text-dark me-1 mb-1">
                                        {interest}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="col-md-4 text-end">
                              <div className="d-flex flex-column gap-2">
                                <button 
                                  className="btn btn-outline-primary btn-sm"
                                  onClick={() => {
                                    // Navigate to buyer profile or start conversation
                                    toast.info("Feature coming soon: Direct messaging");
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                  </svg>
                                  Message
                                </button>
                                <button 
                                  className="btn btn-outline-info btn-sm"
                                  onClick={() => {
                                    // View buyer profile
                                    toast.info("Feature coming soon: View profile");
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                  </svg>
                                  View Profile
                                </button>
                                <button 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => {
                                    // Block or remove connection
                                    if (window.confirm("Are you sure you want to remove this connection?")) {
                                      toast.info("Feature coming soon: Remove connection");
                                    }
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                  </svg>
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-5">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted mb-3">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <h5 className="text-muted">No connection requests found</h5>
              <p className="text-muted">
                {activeTab === 'pending' 
                  ? "You don't have any pending connection requests."
                  : `You don't have any ${activeTab} connection requests.`
                }
              </p>
            </div>
          ) : (
            <div className="row g-3">
              {connections.map((connection) => (
                <div key={connection.id} className="col-12">
                  <div className="card">
                    <div className="card-body">
                      <div className="row align-items-center">
                        <div className="col-md-8">
                          <div className="d-flex align-items-center mb-2">
                            <div className="avatar me-3">
                              {connection.buyer.avatar ? (
                                <img 
                                  src={getFileUrl(connection.buyer.avatar)} 
                                  alt={connection.buyer.name}
                                  className="rounded-circle"
                                  style={{width: '40px', height: '40px', objectFit: 'cover'}}
                                />
                              ) : (
                                <div 
                                  className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white"
                                  style={{width: '40px', height: '40px'}}
                                >
                                  {connection.buyer.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-0">{connection.buyer.name}</h6>
                              <small className="text-muted">{connection.buyer.email}</small>
                            </div>
                            <span className={`badge ${getStatusBadge(connection.status)}`}>
                              {connection.status}
                            </span>
                          </div>
                          
                          {connection.message && (
                            <div className="mb-2">
                              <small className="text-muted">Message:</small>
                              <p className="mb-0 small">{connection.message}</p>
                            </div>
                          )}
                          
                          {connection.responseMessage && (
                            <div className="mb-2">
                              <small className="text-muted">Your Response:</small>
                              <p className="mb-0 small">{connection.responseMessage}</p>
                            </div>
                          )}
                          
                          <div className="d-flex align-items-center gap-3">
                            <small className="text-muted">
                              📅 {formatDate(connection.createdAt)}
                            </small>
                            <small className="text-muted">
                              ⏰ {formatTimeAgo(connection.createdAt)}
                            </small>
                            {connection.buyerLocation && (
                              <small className="text-muted">
                                📍 {connection.buyerLocation.distance} km away
                              </small>
                            )}
                            {connection.connectionType && (
                              <small className="text-muted">
                                🏷️ {connection.connectionType}
                              </small>
                            )}
                          </div>
                        </div>
                        
                        <div className="col-md-4 text-end">
                          {connection.status === 'pending' && (
                            <div className="d-flex gap-2 justify-content-end">
                              <button 
                                className="btn btn-success btn-sm"
                                onClick={() => respondToConnection(connection.id, 'accepted')}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                  <path d="M9 12l2 2 4-4"/>
                                </svg>
                                Accept
                              </button>
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => respondToConnection(connection.id, 'rejected')}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                  <line x1="18" y1="6" x2="6" y2="18"/>
                                  <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                                Reject
                              </button>
                            </div>
                          )}
                          
                          {connection.status !== 'pending' && (
                            <div className="d-flex gap-2 justify-content-end">
                              <button 
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => deleteConnection(connection.id)}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                                  <polyline points="3,6 5,6 21,6"/>
                                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                                </svg>
                                Delete
                              </button>
                            </div>
                          )}
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

      {/* Pagination */}
      {pagination.total > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav>
            <ul className="pagination">
              <li className={`page-item ${pagination.current === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link"
                  onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                  disabled={pagination.current === 1}
                >
                  Previous
                </button>
              </li>
              {Array.from({ length: pagination.total }, (_, i) => i + 1).map(page => (
                <li key={page} className={`page-item ${page === pagination.current ? 'active' : ''}`}>
                  <button 
                    className="page-link"
                    onClick={() => setPagination(prev => ({ ...prev, current: page }))}
                  >
                    {page}
                  </button>
                </li>
              ))}
              <li className={`page-item ${pagination.current === pagination.total ? 'disabled' : ''}`}>
                <button 
                  className="page-link"
                  onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
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
  );
}


