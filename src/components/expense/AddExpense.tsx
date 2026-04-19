import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2, Upload, Send, Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Food & Dining","Groceries","Transport","Shopping","Entertainment","Bills & Utilities","Health","Travel","Subscriptions","Education","Other"];

type Draft = {
  amount: string; currency: string; category: string; merchant: string;
  notes: string; expense_date: string; source: string; ai_confidence: number | null; raw_input: string | null;
};

const blankDraft = (currency: string): Draft => ({
  amount: "", currency, category: "Other", merchant: "", notes: "",
  expense_date: new Date().toISOString().slice(0, 10), source: "manual", ai_confidence: null, raw_input: null,
});

export default function AddExpense({ onAdded, defaultCurrency }: { onAdded: () => void; defaultCurrency: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("ai");
  const [aiInput, setAiInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [draft, setDraft] = useState<Draft>(blankDraft(defaultCurrency));
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseWithAI = async (input?: string, image?: string, mode = "text") => {
    if (!input && !image) return;
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-expense", {
        body: { input, image_base64: image, mode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const e = data.expense;
      setDraft({
        amount: String(e.amount),
        currency: e.currency || defaultCurrency,
        category: CATEGORIES.includes(e.category) ? e.category : "Other",
        merchant: e.merchant || "",
        notes: e.notes || "",
        expense_date: e.expense_date || new Date().toISOString().slice(0, 10),
        source: image ? "image_ai" : (mode === "sms" ? "sms_ai" : "text_ai"),
        ai_confidence: e.confidence ?? null,
        raw_input: input || (image ? "[receipt image]" : null),
      });
      toast.success(`Parsed · ${Math.round((e.confidence || 0) * 100)}% confidence`);
      setTab("review");
    } catch (err: any) {
      toast.error(err.message || "Could not parse");
    } finally {
      setParsing(false);
    }
  };

  const handleImage = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => parseWithAI(undefined, reader.result as string, "image");
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!user) return;
    if (!draft.amount || Number(draft.amount) <= 0) { toast.error("Enter an amount"); return; }
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      amount: Number(draft.amount),
      currency: draft.currency,
      category: draft.category,
      merchant: draft.merchant || null,
      notes: draft.notes || null,
      expense_date: draft.expense_date,
      source: draft.source,
      ai_confidence: draft.ai_confidence,
      raw_input: draft.raw_input,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Expense logged");
    setDraft(blankDraft(defaultCurrency));
    setAiInput("");
    setTab("ai");
    onAdded();
  };

  return (
    <div className="surface-card p-6 md:p-7">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
          <Plus className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-lg">Log an expense</h2>
          <p className="text-xs text-muted-foreground">Type, paste, snap, or fill manually.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 bg-surface-2 mb-5">
          <TabsTrigger value="ai" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" />AI</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-4 mt-0">
          <div className="space-y-2">
            <p className="eyebrow">Text or bank SMS</p>
            <Textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder='e.g. "coffee at Blue Bottle 5.50 yesterday" or paste a bank SMS like "Rs.250 debited at SWIGGY"'
              className="bg-input border-border min-h-[100px] resize-none"
              disabled={parsing}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => parseWithAI(aiInput, undefined, /debited|credited|Rs\.|inr/i.test(aiInput) ? "sms" : "text")} disabled={parsing || !aiInput.trim()} variant="hero" className="gap-2">
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Parse with AI
              </Button>
              <Button variant="glass" onClick={() => fileRef.current?.click()} disabled={parsing} className="gap-2">
                <Upload className="w-4 h-4" /> Receipt photo
              </Button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])} />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MessageSquare className="w-3 h-3" /> Works with free-text, bank SMS, and receipt images.</p>
          </div>
        </TabsContent>

        <TabsContent value="review" className="space-y-4 mt-0">
          <ExpenseFields draft={draft} setDraft={setDraft} />
          {draft.ai_confidence !== null && (
            <div className="text-xs text-muted-foreground font-mono">AI confidence · {Math.round(draft.ai_confidence * 100)}%</div>
          )}
          <Button onClick={save} disabled={saving} variant="hero" size="lg" className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save expense"}
          </Button>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4 mt-0">
          <ExpenseFields draft={draft} setDraft={setDraft} />
          <Button onClick={save} disabled={saving} variant="hero" size="lg" className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save expense"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpenseFields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <label className="eyebrow">Amount</label>
          <Input type="number" min="0" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="0.00" className="bg-input border-border h-11 text-lg font-mono" />
        </div>
        <div className="space-y-1.5">
          <label className="eyebrow">Currency</label>
          <Input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase().slice(0, 3) })} className="bg-input border-border h-11 font-mono uppercase" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="eyebrow">Category</label>
          <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
            <SelectTrigger className="bg-input border-border h-11"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="eyebrow">Date</label>
          <Input type="date" value={draft.expense_date} onChange={(e) => setDraft({ ...draft, expense_date: e.target.value })} className="bg-input border-border h-11" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="eyebrow">Merchant</label>
        <Input value={draft.merchant} onChange={(e) => setDraft({ ...draft, merchant: e.target.value })} placeholder="e.g. Whole Foods" className="bg-input border-border h-11" />
      </div>
      <div className="space-y-1.5">
        <label className="eyebrow">Notes</label>
        <Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="optional" className="bg-input border-border h-11" />
      </div>
    </>
  );
}
