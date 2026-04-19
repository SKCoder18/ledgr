import { useMemo } from "react";
import type { Expense } from "@/pages/Dashboard";
import { startOfMonth } from "date-fns";

const fmt = (n: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

export default function StatsRow({ expenses, currency, budget }: { expenses: Expense[]; currency: string; budget?: number | null }) {
  const stats = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const thisMonth = expenses.filter((e) => new Date(e.expense_date) >= monthStart);
    const total = thisMonth.reduce((s, e) => s + Number(e.amount), 0);
    const dailyAvg = thisMonth.length ? total / Math.max(1, new Date().getDate()) : 0;
    const topCat = Object.entries(thisMonth.reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] || 0) + Number(e.amount); return acc; }, {})).sort((a, b) => b[1] - a[1])[0];
    return { total, dailyAvg, count: thisMonth.length, topCat: topCat?.[0] || "—", topCatAmt: topCat?.[1] || 0 };
  }, [expenses]);

  const budgetUsed = budget ? Math.min(100, (stats.total / budget) * 100) : null;
  const overBudget = budget && stats.total > budget;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-fade-in">
      <Stat label="This month" value={fmt(stats.total, currency)} sub={budget ? `of ${fmt(budget, currency)}` : `${stats.count} entries`} accent={overBudget ? "danger" : "primary"}>
        {budgetUsed !== null && (
          <div className="mt-3 h-1 bg-surface-3 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${overBudget ? "bg-destructive" : "bg-gradient-primary"}`} style={{ width: `${budgetUsed}%` }} />
          </div>
        )}
      </Stat>
      <Stat label="Daily avg" value={fmt(stats.dailyAvg, currency)} sub="last 30 days" />
      <Stat label="Entries" value={String(stats.count)} sub="this month" />
      <Stat label="Top category" value={stats.topCat} sub={stats.topCatAmt ? fmt(stats.topCatAmt, currency) : "—"} accent="mint" />
    </div>
  );
}

function Stat({ label, value, sub, accent, children }: { label: string; value: string; sub?: string; accent?: "primary" | "mint" | "danger"; children?: React.ReactNode }) {
  return (
    <div className="surface-card p-5 hover:border-primary/30 transition-colors">
      <p className="eyebrow mb-2.5">{label}</p>
      <p className={`font-display text-2xl md:text-3xl font-bold tracking-tight truncate ${accent === "primary" ? "text-gradient" : accent === "mint" ? "text-mint" : accent === "danger" ? "text-destructive" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5 font-mono">{sub}</p>}
      {children}
    </div>
  );
}
