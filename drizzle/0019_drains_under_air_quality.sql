-- Drains move to Air Quality & Health (agreed 2026-10-29).
-- "Preventive Drain Treatment" (Plumbing > Pipes & Drains) becomes
-- "Clean and Flush Drains" (Air Quality & Health > Drains). Updated in place
-- by name, so due dates, frequency (incl. monthly for mold-sensitive homes)
-- and completion history carry over. Idempotent: re-runs match nothing.

UPDATE task_instances SET
  name = 'Clean and Flush Drains',
  description = 'Clean and flush every sink, shower and tub drain: pull out the stopper or strainer, clear out hair and gunk, scrub the stopper and the drain opening, then run hot water down each drain for a minute.',
  tips = 'Don''t skip the overflow hole on sinks and tubs — gunk collects there too. Skip harsh chemical cleaners like Drano; they corrode pipes. An enzyme drain treatment left overnight helps keep buildup from coming back.',
  why_it_matters = 'Hair, soap and skin build up inside drains and feed bacteria and mold, which cause musty smells and slow drains. Regular cleaning keeps that growth out of your bathrooms and kitchen and heads off clogs.',
  category = 'air_quality',
  subgroup = 'drains',
  updated_at = now()
WHERE name = 'Preventive Drain Treatment' AND is_custom = false;
