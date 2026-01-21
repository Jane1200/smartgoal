import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import GoalsManager from "@/sections/GoalsManager.jsx";
import {
  Lightbulb,
  TrendingUp,
  Security,
  School,
  BeachAccess,
  CreditCard,
  Home,
  Savings,
  CheckCircle,
  Close,
  Refresh,
  Add,
} from "@mui/icons-material";

const categoryIcons = {
  emergency_fund: <Security className="text-danger" />,
  investment: <TrendingUp className="text-success" />,
  education: <School className="text-primary" />,
  discretionary: <BeachAccess className="text-info" />,
  debt_repayment: <CreditCard className="text-warning" />,
  essential_purchase: <Home className="text-secondary" />,
  other: <Savings className="text-muted" />
};

const impactColors = {
  high: 'success',
  medium: 'warning',
  low: 'info'
};

const priorityLabels = {
  1: { label: 'Critical', color: 'danger', icon: '🔴' },
  2: { label: 'High', color: 'warning', icon: '🟡' },
  3: { label: 'Medium', color: 'info', icon: '🔵' },
  4: { label: 'Low', color: 'secondary', icon: '⚪' },
  5: { label: 'Very Low', color: 'light', icon: '⚫' }
};

export default function GoalRecommendations({ onGoalCreated, financeData, isGoalCreationEnabled, refreshFinanceData }) {
  const [recommendations, setRecommendations] = useState([]);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());
  const [showCustomForm, setShowCustomForm] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const response = await api.get("/goals/recommendations");
      
      if (response.data.success) {
        setRecommendations(response.data.recommendations || []);
        setFinancialSummary(response.data.financialSummary || null);
        setInsights(response.data.insights || []);
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      toast.error("Failed to load goal recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRecommendation = async (index) => {
    try {
      setCreating(index);
      const response = await api.post(`/goals/recommendations/${index}/accept`);
      
      if (response.data.success) {
        toast.success("Goal created successfully! 🎉");
        
        // Remove from recommendations
        setRecommendations(prev => prev.filter((_, i) => i !== index));
        
        // Notify parent component
        if (onGoalCreated) {
          onGoalCreated(response.data.goal);
        }
      }
    } catch (error) {
      console.error("Failed to create goal:", error);
      toast.error("Failed to create goal from recommendation");
    } finally {
      setCreating(null);
    }
  };

  const handleCustomGoalCreated = () => {
    setShowCustomForm(false);
    if (onGoalCreated) {
      onGoalCreated();
    }
  };

  const handleDismiss = (index) => {
    setDismissed(prev => new Set([...prev, index]));
  };

  const visibleRecommendations = recommendations.filter((_, index) => !dismissed.has(index));

  if (loading) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-2 mb-0">Analyzing your finances...</p>
        </div>
      </div>
    );
  }

  if (visibleRecommendations.length === 0 && insights.length === 0) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center py-5">
          <CheckCircle style={{ fontSize: '64px', opacity: 0.3 }} className="text-success" />
          <h6 className="text-muted mt-3">You're all set!</h6>
          <p className="text-muted small mb-3">
            No new recommendations at this time. Keep tracking your existing goals!
          </p>
          <button className="btn btn-outline-primary btn-sm" onClick={fetchRecommendations}>
            <Refresh fontSize="small" className="me-1" />
            Refresh Recommendations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="goal-recommendations">
      {/* Header with Create Custom Goal Button */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <Lightbulb className="text-warning" style={{ fontSize: '2rem' }} />
              <div>
                <h5 className="mb-0">Smart Goal Recommendations</h5>
                <small className="text-muted">
                  AI-powered suggestions based on your financial data
                </small>
              </div>
            </div>
            <button 
              className="btn btn-outline-primary d-flex align-items-center gap-2"
              onClick={() => setShowCustomForm(!showCustomForm)}
            >
              {showCustomForm ? (
                <>
                  <Close fontSize="small" />
                  Close Form
                </>
              ) : (
                <>
                  <Add fontSize="small" />
                  Create Custom Goal
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Goal Creation Form */}
      {showCustomForm && (
        <div className="mb-4">
          <GoalsManager 
            financeData={financeData}
            isGoalCreationEnabled={isGoalCreationEnabled}
            refreshFinanceData={refreshFinanceData}
            showCreateForm={true}
            createOnly={true}
            onGoalCreated={handleCustomGoalCreated}
          />
        </div>
      )}

      {/* Financial Summary */}
      {financialSummary && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h6 className="mb-3">
              <TrendingUp className="text-success me-2" />
              Your Financial Snapshot
            </h6>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="text-center p-3 bg-success bg-opacity-10 rounded">
                  <small className="text-muted d-block mb-1">Overall Income</small>
                  <div className="h5 mb-0 text-success">
                    ₹{financialSummary.totalIncome?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-center p-3 bg-danger bg-opacity-10 rounded">
                  <small className="text-muted d-block mb-1">Overall Expenses</small>
                  <div className="h5 mb-0 text-danger">
                    ₹{financialSummary.totalExpenses?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-center p-3 bg-primary bg-opacity-10 rounded">
                  <small className="text-muted d-block mb-1">Overall Balance</small>
                  <div className="h5 mb-0 text-primary">
                    ₹{financialSummary.totalSavings?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mb-4">
          {insights.map((insight, index) => (
            <div 
              key={index} 
              className={`alert alert-${insight.type === 'positive' ? 'success' : insight.type === 'warning' ? 'warning' : insight.type === 'critical' ? 'danger' : 'info'} d-flex align-items-start`}
            >
              <span className="me-2" style={{ fontSize: '1.5rem' }}>{insight.icon}</span>
              <div className="flex-grow-1">{insight.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {visibleRecommendations.length > 0 && (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex align-items-center gap-2 mb-3">
              <Lightbulb className="text-warning" />
              <h6 className="mb-0">Recommended Goals for You</h6>
            </div>

            <div className="d-grid gap-3">
              {visibleRecommendations.map((rec, index) => {
                const priorityInfo = priorityLabels[rec.priority] || priorityLabels[3];
                const actualIndex = recommendations.indexOf(rec);
                
                return (
                  <div key={actualIndex} className="border rounded p-4 position-relative">
                    {/* Dismiss button */}
                    <button
                      className="btn btn-sm btn-link position-absolute top-0 end-0 m-2 text-muted"
                      onClick={() => handleDismiss(actualIndex)}
                      title="Dismiss recommendation"
                    >
                      <Close fontSize="small" />
                    </button>

                    <div className="row align-items-start">
                      <div className="col-md-8">
                        {/* Header */}
                        <div className="d-flex align-items-start gap-3 mb-3">
                          <div className="mt-1">
                            {categoryIcons[rec.category] || categoryIcons.other}
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                              <h6 className="mb-0">{rec.title}</h6>
                              <span className={`badge bg-${priorityInfo.color}`}>
                                {priorityInfo.icon} {priorityInfo.label} Priority
                              </span>
                              <span className={`badge bg-${impactColors[rec.impact]}`}>
                                {rec.impact.charAt(0).toUpperCase() + rec.impact.slice(1)} Impact
                              </span>
                              <span className="badge bg-secondary">
                                {rec.confidence}% Confidence
                              </span>
                            </div>
                            <p className="text-muted small mb-2">{rec.description}</p>
                            <div className="alert alert-info py-2 px-3 mb-0 small">
                              <strong>💡 Why this goal?</strong> {rec.reasoning}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-md-4">
                        {/* Goal Details */}
                        <div className="bg-light rounded p-3 mb-3">
                          <div className="mb-2">
                            <small className="text-muted d-block">Target Amount</small>
                            <div className="h5 mb-0 text-primary">
                              ₹{rec.targetAmount?.toLocaleString()}
                            </div>
                          </div>
                          <div className="mb-2">
                            <small className="text-muted d-block">Monthly Contribution</small>
                            <div className="fw-bold text-success">
                              ₹{rec.suggestedMonthlyContribution?.toLocaleString()}/month
                            </div>
                          </div>
                          <div>
                            <small className="text-muted d-block">Duration</small>
                            <div className="fw-bold">
                              {rec.durationMonths} month{rec.durationMonths > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          className="btn btn-primary w-100"
                          onClick={() => handleAcceptRecommendation(actualIndex)}
                          disabled={creating === actualIndex}
                        >
                          {creating === actualIndex ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <CheckCircle fontSize="small" className="me-1" />
                              Create This Goal
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
