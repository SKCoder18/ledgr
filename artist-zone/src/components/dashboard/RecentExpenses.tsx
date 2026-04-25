import { useState, useMemo } from "react";
import type { Expense } from "@/pages/Dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Sparkles, Camera, MessageSquare, Pencil, Download, Search, TrendingUp, TrendingDown } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import EditExpenseModal from "@/components/expense/EditExpenseModal";

const fmt = (n: number, c: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n);

const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining":      "hsl(22 95% 68%)",
  "Groceries":          "hsl(142 76% 58%)",
  "Transport":          "hsl(200 80% 65%)",
  "Shopping":           "hsl(280 88% 72%)",
  "Entertainment":      "hsl(330 80% 70%)",
  "Bills & Utilities":  "hsl(45 95% 65%)",
  "Health":             "hsl(0 78% 64%)",
  "Travel":             "hsl(180 70% 60%)",
  "Subscriptions":      "hsl(250 88% 70%)",
  "Education":          "hsl(200 80% 65%)",
  "Salary":             "hsl(142 76% 58%)",
  "Freelance":          "hsl(158 78% 62%)",
  "Refund":             "hsl(142 76% 58%)",
  "Investment":         "hsl(45 95% 65%)",
  "Gift":               "hsl(330 80% 70%)",
  "Other Income":       "hsl(142 76% 58%)",
  "Other":              "hsl(240 30% 50%)",
};

const SOURCE_ICON: Record<string, JSX.Element> = {
  manual:   <Pencil className="w-3 h-3" />,
  text_ai:  <Sparkles className="w-3 h-3" />,
  image_ai: <Camera className="w-3 h-3" />,
  sms_ai:   <MessageSquare className="w-3 h-3" />,
};

const ALL_FILTER = "All";

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

export default function RecentExpenses({
  expenses, currency, onDelete, onRefresh,
}: {
  expenses: Expense[]; currency: string;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);

  // Unique categories for filter chips
  const filterChips = useMemo(() => {
    const cats = [...new Set(expenses.map((e) => e.category))].sort();
    return [ALL_FILTER, "Income", "Expense", ...cats];
  }, [expenses]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = expenses.slice(0, 100);
    if (activeFilter === "Income") list = list.filter((e) => e.transaction_type === "income");
    else if (activeFilter === "Expense") list = list.filter((e) => e.transaction_type !== "income");
    else if (activeFilter !== ALL_FILTER) list = list.filter((e) => e.category === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        (e.merchant || "").toLowerCase().includes(q) ||
        (e.notes || "").toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, activeFilter, search]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    filtered.forEach((e) => {
      if (!groups[e.expense_date]) groups[e.expense_date] = [];
      groups[e.expense_date].push(e);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["Date", "Type", "Merchant", "Category", "Amount", "Currency", "Notes", "Source"];
    const rows = expenses.map((e) => [
      e.expense_date,
      e.transaction_type || "expense",
      `"${(e.merchant || "").replace(/"/g, '""')}"`,
      e.category,
      e.amount,
      e.currency,
      `"${(e.notes || "").replace(/"/g, '""')}"`,
      e.source,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledgr-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="surface-card overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="eyebrow mb-1.5">Activity</p>
            <h3 className="font-display font-semibold text-xl">Recent transactions</h3>
          </div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs text-muted-foreground">{expenses.length} total</p>
            <Button
              variant="ghost" size="sm"
              onClick={exportCSV}
              className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by merchant, category, notes…"
              className="pl-9 h-9 text-sm bg-surface-2 border-border"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-6 pb-4 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {filterChips.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`filter-chip flex-shrink-0 ${activeFilter === cat ? "active" : ""}`}
            >
              {cat === "Income"  && <TrendingUp  className="w-3 h-3" />}
              {cat === "Expense" && <TrendingDown className="w-3 h-3" />}
              {cat}
            </button>
          ))}
        </div>

        {/* Date-grouped list */}
        {groupedByDate.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-muted-foreground">
            {search || activeFilter !== ALL_FILTER
              ? "No matches found."
              : "No transactions yet — add your first above."}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {groupedByDate.map(([dateStr, txns]) => {
              const dayTotal = txns.reduce((s, e) =>
                e.transaction_type === "income" ? s + Number(e.amount) : s - Number(e.amount), 0);
              return (
                <div key={dateStr}>
                  {/* Date header */}
                  <div className="px-6 py-2.5 flex items-center justify-between bg-surface-2/60 border-b border-border/30">
                    <span className="text-xs font-medium text-muted-foreground font-mono tracking-wide">
                      {getDateLabel(dateStr)}
                    </span>
                    <span className={`text-xs font-mono font-medium ${dayTotal >= 0 ? "text-income" : "text-muted-foreground"}`}>
                      {dayTotal >= 0 ? "+" : ""}{fmt(Math.abs(dayTotal), currency)}
                    </span>
                  </div>

                  {/* Transactions for this date */}
                  <ul className="divide-y divide-border/30">
                    {txns.map((e) => {
                      const isIncome = e.transaction_type === "income";
                      const color = CATEGORY_COLORS[e.category] || "hsl(240 30% 50%)";
                      return (
                        <li key={e.id} className="group px-6 py-3.5 flex items-center gap-4 hover:bg-surface-2/40 transition-colors">
                          {/* Icon */}
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                            style={{ background: `${color}20`, border: `1px solid ${color}35` }}
                          >
                            <span style={{ color }}>
                              {SOURCE_ICON[e.source] || <Pencil className="w-3 h-3" />}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm truncate">
                                {e.merchant || e.notes || e.category}
                              </p>
                              <span
                                className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border flex-shrink-0"
                                style={{ background: `${color}12`, borderColor: `${color}28`, color }}
                              >
                                {e.category}
                              </span>
                              {isIncome && <span className="income-badge">income</span>}
                            </div>
                            {e.notes && e.merchant && (
                              <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{e.notes}</p>
                            )}
                          </div>

                          {/* Amount */}
                          <div className="text-right flex-shrink-0">
                            <p className={`font-display font-semibold tracking-tight text-sm ${isIncome ? "text-income" : ""}`}>
                              {isIncome ? "+" : "−"}{fmt(Number(e.amount), e.currency || currency)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => setEditTarget(e)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => onDelete(e.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editTarget && (
        <EditExpenseModal
          expense={editTarget}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={() => { setEditTarget(null); onRefresh(); }}
        />
      )}
    </>
  );
}
