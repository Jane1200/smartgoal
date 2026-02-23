import { useState, useRef } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

const EXPENSE_CATEGORIES = [
  "food", "transport", "housing", "healthcare",
  "entertainment", "shopping", "education", "travel", "other",
];

const PAYMENT_METHODS = ["cash", "upi", "bank", "card", "other"];

const CATEGORY_ICONS = {
  food: "🍽️", transport: "🚗", housing: "🏠", healthcare: "💊",
  entertainment: "🎬", shopping: "🛍️", education: "📚",
  travel: "✈️", groceries: "🛒", utilities: "⚡", other: "📝",
};

const CONFIDENCE_COLORS = { high: "success", medium: "warning", low: "danger" };
const CONFIDENCE_LABELS = {
  high: "High confidence — review and save",
  medium: "Partial scan — please fill missing fields",
  low: "Low confidence — could not read total",
};

export default function ReceiptScanner({ onExpenseAdded }) {
  const [scanning, setScanning]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [preview, setPreview]         = useState(null);
  const [result, setResult]           = useState(null);
  const [dragActive, setDragActive]   = useState(false);

  // Editable form fields (populated from scan result)
  const [form, setForm] = useState({
    vendorName:    "",
    date:          new Date().toISOString().split("T")[0],
    totalAmount:   "",
    category:      "other",
    paymentMethod: "other",
    description:   "",
  });

  const fileInputRef = useRef(null);

  // ── File handling ─────────────────────────────────────────────────────────
  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WEBP)");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setResult(null);
    uploadAndScan(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  // ── Scan ──────────────────────────────────────────────────────────────────
  const uploadAndScan = async (file) => {
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("receipt", file);

      const { data } = await api.post("/finance/scan-receipt", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000, // OCR can take up to 60s
      });

      if (!data.success) {
        toast.error(data.message || "Scan failed");
        return;
      }

      setResult(data);
      setForm({
        vendorName:    data.vendorName   || "",
        date:          data.date         || new Date().toISOString().split("T")[0],
        totalAmount:   data.totalAmount  != null ? String(data.totalAmount) : "",
        category:      EXPENSE_CATEGORIES.includes(data.category) ? data.category : "other",
        paymentMethod: PAYMENT_METHODS.includes(data.paymentMethod) ? data.paymentMethod : "other",
        description:   data.vendorName   ? `Bill from ${data.vendorName}` : "",
      });

      if (data.confidence === "low") {
        toast.warn("Scan quality low — please verify the amount manually");
      } else {
        toast.success("Receipt scanned! Review and save below.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to scan receipt. Try a clearer image.");
      console.error("Receipt scan error:", err);
    } finally {
      setScanning(false);
    }
  };

  // ── Save as expense ───────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.totalAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!form.category) {
      toast.error("Please select a category");
      return;
    }

    setSaving(true);
    try {
      await api.post("/finance/expense", {
        amount,
        category: form.category,
        description: form.description || `Bill from ${form.vendorName || "vendor"}`,
        date: form.date,
        paymentMethod: form.paymentMethod,
      });

      toast.success(`₹${amount.toLocaleString()} expense saved!`);
      onExpenseAdded?.();
      resetScanner();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const resetScanner = () => {
    setPreview(null);
    setResult(null);
    setScanning(false);
    setForm({
      vendorName: "", date: new Date().toISOString().split("T")[0],
      totalAmount: "", category: "other", paymentMethod: "other", description: "",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="receipt-scanner">

      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="receipt-scanner__icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <div>
          <h5 className="mb-0 fw-bold">Receipt &amp; Bill Scanner</h5>
          <p className="mb-0 text-muted small">
            Photograph any receipt or bill — we&apos;ll extract the details automatically
          </p>
        </div>
      </div>

      <div className="row g-4">

        {/* ── Left: Upload area ─────────────────────────── */}
        <div className="col-md-5">
          <div
            className={`receipt-scanner__dropzone ${dragActive ? "receipt-scanner__dropzone--active" : ""} ${scanning ? "receipt-scanner__dropzone--scanning" : ""}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !scanning && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="d-none"
              onChange={handleFileChange}
            />

            {scanning ? (
              <div className="text-center py-3">
                <div className="receipt-scanner__pulse mb-3">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
                    <line x1="7" y1="12" x2="17" y2="12"/>
                  </svg>
                </div>
                <p className="fw-semibold mb-1">Scanning receipt...</p>
                <p className="text-muted small mb-0">OCR is reading your bill</p>
                <div className="receipt-scanner__scanline" />
              </div>
            ) : preview ? (
              <div className="text-center">
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="receipt-scanner__preview-img"
                />
                <p className="text-muted small mt-2 mb-0">Click to upload a different receipt</p>
              </div>
            ) : (
              <div className="text-center py-3">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted mb-3" style={{ opacity: 0.5 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p className="fw-semibold mb-1">Drop receipt photo here</p>
                <p className="text-muted small mb-3">or click to browse</p>
                <span className="badge bg-light text-dark border">JPG · PNG · WEBP</span>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="receipt-scanner__tips mt-3">
            <p className="fw-semibold small mb-2">📸 Tips for best results</p>
            <ul className="small text-muted ps-3 mb-0">
              <li>Lay the receipt flat under good lighting</li>
              <li>Keep the whole bill in frame</li>
              <li>Avoid shadows on the total line</li>
              <li>Works with restaurant, grocery &amp; shop bills</li>
            </ul>
          </div>
        </div>

        {/* ── Right: Results + Form ─────────────────────── */}
        <div className="col-md-7">
          {!result && !scanning && (
            <div className="receipt-scanner__empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted mb-3" style={{ opacity: 0.25 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <p className="text-muted">Upload a receipt to see extracted details here</p>
            </div>
          )}

          {result && (
            <div className="receipt-scanner__result">

              {/* Confidence badge */}
              <div className={`alert alert-${CONFIDENCE_COLORS[result.confidence]} py-2 px-3 mb-3 d-flex align-items-center gap-2`}>
                <span className="fw-semibold small">{CONFIDENCE_LABELS[result.confidence]}</span>
              </div>

              {/* Scanned items list */}
              {result.items?.length > 0 && (
                <div className="receipt-scanner__items mb-3">
                  <p className="fw-semibold small text-muted mb-2">
                    {CATEGORY_ICONS[result.category] || "📝"} Detected Items ({result.items.length})
                  </p>
                  <div className="receipt-scanner__items-list">
                    {result.items.map((item, i) => (
                      <div key={i} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                        <span className="small text-truncate me-2">{item.name}</span>
                        <span className="small fw-medium text-nowrap">₹{item.price.toLocaleString()}</span>
                      </div>
                    ))}
                    {result.gstAmount && (
                      <div className="d-flex justify-content-between py-1 border-bottom text-muted">
                        <span className="small">GST / Tax</span>
                        <span className="small">₹{result.gstAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Editable form */}
              <form onSubmit={handleSave}>
                <div className="row g-2">

                  <div className="col-12">
                    <label className="form-label small fw-medium">Vendor / Store Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.vendorName}
                      onChange={(e) => setForm(f => ({ ...f, vendorName: e.target.value }))}
                      placeholder="e.g., Swiggy, DMart, Apollo Pharmacy"
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label small fw-medium">
                      Total Amount (₹) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">₹</span>
                      <input
                        type="number"
                        className="form-control"
                        value={form.totalAmount}
                        onChange={(e) => setForm(f => ({ ...f, totalAmount: e.target.value }))}
                        placeholder="0"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div className="col-6">
                    <label className="form-label small fw-medium">Date</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={form.date}
                      onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label small fw-medium">
                      Category <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select form-select-sm"
                      value={form.category}
                      onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                      required
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_ICONS[c] || "📝"} {c.charAt(0).toUpperCase() + c.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-6">
                    <label className="form-label small fw-medium">Payment Method</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.paymentMethod}
                      onChange={(e) => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label small fw-medium">Description</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={form.description}
                      onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Optional note about this expense"
                      maxLength={200}
                    />
                  </div>

                  <div className="col-12 d-flex gap-2 mt-1">
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm flex-grow-1"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17 21 17 13 7 13 7 21"/>
                            <polyline points="7 3 7 8 15 8"/>
                          </svg>
                          Save as Expense
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={resetScanner}
                    >
                      Discard
                    </button>
                  </div>

                </div>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
