-- The app always sent these values in UTC.
ALTER TABLE public.groups
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "deletedAt" TYPE timestamptz USING "deletedAt" AT TIME ZONE 'UTC';

ALTER TABLE public.expenses
  ALTER COLUMN "updatedAt" TYPE timestamptz USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "deletedAt" TYPE timestamptz USING "deletedAt" AT TIME ZONE 'UTC';
