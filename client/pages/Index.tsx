import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  FileText,
  Repeat2,
  Tags,
  UserPlus,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Home,
  LayoutDashboard,
  MoreHorizontal,
  Moon,
  PiggyBank,
  Plus,
  ReceiptText,
  Search,
  Settings2,
  Sparkles,
  Sun,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import * as XLSX from "xlsx";

type Expense = { id?: number; date: number; isoDate: string; amount: number; reason: string; category: string; color: string };
type MonthlySettings = { month: string; creditBalance: number; openingBalance: number; savingsAmount: number; emergencyFund: number; monthlyBudget: number };

function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }

const initialExpenses: Expense[] = [];

const calendarDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const categories = ["Food", "Transport", "Groceries", "Bills", "Shopping", "Health", "Fun", "Home"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function colorForCategory(category: string) {
  if (category === "Food") return "mint";
  if (category === "Bills" || category === "Home") return "orange";
  if (category === "Transport" || category === "Health") return "blue";
  return "violet";
}

function LoginScreen({ onLogin }: { onLogin: (username: string, password: string) => Promise<string | null> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError("");
    const message = await onLogin(username, password);
    if (message) setError(message);
    setSubmitting(false);
  };
  return <div className="login-shell"><div className="login-card"><div className="brand justify-center text-xl"><div className="brand-mark"><Sparkles size={17} /></div><span>MyTrack</span></div><p className="eyebrow mt-10 text-center">Personal finance workspace</p><h1 className="mt-2 text-center text-3xl">Welcome back<span className="text-violet-500">.</span></h1><p className="mt-2 text-center text-sm text-slate-400">Sign in to continue to your dashboard.</p><form onSubmit={submit} className="mt-8 space-y-4"><label className="login-label">Username<input required value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="Enter your username" /></label><label className="login-label">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" /></label>{error && <p className="text-xs font-semibold text-red-500">{error}</p>}<Button disabled={submitting} type="submit" className="add-button h-11 w-full">{submitting ? "Signing in..." : "Sign in"}</Button></form><p className="mt-6 text-center text-[11px] text-slate-400">Admin access only · Your data stays in your workspace</p></div></div>;
}

function MetricCard({ label, value, change, icon, tone }: { label: string; value: string; change: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="metric-card group">
      <div className="flex items-start justify-between">
        <div className={`metric-icon ${tone}`}>{icon}</div>
        <button className="text-slate-300 transition hover:text-slate-500" aria-label="More options"><MoreHorizontal size={18} /></button>
      </div>
      <p className="mt-5 text-[13px] font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-[25px] font-bold tracking-[-0.04em] text-slate-900">{value}</p>
        <span className="mb-1 flex items-center gap-0.5 text-[11px] font-bold text-emerald-500"><ArrowUpRight size={13} />{change}</span>
      </div>
    </div>
  );
}

export default function Index() {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [token, setToken] = useState(() => localStorage.getItem("MyTrack_token"));
  const [now, setNow] = useState(() => new Date());
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));
  const [settings, setSettings] = useState<MonthlySettings>({ month: monthKey(new Date()), creditBalance: 0, openingBalance: 0, savingsAmount: 0, emergencyFund: 0, monthlyBudget: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<MonthlySettings>({ month: monthKey(new Date()), creditBalance: 0, openingBalance: 0, savingsAmount: 0, emergencyFund: 0, monthlyBudget: 0 });
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dark, setDark] = useState(false);
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState<"none" | "users" | "recurring" | "reports" | "categories">("none");
  const [toolData, setToolData] = useState<{ users?: Array<{ id: number; username: string; role: string }>; recurring?: Array<{ id: number; name: string; amount: number; category: string; frequency: string; nextDate: string; active: number }>; categories?: Array<{ id: number; name: string }> }>({});
  const [userDraft, setUserDraft] = useState({ username: "", password: "" });
  const [categoryDraft, setCategoryDraft] = useState("");
  const [recurringDraft, setRecurringDraft] = useState({ name: "", amount: "", category: "Food", frequency: "monthly", nextDate: "2026-09-01" });
  const [toolMessage, setToolMessage] = useState("");

  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!authChecked || !token) return;
    gsap.fromTo(".metric-card", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: "power2.out" });
  }, [authChecked, token]);

  useEffect(() => {
    if (!token) { setAuthChecked(true); return; }
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => { if (!response.ok) throw new Error("expired"); return fetch("/api/expenses", { headers: { Authorization: `Bearer ${token}` } }); })
      .then((response) => response.json())
      .then((data) => { if (Array.isArray(data.expenses)) setExpenses(data.expenses.map((expense: { id: number; date: string; amount: number; reason: string; category: string }) => ({ ...expense, isoDate: expense.date, date: Number(expense.date.slice(-2)), color: colorForCategory(expense.category) }))); setAuthChecked(true); })
      .catch(() => { localStorage.removeItem("MyTrack_token"); setToken(null); setAuthChecked(true); });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const refreshSettings = () => fetch(`/api/settings/monthly?month=${selectedMonth}`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.json()).then((data) => { if (data.settings) setSettings(data.settings); });
    refreshSettings();
    const interval = window.setInterval(refreshSettings, 15000);
    return () => window.clearInterval(interval);
  }, [token, selectedMonth]);

  useEffect(() => {
    if (!token) return;
    const refreshExpenses = () => fetch("/api/expenses", { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.json()).then((data) => { if (Array.isArray(data.expenses)) setExpenses(data.expenses.map((expense: { id: number; date: string; amount: number; reason: string; category: string }) => ({ ...expense, isoDate: expense.date, date: Number(expense.date.slice(-2)), color: colorForCategory(expense.category) }))); });
    refreshExpenses();
    const interval = window.setInterval(refreshExpenses, 15000);
    return () => window.clearInterval(interval);
  }, [token]);

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) return data.error ?? "Unable to sign in";
      localStorage.setItem("MyTrack_token", data.token); setToken(data.token); return null;
    } catch { return "The server is unavailable. Try again in a moment."; }
  };

  const logout = async () => { if (token) await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }); localStorage.removeItem("MyTrack_token"); setToken(null); };
  const openSettings = () => { setSettingsDraft(settings); setShowSettings(true); };
  const openTool = async (nextTool: "users" | "recurring" | "reports" | "categories") => { setTool(nextTool); setToolMessage(""); if (!token) return; const endpoint = nextTool === "users" ? "/api/users" : nextTool === "recurring" ? "/api/recurring" : "/api/categories"; if (nextTool !== "reports") { const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } }); const data = await response.json(); setToolData((current) => ({ ...current, [nextTool]: data[nextTool] ?? data.categories ?? data.recurring ?? data.users })); } };
  const createUser = async () => { const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(userDraft) }); const data = await response.json(); setToolMessage(response.ok ? "User created successfully" : data.error); if (response.ok) { setUserDraft({ username: "", password: "" }); openTool("users"); } };
  const createCategory = async () => { const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: categoryDraft }) }); const data = await response.json(); setToolMessage(response.ok ? "Category created successfully" : data.error); if (response.ok) { setCategoryDraft(""); openTool("categories"); } };
  const deleteCategory = async (id: number) => { const response = await fetch(`/api/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); if (response.ok) openTool("categories"); };
  const deleteRecurring = async (id: number) => { const response = await fetch(`/api/recurring/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); if (response.ok) openTool("recurring"); };
  const createRecurring = async () => { const response = await fetch("/api/recurring", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...recurringDraft, amount: Number(recurringDraft.amount) }) }); const data = await response.json(); setToolMessage(response.ok ? "Recurring expense added" : data.error); if (response.ok) openTool("recurring"); };
  const downloadReport = () => { window.open(`/api/reports/monthly.csv?month=${selectedMonth}`, "_blank", "noopener,noreferrer"); };
  const downloadWorkbook = () => { const rows = monthExpenses.map((expense) => ({ Date: expense.isoDate, Amount: expense.amount, Reason: expense.reason, Category: expense.category, Notes: "" })); const sheet = XLSX.utils.json_to_sheet(rows); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "Expenses"); XLSX.writeFile(workbook, `MyTrack-${selectedMonth}.xlsx`); };
  const saveSettings = async () => { if (!token) return; const response = await fetch("/api/settings/monthly", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ creditBalance: settingsDraft.creditBalance, savingsAmount: settingsDraft.savingsAmount, emergencyFund: settingsDraft.emergencyFund, monthlyBudget: settingsDraft.monthlyBudget, month: selectedMonth }) }); if (!response.ok) return; const data = await response.json(); setSettings(data.settings); setSettingsDraft(data.settings); setShowSettings(false); };
  const selectedMonthDate = new Date(`${selectedMonth}-01T00:00:00`);
  const monthLabel = selectedMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const monthExpenses = expenses.filter((expense) => expense.isoDate.startsWith(`${selectedMonth}-`));
  const filteredExpenses = useMemo(() => monthExpenses.filter((expense) => `${expense.reason} ${expense.category}`.toLowerCase().includes(query.toLowerCase())), [monthExpenses, query]);
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const calculatedOpeningBalance = Math.max(0, settings.monthlyBudget - (settings.savingsAmount + settings.emergencyFund));
  const availableBalance = settings.creditBalance + calculatedOpeningBalance;
  const remainingBalance = Math.max(0, availableBalance - monthTotal);
  const remainingBudget = Math.max(0, calculatedOpeningBalance - monthTotal);
  const firstDayOffset = (selectedMonthDate.getDay() + 6) % 7;
  const daysInMonth = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0).getDate();
  const chartValues = Array.from({ length: 12 }, (_, index) => monthExpenses.filter((expense) => Math.ceil(expense.date / Math.max(1, daysInMonth / 12)) === index + 1).reduce((sum, expense) => sum + expense.amount, 0));
  const days = Array.from({ length: Math.ceil((firstDayOffset + daysInMonth) / 7) * 7 }, (_, index) => index - firstDayOffset + 1);
  const openAdd = (date: number) => { setSelectedDate(date); setShowModal(true); };
  const shiftMonth = (offset: number) => { const date = new Date(`${selectedMonth}-01T00:00:00`); date.setMonth(date.getMonth() + offset); setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`); };
  const saveExpense = async () => {
    const numericAmount = Number(amount);
    if (!selectedDate || !reason.trim() || !numericAmount || numericAmount < 0 || !token) return;
    const isoDate = `${selectedMonth}-${String(selectedDate).padStart(2, "0")}`;
    const response = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ date: isoDate, amount: numericAmount, reason: reason.trim(), category }) });
    if (!response.ok) return;
    const data = await response.json();
    setExpenses((current) => [...current, { id: data.expense?.id, isoDate, date: selectedDate, amount: numericAmount, reason: reason.trim(), category, color: colorForCategory(category) }]);
    setReason(""); setAmount(""); setShowModal(false);
  };

  if (!authChecked) return <div className="login-shell"><div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><span>MyTrack</span></div></div>;
  if (!token) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className={dark ? "app-shell dark-mode" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><span>MyTrack</span></div>
        <div className="workspace-switch"><div className="avatar">DM</div><div><p className="text-xs font-bold text-slate-800">Danish's workspace</p><p className="text-[10px] text-slate-400">Personal account</p></div><ChevronRight className="ml-auto text-slate-300" size={15} /></div>
        <p className="nav-label">Workspace</p>
        <nav className="space-y-1">
          <button className="nav-item active"><LayoutDashboard size={17} />Overview</button>
          <button className="nav-item" onClick={() => document.getElementById("calendar")?.scrollIntoView({ behavior: "smooth" })}><CalendarDays size={17} />Calendar <span className="nav-pill">{monthLabel.slice(0, 3)}</span></button>
          <button className="nav-item" onClick={() => openTool("reports")}><BarChart3 size={17} />Reports</button>
          <button className="nav-item" onClick={openSettings}><WalletCards size={17} />Budgets</button>
        </nav>
        <p className="nav-label mt-8">Manage</p>
        <nav className="space-y-1"><button className="nav-item" onClick={() => openTool("recurring")}><ReceiptText size={17} />Recurring</button><button className="nav-item" onClick={() => openTool("categories")}><Tags size={17} />Categories</button><button className="nav-item" onClick={() => openTool("users")}><UserPlus size={17} />Users</button></nav>
        <div className="sidebar-bottom"><div className="pro-card"><div className="flex items-center gap-2 text-violet-700"><Sparkles size={15} /><span className="text-xs font-bold">Make your money work</span></div><p className="mt-2 text-[11px] leading-relaxed text-slate-500">Set a monthly budget and stay on track.</p><button onClick={openSettings} className="mt-3 text-[11px] font-bold text-violet-600">Set up budget <ArrowUpRight className="inline" size={13} /></button></div><div className="flex items-center gap-3 pt-5"><div className="avatar small">DM</div><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700">Danish Mane</p><p className="text-[10px] text-slate-400">Personal plan</p></div><MoreHorizontal className="ml-auto text-slate-300" size={17} /></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="mobile-brand"><div className="brand-mark"><Sparkles size={15} /></div><span>MyTrack</span></div><div className="search-wrap"><Search size={16} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses..." /></div><div className="top-actions"><button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button notification" aria-label="Notifications"><Bell size={18} /><i /></button><button className="avatar" onClick={logout} aria-label="Log out">DM</button></div></header>
        <div className="page-wrap">
          <motion.div className="page-heading" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}><div><p className="eyebrow">{dateLabel}</p><h1>Good morning, Danish<span className="text-violet-500">.</span></h1><p className="heading-sub">Here's the pulse of your money today.</p></div><Button onClick={() => openAdd(now.getDate())} className="add-button"><Plus size={17} />Add expense</Button></motion.div>
          <section className="metrics-grid"><MetricCard label="Available balance" value={formatCurrency(availableBalance)} change="live" tone="violet" icon={<CircleDollarSign size={19} />} /><MetricCard label="Monthly spend" value={formatCurrency(monthTotal)} change="live" tone="orange" icon={<CreditCard size={19} />} /><MetricCard label="Remaining balance" value={formatCurrency(remainingBalance)} change="live" tone="mint" icon={<PiggyBank size={19} />} /><MetricCard label="Budget left" value={formatCurrency(remainingBudget)} change="live" tone="blue" icon={<WalletCards size={19} />} /></section>
          <section className="content-grid">
            <div className="left-column">
              <div className="panel trend-panel"><div className="panel-header"><div><p className="eyebrow">Spending activity</p><h2>Monthly overview</h2></div><select className="select-control" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>{Array.from({ length: 12 }, (_, index) => { const date = new Date(2026, index, 1); const value = `2026-${String(index + 1).padStart(2, "0")}`; return <option value={value} key={value}>{date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</option>; })}</select></div><div className="chart-legend"><span><i className="legend-dot violet-dot" />Expenses</span><span><i className="legend-dot pale-dot" />Budget</span><strong>{formatCurrency(monthTotal)} <small>this month</small></strong></div><div className="bar-chart">{chartValues.map((height, index) => <div className="bar-column" key={index}><div className={`bar ${index > 8 ? "highlight" : ""}`} style={{ height: `${height / 2.2}px` }} /><span>{["1","5","9","13","17","21","25","29"][index] || ""}</span></div>)}</div></div>
              <div className="panel recent-panel"><div className="panel-header"><div><p className="eyebrow">Activity</p><h2>Recent expenses</h2></div><button className="link-button">View all <ArrowUpRight size={14} /></button></div><div className="expense-list">{filteredExpenses.slice(-4).reverse().map((expense, index) => <div className="expense-row" key={`${expense.reason}-${index}`}><div className={`expense-symbol ${expense.color}`}><ReceiptText size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{expense.reason}</p><p className="text-[11px] text-slate-400">{expense.category} · {monthLabel} · {expense.date}</p></div><p className="text-sm font-bold text-slate-800">−{formatCurrency(expense.amount)}</p></div>)}</div></div>
            </div>
            <div className="panel budget-panel"><div className="panel-header"><div><p className="eyebrow">Your budget</p><h2>{monthLabel} spending</h2></div><button className="link-button" onClick={openSettings}>Edit balances <Settings2 size={14} /></button></div><div className="budget-ring" style={{ background: `conic-gradient(#8066e8 0 ${settings.monthlyBudget ? Math.min(100, (monthTotal / settings.monthlyBudget) * 100) : 0}%, #eeeafd 0 100%)` }}><div className="ring-inner"><strong>{settings.monthlyBudget ? Math.round((monthTotal / settings.monthlyBudget) * 100) : 0}<span>%</span></strong><small>used</small></div></div><div className="budget-total"><span>{formatCurrency(monthTotal)} spent</span><strong>of {formatCurrency(settings.monthlyBudget)}</strong></div><div className="budget-progress"><div style={{ width: `${settings.monthlyBudget ? Math.min(100, (monthTotal / settings.monthlyBudget) * 100) : 0}%` }} /></div><div className="budget-note"><div className="tiny-icon"><Sparkles size={13} /></div><p><strong>{settings.monthlyBudget ? "Budget is tracking live" : "Set your monthly budget"}</strong><br /><span>{formatCurrency(remainingBudget)} left for {monthLabel}.</span></p></div><div className="category-breakdown">{Array.from(new Set(monthExpenses.map((expense) => expense.category))).slice(0, 3).map((name) => { const total = monthExpenses.filter((expense) => expense.category === name).reduce((sum, expense) => sum + expense.amount, 0); const color = colorForCategory(name); return <div className="category-line" key={name}><span><i className={`legend-dot ${color}-dot`} />{name}</span><strong>{formatCurrency(total)}</strong></div>; })}</div></div>
          </section>
          <section className="panel calendar-panel" id="calendar"><div className="calendar-top"><div><p className="eyebrow">Plan your month</p><h2>Expense calendar</h2><p className="text-xs text-slate-400">Click any date to add a new expense.</p></div><div className="calendar-actions"><button className="icon-button" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={17} /></button><span>{monthLabel}</span><button className="icon-button" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={17} /></button></div></div><div className="calendar-grid">{calendarDays.map((day) => <div className="calendar-weekday" key={day}>{day}</div>)}{days.map((day, index) => { const validDay = day >= 1 && day <= daysInMonth; const dayExpenses = monthExpenses.filter((expense) => expense.date === day); const total = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0); return <button onClick={() => validDay && openAdd(day)} className={`calendar-day ${!validDay ? "muted-day" : ""} ${day === now.getDate() && selectedMonth === monthKey(now) ? "today" : ""}`} key={`${day}-${index}`}><span className="day-number">{validDay ? day : ""}</span>{dayExpenses.length > 0 && <div className="day-expenses"><strong>{formatCurrency(total)}</strong>{dayExpenses.slice(0, 2).map((expense) => <span key={expense.reason}><i className={`calendar-dot ${expense.color}`} />{expense.reason}</span>)}{dayExpenses.length > 2 && <span>+{dayExpenses.length - 2} more</span>}</div>}</button> })}</div></section>
        </div>
      </main>
      {showSettings && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowSettings(false)}><div className="expense-modal"><div className="modal-header"><div><p className="eyebrow">{monthLabel}</p><h2>Monthly setup</h2></div><button className="icon-button" onClick={() => setShowSettings(false)}><X size={18} /></button></div><p className="mb-5 text-xs text-slate-400">Enter your starting balances. Dashboard totals update immediately after saving.</p><div className="settings-form-grid">{[["creditBalance", "Credit balance"], ["monthlyBudget", "Monthly budget"], ["savingsAmount", "Savings amount"], ["emergencyFund", "Emergency fund"]].map(([field, label]) => <label key={field}>{label}<input type="number" min="0" value={(settingsDraft[field as keyof MonthlySettings] as number) || ""} onChange={(event) => setSettingsDraft((current) => ({ ...current, [field]: event.target.value === "" ? 0 : Number(event.target.value) }))} placeholder="₹ 0" /></label>)}</div><label>Calculated opening balance<input type="number" readOnly value={Math.max(0, (settingsDraft.monthlyBudget || 0) - ((settingsDraft.savingsAmount || 0) + (settingsDraft.emergencyFund || 0)))} /><span className="field-hint">Monthly budget − (savings amount + emergency fund)</span></label><div className="modal-footer"><button className="cancel-button" onClick={() => setShowSettings(false)}>Cancel</button><Button onClick={saveSettings} className="add-button">Save setup</Button></div></div></div>}
      {tool !== "none" && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setTool("none")}><div className="expense-modal management-modal"><div className="modal-header"><div><p className="eyebrow">{monthLabel}</p><h2>{tool === "users" ? "Team users" : tool === "recurring" ? "Recurring expenses" : tool === "categories" ? "Categories" : "Reports"}</h2></div><button className="icon-button" onClick={() => setTool("none")}><X size={18} /></button></div>{tool === "users" && <><p className="text-xs text-slate-400">Create another secure workspace login.</p><div className="management-form"><input value={userDraft.username} onChange={(event) => setUserDraft({ ...userDraft, username: event.target.value })} placeholder="Username" /><input type="password" value={userDraft.password} onChange={(event) => setUserDraft({ ...userDraft, password: event.target.value })} placeholder="Password (8+ characters)" /><Button onClick={createUser} className="add-button"><UserPlus size={15} />Create user</Button></div><div className="management-list">{(toolData.users ?? []).map((user) => <div className="management-row" key={user.id}><span>{user.username}</span><small>{user.role}</small></div>)}</div></>}{tool === "categories" && <><p className="text-xs text-slate-400">Create categories for your expense workflow.</p><div className="management-form"><input value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} placeholder="Category name" /><Button onClick={createCategory} className="add-button"><Tags size={15} />Add category</Button></div><div className="category-chips">{(toolData.categories ?? []).map((category) => <span key={category.id}>{category.name}<button onClick={() => deleteCategory(category.id)} aria-label={`Remove ${category.name}`}>×</button></span>)}</div></>}{tool === "recurring" && <><p className="text-xs text-slate-400">Track fixed weekly, monthly, or custom payments.</p><div className="management-form"><input value={recurringDraft.name} onChange={(event) => setRecurringDraft({ ...recurringDraft, name: event.target.value })} placeholder="Expense name" /><input type="number" min="0" value={recurringDraft.amount} onChange={(event) => setRecurringDraft({ ...recurringDraft, amount: event.target.value })} placeholder="Amount" /><select value={recurringDraft.frequency} onChange={(event) => setRecurringDraft({ ...recurringDraft, frequency: event.target.value })}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="custom">Custom</option></select><input type="date" value={recurringDraft.nextDate} onChange={(event) => setRecurringDraft({ ...recurringDraft, nextDate: event.target.value })} /><Button onClick={createRecurring} className="add-button"><Repeat2 size={15} />Add recurring</Button></div><div className="management-list">{(toolData.recurring ?? []).map((item) => <div className="management-row" key={item.id}><span>{item.name} · {formatCurrency(item.amount)}</span><div className="flex items-center gap-2"><small>{item.frequency} · {item.active ? "Active" : "Paused"}</small><button className="remove-button" onClick={() => deleteRecurring(item.id)} aria-label={`Remove ${item.name}`}>Remove</button></div></div>)}</div></>}{tool === "reports" && <><p className="text-xs text-slate-400">Export the selected month as a CSV file for Excel, audit, or backup.</p><div className="report-summary"><FileText size={20} /><div><strong>{formatCurrency(monthTotal)}</strong><span>{monthExpenses.length} expenses in {monthLabel}</span></div></div><div className="flex flex-wrap gap-2"><Button onClick={downloadReport} className="add-button"><Download size={15} />Download CSV</Button><Button onClick={downloadWorkbook} variant="outline" className="rounded-xl text-xs font-bold"><Download size={15} />Download XLSX</Button></div></>}{toolMessage && <p className="mt-4 text-xs font-semibold text-violet-600">{toolMessage}</p>}</div></div>}
      {showModal && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowModal(false)}><div className="expense-modal"><div className="modal-header"><div><p className="eyebrow">{monthLabel} · {selectedDate}</p><h2>Add an expense</h2></div><button className="icon-button" onClick={() => setShowModal(false)}><X size={18} /></button></div><label>Amount<input autoFocus type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="₹ 0" /></label><label>Reason<input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What did you spend on?" /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><div className="modal-footer"><button className="cancel-button" onClick={() => setShowModal(false)}>Cancel</button><Button onClick={saveExpense} className="add-button">Save expense</Button></div></div></div>}
    </div>
  );
}
