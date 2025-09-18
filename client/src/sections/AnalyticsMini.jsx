import { useEffect, useState } from "react";
import api from "@/utils/api.js";

function Ring({ percent = 0, label = "Goal Progress" }) {
  const c = 44;
  const circ = 2 * Math.PI * c;
  const dash = Math.max(0, Math.min(100, percent)) / 100 * circ;
  return (
    <div className="progress-ring">
      <div className="ring-container">
        <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">
          <circle cx="55" cy="55" r={c} stroke="#e2e8f0" strokeWidth="10" fill="none"/>
          <circle cx="55" cy="55" r={c}
                  stroke="#161da3" strokeWidth="10" fill="none"
                  strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                  transform="rotate(-90 55 55)"/>
          <text x="55" y="60" textAnchor="middle" fontSize="18" fill="#161da3" fontWeight="600">{percent}%</text>
        </svg>
      </div>
      <div className="ring-info">
        <div className="ring-label">{label}</div>
        <div className="ring-subtitle">Overall progress</div>
      </div>
    </div>
  );
}

function Bar({ label, value, loading = false }) {
  if (loading) {
    return (
      <div className="progress-bar">
        <div className="bar-header">
          <span className="bar-label">{label}</span>
          <span className="bar-value">
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </span>
        </div>
        <div className="bar-container">
          <div className="bar-fill" style={{ width: "0%" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="progress-bar">
      <div className="bar-header">
        <span className="bar-label">{label}</span>
        <span className="bar-value">{value}%</span>
      </div>
      <div className="bar-container">
        <div className="bar-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function AnalyticsMini() {
  const [analytics, setAnalytics] = useState({
    overallProgress: 0,
    topGoal: null,
    monthlyMetrics: { resaleIncome: 0, plannedSavings: 0, spendingControl: 0 }
  });
  const [loading, setLoading] = useState(true);
  const hasToken = (() => {
    try {
      const raw = localStorage.getItem("sg_auth");
      return !!(raw && JSON.parse(raw)?.token);
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    if (!hasToken) {
      setLoading(false);
      return;
    }
    fetchAnalytics();
  }, [hasToken]);

  const fetchAnalytics = async () => {
    try {
      // Skip if not authenticated
      if (!hasToken) return;
      const { data } = await api.get("/analytics/quick"); // token auto-attached
      setAnalytics(data);
    } catch (error) {
      // Silently ignore 401/403 to avoid console noise on public pages
      if (!(error?.response?.status === 401 || error?.response?.status === 403)) {
        console.error("Failed to fetch analytics:", error);
      }
      setAnalytics({
        overallProgress: 0,
        topGoal: null,
        monthlyMetrics: { resaleIncome: 0, plannedSavings: 0, spendingControl: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const topGoalLabel = analytics.topGoal ? analytics.topGoal.title : "Overall Progress";

  return (
    <div className="analytics-card">
      <div className="card-header">
        <h3 className="card-title">Quick Analytics</h3>
        <p className="card-subtitle">Track your progress at a glance</p>
      </div>

      <div className="analytics-content">
        <Ring 
          percent={analytics.overallProgress} 
          label={topGoalLabel}
        />

        <div className="metrics-section">
          <h4 className="metrics-title">Monthly Performance</h4>
          <div className="metrics-grid">
            <Bar 
              label="Resale income (month)" 
              value={analytics.monthlyMetrics.resaleIncome} 
              loading={loading}
            />
            <Bar 
              label="Planned savings (month)" 
              value={analytics.monthlyMetrics.plannedSavings} 
              loading={loading}
            />
            <Bar 
              label="Spending under control" 
              value={analytics.monthlyMetrics.spendingControl} 
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
