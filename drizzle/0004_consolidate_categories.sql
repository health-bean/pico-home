-- ============================================================================
-- Migration: Consolidate 14 task categories to 7 homeowner-friendly groups
-- hvac → heating_cooling, electrical → power,
-- roof_gutters/exterior/windows_doors/garage → exterior_structure,
-- lawn_landscape/pest_control/pool → lawn_outdoors,
-- appliance → appliances, cleaning/seasonal → redistributed
-- ============================================================================

-- ── Re-categorize existing tasks ─────────────────────────────────────────────
-- Must happen BEFORE we change the enum since old values are still valid

-- Convert to text first so we can update freely
ALTER TABLE public.task_instances ALTER COLUMN category SET DATA TYPE text;

-- Remap old categories to new ones
UPDATE public.task_instances SET category = 'heating_cooling' WHERE category = 'hvac';
UPDATE public.task_instances SET category = 'power' WHERE category = 'electrical';
UPDATE public.task_instances SET category = 'exterior_structure' WHERE category IN ('roof_gutters', 'exterior', 'windows_doors', 'garage');
UPDATE public.task_instances SET category = 'lawn_outdoors' WHERE category IN ('lawn_landscape', 'pest_control', 'pool');
UPDATE public.task_instances SET category = 'appliances' WHERE category = 'appliance';
-- Redistribute cleaning and seasonal
UPDATE public.task_instances SET category = 'exterior_structure' WHERE category = 'cleaning';
UPDATE public.task_instances SET category = 'exterior_structure' WHERE category = 'seasonal';

-- ── Rebuild the enum ─────────────────────────────────────────────────────────
DROP TYPE public.task_category;
CREATE TYPE public.task_category AS ENUM (
  'safety', 'heating_cooling', 'plumbing', 'power',
  'exterior_structure', 'lawn_outdoors', 'appliances'
);
ALTER TABLE public.task_instances ALTER COLUMN category SET DATA TYPE public.task_category
  USING category::public.task_category;
