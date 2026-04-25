import { useMemo } from "react";
import type { Expense } from "@/pages/Dashboard";
import { startOfMonth } from "date-fns";
import { Activity, Flame } from "lucide-react";

const fmt = (n: number, cur: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);

export default function StatsRow({ expenses, currency, budget }: { expenses: Expense[]; currency: string; budget?: number | null }) {
  const stats = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const thisMonth = expenses.filter((e) => new Date(e.expense_date) >= monthStart);
    const debits = thisMonth.filter((e) => e.transaction_type !== "income");

    const totalExpenses = debits.reduce((s, e) => s + Number(e.amount), 0);
    const dailyAvg = totalExpenses > 0 ? totalExpenses / Math.max(1, new Date().getDate()) : 0;
    const topCat = Object.entries(
      debits.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0];

    return {
      totalExpenses,
      dailyAvg,
      count: debits.length,
      topCat: topCat?.[0] || "—",
      topCatAmt: topCat?.[1] || 0,
    };
  }, [expenses]);

  const budgetUsed = budget ? Math.min(100, (stats.totalExpenses / budget) * 100) : null;
  const overBudget = budget && stats.totalExpenses > budget;
  const nearBudget = budget && !overBudget && stats.totalExpenses > budget * 0.75;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* Spent this month */}
      <div className="surface-card-hover p-5">
        <p className="eyebrow mb-2.5">Spent this month</p>
        <p className={`font-display text-2xl md:text-3xl font-bold tracking-tight ${overBudget ? "text-destructive" : "text-gradient"}`}>
          {fmt(stats.totalExpenses, currency)}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5 font-mono">
          {budget ? `of ${fmt(budget, currency)}` : `${stats.count} transactions`}
        </p>
        {budgetUsed !== null && (
          <div className="mt-3 space-y-1">
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  overBudget ? "bg-destructive" : nearBudget ? "bg-accent" : "bg-gradient-primary"
                }`}
                style={{ width: `${budgetUsed}%` }}
              />
            </div>
            {(overBudget || nearBudget) && (
              <p className={`text-[10px] font-mono ${overBudget ? "text-destructive" : "text-accent"}`}>
                {overBudget
                  ? `Over by ${fmt(stats.totalExpenses - (budget || 0), currency)}`
                  : `${Math.round(budgetUsed)}% of budget used`}
              </p>
            )}
          </div>
        )}
        {!budget && (
          <p className="text-[10px] font-mono text-muted-foreground/60 mt-2">Set a budget in Settings →</p>
        )}
      </div>

      {/* Daily average */}
      <div className="surface-card-hover p-5">
        <p className="eyebrow mb-2.5">Daily average</p>
        <p className="font-display text-2xl md:text-3xl font-bold tracking-tight text-gradient">
          {stats.dailyAvg > 0 ? fmt(stats.dailyAvg, currency) : "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5 font-mono">per day this month</p>
        {stats.dailyAvg > 0 && <Activity className="w-3.5 h-3.5 text-primary mt-2 opacity-70" />}
      </div>

      {/* Transactions count */}
      <div className="surface-card-hover p-5">
        <p className="eyebrow mb-2.5">Transactions</p>
        <p className="font-display text-2xl md:text-3xl font-bold tracking-tight text-gradient">
          {stats.count > 0 ? stats.count : "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5 font-mono">this month</p>
        {stats.count > 0 && <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">{stats.count === 1 ? "1 entry" : `${stats.count} entries`}</p>}
      </div>

      {/* Top category */}
      <div className="surface-card-hover p-5">
        <p className="eyebrow mb-2.5">Top category</p>
        <p className="font-display text-2xl md:text-3xl font-bold tracking-tight text-mint truncate">
          {stats.topCat}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5 font-mono">
          {stats.topCatAmt ? fmt(stats.topCatAmt, currency) : "—"}
        </p>
        {stats.topCat !== "—" && <Flame className="w-3.5 h-3.5 text-accent mt-2 opacity-80" />}
      </div>
    </div>
  );
}
