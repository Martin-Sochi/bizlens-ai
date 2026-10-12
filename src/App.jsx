import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { analyzeFinancials } from "./financialInsights";

import {
  LayoutDashboard,
  ChartNoAxesCombined,
  ReceiptText,
  Lightbulb,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Banknote,
  TrendingUp,
  ShoppingBag,
  Download,
  Sparkles,
  Menu,
  X,
  CircleHelp,
  FileSpreadsheet,
  Plus,
  Trash2,
  Upload,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import "./App.css";

const STORAGE_KEY = "bizlens-transactions-v1";

const initialTransactions = [
  {
    id: "BL-1048",
    description: "Product sales",
    category: "Sales",
    date: "2026-10-12",
    amount: 185000,
    type: "income",
  },
  {
    id: "BL-1047",
    description: "Stock replenishment",
    category: "Inventory",
    date: "2026-10-11",
    amount: 95000,
    type: "expense",
  },
  {
    id: "BL-1046",
    description: "Product sales",
    category: "Sales",
    date: "2026-10-10",
    amount: 124000,
    type: "income",
  },
  {
    id: "BL-1045",
    description: "Shop rent",
    category: "Operations",
    date: "2026-10-09",
    amount: 80000,
    type: "expense",
  },
];

const expenseColors = [
  "#6478ed",
  "#21b99a",
  "#f2a65a",
  "#a47af0",
  "#ec7895",
  "#5aa8d8",
  "#8b96a8",
];

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatCompact = (amount) => {
  const value = Number(amount) || 0;

  if (Math.abs(value) >= 1000000) {
    return `₦${(value / 1000000).toFixed(1)}m`;
  }

  if (Math.abs(value) >= 1000) {
    return `₦${Math.round(value / 1000)}k`;
  }

  return `₦${value}`;
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const createReference = () =>
  `BL-${Date.now().toString().slice(-8)}`;

const loadTransactions = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Could not load saved transactions:", error);
  }

  return initialTransactions;
};

const normalizeType = (value) => {
  const type = String(value ?? "").trim().toLowerCase();

  if (["income", "revenue", "sale", "sales", "credit"].includes(type)) {
    return "income";
  }

  if (
    ["expense", "expenses", "cost", "debit", "purchase", "purchases"].includes(
      type
    )
  ) {
    return "expense";
  }

  return null;
};

const parseAmount = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  const cleaned = String(value ?? "")
    .replace(/[₦,\s]/g, "")
    .trim();

  if (!cleaned) return NaN;

  return Number(cleaned);
};


const isValidDate = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};



function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [period, setPeriod] = useState("6 months");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [transactions, setTransactions] = useState(loadTransactions);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [notice, setNotice] = useState(null);

  const [form, setForm] = useState({
    description: "",
    category: "Sales",
    type: "income",
    amount: "",
    date: getToday(),
  });

  const [csvInputKey, setCsvInputKey] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error("Could not save transactions:", error);
      setNotice({
        type: "error",
        text: "Your browser could not save the data. Try clearing browser storage.",
      });
    }
  }, [transactions]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = window.setTimeout(() => setNotice(null), 4500);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  const navigation = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Financial insights", icon: ChartNoAxesCombined },
    { label: "Transactions", icon: ReceiptText },
    { label: "AI recommendations", icon: Lightbulb },
  ];

  const filteredTransactions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return [...transactions].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
    }

    return transactions
      .filter((transaction) =>
        [
          transaction.id,
          transaction.description,
          transaction.category,
          transaction.type,
          transaction.date,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, searchTerm]);


    
const financials = useMemo(() => {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const expenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);

  const profit = income - expenses;
  const margin = income > 0 ? (profit / income) * 100 : 0;

  return {
    income,
    expenses,
    profit,
    margin,
    transactionCount: transactions.length,
  };
}, [transactions]);

const analysis = useMemo(
  () => analyzeFinancials(transactions),
  [transactions]
);



  const expenseData = useMemo(() => {
    const groups = new Map();

    transactions
      .filter((transaction) => transaction.type === "expense")
      .forEach((transaction) => {
        const category = transaction.category || "Uncategorized";

        groups.set(
          category,
          (groups.get(category) || 0) + transaction.amount
        );
      });

    return [...groups.entries()]
      .map(([name, value], index) => ({
        name,
        value,
        color: expenseColors[index % expenseColors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const salesData = useMemo(() => {
    const months = [];

    const current = new Date();
    current.setDate(1);

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(
        current.getFullYear(),
        current.getMonth() - i,
        1
      );

      const year = monthDate.getFullYear();
      const month = String(monthDate.getMonth() + 1).padStart(2, "0");
      const key = `${year}-${month}`;

      const revenue = transactions
        .filter(
          (transaction) =>
            transaction.type === "income" &&
            transaction.date.startsWith(key)
        )
        .reduce((total, transaction) => total + transaction.amount, 0);

      const expenses = transactions
        .filter(
          (transaction) =>
            transaction.type === "expense" &&
            transaction.date.startsWith(key)
        )
        .reduce((total, transaction) => total + transaction.amount, 0);

      months.push({
        month: monthDate.toLocaleDateString("en-NG", {
          month: "short",
        }),
        revenue,
        expenses,
      });
    }

    return months;
  }, [transactions]);

  const navigateTo = (page) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAddTransaction = (event) => {
    event.preventDefault();

    const description = form.description.trim();
    const amount = parseAmount(form.amount);

    if (!description) {
      setNotice({
        type: "error",
        text: "Enter a description for this transaction.",
      });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice({
        type: "error",
        text: "Enter an amount greater than zero.",
      });
      return;
    }

    if (!isValidDate(form.date)) {
      setNotice({
        type: "error",
        text: "Enter a valid transaction date.",
      });
      return;
    }

    const transaction = {
      id: createReference(),
      description,
      category: form.category.trim() || "Uncategorized",
      date: form.date,
      amount,
      type: form.type,
    };

    setTransactions((previous) => [transaction, ...previous]);

    setForm({
      description: "",
      category: "Sales",
      type: "income",
      amount: "",
      date: getToday(),
    });

    setShowTransactionForm(false);

    setNotice({
      type: "success",
      text: "Transaction added. Your financial figures have been updated.",
    });
  };

  const handleDeleteTransaction = (id) => {
    const confirmed = window.confirm(
      "Delete this transaction? Your financial totals will be recalculated."
    );

    if (!confirmed) return;

    setTransactions((previous) =>
      previous.filter((transaction) => transaction.id !== id)
    );

    setNotice({
      type: "success",
      text: "Transaction deleted and financial figures recalculated.",
    });
  };

  const downloadCSV = (rows, filename) => {
    const csv = Papa.unparse(
      rows.map((transaction) => ({
        date: transaction.date,
        description: transaction.description,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        reference: transaction.id,
      }))
    );

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadSampleCSV = () => {
    downloadCSV(initialTransactions, "bizlens-sample-transactions.csv");
  };

  const exportTransactions = () => {
    if (transactions.length === 0) {
      setNotice({
        type: "error",
        text: "There are no transactions to export yet.",
      });
      return;
    }

    downloadCSV(transactions, "bizlens-transactions.csv");

    setNotice({
      type: "success",
      text: "Your transaction CSV has been exported.",
    });
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setNotice({
        type: "error",
        text: "Please select a CSV file.",
      });
      event.target.value = "";
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) =>
        header.trim().toLowerCase().replace(/[\s_-]+/g, ""),
      complete: (results) => {
        const rows = results.data || [];

        if (rows.length === 0) {
          setNotice({
            type: "error",
            text: "The CSV file has no transaction rows.",
          });
          setCsvInputKey((key) => key + 1);
          return;
        }

        const imported = [];
        const errors = [];

        rows.forEach((row, index) => {
          const date = String(row.date ?? "").trim();
          const description = String(row.description ?? "").trim();
          const type = normalizeType(row.type);
          const amount = parseAmount(row.amount);
          const category = String(row.category ?? "").trim();

          if (!isValidDate(date)) {
            errors.push(`Row ${index + 2}: invalid date`);
            return;
          }

          if (!description) {
            errors.push(`Row ${index + 2}: missing description`);
            return;
          }

          if (!type) {
            errors.push(`Row ${index + 2}: type must be income or expense`);
            return;
          }

          if (!Number.isFinite(amount) || amount <= 0) {
            errors.push(`Row ${index + 2}: amount must be greater than zero`);
            return;
          }

          imported.push({
            id: createReference() + `-${index}`,
            date,
            description,
            type,
            amount,
            category: category || "Uncategorized",
          });
        });

        if (imported.length === 0) {
          setNotice({
            type: "error",
            text: errors[0]
              ? `No valid transactions found. ${errors[0]}.`
              : "No valid transactions found in this file.",
          });
          setCsvInputKey((key) => key + 1);
          return;
        }

        const shouldReplace = window.confirm(
          `Found ${imported.length} valid transaction(s)${
            errors.length ? ` and ${errors.length} invalid row(s)` : ""
          }.\n\nChoose OK to REPLACE the current transactions with the imported data, or Cancel to ADD the imported transactions to the existing data.`
        );

        if (shouldReplace) {
          setTransactions(imported);
        } else {
          setTransactions((previous) => [...imported, ...previous]);
        }

        setActivePage("Overview");

        setNotice({
          type: errors.length ? "error" : "success",
          text: errors.length
            ? `Imported ${imported.length} transaction(s). Skipped ${errors.length} invalid row(s). First issue: ${errors[0]}`
            : `Successfully imported ${imported.length} transaction(s). Financial figures have been recalculated.`,
        });

        setCsvInputKey((key) => key + 1);
      },
      error: () => {
        setNotice({
          type: "error",
          text: "Could not read this CSV file.",
        });
        setCsvInputKey((key) => key + 1);
      },
    });
  };

  const clearAllTransactions = () => {
    if (transactions.length === 0) return;

    const confirmed = window.confirm(
      "Delete ALL transactions saved in this browser? This cannot be undone."
    );

    if (!confirmed) return;

    setTransactions([]);

    setNotice({
      type: "success",
      text: "All transactions have been removed.",
    });
  };

  return (
    <div className="app-shell">
      {mobileMenuOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <ChartNoAxesCombined size={23} strokeWidth={2.5} />
          </div>

          <div className="brand-copy">
            <span className="brand-name">BizLens</span>
            <span className="brand-ai">AI</span>
            <span className="brand-tagline">
              Business clarity, powered by AI
            </span>
          </div>

          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activePage === label ? "active" : ""}`}
              onClick={() => navigateTo(label)}
            >
              <Icon size={19} />
              <span>{label}</span>

              {label === "AI recommendations" && (
                <span className="nav-new">AI</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <CircleHelp size={19} />
            </div>

            <div>
              <strong>Need a hand?</strong>
              <p>Learn how BizLens works.</p>
            </div>

            <ArrowUpRight size={15} className="help-arrow" />
          </div>

          <button
            className={`nav-item ${activePage === "Settings" ? "active" : ""}`}
            onClick={() => navigateTo("Settings")}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <div className="sidebar-footer">
            <div className="avatar">SM</div>
            <div className="profile-copy">
              <strong>Sample Merchant</strong>
              <span>Business owner</span>
            </div>
            <ChevronDown size={16} className="profile-chevron" />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <span className="breadcrumb-divider">/</span>
              <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input
                type="search"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setActivePage("Transactions");
                }}
                aria-label="Search transactions"
              />
              <kbd>Ctrl K</kbd>
            </div>

            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              title="Notifications"
              onClick={() =>
                setNotice({
                  type: "success",
                  text: "You're viewing the BizLens demo workspace.",
                })
              }
            >
              <Bell size={19} />
              <span className="notification-dot" />
            </button>

            <div className="topbar-divider" />
            <div className="topbar-avatar">SM</div>
          </div>
        </header>

        <div className="page-content">
          {notice && (
            <div
              className={`app-notice ${
                notice.type === "error" ? "notice-error" : "notice-success"
              }`}
              role="status"
            >
              {notice.type === "error" ? (
                <AlertCircle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}

              <span>{notice.text}</span>

              <button
                className="notice-close"
                onClick={() => setNotice(null)}
                aria-label="Dismiss message"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {activePage === "Overview" ? (
            <Overview
              period={period}
              setPeriod={setPeriod}
              onNavigate={navigateTo}
              onExport={exportTransactions}
              onExportSample={downloadSampleCSV}
              transactions={transactions}
              filteredTransactions={filteredTransactions}
              financials={financials}
              analysis={analysis}
              salesData={salesData}
              expenseData={expenseData}
              onAdd={() => setShowTransactionForm(true)}
              onUpload={handleCSVUpload}
              csvInputKey={csvInputKey}
              onDelete={handleDeleteTransaction}
            />
          ) : (
            <SecondaryPage
              page={activePage}
              onNavigate={navigateTo}
              onExport={exportTransactions}
              onExportSample={downloadSampleCSV}
              filteredTransactions={filteredTransactions}
              searchTerm={searchTerm}
              financials={financials}
              analysis={analysis}
              transactions={transactions}
              onAdd={() => setShowTransactionForm(true)}
              onUpload={handleCSVUpload}
              csvInputKey={csvInputKey}
              onDelete={handleDeleteTransaction}
              onClear={clearAllTransactions}
            />
          )}

          {showTransactionForm && (
            <TransactionModal
              form={form}
              onChange={updateForm}
              onSubmit={handleAddTransaction}
              onClose={() => setShowTransactionForm(false)}
            />
          )}

          <footer className="page-footer">
            <span>© 2026 BizLens AI</span>
            <span className="footer-status">
              <span className="status-dot" />
              Browser storage demo
            </span>
            <span>Built for better business decisions.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function TransactionModal({ form, onChange, onSubmit, onClose }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="transaction-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-modal-title"
      >
        <div className="modal-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              BUSINESS RECORD
            </div>
            <h2 id="transaction-modal-title">Add transaction</h2>
            <p>Record money received or spent by your business.</p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close transaction form"
          >
            <X size={19} />
          </button>
        </div>

        <form
            className="transaction-form"
            onSubmit={(event) => {
              event.preventDefault();
              console.log("Form submitted");
              onSubmit(event);
            }}
          >
          <label>
            Transaction description
            <input
              name="description"
              value={form.description}
              onChange={onChange}
              placeholder="e.g. Product sales"
              required
              autoFocus
            />
          </label>

          <div className="form-two-columns">
            <label>
              Transaction type
              <select
                name="type"
                value={form.type}
                onChange={onChange}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>

            <label>
              Amount (₦)
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={onChange}
                placeholder="e.g. 50000"
                required
              />
            </label>
          </div>

          <div className="form-two-columns">
            <label>
              Category
              <select
                name="category"
                value={form.category}
                onChange={onChange}
              >
                <option>Sales</option>
                <option>Inventory</option>
                <option>Operations</option>
                <option>Rent</option>
                <option>Transport</option>
                <option>Utilities</option>
                <option>Marketing</option>
                <option>Salaries</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Transaction date
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={onChange}
                required
              />
            </label>
          </div>

          <div className="form-note">
            <CircleHelp size={16} />
            <span>
              These records are saved in this browser only. They are not
              uploaded to a server.
            </span>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="button-primary"
              onClick={() => console.log("Save button clicked")}
            >
              <Plus size={17} />
              Save transaction
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Overview({
  period,
  setPeriod,
  onNavigate,
  onExport,
  onExportSample,
  transactions,
  filteredTransactions,
  financials,
  analysis,
  salesData,
  expenseData,
  onAdd,
  onUpload,
  csvInputKey,
  onDelete,
}) {
  const profitIsPositive = financials.profit >= 0;

  return (
    <>
      <section className="welcome-section">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            YOUR BUSINESS AT A GLANCE
          </div>

          <h1>
            Good business starts with <span>clarity.</span>
          </h1>

          <p className="welcome-description">
            Understand your numbers, discover opportunities, and make
            smarter decisions for your business.
          </p>
        </div>

        <div className="welcome-actions">
          <label className="button-secondary upload-button">
            <Upload size={16} />
            Import CSV
            <input
              key={csvInputKey}
              type="file"
              accept=".csv,text/csv"
              onChange={onUpload}
              hidden
            />
          </label>

          <button className="button-secondary" onClick={onExportSample}>
            <Download size={16} />
            Sample CSV
          </button>

          <button className="button-primary" onClick={onAdd}>
            <Plus size={17} />
            Add transaction
          </button>
        </div>
      </section>

      <section className="demo-banner">
        <div className="demo-banner-icon">
          <FileSpreadsheet size={19} />
        </div>

        <div className="demo-banner-copy">
          <strong>
            {transactions.length === 0
              ? "No transactions recorded"
              : `${transactions.length} transaction${
                  transactions.length === 1 ? "" : "s"
                } in your workspace`}
          </strong>

          <span>
            Financial figures are calculated from the transactions currently
            saved in this browser. Import a CSV or add a record to get started.
          </span>
        </div>

        <span className="demo-badge">LOCAL DATA</span>
      </section>

      <section className="metrics-grid">
        <MetricCard
          title="Total revenue"
          amount={financials.income}
          icon={Banknote}
          tone="blue"
          description="Recorded income"
        />

        <MetricCard
          title="Total expenses"
          amount={financials.expenses}
          icon={Wallet}
          tone="orange"
          description="Recorded expenses"
          expense
        />

        <MetricCard
          title="Estimated profit"
          amount={financials.profit}
          icon={TrendingUp}
          tone="green"
          description="Revenue minus expenses"
          negative={!profitIsPositive}
        />

        <MetricCard
          title="Profit margin"
          amount={`${financials.margin.toFixed(1)}%`}
          icon={ChartNoAxesCombined}
          tone="purple"
          description="Profit as % of revenue"
          negative={financials.margin < 0}
        />
      </section>

      <section className="charts-grid">
        <div className="panel revenue-panel">
          <div className="panel-heading">
            <div>
              <h2>Financial performance</h2>
              <p>Track recorded revenue and expenses over time</p>
            </div>

            <select
              className="period-select"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              aria-label="Chart time period"
            >
              <option>6 months</option>
              <option>3 months</option>
            </select>
          </div>

          <div className="chart-legend">
            <span>
              <i className="legend-dot revenue-dot" />
              Revenue
            </span>
            <span>
              <i className="legend-dot expense-dot" />
              Expenses
            </span>
          </div>

          <div className="revenue-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={
                  period === "3 months" ? salesData.slice(-3) : salesData
                }
                margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="revenueGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#6478ed"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor="#6478ed"
                      stopOpacity={0}
                    />
                  </linearGradient>

                  <linearGradient
                    id="expenseGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#21b99a"
                      stopOpacity={0.12}
                    />
                    <stop
                      offset="100%"
                      stopColor="#21b99a"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#edf0f5"
                  strokeDasharray="4 5"
                  vertical={false}
                />

                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8992a5", fontSize: 12 }}
                  dy={10}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#8992a5", fontSize: 11 }}
                  tickFormatter={formatCompact}
                  width={58}
                />

                <Tooltip
                  formatter={(value) => formatMoney(value)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #edf0f5",
                    boxShadow: "0 8px 30px rgba(24, 35, 70, 0.08)",
                    fontSize: 12,
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#6478ed"
                  strokeWidth={2.5}
                  fill="url(#revenueGradient)"
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />

                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="#21b99a"
                  strokeWidth={2.5}
                  fill="url(#expenseGradient)"
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-footnote">
            <TrendingUp size={15} />
            <span>
              Monthly figures are calculated from the transaction dates in
              your records.
            </span>
          </div>
        </div>

        <div className="panel expense-panel">
          <div className="panel-heading">
            <div>
              <h2>Cost breakdown</h2>
              <p>Expenses grouped by category</p>
            </div>

            <button
              className="subtle-icon-button"
              aria-label="View financial insights"
              onClick={() => onNavigate("Financial insights")}
            >
              <ArrowUpRight size={17} />
            </button>
          </div>

          <div className="expense-chart">
            {expenseData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={91}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {expenseData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>

                    <Tooltip formatter={(value) => formatMoney(value)} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="donut-center">
                  <span>Total costs</span>
                  <strong>{formatCompact(financials.expenses)}</strong>
                </div>
              </>
            ) : (
              <div className="empty-chart">
                <Wallet size={25} />
                <span>Add an expense to see the breakdown.</span>
              </div>
            )}
          </div>

          <div className="expense-legend">
            {expenseData.slice(0, 5).map((expense) => (
              <div className="expense-legend-row" key={expense.name}>
                <span className="expense-label">
                  <i
                    className="legend-dot"
                    style={{ background: expense.color }}
                  />
                  {expense.name}
                </span>

                <strong>{formatCompact(expense.value)}</strong>
              </div>
            ))}

            {expenseData.length > 5 && (
              <button
                className="text-link"
                onClick={() => onNavigate("Financial insights")}
              >
                View all categories
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>

          <button
            className="text-link"
            onClick={() => onNavigate("Financial insights")}
          >
            Explore financial insights
            <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
      

      <section className="insights-section">
        <div className="section-heading">
          <div>
            <div className="section-title-row">
              <Sparkles size={19} className="sparkle-icon" />
              <h2>Business insights</h2>
              <span className="powered-badge">FINANCIAL ANALYSIS</span>
            </div>

            <p>Observations based on your recorded financial activity</p>
          </div>

          <button
            className="text-link"
            onClick={() => onNavigate("AI recommendations")}
          >
            View recommendations
            <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="insights-grid">
          {analysis.insights.slice(0, 3).map((insight, index) => (
            <InsightCard
              key={insight.id}
              icon={
                index === 0
                  ? TrendingUp
                  : index === 1
                    ? Wallet
                    : Lightbulb
              }
              type={insight.type.replace(/_/g, " ")}
              title={insight.title}
              description={insight.description}
              tone={
                insight.type === "positive"
                  ? "green"
                  : insight.type === "warning" ||
                      insight.type === "negative"
                    ? "orange"
                    : index === 2
                      ? "purple"
                      : "blue"
              }
            />
          ))}
        </div>
        
        <div className="ai-disclaimer">
          <Sparkles size={14} />
          These insights are generated using financial rules applied to your
          recorded transactions. AI-generated advice is not connected yet.
        </div>
      </section>



      <section className="panel transactions-panel">
        <div className="panel-heading transactions-heading">
          <div>
            <h2>Recent transactions</h2>
            <p>Your latest recorded business activity</p>
          </div>

          <button
            className="button-secondary compact-button"
            onClick={onExport}
            disabled={transactions.length === 0}
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>

        <TransactionsTable
          transactions={filteredTransactions.slice(0, 5)}
          onDelete={onDelete}
        />

        <button
          className="text-link transactions-view-all"
          onClick={() => onNavigate("Transactions")}
        >
          View all transactions
          <ArrowUpRight size={15} />
        </button>
      </section>
    </>
  );
}

function MetricCard({
  title,
  amount,
  icon: Icon,
  tone,
  description,
  expense = false,
  negative = false,
}) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-title">{title}</span>

        <span className={`metric-icon ${tone}`}>
          <Icon size={19} />
        </span>
      </div>

      <div className="metric-value">{typeof amount === "number" ? formatMoney(amount) : amount}</div>

      <div className="metric-bottom">
        <span
          className={`metric-change ${
            expense || negative ? "neutral-change" : ""
          }`}
        >
          {negative ? (
            <ArrowDownRight size={14} />
          ) : (
            <ArrowUpRight size={14} />
          )}

          {title === "Profit margin"
            ? "Current margin"
            : title === "Estimated profit"
              ? "Current result"
              : title === "Total revenue"
                ? "Income recorded"
                : "Costs recorded"}
        </span>

        <span className="metric-comparison">{description}</span>
      </div>
    </article>
  );
}

function InsightCard({ icon: Icon, type, title, description, tone }) {
  return (
    <article className="insight-card">
      <div className="insight-card-top">
        <span className={`insight-icon ${tone}`}>
          <Icon size={18} />
        </span>

        <span className="insight-type">{type}</span>
      </div>

      <h3>{title}</h3>
      <p>{description}</p>

      <span className="insight-card-footer">
        <span className="small-status-dot" />
        Calculated from local records
      </span>
    </article>
  );
}

function TransactionsTable({ transactions: rows, onDelete }) {
  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <Search size={25} />
        <strong>No transactions found</strong>
        <span>Try another search or add a transaction.</span>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Reference</th>
            <th>Date</th>
            <th>Type</th>
            <th className="amount-heading">Amount</th>
            {onDelete && <th>Action</th>}
          </tr>
        </thead>

        <tbody>
          {rows.map((transaction) => (
            <tr key={transaction.id}>
              <td>
                <div className="transaction-name">
                  <span
                    className={`transaction-icon ${
                      transaction.type === "income"
                        ? "income-icon"
                        : "cost-icon"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowDownRight size={16} />
                    ) : (
                      <ShoppingBag size={15} />
                    )}
                  </span>

                  <div>
                    <strong>{transaction.description}</strong>
                    <span>{transaction.category}</span>
                  </div>
                </div>
              </td>

              <td className="reference-cell">{transaction.id}</td>
              <td className="date-cell">{formatDate(transaction.date)}</td>

              <td>
                <span
                  className={`type-badge ${
                    transaction.type === "income"
                      ? "income-badge"
                      : "expense-badge"
                  }`}
                >
                  {transaction.type === "income" ? "Income" : "Expense"}
                </span>
              </td>

              <td
                className={`amount-cell ${
                  transaction.type === "income" ? "positive-amount" : ""
                }`}
              >
                {transaction.type === "expense" ? "−" : "+"}
                {formatMoney(transaction.amount)}
              </td>

              {onDelete && (
                <td>
                  <button
                    className="icon-button delete-transaction-button"
                    onClick={() => onDelete(transaction.id)}
                    aria-label={`Delete ${transaction.description}`}
                    title="Delete transaction"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SecondaryPage({
  page,
  onNavigate,
  onExport,
  onExportSample,
  filteredTransactions,
  searchTerm,
  financials,
  analysis,
  transactions,
  onAdd,
  onUpload,
  csvInputKey,
  onDelete,
  onClear,
}) {
  const isTransactions = page === "Transactions";
  const isInsights = page === "AI recommendations";
  const isSettings = page === "Settings";

  return (
    <section className="secondary-page">
      <div className="eyebrow">
        <span className="eyebrow-dot" />
        BIZLENS AI WORKSPACE
      </div>

      <h1>{page}</h1>

      <p className="welcome-description">
        {isTransactions
          ? "Review, add, import and export your business records."
          : isInsights
            ? "Explore observations calculated from your current financial records."
            : isSettings
              ? "Manage your demo workspace and local data."
              : "Understand your financial performance and explore opportunities."}
      </p>

      {isTransactions ? (
        <>
          <section className="metrics-grid secondary-metrics">
            <MetricCard
              title="Total revenue"
              amount={financials.income}
              icon={Banknote}
              tone="blue"
              description="Recorded income"
            />

            <MetricCard
              title="Total expenses"
              amount={financials.expenses}
              icon={Wallet}
              tone="orange"
              description="Recorded expenses"
              expense
            />

            <MetricCard
              title="Estimated profit"
              amount={financials.profit}
              icon={TrendingUp}
              tone="green"
              description="Income minus expenses"
              negative={financials.profit < 0}
            />
          </section>

          <section className="panel transactions-panel secondary-panel">
            <div className="panel-heading">
              <div>
                <h2>Transactions</h2>
                <p>
                  {searchTerm
                    ? `Search results for "${searchTerm}"`
                    : `${transactions.length} transaction(s) recorded`}
                </p>
              </div>

              <div className="welcome-actions">
                <label className="button-secondary upload-button">
                  <Upload size={15} />
                  Import CSV
                  <input
                    key={csvInputKey}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={onUpload}
                    hidden
                  />
                </label>

                <button
                  className="button-secondary compact-button"
                  onClick={onExport}
                  disabled={transactions.length === 0}
                >
                  <Download size={15} />
                  Export CSV
                </button>

                <button className="button-primary" onClick={onAdd}>
                  <Plus size={16} />
                  Add
                </button>
              </div>
            </div>

            <TransactionsTable
              transactions={filteredTransactions}
              onDelete={onDelete}
            />
          </section>
        </>
      ) : isInsights ? (
        <>
          <section className="metrics-grid secondary-metrics">
            <MetricCard
              title="Total revenue"
              amount={analysis.revenue}
              icon={Banknote}
              tone="blue"
              description="Recorded income"
            />

            <MetricCard
              title="Total expenses"
              amount={analysis.expenses}
              icon={Wallet}
              tone="orange"
              description="Recorded expenses"
              expense
            />

            <MetricCard
              title="Estimated profit"
              amount={analysis.profit}
              icon={TrendingUp}
              tone="green"
              description="Revenue minus expenses"
              negative={analysis.profit < 0}
            />

            <MetricCard
              title="Profit margin"
              amount={`${analysis.profitMargin.toFixed(1)}%`}
              icon={ChartNoAxesCombined}
              tone="purple"
              description="Profit as % of revenue"
              negative={analysis.profitMargin < 0}
            />
          </section>

          <section className="panel secondary-panel">
  <div className="panel-heading">
        <div>
          <h2>Monthly Performance Comparison</h2>
          <p>
            Compare recorded financial performance across months.
          </p>
        </div>
          
          
    <ChartNoAxesCombined size={21} />
          
          
      </div>
          
    {analysis.latestMonth && analysis.previousMonth ? (
    <> <div className="table-scroll"> <table className="transactions-table"> <thead> <tr> <th>Metric</th> <th>{analysis.previousMonth.label}</th> <th>{analysis.latestMonth.label}</th> <th>Change</th> </tr> </thead>
    
    
          <tbody>
            {[
              {
                label: "Revenue",
                previous: analysis.previousMonth.revenue,
                current: analysis.latestMonth.revenue,
                change: analysis.revenueChange,
                inverse: false,
              },
              {
                label: "Expenses",
                previous: analysis.previousMonth.expenses,
                current: analysis.latestMonth.expenses,
                change: analysis.expenseChange,
                inverse: true,
              },
              {
                label: "Profit",
                previous: analysis.previousMonth.profit,
                current: analysis.latestMonth.profit,
                change: analysis.profitChange,
                inverse: false,
              },
            ].map((metric) => {
              const change = metric.change;
            
              const changeClass =
                change === null || change === 0
                  ? ""
                  : (change > 0) !== metric.inverse
                    ? "positive-change"
                    : "negative-change";
            
              return (
                <tr key={metric.label}>
                  <td>
                    <strong>{metric.label}</strong>
                  </td>
              
                  <td>{formatMoney(metric.previous)}</td>
              
                  <td>{formatMoney(metric.current)}</td>
              
                  <td>
                    <span className={changeClass}>
                      {change === null
                        ? metric.previous === 0 && metric.current === 0
                          ? "0.0%"
                          : "N/A"
                        : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
          
      <div className="ai-disclaimer">
        <Sparkles size={14} />
        Comparisons use the two most recent months containing transactions.
        Percentage changes are marked N/A when the previous month's value
        is zero and a meaningful percentage cannot be calculated.
      </div>
    </>
    
          
    ) : ( <div className="empty-state"> <CalendarDays size={25} /> <strong>Not enough monthly data yet</strong> <span>
    Add or import transactions dated in another month to compare revenue,
    expenses, and profit across months. </span> </div>
    )}
    
    </section>

      
          <section className="insights-section">
            <div className="section-heading">
              <div>
                <div className="section-title-row">
                  <Sparkles size={19} className="sparkle-icon" />
                  <h2>Financial insights</h2>
                  <span className="powered-badge">RULE-BASED</span>
                </div>
      
                <p>What your current numbers reveal about your business</p>
              </div>
            </div>
      
            <div className="secondary-insights">
              {analysis.insights.map((insight, index) => (
                <InsightCard
                  key={insight.id}
                  icon={
                    index === 0
                      ? TrendingUp
                      : index === 1
                        ? Wallet
                        : Lightbulb
                  }
                  type={insight.type.replace(/_/g, " ")}
                  title={insight.title}
                  description={insight.description}
                  tone={
                    insight.type === "positive"
                      ? "green"
                      : insight.type === "warning" ||
                          insight.type === "negative"
                        ? "orange"
                        : index % 2 === 0
                          ? "purple"
                          : "blue"
                  }
                />
              ))}
            </div>
          </section>
            
          <section className="panel secondary-panel">
            <div className="panel-heading">
              <div>
                <h2>Recommended actions</h2>
                <p>Practical next steps based on your financial records</p>
              </div>
            
              <Lightbulb size={21} />
            </div>
            
            {analysis.recommendations.length > 0 ? (
              <div className="secondary-insights">
                {analysis.recommendations.map((recommendation) => (
                  <InsightCard
                    key={recommendation.id}
                    icon={Lightbulb}
                    type={`${recommendation.priority} PRIORITY`}
                    title={recommendation.title}
                    description={`${recommendation.description} ${recommendation.action}`}
                    tone={
                      recommendation.priority === "high"
                        ? "orange"
                        : recommendation.priority === "medium"
                          ? "blue"
                          : "purple"
                    }
                  />
                ))}
              </div>
            ) : (
              <p>
                Add or import transactions to receive recommendations based on
                your financial activity.
              </p>
            )}

            <div className="ai-disclaimer">
              <Sparkles size={14} />
              These recommendations are generated by predefined financial rules,
              not a connected AI model. Review your records before making
              business decisions.
            </div>
          </section>
        </>

          
      ) : isSettings ? (
        <div className="panel settings-panel">
          <h2>Workspace preferences</h2>

          <div className="settings-row">
            <div>
              <strong>Business name</strong>
              <p>Sample Merchant</p>
            </div>

            <span className="settings-value">Demo workspace</span>
          </div>

          <div className="settings-row">
            <div>
              <strong>Currency</strong>
              <p>Currency used for financial displays</p>
            </div>

            <span className="settings-value">NGN (₦)</span>
          </div>

          <div className="settings-row">
            <div>
              <strong>Data storage</strong>
              <p>Transactions are stored in this browser.</p>
            </div>

            <span className="type-badge expense-badge">Local</span>
          </div>

          <div className="settings-row">
            <div>
              <strong>Saved transactions</strong>
              <p>
                {transactions.length} transaction(s) are currently saved.
              </p>
            </div>

            <span className="settings-value">Browser storage</span>
          </div>

          <div className="settings-actions">
            <button
              className="button-secondary"
              onClick={onExportSample}
            >
              <Download size={16} />
              Download sample CSV
            </button>

            <button
              className="button-secondary"
              onClick={() => onNavigate("Transactions")}
            >
              <ReceiptText size={16} />
              Manage transactions
            </button>

            <button
              className="button-secondary danger-button"
              onClick={onClear}
              disabled={transactions.length === 0}
            >
              <Trash2 size={16} />
              Clear all data
            </button>
          </div>
        </div>
      ) : (
        <div className="panel secondary-overview">
          <h2>Financial insights</h2>

          <div className="metrics-grid secondary-metrics">
            <MetricCard
              title="Total revenue"
              amount={financials.income}
              icon={Banknote}
              tone="blue"
              description="Recorded income"
            />

            <MetricCard
              title="Total expenses"
              amount={financials.expenses}
              icon={Wallet}
              tone="orange"
              description="Recorded expenses"
              expense
            />

            <MetricCard
              title="Estimated profit"
              amount={financials.profit}
              icon={TrendingUp}
              tone="green"
              description="Income minus expenses"
              negative={financials.profit < 0}
            />
          </div>

          <p>
            Estimated profit is calculated as recorded income minus recorded
            expenses. Profit margin is estimated profit divided by revenue,
            multiplied by 100.
          </p>

          <p>
            These calculations depend on the records provided. Missing
            transactions, unpaid invoices, taxes, inventory accounting and
            other adjustments can affect actual business profitability.
          </p>

          <button
            className="button-primary"
            onClick={() => onNavigate("Overview")}
          >
            <LayoutDashboard size={16} />
            Back to overview
          </button>
        </div>
      )}
    </section>
  );
}

export default App;