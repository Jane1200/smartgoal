import GoalsManager from "@/sections/GoalsManager.jsx";
import FinanceDataView from "@/components/FinanceDataView.jsx";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import { 
  getPriorityGoals, 
  hasEmergencyFund, 
  calculateEmergencyFundTarget,
  getCategoryInfo,
  getPriorityInfo,
  sortGoalsByPriority
} from "@/utils/goalPriority.js";

export default function GoalsPage() {
  const authContext = useAuth();
  const user = authContext?.user;
  const navigate = useNavigate();

  // Redirect if not authenticated
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if not a goal setter
  if (user?.profile?.role !== "goal_setter") {
    return <Navigate to="/dashboard-redirect" replace />;
  }

  // Finance data state
  const [viewMode, setViewMode] = useState('all-time');
  const [financeData, setFinanceData] = useState({
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlySavings: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0
  });
  const [financeLoading, setFinanceLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [showEmergencyFundSuggestion, setShowEmergencyFundSuggestion] = useState(false);
  
  // Automation state
  const [autoTransfers, setAutoTransfers] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [showAutomation, setShowAutomation] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [formData, setFormData] = useState({
    goalId: "",
    amount: "",
    frequency: "monthly"
  });

  // Helper function to validate and format amount
  const validateAmount = (amount) => {
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof amount === 'number') {
      return isNaN(amount) ? 0 : amount;
    }
    return 0;
  };

  // Load finance data
  const loadFinanceData = async () => {
    try {
      setFinanceLoading(true);
      const [summaryResponse, incomeResponse, expenseResponse] = await Promise.allSettled([
        api.get(viewMode === 'current-month' ? "/finance/summary" : "/finance/summary?all=true"),
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

      let incomeEntries = allIncomeEntries;
      let expenseEntries = allExpenseEntries;

      if (viewMode === 'current-month') {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        incomeEntries = allIncomeEntries.filter(entry => {
          if (!entry.date) return false;
          const entryDate = new Date(entry.date);
          return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        });

        expenseEntries = allExpenseEntries.filter(entry => {
          if (!entry.date) return false;
          const entryDate = new Date(entry.date);
          return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        });
      }

      let totalIncome = 0;
      let totalExpenses = 0;
      let monthlyIncome = 0;
      let monthlyExpense = 0;

      if (viewMode === 'current-month') {
        totalIncome = incomeEntries.reduce((sum, entry) => {
          const amount = validateAmount(entry.amount);
          return sum + amount;
        }, 0);
        totalExpenses = expenseEntries.reduce((sum, entry) => {
          const amount = validateAmount(entry.amount);
          return sum + amount;
        }, 0);
        monthlyIncome = totalIncome;
        monthlyExpense = totalExpenses;
      } else {
        totalIncome = incomeEntries.reduce((sum, entry) => {
          const amount = validateAmount(entry.amount);
          return sum + amount;
        }, 0);
        totalExpenses = expenseEntries.reduce((sum, entry) => {
          const amount = validateAmount(entry.amount);
          return sum + amount;
        }, 0);
        
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        monthlyIncome = allIncomeEntries
          .filter(entry => {
            if (!entry.date) return false;
            const entryDate = new Date(entry.date);
            return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
          })
          .reduce((sum, entry) => {
            const amount = validateAmount(entry.amount);
            return sum + amount;
          }, 0);
          
        monthlyExpense = allExpenseEntries
          .filter(entry => {
            if (!entry.date) return false;
            const entryDate = new Date(entry.date);
            return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
          })
          .reduce((sum, entry) => {
            const amount = validateAmount(entry.amount);
            return sum + amount;
          }, 0);
      }

      const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);
      const totalSavings = Math.max(0, totalIncome - totalExpenses);

      setFinanceData({
        monthlyIncome,
        monthlyExpense,
        monthlySavings,
        totalIncome,
        totalExpenses,
        totalSavings
      });
    } catch (error) {
      console.error("Failed to load finance data:", error);
    } finally {
      setFinanceLoading(false);
    }
  };

  // Check if goal creation should be enabled based on savings
  const isGoalCreationEnabled = () => {
    return financeData.totalSavings >= 100;
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Load goals
  const loadGoals = async () => {
    try {
      setGoalsLoading(true);
      const { data } = await api.get("/goals");
      setGoals(data);
      
      // Check if emergency fund suggestion should be shown
      if (financeData.monthlyExpense > 0 && !hasEmergencyFund(data)) {
        setShowEmergencyFundSuggestion(true);
      } else {
        setShowEmergencyFundSuggestion(false);
      }
    } catch (error) {
      console.error("Failed to load goals:", error);
    } finally {
      setGoalsLoading(false);
    }
  };

  // Load automation data
  const loadAutomationData = async () => {
    try {
      const [transfersRes, historyRes] = await Promise.all([
        api.get("/auto-transfer"),
        api.get("/auto-transfer/history?limit=20")
      ]);

      setAutoTransfers(transfersRes.data);
      setTransferHistory(historyRes.data);
    } catch (error) {
      console.error("Load automation data error:", error);
      toast.error("Failed to load automation data");
    }
  };

  // Automation handlers
  const handleAddTransfer = async (e) => {
    e.preventDefault();

    if (!formData.goalId || !formData.amount) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await api.post("/auto-transfer", formData);
      toast.success("Auto-transfer created successfully!");
      setShowAddModal(false);
      setFormData({ goalId: "", amount: "", frequency: "monthly" });
      loadAutomationData();
    } catch (error) {
      console.error("Create auto-transfer error:", error);
      toast.error(error.response?.data?.message || "Failed to create auto-transfer");
    }
  };

  const handleUpdateTransfer = async (e) => {
    e.preventDefault();

    try {
      await api.put(`/auto-transfer/${editingTransfer._id}`, {
        amount: formData.amount,
        frequency: formData.frequency,
        isActive: formData.isActive
      });
      toast.success("Auto-transfer updated successfully!");
      setEditingTransfer(null);
      setFormData({ goalId: "", amount: "", frequency: "monthly" });
      loadAutomationData();
    } catch (error) {
      console.error("Update auto-transfer error:", error);
      toast.error(error.response?.data?.message || "Failed to update auto-transfer");
    }
  };

  const handleToggleActive = async (transfer) => {
    try {
      await api.put(`/auto-transfer/${transfer._id}`, {
        isActive: !transfer.isActive
      });
      toast.success(`Auto-transfer ${!transfer.isActive ? "activated" : "paused"}`);
      loadAutomationData();
    } catch (error) {
      console.error("Toggle auto-transfer error:", error);
      toast.error("Failed to update auto-transfer");
    }
  };

  const handleDeleteTransfer = async (transferId) => {
    if (!window.confirm("Are you sure you want to delete this auto-transfer?")) {
      return;
    }

    try {
      await api.delete(`/auto-transfer/${transferId}`);
      toast.success("Auto-transfer deleted successfully!");
      loadAutomationData();
    } catch (error) {
      console.error("Delete auto-transfer error:", error);
      toast.error("Failed to delete auto-transfer");
    }
  };

  const handleExecuteTransfers = async () => {
    if (!window.confirm("Execute all pending automated transfers now?")) {
      return;
    }

    setExecuting(true);
    try {
      const { data } = await api.post("/auto-transfer/execute");
      toast.success(`${data.executed} transfer(s) executed successfully!`);
      loadAutomationData();
      loadGoals();
      loadFinanceData();
    } catch (error) {
      console.error("Execute transfers error:", error);
      toast.error(error.response?.data?.message || "Failed to execute transfers");
    } finally {
      setExecuting(false);
    }
  };

  const openAddModal = () => {
    setFormData({ goalId: "", amount: "", frequency: "monthly" });
    setShowAddModal(true);
  };

  const openEditModal = (transfer) => {
    setFormData({
      goalId: transfer.goalId._id,
      amount: transfer.amount,
      frequency: transfer.frequency,
      isActive: transfer.isActive
    });
    setEditingTransfer(transfer);
  };

  const getAvailableGoals = () => {
    const transferGoalIds = autoTransfers.map(t => t.goalId._id);
    return goals.filter(g => 
      !transferGoalIds.includes(g._id) && 
      g.status !== "completed" && 
      g.status !== "archived"
    );
  };

  const getTotalMonthlyTransfers = () => {
    return autoTransfers
      .filter(t => t.isActive && t.frequency === "monthly")
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Create emergency fund goal
  const createEmergencyFundGoal = async () => {
    try {
      const targetAmount = calculateEmergencyFundTarget(financeData.monthlyExpense);
      const payload = {
        title: "Emergency Fund",
        description: "Build a safety net for unexpected expenses (3-6 months of expenses)",
        targetAmount,
        currentAmount: Math.max(0, financeData.totalSavings || 0),
        category: "emergency_fund",
        priority: 1,
        status: "in_progress",
        isAutoSuggested: true
      };
      
      await api.post("/goals", payload);
      toast.success("Emergency Fund goal created! This is your top priority.");
      loadGoals();
      loadFinanceData();
    } catch (error) {
      console.error("Failed to create emergency fund goal:", error);
      toast.error("Failed to create emergency fund goal");
    }
  };

  // Function to refresh finance data
  const refreshFinanceData = () => {
    loadFinanceData();
    loadGoals();
  };

  useEffect(() => {
    loadFinanceData();
    loadGoals();
    loadAutomationData();
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [viewMode]);
  
  useEffect(() => {
    // Check emergency fund suggestion when finance data changes
    if (financeData.monthlyExpense > 0 && goals.length > 0) {
      setShowEmergencyFundSuggestion(!hasEmergencyFund(goals));
    }
  }, [financeData, goals]);

  return (
    <div className="container-xxl py-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-1">My Goals</h1>
          <p className="text-muted mb-0">Track and manage your personal goals</p>
        </div>
      </div>
      
      {/* Finance Data View Section */}
      <FinanceDataView 
        viewMode={viewMode}
        setViewMode={setViewMode}
        financeData={financeData}
        setFinanceData={setFinanceData}
        isGoalCreationEnabled={isGoalCreationEnabled}
        refreshFinanceData={refreshFinanceData}
        financeLoading={financeLoading}
      />
      
      {/* Emergency Fund Suggestion Banner */}
      {showEmergencyFundSuggestion && financeData.monthlyExpense > 0 && (
        <div className="alert alert-warning alert-dismissible fade show mb-4" role="alert">
          <div className="d-flex align-items-start">
            <div className="me-3" style={{ fontSize: '2rem' }}>🚨</div>
            <div className="flex-grow-1">
              <h5 className="alert-heading mb-2">Build Your Emergency Fund First!</h5>
              <p className="mb-2">
                Financial experts recommend having <strong>3-6 months of expenses</strong> saved for emergencies. 
                Based on your monthly expenses of <strong>{formatCurrency(financeData.monthlyExpense)}</strong>, 
                we recommend an emergency fund of <strong>{formatCurrency(calculateEmergencyFundTarget(financeData.monthlyExpense))}</strong>.
              </p>
              <p className="mb-3 small text-muted">
                This safety net protects you from unexpected job loss, medical emergencies, or urgent repairs. 
                It's the foundation of financial security and should be your top priority.
              </p>
              <button 
                className="btn btn-warning btn-sm"
                onClick={createEmergencyFundGoal}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="16"/>
                  <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                Create Emergency Fund Goal
              </button>
            </div>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setShowEmergencyFundSuggestion(false)}
              aria-label="Close"
            ></button>
          </div>
        </div>
      )}

      {/* Priority Goals Section */}
      {!goalsLoading && goals.length > 0 && getPriorityGoals(goals).length > 0 && (
        <div className="card mb-4 border-danger">
          <div className="card-header bg-danger bg-opacity-10 border-danger">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <span style={{ fontSize: '1.5rem' }} className="me-2">🎯</span>
                <div>
                  <h5 className="mb-0">Priority Goals</h5>
                  <small className="text-muted">Focus on these critical goals first</small>
                </div>
              </div>
              <span className="badge bg-danger">{getPriorityGoals(goals).length}</span>
            </div>
          </div>
          <div className="card-body">
            <div className="alert alert-info mb-3">
              <small>
                <strong>💡 Smart Tip:</strong> Allocate at least <strong>60% of your monthly savings</strong> to these priority goals. 
                They build your financial foundation and protect you from future risks.
              </small>
            </div>
            <div className="row g-3">
              {sortGoalsByPriority(getPriorityGoals(goals)).map((goal) => {
                const categoryInfo = getCategoryInfo(goal.category);
                const priorityInfo = getPriorityInfo(goal.priority);
                const progress = goal.targetAmount > 0 
                  ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) 
                  : 0;
                
                return (
                  <div key={goal._id} className="col-md-6">
                    <div className="card h-100 border-start border-4 border-danger">
                      <div className="card-body">
                        <div className="d-flex align-items-start justify-content-between mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <span style={{ fontSize: '1.5rem' }}>{categoryInfo.icon}</span>
                            <div>
                              <h6 className="mb-0">{goal.title}</h6>
                              <small className="text-muted">{categoryInfo.label}</small>
                            </div>
                          </div>
                          <span 
                            className={`badge ${priorityInfo.color}`}
                            title={priorityInfo.label}
                          >
                            {priorityInfo.badge}
                          </span>
                        </div>
                        
                        {goal.description && (
                          <p className="small text-muted mb-2">{goal.description}</p>
                        )}
                        
                        <div className="mb-2">
                          <div className="d-flex justify-content-between mb-1">
                            <small className="text-muted">Progress</small>
                            <small className="fw-bold">{progress.toFixed(0)}%</small>
                          </div>
                          <div className="progress" style={{ height: '8px' }}>
                            <div 
                              className="progress-bar bg-danger" 
                              role="progressbar" 
                              style={{ width: `${progress}%` }}
                              aria-valuenow={progress} 
                              aria-valuemin="0" 
                              aria-valuemax="100"
                            ></div>
                          </div>
                        </div>
                        
                        <div className="d-flex justify-content-between">
                          <div>
                            <small className="text-muted d-block">Current</small>
                            <strong>{formatCurrency(goal.currentAmount)}</strong>
                          </div>
                          <div className="text-end">
                            <small className="text-muted d-block">Target</small>
                            <strong>{formatCurrency(goal.targetAmount)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Goal Automation Section */}
      {!goalsLoading && goals.length > 0 && (
        <div className="card mb-4">
          <div 
            className="card-header bg-success bg-opacity-10 border-success"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowAutomation(!showAutomation)}
          >
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <span className="fs-4">🤖</span>
                <div>
                  <h5 className="mb-0">Goal Automation</h5>
                  <small className="text-muted">Automate your savings transfers to goals</small>
                </div>
              </div>
              <div className="d-flex align-items-center gap-3">
                {autoTransfers.length > 0 && (
                  <span className="badge bg-success">
                    {autoTransfers.filter(t => t.isActive).length} Active
                  </span>
                )}
                <button className="btn btn-sm btn-link text-decoration-none p-0">
                  {showAutomation ? '▼ Hide' : '▶ Show'}
                </button>
              </div>
            </div>
          </div>

          {showAutomation && (
            <div className="card-body">
              {/* Summary Cards */}
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="card bg-light">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small">Active Transfers</p>
                          <h5 className="mb-0">{autoTransfers.filter(t => t.isActive).length}</h5>
                        </div>
                        <div className="text-primary fs-3">✅</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-light">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small">Monthly Total</p>
                          <h5 className="mb-0">{formatCurrency(getTotalMonthlyTransfers())}</h5>
                        </div>
                        <div className="text-success fs-3">💰</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-light">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small">Total Transferred</p>
                          <h5 className="mb-0">
                            {formatCurrency(autoTransfers.reduce((sum, t) => sum + t.totalTransferred, 0))}
                          </h5>
                        </div>
                        <div className="text-info fs-3">📊</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card bg-light">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small">Transfer Count</p>
                          <h5 className="mb-0">
                            {autoTransfers.reduce((sum, t) => sum + t.transferCount, 0)}
                          </h5>
                        </div>
                        <div className="text-warning fs-3">🔄</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex gap-2 mb-4">
                <button 
                  className="btn btn-outline-primary"
                  onClick={handleExecuteTransfers}
                  disabled={executing || autoTransfers.length === 0}
                >
                  {executing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Executing...
                    </>
                  ) : (
                    <>⚡ Execute Now</>
                  )}
                </button>
                <button 
                  className="btn btn-success"
                  onClick={openAddModal}
                  disabled={getAvailableGoals().length === 0}
                >
                  + Add Auto-Transfer
                </button>
              </div>

              {/* Info Banner */}
              <div className="alert alert-info mb-4">
                <div className="d-flex align-items-start gap-2">
                  <div className="fs-5">ℹ️</div>
                  <div>
                    <strong>How Auto-Transfers Work:</strong>
                    <p className="mb-0 mt-1 small">
                      • Automated transfers execute based on your schedule (monthly, weekly, or biweekly)<br/>
                      • Transfers are prioritized by goal priority (Emergency Fund → High Priority → Low Priority)<br/>
                      • If savings are insufficient, higher priority goals get funded first<br/>
                      • Completed goals automatically pause their auto-transfers
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Auto-Transfers Table */}
              <div className="mb-4">
                <h6 className="mb-3">Active Auto-Transfers</h6>
                {autoTransfers.length === 0 ? (
                  <div className="text-center py-4 bg-light rounded">
                    <div className="fs-1 mb-2">🤖</div>
                    <h6>No Auto-Transfers Yet</h6>
                    <p className="text-muted small mb-3">Set up automated transfers to save systematically toward your goals</p>
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={openAddModal}
                      disabled={getAvailableGoals().length === 0}
                    >
                      + Add Your First Auto-Transfer
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-sm">
                      <thead>
                        <tr>
                          <th>Goal</th>
                          <th>Category</th>
                          <th>Priority</th>
                          <th>Amount</th>
                          <th>Frequency</th>
                          <th>Next Transfer</th>
                          <th>Total Transferred</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {autoTransfers.map((transfer) => {
                          const categoryInfo = getCategoryInfo(transfer.goalId.category);
                          const priorityInfo = getPriorityInfo(transfer.goalId.priority);
                          
                          return (
                            <tr key={transfer._id}>
                              <td>
                                <strong>{transfer.goalId.title}</strong>
                                <br/>
                                <small className="text-muted">
                                  {formatCurrency(transfer.goalId.currentAmount)} / {formatCurrency(transfer.goalId.targetAmount)}
                                </small>
                              </td>
                              <td>
                                <span className="badge" style={{ backgroundColor: categoryInfo.color + '20', color: categoryInfo.color }}>
                                  {categoryInfo.icon} {categoryInfo.label}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${priorityInfo.color}`}>
                                  {priorityInfo.badge}
                                </span>
                              </td>
                              <td><strong>{formatCurrency(transfer.amount)}</strong></td>
                              <td>
                                <span className="badge bg-secondary">
                                  {transfer.frequency === "monthly" ? "📅 Monthly" : 
                                   transfer.frequency === "weekly" ? "📆 Weekly" : "📆 Biweekly"}
                                </span>
                              </td>
                              <td><small>{formatDate(transfer.nextTransferDate)}</small></td>
                              <td>
                                {formatCurrency(transfer.totalTransferred)}
                                <br/>
                                <small className="text-muted">({transfer.transferCount} transfers)</small>
                              </td>
                              <td>
                                {transfer.isActive ? (
                                  <span className="badge bg-success">✅ Active</span>
                                ) : (
                                  <span className="badge bg-secondary">⏸️ Paused</span>
                                )}
                              </td>
                              <td>
                                <div className="btn-group btn-group-sm">
                                  <button 
                                    className="btn btn-outline-primary"
                                    onClick={() => openEditModal(transfer)}
                                    title="Edit"
                                  >
                                    ✏️
                                  </button>
                                  <button 
                                    className={`btn btn-outline-${transfer.isActive ? 'warning' : 'success'}`}
                                    onClick={() => handleToggleActive(transfer)}
                                    title={transfer.isActive ? "Pause" : "Resume"}
                                  >
                                    {transfer.isActive ? "⏸️" : "▶️"}
                                  </button>
                                  <button 
                                    className="btn btn-outline-danger"
                                    onClick={() => handleDeleteTransfer(transfer._id)}
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Transfer History */}
              {transferHistory.length > 0 && (
                <div>
                  <h6 className="mb-3">Recent Transfer History</h6>
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Goal</th>
                          <th>Amount</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transferHistory.slice(0, 10).map((history) => (
                          <tr key={history._id}>
                            <td><small>{formatDate(history.transferDate)}</small></td>
                            <td><small>{history.goalId?.title || "Unknown Goal"}</small></td>
                            <td><small>{formatCurrency(history.amount)}</small></td>
                            <td>
                              <span className={`badge bg-${history.type === 'automated' ? 'primary' : 'secondary'}`}>
                                {history.type === 'automated' ? '🤖' : '👤'}
                              </span>
                            </td>
                            <td>
                              {history.status === 'success' && <span className="badge bg-success">✅</span>}
                              {history.status === 'failed' && <span className="badge bg-danger">❌</span>}
                              {history.status === 'skipped' && <span className="badge bg-warning">⏭️</span>}
                            </td>
                            <td>
                              <small className="text-muted">{history.reason || "-"}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <GoalsManager 
        viewMode={viewMode}
        financeData={financeData}
        isGoalCreationEnabled={isGoalCreationEnabled}
        refreshFinanceData={refreshFinanceData}
      />

      {/* Add/Edit Auto-Transfer Modal */}
      {(showAddModal || editingTransfer) && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingTransfer ? "Edit Auto-Transfer" : "Add Auto-Transfer"}
                </h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTransfer(null);
                    setFormData({ goalId: "", amount: "", frequency: "monthly" });
                  }}
                ></button>
              </div>
              <form onSubmit={editingTransfer ? handleUpdateTransfer : handleAddTransfer}>
                <div className="modal-body">
                  {!editingTransfer && (
                    <div className="mb-3">
                      <label className="form-label">Select Goal *</label>
                      <select 
                        className="form-select"
                        value={formData.goalId}
                        onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                        required
                      >
                        <option value="">Choose a goal...</option>
                        {getAvailableGoals().map((goal) => {
                          const categoryInfo = getCategoryInfo(goal.category);
                          const priorityInfo = getPriorityInfo(goal.priority);
                          return (
                            <option key={goal._id} value={goal._id}>
                              {categoryInfo.icon} {goal.title} - {priorityInfo.label}
                            </option>
                          );
                        })}
                      </select>
                      {getAvailableGoals().length === 0 && (
                        <small className="text-muted">All active goals already have auto-transfers</small>
                      )}
                    </div>
                  )}

                  {editingTransfer && (
                    <div className="mb-3">
                      <label className="form-label">Goal</label>
                      <input 
                        type="text"
                        className="form-control"
                        value={editingTransfer.goalId.title}
                        disabled
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Transfer Amount *</label>
                    <div className="input-group">
                      <span className="input-group-text">₹</span>
                      <input 
                        type="number"
                        className="form-control"
                        placeholder="Enter amount"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Frequency *</label>
                    <select 
                      className="form-select"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      required
                    >
                      <option value="monthly">📅 Monthly</option>
                      <option value="biweekly">📆 Biweekly (Every 2 weeks)</option>
                      <option value="weekly">📆 Weekly</option>
                    </select>
                  </div>

                  {editingTransfer && (
                    <div className="mb-3">
                      <div className="form-check form-switch">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id="isActive"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <label className="form-check-label" htmlFor="isActive">
                          Active
                        </label>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingTransfer(null);
                      setFormData({ goalId: "", amount: "", frequency: "monthly" });
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingTransfer ? "Update" : "Create"} Auto-Transfer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



