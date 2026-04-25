import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { Expense } from "@/pages/Dashboard";
import { eachDayOfInterval, format, subDays } from "date-fns";

const fmt = (n: number, c: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

export default function TrendChart({ expenses, currency }: { expenses: Expense[]; currency: string }) {
  const data = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const total = expenses.filter((e) => e.expense_date === key && e.transaction_type !== "income").reduce((s, e) => s + Number(e.amount), 0);
      return { day: format(d, "MMM d"), total };
    });
  }, [expenses]);

  const total30 = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="surface-card p-6">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <p className="eyebrow mb-1.5">Trend</p>
          <h3 className="font-display font-semibold text-lg">Last 30 days</h3>
        </div>
        <p className="font-mono text-sm text-muted-foreground">{fmt(total30, currency)}</p>
      </div>
      <div className="h-[200px] -ml-4">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(250 88% 70%)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="hsl(250 88% 70%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={5} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
            <Tooltip contentStyle={{ background: "hsl(var(--surface-2))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmt(v, currency)} labelStyle={{ color: "hsl(var(--muted-foreground))" }} />
            <Area type="monotone" dataKey="total" stroke="hsl(250 88% 70%)" strokeWidth={2} fill="url(#trendGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
