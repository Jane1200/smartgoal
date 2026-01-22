import { useEffect, useMemo, useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import { validateForm, validationRules, formatCurrency, calculateProgress, validateMeaningfulTextSync } from "@/utils/validations.js";
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
  category: "custom", // Always custom for manual goals
  customCategory: "",
  priority: 3,
};

export default function GoalsManager({ 
  viewMode, 
  financeData, 
  isGoalCreationEnabled: goalCreationEnabled, 
  refreshFinanceData,
  showCreateForm = true,
  onGoalCreated,
  createOnly = false // New prop to show ONLY the create form
}) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  
  // Function to check for suspicious/meaningless text using the meaningful text validator
  const hasSuspiciousWords = (text) => {
    if (!text) return false;
    const trimmed = text.trim();
    
    // Use the sophisticated meaningful text validator
    const error = validateMeaningfulTextSync('text_field', trimmed);
    
    // If there's an error from the validator, it means the text is suspicious
    return error !== '';
  };

  const isValidBasicText = (text) => {
    if (!text) return false;
    return /^[a-zA-Z0-9\s\-_.,!?():]+$/.test(text.trim());
  };
  
  // Function to count characters
  const getCharacterCount = (text) => {
    return (text || '').length;
  };
  
  // Function to get character count color
  const getCharCountClass = (current, max) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'text-danger';
    if (percentage >= 75) return 'text-warning';
    return 'text-muted';
  };

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
    
    // Check if the category is a predefined one or custom
    const isPredefinedCategory = Object.keys(GOAL_CATEGORIES).includes(goal.category);
    
    setForm({
      title: goal.title || "",
      description: goal.description || "",
      targetAmount: goal.targetAmount ?? "",
      dueDate: goal.dueDate ? goal.dueDate.substring(0, 10) : "",
      status: goal.status || "planned",
      category: isPredefinedCategory ? goal.category : "custom",
      customCategory: isPredefinedCategory ? "" : goal.category,
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

    // Additional validation for category and meaningful text
    const errors = { ...goalValidation.errors };
    if (!form.category || form.category === "") {
      errors.category = "Please select a goal category";
    }
    
    // Validate custom category if selected
    if (form.category === 'custom') {
      if (!form.customCategory || form.customCategory.trim().length < 3) {
        errors.customCategory = "Custom category must be at least 3 characters";
      } else if (form.customCategory.trim().length > 30) {
        errors.customCategory = "Custom category cannot exceed 30 characters";
      } else if (!isValidBasicText(form.customCategory)) {
        errors.customCategory = "Only letters, numbers, spaces, and basic punctuation allowed";
      } else {
        const categoryError = validateMeaningfulTextSync('text_field', form.customCategory.trim());
        if (categoryError) {
          errors.customCategory = categoryError;
        }
      }
    }
    
    // Check for meaningful text in title
    if (form.title) {
      const titleError = validateMeaningfulTextSync('text_field', form.title.trim());
      if (titleError) {
        errors.title = titleError;
      }
    }
    
    // Check for meaningful text in description
    if (form.description) {
      const descriptionError = validateMeaningfulTextSync('text_field', form.description.trim());
      if (descriptionError) {
        errors.description = descriptionError;
      }
    }

    if (!goalValidation.isValid || errors.category || errors.customCategory || errors.title || errors.description) {
      setFormErrors(errors);
      
      // Show specific error message for better UX
      const errorFields = Object.keys(errors);
      if (errorFields.length === 1) {
        toast.error(errors[errorFields[0]]);
      } else {
        toast.error(`Please fix ${errorFields.length} validation errors`);
      }
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
      // Determine the final category to save
      const finalCategory = form.category === 'custom' ? form.customCategory.trim() : form.category;
      
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        targetAmount: form.targetAmount === "" ? undefined : parseInt(form.targetAmount, 10), // Parse as integer to avoid decimals
        dueDate: form.dueDate || undefined,
        status: form.status,
        category: finalCategory,
        priority: form.priority || calculateAutoPriority(form.category),
      };
      
      // Only include currentAmount when editing, not when creating
      if (isEdit && form.currentAmount) {
        payload.currentAmount = parseInt(form.currentAmount, 10);
      }

      if (!payload.title) {
        toast.error("Title is required");
        return;
      }

      if (isEdit) {
        const { data } = await api.put(`/goals/${editingId}`, payload);
        setGoals((prev) => prev.map((g) => (g._id === editingId ? data : g)));
        toast.success("Goal updated successfully");
      } else {
        await api.post("/goals", payload);
        toast.success("Goal created successfully");
        
        // Fetch all goals again to get allocated savings
        const { data: allGoals } = await api.get("/goals");
        setGoals(allGoals);
        
        // Call onGoalCreated callback if provided
        if (onGoalCreated) {
          onGoalCreated();
        }
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

  async function completeGoal(goal) {
    if (!window.confirm(
      `Complete "${goal.title}"?\n\n` +
      `This will:\n` +
      `✓ Mark the goal as completed\n` +
      `✓ Create an expense entry for ₹${goal.targetAmount}\n` +
      `✓ Deduct ₹${goal.targetAmount} from your savings\n\n` +
      `This action represents actually spending the money on this goal.`
    )) {
      return;
    }
    
    try {
      const { data } = await api.post(`/goals/${goal._id}/complete`);
      toast.success(data.message);
      // Reload goals and finance data
      await loadGoals();
      refreshFinanceData();
    } catch (error) {
      console.error("Failed to complete goal:", error);
      const errorMsg = error.response?.data?.message || "Failed to complete goal";
      toast.error(errorMsg);
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
      case "achieved": return "bg-success";
      case "completed": return "bg-success";
      case "in_progress": return "bg-info";
      case "planned": return "bg-secondary";
      case "archived": return "bg-warning";
      default: return "bg-secondary";
    }
  }

  return (
    <div className="row g-4 justify-content-center">
      {showCreateForm && (
        <div className={createOnly ? "col-12 col-lg-6" : "col-12 col-lg-5"}>
          <div className="card shadow-sm border-0">
          <div className="card-header bg-gradient text-white" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div className="d-flex align-items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <h5 className="mb-0">{isEdit ? "Edit Goal" : "Create New Goal"}</h5>
            </div>
            <p className="mb-0 small opacity-75 mt-1">
              {isEdit ? "Update your goal details" : "Set a financial target and track your progress"}
            </p>
          </div>
          
          <div className="card-body p-4">
            <form onSubmit={saveGoal}>
              {/* Goal Title */}
              <div className="mb-4">
                <label className="form-label fw-bold d-flex justify-content-between align-items-center">
                  <span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    Goal Title
                  </span>
                  <span className={`badge ${getCharCountClass(getCharacterCount(form.title), 100)}`}>
                    {getCharacterCount(form.title)}/100
                  </span>
                </label>
                <input
                  className={`form-control form-control-lg ${formErrors.title ? 'is-invalid' : (form.title.trim().length >= 3 && !hasSuspiciousWords(form.title.trim()) ? 'is-valid' : '')}`}
                  placeholder="e.g., Emergency Fund, New Laptop, Dream Vacation"
                  value={form.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    if (newTitle.length > 100) return;
                    
                    setForm({ ...form, title: newTitle });
                    const title = newTitle.trim();
                    if (!title) {
                      setFormErrors({ ...formErrors, title: null });
                    } else if (title.length < 3) {
                      setFormErrors({ ...formErrors, title: "Title must be at least 3 characters" });
                    } else if (!/^[a-zA-Z0-9\s\-_.,!?():]+$/.test(title)) {
                      setFormErrors({ ...formErrors, title: "Only letters, numbers, spaces, and basic punctuation allowed" });
                    } else {
                      const meaningError = validateMeaningfulTextSync('text_field', title);
                      if (meaningError) {
                        setFormErrors({ ...formErrors, title: meaningError });
                      } else {
                        setFormErrors({ ...formErrors, title: null });
                      }
                    }
                  }}
                  onBlur={(e) => {
                    if (!e.target.value.trim()) {
                      setFormErrors({ ...formErrors, title: "Title is required" });
                    }
                  }}
                  disabled={!isGoalCreationEnabled() && !isEdit}
                  required
                />
                <FormError error={formErrors.title} />
                {!formErrors.title && form.title.trim().length >= 3 && !hasSuspiciousWords(form.title.trim()) && (
                  <div className="form-text text-success">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Looks good!
                  </div>
                )}
              </div>

              {/* Goal Category */}
              <div className="mb-4">
                <label className="form-label fw-bold">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  Goal Category *
                </label>
                <input
                  className={`form-control form-control-lg ${formErrors.customCategory ? 'is-invalid' : ''}`}
                  type="text"
                  placeholder="e.g., Wedding, Car, Medical, Home, Business, Gift, Pet Care, Hobby"
                  value={form.customCategory}
                  maxLength={30}
                  onChange={(e) => {
                    const newCategory = e.target.value;
                    setForm({ ...form, customCategory: newCategory });
                    const trimmed = newCategory.trim();
                    if (!trimmed) {
                      setFormErrors({ ...formErrors, customCategory: null });
                    } else if (trimmed.length < 3) {
                      setFormErrors({ ...formErrors, customCategory: "Custom category must be at least 3 characters" });
                    } else if (trimmed.length > 30) {
                      setFormErrors({ ...formErrors, customCategory: "Custom category cannot exceed 30 characters" });
                    } else if (!isValidBasicText(trimmed)) {
                      setFormErrors({ ...formErrors, customCategory: "Only letters, numbers, spaces, and basic punctuation allowed" });
                    } else {
                      const meaningError = validateMeaningfulTextSync('text_field', trimmed);
                      if (meaningError) {
                        setFormErrors({ ...formErrors, customCategory: meaningError });
                      } else {
                        setFormErrors({ ...formErrors, customCategory: null });
                      }
                    }
                  }}
                  disabled={!isGoalCreationEnabled() && !isEdit}
                />
                <FormError error={formErrors.customCategory} />
                <div className="form-text text-muted">
                  Create your own category name (3-30 characters). Examples: Wedding Fund, Sister's Education, Medical Emergency, Dream Car
                </div>
              </div>

              {/* Target Amount & Due Date Row */}
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label fw-bold">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    Target Amount
                  </label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text">₹</span>
                    <input
                      className={`form-control ${formErrors.targetAmount ? 'is-invalid' : ''}`}
                      type="number"
                      min="100"
                      max="100000"
                      step="1"
                      placeholder="10000"
                      value={form.targetAmount}
                      onChange={(e) => {
                        const newAmount = e.target.value;
                        setForm({ ...form, targetAmount: newAmount });
                        
                        if (!newAmount || newAmount === "") {
                          setFormErrors({ ...formErrors, targetAmount: null });
                        } else {
                          const numAmount = Number(newAmount);
                          if (isNaN(numAmount)) {
                            setFormErrors({ ...formErrors, targetAmount: "Must be a valid number" });
                          } else if (numAmount < 100) {
                            setFormErrors({ ...formErrors, targetAmount: "Minimum ₹100" });
                          } else if (numAmount > 100000) {
                            setFormErrors({ ...formErrors, targetAmount: "Maximum ₹1,00,000" });
                          } else {
                            setFormErrors({ ...formErrors, targetAmount: null });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (!e.target.value || e.target.value === "") {
                          setFormErrors({ ...formErrors, targetAmount: "Amount is required" });
                        }
                      }}
                      disabled={!isGoalCreationEnabled() && !isEdit}
                      required
                    />
                  </div>
                  <FormError error={formErrors.targetAmount} />
                  <div className="form-text text-muted">₹100 - ₹1,00,000</div>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Target Date
                  </label>
                  <input
                    className={`form-control form-control-lg ${formErrors.dueDate ? 'is-invalid' : ''}`}
                    type="date"
                    value={form.dueDate}
                    min={(() => {
                      const d = new Date();
                      const yyyy = d.getFullYear();
                      const mm = String(d.getMonth() + 1).padStart(2, "0");
                      const dd = String(d.getDate()).padStart(2, "0");
                      return `${yyyy}-${mm}-${dd}`;
                    })()}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setForm({ ...form, dueDate: newDate });
                      
                      if (!newDate) {
                        setFormErrors({ ...formErrors, dueDate: null });
                      } else {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dueDate = new Date(newDate);
                        dueDate.setHours(0, 0, 0, 0);
                        
                        if (dueDate < today) {
                          setFormErrors({ ...formErrors, dueDate: "Must be today or future" });
                        } else {
                          setFormErrors({ ...formErrors, dueDate: null });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (!e.target.value) {
                        setFormErrors({ ...formErrors, dueDate: "Date is required" });
                      }
                    }}
                    disabled={!isGoalCreationEnabled() && !isEdit}
                    required
                  />
                  <FormError error={formErrors.dueDate} />
                  <div className="form-text text-muted">When do you want to achieve this?</div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="form-label fw-bold d-flex justify-content-between align-items-center">
                  <span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    Description (Optional)
                  </span>
                  <span className={`badge ${getCharCountClass(getCharacterCount(form.description), 500)}`}>
                    {getCharacterCount(form.description)}/500
                  </span>
                </label>
                <textarea
                  className={`form-control ${formErrors.description ? 'is-invalid' : (form.description.trim().length > 0 && !hasSuspiciousWords(form.description.trim()) ? 'is-valid' : '')}`}
                  placeholder="Add more details about your goal... (e.g., Why is this important? What will you use it for?)"
                  rows={3}
                  value={form.description}
                  onChange={(e) => {
                    const newDescription = e.target.value;
                    if (newDescription.length > 500) return;
                    
                    setForm({ ...form, description: newDescription });
                    const description = newDescription.trim();
                    if (!description) {
                      setFormErrors({ ...formErrors, description: null });
                    } else {
                      const meaningError = validateMeaningfulTextSync('text_field', description);
                      if (meaningError) {
                        setFormErrors({ ...formErrors, description: meaningError });
                      } else {
                        setFormErrors({ ...formErrors, description: null });
                      }
                    }
                  }}
                  disabled={!isGoalCreationEnabled() && !isEdit}
                />
                <FormError error={formErrors.description} />
              </div>

              {/* Status (only for edit) */}
              {isEdit && (
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Status
                  </label>
                  <select
                    className="form-select form-select-lg"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="planned">📋 Planned</option>
                    <option value="in_progress">🚀 In Progress</option>
                    <option value="achieved">✅ Achieved</option>
                    <option value="completed">✓ Completed</option>
                    <option value="archived">📦 Archived</option>
                  </select>
                  <div className="form-text text-muted">Status updates automatically based on progress</div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-lg btn-primary" 
                  disabled={saving || (!isGoalCreationEnabled() && !isEdit)} 
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                      </svg>
                      {isEdit ? "Update Goal" : "Create Goal"}
                    </>
                  )}
                </button>
                {isEdit && (
                  <button
                    className="btn btn-lg btn-outline-secondary"
                    type="button"
                    onClick={startCreate}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Help Text */}
              {!isGoalCreationEnabled() && !isEdit && (
                <div className="alert alert-warning mt-3 mb-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  You need at least ₹100 in savings to create goals
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
      )}

      {!createOnly && (
        <div className={showCreateForm ? "col-12 col-lg-7" : "col-12"}>
          <div className="card shadow-sm">
          <div className="card-body">
            {/* Goals Summary */}
            {!loading && goals.length > 0 && (
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="card bg-primary bg-opacity-10 border-primary">
                    <div className="card-body py-3">
                      <div className="small text-muted mb-1">Active Goals</div>
                      <div className="h4 mb-0 text-primary">
                        {goals.filter(g => g.status !== 'completed' && g.status !== 'archived').length}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-success bg-opacity-10 border-success">
                    <div className="card-body py-3">
                      <div className="small text-muted mb-1">Total Target</div>
                      <div className="h4 mb-0 text-success">
                        ₹{goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card bg-warning bg-opacity-10 border-warning">
                    <div className="card-body py-3">
                      <div className="small text-muted mb-1">Amount Needed</div>
                      <div className="h4 mb-0 text-warning">
                        ₹{goals.reduce((sum, g) => {
                          const remaining = (g.targetAmount || 0) - (g.currentAmount || 0);
                          return sum + Math.max(0, remaining);
                        }, 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                  const progress = getProgressPercentage(g);
                  const daysRemaining = g.dueDate ? Math.ceil((new Date(g.dueDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                  const isOverdue = daysRemaining !== null && daysRemaining < 0;
                  const isUrgent = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;
                  const amountRemaining = g.targetAmount ? g.targetAmount - (g.currentAmount || 0) : 0;
                  const monthlyTarget = g.dueDate && g.targetAmount ? 
                    Math.ceil(amountRemaining / Math.max(1, Math.ceil(daysRemaining / 30))) : 0;
                  
                  return (
                  <div key={g._id} className={`list-group-item border-0 border-bottom ${isOverdue ? 'border-start border-danger border-3' : isUrgent ? 'border-start border-warning border-3' : ''}`}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                          <span style={{ fontSize: '1.2rem' }}>{categoryInfo.icon}</span>
                          <h6 className="mb-0 fw-semibold">{g.title}</h6>
                          <span className={`badge bg-${priorityInfo.color}`} title={`Priority: ${priorityInfo.label}`}>
                            {priorityInfo.badge} {priorityInfo.label}
                          </span>
                          <span className={`badge ${getStatusBadgeClass(g.status)}`}>
                            {g.status.replace('_', ' ')}
                          </span>
                          
                          {/* Days Remaining Badge */}
                          {daysRemaining !== null && g.status !== 'completed' && g.status !== 'archived' && (
                            <span className={`badge ${isOverdue ? 'bg-danger' : isUrgent ? 'bg-warning text-dark' : 'bg-info'}`}>
                              {isOverdue ? (
                                <>⏰ Overdue by {Math.abs(daysRemaining)} days</>
                              ) : daysRemaining === 0 ? (
                                <>🔥 Due Today!</>
                              ) : daysRemaining === 1 ? (
                                <>⏰ Due Tomorrow</>
                              ) : (
                                <>📅 {daysRemaining} days left</>
                              )}
                            </span>
                          )}
                        </div>
                        
                        {g.description && (
                          <p className="text-muted small mb-2">{g.description}</p>
                        )}
                        
                        {/* Progress Bar with Enhanced Info */}
                        {g.targetAmount && g.targetAmount > 0 && (
                          <div className="mb-2">
                            <div className="d-flex justify-content-between small mb-1">
                              <span className="text-muted">Progress: {Math.round(progress)}%</span>
                              <span className={`fw-semibold ${progress >= 100 ? 'text-success' : progress >= 75 ? 'text-info' : progress >= 50 ? 'text-warning' : 'text-muted'}`}>
                                ₹{amountRemaining.toLocaleString()} remaining
                              </span>
                            </div>
                            <div className="progress" style={{ height: "8px" }}>
                              <div 
                                className={`progress-bar ${progress >= 100 ? 'bg-success' : progress >= 75 ? 'bg-info' : progress >= 50 ? 'bg-warning' : 'bg-primary'}`}
                                style={{ width: `${Math.min(100, progress)}%` }}
                              ></div>
                            </div>
                            <div className="d-flex justify-content-between small text-muted mt-1">
                              <span>₹{(g.currentAmount || 0).toLocaleString()}</span>
                              <span>₹{g.targetAmount.toLocaleString()}</span>
                            </div>
                            
                            {/* Monthly Target */}
                            {monthlyTarget > 0 && g.status !== 'completed' && g.status !== 'archived' && (
                              <div className="alert alert-info py-2 px-3 mt-2 mb-0 small">
                                <strong>💰 Monthly Target:</strong> Save ₹{monthlyTarget.toLocaleString()}/month to reach this goal on time
                              </div>
                            )}
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
                        {g.status === 'achieved' && (
                          <button 
                            className="btn btn-sm btn-success" 
                            onClick={() => completeGoal(g)}
                            title="Complete goal and deduct from savings"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                              <polyline points="20,6 9,17 4,12"/>
                            </svg>
                            Complete
                          </button>
                        )}
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
      )}
    </div>
  );
}




