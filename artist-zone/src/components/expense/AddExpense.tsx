import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2, Upload, Send, Plus, MessageSquare, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const EXPENSE_CATEGORIES = ["Food & Dining","Groceries","Transport","Shopping","Entertainment","Bills & Utilities","Health","Travel","Subscriptions","Education","Other"];
const INCOME_CATEGORIES = ["Salary","Freelance","Refund","Investment","Gift","Other Income"];

// Comprehensive Indian & international bank SMS patterns
const SMS_PATTERN = /debited|credited|Rs\.|INR|inr|₹|HDFC|ICICI|SBI|Axis|Kotak|PNB|BOI|Canara|debited from|credited to|spent on|payment of|transferred to|UPI|NEFT|RTGS|debit card|credit card/i;

type TxType = "expense" | "income";

type Draft = {
  amount: string; currency: string; category: string; merchant: string;
  notes: string; expense_date: string; source: string; ai_confidence: number | null;
  raw_input: string | null; transaction_type: TxType;
};

const blankDraft = (currency: string, type: TxType = "expense"): Draft => ({
  amount: "", currency, category: type === "income" ? "Other Income" : "Other",
  merchant: "", notes: "",
  expense_date: new Date().toISOString().slice(0, 10),
  source: "manual", ai_confidence: null, raw_input: null,
  transaction_type: type,
});

export default function AddExpense({ onAdded, defaultCurrency }: { onAdded: () => void; defaultCurrency: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState("ai");
  const [aiInput, setAiInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [draft, setDraft] = useState<Draft>(blankDraft(defaultCurrency));
  const [saving, setSaving] = useState(false);
  const [creditWarning, setCreditWarning] = useState(false);
  const [manualType, setManualType] = useState<TxType>("expense");
  const fileRef = useRef<HTMLInputElement>(null);

  const parseWithAI = async (input?: string, image?: string, mode = "text") => {
    if (!input && !image) return;
    setParsing(true);
    setCreditWarning(false);
    try {
      const { data, error } = await supabase.functions.invoke("parse-expense", {
        body: { input, image_base64: image, mode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const e = data.expense;
      // Frontend income detection — works even if edge function hasn't been redeployed.
      // Check: AI response first, then scan the raw input text, merchant, and notes.
      const INCOME_KEYWORDS = /\b(credited|credit|received|salary|refund|cashback|deposited|deposit|payment received|income|bonus|reward|interest earned|dividends?|reimbursement|reimburse|transferred to you|money received|amount received)\b/i;
      const aiSaysIncome = e.transaction_type === "income";
      const textSaysIncome = INCOME_KEYWORDS.test(input || "") || INCOME_KEYWORDS.test(e.merchant || "") || INCOME_KEYWORDS.test(e.notes || "");
      const txType: TxType = (aiSaysIncome || textSaysIncome) ? "income" : "expense";
      const categories = txType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      setDraft({
        amount: String(e.amount),
        currency: e.currency || defaultCurrency,
        category: categories.includes(e.category) ? e.category : (txType === "income" ? "Other Income" : "Other"),
        merchant: e.merchant || "",
        notes: e.notes || "",
        expense_date: e.expense_date || new Date().toISOString().slice(0, 10),
        source: image ? "image_ai" : (mode === "sms" ? "sms_ai" : "text_ai"),
        ai_confidence: e.confidence ?? null,
        raw_input: input || (image ? "[receipt image]" : null),
        transaction_type: txType,
      });
      toast.success(`Parsed · ${Math.round((e.confidence || 0) * 100)}% confidence`);
      if (txType === "income") setCreditWarning(true);
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

  const checkDuplicate = async (): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase
      .from("expenses")
      .select("id")
      .eq("user_id", user.id)
      .eq("amount", Number(draft.amount))
      .eq("expense_date", draft.expense_date)
      .limit(1);
    return !!(data && data.length > 0);
  };

  const save = async (forceType?: TxType) => {
    if (!user) return;
    if (!draft.amount || Number(draft.amount) <= 0) { toast.error("Enter an amount"); return; }
    setSaving(true);

    // Duplicate check
    const isDupe = await checkDuplicate();
    if (isDupe) {
      setSaving(false);
      toast.warning(
        `A ${draft.transaction_type} of ${draft.amount} on ${draft.expense_date} already exists. Save anyway?`,
        {
          action: { label: "Save anyway", onClick: () => doSave(forceType) },
          duration: 8000,
        }
      );
      return;
    }

    await doSave(forceType);
  };

  const doSave = async (forceType?: TxType) => {
    if (!user) return;
    setSaving(true);
    const txType = forceType || draft.transaction_type;
    const insertData: Record<string, any> = {
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
      transaction_type: txType,
    };
    const { error } = await supabase.from("expenses").insert(insertData);
    setSaving(false);
    if (error) {
      // If transaction_type column doesn't exist yet, save without it
      if (error.message?.includes("transaction_type")) {
        delete insertData.transaction_type;
        const { error: e2 } = await supabase.from("expenses").insert(insertData);
        if (e2) { toast.error(e2.message); return; }
        toast.success("Saved (run DB migration to enable income tracking)");
      } else {
        toast.error(error.message); return;
      }
    } else {
      toast.success(txType === "income" ? "Income logged ✓" : "Expense logged ✓");
    }
    setDraft(blankDraft(defaultCurrency));
    setAiInput("");
    setTab("ai");
    setCreditWarning(false);
    onAdded();
  };

  const categories = draft.transaction_type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="surface-card p-6 md:p-7">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
          <Plus className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-lg">Log a transaction</h2>
          <p className="text-xs text-muted-foreground">Type, paste, snap, or fill manually.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 bg-surface-2 mb-5">
          <TabsTrigger value="ai" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" />AI</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-4 mt-0">
          <div className="space-y-2">
            <p className="eyebrow">Text, SMS or description</p>
            <Textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder='e.g. "Rs.250 debited at SWIGGY" or "received salary 50000 today"'
              className="bg-input border-border min-h-[100px] resize-none"
              disabled={parsing}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => parseWithAI(aiInput, undefined, SMS_PATTERN.test(aiInput) ? "sms" : "text")}
                disabled={parsing || !aiInput.trim()} variant="hero" className="gap-2"
              >
                {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Parse with AI
              </Button>
              <Button variant="glass" onClick={() => fileRef.current?.click()} disabled={parsing} className="gap-2">
                <Upload className="w-4 h-4" /> Receipt photo
              </Button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])} />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" /> Works with free-text, bank SMS, and receipt images.
            </p>
          </div>
        </TabsContent>

        {/* Review Tab */}
        <TabsContent value="review" className="space-y-4 mt-0">
          {/* Credit warning banner */}
          {creditWarning && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-income/10 border border-income/30 animate-slide-in">
              <AlertTriangle className="w-4 h-4 text-income mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-income">This looks like income, not an expense</p>
                <p className="text-xs text-muted-foreground mt-0.5">AI detected a credit/received transaction. Save it as income?</p>
                <div className="flex gap-2 mt-2.5">
                  <Button size="sm" className="h-7 px-3 text-xs bg-income/20 border border-income/40 text-income hover:bg-income/30" onClick={() => { setDraft(d => ({ ...d, transaction_type: "income" })); setCreditWarning(false); }}>
                    <TrendingUp className="w-3 h-3 mr-1" /> Save as Income
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" onClick={() => { setDraft(d => ({ ...d, transaction_type: "expense" })); setCreditWarning(false); }}>
                    <TrendingDown className="w-3 h-3 mr-1" /> It's an Expense
                  </Button>
                </div>
              </div>
            </div>
          )}
          <ExpenseFields draft={draft} setDraft={setDraft} categories={categories} />
          {draft.ai_confidence !== null && (
            <div className="text-xs text-muted-foreground font-mono">AI confidence · {Math.round(draft.ai_confidence * 100)}%</div>
          )}
          <Button onClick={() => save()} disabled={saving} variant="hero" size="lg" className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Save ${draft.transaction_type === "income" ? "income" : "expense"}`}
          </Button>
        </TabsContent>

        {/* Manual Tab */}
        <TabsContent value="manual" className="space-y-4 mt-0">
          {/* Expense / Income toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-surface-2 w-fit">
            <button
              onClick={() => { setManualType("expense"); setDraft(d => ({ ...d, transaction_type: "expense", category: "Other" })); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${manualType === "expense" ? "bg-destructive/20 text-destructive border border-destructive/30" : "text-muted-foreground hover:text-foreground"}`}
            >
              <TrendingDown className="w-3.5 h-3.5" /> Expense
            </button>
            <button
              onClick={() => { setManualType("income"); setDraft(d => ({ ...d, transaction_type: "income", category: "Other Income" })); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${manualType === "income" ? "bg-income/20 text-income border border-income/30" : "text-muted-foreground hover:text-foreground"}`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Income
            </button>
          </div>
          <ExpenseFields draft={draft} setDraft={setDraft} categories={categories} />
          <Button onClick={() => save()} disabled={saving} variant="hero" size="lg" className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Save ${manualType}`}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExpenseFields({ draft, setDraft, categories }: { draft: Draft; setDraft: (d: Draft) => void; categories: string[] }) {
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
            <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="eyebrow">Date</label>
          <Input type="date" value={draft.expense_date} onChange={(e) => setDraft({ ...draft, expense_date: e.target.value })} className="bg-input border-border h-11" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="eyebrow">Merchant / Source</label>
        <Input value={draft.merchant} onChange={(e) => setDraft({ ...draft, merchant: e.target.value })} placeholder="e.g. Swiggy" className="bg-input border-border h-11" />
      </div>
      <div className="space-y-1.5">
        <label className="eyebrow">Notes</label>
        <Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="optional" className="bg-input border-border h-11" />
      </div>
    </>
  );
}
