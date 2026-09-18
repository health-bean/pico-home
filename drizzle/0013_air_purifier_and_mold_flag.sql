-- Tester feedback (2026-09-18): portable air purifiers become a known
-- appliance, and households can mark themselves mold-sensitive.
-- Idempotent — safe to re-run.

ALTER TYPE appliance_category ADD VALUE IF NOT EXISTS 'air_purifier';

ALTER TABLE household_health_flags
  ADD COLUMN IF NOT EXISTS mold_sensitive boolean DEFAULT false;
