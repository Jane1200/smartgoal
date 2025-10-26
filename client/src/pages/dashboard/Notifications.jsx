import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.token) return;

    try {
      setLoading(true);
      const includeRead = filter !== 'unread';
      const response = await fetch(`http://localhost:5000/api/notifications?limit=100&includeRead=${includeRead}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let filteredNotifications = data.notifications || [];

        // Filter by category
        if (selectedCategory !== 'all') {
          filteredNotifications = filteredNotifications.filter(n => n.category === selectedCategory);
        }

        // Filter by read status
        if (filter === 'unread') {
          filteredNotifications = filteredNotifications.filter(n => !n.isRead);
        } else if (filter === 'read') {
          filteredNotifications = filteredNotifications.filter(n => n.isRead);
        }

        setNotifications(filteredNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.token, filter, selectedCategory]);

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
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId
              ? { ...notif, isRead: true }
              : notif
          )
        );
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
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    if (!user?.token) return;

    if (!confirm('Delete this notification?')) return;

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
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Clear all read notifications
  const clearReadNotifications = async () => {
    if (!user?.token) return;

    if (!confirm('Clear all read notifications?')) return;

    try {
      const response = await fetch('http://localhost:5000/api/notifications/clear-read', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => !notif.isRead));
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    const icons = {
      error: '❌',
      warning: '⚠️',
      success: '✅',
      info: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  };

  // Get badge color
  const getBadgeColor = (type) => {
    const colors = {
      error: 'danger',
      warning: 'warning',
      success: 'success',
      info: 'primary'
    };
    return colors[type] || 'primary';
  };

  // Format time
  const formatTime = (date) => {
    const notifDate = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now - notifDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return notifDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: notifDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-1">Notifications</h1>
              <p className="text-muted mb-0">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            <div className="d-flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="btn btn-outline-primary"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={clearReadNotifications}
                className="btn btn-outline-danger"
              >
                Clear read
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-3">
        <div className="col">
          <div className="d-flex gap-3 flex-wrap">
            {/* Status Filter */}
            <div className="btn-group" role="group">
              <button
                className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`btn ${filter === 'unread' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </button>
              <button
                className={`btn ${filter === 'read' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter('read')}
              >
                Read
              </button>
            </div>

            {/* Category Filter */}
            <div className="btn-group" role="group">
              <button
                className={`btn ${selectedCategory === 'all' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedCategory('all')}
              >
                All Categories
              </button>
              <button
                className={`btn ${selectedCategory === 'savings' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedCategory('savings')}
              >
                Savings
              </button>
              <button
                className={`btn ${selectedCategory === 'purchase' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedCategory('purchase')}
              >
                Purchase
              </button>
              <button
                className={`btn ${selectedCategory === 'goal' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedCategory('goal')}
              >
                Goals
              </button>
              <button
                className={`btn ${selectedCategory === 'payment' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => setSelectedCategory('payment')}
              >
                Payments
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="row">
        <div className="col">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="card">
              <div className="card-body text-center py-5">
                <div style={{ fontSize: '3rem', opacity: 0.3 }}>🔔</div>
                <h5 className="mt-3">No notifications</h5>
                <p className="text-muted">
                  {filter === 'unread' ? 'All notifications have been read' : 'You have no notifications yet'}
                </p>
              </div>
            </div>
          ) : (
            <div className="list-group">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`list-group-item ${!notification.isRead ? 'list-group-item-action' : ''}`}
                  style={{
                    backgroundColor: !notification.isRead ? '#f8f9ff' : 'white',
                    borderLeft: `4px solid ${!notification.isRead ? '#0d6efd' : 'transparent'}`
                  }}
                >
                  <div className="d-flex w-100 justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span style={{ fontSize: '1.5rem' }}>{getNotificationIcon(notification.type)}</span>
                        <h6 className="mb-0">{notification.title}</h6>
                        {!notification.isRead && (
                          <span className="badge bg-primary">NEW</span>
                        )}
                        <span className={`badge bg-${getBadgeColor(notification.type)}`}>
                          {notification.category}
                        </span>
                      </div>
                      
                      <p className="mb-2 text-muted">{notification.message}</p>
                      
                      <div className="d-flex gap-2 align-items-center">
                        <small className="text-muted">{formatTime(notification.createdAt)}</small>
                        
                        {notification.actionUrl && (
                          <button
                            onClick={() => navigate(notification.actionUrl)}
                            className="btn btn-sm btn-primary"
                          >
                            {notification.actionLabel || 'View'}
                          </button>
                        )}
                        
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="btn btn-sm btn-outline-secondary"
                          >
                            Mark as read
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteNotification(notification._id)}
                          className="btn btn-sm btn-outline-danger"
                        >
                          Delete
                        </button>
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
  );
}


