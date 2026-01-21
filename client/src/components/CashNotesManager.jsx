import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function CashNotesManager({ onConvert }) {
  const [notes, setNotes] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, incomeCount: 0, expenseCount: 0 });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "expense",
    amount: "",
    description: ""
  });

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  useEffect(() => {
    loadNotes();
    loadSummary();
  }, []);

  async function loadNotes() {
    try {
      setLoading(true);
      const { data } = await api.get("/cash-notes");
      setNotes(data);
    } catch (error) {
      console.error("Failed to load cash notes:", error);
      toast.error("Failed to load cash notes");
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    try {
      const { data } = await api.get("/cash-notes/summary");
      setSummary(data);
    } catch (error) {
      console.error("Failed to load summary:", error);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validate amount - only integers, no decimals, no alphanumeric
    const amountStr = form.amount.toString().trim();
    
    // Check if contains only digits (no letters, no special chars except optional leading/trailing spaces)
    if (!/^\d+$/.test(amountStr)) {
      toast.error("Amount must contain only numbers (no letters or special characters)");
      return;
    }

    const amountValue = parseInt(amountStr, 10);
    
    if (isNaN(amountValue) || amountValue < 1) {
      toast.error("Amount must be at least ₹1");
      return;
    }

    if (amountValue > 100000) {
      toast.error("Amount cannot exceed ₹1,00,000");
      return;
    }

    if (!form.description || form.description.trim().length < 3) {
      toast.error("Description must be at least 3 characters");
      return;
    }

    try {
      await api.post("/cash-notes", {
        type: form.type,
        amount: amountValue,
        description: form.description.trim()
      });
      
      toast.success("Cash note recorded to finances");
      setForm({
        type: "expense",
        amount: "",
        description: ""
      });
      setShowForm(false);
      loadNotes();
      loadSummary();
      if (onConvert) onConvert(); // Refresh finance data
    } catch (error) {
      console.error("Failed to create note:", error);
      toast.error(error.response?.data?.message || "Failed to create note");
    }
  }

  async function deleteNote(id) {
    if (!window.confirm("Delete this cash note?")) return;
    
    try {
      await api.delete(`/cash-notes/${id}`);
      toast.success("Note deleted");
      loadNotes();
      loadSummary();
      if (onConvert) onConvert();
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast.error("Failed to delete note");
    }
  }

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="card-title mb-1">💵 Cash Transaction Notes</h5>
            <small className="text-muted">Track today's offline/cash transactions - automatically recorded to finances</small>
          </div>
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "+ Add Note"}
          </button>
        </div>

        {/* Summary */}
        <div className="row g-2 mb-3">
          <div className="col-6">
            <div className="p-2 bg-success bg-opacity-10 rounded">
              <small className="text-muted d-block">Cash Income (Today)</small>
              <strong className="text-success">₹{summary.totalIncome.toFixed(0)}</strong>
              <small className="text-muted ms-2">({summary.incomeCount})</small>
            </div>
          </div>
          <div className="col-6">
            <div className="p-2 bg-danger bg-opacity-10 rounded">
              <small className="text-muted d-block">Cash Expense (Today)</small>
              <strong className="text-danger">₹{summary.totalExpense.toFixed(0)}</strong>
              <small className="text-muted ms-2">({summary.expenseCount})</small>
            </div>
          </div>
        </div>

        {/* Add Note Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-3 p-3 border rounded bg-light">
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label small">Type *</label>
                <select
                  className="form-select form-select-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  required
                >
                  <option value="income">💰 Income</option>
                  <option value="expense">💸 Expense</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small">Amount * (₹)</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={form.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow digits (no decimals, no negative, no 'e')
                    if (value === '' || /^\d+$/.test(value)) {
                      setForm({ ...form, amount: value });
                    }
                  }}
                  onKeyPress={(e) => {
                    // Prevent non-numeric characters
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="1"
                  min="1"
                  max="100000"
                  step="1"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  required
                />
                <small className="text-muted">Min: ₹1, Max: ₹1,00,000 (numbers only)</small>
              </div>
              <div className="col-md-4">
                <label className="form-label small">Date</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={getTodayDate()}
                  readOnly
                  disabled
                  style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                />
                <small className="text-muted">Today only</small>
              </div>
              <div className="col-12">
                <label className="form-label small">Description *</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g., Grocery shopping at local market, Auto fare to office"
                  minLength="3"
                  maxLength="500"
                  required
                />
                <small className="text-muted">Min 3 characters, max 500</small>
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-sm btn-primary w-100">
                  💾 Save Note
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Notes List */}
        {loading ? (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm" role="status"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-3 text-muted">
            <small>No cash notes yet. Add notes for offline transactions - they'll be automatically recorded to your finances.</small>
          </div>
        ) : (
          <div className="list-group list-group-flush mb-3" style={{ maxHeight: "300px", overflowY: "auto" }}>
            {notes.map(note => (
              <div key={note._id} className="list-group-item px-0 py-2">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className={`badge ${note.type === 'income' ? 'bg-success' : 'bg-danger'}`}>
                        {note.type === 'income' ? '💰 ↑' : '💸 ↓'} ₹{note.amount.toLocaleString()}
                      </span>
                      <small className="text-muted">{new Date(note.noteDate).toLocaleDateString()}</small>
                      <span className="badge bg-info text-white" style={{ fontSize: "0.7rem" }}>
                        ✓ Recorded
                      </span>
                    </div>
                    <small className="text-dark">{note.description}</small>
                  </div>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deleteNote(note._id)}
                      title="Delete note"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
