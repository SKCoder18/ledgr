import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Expense } from "@/pages/Dashboard";

const EXPENSE_CATEGORIES = ["Food & Dining","Groceries","Transport","Shopping","Entertainment","Bills & Utilities","Health","Travel","Subscriptions","Education","Other"];
const INCOME_CATEGORIES = ["Salary","Freelance","Refund","Investment","Gift","Other Income"];

interface Props {
  expense: Expense;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditExpenseModal({ expense, open, onClose, onUpdated }: Props) {
  const isIncome = expense.transaction_type === "income";
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const [amount, setAmount] = useState(String(expense.amount));
  const [currency, setCurrency] = useState(expense.currency);
  const [category, setCategory] = useState(expense.category);
  const [merchant, setMerchant] = useState(expense.merchant || "");
  const [notes, setNotes] = useState(expense.notes || "");
  const [date, setDate] = useState(expense.expense_date);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!amount || Number(amount) <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    const { error } = await supabase.from("expenses").update({
      amount: Number(amount),
      currency,
      category,
      merchant: merchant || null,
      notes: notes || null,
      expense_date: date,
    }).eq("id", expense.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    onUpdated();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Edit {isIncome ? "Income" : "Expense"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="eyebrow">Amount</label>
              <Input
                type="number" min="0" step="0.01"
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="bg-input border-border h-11 text-lg font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="eyebrow">Currency</label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                className="bg-input border-border h-11 font-mono uppercase"
              />
            </div>
          </div>

          {/* Category + Date */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="eyebrow">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-input border-border h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="eyebrow">Date</label>
              <Input
                type="date" value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-input border-border h-11"
              />
            </div>
          </div>

          {/* Merchant */}
          <div className="space-y-1.5">
            <label className="eyebrow">Merchant / Source</label>
            <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="e.g. Swiggy" className="bg-input border-border h-11" />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="eyebrow">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" className="bg-input border-border h-11" />
          </div>

          <Button onClick={save} disabled={saving} variant="hero" size="lg" className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
