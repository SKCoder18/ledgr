import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Expense } from "@/pages/Dashboard";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { startOfMonth } from "date-fns";
import { toast } from "sonner";

type Insight = { title: string; body: string; tone: "positive" | "neutral" | "warning" };

export default function AIInsights({ expenses, currency, budget, goal }: { expenses: Expense[]; currency: string; budget?: number | null; goal?: string | null }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (expenses.length < 3) { toast.info("Add at least 3 expenses for meaningful insights."); return; }
    setLoading(true);
    try {
      const monthStart = startOfMonth(new Date());
      const thisMonth = expenses.filter((e) => new Date(e.expense_date) >= monthStart);
      const byCat = thisMonth.reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] || 0) + Number(e.amount); return acc; }, {});
      const total = thisMonth.reduce((s, e) => s + Number(e.amount), 0);
      const summary = {
        period: "current_month",
        total: Math.round(total * 100) / 100,
        entries: thisMonth.length,
        by_category: Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, Math.round(v * 100) / 100])),
        top_merchants: Object.entries(thisMonth.reduce<Record<string, number>>((acc, e) => { if (e.merchant) acc[e.merchant] = (acc[e.merchant] || 0) + Number(e.amount); return acc; }, {})).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([m,a])=>({merchant:m,amount:Math.round(a*100)/100})),
      };
      const { data, error } = await supabase.functions.invoke("insights", { body: { summary, currency, monthly_budget: budget, goal } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data.insights || []);
    } catch (err: any) {
      toast.error(err.message || "Could not generate insights");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-card p-6 h-full flex flex-col bg-gradient-surface relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="relative flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow animate-pulse-glow">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-lg">AI Insights</h2>
          <p className="text-xs text-muted-foreground">Patterns in your spending.</p>
        </div>
      </div>

      <div className="relative flex-1 space-y-3">
        {insights.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-6 gap-3">
            <p className="text-sm text-muted-foreground max-w-xs">Get 3 sharp observations on where your money is going this month.</p>
            <Button onClick={generate} disabled={loading} variant="hero" className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate insights
            </Button>
          </div>
        ) : (
          <>
            {insights.map((ins, i) => (
              <div key={i} className="p-3.5 rounded-lg bg-surface-2/60 border border-border animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 ${ins.tone === "positive" ? "text-mint" : ins.tone === "warning" ? "text-accent" : "text-primary"}`}>
                    {ins.tone === "positive" ? <CheckCircle2 className="w-4 h-4" /> : ins.tone === "warning" ? <AlertCircle className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-sm leading-tight">{ins.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ins.body}</p>
                  </div>
                </div>
              </div>
            ))}
            <Button onClick={generate} disabled={loading} variant="ghost" size="sm" className="w-full text-xs gap-1.5">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Regenerate
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
