import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import BankStatementUpload from "@/components/BankStatementUpload.jsx";
import CashNotesManager from "@/components/CashNotesManager.jsx";
import TransactionFilters from "@/components/TransactionFilters.jsx";
import {
  AccountBalanceWallet,
  TrendingUp,
  TrendingDown,
  Assessment,
  Receipt,
  CloudUpload,
  Money,
  GetApp,
} from "@mui/icons-material";

export default function Finances() {
  const authContext = useAuth();
  const user = authContext?.user;

  const [activeTab, setActiveTab] = useState("overview");
  const [financeData, setFinanceData] = useState({
    monthlyIncome: 0,
    monthlyExpense: 0,
    monthlySavings: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    monthlySavingsRate: 0,
    totalSavingsRate: 0,
    cashInHand: 0,
    cashAtBank: 0,
    cashIncome: 0,
    cashExpense: 0,
    bankIncome: 0,
    bankExpense: 0,
  });
  const [incomeEntries, setIncomeEntries] = useState([]);
  const [expenseEntries, setExpenseEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    dateFilter: "all",
    amountRanges: [],
    paymentTypes: []
  });

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);

      // Fetch all-time data (no date filtering)
      const summaryUrl = `/finance/summary`;
      const incomeUrl = `/finance/income`;
      const expenseUrl = `/finance/expenses`;

      const [summaryResponse, incomeResponse, expenseResponse] =
        await Promise.allSettled([
          api.get(summaryUrl),
          api.get(incomeUrl),
          api.get(expenseUrl),
        ]);

      let allIncomeEntries = [];
      let allExpenseEntries = [];

      if (incomeResponse.status === "fulfilled") {
        allIncomeEntries = incomeResponse.value.data || [];
      }

      if (expenseResponse.status === "fulfilled") {
        allExpenseEntries = expenseResponse.value.data || [];
      }

      setIncomeEntries(allIncomeEntries);
      setExpenseEntries(allExpenseEntries);

      const calculatedTotals = calculateTotalsFromEntries(
        allIncomeEntries,
        allExpenseEntries
      );

      if (summaryResponse.status === "fulfilled") {
        const serverData = summaryResponse.value.data;
        setFinanceData({
          ...serverData,
          totalIncome: calculatedTotals.totalIncome,
          totalExpenses: calculatedTotals.totalExpenses,
          totalSavings: calculatedTotals.totalSavings,
          monthlyIncome: calculatedTotals.monthlyIncome,
          monthlyExpense: calculatedTotals.monthlyExpense,
          monthlySavings: calculatedTotals.monthlySavings,
          monthlySavingsRate: calculatedTotals.monthlySavingsRate,
          totalSavingsRate: calculatedTotals.totalSavingsRate,
          cashInHand: calculatedTotals.cashInHand,
          cashAtBank: calculatedTotals.cashAtBank,
          cashIncome: calculatedTotals.cashIncome,
          cashExpense: calculatedTotals.cashExpense,
          bankIncome: calculatedTotals.bankIncome,
          bankExpense: calculatedTotals.bankExpense,
        });
      } else {
        setFinanceData(calculatedTotals);
      }
    } catch (error) {
      console.error("Failed to fetch finance data:", error);
      toast.error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalsFromEntries = (incomeEntries, expenseEntries) => {
    const totalIncome = incomeEntries.reduce(
      (sum, entry) => sum + (entry.amount || 0),
      0
    );
    const totalExpenses = expenseEntries.reduce(
      (sum, entry) => sum + (entry.amount || 0),
      0
    );
    const totalSavings = totalIncome - totalExpenses;
    const totalSavingsRate =
      totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0;

    // Calculate cash in hand (paymentMethod === "cash")
    const cashIncome = incomeEntries
      .filter(entry => entry.paymentMethod === "cash")
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const cashExpense = expenseEntries
      .filter(entry => entry.paymentMethod === "cash")
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const cashInHand = cashIncome - cashExpense;

    // Calculate cash at bank (paymentMethod === "bank", "card", "upi", or "other")
    const bankIncome = incomeEntries
      .filter(entry => entry.paymentMethod !== "cash")
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const bankExpense = expenseEntries
      .filter(entry => entry.paymentMethod !== "cash")
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const cashAtBank = bankIncome - bankExpense;

    return {
      totalIncome,
      totalExpenses,
      totalSavings,
      monthlyIncome: totalIncome,
      monthlyExpense: totalExpenses,
      monthlySavings: totalSavings,
      monthlySavingsRate: totalSavingsRate,
      totalSavingsRate: totalSavingsRate,
      cashInHand,
      cashAtBank,
      cashIncome,
      cashExpense,
      bankIncome,
      bankExpense,
    };
  };

  // Filter helper functions
  const getDateRange = (filterType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filterType) {
      case "today":
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case "this-week": {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        return { start: weekStart, end: weekEnd };
      }
      case "this-month": {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: monthStart, end: monthEnd };
      }
      case "this-year": {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31);
        return { start: yearStart, end: yearEnd };
      }
      case "last-30-days": {
        const start = new Date(today);
        start.setDate(today.getDate() - 30);
        return { start, end: now };
      }
      case "last-90-days": {
        const start = new Date(today);
        start.setDate(today.getDate() - 90);
        return { start, end: now };
      }
      default:
        return null;
    }
  };

  const matchesDateFilter = (entry, dateFilter) => {
    if (dateFilter === "all") return true;
    
    const dateRange = getDateRange(dateFilter);
    if (!dateRange) return true;
    
    const entryDate = new Date(entry.date);
    return entryDate >= dateRange.start && entryDate <= dateRange.end;
  };

  const matchesAmountFilter = (entry, amountRanges) => {
    if (amountRanges.length === 0) return true;
    
    const amount = entry.amount || 0;
    return amountRanges.some(range => {
      if (range === "0-200") return amount <= 200;
      if (range === "200-500") return amount > 200 && amount <= 500;
      if (range === "500-1000") return amount > 500 && amount <= 1000;
      if (range === "1000-5000") return amount > 1000 && amount <= 5000;
      if (range === "5000-10000") return amount > 5000 && amount <= 10000;
      if (range === "10000+") return amount > 10000;
      return false;
    });
  };

  const matchesSearchQuery = (entry, query) => {
    if (!query) return true;
    
    const searchLower = query.toLowerCase();
    const description = (entry.description || entry.source || entry.category || "").toLowerCase();
    const category = (entry.category || "").toLowerCase();
    const amount = (entry.amount || 0).toString();
    
    return description.includes(searchLower) || 
           category.includes(searchLower) || 
           amount.includes(searchLower);
  };

  // Filtered entries using useMemo
  const filteredIncomeEntries = useMemo(() => {
    let filtered = incomeEntries;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(entry => matchesSearchQuery(entry, searchQuery));
    }

    // Apply date filter
    if (filters.dateFilter !== "all") {
      filtered = filtered.filter(entry => matchesDateFilter(entry, filters.dateFilter));
    }

    // Apply amount filter
    if (filters.amountRanges.length > 0) {
      filtered = filtered.filter(entry => matchesAmountFilter(entry, filters.amountRanges));
    }

    // Apply payment type filter
    if (filters.paymentTypes.length > 0) {
      if (filters.paymentTypes.includes("income")) {
        // Keep all income entries
      } else {
        // If income is not selected, filter out all
        filtered = [];
      }
    }

    return filtered;
  }, [incomeEntries, searchQuery, filters]);

  const filteredExpenseEntries = useMemo(() => {
    let filtered = expenseEntries;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(entry => matchesSearchQuery(entry, searchQuery));
    }

    // Apply date filter
    if (filters.dateFilter !== "all") {
      filtered = filtered.filter(entry => matchesDateFilter(entry, filters.dateFilter));
    }

    // Apply amount filter
    if (filters.amountRanges.length > 0) {
      filtered = filtered.filter(entry => matchesAmountFilter(entry, filters.amountRanges));
    }

    // Apply payment type filter
    if (filters.paymentTypes.length > 0) {
      if (filters.paymentTypes.includes("expense")) {
        // Keep all expense entries
      } else {
        // If expense is not selected, filter out all
        filtered = [];
      }
    }

    return filtered;
  }, [expenseEntries, searchQuery, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ maxWidth: "1400px" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-primary bg-opacity-10 p-3 rounded-3">
            <AccountBalanceWallet className="text-primary" style={{ fontSize: "2rem" }} />
          </div>
          <div>
            <h2 className="mb-1 fw-bold">Finances</h2>
            <p className="text-muted mb-0">Track your income, expenses, and savings</p>
          </div>
        </div>
        
        {/* Download Report Button */}
        <button 
          className="btn btn-primary d-flex align-items-center gap-2"
          onClick={async () => {
            try {
              const response = await api.get('/analytics/generate-monthly-report', { responseType: 'blob' });
              const blob = new Blob([response.data], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `SmartGoal_Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              toast.success('Report downloaded successfully!');
            } catch (error) {
              console.error('Failed to download report:', error);
              toast.error('Failed to download report');
            }
          }}
        >
          <GetApp fontSize="small" />
          Download Report
        </button>
      </div>

      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-2 ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Assessment fontSize="small" />
            Overview
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-2 ${activeTab === "transactions" ? "active" : ""}`}
            onClick={() => setActiveTab("transactions")}
          >
            <Receipt fontSize="small" />
            Transactions
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-2 ${activeTab === "import" ? "active" : ""}`}
            onClick={() => setActiveTab("import")}
          >
            <CloudUpload fontSize="small" />
            Bank Statement
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-2 ${activeTab === "cash" ? "active" : ""}`}
            onClick={() => setActiveTab("cash")}
          >
            <Money fontSize="small" />
            Cash Notes
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div>
          {/* Balance Cards */}
          <div className="row g-3 mb-4">
            {/* Total Balance */}
            <div className="col-lg-3 col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="bg-primary bg-opacity-10 p-2 rounded">
                      <AccountBalanceWallet className="text-primary" fontSize="small" />
                    </div>
                    <div className="text-muted small">Total Balance</div>
                  </div>
                  <h4 className="mb-0 fw-bold">
                    ₹{financeData.totalSavings.toLocaleString("en-IN")}
                  </h4>
                  <div className="text-muted small mt-1">
                    {financeData.totalSavingsRate}% savings rate
                  </div>
                </div>
              </div>
            </div>

            {/* Cash in Hand */}
            <div className="col-lg-3 col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="bg-info bg-opacity-10 p-2 rounded">
                      <Money className="text-info" fontSize="small" />
                    </div>
                    <div className="text-muted small">Cash in Hand</div>
                  </div>
                  <h4 className="mb-0 fw-bold text-info">
                    ₹{(financeData.cashInHand || 0).toLocaleString("en-IN")}
                  </h4>
                  <div className="d-flex justify-content-between mt-1">
                    <small className="text-success">+₹{(financeData.cashIncome || 0).toLocaleString("en-IN")}</small>
                    <small className="text-danger">-₹{(financeData.cashExpense || 0).toLocaleString("en-IN")}</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash at Bank */}
            <div className="col-lg-3 col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="bg-primary bg-opacity-10 p-2 rounded">
                      <AccountBalanceWallet className="text-primary" fontSize="small" />
                    </div>
                    <div className="text-muted small">Cash at Bank</div>
                  </div>
                  <h4 className="mb-0 fw-bold text-primary">
                    ₹{(financeData.cashAtBank || 0).toLocaleString("en-IN")}
                  </h4>
                  <div className="d-flex justify-content-between mt-1">
                    <small className="text-success">+₹{(financeData.bankIncome || 0).toLocaleString("en-IN")}</small>
                    <small className="text-danger">-₹{(financeData.bankExpense || 0).toLocaleString("en-IN")}</small>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Income/Expense */}
            <div className="col-lg-3 col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="bg-success bg-opacity-10 p-2 rounded">
                      <Assessment className="text-success" fontSize="small" />
                    </div>
                    <div className="text-muted small">Overall</div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="text-success fw-semibold">₹{financeData.totalIncome.toLocaleString("en-IN")}</div>
                      <small className="text-muted">Income</small>
                    </div>
                    <div className="text-end">
                      <div className="text-danger fw-semibold">₹{financeData.totalExpenses.toLocaleString("en-IN")}</div>
                      <small className="text-muted">Expense</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === "transactions" && (
        <>
          {/* Transaction Filters */}
          <TransactionFilters 
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
          />

          <div className="row g-4">
          {/* Income Section */}
          <div className="col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <TrendingUp className="text-success" />
                    <h5 className="mb-0">Income</h5>
                  </div>
                  <span className="badge bg-success">{filteredIncomeEntries.length} of {incomeEntries.length}</span>
                </div>
              </div>
              <div className="card-body" style={{ maxHeight: "600px", overflowY: "auto" }}>
                {filteredIncomeEntries.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <p>{incomeEntries.length === 0 ? "No income entries for this period" : "No income entries match your filters"}</p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {filteredIncomeEntries.map((entry) => (
                      <div key={entry._id} className="list-group-item px-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{entry.description || entry.source}</div>
                            <small className="text-muted">
                              {new Date(entry.date).toLocaleDateString("en-IN")}
                            </small>
                          </div>
                          <div className="text-success fw-bold">
                            +₹{entry.amount.toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expense Section */}
          <div className="col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <TrendingDown className="text-danger" />
                    <h5 className="mb-0">Expenses</h5>
                  </div>
                  <span className="badge bg-danger">{filteredExpenseEntries.length} of {expenseEntries.length}</span>
                </div>
              </div>
              <div className="card-body" style={{ maxHeight: "600px", overflowY: "auto" }}>
                {filteredExpenseEntries.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <p>{expenseEntries.length === 0 ? "No expense entries for this period" : "No expense entries match your filters"}</p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {filteredExpenseEntries.map((entry) => (
                      <div key={entry._id} className="list-group-item px-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="fw-semibold">{entry.description || entry.category}</div>
                            <small className="text-muted">
                              {new Date(entry.date).toLocaleDateString("en-IN")} • {entry.category}
                            </small>
                          </div>
                          <div className="text-danger fw-bold">
                            -₹{entry.amount.toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {activeTab === "import" && (
        <div className="row">
          <div className="col-lg-8 mx-auto">
            <BankStatementUpload onImportComplete={fetchFinanceData} />
          </div>
        </div>
      )}

      {activeTab === "cash" && (
        <div className="row">
          <div className="col-lg-10 mx-auto">
            <CashNotesManager onConvert={fetchFinanceData} />
          </div>
        </div>
      )}
    </div>
  );
}
