import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext.jsx";
import { getCategoryInfo, getPriorityInfo } from "@/utils/goalPriority.js";

export default function Automation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [autoTransfers, setAutoTransfers] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [formData, setFormData] = useState({
    goalId: "",
    amount: "",
    frequency: "monthly"
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transfersRes, historyRes, goalsRes] = await Promise.all([
        api.get("/auto-transfer"),
        api.get("/auto-transfer/history?limit=20"),
        api.get("/goals")
      ]);

      setAutoTransfers(transfersRes.data);
      setTransferHistory(historyRes.data);
      setGoals(goalsRes.data);
    } catch (error) {
      console.error("Load data error:", error);
      toast.error("Failed to load automation data");
    } finally {
      setLoading(false);
    }
  };

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
      loadData();
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
      loadData();
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
      loadData();
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
      loadData();
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
      loadData();
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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

  if (loading) {
    return (
      <div className="container-xxl py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4">
      {/* Header */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-1">🤖 Goal Automation</h2>
            <p className="text-muted mb-0">Automate your savings transfers to goals</p>
          </div>
          <div className="d-flex gap-2">
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
              className="btn btn-primary"
              onClick={openAddModal}
              disabled={getAvailableGoals().length === 0}
            >
              + Add Auto-Transfer
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1 small">Active Transfers</p>
                  <h4 className="mb-0">{autoTransfers.filter(t => t.isActive).length}</h4>
                </div>
                <div className="text-primary fs-2">✅</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1 small">Monthly Total</p>
                  <h4 className="mb-0">{formatCurrency(getTotalMonthlyTransfers())}</h4>
                </div>
                <div className="text-success fs-2">💰</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1 small">Total Transferred</p>
                  <h4 className="mb-0">
                    {formatCurrency(autoTransfers.reduce((sum, t) => sum + t.totalTransferred, 0))}
                  </h4>
                </div>
                <div className="text-info fs-2">📊</div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1 small">Transfer Count</p>
                  <h4 className="mb-0">
                    {autoTransfers.reduce((sum, t) => sum + t.transferCount, 0)}
                  </h4>
                </div>
                <div className="text-warning fs-2">🔄</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="alert alert-info mb-4">
        <div className="d-flex align-items-start gap-2">
          <div className="fs-4">ℹ️</div>
          <div>
            <strong>How Auto-Transfers Work:</strong>
            <p className="mb-1 mt-1">
              • Automated transfers execute based on your schedule (monthly, weekly, or biweekly)<br/>
              • Transfers are prioritized by goal priority (Emergency Fund → High Priority → Low Priority)<br/>
              • If savings are insufficient, higher priority goals get funded first<br/>
              • Completed goals automatically pause their auto-transfers<br/>
              • You can pause, modify, or delete auto-transfers anytime
            </p>
          </div>
        </div>
      </div>

      {/* Active Auto-Transfers */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="card-title mb-0">Active Auto-Transfers</h5>
        </div>
        <div className="card-body">
          {autoTransfers.length === 0 ? (
            <div className="text-center py-5">
              <div className="fs-1 mb-3">🤖</div>
              <h5>No Auto-Transfers Yet</h5>
              <p className="text-muted">Set up automated transfers to save systematically toward your goals</p>
              <button 
                className="btn btn-primary"
                onClick={openAddModal}
                disabled={getAvailableGoals().length === 0}
              >
                + Add Your First Auto-Transfer
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
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
                          <span className={`badge bg-${priorityInfo.color}`}>
                            {priorityInfo.icon} {priorityInfo.label}
                          </span>
                        </td>
                        <td><strong>{formatCurrency(transfer.amount)}</strong></td>
                        <td>
                          <span className="badge bg-secondary">
                            {transfer.frequency === "monthly" ? "📅 Monthly" : 
                             transfer.frequency === "weekly" ? "📆 Weekly" : "📆 Biweekly"}
                          </span>
                        </td>
                        <td>{formatDate(transfer.nextTransferDate)}</td>
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
      </div>

      {/* Transfer History */}
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">Transfer History</h5>
        </div>
        <div className="card-body">
          {transferHistory.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted mb-0">No transfer history yet</p>
            </div>
          ) : (
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
                  {transferHistory.map((history) => (
                    <tr key={history._id}>
                      <td>{formatDate(history.transferDate)}</td>
                      <td>{history.goalId?.title || "Unknown Goal"}</td>
                      <td>{formatCurrency(history.amount)}</td>
                      <td>
                        <span className={`badge bg-${history.type === 'automated' ? 'primary' : 'secondary'}`}>
                          {history.type === 'automated' ? '🤖 Auto' : '👤 Manual'}
                        </span>
                      </td>
                      <td>
                        {history.status === 'success' && <span className="badge bg-success">✅ Success</span>}
                        {history.status === 'failed' && <span className="badge bg-danger">❌ Failed</span>}
                        {history.status === 'skipped' && <span className="badge bg-warning">⏭️ Skipped</span>}
                      </td>
                      <td>
                        <small className="text-muted">{history.reason || "-"}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
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