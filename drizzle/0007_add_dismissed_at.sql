ALTER TABLE public.task_instances ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
