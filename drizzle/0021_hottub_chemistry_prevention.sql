-- "Test Hot Tub Water Chemistry" is routine upkeep, not a Safety task
-- (agreed 2026-11-16): as Safety it capped the score and headlined the
-- dashboard whenever a weekly test slipped. Instances snapshot priority, so
-- existing rows are updated by name. Idempotent.
UPDATE task_instances
SET priority = 'prevent_damage', updated_at = now()
WHERE name = 'Test Hot Tub Water Chemistry' AND is_custom = false AND priority = 'safety';
