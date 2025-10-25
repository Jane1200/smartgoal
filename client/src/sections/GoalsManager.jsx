import { useEffect, useMemo, useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import { validateForm, validationRules, formatCurrency, calculateProgress } from "@/utils/validations.js";
import { FormError } from "@/components/FormError.jsx";
import { 
  GOAL_CATEGORIES, 
  calculateAutoPriority, 
  sortGoalsByPriority,
  shouldWarnAboutPriority,
  getCategoryInfo,
  getPriorityInfo
} from "@/utils/goalPriority.js";

const emptyForm = {
  title: "",
  description: "",
  targetAmount: "",
  dueDate: "",
  status: "planned",
  category: "other",
  priority: 3,
};

export default function GoalsManager({ 
  viewMode, 
  financeData, 
  isGoalCreationEnabled: goalCreationEnabled, 
  refreshFinanceData 
}) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  const isEdit = useMemo(() => Boolean(editingId), [editingId]);

  // Calculate current amount from total savings (income-expenses)
  const calculateCurrentAmount = () => {
    return Math.max(0, financeData.totalSavings || 0);
  };

  // Check if goal creation should be enabled based on savings
  const isGoalCreationEnabled = () => {
    return goalCreationEnabled();
  };

  async function loadGoals() {
    setLoading(true);
    try {
      const { data } = await api.get("/goals");
      setGoals(data);
    } catch (error) {
      console.error("Failed to load goals:", error);
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(goal) {
    setEditingId(goal._id);
    setForm({
      title: goal.title || "",
      description: goal.description || "",
      targetAmount: goal.targetAmount ?? "",
      dueDate: goal.dueDate ? goal.dueDate.substring(0, 10) : "",
      status: goal.status || "planned",
      category: goal.category || "other",
      priority: goal.priority || 3,
    });
  }

  async function saveGoal(e) {
    e.preventDefault();
    
    // Validate goal form (excluding currentAmount as it's auto-calculated)
    const goalValidation = validateForm(form, {
      title: validationRules.goal.title,
      description: validationRules.goal.description,
      targetAmount: validationRules.goal.targetAmount,
      dueDate: validationRules.goal.dueDate
    });

    if (!goalValidation.isValid) {
      setFormErrors(goalValidation.errors);
      toast.error("Please fix the validation errors");
      return;
    }

    // Check if user should be warned about low-priority goals
    const warningCheck = shouldWarnAboutPriority(goals, { ...form, _id: editingId });
    if (warningCheck.shouldWarn) {
      const proceed = window.confirm(
        `⚠️ Priority Alert!\n\n${warningCheck.message}\n\nWe recommend focusing on critical goals first to build a strong financial foundation.\n\nDo you still want to proceed with this goal?`
      );
      if (!proceed) {
        return;
      }
    }

    setFormErrors({});
    setSaving(true);
    
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        targetAmount: form.targetAmount === "" ? undefined : Number(form.targetAmount),
        currentAmount: calculateCurrentAmount(), // Use calculated amount
        dueDate: form.dueDate || undefined,
        status: form.status,
        category: form.category || "other",
        priority: form.priority || calculateAutoPriority(form.category),
      };

      if (!payload.title) {
        toast.error("Title is required");
        return;
      }

      if (isEdit) {
        const { data } = await api.put(`/goals/${editingId}`, payload);
        setGoals((prev) => prev.map((g) => (g._id === editingId ? data : g)));
        toast.success("Goal updated successfully");
      } else {
        const { data } = await api.post("/goals", payload);
        setGoals((prev) => [data, ...prev]);
        toast.success("Goal created successfully");
      }
      startCreate();
      // Refresh finance data to update savings
      refreshFinanceData();
    } catch (error) {
      console.error("Failed to save goal:", error);
      toast.error("Failed to save goal");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGoal(id) {
    if (!window.confirm("Are you sure you want to delete this goal?")) {
      return;
    }
    
    try {
      await api.delete(`/goals/${id}`);
      setGoals((prev) => prev.filter((g) => g._id !== id));
      toast.success("Goal deleted successfully");
    } catch (error) {
      console.error("Failed to delete goal:", error);
      toast.error("Failed to delete goal");
    }
  }

  // Calculate progress percentage
  function getProgressPercentage(goal) {
    if (!goal.targetAmount || goal.targetAmount === 0) return 0;
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }

  // Get status badge color
  function getStatusBadgeClass(status) {
    switch (status) {
      case "completed": return "bg-success";
      case "in_progress": return "bg-primary";
      case "planned": return "bg-secondary";
      case "archived": return "bg-warning";
      default: return "bg-secondary";
    }
  }

  return (
    <div className="row g-4">
      <div className="col-12 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex align-items-center gap-2 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
              <h5 className="card-title mb-0">{isEdit ? "Edit Goal" : "Create New Goal"}</h5>
            </div>
            
            <form className="d-grid gap-3" onSubmit={saveGoal}>
              <div>
                <label className="form-label fw-semibold small">Goal Title *</label>
                <input
                  className={`form-control ${formErrors.title ? 'is-invalid' : ''}`}
                  placeholder="e.g., Save for vacation"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  disabled={!isGoalCreationEnabled() && !isEdit}
                  required
                />
                <FormError error={formErrors.title} />
              </div>
              
              <div>
                <label className="form-label fw-semibold small">Description</label>
                <textarea
                  className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                  placeholder="Describe your goal..."
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  disabled={!isGoalCreationEnabled() && !isEdit}
                />
                <FormError error={formErrors.description} />
              </div>
              
              <div>
                <label className="form-label fw-semibold small">Goal Category *</label>
                <select
                  className="form-select"
                  value={form.category}
                  onChange={(e) => {
                    const newCategory = e.target.value;
                    const autoPriority = calculateAutoPriority(newCategory);
                    setForm({ ...form, category: newCategory, priority: autoPriority });
                  }}
                  disabled={!isGoalCreationEnabled() && !isEdit}
                >
                  {Object.entries(GOAL_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.icon} {cat.label} - {cat.description}
                    </option>
                  ))}
                </select>
                <small className="text-muted">
                  Priority is automatically set based on category. Critical goals should be completed first.
                </small>
              </div>
              
              <div className="row g-2">
                <div className="col">
                  <label className="form-label fw-semibold small">Target Amount</label>
                  <div className="input-group">
                    <span className="input-group-text">₹</span>
                    <input
                      className={`form-control ${formErrors.targetAmount ? 'is-invalid' : ''}`}
                      type="number"
                      min="100"
                      step="0.01"
                      placeholder="100.00"
                      value={form.targetAmount}
                      onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                      disabled={!isGoalCreationEnabled() && !isEdit}
                    />
                  </div>
                  <FormError error={formErrors.targetAmount} />
                </div>
              </div>
              
              <div className="row g-2">
                <div className="col">
                  <label className="form-label fw-semibold small">Due Date</label>
                  <input
                    className={`form-control ${formErrors.dueDate ? 'is-invalid' : ''}`}
                    type="date"
                    value={form.dueDate}
                    min={(() => {
                      const d = new Date();
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, "0");
                      const dd = String(d.getDate()).padStart(2, "0");
                      return `${yyyy}-${mm}-${dd}`;
                    })()}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    disabled={!isGoalCreationEnabled() && !isEdit}
                  />
                  <FormError error={formErrors.dueDate} />
                </div>
                <div className="col">
                  <label className="form-label fw-semibold small">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    disabled={!isGoalCreationEnabled() && !isEdit}
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              
              <div className="d-flex gap-2 pt-2">
                <button className="btn btn-primary flex-grow-1" disabled={saving || (!isGoalCreationEnabled() && !isEdit)} type="submit">
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17,21 17,13 7,13 7,21"/>
                        <polyline points="7,3 7,8 15,8"/>
                      </svg>
                      {isEdit ? "Update Goal" : "Create Goal"}
                    </>
                  )}
                </button>
                {isEdit && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={startCreate}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-7">
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="card-title mb-0">Your Goals</h5>
              <button className="btn btn-sm btn-outline-primary" onClick={loadGoals} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-5">
                <div className="text-muted mb-3">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="text-muted">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </div>
                <h6 className="text-muted">No goals yet</h6>
                <p className="text-muted small">Create your first goal to get started!</p>
              </div>
            ) : (
              <div className="list-group list-group-flush">
                {sortGoalsByPriority(goals).map((g) => {
                  const categoryInfo = getCategoryInfo(g.category || 'other');
                  const priorityInfo = getPriorityInfo(g.priority || 3);
                  return (
                  <div key={g._id} className="list-group-item border-0 border-bottom">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span style={{ fontSize: '1.2rem' }}>{categoryInfo.icon}</span>
                          <h6 className="mb-0 fw-semibold">{g.title}</h6>
                          <span className={`badge bg-${priorityInfo.color}`} title={`Priority: ${priorityInfo.label}`}>
                            {priorityInfo.badge} {priorityInfo.label}
                          </span>
                          <span className={`badge ${getStatusBadgeClass(g.status)}`}>
                            {g.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        {g.description && (
                          <p className="text-muted small mb-2">{g.description}</p>
                        )}
                        
                        {/* Progress Bar */}
                        {g.targetAmount && g.targetAmount > 0 && (
                          <div className="mb-2">
                            <div className="d-flex justify-content-between small text-muted mb-1">
                              <span>Progress</span>
                              <span>{Math.round(getProgressPercentage(g))}%</span>
                            </div>
                            <div className="progress" style={{ height: "6px" }}>
                              <div 
                                className="progress-bar bg-primary" 
                                style={{ width: `${getProgressPercentage(g)}%` }}
                              ></div>
                            </div>
                            <div className="d-flex justify-content-between small text-muted mt-1">
                              <span>₹{g.currentAmount || 0}</span>
                              <span>₹{g.targetAmount}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="small text-muted">
                          {g.dueDate && (
                            <span className="me-3">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="me-1">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              Due: {new Date(g.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          <span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="me-1">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12,6 12,12 16,14"/>
                            </svg>
                            Created: {new Date(g.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="d-flex gap-1">
                        <button 
                          className="btn btn-sm btn-outline-primary" 
                          onClick={() => startEdit(g)}
                          title="Edit goal"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-danger" 
                          onClick={() => deleteGoal(g._id)}
                          title="Delete goal"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




