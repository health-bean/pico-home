-- Tester feedback content (agreed 2026-09-18; see
-- docs/superpowers/specs/2026-09-18-tester-feedback-content-design.md).
-- Instances snapshot template copy, so existing rows are rewritten by name,
-- and new tasks are inserted into existing homes that qualify.
-- Nothing is deleted; completion history, due dates and dismissed tasks are
-- untouched; frequencies change only where still at the old default.
-- Generated from templates.ts. Idempotent — safe to re-run.
-- Requires 0013 (air_purifier enum value, mold_sensitive column).

-- ── Reworded tasks ────────────────────────────────────────────────────────
UPDATE task_instances SET
  name = 'Wash Driveway and Walkways',
  description = 'Scrub concrete or paver driveways, walkways, and patios with a stiff push broom and a concrete or paver cleaner, then rinse with a garden hose.',
  tips = 'Pre-treat oil stains with a degreaser and let it sit before scrubbing. For pavers, top up the sand in the joints after washing.',
  why_it_matters = 'Mold, mildew, and algae on walkways create a slip hazard. Organic growth can also work into concrete cracks and accelerate deterioration.',
  updated_at = now()
WHERE name = 'Power Wash Driveway and Walkways' AND is_custom = false;

UPDATE task_instances SET
  name = 'Wash Siding',
  description = 'Scrub siding with a soft, flexible brush and a siding wash made for your cladding (vinyl, fiber cement, wood, etc.), then rinse with low pressure at an angle to the siding.',
  tips = 'Never point water straight at the siding or up under the laps — it forces water behind the siding, where it causes rot and mold. Scrub bottom to top and rinse top to bottom so the cleaner doesn''t streak. If you use a pressure washer anyway: check your siding maker''s guidance first (some void the warranty), use the lowest setting and the widest spray tip, stand well back, spray downward at an angle, and never aim at seams, windows, vents or up under the laps.',
  why_it_matters = 'Dirt, mildew and algae hold moisture against siding and break down its finish. Gentle cleaning removes them without pushing water into the wall.',
  updated_at = now()
WHERE name = 'Power Wash Siding' AND is_custom = false;

UPDATE task_instances SET
  name = 'Clean Deck (Seal If Needed)',
  description = 'Scrub the deck with a deck cleaner and a stiff brush and rinse with a garden hose. Then do the water test: if water beads up, you''re done this year. If it soaks in, let the deck dry 24–48 hours and apply sealant or stain.',
  tips = 'Composite and PVC decks never need sealing — just the cleaning. When you do seal, apply on a cloudy day to avoid lap marks. If you use a pressure washer: lowest setting, wide fan tip, keep it moving along the grain, and stay a foot or more back — too close gouges the wood.',
  why_it_matters = 'Unsealed wood decks absorb water, leading to rot, warping, and structural failure. A deck replacement costs $5,000-20,000+. Sealing whenever the water test says it''s time preserves both safety and value.',
  updated_at = now()
WHERE name = 'Clean and Seal Deck' AND is_custom = false;

UPDATE task_instances SET
  name = 'Check Gutters (Clean If Needed)',
  description = 'During a heavy rain, watch your gutters and downspouts: look for water spilling over the edge, running behind the gutter, or downspouts that barely flow. If you see any of that — or it''s spring or fall and leaves have come down — clean them: scoop out debris and flush the downspouts with a hose.',
  tips = 'Use a gutter scoop and garden hose. Check that downspouts discharge at least 4-6 feet from the foundation. Consider gutter guards if you have many trees — they reduce but don''t eliminate cleaning. Professional cleaning runs $150-250 for most homes.',
  why_it_matters = 'Clogged gutters cause water to overflow against the foundation, leading to basement flooding, foundation damage, and fascia rot. Ice dams in winter can damage roofing and cause interior leaks.',
  updated_at = now()
WHERE name = 'Clean Gutters and Downspouts' AND is_custom = false;

-- Frequency changes only where it's still the old default (user edits kept).
-- The old default was 6 months, or 5 for households with the allergies
-- option (the 0.75 speed-up, now dropped from this task).
UPDATE task_instances ti SET frequency_value = 3, frequency_unit = 'months', updated_at = now()
WHERE ti.name = 'Check Gutters (Clean If Needed)' AND ti.is_custom = false
  AND ti.frequency_unit = 'months'
  AND (ti.frequency_value = 6
       OR (ti.frequency_value = 5 AND EXISTS (
         SELECT 1 FROM household_health_flags f
         WHERE f.home_id = ti.home_id AND f.has_allergies = true)));

UPDATE task_instances SET
  name = 'Professional Heat Pump Cleaning',
  description = 'Have a professional clean the whole system: the indoor unit (coil, blower and drain pan) and the outdoor coil. Heat pumps run year-round, so dust and grime build up faster than on a furnace or AC.',
  tips = 'While they''re there, it''s worth asking them to look over the refrigerant level and the defrost cycle — both are cheap to check during a cleaning visit. Otherwise, call for service only if something seems off: weak heating or cooling, ice that won''t clear from the outdoor unit, or strange noises.',
  why_it_matters = 'A dirty coil and blower cut efficiency and airflow, and a clogged drain pan can grow mold and leak.',
  updated_at = now()
WHERE name = 'Heat Pump Professional Tune-Up' AND is_custom = false;

-- Frequency changes only where it's still the old default (user edits kept)
UPDATE task_instances SET frequency_value = 1, frequency_unit = 'years', updated_at = now()
WHERE name = 'Professional Heat Pump Cleaning' AND is_custom = false
  AND frequency_value = 6 AND frequency_unit = 'months';

-- ── Air Quality & Health sub-headings ────────────────────────────────────
UPDATE task_instances AS ti SET subgroup = m.subgroup
FROM (VALUES
  ('Test Radon Levels', 'radon'),
  ('Inspect for Mold Growth', 'mold_moisture'),
  ('Check Indoor Humidity Levels', 'mold_moisture'),
  ('Clean Air Purifier Pre-Filters', 'air_purifier'),
  ('Replace Air Purifier Filters', 'air_purifier'),
  ('Clean Dehumidifier Filters', 'dehumidifier')
) AS m(name, subgroup)
WHERE ti.name = m.name AND ti.is_custom = false AND ti.subgroup IS DISTINCT FROM m.subgroup;

-- ── New tasks for existing homes ─────────────────────────────────────────
-- Ice dams: roofed, detached homes in climate zone 4+ (unknown zone included)
INSERT INTO task_instances
  (home_id, name, description, category, priority, frequency_unit, frequency_value,
   next_due_date, is_active, is_custom, notification_days_before, tips, why_it_matters, subgroup)
SELECT h.id, 'Check for Ice Dams', 'After a snowfall or a cold snap, look along the roof edges, gutters and fascia boards from the ground. Watch for large icicles or sheets of ice building up at the roof''s edge.', 'exterior_structure', 'prevent_damage', 'years',
  1, '2027-01-15', true, false, 3, 'Check after every heavy snow, not just when this task comes due. Don''t knock ice off from a ladder or chip at it on the roof — it damages shingles and is dangerous. A roof rake, used from the ground, to pull snow off the lower few feet helps prevent them.', 'Big icicles and ice sheets are often the visible sign of an ice dam: a ridge of ice that traps melting snow, which backs up under the shingles and leaks into the attic, walls and ceilings. Repeat ice dams usually mean heat is escaping into the attic (insulation or ventilation), which a pro can diagnose.', 'roof_gutters'
FROM homes h
LEFT JOIN household_health_flags f ON f.home_id = h.id
WHERE (h.type IN ('single_family', 'townhouse') AND EXISTS (SELECT 1 FROM home_systems hs WHERE hs.home_id = h.id AND hs.system_type = 'roofing') AND (NULLIF(substring(h.climate_zone from '^[0-9]+'), '') IS NULL OR substring(h.climate_zone from '^[0-9]+')::int >= 4))
  AND NOT EXISTS (SELECT 1 FROM task_instances ti WHERE ti.home_id = h.id AND ti.name = 'Check for Ice Dams');

-- Duct tasks now reach every ducted system (heat pumps, evaporative coolers)
INSERT INTO task_instances
  (home_id, name, description, category, priority, frequency_unit, frequency_value,
   next_due_date, is_active, is_custom, notification_days_before, tips, why_it_matters, subgroup)
SELECT h.id, 'Professional Duct Cleaning', 'Hire a professional to clean your HVAC ductwork. This removes accumulated dust, pet dander, mold spores, and other debris.', 'heating_cooling', 'efficiency', 'years',
  CASE WHEN coalesce(f.has_allergies, false) OR coalesce(f.prioritize_air_quality, false) OR coalesce(f.mold_sensitive, false) THEN 2 ELSE 4 END, '2027-03-02', true, false, 3, 'Get quotes from at least 3 companies. Beware of $99 whole-house deals — reputable companies charge $300-600. Ask if they use negative pressure equipment. Check NADCA certification.', 'Dirty ducts circulate dust, allergens, and potentially mold throughout your home. If anyone in your household has allergies or asthma, this is especially important.', 'air_filters_ducts'
FROM homes h
LEFT JOIN household_health_flags f ON f.home_id = h.id
WHERE (EXISTS (SELECT 1 FROM home_systems hs WHERE hs.home_id = h.id AND hs.system_type = 'hvac') AND EXISTS (SELECT 1 FROM appliances a WHERE a.home_id = h.id AND a.category::text IN ('furnace', 'ac_unit', 'heat_pump', 'evap_cooler')))
  AND NOT EXISTS (SELECT 1 FROM task_instances ti WHERE ti.home_id = h.id AND ti.name = 'Professional Duct Cleaning');

INSERT INTO task_instances
  (home_id, name, description, category, priority, frequency_unit, frequency_value,
   next_due_date, is_active, is_custom, notification_days_before, tips, why_it_matters, subgroup)
SELECT h.id, 'Inspect Ductwork for Leaks', 'Visually inspect accessible ductwork in your attic, basement, or crawlspace for disconnections, gaps, or damaged insulation.', 'heating_cooling', 'efficiency', 'years',
  2, '2026-09-21', true, false, 3, 'Turn the system on and feel for air escaping at joints. Look for duct tape (ironically, it fails on ducts) — metal tape or mastic sealant is what should be used. Seal any leaks you find with foil-backed tape.', 'Leaky ducts can waste 20-30% of your heating and cooling energy. That translates to hundreds of dollars per year in wasted utility costs.', 'air_filters_ducts'
FROM homes h
LEFT JOIN household_health_flags f ON f.home_id = h.id
WHERE (h.type IN ('single_family', 'townhouse') AND EXISTS (SELECT 1 FROM home_systems hs WHERE hs.home_id = h.id AND hs.system_type = 'hvac') AND EXISTS (SELECT 1 FROM appliances a WHERE a.home_id = h.id AND a.category::text IN ('furnace', 'ac_unit', 'heat_pump', 'evap_cooler')))
  AND NOT EXISTS (SELECT 1 FROM task_instances ti WHERE ti.home_id = h.id AND ti.name = 'Inspect Ductwork for Leaks');

-- Freestanding units (homes that already registered one)
INSERT INTO task_instances
  (home_id, name, description, category, priority, frequency_unit, frequency_value,
   next_due_date, is_active, is_custom, notification_days_before, tips, why_it_matters, subgroup)
SELECT h.id, 'Clean Air Purifier Pre-Filters', 'Vacuum or rinse the washable pre-filter on each air purifier — the outer mesh layer that catches hair and dust. Let rinsed filters dry completely before putting them back.', 'air_quality', 'efficiency', 'months',
  1, '2026-10-08', true, false, 3, 'A handheld vacuum or brush attachment works for most pre-filters. Only rinse ones your manual calls washable, and never put a damp filter back — it can grow mold.', 'A clogged pre-filter chokes airflow, so the purifier cleans less air and the main filter wears out sooner.', 'air_purifier'
FROM homes h
LEFT JOIN household_health_flags f ON f.home_id = h.id
WHERE (EXISTS (SELECT 1 FROM appliances a WHERE a.home_id = h.id AND a.category::text IN ('air_purifier')))
  AND NOT EXISTS (SELECT 1 FROM task_instances ti WHERE ti.home_id = h.id AND ti.name = 'Clean Air Purifier Pre-Filters');

INSERT INTO task_instances
  (home_id, name, description, category, priority, frequency_unit, frequency_value,
   next_due_date, is_active, is_custom, notification_days_before, tips, why_it_matters, subgroup)
SELECT h.id, 'Replace Air Purifier Filters', 'Replace the main HEPA and/or carbon filter on each air purifier.', 'air_quality', 'efficiency', 'months',
  6, '2026-11-21', true, false, 3, 'Check your manual or the unit''s filter light — most HEPA filters last 6–12 months, carbon filters less. You can change how often this repeats to match your model.', 'A spent filter stops capturing particles and odors, so the purifier just moves air around.', 'air_purifier'
FROM homes h
LEFT JOIN household_health_flags f ON f.home_id = h.id
WHERE (EXISTS (SELECT 1 FROM appliances a WHERE a.home_id = h.id AND a.category::text IN ('air_purifier')))
  AND NOT EXISTS (SELECT 1 FROM task_instances ti WHERE ti.home_id = h.id AND ti.name = 'Replace Air Purifier Filters');

INSERT INTO task_instances
  (home_id, name, description, category, priority, frequency_unit, frequency_value,
   next_due_date, is_active, is_custom, notification_days_before, tips, why_it_matters, subgroup)
SELECT h.id, 'Clean Dehumidifier Filters', 'Remove and wash the air filter on each portable dehumidifier, and wipe out the water bucket while you''re there so it doesn''t grow mold.', 'air_quality', 'efficiency', 'months',
  2, '2026-11-05', true, false, 3, 'Rinse the filter in warm water and let it dry fully. Wipe the bucket with mild soap; a little white vinegar helps with slime or musty smells.', 'A dusty filter makes the dehumidifier work harder and pull less moisture, and standing water in a dirty bucket is a mold source of its own.', 'dehumidifier'
FROM homes h
LEFT JOIN household_health_flags f ON f.home_id = h.id
WHERE (EXISTS (SELECT 1 FROM appliances a WHERE a.home_id = h.id AND a.category::text IN ('dehumidifier')))
  AND NOT EXISTS (SELECT 1 FROM task_instances ti WHERE ti.home_id = h.id AND ti.name = 'Clean Dehumidifier Filters');
