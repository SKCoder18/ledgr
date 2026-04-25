import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";
import type { Expense } from "@/pages/Dashboard";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const fmt = (n: number, c: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (!active || !payload?.length) return null;
  const income = payload.find((p: any) => p.dataKey === "income")?.value || 0;
  const expense = payload.find((p: any) => p.dataKey === "expense")?.value || 0;
  const net = income - expense;
  return (
    <div className="bg-surface-2 border border-border rounded-xl p-3 shadow-elevated text-xs font-mono min-w-[140px]">
      <p className="text-muted-foreground mb-2 font-sans font-medium text-[11px] uppercase tracking-wider">{label}</p>
      <div className="space-y-1.5">
        {income > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-income flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-income inline-block" /> Income</span>
            <span className="text-income font-medium">{fmt(income, currency)}</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-primary flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary inline-block" /> Spent</span>
          <span className="text-foreground font-medium">{fmt(expense, currency)}</span>
        </div>
        {income > 0 && (
          <div className={`flex justify-between gap-4 pt-1.5 border-t border-border ${net >= 0 ? "text-income" : "text-destructive"}`}>
            <span>Net</span>
            <span className="font-semibold">{net >= 0 ? "+" : ""}{fmt(net, currency)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function MonthlyChart({ expenses, currency }: { expenses: Expense[]; currency: string }) {
  const data = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthTx = expenses.filter((e) => {
        const d = new Date(e.expense_date);
        return d >= start && d <= end;
      });
      const income = monthTx
        .filter((e) => e.transaction_type === "income")
        .reduce((s, e) => s + Number(e.amount), 0);
      const expense = monthTx
        .filter((e) => e.transaction_type !== "income")
        .reduce((s, e) => s + Number(e.amount), 0);
      return { month: format(date, "MMM"), fullMonth: format(date, "MMMM yyyy"), income, expense };
    });
  }, [expenses]);

  const hasAnyIncome = data.some((d) => d.income > 0);
  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]));

  return (
    <div className="surface-card p-6 col-span-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="eyebrow mb-1.5">6-Month Overview</p>
          <h3 className="font-display font-semibold text-xl">Income vs Expenses</h3>
        </div>
        <div className="flex items-center gap-4">
          {hasAnyIncome && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(142 76% 58%)" }} />
              <span className="text-xs text-muted-foreground font-mono">Income</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(250 88% 70%)" }} />
            <span className="text-xs text-muted-foreground font-mono">Expenses</span>
          </div>
        </div>
      </div>

      <div className="h-[220px] -ml-2">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={3} barCategoryGap="30%">
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "DM Mono" }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "DM Mono" }}
              axisLine={false} tickLine={false} width={44}
              tickFormatter={(v) => v === 0 ? "0" : v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v)}
              domain={[0, maxVal > 0 ? "auto" : 100]}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "hsl(var(--border) / 0.5)", radius: 4 }} />
            {hasAnyIncome && (
              <Bar dataKey="income" radius={[5, 5, 0, 0]} maxBarSize={36} name="income">
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.income > 0 ? "hsl(142 76% 58%)" : "hsl(var(--surface-3))"}
                    fillOpacity={entry.income > 0 ? 1 : 0.3}
                  />
                ))}
              </Bar>
            )}
            <Bar dataKey="expense" radius={[5, 5, 0, 0]} maxBarSize={36} name="expense">
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.expense > 0 ? "hsl(250 88% 70%)" : "hsl(var(--surface-3))"}
                  fillOpacity={entry.expense > 0 ? 1 : 0.3}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net summary row */}
      {hasAnyIncome && (
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-border">
          {[
            { label: "Total income", value: data.reduce((s, d) => s + d.income, 0), color: "text-income" },
            { label: "Total spent", value: data.reduce((s, d) => s + d.expense, 0), color: "text-primary" },
            { label: "Net (6mo)", value: data.reduce((s, d) => s + d.income - d.expense, 0), color: data.reduce((s, d) => s + d.income - d.expense, 0) >= 0 ? "text-income" : "text-destructive" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="eyebrow mb-1">{stat.label}</p>
              <p className={`font-display font-bold text-lg tracking-tight ${stat.color}`}>
                {stat.value >= 0 ? "" : "-"}{fmt(Math.abs(stat.value), currency)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
