import GoalsManager from "@/sections/GoalsManager.jsx";
import WishlistManager from "@/sections/WishlistManager.jsx";
import GoalPredictions from "@/components/GoalPredictions.jsx";
import GoalRecommendations from "@/components/GoalRecommendations.jsx";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import {
  EmojiEvents,
  FavoriteBorder,
  AccountBalanceWallet,
  TrendingUp,
  Lightbulb,
} from "@mui/icons-material";

export default function GoalsPage() {
  const authContext = useAuth();
  const user = authContext?.user;

  const [activeTab, setActiveTab] = useState("recommendations");
  const [financeData, setFinanceData] = useState({
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlySavings: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0
  });
  const [financeLoading, setFinanceLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(false);

  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.profile?.role !== "goal_setter") {
    return <Navigate to="/dashboard-redirect" replace />;
  }

  const loadFinanceData = async () => {
    try {
      setFinanceLoading(true);
      
      const [incomeRes, expenseRes] = await Promise.all([
        api.get("/finance/income"),
        api.get("/finance/expenses")
      ]);
      
      const incomeEntries = incomeRes.data || [];
      const expenseEntries = expenseRes.data || [];
      
      const totalIncome = incomeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
      const totalExpenses = expenseEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
      const totalSavings = totalIncome - totalExpenses;
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentIncome = incomeEntries
        .filter(e => new Date(e.date) >= thirtyDaysAgo)
        .reduce((sum, entry) => sum + (entry.amount || 0), 0);
      
      const recentExpenses = expenseEntries
        .filter(e => new Date(e.date) >= thirtyDaysAgo)
        .reduce((sum, entry) => sum + (entry.amount || 0), 0);
      
      setFinanceData({
        monthlyIncome: recentIncome,
        monthlyExpense: recentExpenses,
        monthlySavings: recentIncome - recentExpenses,
        totalIncome,
        totalExpenses,
        totalSavings
      });
    } catch (error) {
      console.error("Failed to load finance data:", error);
      toast.error("Failed to load finance data");
    } finally {
      setFinanceLoading(false);
    }
  };

  const isGoalCreationEnabled = () => {
    return financeData.totalSavings >= 100;
  };

  const loadGoals = async () => {
    try {
      setGoalsLoading(true);
      const { data } = await api.get("/goals");
      setGoals(data);
    } catch (error) {
      console.error("Failed to load goals:", error);
      toast.error("Failed to load goals");
    } finally {
      setGoalsLoading(false);
    }
  };

  const checkExpiredGoals = async () => {
    try {
      await api.post('/goals/check-expired');
    } catch (error) {
      console.error('Failed to check expired goals:', error);
    }
  };

  const refreshFinanceData = () => {
    loadFinanceData();
    loadGoals();
  };

  const handleManualAllocation = async () => {
    try {
      const { data } = await api.post("/goals/allocate-savings");
      
      if (data.success) {
        toast.success(data.message);
        await loadGoals();
        await loadFinanceData();
      } else {
        toast.warning(data.message || "No savings to allocate");
      }
    } catch (error) {
      console.error("Manual allocation error:", error);
      toast.error("Failed to allocate savings to goals");
    }
  };

  useEffect(() => {
    loadFinanceData();
    loadGoals();
    checkExpiredGoals();
  }, []);

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "1400px" }}>
      {/* Header */}
      <div className="mb-4">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-warning bg-opacity-10 p-3 rounded-3">
            <EmojiEvents className="text-warning" style={{ fontSize: "2rem" }} />
          </div>
          <div>
            <h2 className="mb-1 fw-bold">My Goals & Wishlist</h2>
            <p className="text-muted mb-0">Track and manage your personal goals and wishlist items</p>
          </div>
        </div>
      </div>
      
      {/* Cleaner Tab Structure */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-2 ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <EmojiEvents fontSize="small" />
            All Goals
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-2 ${activeTab === "recommendations" ? "active" : ""}`}
            onClick={() => setActiveTab("recommendations")}
          >
            <Lightbulb fontSize="small" />
            AI Suggestions
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-2 ${activeTab === "wishlist" ? "active" : ""}`}
            onClick={() => setActiveTab("wishlist")}
          >
            <FavoriteBorder fontSize="small" />
            Wishlist
          </button>
        </li>
      </ul>

      {/* All Goals Tab - Just visualization and management */}
      {activeTab === "all" && (
        <div>
          {financeLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Balance Card - Single Card */}
              <div className="row g-3 mb-4">
                <div className="col-12">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                          <div className="bg-success bg-opacity-10 p-3 rounded">
                            <AccountBalanceWallet className="text-success" style={{ fontSize: '2rem' }} />
                          </div>
                          <div>
                            <small className="text-muted d-block">Available Balance</small>
                            <h3 className="mb-0 text-success">₹{financeData.totalSavings?.toLocaleString() || '0'}</h3>
                            <small className="text-muted">Your current savings for goals</small>
                          </div>
                        </div>
                        
                        {/* Allocate Button */}
                        {financeData.totalSavings > 0 && goals.length > 0 && (
                          <button 
                            className="btn btn-success d-flex align-items-center gap-2"
                            onClick={handleManualAllocation}
                            disabled={financeLoading || goalsLoading}
                          >
                            <TrendingUp fontSize="small" />
                            Allocate to Goals
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Predictions */}
              {!goalsLoading && goals.length > 0 && goals.filter(g => g.status === 'planned' || g.status === 'in_progress').length > 0 && (
                <GoalPredictions 
                  goals={goals.filter(g => g.status === 'planned' || g.status === 'in_progress')}
                  onRefresh={loadGoals}
                />
              )}
        
              {/* Goals List */}
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white border-bottom">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Your Goals</h5>
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-primary"
                        onClick={() => setActiveTab("recommendations")}
                      >
                        <Lightbulb fontSize="small" className="me-1" />
                        Get AI Suggestions
                      </button>
                      <button className="btn btn-outline-secondary" onClick={loadGoals} disabled={goalsLoading}>
                        {goalsLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Loading...
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1">
                              <polyline points="23 4 23 10 17 10"/>
                              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                            </svg>
                            Refresh
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="card-body p-0">
                  {goalsLoading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : goals.length === 0 ? (
                    <div className="text-center py-5">
                      <EmojiEvents style={{ fontSize: '4rem', opacity: 0.2 }} className="text-muted mb-3" />
                      <h5 className="text-muted">No goals yet</h5>
                      <p className="text-muted mb-4">Start your financial journey with AI-powered goal suggestions!</p>
                      <button 
                        className="btn btn-primary btn-lg"
                        onClick={() => setActiveTab("recommendations")}
                      >
                        <Lightbulb fontSize="small" className="me-2" />
                        Get AI Suggestions
                      </button>
                    </div>
                  ) : (
                    <GoalsManager 
                      viewMode="list"
                      financeData={financeData}
                      isGoalCreationEnabled={isGoalCreationEnabled}
                      refreshFinanceData={refreshFinanceData}
                      showCreateForm={false}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* AI Suggestions Tab - Primary goal creation method */}
      {activeTab === "recommendations" && (
        <div>
          <GoalRecommendations 
            onGoalCreated={() => {
              loadGoals();
              setActiveTab("all");
            }}
            financeData={financeData}
            isGoalCreationEnabled={isGoalCreationEnabled}
            refreshFinanceData={refreshFinanceData}
          />
        </div>
      )}

      {/* Wishlist Tab */}
      {activeTab === "wishlist" && (
        <div>
          <WishlistManager />
        </div>
      )}


    </div>
  );
}
