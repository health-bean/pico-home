-- ============================================================================
-- Migration: Add task sub-groups and restructure categories
-- - Add subgroup column to task_instances
-- - Add air_quality to task_category enum
-- - Rename lawn_outdoors to outdoors_stuff
-- - Re-categorize pest control, water treatment, and outdoor tasks
-- ============================================================================

-- ── 1. Add subgroup column ──────────────────────────────────────────────────

ALTER TABLE public.task_instances
  ADD COLUMN IF NOT EXISTS subgroup varchar(50);

-- ── 2. Restructure the category enum ────────────────────────────────────────

-- Convert to text to allow free updates
ALTER TABLE public.task_instances ALTER COLUMN category SET DATA TYPE text;

-- Rename lawn_outdoors → outdoors_stuff
UPDATE public.task_instances SET category = 'outdoors_stuff' WHERE category = 'lawn_outdoors';

-- Re-categorize pest control tasks to exterior_structure
UPDATE public.task_instances SET category = 'exterior_structure'
  WHERE name IN ('Termite Inspection', 'Seal Entry Points Walkthrough', 'Mosquito Prevention — Standing Water Check')
    AND category = 'outdoors_stuff';

-- Re-categorize water treatment tasks to plumbing
UPDATE public.task_instances SET category = 'plumbing'
  WHERE name IN ('Add Salt to Water Softener', 'Clean Water Softener Brine Tank', 'Replace Whole-House Water Filter')
    AND category = 'appliances';

-- Re-categorize air quality tasks
UPDATE public.task_instances SET category = 'air_quality'
  WHERE name IN ('Test Radon Levels', 'Check Radon Levels', 'Inspect for Mold Growth', 'Check Indoor Humidity Levels');

-- Re-categorize outdoor tasks from exterior_structure to outdoors_stuff
UPDATE public.task_instances SET category = 'outdoors_stuff'
  WHERE name IN ('Clean and Seal Deck', 'Inspect Fence Posts and Panels', 'Check Outdoor Lighting', 'Power Wash Driveway and Walkways')
    AND category IN ('exterior_structure', 'power');

-- Re-categorize energy audit to exterior_structure (if it was in heating_cooling)
UPDATE public.task_instances SET category = 'exterior_structure'
  WHERE name = 'Schedule Energy Audit' AND category = 'heating_cooling';

-- ── 3. Rebuild the enum with new values ─────────────────────────────────────

DROP TYPE public.task_category;
CREATE TYPE public.task_category AS ENUM (
  'safety', 'air_quality', 'heating_cooling', 'plumbing', 'power',
  'exterior_structure', 'outdoors_stuff', 'appliances'
);
ALTER TABLE public.task_instances ALTER COLUMN category SET DATA TYPE public.task_category
  USING category::public.task_category;

-- ── 4. Backfill subgroup values for existing tasks ──────────────────────────

-- Safety sub-groups
UPDATE public.task_instances SET subgroup = 'fire_safety'
  WHERE category = 'safety' AND name IN (
    'Test Smoke Detectors', 'Replace Smoke Detector Batteries', 'Replace Smoke Detectors',
    'Test Carbon Monoxide Detectors', 'Check Fire Extinguishers', 'Replace Fire Extinguishers',
    'Clean Dryer Vent Duct'
  );
UPDATE public.task_instances SET subgroup = 'child_safety'
  WHERE name = 'Check Outlet Covers & Safety Locks';
UPDATE public.task_instances SET subgroup = 'accessibility'
  WHERE name = 'Check Grab Bars and Handrails';

-- Air Quality (flat)
UPDATE public.task_instances SET subgroup = 'air_quality'
  WHERE category = 'air_quality';

-- Heating & Cooling sub-groups
UPDATE public.task_instances SET subgroup = 'air_filters_ducts'
  WHERE name IN ('Replace HVAC Air Filter', 'Professional Duct Cleaning', 'Inspect Ductwork for Leaks');
UPDATE public.task_instances SET subgroup = 'heating_system'
  WHERE name IN ('Professional Heating Tune-Up', 'Replace Thermostat Batteries',
    'Boiler Annual Professional Service', 'Bleed Radiators', 'Check Boiler Pressure');
UPDATE public.task_instances SET subgroup = 'cooling_system'
  WHERE name IN ('Professional Cooling Tune-Up', 'Clean Outdoor Condenser Unit',
    'Clear Condensate Drain Line', 'Evaporative Cooler Spring Startup', 'Evaporative Cooler Fall Winterization');
UPDATE public.task_instances SET subgroup = 'heat_pump'
  WHERE name IN ('Heat Pump Professional Tune-Up', 'Heat Pump Filter Replacement', 'Clear Heat Pump Outdoor Unit');
UPDATE public.task_instances SET subgroup = 'fireplace'
  WHERE name IN ('Annual Chimney Sweep', 'Inspect Fireplace Damper and Seals');
UPDATE public.task_instances SET subgroup = 'mini_split'
  WHERE name IN ('Clean Mini-Split Filters', 'Mini-Split Professional Deep Clean');

-- Plumbing sub-groups
UPDATE public.task_instances SET subgroup = 'water_heater'
  WHERE name IN ('Flush Water Heater', 'Test Water Heater Pressure Relief Valve', 'Verify Water Heater Temp Below 120°F');
UPDATE public.task_instances SET subgroup = 'pipes_drains'
  WHERE category = 'plumbing' AND name IN (
    'Preventive Drain Treatment', 'Check Water Pressure', 'Insulate Exposed Pipes',
    'Check Toilets for Leaks', 'Clean Faucet Aerators', 'Inspect Washing Machine Hoses', 'Test Water Quality'
  );
UPDATE public.task_instances SET subgroup = 'water_treatment'
  WHERE name IN ('Add Salt to Water Softener', 'Clean Water Softener Brine Tank', 'Replace Whole-House Water Filter');
UPDATE public.task_instances SET subgroup = 'well_septic'
  WHERE name IN ('Test Well Water Quality', 'Pump Septic Tank', 'Test Sump Pump');

-- Power sub-groups
UPDATE public.task_instances SET subgroup = 'electrical'
  WHERE name IN ('Test GFCI Outlets', 'Test Arc-Fault Breakers', 'Inspect Electrical Panel', 'Replace Surge Protectors');
UPDATE public.task_instances SET subgroup = 'generator'
  WHERE name IN ('Test Generator', 'Annual Generator Service');
UPDATE public.task_instances SET subgroup = 'solar'
  WHERE name IN ('Solar Panel Visual Inspection', 'Solar Panel Cleaning');

-- Exterior sub-groups
UPDATE public.task_instances SET subgroup = 'roof_gutters'
  WHERE name IN ('Clean Gutters and Downspouts', 'Inspect Roof', 'Check Flashing Around Penetrations',
    'Trim Branches Overhanging Roof', 'Inspect Attic for Leaks and Moisture');
UPDATE public.task_instances SET subgroup = 'walls_windows_foundation'
  WHERE category = 'exterior_structure' AND name IN (
    'Power Wash Siding', 'Check Grading Around Foundation', 'Inspect Foundation for Cracks',
    'Touch Up Exterior Paint', 'Seal Asphalt Driveway', 'Inspect and Re-Caulk Windows and Doors',
    'Inspect Weatherstripping', 'Check Weatherstripping', 'Lubricate Door Hinges and Locks',
    'Clean Window Weep Holes', 'Inspect and Repair Window Screens', 'Schedule Energy Audit'
  );
UPDATE public.task_instances SET subgroup = 'garage'
  WHERE name IN ('Lubricate Garage Door Tracks and Hardware', 'Test Garage Door Auto-Reverse Safety', 'Replace Garage Door Weather Seal');
UPDATE public.task_instances SET subgroup = 'pest_control'
  WHERE name IN ('Termite Inspection', 'Seal Entry Points Walkthrough', 'Mosquito Prevention — Standing Water Check');

-- Appliances (flat)
UPDATE public.task_instances SET subgroup = 'appliances'
  WHERE category = 'appliances';

-- Outdoors sub-groups
UPDATE public.task_instances SET subgroup = 'yard_structures'
  WHERE name IN ('Clean and Seal Deck', 'Inspect Fence Posts and Panels', 'Check Outdoor Lighting', 'Power Wash Driveway and Walkways');
UPDATE public.task_instances SET subgroup = 'irrigation'
  WHERE name IN ('Spring Irrigation System Startup', 'Winterize Irrigation System');
UPDATE public.task_instances SET subgroup = 'pool_hot_tub'
  WHERE category = 'outdoors_stuff' AND name IN (
    'Test Pool Chemical Balance', 'Clean Pool Filter', 'Open Pool for Season', 'Close Pool for Season',
    'Test Hot Tub Water Chemistry', 'Clean Hot Tub Filter', 'Drain and Refill Hot Tub',
    'Clean and Condition Hot Tub Cover', 'Clean Hot Tub Jets'
  );

-- ── 5. Remove deprecated tasks ──────────────────────────────────────────────

-- Soft-delete removed tasks (set is_active = false rather than deleting)
UPDATE public.task_instances SET is_active = false
  WHERE name IN (
    'Winter Storm Readiness Check',
    'Check Radon Levels',
    'Clean Pet Areas and Check Pet Door',
    'Spring Home Checkup',
    'Summer Home Checkup',
    'Fall Winterization Prep',
    'Fertilize Lawn',
    'Aerate Lawn',
    'Mulch Garden Beds',
    'Sharpen Mower Blades',
    'Trim Trees'
  );

-- Remove exact-duplicate weatherstripping (keep the one in Inspect Weatherstripping)
UPDATE public.task_instances SET is_active = false
  WHERE name = 'Check Weatherstripping'
    AND EXISTS (
      SELECT 1 FROM public.task_instances ti2
      WHERE ti2.name = 'Inspect Weatherstripping'
        AND ti2.home_id = public.task_instances.home_id
        AND ti2.is_active = true
    );

-- ── 6. Update modified frequencies ──────────────────────────────────────────

UPDATE public.task_instances SET frequency_value = 10, frequency_unit = 'years'
  WHERE name = 'Replace Fire Extinguishers';
UPDATE public.task_instances SET frequency_value = 3, frequency_unit = 'months'
  WHERE name = 'Test GFCI Outlets';
UPDATE public.task_instances SET frequency_value = 1, frequency_unit = 'years'
  WHERE name = 'Test Arc-Fault Breakers';
UPDATE public.task_instances SET frequency_value = 1, frequency_unit = 'years'
  WHERE name = 'Verify Water Heater Temp Below 120°F';
UPDATE public.task_instances SET frequency_value = 5, frequency_unit = 'years'
  WHERE name = 'Schedule Energy Audit';
UPDATE public.task_instances SET frequency_value = 2, frequency_unit = 'years'
  WHERE name = 'Test Radon Levels';
