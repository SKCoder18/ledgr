import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Loader2, Lock, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have an active session for password reset
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast.error("Session expired. Please request a new reset link.");
        navigate("/auth");
      }
    };
    checkSession();
  }, [navigate]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully!");
      navigate("/auth");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">Ledgr</span>
        </div>

        <div className="mb-8">
          <p className="eyebrow mb-3">Security</p>
          <h1 className="text-4xl font-display font-bold leading-[1.05] mb-3">
            Set a <span className="text-gradient">new password.</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            Choose a strong password to protect your account.
          </p>
        </div>

        <form onSubmit={handle} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 bg-input border-border pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={busy} variant="hero" size="lg" className="w-full mt-6">
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Update password <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
