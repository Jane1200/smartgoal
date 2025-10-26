import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext.jsx";

export default function NotificationCenter() {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/notifications?limit=10', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    if (!user?.token) return;

    try {
      const response = await fetch('http://localhost:5000/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    if (!user?.token) return;

    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif._id === notificationId 
              ? { ...notif, isRead: true } 
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user?.token) return;

    try {
      const response = await fetch('http://localhost:5000/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    if (!user?.token) return;

    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
        // If it was unread, decrease count
        const deletedNotif = notifications.find(n => n._id === notificationId);
        if (deletedNotif && !deletedNotif.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle extend goal due date
  const handleExtendGoal = async (notification) => {
    const goalId = notification.details?.goalId;
    if (!goalId || !user?.token) return;

    // Prompt user for new date
    const newDateStr = prompt('Enter new due date (YYYY-MM-DD):', 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    
    if (!newDateStr) return;

    try {
      const response = await fetch(`http://localhost:5000/api/goals/${goalId}/extend-due-date`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newDueDate: newDateStr })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        // Remove notification from list
        await deleteNotification(notification._id);
        // Refresh notifications
        fetchNotifications();
        // Reload page to show updated goal
        window.location.href = '/goals';
      } else {
        alert(data.message || 'Failed to extend goal due date');
      }
    } catch (error) {
      console.error('Error extending goal:', error);
      alert('Failed to extend goal due date');
    }
  };

  // Handle delete expired goal
  const handleDeleteExpiredGoal = async (notification) => {
    const goalId = notification.details?.goalId;
    const goalTitle = notification.details?.goalTitle;
    
    if (!goalId || !user?.token) return;

    if (!confirm(`Are you sure you want to delete the goal "${goalTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/goals/${goalId}/expired`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        // Remove notification from list
        await deleteNotification(notification._id);
        // Refresh notifications
        fetchNotifications();
        // Reload page to show updated goals
        window.location.href = '/goals';
      } else {
        alert(data.message || 'Failed to delete goal');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Failed to delete goal');
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [user?.token]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showNotifications]);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffc107" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        );
      case 'success':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d6efd" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        );
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInSeconds = Math.floor((now - notifDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return notifDate.toLocaleDateString();
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        className="btn position-relative"
        onClick={() => setShowNotifications(!showNotifications)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#333',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f0f0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{
              fontSize: '0.65rem',
              padding: '0.25em 0.5em',
              minWidth: '18px'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div
          className="position-absolute end-0 mt-2 bg-white border rounded shadow-lg"
          style={{
            minWidth: '380px',
            maxWidth: '420px',
            maxHeight: '500px',
            zIndex: 1000,
            top: '100%',
            borderColor: '#dee2e6',
            borderTop: '3px solid #0d6efd'
          }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <h6 className="mb-0 fw-semibold">Notifications</h6>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn btn-sm btn-link text-primary"
                style={{ fontSize: '0.75rem', padding: '0', textDecoration: 'none' }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3, marginBottom: '1rem' }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <p className="mb-0">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    backgroundColor: !notification.isRead ? '#f8f9ff' : 'white',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = !notification.isRead ? '#e8eaff' : '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = !notification.isRead ? '#f8f9ff' : 'white';
                  }}
                  onClick={() => !notification.isRead && markAsRead(notification._id)}
                >
                  <div className="d-flex gap-3">
                    {/* Icon */}
                    <div style={{ flexShrink: 0 }}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <h6 className="mb-0" style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                          {notification.title}
                        </h6>
                        {!notification.isRead && (
                          <span
                            className="badge bg-primary"
                            style={{ fontSize: '0.65rem', padding: '0.25em 0.5em' }}
                          >
                            NEW
                          </span>
                        )}
                      </div>
                      
                      <p
                        className="mb-1 text-muted"
                        style={{
                          fontSize: '0.8rem',
                          lineHeight: '1.4',
                          wordBreak: 'break-word'
                        }}
                      >
                        {notification.message}
                      </p>

                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {formatTimeAgo(notification.createdAt)}
                        </small>

                        {/* Action Buttons */}
                        <div className="d-flex gap-1">
                          {/* Special handling for expired goal notifications */}
                          {notification.details?.action === 'extend_or_delete' ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExtendGoal(notification);
                                }}
                                className="btn btn-sm btn-success"
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '0.2rem 0.4rem',
                                  borderRadius: '4px'
                                }}
                              >
                                Extend
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteExpiredGoal(notification);
                                }}
                                className="btn btn-sm btn-warning"
                                style={{
                                  fontSize: '0.65rem',
                                  padding: '0.2rem 0.4rem',
                                  borderRadius: '4px'
                                }}
                              >
                                Delete Goal
                              </button>
                            </>
                          ) : (
                            <>
                              {notification.actionUrl && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.location.href = notification.actionUrl;
                                  }}
                                  className="btn btn-sm btn-outline-primary"
                                  style={{
                                    fontSize: '0.7rem',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px'
                                  }}
                                >
                                  {notification.actionLabel || 'View'}
                                </button>
                              )}
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification._id);
                                }}
                                className="btn btn-sm btn-link text-danger"
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.25rem 0.5rem',
                                  textDecoration: 'none'
                                }}
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="text-center py-2 border-top">
              <a
                href="/notifications"
                className="text-primary"
                style={{ fontSize: '0.875rem', textDecoration: 'none', fontWeight: '500' }}
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


