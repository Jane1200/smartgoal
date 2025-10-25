import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cart');
      setCart(data);
    } catch (error) {
      console.error('Fetch cart error:', error);
      toast.error('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };



  const handleRemoveItem = async (itemId) => {
    if (!confirm('Remove this item from cart?')) return;
    
    setUpdating(prev => ({ ...prev, [itemId]: true }));
    try {
      const { data } = await api.delete(`/cart/remove/${itemId}`);
      setCart(data.cart);
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Remove item error:', error);
      toast.error('Failed to remove item');
    } finally {
      setUpdating(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleClearCart = async () => {
    if (!confirm('Clear all items from cart?')) return;
    
    try {
      const { data } = await api.delete('/cart/clear');
      setCart(data.cart);
      toast.success('Cart cleared');
    } catch (error) {
      console.error('Clear cart error:', error);
      toast.error('Failed to clear cart');
    }
  };

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    navigate('/checkout');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Shopping Cart</h2>
          <p className="text-muted mb-0">
            {cart?.totalItems || 0} items in your cart
          </p>
        </div>
        {cart && cart.items.length > 0 && (
          <button 
            className="btn btn-outline-danger"
            onClick={handleClearCart}
          >
            Clear Cart
          </button>
        )}
      </div>

      {!cart || cart.items.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted mb-3">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <h5 className="text-muted">Your cart is empty</h5>
            <p className="text-muted mb-4">Add items from the marketplace to get started</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/buyer-marketplace')}
            >
              Browse Marketplace
            </button>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {/* Cart Items */}
          <div className="col-lg-8">
            <div className="card">
              <div className="card-header">
                <h6 className="card-title mb-0">Cart Items ({cart.totalItems})</h6>
              </div>
              <div className="card-body">
                {cart.items.map((item) => (
                  <div key={item._id} className="d-flex gap-3 mb-3 pb-3 border-bottom">
                    {/* Image */}
                    <div style={{ width: '100px', height: '100px', flexShrink: 0 }}>
                      {item.marketplaceItemId?.images?.[0] && (
                        <img 
                          src={getFileUrl(item.marketplaceItemId.images[0].url || item.marketplaceItemId.images[0])}
                          alt={item.marketplaceItemId.title}
                          className="w-100 h-100 rounded"
                          style={{ objectFit: 'cover' }}
                        />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-grow-1">
                      <h6 className="mb-1">{item.marketplaceItemId?.title || 'Item Unavailable'}</h6>
                      <p className="text-muted small mb-2">
                        Seller: {item.marketplaceItemId?.userId?.name || 'Unknown'}
                      </p>
                      <div className="d-flex align-items-center gap-3">
                        <span className="fw-bold text-primary">
                          {formatCurrency(item.price)}
                        </span>
                        <span className="badge bg-light text-dark">Single Item</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="d-flex flex-column justify-content-between align-items-end">
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemoveItem(item.marketplaceItemId._id)}
                        disabled={updating[item.marketplaceItemId._id]}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                      <span className="text-muted small">
                        Price: {formatCurrency(item.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="col-lg-4">
            <div className="card sticky-top" style={{ top: '20px' }}>
              <div className="card-header">
                <h6 className="card-title mb-0">Order Summary</h6>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between mb-2">
                  <span>Items ({cart.totalItems})</span>
                  <span>{formatCurrency(cart.totalAmount)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span>Shipping</span>
                  <span className="text-success">FREE</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between mb-3">
                  <span className="fw-bold">Total</span>
                  <span className="fw-bold text-primary fs-5">
                    {formatCurrency(cart.totalAmount)}
                  </span>
                </div>
                <button 
                  className="btn btn-success w-100 mb-2"
                  onClick={handleCheckout}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                    <path d="M9 11l3 3L22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  Proceed to Checkout
                </button>
                <button 
                  className="btn btn-outline-secondary w-100"
                  onClick={() => navigate('/buyer-marketplace')}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}