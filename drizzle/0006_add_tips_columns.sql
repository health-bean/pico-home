ALTER TABLE public.task_instances ADD COLUMN IF NOT EXISTS tips text;
ALTER TABLE public.task_instances ADD COLUMN IF NOT EXISTS why_it_matters text;
