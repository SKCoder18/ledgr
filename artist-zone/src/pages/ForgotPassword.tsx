import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, Loader2, Send } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent! Check your inbox.");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <button
          onClick={() => navigate("/auth")}
          className="flex items-center gap-2 mb-10 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back to sign in</span>
        </button>

        <div className="mb-8">
          <p className="eyebrow mb-3">Recover Account</p>
          <h1 className="text-4xl font-display font-bold leading-[1.05] mb-3">
            Forgot your <span className="text-gradient">password?</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {sent
              ? `We've sent a recovery link to ${email}.`
              : "Enter your email and we'll send you a link to reset your password."}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handle} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="h-12 bg-input border-border focus:ring-primary/20"
              />
            </div>
            <Button type="submit" disabled={busy} variant="hero" size="lg" className="w-full mt-6">
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Send reset link <Send className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="bg-surface-2 border border-border/50 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-income/10 flex items-center justify-center mx-auto mb-4">
              <Send className="w-6 h-6 text-income" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Didn't receive it? Check your spam folder or{" "}
              <button
                onClick={() => setSent(false)}
                className="text-foreground font-medium hover:underline"
              >
                try again
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
