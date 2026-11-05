ALTER TABLE public.expenses
  ADD COLUMN "kind" text NOT NULL DEFAULT 'expense'
  CHECK ("kind" IN ('expense', 'reimbursement'));
