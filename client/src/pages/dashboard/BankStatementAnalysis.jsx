import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import BankStatementUpload from "@/components/BankStatementUpload.jsx";

export default function BankStatementAnalysis() {
  const authContext = useAuth();
  const user = authContext?.user;

  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetchProcessedStatements();
  }, []);

  const fetchProcessedStatements = async () => {
    try {
      setLoading(true);
      const response = await api.get("/finance/processed-statements?limit=10");
      if (response.data.success) {
        setStatements(response.data.statements || []);
      }
    } catch (error) {
      console.error("Failed to fetch statements:", error);
      toast.error(error.response?.data?.message || "Failed to load statements");
    } finally {
      setLoading(false);
    }
  };

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading bank statements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid my-4 py-3">
      {/* Page Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 mb-2 text-dark fw-bold">💳 Bank Statement Analysis</h1>
              <p className="text-muted mb-0 lead">
                Upload and analyze your bank statements automatically
              </p>
            </div>
            <button
              className="btn btn-primary btn-lg shadow-sm px-4"
              onClick={() => setShowUpload(!showUpload)}
            >
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
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {showUpload ? "Hide Upload" : "Upload Statement"}
            </button>
          </div>
        </div>
      </div>

      {/* Upload Component */}
      {showUpload && (
        <div className="row mb-4">
          <div className="col-12">
            <BankStatementUpload
              onImportComplete={(results) => {
                fetchProcessedStatements();
                toast.success(`Successfully imported ${results?.successful || 0} transactions!`);
                setShowUpload(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Quick Upload Card */}
      {!showUpload && (
        <div className="row mb-5">
          <div className="col-12">
            <div className="card shadow-sm border-0" style={{ overflow: "hidden" }}>
              <div
                className="card-body text-center py-5 px-4"
                style={{
                  background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                }}
              >
                <svg
                  width="72"
                  height="72"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary mx-auto mb-4"
                  style={{ opacity: 0.8 }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <h3 className="h4 mb-3 fw-bold text-dark">Upload Your Bank Statement</h3>
                <p className="text-muted mb-4 lead" style={{ maxWidth: "600px", margin: "0 auto" }}>
                  Upload your bank statements (CSV format) and our system will automatically extract and categorize all your transactions
                </p>
                <button
                  className="btn btn-primary btn-lg px-5 shadow"
                  onClick={() => setShowUpload(true)}
                  style={{ padding: "14px 48px" }}
                >
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
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload Statement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recently Processed Statements */}
      <div className="row mt-5">
        <div className="col-12">
          <h4 className="mb-4 text-dark fw-bold">📁 Recently Processed Statements</h4>
          {statements.length === 0 ? (
            <div className="card shadow-sm border-0">
              <div className="card-body text-center py-5 bg-light">
                <svg
                  width="56"
                  height="56"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-primary mx-auto mb-3"
                  style={{ opacity: 0.4 }}
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <h6 className="text-dark fw-semibold mb-2">No statements processed yet</h6>
                <p className="text-muted mb-3">Upload your first bank statement to get started</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowUpload(true)}
                >
                  Upload Now
                </button>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              {statements.map((stmt) => (
                <div key={stmt._id} className="col-md-6 col-lg-4">
                  <div className="card shadow-sm border-0 h-100" style={{ transition: "transform 0.2s" }}>
                    <div className="card-body bg-white p-4">
                      <div className="d-flex align-items-start mb-3">
                        <svg
                          width="40"
                          height="40"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-primary me-3 flex-shrink-0"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <div className="flex-grow-1">
                          <h6 className="mb-1 fw-semibold text-dark">{stmt.filename}</h6>
                          <p className="text-muted small mb-2">
                            📅 {new Date(stmt.processedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                          <span className="badge bg-primary rounded-pill">
                            {stmt.transactionsCount} transactions
                          </span>
                        </div>
                      </div>
                      <button className="btn btn-outline-primary btn-sm w-100 mt-2">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
