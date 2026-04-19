import type { Expense } from "@/pages/Dashboard";
import { Button } from "@/components/ui/button";
import { Trash2, Sparkles, Camera, MessageSquare, Pencil } from "lucide-react";
import { format } from "date-fns";

const fmt = (n: number, c: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n);

const SOURCE_ICON: Record<string, JSX.Element> = {
  manual: <Pencil className="w-3 h-3" />,
  text_ai: <Sparkles className="w-3 h-3" />,
  image_ai: <Camera className="w-3 h-3" />,
  sms_ai: <MessageSquare className="w-3 h-3" />,
};

export default function RecentExpenses({ expenses, currency, onDelete }: { expenses: Expense[]; currency: string; onDelete: (id: string) => void }) {
  const recent = expenses.slice(0, 25);

  return (
    <div className="surface-card overflow-hidden">
      <div className="p-6 pb-4 flex items-baseline justify-between">
        <div>
          <p className="eyebrow mb-1.5">Activity</p>
          <h3 className="font-display font-semibold text-lg">Recent expenses</h3>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{expenses.length} total</p>
      </div>
      {recent.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">No expenses yet — add your first above.</div>
      ) : (
        <ul className="divide-y divide-border/60">
          {recent.map((e) => (
            <li key={e.id} className="group px-6 py-3.5 flex items-center gap-4 hover:bg-surface-2/50 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-surface-3 border border-border flex items-center justify-center flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                {SOURCE_ICON[e.source] || <Pencil className="w-3 h-3" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{e.merchant || e.notes || e.category}</p>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-1.5 py-0.5 rounded bg-surface-3 border border-border">{e.category}</span>
                </div>
                <p className="font-mono text-xs text-muted-foreground mt-0.5">{format(new Date(e.expense_date), "MMM d, yyyy")}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-semibold tracking-tight">{fmt(Number(e.amount), e.currency || currency)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onDelete(e.id)} className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
