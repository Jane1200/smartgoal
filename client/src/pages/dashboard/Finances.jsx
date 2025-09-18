import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import { validateForm, validationRules, formatCurrency } from "@/utils/validations.js";
import { FormError, FormErrors } from "@/components/FormError.jsx";

export default function Finances() {
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

  const [financeData, setFinanceData] = useState({
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlySavings: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    monthlySavingsRate: 0,
    totalSavingsRate: 0
  });
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [expenseEntries, setExpenseEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('all-time'); // 'current-month' or 'all-time'
  const [formErrors, setFormErrors] = useState({});
  const [expenseAlerts, setExpenseAlerts] = useState([]);
  const [showExpenseTips, setShowExpenseTips] = useState(false);

  // Form states
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    amount: "100",
    source: "",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchFinanceData();
  }, [viewMode]);

  // Automatically recalculate totals when entries change
  useEffect(() => {
    if (incomeEntries.length > 0 || expenseEntries.length > 0) {
      const calculatedTotals = calculateTotalsFromEntries(incomeEntries, expenseEntries);
      setFinanceData(prev => ({
        ...prev,
        totalIncome: calculatedTotals.totalIncome,
        totalExpenses: calculatedTotals.totalExpenses,
        totalSavings: calculatedTotals.totalSavings,
        monthlyIncome: calculatedTotals.monthlyIncome,
        monthlyExpense: calculatedTotals.monthlyExpense,
        monthlySavings: calculatedTotals.monthlySavings,
        monthlySavingsRate: calculatedTotals.monthlySavingsRate,
        totalSavingsRate: calculatedTotals.totalSavingsRate
      }));

      // Analyze expenses and generate alerts/suggestions
      const { alerts, suggestions } = analyzeExpenses(incomeEntries, expenseEntries);
      setExpenseAlerts([...alerts, ...suggestions]);

      // Show single consolidated toast notification for critical alerts
      const criticalAlerts = alerts.filter(alert => alert.type === 'danger' || alert.type === 'warning');
      if (criticalAlerts.length > 0) {
        const mostCritical = criticalAlerts[0]; // Show only the most critical alert
        if (mostCritical.type === 'danger') {
          toast.error(`${mostCritical.icon} ${mostCritical.title}: ${mostCritical.message}`);
        } else if (mostCritical.type === 'warning') {
          toast.warning(`${mostCritical.icon} ${mostCritical.title}: ${mostCritical.message}`);
        }
      }
    }
  }, [incomeEntries, expenseEntries]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      
      // Prepare API calls based on view mode
      const summaryUrl = viewMode === 'current-month' ? "/finance/summary" : "/finance/summary?all=true";
      
      // Fetch finance summary and entries
      const [summaryResponse, incomeResponse, expenseResponse] = await Promise.allSettled([
        api.get(summaryUrl),
        api.get("/finance/income"),
        api.get("/finance/expenses")
      ]);

      let allIncomeEntries = [];
      let allExpenseEntries = [];

      if (incomeResponse.status === 'fulfilled') {
        allIncomeEntries = incomeResponse.value.data || [];
      }

      if (expenseResponse.status === 'fulfilled') {
        allExpenseEntries = expenseResponse.value.data || [];
      }

      // Filter entries based on view mode
      let incomeEntries = allIncomeEntries;
      let expenseEntries = allExpenseEntries;

      if (viewMode === 'current-month') {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        incomeEntries = allIncomeEntries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        });

        expenseEntries = allExpenseEntries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        });
      }

      // Set the filtered entries
      setIncomeEntries(incomeEntries);
      setExpenseEntries(expenseEntries);

      // Calculate totals from entries (automated calculation)
      const calculatedTotals = calculateTotalsFromEntries(incomeEntries, expenseEntries);
      
      // Use server summary if available, otherwise use calculated totals
      if (summaryResponse.status === 'fulfilled') {
        console.log('Finance summary response:', summaryResponse.value.data);
        const serverData = summaryResponse.value.data;
        setFinanceData({
          ...serverData,
          // Override with calculated totals for accuracy
          totalIncome: calculatedTotals.totalIncome,
          totalExpenses: calculatedTotals.totalExpenses,
          totalSavings: calculatedTotals.totalSavings,
          monthlyIncome: calculatedTotals.monthlyIncome,
          monthlyExpense: calculatedTotals.monthlyExpense,
          monthlySavings: calculatedTotals.monthlySavings,
          monthlySavingsRate: calculatedTotals.monthlySavingsRate,
          totalSavingsRate: calculatedTotals.totalSavingsRate
        });
      } else {
        console.error('Summary response failed:', summaryResponse.reason);
        // Use calculated totals as fallback
        setFinanceData(calculatedTotals);
      }
    } catch (error) {
      console.error("Failed to fetch finance data:", error);
      toast.error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  const calculateSavings = () => {
    const income = parseFloat(incomeForm.amount) || 0;
    const expense = parseFloat(expenseForm.amount) || 0;
    return Math.max(0, income - expense);
  };

  // Analyze expenses and generate alerts/suggestions
  const analyzeExpenses = (incomeEntries, expenseEntries) => {
    const alerts = [];
    const suggestions = [];

    // Calculate totals
    const totalIncome = incomeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const totalExpenses = expenseEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    
    // Current month calculations
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthlyIncome = incomeEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      })
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
      
    const monthlyExpenses = expenseEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
      })
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);

    // Check for expense alerts
    if (monthlyExpenses > monthlyIncome && monthlyIncome > 0) {
      const overspend = monthlyExpenses - monthlyIncome;
      alerts.push({
        type: 'danger',
        title: 'Monthly Overspending Alert!',
        message: `You're spending ₹${overspend.toLocaleString()} more than you earn this month.`,
        icon: '⚠️'
      });
    }

    if (totalExpenses > totalIncome && totalIncome > 0) {
      const totalOverspend = totalExpenses - totalIncome;
      alerts.push({
        type: 'warning',
        title: 'Total Overspending Alert!',
        message: `Your total expenses exceed income by ₹${totalOverspend.toLocaleString()}.`,
        icon: '🚨'
      });
    }

    // Generate suggestions based on expense patterns
    if (expenseEntries.length > 0) {
      // Analyze expense categories
      const categoryTotals = {};
      expenseEntries.forEach(entry => {
        const category = entry.category || 'other';
        categoryTotals[category] = (categoryTotals[category] || 0) + (entry.amount || 0);
      });

      const sortedCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a);

      // Find highest spending category
      if (sortedCategories.length > 0) {
        const [topCategory, topAmount] = sortedCategories[0];
        const percentage = totalExpenses > 0 ? (topAmount / totalExpenses) * 100 : 0;
        
        if (percentage > 40) {
          suggestions.push({
            type: 'info',
            title: 'High Spending Category',
            message: `${topCategory} accounts for ${percentage.toFixed(1)}% of your expenses (₹${topAmount.toLocaleString()}). Consider reviewing this category.`,
            icon: '📊'
          });
        }
      }

      // Check for frequent small expenses
      const smallExpenses = expenseEntries.filter(entry => (entry.amount || 0) < 100);
      if (smallExpenses.length > 10) {
        const smallTotal = smallExpenses.reduce((sum, entry) => sum + (entry.amount || 0), 0);
        suggestions.push({
          type: 'warning',
          title: 'Small Expenses Add Up',
          message: `You have ${smallExpenses.length} small expenses (<₹100) totaling ₹${smallTotal.toLocaleString()}. Track these carefully!`,
          icon: '💰'
        });
      }

      // Check for recent high expenses
      const recentExpenses = expenseEntries
        .filter(entry => {
          const entryDate = new Date(entry.date);
          const daysDiff = (currentDate - entryDate) / (1000 * 60 * 60 * 24);
          return daysDiff <= 7 && (entry.amount || 0) > 1000;
        });

      if (recentExpenses.length > 0) {
        suggestions.push({
          type: 'info',
          title: 'Recent High Expenses',
          message: `You've made ${recentExpenses.length} expense(s) over ₹1,000 in the last week. Monitor your spending pattern.`,
          icon: '📈'
        });
      }
    }

    // Generate general tips
    if (monthlyExpenses > monthlyIncome * 0.8) {
      suggestions.push({
        type: 'tip',
        title: 'Budgeting Tip',
        message: 'Try the 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings.',
        icon: '💡'
      });
    }

    if (monthlyIncome > 0 && (monthlyExpenses / monthlyIncome) > 0.9) {
      suggestions.push({
        type: 'tip',
        title: 'Emergency Fund',
        message: 'Build an emergency fund covering 3-6 months of expenses for financial security.',
        icon: '🛡️'
      });
    }

    return { alerts, suggestions };
  };

  // Calculate totals from entries
  const calculateTotalsFromEntries = (incomeEntries, expenseEntries) => {
    // Calculate totals based on view mode
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    let totalIncome, totalExpenses, monthlyIncome, monthlyExpense;
    
    if (viewMode === 'current-month') {
      // In current month view, the entries are already filtered to current month
      totalIncome = incomeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
      totalExpenses = expenseEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
      monthlyIncome = totalIncome;
      monthlyExpense = totalExpenses;
    } else {
      // In all-time view, calculate totals from all entries
      totalIncome = incomeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
      totalExpenses = expenseEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
      
      // Calculate monthly values from all entries
      monthlyIncome = incomeEntries
        .filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        })
        .reduce((sum, entry) => sum + (entry.amount || 0), 0);
        
      monthlyExpense = expenseEntries
        .filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        })
        .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    }

    // Calculate savings
    const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);
    const totalSavings = Math.max(0, totalIncome - totalExpenses);
    
    // Calculate savings rate
    const monthlySavingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;
    const totalSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
    
    return {
      totalIncome,
      totalExpenses,
      monthlyIncome,
      monthlyExpense,
      monthlySavings,
      totalSavings,
      monthlySavingsRate,
      totalSavingsRate
    };
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();
    
    // Validate income form
    const incomeValidation = validateForm(incomeForm, {
      amount: validationRules.finance.incomeAmount,
      source: validationRules.finance.source,
      description: validationRules.finance.description,
      date: validationRules.finance.date
    });

    if (!incomeValidation.isValid) {
      setFormErrors(incomeValidation.errors);
      toast.error("Please fix the validation errors");
      return;
    }

    setFormErrors({});

    try {
      setSaving(true);
      const response = await api.post("/finance/income", {
        amount: parseFloat(incomeForm.amount),
        source: incomeForm.source.trim(),
        description: incomeForm.description.trim(),
        date: incomeForm.date
      });

      toast.success("Income entry added successfully!");
      setIncomeForm({ amount: "100", source: "", description: "", date: new Date().toISOString().split('T')[0] });
      setShowIncomeForm(false);
      fetchFinanceData();
    } catch (error) {
      console.error("Failed to add income:", error);
      toast.error("Failed to add income entry");
    } finally {
      setSaving(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    
    // Validate expense form
    const expenseValidation = validateForm(expenseForm, {
      amount: validationRules.finance.expenseAmount,
      category: validationRules.finance.category,
      description: validationRules.finance.description,
      date: validationRules.finance.date
    });

    if (!expenseValidation.isValid) {
      setFormErrors(expenseValidation.errors);
      toast.error("Please fix the validation errors");
      return;
    }

    setFormErrors({});

    try {
      setSaving(true);
      const response = await api.post("/finance/expenses", {
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category.trim(),
        description: expenseForm.description.trim(),
        date: expenseForm.date
      });

      toast.success("Expense entry added successfully!");
      setExpenseForm({ amount: "", category: "", description: "", date: new Date().toISOString().split('T')[0] });
      setShowExpenseForm(false);
      fetchFinanceData();
    } catch (error) {
      console.error("Failed to add expense:", error);
      toast.error("Failed to add expense entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIncome = async (id) => {
    if (!window.confirm("Are you sure you want to delete this income entry?")) return;

    try {
      await api.delete(`/finance/income/${id}`);
      toast.success("Income entry deleted successfully");
      fetchFinanceData();
    } catch (error) {
      console.error("Failed to delete income:", error);
      toast.error("Failed to delete income entry");
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense entry?")) return;

    try {
      await api.delete(`/finance/expenses/${id}`);
      toast.success("Expense entry deleted successfully");
      fetchFinanceData();
    } catch (error) {
      console.error("Failed to delete expense:", error);
      toast.error("Failed to delete expense entry");
    }
  };

  if (loading) {
    return (
      <div className="container-xxl py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading your finances...</p>
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
              <h1 className="h3 mb-1">My Finances</h1>
              <p className="text-muted mb-0">Track your income, expenses, and savings</p>
            </div>
            <div className="btn-group" role="group">
              <button
                type="button"
                className={`btn ${viewMode === 'all-time' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('all-time')}
              >
                {viewMode === 'all-time' && <span className="me-1">✓</span>}
                All Time
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'current-month' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('current-month')}
              >
                {viewMode === 'current-month' && <span className="me-1">✓</span>}
                Current Month
              </button>
            </div>
          </div>

          {/* Financial Overview */}
          <div className="row g-4 mb-4">
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <div className="text-success mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="6" width="20" height="12" rx="2"/>
                      <path d="M6 10h12"/>
                      <path d="M6 14h12"/>
                      <circle cx="12" cy="12" r="2"/>
                    </svg>
                  </div>
                  <h4 className="text-success">₹{financeData.monthlyIncome?.toLocaleString() || '0'}</h4>
                  <p className="text-muted mb-0">
                    {viewMode === 'all-time' ? 'Total Income' : 'Current Month Income'}
                    {viewMode === 'current-month' && (
                      <small className="text-info d-block mt-1">
                        📅 {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </small>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <div className="text-danger mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="6" width="20" height="12" rx="2"/>
                      <path d="M6 10h12"/>
                      <path d="M6 14h12"/>
                      <circle cx="12" cy="12" r="2"/>
                    </svg>
                  </div>
                  <h4 className="text-danger">₹{financeData.monthlyExpense?.toLocaleString() || '0'}</h4>
                  <p className="text-muted mb-0">
                    {viewMode === 'all-time' ? 'Total Expenses' : 'Current Month Expenses'}
                    {viewMode === 'current-month' && (
                      <small className="text-info d-block mt-1">
                        📅 {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </small>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <div className="text-primary mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <h4 className="text-primary">₹{financeData.monthlySavings?.toLocaleString() || '0'}</h4>
                  <p className="text-muted mb-0">
                    {viewMode === 'all-time' ? 'Current Month Savings' : 'Monthly Savings'}
                    {viewMode === 'current-month' && (
                      <small className="text-info d-block mt-1">
                        📅 {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </small>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <div className="text-info mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <h4 className="text-info">₹{financeData.totalSavings?.toLocaleString() || '0'}</h4>
                  <p className="text-muted mb-0">Total Savings</p>
                  <small className="text-info d-block mt-1">
                    📊 Calculated from {incomeEntries.length + expenseEntries.length} entries
                  </small>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center">
                <div className="card-body">
                  <div className="text-warning mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <h4 className="text-warning">{financeData.totalSavingsRate?.toFixed(1) || '0.0'}%</h4>
                  <p className="text-muted mb-0">Savings Rate</p>
                  <div className="mt-2">
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className={`progress-bar ${
                          (financeData.totalSavingsRate || 0) >= 20 ? 'bg-success' :
                          (financeData.totalSavingsRate || 0) >= 10 ? 'bg-warning' : 'bg-danger'
                        }`}
                        style={{ width: `${Math.min(100, financeData.totalSavingsRate || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                  <small className="text-muted d-block mt-1">
                    {financeData.totalSavingsRate >= 20 ? 'Excellent!' :
                     financeData.totalSavingsRate >= 10 ? 'Good' :
                     financeData.totalSavingsRate >= 5 ? 'Fair' : 'Needs improvement'}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Alerts and Tips */}
          {expenseAlerts.length > 0 && (
            <div className="row g-4 mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4"/>
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                      <h5 className="mb-0">Expense Insights & Tips</h5>
                    </div>
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setShowExpenseTips(!showExpenseTips)}
                      >
                        {showExpenseTips ? 'Hide Tips' : 'Show Tips'}
                      </button>
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setExpenseAlerts([])}
                      >
                        Dismiss All
                      </button>
                    </div>
                  </div>
                  {showExpenseTips && (
                    <div className="card-body">
                      <div className="row g-3">
                        {expenseAlerts.map((alert, index) => (
                          <div key={index} className="col-md-6">
                            <div className={`alert alert-${alert.type === 'tip' ? 'info' : alert.type} d-flex align-items-start`}>
                              <div className="me-3 fs-4">{alert.icon}</div>
                              <div className="flex-grow-1">
                                <h6 className="alert-heading mb-1">{alert.title}</h6>
                                <p className="mb-0 small">{alert.message}</p>
                              </div>
                              <button 
                                type="button" 
                                className="btn-close btn-close-sm"
                                onClick={() => setExpenseAlerts(prev => prev.filter((_, i) => i !== index))}
                              ></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Additional Tips Section */}
                      <div className="mt-4">
                        <h6 className="text-muted mb-3">💡 General Financial Tips</h6>
                        <div className="row g-3">
                          <div className="col-md-4">
                            <div className="card border-info">
                              <div className="card-body text-center">
                                <div className="text-info mb-2">📊</div>
                                <h6 className="card-title">Track Daily</h6>
                                <p className="small text-muted mb-0">Record expenses daily to maintain accurate financial records.</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="card border-success">
                              <div className="card-body text-center">
                                <div className="text-success mb-2">🎯</div>
                                <h6 className="card-title">Set Limits</h6>
                                <p className="small text-muted mb-0">Set monthly spending limits for each category to control expenses.</p>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="card border-warning">
                              <div className="card-body text-center">
                                <div className="text-warning mb-2">⏰</div>
                                <h6 className="card-title">Review Weekly</h6>
                                <p className="small text-muted mb-0">Review your spending patterns weekly to make adjustments.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Income Section */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Income Entries</h5>
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => setShowIncomeForm(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Add Income
                  </button>
                </div>
                <div className="card-body">
                  {incomeEntries.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="text-muted mb-2">No income entries yet</div>
                      <small className="text-muted">Start tracking your income sources</small>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Sl.no</th>
                            <th>Date</th>
                            <th>Source</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incomeEntries.map((entry, index) => (
                            <tr key={entry._id}>
                              <td>{index + 1}</td>
                              <td>{new Date(entry.date).toLocaleDateString()}</td>
                              <td>{entry.source}</td>
                              <td>{entry.description || '-'}</td>
                              <td className="text-success fw-bold">₹{entry.amount?.toLocaleString()}</td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteIncome(entry._id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Expense Section */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Expense Entries</h5>
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => setShowExpenseForm(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Add Expense
                  </button>
                </div>
                <div className="card-body">
                  {expenseEntries.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="text-muted mb-2">No expense entries yet</div>
                      <small className="text-muted">Start tracking your expenses</small>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Sl.no</th>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenseEntries.map((entry, index) => (
                            <tr key={entry._id}>
                              <td>{index + 1}</td>
                              <td>{new Date(entry.date).toLocaleDateString()}</td>
                              <td>{entry.category}</td>
                              <td>{entry.description || '-'}</td>
                              <td className="text-danger fw-bold">₹{entry.amount?.toLocaleString()}</td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDeleteExpense(entry._id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Income Form Modal */}
          {showIncomeForm && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Add Income Entry</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowIncomeForm(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#6c757d',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        lineHeight: '1',
                        width: '2rem',
                        height: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Close"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={handleAddIncome}>
                    <div className="modal-body">
                      <FormErrors errors={formErrors} className="mb-3" />
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label htmlFor="incomeAmount" className="form-label">Amount (₹) *</label>
                          <input
                            type="number"
                            id="incomeAmount"
                            className={`form-control ${formErrors.amount ? 'is-invalid' : ''}`}
                            value={incomeForm.amount}
                            onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="100"
                            min="100"
                            step="0.01"
                            required
                          />
                          <FormError error={formErrors.amount} />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="incomeSource" className="form-label">Source *</label>
                          <select
                            id="incomeSource"
                            className={`form-select ${formErrors.source ? 'is-invalid' : ''}`}
                            value={incomeForm.source}
                            onChange={(e) => setIncomeForm(prev => ({ ...prev, source: e.target.value }))}
                            required
                          >
                            <option value="">Select Source</option>
                            <option value="salary">Salary</option>
                            <option value="freelance">Freelance</option>
                            <option value="business">Business</option>
                            <option value="investment">Investment</option>
                            <option value="rental">Rental Income</option>
                            <option value="other">Other</option>
                          </select>
                          <FormError error={formErrors.source} />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="incomeDate" className="form-label">Date</label>
                          <input
                            type="date"
                            id="incomeDate"
                            className="form-control"
                            value={incomeForm.date}
                            onChange={(e) => setIncomeForm(prev => ({ ...prev, date: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>
                        <div className="col-12">
                          <label htmlFor="incomeDescription" className="form-label">Description</label>
                          <textarea
                            id="incomeDescription"
                            className="form-control"
                            rows="3"
                            value={incomeForm.description}
                            onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Additional details about this income..."
                          />
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowIncomeForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Adding...
                          </>
                        ) : (
                          'Add Income'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Expense Form Modal */}
          {showExpenseForm && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Add Expense Entry</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowExpenseForm(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#6c757d',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        lineHeight: '1',
                        width: '2rem',
                        height: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Close"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={handleAddExpense}>
                    <div className="modal-body">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label htmlFor="expenseAmount" className="form-label">Amount (₹) *</label>
                          <input
                            type="number"
                            id="expenseAmount"
                            className="form-control"
                            value={expenseForm.amount}
                            onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="2500"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="expenseCategory" className="form-label">Category *</label>
                          <select
                            id="expenseCategory"
                            className="form-select"
                            value={expenseForm.category}
                            onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                            required
                          >
                            <option value="">Select Category</option>
                            <option value="food">Food & Dining</option>
                            <option value="transport">Transportation</option>
                            <option value="housing">Housing & Utilities</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="entertainment">Entertainment</option>
                            <option value="shopping">Shopping</option>
                            <option value="education">Education</option>
                            <option value="travel">Travel</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="expenseDate" className="form-label">Date</label>
                          <input
                            type="date"
                            id="expenseDate"
                            className="form-control"
                            value={expenseForm.date}
                            onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>
                        <div className="col-12">
                          <label htmlFor="expenseDescription" className="form-label">Description</label>
                          <textarea
                            id="expenseDescription"
                            className="form-control"
                            rows="3"
                            value={expenseForm.description}
                            onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Additional details about this expense..."
                          />
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowExpenseForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-danger"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Adding...
                          </>
                        ) : (
                          'Add Expense'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
