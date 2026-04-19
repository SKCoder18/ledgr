import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CURRENCIES = ["USD","EUR","GBP","INR","CAD","AUD","JPY","SGD","AED","BRL"];

export default function Settings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [budget, setBudget] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/auth", { replace: true }); }, [user, loading, navigate]);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setName(data.display_name || "");
        setCurrency(data.currency || "USD");
        setBudget(data.monthly_budget?.toString() || "");
        setGoal(data.spending_goal || "");
      }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      display_name: name || null,
      currency,
      monthly_budget: budget ? Number(budget) : null,
      spending_goal: goal || null,
    }).eq("user_id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 surface-glass sticky top-0 z-30">
        <div className="container max-w-3xl flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="font-display font-bold">Settings</span>
          <span className="w-12" />
        </div>
      </header>

      <div className="container max-w-2xl py-12 space-y-8">
        <div>
          <p className="eyebrow mb-3">Profile</p>
          <h1 className="text-3xl font-display font-bold tracking-tight">Personalize your <span className="text-gradient">ledger.</span></h1>
        </div>

        <div className="surface-card p-6 space-y-5">
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-input border-border h-11" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preferred currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-input border-border h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monthly budget</Label>
              <Input type="number" min="0" step="1" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 2500" className="bg-input border-border h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Spending goal</Label>
            <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Save for a trip to Japan in October" className="bg-input border-border min-h-[88px]" />
            <p className="text-xs text-muted-foreground">AI uses this to tailor your insights.</p>
          </div>
          <Button onClick={save} disabled={busy} variant="hero" size="lg" className="w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
