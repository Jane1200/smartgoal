import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import {
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from "recharts";

const COLORS = ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#6c757d", "#0dcaf0", "#6610f2", "#d63384"];

export default function BuyerAnalytics() {
  const authContext = useAuth();
  const user = authContext?.user;

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.profile?.role !== "buyer") {
    return <Navigate to="/dashboard-redirect" replace />;
  }

  const [analytics, setAnalytics] = useState({
    overview: {
      totalSpent: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      monthlySpending: 0,
      availableSavings: 0
    },
    categoryBreakdown: [],
    monthlyTrends: [],
    topPurchases: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuyerAnalytics();
    
    // Auto-refresh analytics every 30 seconds to catch new data
    const interval = setInterval(() => {
      fetchBuyerAnalytics();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchBuyerAnalytics = async () => {
    try {
      setLoading(true);
      
      const [ordersRes, financeRes, statsRes] = await Promise.allSettled([
        api.get("/orders"),
        api.get("/finance/summary"),
        api.get("/orders/stats")
      ]);

      let orders = [];
      let financeData = { monthlyIncome: 0, monthlyExpense: 0, monthlySavings: 0 };
      let stats = { totalOrders: 0, totalSpent: 0 };

      if (ordersRes.status === 'fulfilled') {
        orders = ordersRes.value.data || [];
      }

      if (financeRes.status === 'fulfilled') {
        financeData = financeRes.value.data;
      }

      if (statsRes.status === 'fulfilled') {
        stats = statsRes.value.data;
      }

      console.log('📊 Buyer Analytics Data Fetched:', {
        ordersCount: orders.length,
        totalSpent: stats.totalSpent,
        totalOrders: stats.totalOrders,
        financeData
      });

      // Calculate analytics from orders
      const categoryBreakdown = calculateCategoryBreakdown(orders);
      const monthlyTrends = calculateMonthlyTrends(orders);
      const topPurchases = getTopPurchases(orders);

      const avgOrderValue = orders.length > 0 ? stats.totalSpent / orders.length : 0;
      const currentMonth = new Date().getMonth();
      const monthlySpending = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        return orderDate.getMonth() === currentMonth;
      }).reduce((sum, o) => sum + (o.totalAmount || 0), 0);

      setAnalytics({
        overview: {
          totalSpent: stats.totalSpent || 0,
          totalOrders: stats.totalOrders || 0,
          avgOrderValue: Math.round(avgOrderValue),
          monthlySpending: monthlySpending,
          availableSavings: financeData.monthlySavings || 0
        },
        categoryBreakdown,
        monthlyTrends,
        topPurchases
      });

    } catch (error) {
      console.error("Failed to fetch buyer analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const calculateCategoryBreakdown = (orders) => {
    const categories = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        const category = item.category || 'Uncategorized';
        categories[category] = (categories[category] || 0) + (item.price || 0);
      });
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const calculateMonthlyTrends = (orders) => {
    const monthlyData = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months
    const currentDate = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      monthlyData[key] = { month: monthNames[date.getMonth()], spending: 0, orders: 0 };
    }

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const key = `${monthNames[orderDate.getMonth()]} ${orderDate.getFullYear()}`;
      if (monthlyData[key]) {
        monthlyData[key].spending += order.totalAmount || 0;
        monthlyData[key].orders += 1;
      }
    });

    return Object.values(monthlyData);
  };

  const getTopPurchases = (orders) => {
    const items = [];
    orders.forEach(order => {
      order.items?.forEach(item => {
        items.push({
          title: item.itemTitle || item.title || 'Item',
          price: item.price || 0,
          date: order.createdAt,
          status: order.status
        });
      });
    });
    return items.sort((a, b) => b.price - a.price).slice(0, 5);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Delivered': 'success',
      'Processing': 'info',
      'Confirmed': 'primary',
      'Pending': 'warning',
      'Cancelled': 'danger',
      'Shipped': 'info'
    };
    return statusColors[status] || 'secondary';
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid my-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">📊 Buyer Analytics & Spending Insights</h2>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={() => {
              setLoading(true);
              fetchBuyerAnalytics();
            }}
            disabled={loading}
          >
            🔄 Refresh Data
          </button>
          <button 
          className="btn btn-primary"
          onClick={async () => {
            try {
              const response = await api.get('/orders/generate-buyer-report', { responseType: 'blob' });
              const blob = new Blob([response.data], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `SmartGoal_Buyer_Report_${new Date().toISOString().split('T')[0]}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              toast.success('Report downloaded successfully!');
            } catch (error) {
              console.error('Failed to download report:', error);
              toast.error('Failed to download report');
            }
          }}
        >
          📄 Download Monthly Report
        </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <p className="text-muted mb-2" style={{ fontSize: "12px" }}>Total Spent</p>
                  <h4 className="mb-0 text-danger">₹{analytics.overview.totalSpent?.toLocaleString()}</h4>
                </div>
                <span style={{ fontSize: "24px" }}>💸</span>
              </div>
              <small className="text-muted">All-time purchases</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <p className="text-muted mb-2" style={{ fontSize: "12px" }}>Total Orders</p>
                  <h4 className="mb-0 text-primary">{analytics.overview.totalOrders}</h4>
                </div>
                <span style={{ fontSize: "24px" }}>📦</span>
              </div>
              <small className="text-muted">Successfully placed</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <p className="text-muted mb-2" style={{ fontSize: "12px" }}>Avg Order Value</p>
                  <h4 className="mb-0 text-info">₹{analytics.overview.avgOrderValue?.toLocaleString()}</h4>
                </div>
                <span style={{ fontSize: "24px" }}>📊</span>
              </div>
              <small className="text-muted">Per order average</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <p className="text-muted mb-2" style={{ fontSize: "12px" }}>This Month</p>
                  <h4 className="mb-0 text-warning">₹{analytics.overview.monthlySpending?.toLocaleString()}</h4>
                </div>
                <span style={{ fontSize: "24px" }}>📅</span>
              </div>
              <small className="text-muted">Current month spending</small>
            </div>
          </div>
        </div>
      </div>

      {/* Available Savings Card */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm border-success" style={{ borderWidth: '2px', borderStyle: 'solid' }}>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h5 className="mb-2">💰 Available Purchasing Power</h5>
                  <div className="d-flex align-items-end gap-3">
                    <div className="h2 mb-0 text-success">₹{analytics.overview.availableSavings?.toLocaleString()}</div>
                    <div className="text-muted mb-1">available for purchases</div>
                  </div>
                  <p className="text-muted small mb-0 mt-2">
                    This is your current savings that can be used for marketplace purchases.
                    <a href="/buyer-finances" className="ms-2 text-primary">Manage Finances →</a>
                  </p>
                </div>
                <div className="col-md-4 text-end">
                  <div className="h1 mb-0">💳</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Category Breakdown & Monthly Trends */}
      <div className="row g-3 mb-4">
        {/* Category Breakdown */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0">🛍️ Spending by Category</h6>
            </div>
            <div className="card-body">
              {analytics.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value?.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted py-5">No purchase data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Spending Trends */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0">📈 Monthly Spending Trends</h6>
            </div>
            <div className="card-body">
              {analytics.monthlyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${value?.toLocaleString()}`} />
                    <Area 
                      type="monotone" 
                      dataKey="spending" 
                      stroke="#dc3545" 
                      fill="#dc3545" 
                      fillOpacity={0.3}
                      name="Spending"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted py-5">No trend data available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Purchases Table */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0">🏆 Top 5 Purchases</h6>
            </div>
            <div className="card-body">
              {analytics.topPurchases.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Item</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topPurchases.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <span className="badge bg-warning">#{index + 1}</span>
                          </td>
                          <td>{item.title}</td>
                          <td className="fw-bold text-danger">₹{item.price?.toLocaleString()}</td>
                          <td>{new Date(item.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge bg-${getStatusColor(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-muted py-4">No purchases yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Insights & Recommendations */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm border-start border-3 border-info">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0">💡 Spending Insights</h6>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                {analytics.overview.totalOrders === 0 ? (
                  <li className="mb-2">
                    <span className="badge bg-info me-2">Tip</span> 
                    Start shopping to see your spending insights!
                  </li>
                ) : (
                  <>
                    <li className="mb-2">
                      <span className="badge bg-success me-2">✓</span> 
                      You've made {analytics.overview.totalOrders} purchase{analytics.overview.totalOrders > 1 ? 's' : ''} totaling ₹{analytics.overview.totalSpent?.toLocaleString()}
                    </li>
                    <li className="mb-2">
                      <span className="badge bg-info me-2">📊</span> 
                      Your average order value is ₹{analytics.overview.avgOrderValue?.toLocaleString()}
                    </li>
                    <li className="mb-2">
                      <span className="badge bg-warning me-2">📅</span> 
                      This month you've spent ₹{analytics.overview.monthlySpending?.toLocaleString()}
                    </li>
                    {analytics.overview.availableSavings > analytics.overview.monthlySpending && (
                      <li className="mb-2">
                        <span className="badge bg-success me-2">💰</span> 
                        Great! Your savings (₹{analytics.overview.availableSavings?.toLocaleString()}) exceed your monthly spending
                      </li>
                    )}
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm border-start border-3 border-success">
            <div className="card-header bg-white border-0">
              <h6 className="mb-0">✨ Recommendations</h6>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                {analytics.overview.monthlySpending > analytics.overview.availableSavings && (
                  <li className="mb-2">
                    <span className="badge bg-warning me-2">⚠️</span> 
                    Your spending exceeds savings. Consider adding more income or reducing purchases.
                  </li>
                )}
                {analytics.overview.totalOrders > 0 && analytics.categoryBreakdown.length > 0 && (
                  <li className="mb-2">
                    <span className="badge bg-info me-2">📊</span> 
                    Top spending category: {analytics.categoryBreakdown[0]?.name} (₹{analytics.categoryBreakdown[0]?.value?.toLocaleString()})
                  </li>
                )}
                <li className="mb-2">
                  <span className="badge bg-success me-2">💡</span> 
                  Track your finances regularly to maintain healthy spending habits
                </li>
                <li className="mb-2">
                  <span className="badge bg-primary me-2">🎯</span> 
                  Set purchase goals to better manage your budget
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

