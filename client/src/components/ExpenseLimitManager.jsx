import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import { Warning, CheckCircle, Error, Settings, TrendingUp } from "@mui/icons-material";

export default function ExpenseLimitManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [limitData, setLimitData] = useState(null);
  const [formData, setFormData] = useState({
    enabled: false,
    monthlyLimit: "",
    alertThreshold: 80
  });

  useEffect(() => {
    fetchLimitData();
  }, []);

  const fetchLimitData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/profile/expense-limit");
      setLimitData(response.data);
      
      if (response.data.expenseLimit) {
        setFormData({
          enabled: response.data.expenseLimit.enabled || false,
          monthlyLimit: response.data.expenseLimit.monthlyLimit || "",
          alertThreshold: response.data.expenseLimit.alertThreshold || 80
        });
      }
    } catch (error) {
      console.error("Failed to fetch expense limit:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (formData.enabled && (!formData.monthlyLimit || formData.monthlyLimit <= 0)) {
      toast.error("Please enter a valid monthly limit");
      return;
    }

    try {
      setSaving(true);
      const response = await api.put("/profile/expense-limit", {
        enabled: formData.enabled,
        monthlyLimit: parseFloat(formData.monthlyLimit),
        alertThreshold: parseInt(formData.alertThreshold)
      });

      setLimitData(response.data);
      toast.success("Expense limit updated successfully!");
      setShowSettings(false);
    } catch (error) {
      console.error("Failed to update expense limit:", error);
      toast.error(error.response?.data?.message || "Failed to update expense limit");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const status = limitData?.status;
  const expenseLimit = limitData?.expenseLimit;

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <TrendingUp className="me-2" />
          Monthly Expense Limit
        </h5>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings fontSize="small" className="me-1" />
          {showSettings ? 'Hide' : 'Settings'}
        </button>
      </div>
      
      <div className="card-body">
        {/* Settings Form */}
        {showSettings && (
          <form onSubmit={handleSave} className="mb-4 p-3 bg-light rounded">
            <div className="row g-3">
              <div className="col-12">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="enableLimit"
                    checked={formData.enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <label className="form-check-label" htmlFor="enableLimit">
                    Enable monthly expense limit
                  </label>
                </div>
              </div>
              
              {formData.enabled && (
                <>
                  <div className="col-md-6">
                    <label htmlFor="monthlyLimit" className="form-label">Monthly Limit (₹)</label>
                    <input
                      type="number"
                      id="monthlyLimit"
                      className="form-control"
                      value={formData.monthlyLimit}
                      onChange={(e) => setFormData(prev => ({ ...prev, monthlyLimit: e.target.value }))}
                      placeholder="Enter amount"
                      min="1"
                      required
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <label htmlFor="alertThreshold" className="form-label">
                      Alert at {formData.alertThreshold}% of limit
                    </label>
                    <input
                      type="range"
                      id="alertThreshold"
                      className="form-range"
                      value={formData.alertThreshold}
                      onChange={(e) => setFormData(prev => ({ ...prev, alertThreshold: e.target.value }))}
                      min="50"
                      max="100"
                      step="5"
                    />
                    <small className="text-muted">
                      Alert when you reach ₹{formData.monthlyLimit ? ((formData.monthlyLimit * formData.alertThreshold) / 100).toFixed(0) : 0}
                    </small>
                  </div>
                </>
              )}
              
              <div className="col-12">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Status Display */}
        {expenseLimit?.enabled && status?.hasLimit ? (
          <div>
            {/* Alert Banner */}
            {status.alertLevel === 'danger' && (
              <div className="alert alert-danger d-flex align-items-center mb-3">
                <Error className="me-2" />
                <div>
                  <strong>Limit Exceeded!</strong>
                  <div>{status.alertMessage}</div>
                </div>
              </div>
            )}
            
            {status.alertLevel === 'warning' && (
              <div className="alert alert-warning d-flex align-items-center mb-3">
                <Warning className="me-2" />
                <div>
                  <strong>Approaching Limit</strong>
                  <div>{status.alertMessage}</div>
                </div>
              </div>
            )}
            
            {status.alertLevel === 'success' && (
              <div className="alert alert-success d-flex align-items-center mb-3">
                <CheckCircle className="me-2" />
                <div>{status.alertMessage}</div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Expenses this month</span>
                <span className="fw-bold">
                  ₹{status.totalExpenses?.toFixed(2)} / ₹{status.limit?.toFixed(2)}
                </span>
              </div>
              <div className="progress" style={{ height: '24px' }}>
                <div
                  className={`progress-bar ${
                    status.exceededLimit ? 'bg-danger' :
                    status.approachingLimit ? 'bg-warning' :
                    'bg-success'
                  }`}
                  role="progressbar"
                  style={{ width: `${Math.min(status.percentageUsed, 100)}%` }}
                  aria-valuenow={status.percentageUsed}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  {status.percentageUsed?.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="row g-3 text-center">
              <div className="col-4">
                <div className="p-2 bg-light rounded">
                  <div className="text-muted small">Spent</div>
                  <div className="fw-bold">₹{status.totalExpenses?.toFixed(0)}</div>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 bg-light rounded">
                  <div className="text-muted small">Remaining</div>
                  <div className="fw-bold text-success">₹{status.remaining?.toFixed(0)}</div>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 bg-light rounded">
                  <div className="text-muted small">Limit</div>
                  <div className="fw-bold">₹{status.limit?.toFixed(0)}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted py-3">
            <TrendingUp style={{ fontSize: '48px', opacity: 0.3 }} />
            <p className="mb-0 mt-2">No expense limit set</p>
            <small>Click Settings to set a monthly spending limit</small>
          </div>
        )}
      </div>
    </div>
  );
}
