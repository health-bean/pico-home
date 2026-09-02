-- Backfill: task_instances snapshot template copy at creation time, so the
-- CO-placement myth and unsafe panel wording fixed in templates.ts must also
-- be corrected on existing rows. Safe to re-run (idempotent WHERE clauses).

UPDATE task_instances
SET tips = REPLACE(
  tips,
  'CO is heavier than air, so don''t mount too high.',
  'CO mixes evenly with air, so wall or ceiling placement both work — follow the manufacturer''s mounting guidance.'
)
WHERE tips LIKE '%heavier than air%';

UPDATE task_instances
SET description = 'Open the panel door (never remove the inner screwed-on cover — it shields live parts) and visually check for corrosion, scorch marks, melted wire insulation, or unusual odors.'
WHERE name = 'Inspect Electrical Panel'
  AND is_custom = false
  AND description LIKE 'Open the panel cover%';
