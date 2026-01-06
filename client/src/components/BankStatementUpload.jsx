import { useState } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";

export default function BankStatementUpload({ onImportComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extractedTransactions, setExtractedTransactions] = useState([]);
  const [showReview, setShowReview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setShowReview(false);
      setExtractedTransactions([]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setShowReview(false);
      setExtractedTransactions([]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    // Check authentication before uploading
    const authData = localStorage.getItem("sg_auth");
    console.log("🔐 Auth data from localStorage:", authData);
    
    if (!authData) {
      toast.error("Please log in to upload bank statements");
      return;
    }

    let parsedAuth;
    try {
      parsedAuth = JSON.parse(authData);
      console.log("🎫 Parsed auth token:", parsedAuth.token ? "Present" : "Missing");
      console.log("👤 User from auth:", parsedAuth.user?.email || parsedAuth.user?._id);
    } catch (e) {
      console.error("❌ Failed to parse auth data:", e);
      toast.error("Invalid authentication data. Please log in again.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      if (startDate) formData.append("startDate", startDate);
      if (endDate) formData.append("endDate", endDate);

      const response = await api.post("/finance/upload-statement", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setExtractedTransactions(response.data.transactions);
        setShowReview(true);
        toast.success(response.data.message);
      }
    } catch (error) {
      console.error("Upload error:", error);
      console.error("Error response:", error.response?.data);
      
      if (error.response?.status === 401) {
        toast.error("Authentication required. Please log in again.");
      } else {
        toast.error(error.response?.data?.message || "Failed to process bank statement");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleImportTransactions = async () => {
    try {
      setImporting(true);
      const response = await api.post("/finance/batch-import", {
        transactions: extractedTransactions,
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setFile(null);
        setExtractedTransactions([]);
        setShowReview(false);
        setStartDate("");
        setEndDate("");

        if (onImportComplete) {
          onImportComplete(response.data.results);
        }
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error.response?.data?.message || "Failed to import transactions");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="card mb-4 shadow-sm border-0">
      <div className="card-header bg-white border-bottom py-3">
        <h5 className="mb-1 text-primary fw-semibold">📄 Upload Bank Statement</h5>
        <p className="text-muted small mb-0">Automatically extract income and expenses from your bank statement</p>
      </div>
      <div className="card-body bg-light p-4">
        {/* Upload area */}
        <div
          className="upload-area p-5 mb-4 text-center"
          style={{
            border: "2px dashed #0d6efd",
            borderRadius: "12px",
            cursor: file ? "default" : "pointer",
            backgroundColor: file ? "#e7f3ff" : "#ffffff",
            transition: "all 0.3s ease",
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !file && document.getElementById("fileInput").click()}
        >
          <input
            id="fileInput"
            type="file"
            accept=".pdf,.csv"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {!file ? (
            <>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mx-auto mb-3 text-primary"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <h6 className="mb-2 text-dark fw-semibold">Drag and drop your bank statement here</h6>
              <p className="text-muted mb-0">
                or <span className="text-primary fw-semibold" style={{ cursor: "pointer" }}>click to browse</span>
              </p>
              <p className="text-muted small mt-2 mb-0">
                Supports PDF and CSV files (maximum 10MB)
              </p>
            </>
          ) : (
            <div className="d-flex align-items-center justify-content-center flex-wrap">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="me-3 text-success"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M12 18v-6" />
                <path d="M9 15l3-3 3 3" />
              </svg>
              <div className="text-start">
                <div className="text-dark fw-semibold">{file.name}</div>
                <small className="text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</small>
              </div>
              <button
                className="btn btn-sm btn-outline-danger ms-3"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setShowReview(false);
                  setExtractedTransactions([]);
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Date range inputs */}
        <div className="row mb-4">
          <div className="col-md-6 mb-3 mb-md-0">
            <label className="form-label text-dark fw-semibold">
              Statement Start Date <span className="text-muted small">(Optional)</span>
            </label>
            <input
              type="date"
              className="form-control form-control-lg"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label text-dark fw-semibold">
              Statement End Date <span className="text-muted small">(Optional)</span>
            </label>
            <input
              type="date"
              className="form-control form-control-lg"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Process button */}
        <button
          className="btn btn-primary btn-lg w-100 shadow-sm"
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{ padding: "14px 24px", fontSize: "1.05rem" }}
        >
          {uploading ? (
            <>
              <span
                className="spinner-border spinner-border-sm me-2"
                role="status"
              ></span>
              Processing Statement...
            </>
          ) : (
            <>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="me-2"
                style={{ display: "inline-block", verticalAlign: "middle" }}
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Process Statement
            </>
          )}
        </button>
      </div>

      {/* Review extracted transactions */}
      {showReview && extractedTransactions.length > 0 && (
        <div className="card-body border-top bg-white pt-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0 text-dark fw-semibold">📋 Review Extracted Transactions</h6>
            <span className="badge bg-primary rounded-pill px-3 py-2" style={{ fontSize: "0.9rem" }}>
              {extractedTransactions.length} transactions found
            </span>
          </div>

          <div
            className="table-responsive"
            style={{ 
              maxHeight: "400px", 
              overflowY: "auto", 
              border: "1px solid #dee2e6", 
              borderRadius: "8px" 
            }}
          >
            <table className="table table-hover mb-0">
              <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th className="fw-semibold">Date</th>
                  <th className="fw-semibold">Description</th>
                  <th className="fw-semibold">Type</th>
                  <th className="fw-semibold">Category</th>
                  <th className="fw-semibold text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {extractedTransactions.map((t, idx) => (
                  <tr key={idx}>
                    <td className="text-muted small">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="text-dark">{t.description}</td>
                    <td>
                      <span
                        className={`badge rounded-pill ${t.type === "income" ? "bg-success" : "bg-danger"}`}
                        style={{ fontSize: "0.85rem", padding: "0.35em 0.75em" }}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td><span className="text-muted small">{t.category}</span></td>
                    <td className="text-end fw-semibold text-dark">₹{t.amount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="btn btn-success btn-lg w-100 mt-4 shadow-sm"
            onClick={handleImportTransactions}
            disabled={importing}
            style={{ padding: "14px 24px", fontSize: "1.05rem" }}
          >
            {importing ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                ></span>
                Importing Transactions...
              </>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="me-2"
                  style={{ display: "inline-block", verticalAlign: "middle" }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Import All {extractedTransactions.length} Transactions
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
