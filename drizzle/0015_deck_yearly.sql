-- Clean Deck (Seal If Needed) is yearly for every household: the allergy /
-- immune-compromised speed-up made it every 6 months, which nobody does.
-- Only rows still at that old adjusted default change (user edits kept).
-- Idempotent — safe to re-run.

UPDATE task_instances ti
SET frequency_value = 1, frequency_unit = 'years', updated_at = now()
WHERE ti.name = 'Clean Deck (Seal If Needed)'
  AND ti.is_custom = false
  AND ti.frequency_value = 6 AND ti.frequency_unit = 'months'
  AND EXISTS (
    SELECT 1 FROM household_health_flags f
    WHERE f.home_id = ti.home_id
      AND (f.has_allergies = true OR f.has_immunocompromised = true)
  );
