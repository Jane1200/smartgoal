import { useState, useEffect } from "react";
import api from "@/utils/api.js";

export default function FinanceDataView({ viewMode, setViewMode, financeData, setFinanceData, isGoalCreationEnabled, refreshFinanceData, financeLoading }) {
  return (
    <div className="row g-4 mb-4">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-1">Financial Data Overview</h5>
              <p className="text-muted mb-0 small">View your financial data for goal planning</p>
            </div>
            <div className="btn-group" role="group">
              <button
                type="button"
                className={`btn ${viewMode === 'all-time' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('all-time')}
              >
                {viewMode === 'all-time' && <span className="me-1">✓</span>}
                All Time
              </button>
              <button
                type="button"
                className={`btn ${viewMode === 'current-month' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('current-month')}
              >
                {viewMode === 'current-month' && <span className="me-1">✓</span>}
                Current Month
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <div className={`alert ${isGoalCreationEnabled() ? 'alert-success' : 'alert-warning'} mb-0`}>
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      {isGoalCreationEnabled() ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12l2 2 4-4"/>
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      )}
                    </div>
                    <div>
                      <h6 className="alert-heading mb-1">
                        {isGoalCreationEnabled() ? 'Goal Creation Enabled' : 'Goal Creation Disabled'}
                      </h6>
                      <p className="mb-0 small">
                        {isGoalCreationEnabled() 
                          ? `You have ₹${financeData.totalSavings?.toLocaleString() || '0'} in savings. You can create goals!`
                          : `You need at least ₹100 in savings to create goals. Current savings: ₹${financeData.totalSavings?.toLocaleString() || '0'}`
                        }
                      </p>
                      <div className="mt-2">
                        <small className="text-muted">
                          <strong>{viewMode === 'all-time' ? 'Total Income' : 'Monthly Income'}:</strong> ₹{financeData.totalIncome?.toLocaleString() || '0'} | 
                          <strong> {viewMode === 'all-time' ? 'Total Expenses' : 'Monthly Expenses'}:</strong> ₹{financeData.totalExpenses?.toLocaleString() || '0'} | 
                          <strong> {viewMode === 'all-time' ? 'Total Savings' : 'Monthly Savings'}:</strong> ₹{financeData.totalSavings?.toLocaleString() || '0'}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="text-center">
                  <div className="text-primary mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="6" width="20" height="12" rx="2"/>
                      <path d="M6 10h12"/>
                      <path d="M6 14h12"/>
                      <circle cx="12" cy="12" r="2"/>
                    </svg>
                  </div>
                  <h4 className="text-primary mb-1">₹{financeData.totalSavings?.toLocaleString() || '0'}</h4>
                  <p className="text-muted mb-0 small">{viewMode === 'all-time' ? 'Total Savings' : 'Monthly Savings'}</p>
                  <button 
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={refreshFinanceData}
                    disabled={financeLoading}
                    title="Refresh finance data"
                  >
                    {financeLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                          <polyline points="23 4 23 10 17 10"/>
                          <polyline points="1 20 1 14 7 14"/>
                          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                        </svg>
                        Refresh
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
