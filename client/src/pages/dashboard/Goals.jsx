import GoalsManager from "@/sections/GoalsManager.jsx";
import FinanceDataView from "@/components/FinanceDataView.jsx";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "@/utils/api.js";

export default function GoalsPage() {
  const authContext = useAuth();
  const user = authContext?.user;

  // Redirect if not authenticated
  if (!user?.token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect if not a goal setter
  if (user?.profile?.role !== "goal_setter") {
    return <Navigate to="/dashboard-redirect" replace />;
  }

  // Finance data state
  const [viewMode, setViewMode] = useState('all-time');
  const [financeData, setFinanceData] = useState({
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlySavings: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0
  });
  const [financeLoading, setFinanceLoading] = useState(false);

  // Helper function to validate and format amount
  const validateAmount = (amount) => {
    if (typeof amount === 'string') {
      const parsed = parseFloat(amount);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof amount === 'number') {
      return isNaN(amount) ? 0 : amount;
    }
    return 0;
  };

  // Load finance data
  const loadFinanceData = async () => {
    try {
      setFinanceLoading(true);
      const [summaryResponse, incomeResponse, expenseResponse] = await Promise.allSettled([
        api.get(viewMode === 'current-month' ? "/finance/summary" : "/finance/summary?all=true"),
        api.get("/finance/income"),
        api.get("/finance/expenses")
      ]);

      let allIncomeEntries = [];
      let allExpenseEntries = [];

      if (incomeResponse.status === 'fulfilled') {
        allIncomeEntries = incomeResponse.value.data || [];
      }

      if (expenseResponse.status === 'fulfilled') {
        allExpenseEntries = expenseResponse.value.data || [];
      }

      let incomeEntries = allIncomeEntries;
      let expenseEntries = allExpenseEntries;

      if (viewMode === 'current-month') {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        incomeEntries = allIncomeEntries.filter(entry => {
          if (!entry.date) return false;
          const entryDate = new Date(entry.date);
          return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        });

        expenseEntries = allExpenseEntries.filter(entry => {
          if (!entry.date) return false;
          const entryDate = new Date(entry.date);
          return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
        });
      }

      let totalIncome = 0;
      let totalExpenses = 0;
      let monthlyIncome = 0;
      let monthlyExpense = 0;

      if (viewMode === 'current-month') {
        totalIncome = incomeEntries.reduce((sum, entry) => {
          const amount = validateAmount(entry.amount);
          return sum + amount;
        }, 0);
        totalExpenses = expenseEntries.reduce((sum, entry) => {
          const amount = validateAmount(entry.amount);
          return sum + amount;
        }, 0);
        monthlyIncome = totalIncome;
        monthlyExpense = totalExpenses;
      } else {
        totalIncome = incomeEntries.reduce((sum, entry) => {
          const amount = validateAmount(entry.amount);
          return sum + amount;
        }, 0);
        totalExpenses = expenseEntries.reduce((sum, entry) => {
          const amount = validateAmount(entry.amount);
          return sum + amount;
        }, 0);
        
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        monthlyIncome = allIncomeEntries
          .filter(entry => {
            if (!entry.date) return false;
            const entryDate = new Date(entry.date);
            return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
          })
          .reduce((sum, entry) => {
            const amount = validateAmount(entry.amount);
            return sum + amount;
          }, 0);
          
        monthlyExpense = allExpenseEntries
          .filter(entry => {
            if (!entry.date) return false;
            const entryDate = new Date(entry.date);
            return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
          })
          .reduce((sum, entry) => {
            const amount = validateAmount(entry.amount);
            return sum + amount;
          }, 0);
      }

      const monthlySavings = Math.max(0, monthlyIncome - monthlyExpense);
      const totalSavings = Math.max(0, totalIncome - totalExpenses);

      setFinanceData({
        monthlyIncome,
        monthlyExpense,
        monthlySavings,
        totalIncome,
        totalExpenses,
        totalSavings
      });
    } catch (error) {
      console.error("Failed to load finance data:", error);
    } finally {
      setFinanceLoading(false);
    }
  };

  // Check if goal creation should be enabled based on savings
  const isGoalCreationEnabled = () => {
    return financeData.totalSavings >= 100;
  };

  // Function to refresh finance data
  const refreshFinanceData = () => {
    loadFinanceData();
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [viewMode]);

  return (
    <div className="container-xxl py-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h1 className="h3 mb-1">My Goals</h1>
          <p className="text-muted mb-0">Track and manage your personal goals</p>
        </div>
      </div>
      
      {/* Finance Data View Section */}
      <FinanceDataView 
        viewMode={viewMode}
        setViewMode={setViewMode}
        financeData={financeData}
        setFinanceData={setFinanceData}
        isGoalCreationEnabled={isGoalCreationEnabled}
        refreshFinanceData={refreshFinanceData}
        financeLoading={financeLoading}
      />
      
      <GoalsManager 
        viewMode={viewMode}
        financeData={financeData}
        isGoalCreationEnabled={isGoalCreationEnabled}
        refreshFinanceData={refreshFinanceData}
      />
    </div>
  );
}



