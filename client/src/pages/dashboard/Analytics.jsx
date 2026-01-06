import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from "recharts";

const COLORS = ["#0d6efd", "#198754", "#ffc107", "#dc3545", "#6c757d", "#0dcaf0"];

export default function Analytics() {
  const authContext = useAuth();
  const user = authContext?.user;

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.profile?.role !== "goal_setter") {
    return <Navigate to="/dashboard-redirect" replace />;
  }

  const [analytics, setAnalytics] = useState({
    financialHealth: { score: 0, status: 'Unknown', insights: [], recommendations: [], metrics: { monthlyIncome: 0, monthlyExpense: 0, monthlySavings: 0, totalIncome: 0, totalExpenses: 0, totalSavings: 0, savingsRate: 0, marketplaceIncome: 0, itemsSold: 0, activeListings: 0, activeGoals: 0, incomeSources: 0, expenseCategories: 0 } },
    goalProgress: { goals: [], averageProgress: 0, estimatedCompletion: {}, insights: [], summary: { monthlySavings: 0, avgMonthlyContributionPerGoal: 0, monthlyMarketplaceEarnings: 0 } },
    spendingPatterns: { categories: [], trends: [], insights: [], incomeSources: [], summary: { totalRevenue: 0, totalExpenses: 0, totalMarketplaceEarnings: 0, savingsRate: 0, totalItemsSold: 0 } },
    marketplace: { listings: [], sales: [], earnings: 0, insights: [], topCategories: [] },
    wishlist: { items: [], totalValue: 0, insights: [], categories: [] },
    connections: { total: 0, pending: 0, accepted: 0, rejected: 0, insights: [] }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
    
    // Auto-refresh analytics every 30 seconds to catch new data
    const interval = setInterval(() => {
      fetchAnalyticsData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Starting to fetch analytics data...');
      
      const [financialHealthResponse, goalProgressResponse, spendingResponse, connectionsResponse, goalsResponse, financesResponse, marketplaceListingsResponse] = await Promise.allSettled([
        api.get("/analytics/financial-health"),
        api.get("/analytics/goal-progress"),
        api.get("/analytics/spending-patterns"),
        api.get("/connections/stats"),
        api.get("/goals"),
        api.get("/finance/summary"),
        api.get("/marketplace/my-listings")
      ]);

      console.log('📦 API Responses:', {
        financialHealth: financialHealthResponse.status,
        goalProgress: goalProgressResponse.status,
        spending: spendingResponse.status,
        connections: connectionsResponse.status,
        goals: goalsResponse.status,
        finances: financesResponse.status,
        marketplace: marketplaceListingsResponse.status
      });

      if (financialHealthResponse.status === 'fulfilled') {
        setAnalytics(prev => ({ ...prev, financialHealth: { ...prev.financialHealth, ...financialHealthResponse.value.data, metrics: { ...prev.financialHealth.metrics, ...financialHealthResponse.value.data.metrics } } }));
      }

      if (goalProgressResponse.status === 'fulfilled') {
        setAnalytics(prev => ({ ...prev, goalProgress: { ...prev.goalProgress, ...goalProgressResponse.value.data, summary: { ...prev.goalProgress.summary, ...goalProgressResponse.value.data.summary } } }));
      }

      if (spendingResponse.status === 'fulfilled') {
        setAnalytics(prev => ({ ...prev, spendingPatterns: { ...prev.spendingPatterns, ...spendingResponse.value.data, summary: { ...prev.spendingPatterns.summary, ...spendingResponse.value.data.summary } } }));
      }

      if (connectionsResponse.status === 'fulfilled') {
        setAnalytics(prev => ({ ...prev, connections: { ...prev.connections, ...connectionsResponse.value.data.stats } }));
      }

      await calculateAnalyticsFromRawData(goalsResponse, financesResponse, marketplaceListingsResponse);
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalyticsFromRawData = async (goalsResponse, financesResponse, marketplaceResponse) => {
    try {
      let goals = [];
      let marketplaceListings = [];

      if (goalsResponse.status === 'fulfilled') {
        goals = goalsResponse.value.data || [];
      }

      if (marketplaceResponse.status === 'fulfilled') {
        marketplaceListings = marketplaceResponse.value.data || [];
      }

      const [incomeResponse, expenseResponse] = await Promise.allSettled([
        api.get("/finance/income"),
        api.get("/finance/expenses")
      ]);

      console.log('💵 Finance API Responses:', {
        income: incomeResponse.status,
        expense: expenseResponse.status,
        incomeData: incomeResponse.status === 'fulfilled' ? incomeResponse.value.data?.length : 'failed',
        expenseData: expenseResponse.status === 'fulfilled' ? expenseResponse.value.data?.length : 'failed'
      });

      let incomeEntries = [];
      let expenseEntries = [];

      if (incomeResponse.status === 'fulfilled') {
        incomeEntries = incomeResponse.value.data || [];
        console.log('✅ Income entries loaded:', incomeEntries.length, 'entries');
      } else {
        console.error('❌ Income fetch failed:', incomeResponse.reason);
      }

      if (expenseResponse.status === 'fulfilled') {
        expenseEntries = expenseResponse.value.data || [];
        console.log('✅ Expense entries loaded:', expenseEntries.length, 'entries');
      } else {
        console.error('❌ Expense fetch failed:', expenseResponse.reason);
      }

      console.log('📊 Analytics Data Fetched:', {
        incomeCount: incomeEntries.length,
        expenseCount: expenseEntries.length,
        totalIncomeAmount: incomeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0),
        totalExpenseAmount: expenseEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0),
        sampleIncome: incomeEntries[0],
        sampleExpense: expenseEntries[0]
      });

      const financialAnalysis = calculateComprehensiveFinancialAnalysis(incomeEntries, expenseEntries, marketplaceListings, goals);
      const healthScore = calculateFinancialHealthScore(financialAnalysis);
      const insights = generateDetailedFinancialInsights(financialAnalysis, healthScore);

      setAnalytics(prev => ({
        ...prev,
        financialHealth: { ...prev.financialHealth, score: healthScore.score, status: healthScore.status, insights: insights.financial, recommendations: insights.recommendations, metrics: financialAnalysis.metrics },
        goalProgress: { ...prev.goalProgress, goals: financialAnalysis.goals.map(goal => {
          const progress = goal.currentAmount && goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : (goal.progress || 0);
          return { ...goal, progress, estimatedCompletion: calculateEstimatedCompletion(goal, financialAnalysis.metrics.monthlySavings) };
        }), averageProgress: financialAnalysis.goalProgress.average, insights: insights.goals, summary: { monthlySavings: financialAnalysis.metrics.monthlySavings, avgMonthlyContributionPerGoal: financialAnalysis.goalProgress.avgContribution, monthlyMarketplaceEarnings: financialAnalysis.metrics.marketplaceIncome } },
        marketplace: { ...prev.marketplace, listings: marketplaceListings, sales: marketplaceListings.filter(listing => listing.status === 'sold'), earnings: financialAnalysis.metrics.marketplaceIncome, insights: insights.marketplace, topCategories: getTopCategories(marketplaceListings) }
      }));
    } catch (error) {
      console.error("Failed to calculate analytics from raw data:", error);
    }
  };

  const calculateComprehensiveFinancialAnalysis = (incomeEntries, expenseEntries, marketplaceListings, goals) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const totalIncome = incomeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const monthlyIncome = incomeEntries.filter(entry => { const entryDate = new Date(entry.date); return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear; }).reduce((sum, entry) => sum + (entry.amount || 0), 0);

    const totalExpenses = expenseEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const monthlyExpenses = expenseEntries.filter(entry => { const entryDate = new Date(entry.date); return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear; }).reduce((sum, entry) => sum + (entry.amount || 0), 0);

    const marketplaceIncome = marketplaceListings.filter(listing => listing.status === 'sold').reduce((sum, listing) => sum + (listing.price || 0), 0);
    const monthlyMarketplaceIncome = marketplaceListings.filter(listing => { if (listing.status !== 'sold' || !listing.soldAt) return false; const soldDate = new Date(listing.soldAt); return soldDate.getMonth() === currentMonth && soldDate.getFullYear() === currentYear; }).reduce((sum, listing) => sum + (listing.price || 0), 0);

    const totalSavings = Math.max(0, totalIncome - totalExpenses);
    const monthlySavings = Math.max(0, monthlyIncome - monthlyExpenses);
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    const incomeSources = [...new Set(incomeEntries.map(entry => entry.source))].length;
    const expenseCategories = [...new Set(expenseEntries.map(entry => entry.category))].length;

    const activeGoals = goals.filter(goal => goal.status === 'in_progress' || goal.status === 'planned');
    const averageProgress = activeGoals.length > 0 ? activeGoals.reduce((sum, goal) => {
      const progress = goal.currentAmount && goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : (goal.progress || 0);
      return sum + progress;
    }, 0) / activeGoals.length : 0;
    const avgContribution = activeGoals.length > 0 ? monthlySavings / activeGoals.length : 0;

    const expenseAnalysis = analyzeExpensePatterns(expenseEntries);
    const incomeAnalysis = analyzeIncomePatterns(incomeEntries);

    console.log('💰 Financial Analysis Calculated:', {
      totalIncome,
      monthlyIncome,
      totalExpenses,
      monthlyExpenses,
      monthlySavings,
      savingsRate: savingsRate.toFixed(2) + '%',
      currentMonth,
      currentYear,
      incomeEntriesCount: incomeEntries.length,
      expenseEntriesCount: expenseEntries.length
    });

    return {
      metrics: { monthlyIncome, monthlyExpense: monthlyExpenses, monthlySavings, totalIncome, totalExpenses, totalSavings, savingsRate: Math.round(savingsRate * 100) / 100, marketplaceIncome, monthlyMarketplaceIncome, itemsSold: marketplaceListings.filter(listing => listing.status === 'sold').length, activeListings: marketplaceListings.filter(listing => listing.status === 'active').length, activeGoals: activeGoals.length, incomeSources, expenseCategories, expenseAnalysis, incomeAnalysis },
      goals: activeGoals,
      goalProgress: { average: averageProgress, avgContribution }
    };
  };

  const calculateFinancialHealthScore = (financialAnalysis) => {
    const metrics = financialAnalysis.metrics;
    let score = 0;

    const savingsRateScore = Math.min(100, Math.max(0, metrics.savingsRate * 2));
    score += savingsRateScore * 0.4;

    const incomeStabilityScore = Math.min(100, Math.max(0, (metrics.incomeSources * 20) + (metrics.monthlyIncome > 0 ? 20 : 0)));
    score += incomeStabilityScore * 0.2;

    const expenseManagementScore = Math.min(100, Math.max(0, 100 - (metrics.expenseCategories * 5) + (metrics.monthlyExpense < metrics.monthlyIncome ? 30 : 0)));
    score += expenseManagementScore * 0.15;

    const goalProgressScore = Math.min(100, Math.max(0, financialAnalysis.goalProgress.average * 1.5));
    score += goalProgressScore * 0.15;

    const marketplaceActivityScore = Math.min(100, Math.max(0, (metrics.itemsSold || 0) * 10 + (metrics.activeListings || 0) * 5));
    score += marketplaceActivityScore * 0.1;

    const roundedScore = Math.round(score);
    let status = roundedScore >= 80 ? 'Excellent' : roundedScore >= 60 ? 'Good' : roundedScore >= 40 ? 'Fair' : 'Needs Improvement';

    return { score: roundedScore, status };
  };

  const generateDetailedFinancialInsights = (financialAnalysis, healthScore) => {
    const metrics = financialAnalysis.metrics;
    const financial = [];
    const goals = [];
    const marketplace = [];
    const recommendations = [];

    if (metrics.savingsRate >= 30) {
      financial.push(`Excellent savings rate of ${metrics.savingsRate}%! You're on track to build wealth.`);
    } else if (metrics.savingsRate >= 15) {
      financial.push(`Good savings rate of ${metrics.savingsRate}%. Consider increasing it further.`);
    } else {
      financial.push(`Low savings rate of ${metrics.savingsRate}%. Try to reduce expenses or increase income.`);
    }

    if (metrics.incomeSources >= 3) {
      financial.push(`Strong income diversity with ${metrics.incomeSources} sources.`);
    } else {
      financial.push(`Consider developing additional income sources for stability.`);
      recommendations.push("Build 2-3 income streams to increase financial stability");
    }

    if (metrics.monthlyExpense < metrics.monthlyIncome) {
      financial.push("Your monthly expenses are within budget.");
    } else {
      financial.push("Monthly expenses exceed income. Review and optimize spending.");
      recommendations.push("Track and reduce discretionary spending");
    }

    if (financialAnalysis.goals.length > 0) {
      goals.push(`You have ${financialAnalysis.goals.length} active goals with an average progress of ${Math.round(financialAnalysis.goalProgress.average)}%.`);
    }

    if (metrics.itemsSold > 0) {
      marketplace.push(`Great marketplace activity! You've sold ${metrics.itemsSold} items.`);
    }

    return { financial, goals, marketplace, recommendations };
  };

  const calculateEstimatedCompletion = (goal, monthlySavings) => {
    if (!monthlySavings || monthlySavings <= 0) return "Not calculable";
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    const monthsNeeded = Math.ceil(remaining / monthlySavings);
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsNeeded);
    return completionDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const analyzeExpensePatterns = (expenseEntries) => {
    const byCategory = {};
    expenseEntries.forEach(entry => {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + (entry.amount || 0);
    });
    return Object.entries(byCategory).map(([name, value]) => ({ name, value, percentage: 0 })).sort((a, b) => b.value - a.value);
  };

  const analyzeIncomePatterns = (incomeEntries) => {
    const bySource = {};
    incomeEntries.forEach(entry => {
      bySource[entry.source] = (bySource[entry.source] || 0) + (entry.amount || 0);
    });
    return Object.entries(bySource).map(([name, value]) => ({ name, value, percentage: 0 })).sort((a, b) => b.value - a.value);
  };

  const getTopCategories = (listings) => {
    const categories = {};
    listings.forEach(listing => {
      categories[listing.category] = (categories[listing.category] || 0) + 1;
    });
    return Object.entries(categories).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-primary";
    if (score >= 40) return "text-warning";
    return "text-danger";
  };

  // Generate upward trending data for each goal - always goes to 100%
  const generateGoalTrendData = (goal) => {
    const currentProgress = goal.currentAmount && goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : (goal.progress || 0);
    const steps = 10;
    const data = [];
    for (let i = 0; i <= steps; i++) {
      const percentage = (i / steps) * 100;
      data.push({
        step: i,
        label: `${Math.round(percentage)}%`,
        progress: percentage,
        currentProgress: currentProgress,
        isCurrent: Math.abs(percentage - currentProgress) < 5
      });
    }
    return data;
  };

  if (loading) {
    return <div className="container mt-5"><div className="text-center"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div></div>;
  }

  const expenseChartData = analytics.financialHealth.metrics?.expenseAnalysis?.map(item => ({ name: item.name, value: item.value })) || [];
  const incomeChartData = analytics.financialHealth.metrics?.incomeAnalysis?.map(item => ({ name: item.name, value: item.value })) || [];
  const goalChartData = analytics.goalProgress.goals.map(goal => {
    const progress = goal.currentAmount && goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : (goal.progress || 0);
    return { name: goal.title?.substring(0, 12), progress, target: goal.targetAmount || 0, current: goal.currentAmount || 0 };
  }) || [];

  return (
    <div className="container-fluid my-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">📊 Financial Analytics</h2>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary"
            onClick={() => {
              setLoading(true);
              fetchAnalyticsData();
            }}
            disabled={loading}
          >
            🔄 Refresh Data
          </button>
          <button 
          className="btn btn-primary"
          onClick={async () => {
            try {
              const response = await api.get('/analytics/generate-monthly-report', { responseType: 'blob' });
              const blob = new Blob([response.data], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `SmartGoal_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`;
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
                  <p className="text-muted mb-2" style={{ fontSize: "12px" }}>Total Income (All Time)</p>
                  <h4 className="mb-0">₹{analytics.financialHealth.metrics?.totalIncome?.toLocaleString() || 0}</h4>
                </div>
                <span style={{ fontSize: "24px" }}>📈</span>
              </div>
              <div className="progress" style={{ height: "6px" }}>
                <div className="progress-bar bg-success" style={{ width: "100%" }}></div>
              </div>
              <small className="text-muted">Monthly: ₹{analytics.financialHealth.metrics?.monthlyIncome?.toLocaleString() || 0}</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <p className="text-muted mb-2" style={{ fontSize: "12px" }}>Total Expenses (All Time)</p>
                  <h4 className="mb-0">₹{analytics.financialHealth.metrics?.totalExpenses?.toLocaleString() || 0}</h4>
                </div>
                <span style={{ fontSize: "24px" }}>💸</span>
              </div>
              <div className="progress" style={{ height: "6px" }}>
                <div className="progress-bar bg-warning" style={{ width: `${Math.min((analytics.financialHealth.metrics?.totalExpenses / (analytics.financialHealth.metrics?.totalIncome || 1)) * 100, 100)}%` }}></div>
              </div>
              <small className="text-muted">{Math.min(((analytics.financialHealth.metrics?.totalExpenses / (analytics.financialHealth.metrics?.totalIncome || 1)) * 100).toFixed(1), 100)}% of Income</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <p className="text-muted mb-2" style={{ fontSize: "12px" }}>Total Savings (All Time)</p>
                  <h4 className="mb-0 text-success">₹{analytics.financialHealth.metrics?.totalSavings?.toLocaleString() || 0}</h4>
                </div>
                <span style={{ fontSize: "24px" }}>💰</span>
              </div>
              <div className="progress" style={{ height: "6px" }}>
                <div className="progress-bar bg-success" style={{ width: `${Math.min((analytics.financialHealth.metrics?.totalSavings / (analytics.financialHealth.metrics?.totalIncome || 1)) * 100, 100)}%` }}></div>
              </div>
              <small className="text-muted">{Math.min(((analytics.financialHealth.metrics?.totalSavings / (analytics.financialHealth.metrics?.totalIncome || 1)) * 100).toFixed(1), 100)}% of Income</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <p className="text-muted mb-2" style={{ fontSize: "12px" }}>Savings Rate</p>
                  <h4 className="mb-0 text-primary">{Math.min(analytics.financialHealth.metrics?.savingsRate || 0, 100)}%</h4>
                </div>
                <span style={{ fontSize: "24px" }}>🎯</span>
              </div>
              <div className="progress" style={{ height: "6px" }}>
                <div className="progress-bar bg-primary" style={{ width: `${Math.min(analytics.financialHealth.metrics?.savingsRate || 0, 100)}%` }}></div>
              </div>
              <small className="text-muted">Target: 100%</small>
            </div>
          </div>
        </div>
      </div>

      {/* Health Score & Overview */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <div className={`display-5 fw-bold ${getHealthScoreColor(Math.min(analytics.financialHealth.score, 100))}`}>
                {Math.min(analytics.financialHealth.score, 100)}%
              </div>
              <p className="text-muted mb-2">Financial Health Score</p>
              <span className={`badge ${Math.min(analytics.financialHealth.score, 100) >= 80 ? 'bg-success' : Math.min(analytics.financialHealth.score, 100) >= 60 ? 'bg-primary' : Math.min(analytics.financialHealth.score, 100) >= 40 ? 'bg-warning' : 'bg-danger'}`}>
                {analytics.financialHealth.status}
              </span>
              <div className="progress mt-3" style={{ height: "8px" }}>
                <div className={`progress-bar ${getHealthScoreColor(Math.min(analytics.financialHealth.score, 100)).replace('text-', 'bg-')}`} style={{ width: `${Math.min(analytics.financialHealth.score, 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="h2">🎯</div>
              <p className="text-muted mb-2">Average Goal Progress</p>
              <div className="display-6 fw-bold text-primary">{Math.min(Math.round(analytics.goalProgress.averageProgress), 100)}%</div>
              <div className="progress mt-3" style={{ height: "8px" }}>
                <div className="progress-bar bg-primary" style={{ width: `${Math.min(analytics.goalProgress.averageProgress, 100)}%` }}></div>
              </div>
              <small className="text-muted mt-2 d-block">Target: 100%</small>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="h2">🛍️</div>
              <p className="text-muted mb-2">Marketplace</p>
              <div className="display-6 fw-bold text-success">{analytics.marketplace.sales?.length || 0}</div>
              <p className="small text-muted mt-2">Items Sold</p>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <div className="h2">💹</div>
              <p className="text-muted mb-2">Marketplace Earnings</p>
              <div className="display-6 fw-bold text-success">₹{analytics.marketplace.earnings?.toLocaleString() || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="row g-3 mb-4">
        {/* Expense Categories Pie */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0">💷 Spending by Category</h6>
            </div>
            <div className="card-body">
              {expenseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={expenseChartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {expenseChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value?.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted py-5">No expense data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Income Sources Pie */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0">💵 Income by Source</h6>
            </div>
            <div className="card-body">
              {incomeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={incomeChartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#82ca9d" dataKey="value">
                      {incomeChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value?.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted py-5">No income data available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Goals Progress - Individual Line Charts */}
      <div className="row g-3 mb-4">
        <div className="col-12">
          <h5 className="mb-3">🎯 Goals Progress</h5>
        </div>
        {analytics.goalProgress.goals.length > 0 ? (
          analytics.goalProgress.goals.map((goal, index) => {
            const progress = goal.currentAmount && goal.targetAmount ? (goal.currentAmount / goal.targetAmount) * 100 : (goal.progress || 0);
            const trendData = generateGoalTrendData(goal);
            const goalColor = COLORS[index % COLORS.length];
            
            return (
              <div key={goal._id || index} className="col-md-6 col-lg-4">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-bottom">
                    <h6 className="mb-1">{goal.title}</h6>
                    <small className="text-muted">
                      ₹{goal.currentAmount?.toLocaleString() || 0} / ₹{goal.targetAmount?.toLocaleString() || 0}
                    </small>
                  </div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" label={{ value: 'Journey to 100%', position: 'insideBottom', offset: -5 }} />
                        <YAxis domain={[0, 100]} label={{ value: 'Progress %', angle: -90, position: 'insideLeft' }} />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'progress') return `${value.toFixed(1)}% Journey`;
                            return `${value.toFixed(1)}%`;
                          }}
                          labelFormatter={(label) => `Step: ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="progress" 
                          stroke={goalColor} 
                          strokeWidth={3}
                          dot={{ fill: goalColor, r: 4 }}
                          activeDot={{ r: 7 }}
                          name="Journey to 100%"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-3">
                      <div className="progress" style={{ height: "10px", marginBottom: "8px" }}>
                        <div 
                          className="progress-bar" 
                          role="progressbar" 
                          style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: goalColor }}
                          aria-valuenow={progress} 
                          aria-valuemin="0" 
                          aria-valuemax="100"
                        ></div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted"><strong>Current:</strong> {progress.toFixed(1)}%</small>
                        <small className="text-muted"><strong>Target:</strong> 100%</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-12">
            <div className="alert alert-info text-center py-5 mb-0">
              <p className="mb-0">No active goals to display. Create a goal to start tracking your progress!</p>
            </div>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0">💡 Financial Insights</h6>
            </div>
            <div className="card-body">
              <ul className="list-unstyled">
                {analytics.financialHealth.insights.slice(0, 3).map((insight, idx) => (
                  <li key={idx} className="mb-2 pb-2 border-bottom small">
                    <span className="text-primary">→</span> {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0">🎯 Goal Insights</h6>
            </div>
            <div className="card-body">
              <ul className="list-unstyled">
                {analytics.goalProgress.insights.slice(0, 3).map((insight, idx) => (
                  <li key={idx} className="mb-2 pb-2 border-bottom small">
                    <span className="text-success">→</span> {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h6 className="mb-0">💼 Marketplace Insights</h6>
            </div>
            <div className="card-body">
              <ul className="list-unstyled">
                {analytics.marketplace.insights.slice(0, 3).map((insight, idx) => (
                  <li key={idx} className="mb-2 pb-2 border-bottom small">
                    <span className="text-warning">→</span> {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {analytics.financialHealth.recommendations.length > 0 && (
        <div className="row g-3 mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm border-start border-3 border-info">
              <div className="card-header bg-white border-0">
                <h6 className="mb-0">✨ Recommendations</h6>
              </div>
              <div className="card-body">
                <ul className="list-unstyled mb-0">
                  {analytics.financialHealth.recommendations.map((rec, idx) => (
                    <li key={idx} className="mb-2">
                      <span className="badge bg-info me-2">{idx + 1}</span> {typeof rec === 'string' ? rec : rec.title || rec.description || 'Recommendation'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
