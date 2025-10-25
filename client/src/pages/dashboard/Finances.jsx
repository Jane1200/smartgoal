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

  // Real-time automation states
  const [autoRefresh, setAutoRefresh] = useState(true);

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

  // Real-time auto-refresh with polling
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      console.log('Auto-refreshing finance data...');
      fetchFinanceData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, viewMode]);



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

  // Get category type for 50/30/20 rule
  const getCategoryType = (category) => {
    const needs = ['housing', 'food', 'transport', 'healthcare'];
    const wants = ['entertainment', 'shopping', 'travel'];
    const savings = ['education'];
    
    if (needs.includes(category)) return { type: 'Needs', emoji: '🏠', badge: 'primary' };
    if (wants.includes(category)) return { type: 'Wants', emoji: '🎭', badge: 'warning' };
    if (savings.includes(category)) return { type: 'Savings', emoji: '📚', badge: 'success' };
    return { type: 'Other', emoji: '📌', badge: 'secondary' };
  };

  // Categorize expenses into Needs, Wants, and Savings (50/30/20 rule)
  const categorizeExpensesByType = (expenseEntries) => {
    const needs = ['housing', 'food', 'transport', 'healthcare']; // Essential expenses
    const wants = ['entertainment', 'shopping', 'travel']; // Non-essential expenses
    const savings = ['education']; // Investment in future
    
    const needsExpenses = expenseEntries.filter(entry => needs.includes(entry.category));
    const wantsExpenses = expenseEntries.filter(entry => wants.includes(entry.category));
    const savingsExpenses = expenseEntries.filter(entry => savings.includes(entry.category));
    const otherExpenses = expenseEntries.filter(entry => entry.category === 'other');
    
    const needsTotal = needsExpenses.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const wantsTotal = wantsExpenses.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const savingsTotal = savingsExpenses.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const otherTotal = otherExpenses.reduce((sum, entry) => sum + (entry.amount || 0), 0);
    
    return {
      needs: { total: needsTotal, entries: needsExpenses },
      wants: { total: wantsTotal, entries: wantsExpenses },
      savings: { total: savingsTotal, entries: savingsExpenses },
      other: { total: otherTotal, entries: otherExpenses }
    };
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

    // Get current month expenses for 50/30/20 analysis
    const currentMonthExpenses = expenseEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
    });

    // Categorize expenses by type (Needs/Wants/Savings)
    const categorized = categorizeExpensesByType(currentMonthExpenses);
    
    // Calculate 50/30/20 percentages
    if (monthlyIncome > 0) {
      const needsPercentage = (categorized.needs.total / monthlyIncome) * 100;
      const wantsPercentage = (categorized.wants.total / monthlyIncome) * 100;
      const actualSavings = monthlyIncome - monthlyExpenses;
      const savingsPercentage = (actualSavings / monthlyIncome) * 100;
      
      // Alert if needs exceed 50%
      if (needsPercentage > 50) {
        alerts.push({
          type: 'warning',
          title: '50/30/20 Rule: Needs Alert',
          message: `Your essential expenses (${needsPercentage.toFixed(1)}%) exceed the recommended 50% of income. Consider ways to reduce housing, food, or transport costs.`,
          icon: '🏠'
        });
      }
      
      // Alert if wants exceed 30%
      if (wantsPercentage > 30) {
        const excessWants = categorized.wants.total - (monthlyIncome * 0.30);
        alerts.push({
          type: 'warning',
          title: '50/30/20 Rule: Wants Alert',
          message: `Your discretionary spending (${wantsPercentage.toFixed(1)}%) exceeds the recommended 30%. You could save ₹${excessWants.toLocaleString()} by reducing entertainment, shopping, or travel expenses.`,
          icon: '🎭'
        });
        
        // Provide specific suggestions for reducing wants
        if (categorized.wants.entries.length > 0) {
          const categoryTotals = {};
          categorized.wants.entries.forEach(entry => {
            categoryTotals[entry.category] = (categoryTotals[entry.category] || 0) + (entry.amount || 0);
          });
          
          const topWantCategory = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0];
          if (topWantCategory) {
            suggestions.push({
              type: 'info',
              title: 'Reduce Non-Essential Spending',
              message: `Your highest discretionary expense is ${topWantCategory[0]} (₹${topWantCategory[1].toLocaleString()}). Consider cutting back here to increase savings.`,
              icon: '✂️'
            });
          }
        }
      }
      
      // Alert if savings below 20%
      if (savingsPercentage < 20) {
        const targetSavings = monthlyIncome * 0.20;
        const savingsGap = targetSavings - actualSavings;
        alerts.push({
          type: 'danger',
          title: '50/30/20 Rule: Savings Alert',
          message: `Your savings rate (${savingsPercentage.toFixed(1)}%) is below the recommended 20%. You need to save ₹${savingsGap.toLocaleString()} more to reach your target.`,
          icon: '💰'
        });
        
        // Suggest specific areas to cut
        if (categorized.wants.total > 0) {
          suggestions.push({
            type: 'tip',
            title: 'Increase Savings Goal',
            message: `You're spending ₹${categorized.wants.total.toLocaleString()} on wants. Reducing this by ${Math.min(100, (savingsGap / categorized.wants.total * 100)).toFixed(0)}% would help you reach the 20% savings target.`,
            icon: '🎯'
          });
        }
      } else {
        suggestions.push({
          type: 'success',
          title: 'Great Savings Rate!',
          message: `You're saving ${savingsPercentage.toFixed(1)}% of your income, which meets or exceeds the 20% target. Keep up the good work!`,
          icon: '🌟'
        });
      }
    }

    // Check for expense alerts
    if (monthlyExpenses > monthlyIncome && monthlyIncome > 0) {
      const overspend = monthlyExpenses - monthlyIncome;
      alerts.push({
        type: 'danger',
        title: 'Monthly Overspending Alert!',
        message: `You're spending ₹${overspend.toLocaleString()} more than you earn this month. Review your expenses immediately.`,
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
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .finance-card-animate {
          transition: all 0.3s ease-in-out;
        }
        .finance-card-animate:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
      `}</style>
      <div className="container-xxl py-4">
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="h3 mb-1">My Finances</h1>
                <p className="text-muted mb-0">Track your income, expenses, and savings</p>
              </div>
              <div className="d-flex gap-2 align-items-center">
                {/* Auto-refresh toggle */}
              <button
                type="button"
                className={`btn btn-sm ${autoRefresh ? 'btn-success' : 'btn-outline-secondary'}`}
                onClick={() => setAutoRefresh(!autoRefresh)}
                title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {autoRefresh ? (
                    <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                  ) : (
                    <path d="M18 6L6 18M6 6l12 12"/>
                  )}
                </svg>
              </button>

              {/* View mode toggle */}
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === 'all-time' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('all-time')}
                >
                  {viewMode === 'all-time' && <span className="me-1">✓</span>}
                  All Time
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${viewMode === 'current-month' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('current-month')}
                >
                  {viewMode === 'current-month' && <span className="me-1">✓</span>}
                  Current Month
                </button>
              </div>
            </div>
          </div>

          {/* Financial Overview */}
          <div className="row g-4 mb-4" style={{ display: 'flex', flexWrap: 'nowrap' }}>
            <div style={{ flex: '0 0 20%' }}>
              <div className="card text-center finance-card-animate">
                <div className="card-body">
                  <div className="text-success mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="6" width="20" height="12" rx="2"/>
                      <path d="M6 10h12"/>
                      <path d="M6 14h12"/>
                      <circle cx="12" cy="12" r="2"/>
                    </svg>
                  </div>
                  <h4 className="text-success">
                    ₹{(viewMode === 'all-time' ? financeData.totalIncome : financeData.monthlyIncome)?.toLocaleString() || '0'}
                  </h4>
                  <p className="text-muted mb-0">
                    {viewMode === 'all-time' ? 'Total Income (All Time)' : 'Current Month Income'}
                    {viewMode === 'current-month' && (
                      <small className="text-info d-block mt-1">
                        📅 {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </small>
                    )}
                    {viewMode === 'all-time' && (
                      <small className="text-success d-block mt-1">
                        💰 From {incomeEntries.length} income entries
                      </small>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ flex: '0 0 20%' }}>
              <div className="card text-center finance-card-animate">
                <div className="card-body">
                  <div className="text-danger mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="6" width="20" height="12" rx="2"/>
                      <path d="M6 10h12"/>
                      <path d="M6 14h12"/>
                      <circle cx="12" cy="12" r="2"/>
                    </svg>
                  </div>
                  <h4 className="text-danger">
                    ₹{(viewMode === 'all-time' ? financeData.totalExpenses : financeData.monthlyExpense)?.toLocaleString() || '0'}
                  </h4>
                  <p className="text-muted mb-0">
                    {viewMode === 'all-time' ? 'Total Expenses (All Time)' : 'Current Month Expenses'}
                    {viewMode === 'current-month' && (
                      <small className="text-info d-block mt-1">
                        📅 {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </small>
                    )}
                    {viewMode === 'all-time' && (
                      <small className="text-danger d-block mt-1">
                        💸 From {expenseEntries.length} expense entries
                      </small>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ flex: '0 0 20%' }}>
              <div className="card text-center finance-card-animate">
                <div className="card-body">
                  <div className="text-primary mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <h4 className="text-primary">
                    ₹{(viewMode === 'all-time' ? financeData.totalSavings : financeData.monthlySavings)?.toLocaleString() || '0'}
                  </h4>
                  <p className="text-muted mb-0">
                    {viewMode === 'all-time' ? 'Total Savings (All Time)' : 'Current Month Savings'}
                    {viewMode === 'current-month' && (
                      <small className="text-info d-block mt-1">
                        📅 {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </small>
                    )}
                    {viewMode === 'all-time' && (
                      <small className="text-primary d-block mt-1">
                        💎 Income - Expenses
                      </small>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ flex: '0 0 20%' }}>
              <div className="card text-center finance-card-animate">
                <div className="card-body">
                  <div className="text-info mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <h4 className="text-info">
                    ₹{financeData.monthlySavings?.toLocaleString() || '0'}
                  </h4>
                  <p className="text-muted mb-0">Current Month Savings</p>
                  <small className="text-info d-block mt-1">
                    📅 {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </small>
                </div>
              </div>
            </div>
            <div style={{ flex: '0 0 20%' }}>
              <div className="card text-center finance-card-animate">
                <div className="card-body">
                  <div className="text-warning mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                  <h4 className="text-warning">
                    {(viewMode === 'all-time' ? financeData.totalSavingsRate : financeData.monthlySavingsRate)?.toFixed(1) || '0.0'}%
                  </h4>
                  <p className="text-muted mb-0">
                    {viewMode === 'all-time' ? 'Overall Savings Rate' : 'Monthly Savings Rate'}
                  </p>
                  <div className="mt-2">
                    <div className="progress" style={{ height: '6px' }}>
                      <div 
                        className={`progress-bar ${
                          ((viewMode === 'all-time' ? financeData.totalSavingsRate : financeData.monthlySavingsRate) || 0) >= 20 ? 'bg-success' :
                          ((viewMode === 'all-time' ? financeData.totalSavingsRate : financeData.monthlySavingsRate) || 0) >= 10 ? 'bg-warning' : 'bg-danger'
                        }`}
                        style={{ width: `${Math.min(100, (viewMode === 'all-time' ? financeData.totalSavingsRate : financeData.monthlySavingsRate) || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                  <small className="text-muted d-block mt-1">
                    {((viewMode === 'all-time' ? financeData.totalSavingsRate : financeData.monthlySavingsRate) || 0) >= 20 ? 'Excellent!' :
                     ((viewMode === 'all-time' ? financeData.totalSavingsRate : financeData.monthlySavingsRate) || 0) >= 10 ? 'Good' :
                     ((viewMode === 'all-time' ? financeData.totalSavingsRate : financeData.monthlySavingsRate) || 0) >= 5 ? 'Fair' : 'Needs improvement'}
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* 50/30/20 Budget Breakdown */}
          {financeData.monthlyIncome > 0 && (
            <div className="row g-4 mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header">
                    <div className="d-flex align-items-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      <h5 className="mb-0">50/30/20 Budget Rule Analysis</h5>
                    </div>
                    <small className="text-muted">Recommended: 50% Needs, 30% Wants, 20% Savings</small>
                  </div>
                  <div className="card-body">
                    {(() => {
                      const currentDate = new Date();
                      const currentMonth = currentDate.getMonth();
                      const currentYear = currentDate.getFullYear();
                      
                      const currentMonthExpenses = expenseEntries.filter(entry => {
                        const entryDate = new Date(entry.date);
                        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
                      });
                      
                      const categorized = categorizeExpensesByType(currentMonthExpenses);
                      const monthlyIncome = financeData.monthlyIncome || 0;
                      const monthlyExpense = financeData.monthlyExpense || 0;
                      const actualSavings = monthlyIncome - monthlyExpense;
                      
                      const needsPercentage = monthlyIncome > 0 ? (categorized.needs.total / monthlyIncome) * 100 : 0;
                      const wantsPercentage = monthlyIncome > 0 ? (categorized.wants.total / monthlyIncome) * 100 : 0;
                      const savingsPercentage = monthlyIncome > 0 ? (actualSavings / monthlyIncome) * 100 : 0;
                      
                      const targetNeeds = monthlyIncome * 0.50;
                      const targetWants = monthlyIncome * 0.30;
                      const targetSavings = monthlyIncome * 0.20;
                      
                      return (
                        <>
                          <div className="row g-4 mb-4">
                            {/* Needs */}
                            <div className="col-md-4">
                              <div className="card border-primary">
                                <div className="card-body">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h6 className="mb-0">🏠 Needs (Essential)</h6>
                                    <span className={`badge ${needsPercentage <= 50 ? 'bg-success' : 'bg-warning'}`}>
                                      {needsPercentage.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="mb-2">
                                    <div className="d-flex justify-content-between small text-muted mb-1">
                                      <span>Current: ₹{categorized.needs.total.toLocaleString()}</span>
                                      <span>Target: ₹{targetNeeds.toLocaleString()}</span>
                                    </div>
                                    <div className="progress" style={{ height: '8px' }}>
                                      <div 
                                        className={`progress-bar ${needsPercentage <= 50 ? 'bg-success' : 'bg-warning'}`}
                                        style={{ width: `${Math.min(100, (categorized.needs.total / targetNeeds) * 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <small className="text-muted">
                                    Housing, Food, Transport, Healthcare
                                  </small>
                                  {needsPercentage > 50 && (
                                    <div className="alert alert-warning mt-2 mb-0 py-1 px-2 small">
                                      ⚠️ Exceeds 50% target
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Wants */}
                            <div className="col-md-4">
                              <div className="card border-info">
                                <div className="card-body">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h6 className="mb-0">🎭 Wants (Discretionary)</h6>
                                    <span className={`badge ${wantsPercentage <= 30 ? 'bg-success' : 'bg-warning'}`}>
                                      {wantsPercentage.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="mb-2">
                                    <div className="d-flex justify-content-between small text-muted mb-1">
                                      <span>Current: ₹{categorized.wants.total.toLocaleString()}</span>
                                      <span>Target: ₹{targetWants.toLocaleString()}</span>
                                    </div>
                                    <div className="progress" style={{ height: '8px' }}>
                                      <div 
                                        className={`progress-bar ${wantsPercentage <= 30 ? 'bg-success' : 'bg-warning'}`}
                                        style={{ width: `${Math.min(100, (categorized.wants.total / targetWants) * 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <small className="text-muted">
                                    Entertainment, Shopping, Travel
                                  </small>
                                  {wantsPercentage > 30 && (
                                    <div className="alert alert-warning mt-2 mb-0 py-1 px-2 small">
                                      ⚠️ Exceeds 30% target - Consider reducing
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Savings */}
                            <div className="col-md-4">
                              <div className="card border-success">
                                <div className="card-body">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h6 className="mb-0">💰 Savings & Goals</h6>
                                    <span className={`badge ${savingsPercentage >= 20 ? 'bg-success' : 'bg-danger'}`}>
                                      {savingsPercentage.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="mb-2">
                                    <div className="d-flex justify-content-between small text-muted mb-1">
                                      <span>Current: ₹{actualSavings.toLocaleString()}</span>
                                      <span>Target: ₹{targetSavings.toLocaleString()}</span>
                                    </div>
                                    <div className="progress" style={{ height: '8px' }}>
                                      <div 
                                        className={`progress-bar ${savingsPercentage >= 20 ? 'bg-success' : 'bg-danger'}`}
                                        style={{ width: `${Math.min(100, (actualSavings / targetSavings) * 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <small className="text-muted">
                                    Emergency Fund, Goals, Investments
                                  </small>
                                  {savingsPercentage < 20 && (
                                    <div className="alert alert-danger mt-2 mb-0 py-1 px-2 small">
                                      ⚠️ Below 20% target - Increase savings
                                    </div>
                                  )}
                                  {savingsPercentage >= 20 && (
                                    <div className="alert alert-success mt-2 mb-0 py-1 px-2 small">
                                      ✅ Great job! Meeting savings goal
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Budget Summary */}
                          <div className="alert alert-info mb-0">
                            <div className="d-flex align-items-start gap-2">
                              <div className="fs-4">💡</div>
                              <div className="flex-grow-1">
                                <h6 className="alert-heading mb-2">SmartGoal Budget Planner Insights</h6>
                                <p className="mb-2 small">
                                  Based on your monthly income of <strong>₹{monthlyIncome.toLocaleString()}</strong>, 
                                  here's how your spending compares to the 50/30/20 rule:
                                </p>
                                <ul className="mb-0 small">
                                  {needsPercentage > 50 && (
                                    <li>Your essential expenses are <strong>{(needsPercentage - 50).toFixed(1)}%</strong> above the recommended level. Look for ways to reduce housing, food, or transport costs.</li>
                                  )}
                                  {wantsPercentage > 30 && (
                                    <li>You're spending <strong>₹{(categorized.wants.total - targetWants).toLocaleString()}</strong> more on discretionary items than recommended. Cutting back on entertainment, shopping, or travel could boost your savings.</li>
                                  )}
                                  {savingsPercentage < 20 && (
                                    <li>To reach the 20% savings target, you need to save an additional <strong>₹{(targetSavings - actualSavings).toLocaleString()}</strong> per month. This will help you achieve your financial goals faster!</li>
                                  )}
                                  {needsPercentage <= 50 && wantsPercentage <= 30 && savingsPercentage >= 20 && (
                                    <li>Excellent! You're following the 50/30/20 rule perfectly. Keep up the great financial discipline!</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expense Alerts */}
          {expenseAlerts.length > 0 && (
            <div className="row g-4 mb-4">
              <div className="col-12">
                <div className="row g-3">
                  {expenseAlerts.map((alert, index) => (
                    <div key={index} className="col-md-6">
                      <div className={`alert alert-${alert.type === 'tip' ? 'info' : alert.type} d-flex align-items-start mb-0`}>
                        <div className="me-3 fs-5">{alert.icon}</div>
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
                            <th>Type</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expenseEntries.map((entry, index) => {
                            const categoryType = getCategoryType(entry.category);
                            return (
                            <tr key={entry._id}>
                              <td>{index + 1}</td>
                              <td>{new Date(entry.date).toLocaleDateString()}</td>
                              <td><small className="text-capitalize">{entry.category.replace('_', ' ')}</small></td>
                              <td>
                                <span className={`badge bg-${categoryType.badge}`}>
                                  {categoryType.emoji} {categoryType.type}
                                </span>
                              </td>
                              <td><small>{entry.description || '-'}</small></td>
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
                            );
                          })}
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
                            min={(() => {
                              const date = new Date();
                              date.setDate(1);
                              return date.toISOString().split('T')[0];
                            })()}
                            max={new Date().toISOString().split('T')[0]}
                            required
                          />
                          <small className="text-muted d-block mt-1">📅 Current month only (1st to today)</small>
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
                            <optgroup label="🏠 Needs (Essential - 50%)">
                              <option value="housing">Housing & Utilities</option>
                              <option value="food">Food & Dining</option>
                              <option value="transport">Transportation</option>
                              <option value="healthcare">Healthcare</option>
                            </optgroup>
                            <optgroup label="🎭 Wants (Discretionary - 30%)">
                              <option value="entertainment">Entertainment</option>
                              <option value="shopping">Shopping</option>
                              <option value="travel">Travel</option>
                            </optgroup>
                            <optgroup label="📚 Savings & Investment (20%)">
                              <option value="education">Education</option>
                            </optgroup>
                            <optgroup label="Other">
                              <option value="other">Other</option>
                            </optgroup>
                          </select>
                          <small className="text-muted">Choose the category that best fits your expense</small>
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="expenseDate" className="form-label">Date</label>
                          <input
                            type="date"
                            id="expenseDate"
                            className="form-control"
                            value={expenseForm.date}
                            onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                            min={(() => {
                              const date = new Date();
                              date.setDate(1);
                              return date.toISOString().split('T')[0];
                            })()}
                            max={new Date().toISOString().split('T')[0]}
                            required
                          />
                          <small className="text-muted d-block mt-1">📅 Current month only (1st to today)</small>
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
    </>
  );
}
