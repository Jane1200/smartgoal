import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function Analytics() {
  const authContext = useAuth();
  const user = authContext?.user;

  // Redirect if not authenticated
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if not a goal setter
  if (user?.profile?.role !== "goal_setter") {
    return <Navigate to="/dashboard-redirect" replace />;
  }

  const [analytics, setAnalytics] = useState({
    financialHealth: {
      score: 0,
      status: 'Unknown',
      insights: [],
      recommendations: [],
      metrics: {
        monthlyIncome: 0,
        monthlyExpense: 0,
        monthlySavings: 0,
        totalIncome: 0,
        totalExpenses: 0,
        totalSavings: 0,
        savingsRate: 0,
        marketplaceIncome: 0,
        itemsSold: 0,
        activeListings: 0,
        activeGoals: 0,
        incomeSources: 0,
        expenseCategories: 0
      }
    },
    goalProgress: {
      goals: [],
      averageProgress: 0,
      estimatedCompletion: {},
      insights: [],
      summary: {
        monthlySavings: 0,
        avgMonthlyContributionPerGoal: 0,
        monthlyMarketplaceEarnings: 0
      }
    },
    spendingPatterns: {
      categories: [],
      trends: [],
      insights: [],
      incomeSources: [],
      summary: {
        totalRevenue: 0,
        totalExpenses: 0,
        totalMarketplaceEarnings: 0,
        savingsRate: 0,
        totalItemsSold: 0
      }
    },
    marketplace: {
      listings: [],
      sales: [],
      earnings: 0,
      insights: [],
      topCategories: []
    },
    wishlist: {
      items: [],
      totalValue: 0,
      insights: [],
      categories: []
    },
    connections: {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      insights: []
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch comprehensive analytics data from all modules
      const [
        financialHealthResponse, 
        goalProgressResponse, 
        spendingResponse,
        marketplaceResponse,
        wishlistResponse,
        connectionsResponse,
        goalsResponse,
        financesResponse,
        marketplaceListingsResponse
      ] = await Promise.allSettled([
        api.get("/analytics/financial-health"),
        api.get("/analytics/goal-progress"),
        api.get("/analytics/spending-patterns"),
        api.get("/analytics/marketplace"),
        api.get("/analytics/wishlist"),
        api.get("/connections/stats"),
        api.get("/goals"),
        api.get("/finance/summary"),
        api.get("/marketplace/my-listings")
      ]);

      // Process financial health data
      if (financialHealthResponse.status === 'fulfilled') {
        setAnalytics(prev => ({
          ...prev,
          financialHealth: {
            ...prev.financialHealth,
            ...financialHealthResponse.value.data,
            metrics: {
              ...prev.financialHealth.metrics,
              ...financialHealthResponse.value.data.metrics
            }
          }
        }));
      }

      // Process goal progress data
      if (goalProgressResponse.status === 'fulfilled') {
        setAnalytics(prev => ({
          ...prev,
          goalProgress: {
            ...prev.goalProgress,
            ...goalProgressResponse.value.data,
            summary: {
              ...prev.goalProgress.summary,
              ...goalProgressResponse.value.data.summary
            }
          }
        }));
      }

      // Process spending patterns data
      if (spendingResponse.status === 'fulfilled') {
        setAnalytics(prev => ({
          ...prev,
          spendingPatterns: {
            ...prev.spendingPatterns,
            ...spendingResponse.value.data,
            summary: {
              ...prev.spendingPatterns.summary,
              ...spendingResponse.value.data.summary
            }
          }
        }));
      }

      // Process marketplace data
      if (marketplaceResponse.status === 'fulfilled') {
        setAnalytics(prev => ({
          ...prev,
          marketplace: {
            ...prev.marketplace,
            ...marketplaceResponse.value.data
          }
        }));
      }

      // Process wishlist data
      if (wishlistResponse.status === 'fulfilled') {
        setAnalytics(prev => ({
          ...prev,
          wishlist: {
            ...prev.wishlist,
            ...wishlistResponse.value.data
          }
        }));
      }

      // Process connections data
      if (connectionsResponse.status === 'fulfilled') {
        setAnalytics(prev => ({
          ...prev,
          connections: {
            ...prev.connections,
            ...connectionsResponse.value.data.stats
          }
        }));
      }

      // Fallback: Calculate analytics from raw data if API endpoints don't exist
      await calculateAnalyticsFromRawData(goalsResponse, financesResponse, marketplaceListingsResponse);

    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics from raw data when API endpoints are not available
  const calculateAnalyticsFromRawData = async (goalsResponse, financesResponse, marketplaceResponse) => {
    try {
      let goals = [];
      let finances = {};
      let marketplaceListings = [];

      if (goalsResponse.status === 'fulfilled') {
        goals = goalsResponse.value.data || [];
      }

      if (financesResponse.status === 'fulfilled') {
        finances = financesResponse.value.data || {};
      }

      if (marketplaceResponse.status === 'fulfilled') {
        marketplaceListings = marketplaceResponse.value.data || [];
      }

      // Fetch detailed finance data for comprehensive analysis
      const [incomeResponse, expenseResponse] = await Promise.allSettled([
        api.get("/finance/income"),
        api.get("/finance/expenses")
      ]);

      let incomeEntries = [];
      let expenseEntries = [];

      if (incomeResponse.status === 'fulfilled') {
        incomeEntries = incomeResponse.value.data || [];
      }

      if (expenseResponse.status === 'fulfilled') {
        expenseEntries = expenseResponse.value.data || [];
      }

      // Calculate comprehensive financial metrics
      const financialAnalysis = calculateComprehensiveFinancialAnalysis(incomeEntries, expenseEntries, marketplaceListings, goals);
      
      // Calculate financial health score
      const healthScore = calculateFinancialHealthScore(financialAnalysis);
      
      // Generate detailed insights
      const insights = generateDetailedFinancialInsights(financialAnalysis, healthScore);

      // Update analytics with calculated data
      setAnalytics(prev => ({
        ...prev,
        financialHealth: {
          ...prev.financialHealth,
          score: healthScore.score,
          status: healthScore.status,
          insights: insights.financial,
          recommendations: insights.recommendations,
          metrics: financialAnalysis.metrics
        },
        goalProgress: {
          ...prev.goalProgress,
          goals: financialAnalysis.goals.map(goal => ({
            ...goal,
            progress: goal.progress || 0,
            estimatedCompletion: calculateEstimatedCompletion(goal, financialAnalysis.metrics.monthlySavings)
          })),
          averageProgress: financialAnalysis.goalProgress.average,
          insights: insights.goals,
          summary: {
            monthlySavings: financialAnalysis.metrics.monthlySavings,
            avgMonthlyContributionPerGoal: financialAnalysis.goalProgress.avgContribution,
            monthlyMarketplaceEarnings: financialAnalysis.metrics.marketplaceIncome
          }
        },
        marketplace: {
          ...prev.marketplace,
          listings: marketplaceListings,
          sales: marketplaceListings.filter(listing => listing.status === 'sold'),
          earnings: financialAnalysis.metrics.marketplaceIncome,
          insights: insights.marketplace,
          topCategories: getTopCategories(marketplaceListings)
        }
      }));

    } catch (error) {
      console.error("Failed to calculate analytics from raw data:", error);
    }
  };

  // Calculate comprehensive financial analysis
  const calculateComprehensiveFinancialAnalysis = (incomeEntries, expenseEntries, marketplaceListings, goals) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Calculate income metrics
    const totalIncome = incomeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const monthlyIncome = incomeEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      })
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    
    // Calculate expense metrics
    const totalExpenses = expenseEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const monthlyExpenses = expenseEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      })
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    
    // Calculate marketplace metrics
    const marketplaceIncome = marketplaceListings
      .filter(listing => listing.status === 'sold')
      .reduce((sum, listing) => sum + (listing.price || 0), 0);
    
    const monthlyMarketplaceIncome = marketplaceListings
      .filter(listing => {
        if (listing.status !== 'sold' || !listing.soldAt) return false;
        const soldDate = new Date(listing.soldAt);
        return soldDate.getMonth() === currentMonth && soldDate.getFullYear() === currentYear;
      })
      .reduce((sum, listing) => sum + (listing.price || 0), 0);
    
    // Calculate savings
    const totalSavings = Math.max(0, totalIncome - totalExpenses);
    const monthlySavings = Math.max(0, monthlyIncome - monthlyExpenses);
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
    
    // Calculate income diversity
    const incomeSources = [...new Set(incomeEntries.map(entry => entry.source))].length;
    const expenseCategories = [...new Set(expenseEntries.map(entry => entry.category))].length;
    
    // Calculate goal metrics
    const activeGoals = goals.filter(goal => goal.status === 'active' || goal.status === 'planned');
    const averageProgress = activeGoals.length > 0 
      ? activeGoals.reduce((sum, goal) => sum + (goal.progress || 0), 0) / activeGoals.length 
      : 0;
    
    const avgContribution = activeGoals.length > 0 ? monthlySavings / activeGoals.length : 0;
    
    // Calculate expense analysis
    const expenseAnalysis = analyzeExpensePatterns(expenseEntries);
    const incomeAnalysis = analyzeIncomePatterns(incomeEntries);
    
    return {
      metrics: {
        monthlyIncome,
        monthlyExpense: monthlyExpenses,
        monthlySavings,
        totalIncome,
        totalExpenses,
        totalSavings,
        savingsRate: Math.round(savingsRate * 100) / 100,
        marketplaceIncome,
        monthlyMarketplaceIncome,
        itemsSold: marketplaceListings.filter(listing => listing.status === 'sold').length,
        activeListings: marketplaceListings.filter(listing => listing.status === 'active').length,
        activeGoals: activeGoals.length,
        incomeSources,
        expenseCategories,
        expenseAnalysis,
        incomeAnalysis
      },
      goals: activeGoals,
      goalProgress: {
        average: averageProgress,
        avgContribution
      }
    };
  };

  // Calculate comprehensive financial health score
  const calculateFinancialHealthScore = (financialAnalysis) => {
    const metrics = financialAnalysis.metrics;
    let score = 0;
    let factors = [];
    
    // Savings Rate Factor (40% weight)
    const savingsRateScore = Math.min(100, Math.max(0, metrics.savingsRate * 2));
    score += savingsRateScore * 0.4;
    factors.push({
      name: "Savings Rate",
      score: savingsRateScore,
      weight: 40,
      description: `${metrics.savingsRate}% monthly savings rate`
    });
    
    // Income Stability Factor (20% weight)
    const incomeStabilityScore = Math.min(100, Math.max(0, (metrics.incomeSources * 20) + (metrics.monthlyIncome > 0 ? 20 : 0)));
    score += incomeStabilityScore * 0.2;
    factors.push({
      name: "Income Stability",
      score: incomeStabilityScore,
      weight: 20,
      description: `${metrics.incomeSources} income sources`
    });
    
    // Expense Management Factor (15% weight)
    const expenseManagementScore = Math.min(100, Math.max(0, 100 - (metrics.expenseCategories * 5) + (metrics.monthlyExpense < metrics.monthlyIncome ? 30 : 0)));
    score += expenseManagementScore * 0.15;
    factors.push({
      name: "Expense Management",
      score: expenseManagementScore,
      weight: 15,
      description: `${metrics.expenseCategories} expense categories`
    });
    
    // Goal Progress Factor (15% weight)
    const goalProgressScore = Math.min(100, Math.max(0, financialAnalysis.goalProgress.average));
    score += goalProgressScore * 0.15;
    factors.push({
      name: "Goal Progress",
      score: goalProgressScore,
      weight: 15,
      description: `${financialAnalysis.goalProgress.average.toFixed(1)}% average progress`
    });
    
    // Marketplace Activity Factor (10% weight)
    const marketplaceScore = Math.min(100, Math.max(0, (metrics.itemsSold * 10) + (metrics.activeListings * 5)));
    score += marketplaceScore * 0.1;
    factors.push({
      name: "Marketplace Activity",
      score: marketplaceScore,
      weight: 10,
      description: `${metrics.itemsSold} items sold, ${metrics.activeListings} active listings`
    });
    
    const finalScore = Math.round(score);
    let status = 'Poor';
    
    if (finalScore >= 85) status = 'Excellent';
    else if (finalScore >= 70) status = 'Good';
    else if (finalScore >= 55) status = 'Fair';
    else if (finalScore >= 40) status = 'Below Average';
    
    return {
      score: finalScore,
      status,
      factors,
      breakdown: {
        savingsRate: savingsRateScore,
        incomeStability: incomeStabilityScore,
        expenseManagement: expenseManagementScore,
        goalProgress: goalProgressScore,
        marketplaceActivity: marketplaceScore
      }
    };
  };

  // Analyze expense patterns
  const analyzeExpensePatterns = (expenseEntries) => {
    const categoryTotals = {};
    const monthlyTrends = {};
    
    expenseEntries.forEach(entry => {
      // Category analysis
      const category = entry.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + (entry.amount || 0);
      
      // Monthly trend analysis
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrends[monthKey] = (monthlyTrends[monthKey] || 0) + (entry.amount || 0);
    });
    
    const topCategories = Object.entries(categoryTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));
    
    return {
      topCategories,
      monthlyTrends,
      totalCategories: Object.keys(categoryTotals).length,
      averageMonthlyExpense: Object.values(monthlyTrends).reduce((sum, amount) => sum + amount, 0) / Math.max(1, Object.keys(monthlyTrends).length)
    };
  };

  // Analyze income patterns
  const analyzeIncomePatterns = (incomeEntries) => {
    const sourceTotals = {};
    const monthlyTrends = {};
    
    incomeEntries.forEach(entry => {
      // Source analysis
      const source = entry.source || 'Other';
      sourceTotals[source] = (sourceTotals[source] || 0) + (entry.amount || 0);
      
      // Monthly trend analysis
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrends[monthKey] = (monthlyTrends[monthKey] || 0) + (entry.amount || 0);
    });
    
    const topSources = Object.entries(sourceTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([source, amount]) => ({ source, amount }));
    
    return {
      topSources,
      monthlyTrends,
      totalSources: Object.keys(sourceTotals).length,
      averageMonthlyIncome: Object.values(monthlyTrends).reduce((sum, amount) => sum + amount, 0) / Math.max(1, Object.keys(monthlyTrends).length)
    };
  };

  // Generate detailed financial insights
  const generateDetailedFinancialInsights = (financialAnalysis, healthScore) => {
    const metrics = financialAnalysis.metrics;
    const financial = [];
    const goals = [];
    const marketplace = [];
    const recommendations = [];
    
    // Financial insights based on health score factors
    healthScore.factors.forEach(factor => {
      if (factor.score >= 80) {
        financial.push(`Excellent ${factor.name.toLowerCase()}: ${factor.description}`);
      } else if (factor.score >= 60) {
        financial.push(`Good ${factor.name.toLowerCase()}: ${factor.description}`);
      } else if (factor.score >= 40) {
        financial.push(`Fair ${factor.name.toLowerCase()}: ${factor.description}`);
      } else {
        financial.push(`Needs improvement in ${factor.name.toLowerCase()}: ${factor.description}`);
      }
    });
    
    // Savings rate insights
    if (metrics.savingsRate >= 20) {
      financial.push("Outstanding savings rate! You're building wealth effectively.");
    } else if (metrics.savingsRate >= 10) {
      financial.push("Good savings rate. Consider increasing it to reach goals faster.");
    } else if (metrics.savingsRate >= 5) {
      financial.push("Fair savings rate. Focus on reducing expenses or increasing income.");
    } else {
      financial.push("Low savings rate. Immediate action needed to improve financial health.");
    }
    
    // Income insights
    if (metrics.incomeSources >= 3) {
      financial.push("Diversified income sources provide financial stability.");
    } else if (metrics.incomeSources >= 2) {
      financial.push("Multiple income sources help reduce risk.");
    } else {
      financial.push("Consider diversifying income sources for better financial security.");
    }
    
    // Expense insights
    if (metrics.expenseAnalysis.topCategories.length > 0) {
      const topCategory = metrics.expenseAnalysis.topCategories[0];
      financial.push(`Highest expense category: ${topCategory.category} (₹${topCategory.amount.toLocaleString()})`);
    }
    
    // Goal insights
    if (financialAnalysis.goals.length === 0) {
      goals.push("No active goals found. Create goals to start your financial journey.");
    } else if (financialAnalysis.goalProgress.average >= 50) {
      goals.push(`Great progress! Average completion is ${financialAnalysis.goalProgress.average.toFixed(1)}%.`);
    } else if (financialAnalysis.goalProgress.average >= 25) {
      goals.push(`Good progress on goals. Average completion is ${financialAnalysis.goalProgress.average.toFixed(1)}%.`);
    } else {
      goals.push(`Early stage goals. Average completion is ${financialAnalysis.goalProgress.average.toFixed(1)}%.`);
    }
    
    // Marketplace insights
    if (metrics.activeListings === 0) {
      marketplace.push("No active listings. Start selling to boost your income.");
    } else if (metrics.itemsSold > 0) {
      marketplace.push(`Great! You've sold ${metrics.itemsSold} items earning ₹${metrics.marketplaceIncome.toLocaleString()}.`);
    } else {
      marketplace.push(`${metrics.activeListings} active listings. Consider optimizing your listings.`);
    }
    
    // Generate recommendations based on health score
    if (healthScore.score < 40) {
      recommendations.push({
        title: "Improve Financial Foundation",
        description: "Focus on increasing income, reducing expenses, and building emergency savings."
      });
    }
    
    if (metrics.savingsRate < 10) {
      recommendations.push({
        title: "Increase Savings Rate",
        description: "Aim for at least 10% savings rate by reducing expenses or increasing income."
      });
    }
    
    if (metrics.incomeSources < 2) {
      recommendations.push({
        title: "Diversify Income Sources",
        description: "Consider additional income streams like freelancing, investments, or marketplace sales."
      });
    }
    
    if (financialAnalysis.goals.length === 0) {
      recommendations.push({
        title: "Create Financial Goals",
        description: "Set specific, measurable goals to guide your financial journey."
      });
    }
    
    if (metrics.activeListings === 0) {
      recommendations.push({
        title: "Start Selling",
        description: "List unused items in the marketplace to generate additional income."
      });
    }
    
    return { financial, goals, marketplace, recommendations };
  };

  // Generate insights based on data
  const generateInsights = (income, expenses, savings, savingsRate, goals, avgProgress, listings, sold) => {
    const financial = [];
    const goals_insights = [];
    const marketplace = [];
    const recommendations = [];

    // Financial insights
    if (savingsRate >= 20) {
      financial.push("Excellent savings rate! You're on track for financial success.");
    } else if (savingsRate >= 10) {
      financial.push("Good savings rate. Consider increasing it to reach goals faster.");
    } else if (savingsRate >= 5) {
      financial.push("Fair savings rate. Focus on reducing expenses or increasing income.");
    } else {
      financial.push("Low savings rate. Immediate action needed to improve financial health.");
    }

    if (income > 0 && expenses > income) {
      financial.push("Expenses exceed income. Consider reducing spending or increasing income.");
    }

    // Goal insights
    if (goals.length === 0) {
      goals_insights.push("No active goals found. Create goals to start your financial journey.");
    } else if (avgProgress >= 50) {
      goals_insights.push(`Great progress! Average completion is ${avgProgress.toFixed(1)}%.`);
    } else if (avgProgress >= 25) {
      goals_insights.push(`Good progress on goals. Average completion is ${avgProgress.toFixed(1)}%.`);
    } else {
      goals_insights.push(`Early stage goals. Average completion is ${avgProgress.toFixed(1)}%.`);
    }

    // Marketplace insights
    if (listings === 0) {
      marketplace.push("No active listings. Start selling to boost your income.");
    } else if (sold > 0) {
      marketplace.push(`Great! You've sold ${sold} items. Keep listing more items.`);
    } else {
      marketplace.push(`${listings} active listings. Consider optimizing your listings.`);
    }

    // Recommendations
    if (savingsRate < 10) {
      recommendations.push({
        title: "Increase Savings Rate",
        description: "Aim for at least 10% savings rate by reducing expenses or increasing income."
      });
    }

    if (goals.length === 0) {
      recommendations.push({
        title: "Create Financial Goals",
        description: "Set specific, measurable goals to guide your financial journey."
      });
    }

    if (listings === 0) {
      recommendations.push({
        title: "Start Selling",
        description: "List unused items in the marketplace to generate additional income."
      });
    }

    return { financial, goals: goals_insights, marketplace, recommendations };
  };

  // Calculate estimated completion date for goals
  const calculateEstimatedCompletion = (goal, monthlySavings) => {
    if (!goal.targetAmount || !goal.currentAmount || monthlySavings <= 0) {
      return "Unable to calculate";
    }
    
    const remaining = goal.targetAmount - goal.currentAmount;
    const monthsNeeded = Math.ceil(remaining / monthlySavings);
    
    if (monthsNeeded > 12) {
      return `${Math.ceil(monthsNeeded / 12)} years`;
    } else {
      return `${monthsNeeded} months`;
    }
  };

  // Get top categories from marketplace listings
  const getTopCategories = (listings) => {
    const categoryCount = {};
    listings.forEach(listing => {
      if (listing.category) {
        categoryCount[listing.category] = (categoryCount[listing.category] || 0) + 1;
      }
    });
    
    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-danger';
  };

  const getHealthStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'excellent': return 'bg-success';
      case 'good': return 'bg-success';
      case 'fair': return 'bg-warning';
      case 'poor': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <div className="container-xxl py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Analyzing your financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h3 mb-1">Analytics & Insights</h1>
              <p className="text-muted mb-0">Understand your financial health and goal progress</p>
            </div>
            <button className="btn btn-outline-primary" onClick={fetchAnalyticsData}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
              Refresh Analysis
            </button>
          </div>

          {/* Financial Health Overview */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Financial Health Score</h5>
                </div>
                <div className="card-body">
                  <div className="row align-items-center">
                    <div className="col-md-4 text-center">
                      <div className="financial-health-score">
                        <div className={`display-1 fw-bold ${getHealthScoreColor(analytics.financialHealth.score)}`}>
                          {analytics.financialHealth.score}
                        </div>
                        <div className="h5 text-muted">out of 100</div>
                        <span className={`badge ${getHealthStatusColor(analytics.financialHealth.status)} fs-6`}>
                          {analytics.financialHealth.status}
                        </span>
                        <div className="mt-3">
                          <div className="progress" style={{ height: '12px' }}>
                            <div
                              className={`progress-bar ${getHealthScoreColor(analytics.financialHealth.score).replace('text-', 'bg-')}`}
                              style={{ width: `${analytics.financialHealth.score}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-8">
                      <div className="row g-3">
                        {/* Financial Metrics */}
                        <div className="col-md-6">
                          <div className="row g-2">
                            <div className="col-12">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Monthly Income:</span>
                                <span className="fw-bold">₹{analytics.financialHealth.metrics?.monthlyIncome?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Marketplace Earnings:</span>
                                <span className="fw-bold text-success">₹{analytics.financialHealth.metrics?.marketplaceIncome?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Total Income:</span>
                                <span className="fw-bold text-primary">₹{analytics.financialHealth.metrics?.totalIncome?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Monthly Expenses:</span>
                                <span className="fw-bold text-danger">₹{analytics.financialHealth.metrics?.monthlyExpense?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Monthly Savings:</span>
                                <span className="fw-bold text-success">₹{analytics.financialHealth.metrics?.monthlySavings?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Savings Rate:</span>
                                <span className="fw-bold">{analytics.financialHealth.metrics?.savingsRate || 0}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="row g-2">
                            <div className="col-12">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Items Sold:</span>
                                <span className="fw-bold text-success">{analytics.financialHealth.metrics?.itemsSold || 0}</span>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Active Listings:</span>
                                <span className="fw-bold">{analytics.financialHealth.metrics?.activeListings || 0}</span>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Active Goals:</span>
                                <span className="fw-bold">{analytics.financialHealth.metrics?.activeGoals || 0}</span>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Income Sources:</span>
                                <span className="fw-bold">{analytics.financialHealth.metrics?.incomeSources || 0}</span>
                              </div>
                            </div>
                            <div className="col-12">
                              <div className="d-flex justify-content-between">
                                <span className="text-muted">Expense Categories:</span>
                                <span className="fw-bold">{analytics.financialHealth.metrics?.expenseCategories || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-12">
                          <h6>Key Insights:</h6>
                          <ul className="list-unstyled">
                            {analytics.financialHealth.insights.map((insight, index) => (
                              <li key={index} className="mb-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary me-2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <path d="M12 6v6l4 2"/>
                                </svg>
                                {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Health Score Breakdown */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Financial Health Score Breakdown</h5>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    <div className="col-md-6">
                      <h6>Score Components:</h6>
                      <div className="row g-3">
                        <div className="col-12">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Savings Rate (40%):</span>
                            <div className="d-flex align-items-center">
                              <div className="progress me-2" style={{ width: '100px', height: '8px' }}>
                                <div 
                                  className={`progress-bar ${analytics.financialHealth.metrics?.savingsRate >= 20 ? 'bg-success' : 
                                             analytics.financialHealth.metrics?.savingsRate >= 10 ? 'bg-warning' : 'bg-danger'}`}
                                  style={{ width: `${Math.min(100, analytics.financialHealth.metrics?.savingsRate * 2 || 0)}%` }}
                                ></div>
                              </div>
                              <span className="fw-bold">{Math.min(100, analytics.financialHealth.metrics?.savingsRate * 2 || 0)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Income Stability (20%):</span>
                            <div className="d-flex align-items-center">
                              <div className="progress me-2" style={{ width: '100px', height: '8px' }}>
                                <div 
                                  className={`progress-bar ${analytics.financialHealth.metrics?.incomeSources >= 3 ? 'bg-success' : 
                                             analytics.financialHealth.metrics?.incomeSources >= 2 ? 'bg-warning' : 'bg-danger'}`}
                                  style={{ width: `${Math.min(100, (analytics.financialHealth.metrics?.incomeSources || 0) * 20 + 20)}%` }}
                                ></div>
                              </div>
                              <span className="fw-bold">{Math.min(100, (analytics.financialHealth.metrics?.incomeSources || 0) * 20 + 20)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Expense Management (15%):</span>
                            <div className="d-flex align-items-center">
                              <div className="progress me-2" style={{ width: '100px', height: '8px' }}>
                                <div 
                                  className={`progress-bar ${analytics.financialHealth.metrics?.monthlyExpense < analytics.financialHealth.metrics?.monthlyIncome ? 'bg-success' : 'bg-warning'}`}
                                  style={{ width: `${analytics.financialHealth.metrics?.monthlyExpense < analytics.financialHealth.metrics?.monthlyIncome ? 80 : 40}%` }}
                                ></div>
                              </div>
                              <span className="fw-bold">{analytics.financialHealth.metrics?.monthlyExpense < analytics.financialHealth.metrics?.monthlyIncome ? 80 : 40}</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Goal Progress (15%):</span>
                            <div className="d-flex align-items-center">
                              <div className="progress me-2" style={{ width: '100px', height: '8px' }}>
                                <div 
                                  className={`progress-bar ${analytics.goalProgress.averageProgress >= 50 ? 'bg-success' : 
                                             analytics.goalProgress.averageProgress >= 25 ? 'bg-warning' : 'bg-danger'}`}
                                  style={{ width: `${analytics.goalProgress.averageProgress || 0}%` }}
                                ></div>
                              </div>
                              <span className="fw-bold">{analytics.goalProgress.averageProgress || 0}</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted">Marketplace Activity (10%):</span>
                            <div className="d-flex align-items-center">
                              <div className="progress me-2" style={{ width: '100px', height: '8px' }}>
                                <div 
                                  className={`progress-bar ${analytics.financialHealth.metrics?.itemsSold >= 5 ? 'bg-success' : 
                                             analytics.financialHealth.metrics?.itemsSold >= 2 ? 'bg-warning' : 'bg-danger'}`}
                                  style={{ width: `${Math.min(100, (analytics.financialHealth.metrics?.itemsSold || 0) * 10 + (analytics.financialHealth.metrics?.activeListings || 0) * 5)}%` }}
                                ></div>
                              </div>
                              <span className="fw-bold">{Math.min(100, (analytics.financialHealth.metrics?.itemsSold || 0) * 10 + (analytics.financialHealth.metrics?.activeListings || 0) * 5)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h6>Financial Analysis:</h6>
                      <div className="row g-3">
                        <div className="col-12">
                          <div className="card border-info">
                            <div className="card-body">
                              <h6 className="card-title text-info">Income Analysis</h6>
                              <div className="small">
                                <div className="d-flex justify-content-between mb-1">
                                  <span>Primary Sources:</span>
                                  <span>{analytics.financialHealth.metrics?.incomeAnalysis?.totalSources || 0}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                  <span>Avg Monthly:</span>
                                  <span>₹{analytics.financialHealth.metrics?.incomeAnalysis?.averageMonthlyIncome?.toLocaleString() || 0}</span>
                                </div>
                                {analytics.financialHealth.metrics?.incomeAnalysis?.topSources?.slice(0, 2).map((source, index) => (
                                  <div key={index} className="d-flex justify-content-between">
                                    <span className="text-muted">{source.source}:</span>
                                    <span>₹{source.amount.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="card border-warning">
                            <div className="card-body">
                              <h6 className="card-title text-warning">Expense Analysis</h6>
                              <div className="small">
                                <div className="d-flex justify-content-between mb-1">
                                  <span>Categories:</span>
                                  <span>{analytics.financialHealth.metrics?.expenseAnalysis?.totalCategories || 0}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-1">
                                  <span>Avg Monthly:</span>
                                  <span>₹{analytics.financialHealth.metrics?.expenseAnalysis?.averageMonthlyExpense?.toLocaleString() || 0}</span>
                                </div>
                                {analytics.financialHealth.metrics?.expenseAnalysis?.topCategories?.slice(0, 2).map((category, index) => (
                                  <div key={index} className="d-flex justify-content-between">
                                    <span className="text-muted">{category.category}:</span>
                                    <span>₹{category.amount.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Recommendations */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Financial Recommendations</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    {analytics.financialHealth.recommendations.map((recommendation, index) => (
                      <div key={index} className="col-md-6">
                        <div className="alert alert-info d-flex align-items-start">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2 mt-1">
                            <path d="M9 12l2 2 4-4"/>
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                          <div>
                            <strong>{recommendation.title}</strong>
                            <p className="mb-0 mt-1">{recommendation.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Goal Progress Analytics */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Goal Progress Analytics</h5>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    <div className="col-md-4">
                      <div className="text-center">
                        <div className="h2 text-primary mb-2">{analytics.goalProgress.averageProgress}%</div>
                        <div className="text-muted">Average Progress</div>
                        <div className="progress mt-3" style={{ height: '8px' }}>
                          <div 
                            className="progress-bar bg-primary" 
                            style={{ width: `${analytics.goalProgress.averageProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-center">
                        <div className="h3 text-success mb-2">₹{analytics.goalProgress.summary?.monthlySavings?.toLocaleString() || 0}</div>
                        <div className="text-muted">Monthly Savings</div>
                        <div className="small text-muted mt-2">
                          ₹{analytics.goalProgress.summary?.avgMonthlyContributionPerGoal?.toLocaleString() || 0} per goal
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-center">
                        <div className="h3 text-warning mb-2">₹{analytics.goalProgress.summary?.monthlyMarketplaceEarnings?.toLocaleString() || 0}</div>
                        <div className="text-muted">Marketplace Earnings</div>
                        <div className="small text-success mt-2">
                          Accelerating goal progress
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="goal-insights">
                        <h6>Goal Insights:</h6>
                        <ul className="list-unstyled">
                          {analytics.goalProgress.insights.map((insight, index) => (
                            <li key={index} className="mb-2">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success me-2">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                              </svg>
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Individual Goal Progress */}
                  <div className="mt-4">
                    <h6>Individual Goal Analysis:</h6>
                    <div className="row g-3">
                      {analytics.goalProgress.goals.map((goal, index) => (
                        <div key={index} className="col-md-6">
                          <div className="card border">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="card-title mb-0">{goal.title}</h6>
                                <span className="badge bg-primary">{goal.progress}%</span>
                              </div>
                              <div className="progress mb-2" style={{ height: '6px' }}>
                                <div 
                                  className="progress-bar" 
                                  style={{ width: `${goal.progress}%` }}
                                ></div>
                              </div>
                              <div className="small text-muted">
                                <div>Target: ₹{goal.targetAmount?.toLocaleString()}</div>
                                <div>Saved: ₹{goal.currentAmount?.toLocaleString()}</div>
                                <div>Remaining: ₹{(goal.targetAmount - goal.currentAmount)?.toLocaleString()}</div>
                                <div className="mt-2">
                                  <strong>Estimated completion: {goal.estimatedCompletion}</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spending Patterns */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Spending Patterns & Insights</h5>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    <div className="col-md-4">
                      <h6>Top Spending Categories:</h6>
                      <div className="spending-categories">
                        {analytics.spendingPatterns.categories?.slice(0, 5).map((category, index) => (
                          <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                            <div>
                              <div className="fw-medium">{category.name}</div>
                              <div className="small text-muted">{category.percentage}% of total expenses</div>
                            </div>
                            <div className="text-end">
                              <div className="fw-bold">₹{category.amount?.toLocaleString()}</div>
                            </div>
                          </div>
                        )) || <p className="text-muted">No expense data available</p>}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <h6>Income Sources:</h6>
                      <div className="income-sources">
                        {analytics.spendingPatterns.incomeSources?.map((source, index) => (
                          <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                            <div>
                              <div className="fw-medium">{source.name === 'marketplace' ? 'Marketplace Sales' : source.name}</div>
                              <div className="small text-muted">{source.percentage}% of total revenue</div>
                            </div>
                            <div className="text-end">
                              <div className="fw-bold text-success">₹{source.amount?.toLocaleString()}</div>
                            </div>
                          </div>
                        )) || <p className="text-muted">No income data available</p>}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <h6>Financial Summary:</h6>
                      <div className="financial-summary">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Total Revenue:</span>
                          <span className="fw-bold text-primary">₹{analytics.spendingPatterns.summary?.totalRevenue?.toLocaleString() || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Total Expenses:</span>
                          <span className="fw-bold text-danger">₹{analytics.spendingPatterns.summary?.totalExpenses?.toLocaleString() || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Marketplace Earnings:</span>
                          <span className="fw-bold text-success">₹{analytics.spendingPatterns.summary?.totalMarketplaceEarnings?.toLocaleString() || 0}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Savings Rate:</span>
                          <span className="fw-bold">{analytics.spendingPatterns.summary?.savingsRate || 0}%</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Items Sold:</span>
                          <span className="fw-bold">{analytics.spendingPatterns.summary?.totalItemsSold || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <h6>Spending Insights:</h6>
                      <ul className="list-unstyled">
                        {analytics.spendingPatterns.insights?.map((insight, index) => (
                          <li key={index} className="mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info me-2">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="16" x2="12" y2="12"/>
                              <line x1="12" y1="8" x2="12.01" y2="8"/>
                            </svg>
                            {insight}
                          </li>
                        )) || <p className="text-muted">No insights available</p>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Marketplace Analytics */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Marketplace Performance</h5>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    <div className="col-md-3">
                      <div className="text-center">
                        <div className="h3 text-success mb-2">₹{analytics.marketplace.earnings?.toLocaleString() || '0'}</div>
                        <div className="text-muted">Total Earnings</div>
                        <div className="small text-success mt-1">
                          {analytics.marketplace.sales?.length || 0} items sold
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center">
                        <div className="h3 text-primary mb-2">{analytics.marketplace.listings?.length || 0}</div>
                        <div className="text-muted">Total Listings</div>
                        <div className="small text-muted mt-1">
                          {analytics.financialHealth.metrics?.activeListings || 0} active
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center">
                        <div className="h3 text-warning mb-2">
                          {analytics.marketplace.listings?.length > 0 
                            ? Math.round(((analytics.marketplace.sales?.length || 0) / analytics.marketplace.listings.length) * 100)
                            : 0}%
                        </div>
                        <div className="text-muted">Success Rate</div>
                        <div className="small text-muted mt-1">
                          Items sold vs listed
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center">
                        <div className="h3 text-info mb-2">
                          {analytics.marketplace.topCategories?.length || 0}
                        </div>
                        <div className="text-muted">Categories</div>
                        <div className="small text-muted mt-1">
                          {analytics.marketplace.topCategories?.[0]?.category || 'None'} most popular
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <h6>Marketplace Insights:</h6>
                      <ul className="list-unstyled">
                        {analytics.marketplace.insights?.map((insight, index) => (
                          <li key={index} className="mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-success me-2">
                              <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                            </svg>
                            {insight}
                          </li>
                        )) || <p className="text-muted">No marketplace insights available</p>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wishlist Analytics */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Wishlist Analytics</h5>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    <div className="col-md-4">
                      <div className="text-center">
                        <div className="h3 text-primary mb-2">{analytics.wishlist.items?.length || 0}</div>
                        <div className="text-muted">Total Items</div>
                        <div className="small text-muted mt-1">
                          Items in your wishlist
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-center">
                        <div className="h3 text-success mb-2">₹{analytics.wishlist.totalValue?.toLocaleString() || '0'}</div>
                        <div className="text-muted">Total Value</div>
                        <div className="small text-muted mt-1">
                          Combined value of all items
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-center">
                        <div className="h3 text-warning mb-2">{analytics.wishlist.categories?.length || 0}</div>
                        <div className="text-muted">Categories</div>
                        <div className="small text-muted mt-1">
                          Different item categories
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <h6>Wishlist Insights:</h6>
                      <ul className="list-unstyled">
                        {analytics.wishlist.insights?.map((insight, index) => (
                          <li key={index} className="mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-warning me-2">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            {insight}
                          </li>
                        )) || <p className="text-muted">No wishlist insights available</p>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Analytics */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Connection Analytics</h5>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    <div className="col-md-3">
                      <div className="text-center">
                        <div className="h3 text-primary mb-2">{analytics.connections.total || 0}</div>
                        <div className="text-muted">Total Connections</div>
                        <div className="small text-muted mt-1">
                          All connection requests
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center">
                        <div className="h3 text-warning mb-2">{analytics.connections.pending || 0}</div>
                        <div className="text-muted">Pending</div>
                        <div className="small text-muted mt-1">
                          Awaiting response
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center">
                        <div className="h3 text-success mb-2">{analytics.connections.accepted || 0}</div>
                        <div className="text-muted">Accepted</div>
                        <div className="small text-muted mt-1">
                          Active connections
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center">
                        <div className="h3 text-danger mb-2">{analytics.connections.rejected || 0}</div>
                        <div className="text-muted">Rejected</div>
                        <div className="small text-muted mt-1">
                          Declined requests
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <h6>Connection Insights:</h6>
                      <ul className="list-unstyled">
                        {analytics.connections.insights?.map((insight, index) => (
                          <li key={index} className="mb-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-info me-2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                            {insight}
                          </li>
                        )) || <p className="text-muted">No connection insights available</p>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Items */}
          <div className="row g-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Recommended Actions</h5>
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    <div className="col-md-3">
                      <div className="text-center p-3 border rounded">
                        <div className="text-primary mb-2">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <h6>Improve Savings Rate</h6>
                        <p className="small text-muted">Increase your monthly savings to reach goals faster</p>
                        <button className="btn btn-sm btn-primary">View Tips</button>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center p-3 border rounded">
                        <div className="text-success mb-2">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                            <path d="M9 1v6M15 1v6M9 17v6M15 17v6M1 9h6M17 9h6M1 15h6M17 15h6"/>
                          </svg>
                        </div>
                        <h6>List More Items</h6>
                        <p className="small text-muted">Sell unused items to boost your income</p>
                        <button className="btn btn-sm btn-success">Go to Marketplace</button>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center p-3 border rounded">
                        <div className="text-warning mb-2">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                          </svg>
                        </div>
                        <h6>Review Expenses</h6>
                        <p className="small text-muted">Analyze and optimize your spending habits</p>
                        <button className="btn btn-sm btn-warning">Review Now</button>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="text-center p-3 border rounded">
                        <div className="text-info mb-2">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                        </div>
                        <h6>Manage Connections</h6>
                        <p className="small text-muted">Review and respond to connection requests</p>
                        <button className="btn btn-sm btn-info">View Requests</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
