import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";
import AddExpense from "@/components/expense/AddExpense";
import StatsRow from "@/components/dashboard/StatsRow";
import CategoryChart from "@/components/dashboard/CategoryChart";
import TrendChart from "@/components/dashboard/TrendChart";
import RecentExpenses from "@/components/dashboard/RecentExpenses";
import AIInsights from "@/components/dashboard/AIInsights";
import MonthlyChart from "@/components/dashboard/MonthlyChart";
import ThemeToggle from "@/components/ThemeToggle";

type Profile = { display_name: string | null; currency: string; monthly_budget: number | null; spending_goal: string | null };
export type Expense = {
  id: string; amount: number; currency: string; category: string;
  merchant: string | null; notes: string | null; expense_date: string;
  source: string; ai_confidence: number | null; created_at: string;
  transaction_type?: string;
};

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, e] = await Promise.all([
        supabase.from("profiles").select("display_name, currency, monthly_budget, spending_goal").eq("user_id", user.id).maybeSingle(),
        supabase.from("expenses").select("*").eq("user_id", user.id).order("expense_date", { ascending: false }).order("created_at", { ascending: false }).limit(200),
      ]);
      if (p.data) setProfile(p.data as Profile);
      if (e.data) setExpenses(e.data as Expense[]);
    })();
  }, [user, refreshKey]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); handleRefresh(); }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }

  const currency = profile?.currency || "USD";
  const firstName = (profile?.display_name || "there").split(" ")[0];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="border-b border-border/60 sticky top-0 z-30 surface-glass">
        <div className="container max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-base tracking-tight">Ledgr</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings")} className="gap-2">
              <SettingsIcon className="w-4 h-4" /> <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl mx-auto px-4 pt-10 md:pt-16 space-y-10">
        {/* Hero */}
        <section className="animate-fade-in">
          <p className="eyebrow mb-3">Overview · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold leading-[1.05] tracking-tight">
            Hi {firstName}, <br className="hidden sm:block" />
            here's where your <span className="text-gradient">money went.</span>
          </h1>
        </section>

        {/* Stats */}
        <StatsRow expenses={expenses} currency={currency} budget={profile?.monthly_budget} />

        {/* Add expense + AI insights */}
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3"><AddExpense onAdded={handleRefresh} defaultCurrency={currency} /></div>
          <div className="lg:col-span-2"><AIInsights expenses={expenses} currency={currency} budget={profile?.monthly_budget} goal={profile?.spending_goal} /></div>
        </div>

        {/* Monthly overview */}
        <div className="grid grid-cols-1 gap-6">
          <MonthlyChart expenses={expenses} currency={currency} />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <CategoryChart expenses={expenses} currency={currency} />
          <TrendChart expenses={expenses} currency={currency} />
        </div>

        {/* Recent */}
        <RecentExpenses expenses={expenses} currency={currency} onDelete={handleDelete} onRefresh={handleRefresh} />
      </div>
    </div>
  );
};

export default Dashboard;
