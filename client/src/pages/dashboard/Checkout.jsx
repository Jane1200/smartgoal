import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { getFileUrl } from "@/utils/api.js";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext.jsx";

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [paymentPlan, setPaymentPlan] = useState('full'); // full, emi3, emi6, bnpl
  const [emiMonths, setEmiMonths] = useState(3); // 3, 6, or 12 months
  const [shippingAddress, setShippingAddress] = useState({
    fullName: user?.name || '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cart');
      if (!data || data.items.length === 0) {
        toast.error('Your cart is empty');
        navigate('/cart');
        return;
      }
      setCart(data);
    } catch (error) {
      console.error('Fetch cart error:', error);
      toast.error('Failed to load cart');
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setShippingAddress(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!shippingAddress.fullName || !shippingAddress.phone || 
        !shippingAddress.addressLine1 || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.pincode) {
      toast.error('Please fill in all required fields');
      return false;
    }

    if (!/^\d{10}$/.test(shippingAddress.phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }

    if (!/^\d{6}$/.test(shippingAddress.pincode)) {
      toast.error('Please enter a valid 6-digit pincode');
      return false;
    }

    return true;
  };

  const calculateEmiAmount = (totalAmount, months) => {
    const interestRate = 0; // No interest for now
    return Math.ceil((totalAmount * (1 + interestRate / 100)) / months);
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    setProcessing(true);
    try {
      const { data } = await api.post('/orders/checkout', {
        paymentMethod,
        shippingAddress,
        paymentPlan,
        emiMonths: paymentPlan.startsWith('emi') ? emiMonths : undefined
      });

      toast.success('Order placed successfully!');
      
      // If online payment, redirect to payment page
      if (paymentMethod !== 'cod') {
        navigate(`/payment/${data.order._id}`);
      } else {
        navigate('/orders');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setProcessing(false);
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
        <h2 className="mb-1">Checkout</h2>
        <p className="text-muted mb-0">Complete your order</p>
      </div>

      <div className="row g-4">
        {/* Checkout Form */}
        <div className="col-lg-8">
          {/* Shipping Address */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="card-title mb-0">Shipping Address</h6>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full Name *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={shippingAddress.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone Number *</label>
                  <input 
                    type="tel"
                    className="form-control"
                    placeholder="10-digit mobile number"
                    value={shippingAddress.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Address Line 1 *</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="House No., Building Name"
                    value={shippingAddress.addressLine1}
                    onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Address Line 2</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="Road Name, Area, Colony"
                    value={shippingAddress.addressLine2}
                    onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">City *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={shippingAddress.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">State *</label>
                  <input 
                    type="text"
                    className="form-control"
                    value={shippingAddress.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Pincode *</label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="6-digit pincode"
                    value={shippingAddress.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="card mb-4">
            <div className="card-header">
              <h6 className="card-title mb-0">Payment Method</h6>
            </div>
            <div className="card-body">
              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="radio" 
                  name="paymentMethod" 
                  id="cod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <label className="form-check-label" htmlFor="cod">
                  <strong>Cash on Delivery (COD)</strong>
                  <p className="text-muted small mb-0">Pay when you receive the item</p>
                </label>
              </div>
              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="radio" 
                  name="paymentMethod" 
                  id="upi"
                  value="upi"
                  checked={paymentMethod === 'upi'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <label className="form-check-label" htmlFor="upi">
                  <strong>UPI</strong>
                  <p className="text-muted small mb-0">Pay using Google Pay, PhonePe, Paytm, etc.</p>
                </label>
              </div>
            </div>
          </div>

          {/* Payment Plan */}
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">Payment Plan</h6>
            </div>
            <div className="card-body">
              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="radio" 
                  name="paymentPlan" 
                  id="planFull"
                  value="full"
                  checked={paymentPlan === 'full'}
                  onChange={(e) => setPaymentPlan(e.target.value)}
                />
                <label className="form-check-label" htmlFor="planFull">
                  <strong>Full Payment</strong>
                  <p className="text-muted small mb-0">Pay {formatCurrency(cart?.totalAmount || 0)} now, income deducted immediately</p>
                </label>
              </div>

              <div className="form-check mb-3">
                <input 
                  className="form-check-input" 
                  type="radio" 
                  name="paymentPlan" 
                  id="planEmi"
                  value="emi"
                  checked={paymentPlan === 'emi'}
                  onChange={(e) => setPaymentPlan(e.target.value)}
                />
                <label className="form-check-label" htmlFor="planEmi">
                  <strong>EMI (Easy Installments)</strong>
                  <p className="text-muted small mb-0">
                    {paymentPlan === 'emi' ? (
                      <>
                        Pay {formatCurrency(calculateEmiAmount(cart?.totalAmount || 0, emiMonths))}/month for {emiMonths} months
                        <br/>
                        <small>Income deducted monthly with each payment</small>
                      </>
                    ) : (
                      'Split into monthly installments'
                    )}
                  </p>
                </label>
              </div>

              {paymentPlan === 'emi' && (
                <div className="ms-4 mb-3">
                  <label className="form-label small">EMI Duration</label>
                  <select 
                    className="form-select form-select-sm"
                    value={emiMonths}
                    onChange={(e) => setEmiMonths(parseInt(e.target.value))}
                  >
                    <option value={3}>3 Months - {formatCurrency(calculateEmiAmount(cart?.totalAmount || 0, 3))}/month</option>
                    <option value={6}>6 Months - {formatCurrency(calculateEmiAmount(cart?.totalAmount || 0, 6))}/month</option>
                    <option value={12}>12 Months - {formatCurrency(calculateEmiAmount(cart?.totalAmount || 0, 12))}/month</option>
                  </select>
                </div>
              )}

              <div className="form-check">
                <input 
                  className="form-check-input" 
                  type="radio" 
                  name="paymentPlan" 
                  id="planBnpl"
                  value="bnpl"
                  checked={paymentPlan === 'bnpl'}
                  onChange={(e) => setPaymentPlan(e.target.value)}
                />
                <label className="form-check-label" htmlFor="planBnpl">
                  <strong>BNPL (Buy Now, Pay Later)</strong>
                  <p className="text-muted small mb-0">Get item now, pay {formatCurrency(cart?.totalAmount || 0)} within 14 days after delivery</p>
                  <small className="text-success">Income deducted only after delivery confirmation</small>
                </label>
              </div>
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
              {/* Items */}
              <div className="mb-3">
                <h6 className="mb-2">Items ({cart?.totalItems || 0})</h6>
                {cart?.items.map((item) => (
                  <div key={item._id} className="d-flex gap-2 mb-2">
                    <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                      {item.marketplaceItemId?.images?.[0] && (
                        <img 
                          src={getFileUrl(item.marketplaceItemId.images[0].url || item.marketplaceItemId.images[0])}
                          alt={item.marketplaceItemId.title}
                          className="w-100 h-100 rounded"
                          style={{ objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <div className="flex-grow-1">
                      <p className="mb-0 small">{item.marketplaceItemId?.title}</p>
                      <small className="text-muted">Qty: {item.quantity}</small>
                    </div>
                    <div className="text-end">
                      <small>{formatCurrency(item.price * item.quantity)}</small>
                    </div>
                  </div>
                ))}
              </div>

              <hr />

              {/* Pricing */}
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal</span>
                <span>{formatCurrency(cart?.totalAmount || 0)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping</span>
                <span className="text-success">FREE</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <span className="fw-bold">Total</span>
                <span className="fw-bold text-primary fs-5">
                  {formatCurrency(cart?.totalAmount || 0)}
                </span>
              </div>

              {/* Place Order Button */}
              <button 
                className="btn btn-success w-100 mb-2"
                onClick={handlePlaceOrder}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                      <path d="M9 11l3 3L22 4"/>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                    Place Order
                  </>
                )}
              </button>
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => navigate('/cart')}
                disabled={processing}
              >
                Back to Cart
              </button>

              {/* Payment Info */}
              <div className="mt-3">
                <div className="card bg-light">
                  <div className="card-body p-2">
                    <small className="fw-bold">Payment Details:</small>
                    {paymentPlan === 'full' && (
                      <div className="small mt-2">
                        <p className="mb-1">📋 <strong>Full Payment</strong></p>
                        <p className="mb-0 text-muted">Pay {formatCurrency(cart?.totalAmount || 0)} now. Income deducted immediately.</p>
                      </div>
                    )}
                    {paymentPlan === 'emi' && (
                      <div className="small mt-2">
                        <p className="mb-1">📋 <strong>EMI - {emiMonths} Months</strong></p>
                        <p className="mb-0 text-muted">Monthly payment: {formatCurrency(calculateEmiAmount(cart?.totalAmount || 0, emiMonths))}</p>
                        <p className="mb-0 text-muted">Income deducted with each monthly payment.</p>
                      </div>
                    )}
                    {paymentPlan === 'bnpl' && (
                      <div className="small mt-2">
                        <p className="mb-1">📋 <strong>Buy Now, Pay Later</strong></p>
                        <p className="mb-0 text-muted">Pay {formatCurrency(cart?.totalAmount || 0)} within 14 days after delivery</p>
                        <p className="mb-0 text-success">Income deducted after delivery confirmation.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {paymentMethod === 'cod' && (
                <div className="alert alert-info mt-3 mb-0">
                  <small>
                    <strong>Note:</strong> You will pay when the item is delivered to you.
                  </small>
                </div>
              )}
              {paymentMethod !== 'cod' && (
                <div className="alert alert-warning mt-3 mb-0">
                  <small>
                    <strong>Note:</strong> You will be redirected to the payment page after placing the order.
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}