import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import api from "@/utils/api.js";
import { 
  MdShoppingCart, 
  MdAccountBalanceWallet,
  MdFavorite,
  MdLocalShipping,
  MdTrendingUp,
  MdArrowForward,
  MdStore,
  MdCheckCircle
} from "react-icons/md";

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
    savedItems: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [financeData, setFinanceData] = useState({
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlySavings: 0,
    totalSavings: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats, orders, and finance data in parallel
      const [statsRes, ordersRes, financeRes] = await Promise.all([
        api.get('/orders/stats').catch(() => ({ data: {} })),
        api.get('/orders?limit=3').catch(() => ({ data: [] })),
        api.get('/finance/summary').catch(() => ({ data: {} }))
      ]);

      setStats(statsRes.data || {});
      setRecentOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setFinanceData(financeRes.data || {});
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
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
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5 dashboard-page buyer-dashboard">
      {/* Header - Matching Goal Setter Style */}
      <div className="dashboard-hero">
        <div className="welcome-content">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h1 className="title d-flex align-items-center gap-2">
                Welcome{user?.profile?.name ? `, ${user.profile.name}` : user?.name ? `, ${user.name}` : ", hey"}
                <div className="welcome-icon">
                  🛍️
                </div>
              </h1>
              <div className="subtitle">
                Discover quality electronics from goal setters nearby
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="row g-4 mb-5">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
            <div className="card-body text-center p-4">
              <div className="mb-3">
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}>
                  <MdAccountBalanceWallet size={32} color="white" />
                </div>
              </div>
              <h3 className="mb-2" style={{ fontWeight: '700', color: '#10b981' }}>
                {formatCurrency(financeData.monthlySavings)}
              </h3>
              <p className="text-muted mb-0">Available Budget</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
            <div className="card-body text-center p-4">
              <div className="mb-3">
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #4d5fd9 0%, #6d7ee6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}>
                  <MdShoppingCart size={32} color="white" />
                </div>
              </div>
              <h3 className="mb-2" style={{ fontWeight: '700', color: '#4d5fd9' }}>
                {stats.totalOrders || 0}
              </h3>
              <p className="text-muted mb-0">Total Orders</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
            <div className="card-body text-center p-4">
              <div className="mb-3">
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}>
                  <MdLocalShipping size={32} color="white" />
                </div>
              </div>
              <h3 className="mb-2" style={{ fontWeight: '700', color: '#f59e0b' }}>
                {stats.pendingOrders || 0}
              </h3>
              <p className="text-muted mb-0">Pending Orders</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '16px' }}>
            <div className="card-body text-center p-4">
              <div className="mb-3">
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}>
                  <MdFavorite size={32} color="white" />
                </div>
              </div>
              <h3 className="mb-2" style={{ fontWeight: '700', color: '#ef4444' }}>
                {stats.savedItems || 0}
              </h3>
              <p className="text-muted mb-0">Wishlist Items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="mb-0" style={{ fontWeight: '700' }}>Recent Orders</h4>
            <button 
              className="btn btn-outline-primary"
              onClick={() => navigate('/dashboard/orders')}
              style={{ borderRadius: '10px' }}
            >
              View All <MdArrowForward className="ms-1" />
            </button>
          </div>

          <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
            <div className="card-body p-0">
              {recentOrders.map((order, index) => (
                <div 
                  key={order._id}
                  className={`p-4 ${index !== recentOrders.length - 1 ? 'border-bottom' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/dashboard/order/${order._id}`)}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1" style={{ fontWeight: '600' }}>
                        Order #{order.orderId}
                      </h6>
                      <p className="text-muted mb-0 small">
                        {order.items?.length || 0} item(s) • {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                    <span className={`badge ${
                      order.status === 'delivered' ? 'bg-success' :
                      order.status === 'pending' ? 'bg-warning' :
                      order.status === 'cancelled' ? 'bg-danger' :
                      'bg-info'
                    }`} style={{ borderRadius: '8px', padding: '6px 12px' }}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spending Overview */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4d5fd9 0%, #6d7ee6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MdTrendingUp size={24} color="white" />
            </div>
            <div>
              <h5 className="mb-0" style={{ fontWeight: '700' }}>Spending Overview</h5>
              <p className="text-muted mb-0 small">This month's financial summary</p>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-md-4">
              <div className="text-center p-3" style={{ 
                background: '#f8f9ff',
                borderRadius: '12px'
              }}>
                <p className="text-muted mb-2 small">Total Spent</p>
                <h4 className="mb-0" style={{ fontWeight: '700', color: '#4d5fd9' }}>
                  {formatCurrency(stats.totalSpent)}
                </h4>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center p-3" style={{ 
                background: '#f0fdf4',
                borderRadius: '12px'
              }}>
                <p className="text-muted mb-2 small">Monthly Income</p>
                <h4 className="mb-0" style={{ fontWeight: '700', color: '#10b981' }}>
                  {formatCurrency(financeData.monthlyIncome)}
                </h4>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center p-3" style={{ 
                background: '#fef3c7',
                borderRadius: '12px'
              }}>
                <p className="text-muted mb-2 small">Savings</p>
                <h4 className="mb-0" style={{ fontWeight: '700', color: '#f59e0b' }}>
                  {formatCurrency(financeData.totalSavings)}
                </h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
