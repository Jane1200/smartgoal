import { useState } from "react";
import { toast } from "react-toastify";
import api from "@/utils/api.js";
import { CloudUpload, Image, CheckCircle, Error as ErrorIcon, Info } from "@mui/icons-material";

export default function UPIScreenshotUpload({ onImportComplete }) {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [extractedData, setExtractedData] = useState(null);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => 
      file.type === "image/jpeg" || 
      file.type === "image/jpg" || 
      file.type === "image/png"
    );

    if (imageFiles.length !== files.length) {
      toast.warning("Only JPG and PNG images are supported");
    }

    setSelectedFiles(imageFiles);
    setExtractedData(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one screenshot");
      return;
    }

    setUploading(true);
    let totalTransactions = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("statement", file);

        const response = await api.post("/finance/upload-statement", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.data.success) {
          totalTransactions += response.data.transactionsImported || 0;
          totalIncome += response.data.summary?.income || 0;
          totalExpense += response.data.summary?.expense || 0;
        }
      }

      setExtractedData({
        transactions: totalTransactions,
        income: totalIncome,
        expense: totalExpense,
      });

      toast.success(
        `Successfully imported ${totalTransactions} transaction(s) from ${selectedFiles.length} screenshot(s)!`
      );

      setSelectedFiles([]);
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error.response?.data?.message || "Failed to process screenshots"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upi-screenshot-upload">
      <style>{`
        .upi-screenshot-upload {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .upload-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .upload-header h4 {
          color: #1e293b;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .upload-header p {
          color: #64748b;
          font-size: 0.95rem;
        }

        .info-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .info-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          align-items: start;
          gap: 0.75rem;
        }

        .info-card-icon {
          color: #161da3;
          flex-shrink: 0;
        }

        .info-card-content {
          flex: 1;
        }

        .info-card-title {
          font-weight: 600;
          color: #334155;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .info-card-text {
          color: #64748b;
          font-size: 0.8rem;
          line-height: 1.4;
        }

        .upload-zone {
          border: 2px dashed #cbd5e1;
          border-radius: 12px;
          padding: 3rem 2rem;
          text-align: center;
          background: #f8fafc;
          transition: all 0.3s ease;
          cursor: pointer;
          margin-bottom: 1.5rem;
        }

        .upload-zone:hover {
          border-color: #161da3;
          background: #f1f5f9;
        }

        .upload-zone.has-files {
          border-color: #10b981;
          background: #f0fdf4;
        }

        .upload-icon {
          font-size: 3rem;
          color: #94a3b8;
          margin-bottom: 1rem;
        }

        .upload-zone.has-files .upload-icon {
          color: #10b981;
        }

        .upload-text {
          color: #475569;
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }

        .upload-hint {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .selected-files {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .selected-files-title {
          font-weight: 600;
          color: #334155;
          font-size: 0.875rem;
          margin-bottom: 0.75rem;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: white;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #475569;
        }

        .file-item-icon {
          color: #10b981;
          font-size: 1.25rem;
        }

        .upload-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .btn-upload {
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: #161da3;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0f1570;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(22, 29, 163, 0.3);
        }

        .btn-primary:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .result-summary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 2rem;
          color: white;
          margin-top: 2rem;
          animation: slideIn 0.5s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .result-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .result-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .result-stat {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 1rem;
          backdrop-filter: blur(10px);
        }

        .result-stat-label {
          font-size: 0.875rem;
          opacity: 0.9;
          margin-bottom: 0.5rem;
        }

        .result-stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .supported-apps {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
        }

        .supported-apps-title {
          font-weight: 600;
          color: #334155;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          text-align: center;
        }

        .app-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          justify-content: center;
        }

        .app-badge {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .app-badge-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
      `}</style>

      <div className="upload-header">
        <h4>📱 Import UPI Transactions</h4>
        <p>Upload screenshots from Google Pay, PhonePe, Paytm, or any UPI app</p>
      </div>

      {/* Info Cards */}
      <div className="info-cards">
        <div className="info-card">
          <Info className="info-card-icon" fontSize="small" />
          <div className="info-card-content">
            <div className="info-card-title">How it works</div>
            <div className="info-card-text">
              Take screenshots of your transaction history and upload them
            </div>
          </div>
        </div>
        <div className="info-card">
          <Image className="info-card-icon" fontSize="small" />
          <div className="info-card-content">
            <div className="info-card-title">Supported formats</div>
            <div className="info-card-text">JPG, PNG images from any UPI app</div>
          </div>
        </div>
        <div className="info-card">
          <CheckCircle className="info-card-icon" fontSize="small" />
          <div className="info-card-content">
            <div className="info-card-title">Auto-categorized</div>
            <div className="info-card-text">
              Transactions are automatically categorized
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <label htmlFor="upi-file-input">
        <div className={`upload-zone ${selectedFiles.length > 0 ? "has-files" : ""}`}>
          {selectedFiles.length > 0 ? (
            <CheckCircle className="upload-icon" />
          ) : (
            <CloudUpload className="upload-icon" />
          )}
          <div className="upload-text">
            {selectedFiles.length > 0
              ? `${selectedFiles.length} screenshot(s) selected`
              : "Click to select UPI screenshots"}
          </div>
          <div className="upload-hint">
            You can select multiple screenshots at once
          </div>
        </div>
      </label>
      <input
        id="upi-file-input"
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <div className="selected-files-title">Selected Screenshots:</div>
          <div className="file-list">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <Image className="file-item-icon" fontSize="small" />
                <span>{file.name}</span>
                <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: "0.8rem" }}>
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="upload-actions">
        {selectedFiles.length > 0 && (
          <button
            className="btn-upload btn-secondary"
            onClick={() => {
              setSelectedFiles([]);
              setExtractedData(null);
            }}
          >
            Clear
          </button>
        )}
        <button
          className="btn-upload btn-primary"
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
        >
          {uploading ? (
            <>
              <span className="spinner-border spinner-border-sm" />
              Processing...
            </>
          ) : (
            <>
              <CloudUpload fontSize="small" />
              Import Transactions
            </>
          )}
        </button>
      </div>

      {/* Result Summary */}
      {extractedData && (
        <div className="result-summary">
          <div className="result-title">
            <CheckCircle />
            Import Successful!
          </div>
          <div className="result-stats">
            <div className="result-stat">
              <div className="result-stat-label">Transactions</div>
              <div className="result-stat-value">{extractedData.transactions}</div>
            </div>
            <div className="result-stat">
              <div className="result-stat-label">Income</div>
              <div className="result-stat-value">
                ₹{extractedData.income.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="result-stat">
              <div className="result-stat-label">Expense</div>
              <div className="result-stat-value">
                ₹{extractedData.expense.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supported Apps */}
      <div className="supported-apps">
        <div className="supported-apps-title">✨ Supported UPI Apps</div>
        <div className="app-badges">
          <div className="app-badge">
            <div className="app-badge-icon" />
            Google Pay
          </div>
          <div className="app-badge">
            <div className="app-badge-icon" />
            PhonePe
          </div>
          <div className="app-badge">
            <div className="app-badge-icon" />
            Paytm
          </div>
          <div className="app-badge">
            <div className="app-badge-icon" />
            Amazon Pay
          </div>
          <div className="app-badge">
            <div className="app-badge-icon" />
            BHIM
          </div>
          <div className="app-badge">
            <div className="app-badge-icon" />
            Any UPI App
          </div>
        </div>
      </div>
    </div>
  );
}
