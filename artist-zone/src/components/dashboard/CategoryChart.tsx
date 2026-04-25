import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { Expense } from "@/pages/Dashboard";
import { startOfMonth } from "date-fns";

const COLORS = ["hsl(250 88% 70%)","hsl(22 95% 68%)","hsl(158 78% 62%)","hsl(280 88% 72%)","hsl(200 80% 65%)","hsl(45 95% 65%)","hsl(330 80% 70%)","hsl(180 70% 60%)","hsl(15 85% 65%)","hsl(120 60% 60%)","hsl(240 30% 50%)"];
const fmt = (n: number, c: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

export default function CategoryChart({ expenses, currency }: { expenses: Expense[]; currency: string }) {
  const data = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const map = expenses.filter((e) => new Date(e.expense_date) >= monthStart && e.transaction_type !== "income").reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] || 0) + Number(e.amount); return acc; }, {});
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="surface-card p-6">
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <p className="eyebrow mb-1.5">Breakdown</p>
          <h3 className="font-display font-semibold text-lg">By category</h3>
        </div>
        <p className="font-mono text-sm text-muted-foreground">this month</p>
      </div>
      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 items-center">
          <div className="h-[200px] relative">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="hsl(var(--background))" strokeWidth={2}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--surface-2))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmt(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="font-display font-bold text-xl text-gradient">{fmt(total, currency)}</p>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">total</p>
            </div>
          </div>
          <div className="space-y-2">
            {data.slice(0, 6).map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="truncate">{d.name}</span>
                </div>
                <span className="font-mono text-muted-foreground text-xs ml-2">{Math.round((d.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const EmptyState = () => <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No expenses this month yet.</div>;
