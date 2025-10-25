import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import MarketplaceFeedbackForm from "@/components/MarketplaceFeedbackForm.jsx";

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState({});
  const [feedbackItemId, setFeedbackItemId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/orders');
      setOrders(data);
    } catch (error) {
      console.error('Fetch orders error:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    setCancelling(prev => ({ ...prev, [orderId]: true }));
    try {
      await api.post(`/orders/${orderId}/cancel`, { reason: 'Cancelled by buyer' });
      toast.success('Order cancelled successfully');
      fetchOrders(); // Refresh orders
    } catch (error) {
      console.error('Cancel order error:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(prev => ({ ...prev, [orderId]: false }));
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'pending': 'bg-warning',
      'confirmed': 'bg-info',
      'processing': 'bg-primary',
      'shipped': 'bg-primary',
      'delivered': 'bg-success',
      'cancelled': 'bg-danger',
      'refunded': 'bg-secondary'
    };
    return statusClasses[status] || 'bg-secondary';
  };

  const getPaymentStatusBadge = (status) => {
    const statusClasses = {
      'pending': 'bg-warning',
      'completed': 'bg-success',
      'failed': 'bg-danger',
      'refunded': 'bg-secondary'
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
    <div className="container-xxl py-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="mb-1">My Orders</h2>
        <p className="text-muted mb-0">View and manage your orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted mb-3">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <h5 className="text-muted">No orders yet</h5>
            <p className="text-muted mb-4">Start shopping to see your orders here</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/dashboard/buyer-marketplace')}
            >
              Browse Marketplace
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {orders.map((order) => (
            <div key={order._id} className="col-12">
              <div className="card">
                <div className="card-header">
                  <div className="row align-items-center">
                    <div className="col-md-3">
                      <small className="text-muted">Order ID</small>
                      <p className="mb-0 fw-bold">{order.orderId}</p>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted">Order Date</small>
                      <p className="mb-0">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="col-md-2">
                      <small className="text-muted">Total</small>
                      <p className="mb-0 fw-bold text-primary">{formatCurrency(order.totalAmount)}</p>
                    </div>
                    <div className="col-md-2">
                      <small className="text-muted">Status</small>
                      <p className="mb-0">
                        <span className={`badge ${getStatusBadge(order.status)}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </p>
                    </div>
                    <div className="col-md-2">
                      <small className="text-muted">Payment</small>
                      <p className="mb-0">
                        <span className={`badge ${getPaymentStatusBadge(order.paymentStatus)}`}>
                          {order.paymentStatus.toUpperCase()}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  {/* Order Items */}
                  {order.items.map((item, index) => (
                    <div key={index} className="d-flex gap-3 mb-3 pb-3 border-bottom">
                      <div style={{ width: '80px', height: '80px', flexShrink: 0 }}>
                        {item.image && (
                          <img 
                            src={getFileUrl(item.image)}
                            alt={item.title}
                            className="w-100 h-100 rounded"
                            style={{ objectFit: 'cover' }}
                          />
                        )}
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{item.title}</h6>
                        <p className="text-muted small mb-1">
                          Seller: {item.sellerId?.name || 'Unknown'}
                        </p>
                        <p className="mb-0">
                          <span className="fw-bold">{formatCurrency(item.price)}</span>
                          <span className="text-muted"> × {item.quantity}</span>
                        </p>
                      </div>
                      <div className="text-end">
                        <p className="fw-bold mb-0">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}

                  {/* Shipping Address */}
                  <div className="row mt-3">
                    <div className="col-md-6">
                      <h6 className="mb-2">Shipping Address</h6>
                      <p className="mb-0 small">
                        {order.shippingAddress.fullName}<br />
                        {order.shippingAddress.phone}<br />
                        {order.shippingAddress.addressLine1}<br />
                        {order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}
                        {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <h6 className="mb-2">Payment Details</h6>
                      <p className="mb-0 small">
                        <strong>Method:</strong> {order.paymentMethod.toUpperCase()}<br />
                        {order.paymentDetails?.transactionId && (
                          <>
                            <strong>Transaction ID:</strong> {order.paymentDetails.transactionId}<br />
                            <strong>Paid At:</strong> {formatDate(order.paymentDetails.paidAt)}<br />
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-2 mt-3">
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => navigate(`/dashboard/order/${order._id}`)}
                    >
                      View Details
                    </button>
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleCancelOrder(order._id)}
                        disabled={cancelling[order._id]}
                      >
                        {cancelling[order._id] ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                    {order.status === 'delivered' && order.items.map((item, idx) => (
                      <button 
                        key={idx}
                        className="btn btn-sm btn-outline-success"
                        onClick={() => setFeedbackItemId(item.marketplaceItemId || item.id)}
                      >
                        Leave Review for {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Form Modal */}
      {feedbackItemId && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Leave Feedback & Rating</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setFeedbackItemId(null)}
                />
              </div>
              <div className="modal-body">
                <MarketplaceFeedbackForm 
                  itemId={feedbackItemId}
                  onSuccess={() => {
                    setFeedbackItemId(null);
                    fetchOrders(); // Refresh orders to update
                  }}
                  onCancel={() => setFeedbackItemId(null)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}