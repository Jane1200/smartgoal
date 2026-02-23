import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { Navigate } from "react-router-dom";
import api from "@/utils/api.js";
import { toast } from "react-toastify";
import BankStatementUpload from "@/components/BankStatementUpload.jsx";
import CashNotesManager from "@/components/CashNotesManager.jsx";
import TransactionFilters from "@/components/TransactionFilters.jsx";
import ReceiptScanner from "@/components/ReceiptScanner.jsx";
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
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalDate, setWithdrawalDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [withdrawalNote, setWithdrawalNote] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

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

  const isCashNoteEntry = (entry) => {
    if (!entry) return false;
    if (entry.paymentMethod === "cash") {
      return true;
    }
    const description = (entry.description || "").trim();
    if (description.startsWith("[Cash]")) {
      return true;
    }
    const tags = Array.isArray(entry.tags) ? entry.tags : [];
    return tags.includes("cash-transaction");
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
      const allowIncome = filters.paymentTypes.includes("income") || filters.paymentTypes.includes("cashnote");
      if (!allowIncome) {
        filtered = [];
      }
    }

    if (filters.paymentTypes.includes("cashnote")) {
      filtered = filtered.filter((entry) => isCashNoteEntry(entry));
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
      const allowExpense = filters.paymentTypes.includes("expense") || filters.paymentTypes.includes("cashnote");
      if (!allowExpense) {
        filtered = [];
      }
    }

    if (filters.paymentTypes.includes("cashnote")) {
      filtered = filtered.filter((entry) => isCashNoteEntry(entry));
    }

    return filtered;
  }, [expenseEntries, searchQuery, filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid withdrawal amount.");
      return;
    }

    try {
      setWithdrawing(true);
      const description = withdrawalNote.trim()
        ? `Bank withdrawal: ${withdrawalNote.trim()}`
        : "Bank withdrawal";
      await api.post("/finance/expenses", {
        amount,
        category: "other",
        description,
        date: withdrawalDate,
        paymentMethod: "bank",
      });
      toast.success("Withdrawal recorded.");
      setWithdrawalAmount("");
      setWithdrawalNote("");
      fetchFinanceData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add withdrawal.");
    } finally {
      setWithdrawing(false);
    }
  };

  const normalizeText = (value) =>
    String(value || "")
      .replace(/^\[cash\]\s*/i, "")
      .trim()
      .toLowerCase();

  const formatLabel = (value) => {
    const cleaned = String(value || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return "Unknown";
    const capped = cleaned.length > 28 ? `${cleaned.slice(0, 25)}...` : cleaned;
    return capped.replace(/^\w/, (c) => c.toUpperCase());
  };

  const formatCurrency = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const isGenericCategory = (value) => {
    const normalized = normalizeText(value);
    return ["other", "others", "misc", "miscellaneous", "uncategorized"].includes(
      normalized
    );
  };

  const getMonthKey = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "unknown";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const insights = useMemo(() => {
    if (!expenseEntries.length && !incomeEntries.length) {
      return [];
    }

    const now = new Date();
    const last30Start = new Date(now);
    last30Start.setDate(now.getDate() - 30);
    const prev30Start = new Date(now);
    prev30Start.setDate(now.getDate() - 60);
    const last7Start = new Date(now);
    last7Start.setDate(now.getDate() - 7);
    const prev7Start = new Date(now);
    prev7Start.setDate(now.getDate() - 14);

    const essentials = new Set([
      "food",
      "transport",
      "housing",
      "healthcare",
      "education",
    ]);

    const last30Expenses = expenseEntries.filter(
      (entry) => new Date(entry.date) >= last30Start
    );
    const prev30Expenses = expenseEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= prev30Start && entryDate < last30Start;
    });
    const last7Expenses = expenseEntries.filter(
      (entry) => new Date(entry.date) >= last7Start
    );
    const prev7Expenses = expenseEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= prev7Start && entryDate < last7Start;
    });

    const sumAmounts = (entries) =>
      entries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

    const last30Total = sumAmounts(last30Expenses);
    const prev30Total = sumAmounts(prev30Expenses);
    const last7Total = sumAmounts(last7Expenses);
    const prev7Total = sumAmounts(prev7Expenses);

    const insightsList = [];

    if (prev30Total > 0) {
      const change = ((last30Total - prev30Total) / prev30Total) * 100;
      if (Math.abs(change) >= 20) {
        insightsList.push({
          title: "Monthly spending shift",
          value: `${change > 0 ? "+" : ""}${change.toFixed(0)}%`,
          tone: change > 0 ? "warning" : "success",
          detail:
            change > 0
              ? "Your spending increased vs the previous 30 days."
              : "Your spending decreased vs the previous 30 days.",
        });
      }
    }

    if (prev7Total > 0) {
      const change = ((last7Total - prev7Total) / prev7Total) * 100;
      if (Math.abs(change) >= 25) {
        insightsList.push({
          title: "Weekly trend",
          value: `${change > 0 ? "+" : ""}${change.toFixed(0)}%`,
          tone: change > 0 ? "warning" : "success",
          detail:
            change > 0
              ? "This week is heavier than the previous week."
              : "This week is lighter than the previous week.",
        });
      }
    }

    const weekendStats = last30Expenses.reduce(
      (acc, entry) => {
        const date = new Date(entry.date);
        const day = date.getDay();
        if (day === 0 || day === 6) {
          acc.weekendTotal += entry.amount || 0;
          acc.weekendCount += 1;
        } else {
          acc.weekdayTotal += entry.amount || 0;
          acc.weekdayCount += 1;
        }
        return acc;
      },
      { weekendTotal: 0, weekendCount: 0, weekdayTotal: 0, weekdayCount: 0 }
    );
    if (weekendStats.weekendCount > 0 && weekendStats.weekdayCount > 0) {
      const weekendAvg = weekendStats.weekendTotal / weekendStats.weekendCount;
      const weekdayAvg = weekendStats.weekdayTotal / weekendStats.weekdayCount;
      if (weekendAvg >= weekdayAvg * 1.4) {
        insightsList.push({
          title: "Weekend spike",
          value: `${Math.round((weekendAvg / weekdayAvg) * 100)}%`,
          tone: "warning",
          detail: `Weekend purchases average ${formatCurrency(
            weekendAvg
          )} vs ${formatCurrency(weekdayAvg)} on weekdays.`,
        });
      }
    }

    const essentialSpend = last30Expenses.reduce((sum, entry) => {
      const category = normalizeText(entry.category);
      if (essentials.has(category)) {
        return sum + (entry.amount || 0);
      }
      return sum;
    }, 0);
    const discretionarySpend = last30Total - essentialSpend;
    if (last30Total > 0) {
      const discretionaryShare = (discretionarySpend / last30Total) * 100;
      const essentialsShare = 100 - discretionaryShare;
      if (essentialSpend === 0) {
        insightsList.push({
          title: "Category cleanup",
          value: "Needs unknown",
          tone: "info",
          detail:
            "Most spending is uncategorized or outside essentials. Add categories to get clearer insights.",
        });
      } else {
        insightsList.push({
          title: "Needs vs wants",
          value: `Needs ${essentialsShare.toFixed(0)}%`,
          tone: discretionaryShare >= 45 ? "warning" : "success",
          detail: `Wants ${discretionaryShare.toFixed(
            0
          )}% (${formatCurrency(discretionarySpend)}) in the last 30 days.`,
        });
      }
    }

    const cashSpend = last30Expenses
      .filter((entry) => entry.paymentMethod === "cash")
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);
    if (last30Total > 0) {
      const cashShare = (cashSpend / last30Total) * 100;
      if (cashShare >= 40) {
        insightsList.push({
          title: "Cash-heavy spending",
          value: `${cashShare.toFixed(0)}%`,
          tone: "warning",
          detail: "High cash usage can hide patterns. Try logging cash notes daily.",
        });
      }
    }

    const merchantTotals = last30Expenses.reduce((acc, entry) => {
      const merchant =
        normalizeText(entry.description) ||
        normalizeText(entry.source) ||
        normalizeText(entry.category) ||
        "unknown";
      acc[merchant] = (acc[merchant] || 0) + (entry.amount || 0);
      return acc;
    }, {});
    const sortedMerchants = Object.entries(merchantTotals).sort(
      (a, b) => b[1] - a[1]
    );
    if (sortedMerchants.length > 0) {
      const [topMerchant, topAmount] = sortedMerchants[0];
      if (topAmount > 0 && topMerchant !== "unknown" && !isGenericCategory(topMerchant)) {
        insightsList.push({
          title: "Largest merchant",
          value: formatLabel(topMerchant),
          tone: "info",
          detail: `${formatCurrency(
            topAmount
          )} spent in the last 30 days.`,
        });
      }
    }

    const recurringCandidates = expenseEntries.reduce((acc, entry) => {
      const merchant =
        normalizeText(entry.description) ||
        normalizeText(entry.source) ||
        normalizeText(entry.category) ||
        "unknown";
      if (merchant === "unknown") return acc;
      const monthKey = getMonthKey(entry.date);
      acc[merchant] = acc[merchant] || { months: new Set(), count: 0 };
      acc[merchant].months.add(monthKey);
      acc[merchant].count += 1;
      return acc;
    }, {});
    const recurring = Object.entries(recurringCandidates)
      .filter(([, data]) => data.months.size >= 2 && data.count >= 3)
      .map(([merchant]) => merchant);
    if (recurring.length > 0) {
      const recurringSpendLast30 = last30Expenses.reduce((sum, entry) => {
        const merchant =
          normalizeText(entry.description) ||
          normalizeText(entry.source) ||
          normalizeText(entry.category) ||
          "unknown";
        if (recurring.includes(merchant)) {
          return sum + (entry.amount || 0);
        }
        return sum;
      }, 0);
      insightsList.push({
        title: "Subscription check",
        value: `${recurring.length} active`,
        tone: recurringSpendLast30 >= last30Total * 0.3 ? "warning" : "info",
        detail: `${formatCurrency(
          recurringSpendLast30
        )} billed in the last 30 days. Consider canceling unused subscriptions.`,
      });
    }

    return insightsList.slice(0, 6);
  }, [expenseEntries, incomeEntries]);

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
            Bank Transactions
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
        <li className="nav-item">
          <button
            className={`nav-link d-flex align-items-center gap-2 ${activeTab === "receipt" ? "active" : ""}`}
            onClick={() => setActiveTab("receipt")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            Scan Receipt
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div>
          <div className="row g-3">
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <div className="text-muted small">Total balance</div>
                      <h3 className="mb-1 fw-bold">
                        ₹{financeData.totalSavings.toLocaleString("en-IN")}
                      </h3>
                      <div className="text-muted small">
                        {financeData.totalSavingsRate}% savings rate
                      </div>
                    </div>
                    <div className="bg-primary bg-opacity-10 p-2 rounded">
                      <AccountBalanceWallet className="text-primary" fontSize="small" />
                    </div>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-4">
                      <div className="text-muted small">Income</div>
                      <div className="fw-semibold text-success">
                        ₹{financeData.totalIncome.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-muted small">Expenses</div>
                      <div className="fw-semibold text-danger">
                        ₹{financeData.totalExpenses.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="text-muted small">Net savings</div>
                      <div className="fw-semibold">
                        ₹{financeData.totalSavings.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  <div className="border-top mt-3 pt-3 d-flex flex-wrap justify-content-between gap-3">
                    <div>
                      <div className="text-muted small">Cash in hand</div>
                      <div className="fw-semibold text-info">
                        ₹{(financeData.cashInHand || 0).toLocaleString("en-IN")}
                      </div>
                      <div className="text-muted small">
                        +₹{(financeData.cashIncome || 0).toLocaleString("en-IN")} / -₹{(financeData.cashExpense || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted small">Cash at bank</div>
                      <div className="fw-semibold text-primary">
                        ₹{(financeData.cashAtBank || 0).toLocaleString("en-IN")}
                      </div>
                      <div className="text-muted small">
                        +₹{(financeData.bankIncome || 0).toLocaleString("en-IN")} / -₹{(financeData.bankExpense || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="fw-semibold">Smart Spending Insights</div>
                    <span className="text-muted small">Last 30 days</span>
                  </div>
                  {insights.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      Add more transactions to unlock smart spending insights.
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {insights.map((insight, index) => (
                        <div key={`${insight.title}-${index}`} className="list-group-item px-0">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="me-3">
                              <div className="fw-semibold">{insight.title}</div>
                              <div className="text-muted small">{insight.detail}</div>
                            </div>
                            <span
                              className={`badge align-self-start bg-${
                                insight.tone === "warning"
                                  ? "warning"
                                  : insight.tone === "success"
                                    ? "success"
                                    : insight.tone === "danger"
                                      ? "danger"
                                      : "info"
                              }`}
                            >
                              {insight.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
          <div className="col-lg-8 mx-auto mt-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="fw-semibold">Bank Withdrawal</div>
                  <span className="text-muted small">Manual entry</span>
                </div>
                <form onSubmit={handleWithdrawal}>
                  <div className="row g-2 align-items-end">
                    <div className="col-md-4">
                      <label className="form-label small text-muted">Amount</label>
                      <div className="input-group">
                        <span className="input-group-text">₹</span>
                        <input
                          type="number"
                          className="form-control"
                          min="1"
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          placeholder="500"
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small text-muted">Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={withdrawalDate}
                        onChange={(e) => setWithdrawalDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small text-muted">Note (optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        maxLength={50}
                        value={withdrawalNote}
                        onChange={(e) => setWithdrawalNote(e.target.value)}
                        placeholder="ATM"
                      />
                    </div>
                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn btn-outline-primary w-100"
                        disabled={withdrawing}
                      >
                        {withdrawing ? "Saving..." : "Record Withdrawal"}
                      </button>
                    </div>
                  </div>
                  <div className="small text-muted mt-2">
                    This reduces Cash at Bank by recording a bank expense.
                  </div>
                </form>
              </div>
            </div>
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

      {activeTab === "receipt" && (
        <div className="row">
          <div className="col-lg-10 mx-auto">
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <ReceiptScanner onExpenseAdded={fetchFinanceData} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
