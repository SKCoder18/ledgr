-- Add transaction_type to expenses table
-- Values: 'expense' (default) | 'income' | 'transfer'
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'expense'
  CHECK (transaction_type IN ('expense', 'income', 'transfer'));

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_expenses_type
  ON public.expenses(user_id, transaction_type);
