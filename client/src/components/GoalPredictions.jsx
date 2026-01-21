import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function GoalPredictions({ goals, onRefresh }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [detailedPrediction, setDetailedPrediction] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadPredictions();
  }, [goals]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/goals/predictions");
      
      if (data.success) {
        setPredictions(data.predictions);
      }
    } catch (error) {
      console.error("Failed to load predictions:", error);
      toast.error("Failed to load goal predictions");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      
      // Refresh goals first to get latest allocated amounts
      if (onRefresh) {
        await onRefresh();
      }
      
      // Then reload predictions
      await loadPredictions();
    } catch (error) {
      console.error("Failed to refresh:", error);
      toast.error("Failed to refresh predictions");
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedPrediction = async (goalId) => {
    try {
      const { data } = await api.get(`/goals/predictions/${goalId}`);
      
      if (data.success) {
        setDetailedPrediction(data);
        setShowModal(true);
      }
    } catch (error) {
      console.error("Failed to load detailed prediction:", error);
      toast.error("Failed to load prediction details");
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case "low": return "success";
      case "medium": return "warning";
      case "high": return "danger";
      case "critical": return "danger";
      default: return "secondary";
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case "low": return "✅";
      case "medium": return "⚠️";
      case "high": return "🔴";
      case "critical": return "🚨";
      default: return "❓";
    }
  };

  const getProbabilityColor = (probability) => {
    if (probability >= 80) return "success";
    if (probability >= 60) return "info";
    if (probability >= 40) return "warning";
    return "danger";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="card mb-4">
        <div className="card-body text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading predictions...</span>
          </div>
          <p className="mt-3 text-muted">Analyzing your financial data...</p>
        </div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="card mb-4 border-info">
        <div className="card-body text-center py-4">
          <span style={{ fontSize: '3rem' }}>🤖</span>
          <h5 className="mt-3">AI-Powered Goal Predictions</h5>
          <p className="text-muted mb-0">
            Add financial transactions to get ML-powered predictions on when you'll achieve your goals!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card mb-4 border-primary">
        <div className="card-header bg-primary bg-opacity-10 border-primary">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <span style={{ fontSize: '1.5rem' }} className="me-2">🤖</span>
              <div>
                <h5 className="mb-0">AI Goal Achievement Predictions</h5>
                <small className="text-muted">ML-powered analysis based on your financial patterns</small>
              </div>
            </div>
            <button 
              className="btn btn-sm btn-outline-primary"
              onClick={handleRefresh}
              disabled={loading}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          {/* Compact Table View */}
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '30%' }}>Goal</th>
                  <th className="text-center" style={{ width: '15%' }}>Probability</th>
                  <th className="text-center" style={{ width: '15%' }}>Risk</th>
                  <th className="text-center" style={{ width: '15%' }}>Progress</th>
                  <th className="text-center" style={{ width: '15%' }}>Est. Days</th>
                  <th className="text-center" style={{ width: '10%' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((pred) => {
                  const goal = goals.find(g => g._id === pred.goalId);
                  if (!goal) return null;

                  const prediction = pred.prediction;
                  const progress = goal.targetAmount > 0 
                    ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) 
                    : 0;

                  return (
                    <tr 
                      key={pred.goalId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedGoal(goal);
                        loadDetailedPrediction(pred.goalId);
                      }}
                    >
                      {/* Goal Name */}
                      <td>
                        <div className="d-flex align-items-center">
                          <div 
                            className={`border-start border-4 border-${getRiskColor(prediction.riskLevel)} ps-2`}
                            style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}
                          >
                            <div>
                              <div className="fw-semibold">{goal.title}</div>
                              <small className="text-muted">
                                ₹{goal.currentAmount.toLocaleString()} / ₹{goal.targetAmount.toLocaleString()}
                              </small>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Probability */}
                      <td className="text-center align-middle">
                        <div className="d-flex align-items-center justify-content-center">
                          <div 
                            className="rounded-circle d-flex align-items-center justify-content-center"
                            style={{
                              width: '50px',
                              height: '50px',
                              background: `conic-gradient(
                                var(--bs-${getProbabilityColor(prediction.probabilityPercentage)}) ${prediction.probabilityPercentage * 3.6}deg,
                                #e9ecef ${prediction.probabilityPercentage * 3.6}deg
                              )`
                            }}
                          >
                            <div 
                              className="bg-white rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: '40px', height: '40px' }}
                            >
                              <strong className={`small text-${getProbabilityColor(prediction.probabilityPercentage)}`}>
                                {prediction.probabilityPercentage}%
                              </strong>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Risk Level */}
                      <td className="text-center align-middle">
                        <span className={`badge bg-${getRiskColor(prediction.riskLevel)}`}>
                          {getRiskIcon(prediction.riskLevel)} {prediction.riskLevel.toUpperCase()}
                        </span>
                      </td>

                      {/* Progress Bar */}
                      <td className="align-middle">
                        <div>
                          <div className="progress" style={{ height: '8px' }}>
                            <div 
                              className={`progress-bar bg-${getProbabilityColor(prediction.probabilityPercentage)}`}
                              role="progressbar" 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                          <small className="text-muted d-block text-center mt-1">{progress.toFixed(0)}%</small>
                        </div>
                      </td>

                      {/* Estimated Days */}
                      <td className="text-center align-middle">
                        <div>
                          <strong className="d-block">
                            {prediction.daysToCompletion || "N/A"}
                          </strong>
                          <small className="text-muted">days</small>
                        </div>
                      </td>

                      {/* Details Button */}
                      <td className="text-center align-middle">
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGoal(goal);
                            loadDetailedPrediction(pred.goalId);
                          }}
                        >
                          <i className="bi bi-info-circle"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Insights Summary */}
          <div className="p-3 bg-light border-top">
            <div className="row g-2">
              <div className="col-md-4">
                <small className="text-muted d-block">High Risk Goals</small>
                <strong className="text-danger">
                  {predictions.filter(p => p.prediction.riskLevel === 'high' || p.prediction.riskLevel === 'critical').length}
                </strong>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block">On Track Goals</small>
                <strong className="text-success">
                  {predictions.filter(p => p.prediction.riskLevel === 'low').length}
                </strong>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block">Avg. Probability</small>
                <strong>
                  {predictions.length > 0 
                    ? Math.round(predictions.reduce((sum, p) => sum + p.prediction.probabilityPercentage, 0) / predictions.length)
                    : 0}%
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Prediction Modal */}
      {showModal && detailedPrediction && selectedGoal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">🤖 AI Prediction Analysis</h5>
                  <small className="text-muted">{selectedGoal.title}</small>
                </div>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => {
                    setShowModal(false);
                    setDetailedPrediction(null);
                    setSelectedGoal(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {/* Overall Prediction */}
                <div className="card mb-3 border-primary">
                  <div className="card-body text-center">
                    <h2 className={`display-4 mb-2 text-${getProbabilityColor(detailedPrediction.prediction.probabilityPercentage)}`}>
                      {detailedPrediction.prediction.probabilityPercentage}%
                    </h2>
                    <p className="lead mb-2">Achievement Probability</p>
                    <span className={`badge bg-${getRiskColor(detailedPrediction.prediction.riskLevel)} px-3 py-2`}>
                      {getRiskIcon(detailedPrediction.prediction.riskLevel)} {detailedPrediction.prediction.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>
                </div>

                {/* Goal Details */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <strong>📊 Goal Details</strong>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-6">
                        <small className="text-muted d-block">Target Amount</small>
                        <strong>₹{detailedPrediction.goalDetails.targetAmount.toLocaleString()}</strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block">Current Amount</small>
                        <strong>₹{detailedPrediction.goalDetails.currentAmount.toLocaleString()}</strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block">Due Date</small>
                        <strong>{formatDate(detailedPrediction.goalDetails.dueDate)}</strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block">Estimated Completion</small>
                        <strong className={detailedPrediction.prediction.estimatedCompletionDate ? "" : "text-muted"}>
                          {formatDate(detailedPrediction.prediction.estimatedCompletionDate) || "N/A"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Metrics */}
                <div className="card mb-3">
                  <div className="card-header bg-light">
                    <strong>💰 Financial Metrics</strong>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-6">
                        <small className="text-muted d-block">Monthly Savings Rate</small>
                        <strong>₹{detailedPrediction.prediction.metrics.monthlySavingsRate?.toLocaleString() || 0}</strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block">Required Monthly</small>
                        <strong>₹{detailedPrediction.prediction.metrics.requiredMonthlySavings?.toLocaleString() || 0}</strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block">Savings Trend</small>
                        <strong>
                          {detailedPrediction.prediction.metrics.savingsTrend > 0 ? "📈 Increasing" : 
                           detailedPrediction.prediction.metrics.savingsTrend < 0 ? "📉 Decreasing" : 
                           "➡️ Stable"}
                        </strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block">Consistency Score</small>
                        <strong>{detailedPrediction.prediction.metrics.consistencyScore || 0}/100</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insights */}
                {detailedPrediction.prediction.insights && detailedPrediction.prediction.insights.length > 0 && (
                  <div className="card mb-3">
                    <div className="card-header bg-light">
                      <strong>💡 AI Insights</strong>
                    </div>
                    <div className="card-body">
                      <ul className="mb-0">
                        {detailedPrediction.prediction.insights.map((insight, idx) => (
                          <li key={idx} className="mb-2">{insight}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {detailedPrediction.prediction.recommendations && detailedPrediction.prediction.recommendations.length > 0 && (
                  <div className="card mb-3">
                    <div className="card-header bg-light">
                      <strong>🎯 Recommendations</strong>
                    </div>
                    <div className="card-body">
                      {detailedPrediction.prediction.recommendations.map((rec, idx) => (
                        <div key={idx} className={`alert alert-${rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'info'} mb-2`}>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <strong>{rec.action}</strong>
                              <p className="mb-0 small">{rec.detail}</p>
                            </div>
                            <span className={`badge bg-${rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'info'}`}>
                              {rec.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data Info */}
                <div className="alert alert-info mb-0">
                  <small>
                    <i className="bi bi-info-circle me-2"></i>
                    Analysis based on {detailedPrediction.dataPoints} financial transactions. 
                    Predictions update automatically as you add more data.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setDetailedPrediction(null);
                    setSelectedGoal(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
