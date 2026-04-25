import { useState, FormEvent, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

export default function Auth() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Welcome! You're in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <Link to="/" className="flex items-center gap-2 mb-10 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">Ledgr</span>
        </Link>

        <div className="mb-8">
          <p className="eyebrow mb-3">{mode === "signup" ? "Get started" : "Welcome back"}</p>
          <h1 className="text-4xl font-display font-bold leading-[1.05] mb-3">
            {mode === "signup" ? <>Make sense of <span className="text-gradient">every dollar.</span></> : <>Sign in to your <span className="text-gradient">ledger.</span></>}
          </h1>
          <p className="text-muted-foreground text-sm">AI categorizes, parses receipts, and tells you what matters.</p>
        </div>

        <form onSubmit={handle} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" className="h-12 bg-input border-border" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" className="h-12 bg-input border-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 bg-input border-border" />
          </div>

          <Button type="submit" disabled={busy} variant="hero" size="lg" className="w-full mt-6">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{mode === "signup" ? "Create account" : "Sign in"} <ArrowRight className="w-4 h-4" /></>}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-8">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-foreground font-medium hover:text-primary transition-colors">
            {mode === "signup" ? "Sign in" : "Create account"}
          </button>
        </p>
      </div>
    </div>
  );
}
