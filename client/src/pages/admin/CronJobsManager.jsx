import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "@/utils/api.js";

export default function CronJobsManager() {
  const [cronStatus, setCronStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchCronStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchCronStatus(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchCronStatus = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get("/cron/status");
      setCronStatus(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch cron status:", error);
      if (!silent) toast.error("Failed to fetch cron job status");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleTriggerJob = async (jobName, jobLabel) => {
    if (!window.confirm(`Are you sure you want to manually trigger "${jobLabel}"?`)) return;

    setTriggering(jobName);
    try {
      const { data } = await api.post(`/cron/trigger/${jobName}`);
      toast.success(data.message || `Successfully triggered ${jobLabel}`);
      
      // Refresh status after trigger
      setTimeout(() => fetchCronStatus(true), 2000);
    } catch (error) {
      console.error("Failed to trigger job:", error);
      toast.error(error.response?.data?.message || `Failed to trigger ${jobLabel}`);
    } finally {
      setTriggering(null);
    }
  };

  if (loading) {
    return (
      <div className="container-xxl py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading cron jobs status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">🕐 Cron Jobs Manager</h1>
          <p className="text-muted mb-0">Monitor and control automated background tasks</p>
        </div>
        <div>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={() => fetchCronStatus()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="row mb-3">
        <div className="col-12">
          <div className="alert alert-info d-flex align-items-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2 flex-shrink-0">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <div>
              <strong>About Cron Jobs:</strong> These automated tasks run in the background on scheduled times. 
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Cron Jobs Cards */}
      <div className="row g-4">
        {/* Weekly Financial Summary */}
        <div className="col-md-6">
          <div className="card h-100 border-primary">
            <div className="card-header bg-primary text-white d-flex align-items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <h5 className="card-title mb-0">Weekly Financial Summary</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Schedule:</span>
                  <span className="badge bg-info">Every Monday at 9:00 AM</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Status:</span>
                  <span className="badge bg-success">Active</span>
                </div>
                {cronStatus?.statistics?.weeklyEmailsSent !== undefined && (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Emails sent (all time):</span>
                    <strong>{cronStatus.statistics.weeklyEmailsSent.toLocaleString()}</strong>
                  </div>
                )}
              </div>
              <p className="text-muted small mb-3">
                Sends personalized weekly financial health summaries to all goal_setter users, 
                including income, expenses, savings, and goal progress.
              </p>
              <button 
                className="btn btn-sm btn-outline-primary w-100"
                onClick={() => handleTriggerJob('weekly-summary', 'Weekly Financial Summary')}
                disabled={triggering === 'weekly-summary'}
              >
                {triggering === 'weekly-summary' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Triggering...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Test Run Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Expired Resale Cleanup */}
        <div className="col-md-6">
          <div className="card h-100 border-warning">
            <div className="card-header bg-warning text-dark d-flex align-items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <h5 className="card-title mb-0">Expired Resale Cleanup</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Schedule:</span>
                  <span className="badge bg-info">Daily at 2:00 AM</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Status:</span>
                  <span className="badge bg-success">Active</span>
                </div>
                {cronStatus?.statistics?.expiredItemsCleaned !== undefined && (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Items cleaned (all time):</span>
                    <strong>{cronStatus.statistics.expiredItemsCleaned.toLocaleString()}</strong>
                  </div>
                )}
              </div>
              <p className="text-muted small mb-3">
                Automatically marks marketplace items as expired if unsold for more than 90 days. 
                Sends notification emails to sellers about expired listings.
              </p>
              <button 
                className="btn btn-sm btn-outline-warning w-100"
                onClick={() => handleTriggerJob('resale-cleanup', 'Expired Resale Cleanup')}
                disabled={triggering === 'resale-cleanup'}
              >
                {triggering === 'resale-cleanup' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Triggering...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Test Run Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Expired Goals Cleanup */}
        <div className="col-md-6">
          <div className="card h-100 border-danger">
            <div className="card-header bg-danger text-white d-flex align-items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <h5 className="card-title mb-0">Expired Goals Cleanup</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Schedule:</span>
                  <span className="badge bg-info">Daily at 3:00 AM</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Status:</span>
                  <span className="badge bg-success">Active</span>
                </div>
                {cronStatus?.statistics?.expiredGoalsArchived !== undefined && (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Goals archived (all time):</span>
                    <strong>{cronStatus.statistics.expiredGoalsArchived.toLocaleString()}</strong>
                  </div>
                )}
              </div>
              <p className="text-muted small mb-3">
                Archives goals that have passed their target date but aren't completed. 
                Sends reminder emails to users about their expired goals.
              </p>
              <button 
                className="btn btn-sm btn-outline-danger w-100"
                onClick={() => handleTriggerJob('goals-cleanup', 'Expired Goals Cleanup')}
                disabled={triggering === 'goals-cleanup'}
              >
                {triggering === 'goals-cleanup' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Triggering...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Test Run Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Monthly PDF Reports */}
        <div className="col-md-6">
          <div className="card h-100 border-success">
            <div className="card-header bg-success text-white d-flex align-items-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <h5 className="card-title mb-0">Monthly PDF Reports</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Schedule:</span>
                  <span className="badge bg-info">1st of month at 10:00 AM</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted">Status:</span>
                  <span className="badge bg-success">Active</span>
                </div>
                {cronStatus?.statistics?.pdfReportsGenerated !== undefined && (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted">Reports generated (all time):</span>
                    <strong>{cronStatus.statistics.pdfReportsGenerated.toLocaleString()}</strong>
                  </div>
                )}
              </div>
              <p className="text-muted small mb-3">
                Generates comprehensive monthly financial PDF reports with charts and statistics. 
                Emails reports to all goal_setter users as attachments.
              </p>
              <button 
                className="btn btn-sm btn-outline-success w-100"
                onClick={() => handleTriggerJob('monthly-reports', 'Monthly PDF Reports')}
                disabled={triggering === 'monthly-reports'}
              >
                {triggering === 'monthly-reports' ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Triggering...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                    Test Run Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">📊 System Information</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h6 className="text-muted mb-3">Timezone Configuration</h6>
                  <p className="mb-2">
                    <strong>Server Timezone:</strong> <span className="badge bg-secondary">Asia/Kolkata (IST)</span>
                  </p>
                  <p className="mb-0 small text-muted">
                    All cron jobs run according to Indian Standard Time (UTC +5:30)
                  </p>
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted mb-3">Email Configuration</h6>
                  <p className="mb-2">
                    <strong>SMTP Status:</strong> {' '}
                    {process.env.REACT_APP_SMTP_CONFIGURED === 'true' ? (
                      <span className="badge bg-success">Configured</span>
                    ) : (
                      <span className="badge bg-warning">Not Configured</span>
                    )}
                  </p>
                  <p className="mb-0 small text-muted">
                    Configure SMTP_USER and SMTP_PASS in server .env file to enable email notifications
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documentation */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-info">
            <div className="card-header bg-info text-white">
              <h5 className="card-title mb-0">📚 Documentation</h5>
            </div>
            <div className="card-body">
              <h6 className="mb-3">How to Configure Email (Required for all features)</h6>
              <ol>
                <li>Open <code>server/.env</code> file</li>
                <li>Add the following variables:
                  <pre className="bg-light p-3 mt-2 rounded">
{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password`}
                  </pre>
                </li>
                <li>For Gmail: Enable 2FA and create an App Password</li>
                <li>Restart the server</li>
              </ol>
              
              <h6 className="mt-4 mb-3">API Endpoints (Admin Only)</h6>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <code className="bg-light px-2 py-1">GET /api/cron/status</code> - View all cron job schedules and statistics
                </li>
                <li className="mb-2">
                  <code className="bg-light px-2 py-1">POST /api/cron/trigger/:jobName</code> - Manually trigger a specific job
                </li>
                <li className="mb-2">
                  <code className="bg-light px-2 py-1">GET /api/cron/goals/expiring</code> - View goals expiring within 7 days
                </li>
                <li className="mb-2">
                  <code className="bg-light px-2 py-1">GET /api/cron/items/expired</code> - View expired marketplace statistics
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
