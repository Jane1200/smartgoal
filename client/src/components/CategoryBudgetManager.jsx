import { useEffect, useMemo, useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import { Warning, CheckCircle, Error, Settings, TrendingUp } from "@mui/icons-material";

const CATEGORY_OPTIONS = [
  { id: "food", label: "Food" },
  { id: "transport", label: "Transport" },
  { id: "housing", label: "Housing" },
  { id: "healthcare", label: "Healthcare" },
  { id: "entertainment", label: "Entertainment" },
  { id: "shopping", label: "Shopping" },
  { id: "education", label: "Education" },
  { id: "travel", label: "Travel" },
  { id: "other", label: "Other" }
];

export default function CategoryBudgetManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [budgetData, setBudgetData] = useState(null);
  const [formBudgets, setFormBudgets] = useState([]);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const statusByCategory = useMemo(() => {
    const statuses = budgetData?.statuses || [];
    return statuses.reduce((acc, status) => {
      acc[status.category] = status;
      return acc;
    }, {});
  }, [budgetData]);

  const normalizeBudgets = (budgets = []) =>
    CATEGORY_OPTIONS.map((category) => {
      const existing = budgets.find((b) => b.category === category.id);
      return {
        category: category.id,
        enabled: existing?.enabled || false,
        monthlyLimit: existing?.monthlyLimit ? String(existing.monthlyLimit) : "",
        alertThreshold: existing?.alertThreshold || 80
      };
    });

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await api.get("/profile/category-budgets");
      setBudgetData(response.data);
      setFormBudgets(normalizeBudgets(response.data.budgets));
    } catch (error) {
      console.error("Failed to fetch category budgets:", error);
      toast.error("Failed to load category budgets");
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetChange = (categoryId, updates) => {
    setFormBudgets((prev) =>
      prev.map((budget) =>
        budget.category === categoryId ? { ...budget, ...updates } : budget
      )
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const invalidBudget = formBudgets.find(
      (budget) => budget.enabled && (!budget.monthlyLimit || Number(budget.monthlyLimit) <= 0)
    );
    if (invalidBudget) {
      toast.error("Please enter a valid monthly limit for enabled categories");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        budgets: formBudgets.map((budget) => ({
          category: budget.category,
          enabled: Boolean(budget.enabled),
          monthlyLimit: budget.enabled ? parseFloat(budget.monthlyLimit) : 0,
          alertThreshold: parseInt(budget.alertThreshold, 10)
        }))
      };

      const response = await api.put("/profile/category-budgets", payload);
      setBudgetData(response.data);
      setFormBudgets(normalizeBudgets(response.data.budgets));
      toast.success("Category budgets updated successfully!");
      setShowSettings(false);
    } catch (error) {
      console.error("Failed to update category budgets:", error);
      toast.error(error.response?.data?.message || "Failed to update category budgets");
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

  const enabledBudgets = formBudgets.filter((budget) => budget.enabled);

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <TrendingUp className="me-2" />
          Category Budgets
        </h5>
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings fontSize="small" className="me-1" />
          {showSettings ? "Hide" : "Settings"}
        </button>
      </div>

      <div className="card-body">
        {showSettings && (
          <form onSubmit={handleSave} className="mb-4 p-3 bg-light rounded">
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-3">
                <thead>
                  <tr>
                    <th style={{ minWidth: "140px" }}>Category</th>
                    <th className="text-center">Enable</th>
                    <th style={{ minWidth: "140px" }}>Monthly Limit (₹)</th>
                    <th style={{ minWidth: "180px" }}>Alert Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORY_OPTIONS.map((category) => {
                    const budget = formBudgets.find((b) => b.category === category.id);
                    return (
                      <tr key={category.id}>
                        <td>{category.label}</td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={budget?.enabled || false}
                            onChange={(e) =>
                              handleBudgetChange(category.id, { enabled: e.target.checked })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={budget?.monthlyLimit || ""}
                            disabled={!budget?.enabled}
                            min="1"
                            onChange={(e) =>
                              handleBudgetChange(category.id, { monthlyLimit: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="range"
                            className="form-range"
                            value={budget?.alertThreshold || 80}
                            disabled={!budget?.enabled}
                            min="50"
                            max="100"
                            step="5"
                            onChange={(e) =>
                              handleBudgetChange(category.id, { alertThreshold: e.target.value })
                            }
                          />
                          <small className="text-muted">
                            Alert at {budget?.alertThreshold || 80}%
                          </small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Saving...
                </>
              ) : (
                "Save Budgets"
              )}
            </button>
          </form>
        )}

        {enabledBudgets.length === 0 ? (
          <div className="text-center text-muted py-3">
            <TrendingUp style={{ fontSize: "48px", opacity: 0.3 }} />
            <p className="mb-0 mt-2">No category budgets set</p>
            <small>Click Settings to add limits per category</small>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {CATEGORY_OPTIONS.map((category) => {
              const status = statusByCategory[category.id];
              if (!status?.hasBudget) {
                return null;
              }
              const alertIcon =
                status.alertLevel === "danger" ? (
                  <Error className="me-2 text-danger" />
                ) : status.alertLevel === "warning" ? (
                  <Warning className="me-2 text-warning" />
                ) : (
                  <CheckCircle className="me-2 text-success" />
                );
              return (
                <div key={category.id} className="border rounded p-3">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="fw-semibold d-flex align-items-center">
                      {alertIcon}
                      {category.label}
                    </div>
                    <div className="text-muted small">
                      ₹{status.totalExpenses?.toFixed(0)} / ₹{status.limit?.toFixed(0)}
                    </div>
                  </div>
                  <div className="progress mb-2" style={{ height: "16px" }}>
                    <div
                      className={`progress-bar ${
                        status.exceededLimit
                          ? "bg-danger"
                          : status.approachingLimit
                          ? "bg-warning"
                          : "bg-success"
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
                  <div className="d-flex justify-content-between text-muted small">
                    <span>{status.alertMessage}</span>
                    <span>Remaining ₹{status.remaining?.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
