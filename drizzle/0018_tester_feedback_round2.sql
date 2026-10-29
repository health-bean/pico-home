-- Tester feedback round 2 (agreed 2026-10-29).
-- 1. Task copy no longer quotes prices — they go stale. Instances snapshot
--    template copy, so existing rows are rewritten by name. Each UPDATE only
--    touches rows that still contain a "$<digit>" (or, for Clean Washing
--    Machine, rows not yet at the new copy), so re-runs are no-ops.
-- 2. "Inspect Washing Machine Door Seal" is folded into "Clean Washing
--    Machine". Existing door-seal tasks are dismissed (not deleted — deleting
--    would cascade their completion history); they show under Dismissed.
-- Generated from templates.ts. Idempotent — safe to re-run.

-- ── Washer door seal → dismissed ─────────────────────────────────────────
UPDATE task_instances SET
  is_active = false,
  dismissed_at = now(),
  updated_at = now()
WHERE name = 'Inspect Washing Machine Door Seal' AND is_custom = false
  AND is_active = true;

-- ── Copy without prices (and merged washer copy) ─────────────────────────
UPDATE task_instances SET
  description = 'Disconnect the dryer vent from the wall and clean the entire duct run from inside the house to the exterior vent hood. Remove all lint buildup.',
  tips = 'A dryer vent brush kit from a hardware store does the job. If your duct run is long or has many bends, hire a professional. Warning signs of a clogged vent: clothes take multiple cycles to dry, the top of the dryer is very hot, you smell burning. Replace flexible foil ducts with rigid or semi-rigid metal.',
  why_it_matters = 'Dryer fires cause 2,900 house fires and 5 deaths annually in the US. Lint buildup in the vent duct is the leading cause. This is one of the most important maintenance tasks you can do.',
  updated_at = now()
WHERE name = 'Clean Dryer Vent Duct' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Place a radon test kit in the lowest livable level of your home for the specified period (short-term: 2-7 days, long-term: 90+ days).',
  tips = 'Test in winter when windows are typically closed. Test kits are available from your state radon office (often free) or hardware stores. If results are 4 pCi/L or higher, have a radon mitigation system installed.',
  why_it_matters = 'Radon is the #2 cause of lung cancer after smoking. It''s a naturally occurring radioactive gas that seeps through foundation cracks. 1 in 15 US homes has elevated radon.',
  updated_at = now()
WHERE name = 'Test Radon Levels' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Hire a professional to clean your HVAC ductwork. This removes accumulated dust, pet dander, mold spores, and other debris.',
  tips = 'Get quotes from at least 3 companies. Be wary of bargain-priced whole-house deals — they''re often a bait-and-switch for upsells. Ask if they use negative pressure equipment. Check NADCA certification.',
  why_it_matters = 'Dirty ducts circulate dust, allergens, and potentially mold throughout your home. If anyone in your household has allergies or asthma, this is especially important.',
  updated_at = now()
WHERE name = 'Professional Duct Cleaning' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Release trapped air from your radiators to restore full heat output. Do this each fall before the heating season, starting with radiators farthest from the boiler.',
  tips = 'You''ll need a radiator bleed key (cheap at any hardware store). Insert it into the valve at the top end of the radiator and turn counterclockwise slowly until you hear air hissing out. Close it when water starts to trickle out. Start with the radiator farthest from the boiler and work your way toward it. After bleeding, check the boiler pressure gauge — you may need to top up the water pressure to 1-1.5 bar.',
  why_it_matters = 'Trapped air creates cold spots in radiators and forces your boiler to run longer to reach temperature, wasting fuel. Bleeding takes 30 minutes and costs nothing — ignoring it can add 10-15% to your heating bill.',
  updated_at = now()
WHERE name = 'Bleed Radiators' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Schedule a professional HVAC technician to inspect and tune up your air conditioning system before summer.',
  tips = 'Book in March or April. The technician should check refrigerant levels, clean the evaporator coil, and test the thermostat calibration.',
  why_it_matters = 'Low refrigerant or a dirty evaporator coil can increase cooling costs by 20-30% and lead to compressor failure — one of the most expensive repairs an AC can need.',
  updated_at = now()
WHERE name = 'Professional Cooling Tune-Up' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Flush the AC condensate drain line with a cup of distilled white vinegar or a commercial drain treatment to prevent clogs.',
  tips = 'The drain line is usually a PVC pipe near your indoor unit. Pour 1 cup of vinegar into the access point. If you see water stains on the ceiling below your unit, the drain may already be clogged.',
  why_it_matters = 'A clogged condensate drain is the #1 cause of water damage from HVAC systems. It can ruin ceilings, walls, and flooring — and the repairs are costly.',
  updated_at = now()
WHERE name = 'Clear Condensate Drain Line' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Shut down and winterize your evaporative cooler each fall to prevent freeze damage and protect the unit during the off-season.',
  tips = 'Turn off the water supply to the cooler and disconnect the water line. Drain the reservoir completely — standing water leads to mineral scale, algae, and freeze damage. Remove and discard the cooling pads (don''t reuse old pads next spring). Cover the unit with a weatherproof cover or use a winterizing panel to block the duct opening inside your home. This also prevents cold air infiltration through the duct all winter.',
  why_it_matters = 'Water left in the reservoir over winter freezes and can crack the pan, pump housing, or distribution lines. The duct cover is equally important: an open evaporative cooler duct loses as much heat as an open window.',
  updated_at = now()
WHERE name = 'Evaporative Cooler Fall Winterization' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Replace or clean the air filter in your heat pump system. Because heat pumps run year-round, filters get dirty faster than in systems that only run seasonally.',
  tips = 'Heat pumps run year-round in both heating and cooling modes, so filters clog twice as fast as a traditional furnace or AC. Check monthly and replace when visibly gray or dusty. MERV 8-11 is the sweet spot — high enough to catch allergens without restricting airflow.',
  why_it_matters = 'A clogged filter forces the heat pump to work harder, reduces heating and cooling efficiency by 5-15%, and can cause the unit to overheat or freeze up. Replacing a filter is far cheaper than a service call for a freeze-up.',
  updated_at = now()
WHERE name = 'Heat Pump Filter Replacement' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Hire a CSIA-certified chimney sweep to inspect and clean your chimney before fireplace season. Schedule in August or September before the fall rush.',
  tips = 'Look for the CSIA (Chimney Safety Institute of America) certification. The sweep should provide a written report. If they find a Level 2 inspection is needed (often required after a chimney fire or when buying a home), that includes a camera inspection at extra cost. Install a chimney cap if you don''t have one to keep animals and rain out.',
  why_it_matters = 'Creosote — the tar-like residue from burning wood — is the #1 cause of chimney fires. A single chimney fire can reach 2,000°F and damage or destroy your home. The NFPA recommends annual inspection for any chimney used regularly.',
  updated_at = now()
WHERE name = 'Annual Chimney Sweep' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Test that your fireplace damper opens and closes fully, and check the damper seal for gaps that let conditioned air escape year-round.',
  tips = 'With the fireplace cold, open and close the damper — it should move freely and close completely. Hold a lit incense stick or piece of tissue near the firebox when the damper is closed; if it flickers, you have air leaking around the damper. An inflatable fireplace plug (chimney balloon) is an easy fix if you rarely use the fireplace.',
  why_it_matters = 'An open or poorly sealed fireplace damper is like leaving a window open all year. The US Department of Energy notes an open damper noticeably raises heating and cooling costs by letting conditioned air escape up the chimney.',
  updated_at = now()
WHERE name = 'Inspect Fireplace Damper and Seals' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Drain and flush your water heater tank to remove sediment buildup from the bottom of the tank.',
  tips = 'Attach a garden hose to the drain valve at the bottom of the tank and run it outside or to a floor drain. Turn off the gas/power first. Let the water run until it''s clear. If sediment is caked, you may need to partially fill and drain several times.',
  why_it_matters = 'Sediment insulates the bottom of the tank from the burner, making it work harder and eventually causing premature tank failure — and replacing a water heater is a big expense.',
  updated_at = now()
WHERE name = 'Flush Water Heater' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Lift and release the TPR (temperature-pressure relief) valve lever to verify it opens and closes properly.',
  tips = 'Place a bucket under the discharge pipe first. Lift the lever briefly — you should hear water flow. If it doesn''t release water, or continues dripping after you release, the valve needs replacement — an inexpensive part that''s an easy DIY job, or a short visit for a plumber.',
  why_it_matters = 'The TPR valve is a critical safety device. If it fails and pressure builds up in the tank, the water heater can literally explode. This is not theoretical — it happens.',
  updated_at = now()
WHERE name = 'Test Water Heater Pressure Relief Valve' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Pour a bacterial enzyme drain treatment down each drain (kitchen, bathroom sinks, showers) to break down organic buildup.',
  tips = 'Use enzyme-based treatments (Bio-Clean, Green Gobbler), not chemical drain cleaners like Drano — those corrode pipes. Pour it before bed so it can sit overnight. Also pull out pop-up stoppers and remove hair/soap buildup.',
  why_it_matters = 'Preventive treatment is much cheaper than an emergency drain-clearing visit. Recurring clogs can also indicate deeper sewer line issues.',
  updated_at = now()
WHERE name = 'Preventive Drain Treatment' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Use a pressure gauge on an outdoor spigot to test your home''s water pressure. Ideal range is 40-60 PSI.',
  tips = 'A pressure gauge is inexpensive at any hardware store and screws onto any hose bib. If pressure exceeds 80 PSI, you need a pressure reducing valve. If it''s below 40 PSI, check for leaks or contact your water utility.',
  why_it_matters = 'High water pressure (above 80 PSI) stresses pipes, fittings, and appliance connections, leading to leaks and premature failure. It also wastes water and energy.',
  updated_at = now()
WHERE name = 'Check Water Pressure' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Check that exposed water pipes in the attic, crawlspace, garage, and exterior walls are properly insulated with foam sleeves.',
  tips = 'Foam pipe insulation is cheap and just slips on. Pay special attention to pipes near exterior walls, in the attic, and in the garage. On extremely cold nights, also let faucets drip slightly.',
  why_it_matters = 'A single burst pipe can cause tens of thousands of dollars in water damage. Pipe insulation is one of the cheapest and most effective home protections you can add.',
  updated_at = now()
WHERE name = 'Insulate Exposed Pipes' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Add a few drops of food coloring to each toilet tank. Wait 15 minutes without flushing. If color appears in the bowl, the flapper is leaking.',
  tips = 'A leaking flapper wastes 200+ gallons of water per day. Replacement flappers are cheap at any hardware store and take 5 minutes to install. Also check for water around the base — this indicates a failed wax ring.',
  why_it_matters = 'A silent toilet leak can waste 6,000+ gallons per month, noticeably raising your water bill. A failed wax ring can rot your subfloor — a much more expensive repair.',
  updated_at = now()
WHERE name = 'Check Toilets for Leaks' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Unscrew the aerator from each faucet, soak in vinegar to dissolve mineral buildup, scrub with a toothbrush, and reinstall.',
  tips = 'Use pliers with a cloth to avoid scratching the finish. If the aerator is stuck, wrap it in a vinegar-soaked rag for 30 minutes first. If the screen is damaged, replacements are cheap at any hardware store.',
  why_it_matters = 'Clogged aerators reduce water pressure and can cause faucets to spray erratically. They also harbor bacteria if mineral deposits build up.',
  updated_at = now()
WHERE name = 'Clean Faucet Aerators' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Schedule a professional septic tank pumping service to remove accumulated solids.',
  tips = 'Know where your tank lid is and keep it accessible. Frequency depends on household size — a family of 4 may need pumping every 2-3 years, a couple every 4-5. Keep a record of pumping dates and condition reports.',
  why_it_matters = 'An overflowing septic tank can back up into your home or contaminate groundwater. Replacing a septic system is one of the most expensive repairs a home can need. Regular pumping extends the drain field life by decades.',
  updated_at = now()
WHERE name = 'Pump Septic Tank' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Pour a bucket of water into the sump pit to verify the pump activates, pumps the water out, and shuts off properly.',
  tips = 'Test before the rainy season. Check that the discharge pipe exits away from your foundation. Consider a battery backup sump pump — power outages often coincide with storms. Also check the check valve to ensure water doesn''t flow back.',
  why_it_matters = 'If your sump pump fails during heavy rain, your basement can flood within hours. A basement flood often means tens of thousands of dollars in damage and remediation.',
  updated_at = now()
WHERE name = 'Test Sump Pump' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Press the TEST button on each GFCI outlet, verify power cuts off, then press RESET. Check kitchens, bathrooms, garages, outdoor, and laundry areas.',
  tips = 'GFCI outlets protect against electrocution near water. If a GFCI won''t trip or reset, it needs replacement immediately — it''s an inexpensive part and a straightforward job for someone comfortable with electrical work, or a quick visit for an electrician.',
  why_it_matters = 'GFCI outlets prevent electrocution deaths. The CPSC estimates they prevent 70% of residential electrocution fatalities. A non-functional GFCI provides zero protection.',
  updated_at = now()
WHERE name = 'Test GFCI Outlets' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Replace power strip surge protectors that are more than 2-3 years old. Surge protectors degrade with each power surge.',
  tips = 'Check if the protection indicator light is still on. Many surge protectors continue to function as power strips after protection has worn out, giving a false sense of security. Consider whole-house surge protection for comprehensive coverage.',
  why_it_matters = 'After absorbing multiple surges, protectors stop protecting — but still deliver power. One lightning strike or power grid surge can fry thousands of dollars in electronics and appliances.',
  updated_at = now()
WHERE name = 'Replace Surge Protectors' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Clean your solar panels to remove dust, bird droppings, pollen, and grime that reduce power output. Do this in April and October for best results.',
  tips = 'If you can safely access your roof, use a soft brush and squeegee with plain water — no soap or abrasive cleaners, which can leave residue or scratch the anti-reflective coating. Clean early morning or evening when panels are cool; water on hot panels can cause thermal shock. If your roof pitch or height makes access unsafe, hire a solar cleaning service. Don''t pressure wash.',
  why_it_matters = 'Studies show a layer of dust and grime can reduce solar panel output by 5-25% depending on your climate. In dry, dusty areas (Southwest US, for example), dirty panels are one of the biggest causes of underperformance. Spring cleaning removes winter grime before peak solar months.',
  updated_at = now()
WHERE name = 'Solar Panel Cleaning' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'During a heavy rain, watch your gutters and downspouts: look for water spilling over the edge, running behind the gutter, or downspouts that barely flow. If you see any of that — or it''s spring or fall and leaves have come down — clean them: scoop out debris and flush the downspouts with a hose.',
  tips = 'Use a gutter scoop and garden hose. Check that downspouts discharge at least 4-6 feet from the foundation. Consider gutter guards if you have many trees — they reduce but don''t eliminate cleaning.',
  why_it_matters = 'Clogged gutters cause water to overflow against the foundation, leading to basement flooding, foundation damage, and fascia rot. Ice dams in winter can damage roofing and cause interior leaks.',
  updated_at = now()
WHERE name = 'Check Gutters (Clean If Needed)' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Visually inspect the roof from the ground with binoculars or from a ladder. Look for missing, cracked, or curling shingles, damaged flashing, and sagging.',
  tips = 'Use binoculars from the ground for safety. Also check after major storms. Look for dark streaks (algae), granules in gutters (shingle wear), and any moss growth. A professional inspection is worth it every few years or before warranty claims.',
  why_it_matters = 'A small roof leak can cause thousands in hidden damage to insulation, framing, drywall, and can lead to mold growth. Catching problems early means a small repair instead of a full roof replacement.',
  updated_at = now()
WHERE name = 'Inspect Roof' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Inspect flashing around the chimney, vent pipes, skylights, and where the roof meets walls. Look for gaps, rust, or lifting.',
  tips = 'Most roof leaks originate at flashing points, not the field of shingles. If you see caulk that''s cracked or peeling, it needs to be redone. Flashing repairs are much cheaper than water damage repairs.',
  why_it_matters = 'Flashing is the most vulnerable point on any roof. Failed flashing accounts for the majority of roof leaks and the water damage that follows.',
  updated_at = now()
WHERE name = 'Check Flashing Around Penetrations' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Cut back tree branches that hang over or touch the roof. Maintain at least 10 feet of clearance.',
  tips = 'Branches touching the roof abrade shingles and provide a highway for pests. Large branches near the house are a risk in storms. For large trees or branches near power lines, hire a certified arborist.',
  why_it_matters = 'Falling branches during storms are a major cause of roof damage and insurance claims. Overhanging branches also drop debris that clogs gutters and promotes moss growth.',
  updated_at = now()
WHERE name = 'Trim Branches Overhanging Roof' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Walk the perimeter and inspect visible foundation walls for new cracks, shifting, or water stains. Check interior basement walls too.',
  tips = 'Hairline cracks are normal. Horizontal cracks, stair-step cracks in block, or cracks wider than 1/4 inch need professional evaluation. Take photos and monitor — if cracks are growing, act quickly. Seal small cracks with hydraulic cement.',
  why_it_matters = 'Foundation issues are among the most expensive home repairs. Catching them early when they''re small cracks can save tens of thousands versus waiting until walls are bowing.',
  updated_at = now()
WHERE name = 'Inspect Foundation for Cracks' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Inspect exterior painted surfaces for peeling, cracking, or bare wood. Sand, prime, and repaint affected areas.',
  tips = 'Keep a record of your paint colors and brands. Focus on south and west-facing surfaces which get the most sun damage. Always prime bare wood before painting. Don''t paint in direct sunlight or below 50°F.',
  why_it_matters = 'Paint is your home''s first defense against moisture. Exposed wood absorbs water and rots quickly. Touching up annually prevents the need for a full exterior repaint.',
  updated_at = now()
WHERE name = 'Touch Up Exterior Paint' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Apply sealcoat to your asphalt driveway after cleaning and filling any cracks.',
  tips = 'Fill cracks with crack filler before sealing. Apply on a warm day (50°F+) with no rain expected for 24 hours. Two thin coats are better than one thick coat. A DIY 5-gallon bucket covers about 400 sq ft — far cheaper than hiring it out.',
  why_it_matters = 'Water seeps into asphalt cracks, freezes, and expands — turning small cracks into potholes. A full driveway replacement is expensive. Sealcoating every 2-3 years can double the driveway''s lifespan.',
  updated_at = now()
WHERE name = 'Seal Asphalt Driveway' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Check all exterior caulking around windows, doors, and trim. Remove cracked or peeling caulk and apply fresh exterior-grade caulk.',
  tips = 'Use silicone or polyurethane caulk for exterior — it stays flexible. Don''t caulk the bottom of window frames — that''s a weep channel for moisture escape. Apply on a dry day above 40°F. A caulk gun and a tube of caulk are all you need.',
  why_it_matters = 'Failed caulk lets water behind siding and into wall cavities, causing rot, mold, and insulation damage that''s expensive to repair and invisible until advanced.',
  updated_at = now()
WHERE name = 'Inspect and Re-Caulk Windows and Doors' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Locate and clear the small weep holes at the bottom of window frames. Use a toothpick or compressed air to remove debris.',
  tips = 'Weep holes are small slots or holes on the outside bottom of window frames — they let trapped water drain out. Don''t seal them. If you can''t find them, check your window manufacturer''s documentation.',
  why_it_matters = 'Blocked weep holes trap water inside the window frame, leading to wood rot, mold growth, and eventual window failure. Replacing windows is expensive.',
  updated_at = now()
WHERE name = 'Clean Window Weep Holes' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Check all window and door screens for holes, tears, or damaged frames. Repair or replace as needed.',
  tips = 'Small holes can be patched with inexpensive screen repair patches. For larger tears, re-screening a frame takes cheap materials and about 20 minutes with a spline roller. Many hardware stores will re-screen for you.',
  why_it_matters = 'Damaged screens let in mosquitoes, flies, and other pests. They also reduce your home''s curb appeal and can affect resale value.',
  updated_at = now()
WHERE name = 'Inspect and Repair Window Screens' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Apply lithium or silicone lubricant to garage door tracks, rollers, hinges, and springs. Also lubricate the opener chain or screw drive.',
  tips = 'Use white lithium grease or silicone spray — NOT WD-40 (it''s a solvent, not a lubricant). Spray the roller stems, hinge pivot points, and spring coils. Wipe excess from the tracks. NEVER attempt to adjust or replace the torsion springs yourself — they''re under extreme tension and can kill.',
  why_it_matters = 'A well-lubricated garage door operates quieter, puts less strain on the opener motor, and prevents premature wear on expensive components like springs, which need a professional to replace.',
  updated_at = now()
WHERE name = 'Lubricate Garage Door Tracks and Hardware' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Schedule a professional termite inspection. Inspector will check for signs of termites, carpenter ants, and wood-destroying organisms.',
  tips = 'Many pest companies offer free inspections hoping to sell treatment. Get at least 2 opinions before committing to treatment. Look for mud tubes on foundations yourself — pencil-width tubes running from soil up the foundation wall. Termite damage is often NOT covered by homeowner''s insurance.',
  why_it_matters = 'Termites cause billions of dollars in property damage in the US every year. An active colony can eat a linear foot of 2x4 in about 5 months. Damage is often hidden inside walls and undetected for years.',
  updated_at = now()
WHERE name = 'Termite Inspection' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Run a hot cleaning cycle with washing machine cleaner or 2 cups of white vinegar. Wipe down the detergent dispenser and drum. On front-loaders, pull back the rubber door gasket, wipe out trapped water, debris and small items, and check it for mold, tears or other damage.',
  tips = 'Front-loaders are especially prone to mold and mildew. Always leave the door ajar after use to let it dry. Clean mold on the gasket with equal parts water and vinegar or a dilute bleach solution. Socks and baby clothes often get trapped behind it. If the gasket is torn or no longer seals, replace it — a damaged seal leaks onto your floor. Don''t use too much detergent — it causes buildup.',
  why_it_matters = 'Mold and mildew in washing machines transfer to your clothes, causing musty odors. In front-loaders, mold behind the gasket can become a health concern.',
  updated_at = now()
WHERE name = 'Clean Washing Machine' AND is_custom = false
  AND description IS DISTINCT FROM 'Run a hot cleaning cycle with washing machine cleaner or 2 cups of white vinegar. Wipe down the detergent dispenser and drum. On front-loaders, pull back the rubber door gasket, wipe out trapped water, debris and small items, and check it for mold, tears or other damage.';

UPDATE task_instances SET
  description = 'Vacuum or brush the condenser coils on the back or bottom of your refrigerator to remove dust buildup.',
  tips = 'Unplug the fridge first. Coils are usually behind a removable panel on the bottom front or on the back. Use a coil cleaning brush or vacuum with a crevice attachment. If you have pets, do this every 3 months — pet hair clogs coils fast.',
  why_it_matters = 'Dusty coils make the compressor work up to 25% harder, shortening its life and raising energy costs. The compressor is the most expensive part to replace.',
  updated_at = now()
WHERE name = 'Clean Refrigerator Condenser Coils' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Remove the lint trap and vacuum deep into the lint trap housing. Also clean under and behind the dryer.',
  tips = 'Use a long, narrow vacuum attachment or a dryer lint brush to reach deep into the housing. If your lint screen has fabric softener residue (run water over it — if water pools, it has residue), scrub with hot soapy water and a brush.',
  why_it_matters = 'Lint that bypasses the trap accumulates in the housing and around the heating element — a direct fire hazard. This supplements but doesn''t replace annual vent duct cleaning.',
  updated_at = now()
WHERE name = 'Deep Clean Dryer Lint Trap Area' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Inspect the rubber gaskets around fridge and freezer doors for cracks, tears, or gaps. Clean with warm soapy water.',
  tips = 'Close the door on a dollar bill — if it slides out easily, the seal is worn. Clean sticky or dirty seals with warm water and baking soda. Apply a thin layer of petroleum jelly to keep seals supple. Worn gaskets can be replaced — order one by your fridge''s model number.',
  why_it_matters = 'A leaking door seal forces the compressor to run constantly, dramatically increasing energy costs and wearing out the compressor faster.',
  updated_at = now()
WHERE name = 'Check Refrigerator Door Seals' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Scrub the deck with a deck cleaner and a stiff brush and rinse with a garden hose. Then do the water test: if water beads up, you''re done this year. If it soaks in, let the deck dry 24–48 hours and apply sealant or stain.',
  tips = 'Composite and PVC decks never need sealing — just the cleaning. When you do seal, apply on a cloudy day to avoid lap marks. If you use a pressure washer: lowest setting, wide fan tip, keep it moving along the grain, and stay a foot or more back — too close gouges the wood.',
  why_it_matters = 'Unsealed wood decks absorb water, leading to rot, warping, and structural failure. Replacing a deck is a major expense. Sealing whenever the water test says it''s time preserves both safety and value.',
  updated_at = now()
WHERE name = 'Clean Deck (Seal If Needed)' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Walk your fence line and check posts for rot (push on them), panels for damage, and gates for proper operation.',
  tips = 'Wood posts rot at ground level first — poke with a screwdriver to check for soft spots. Replace any rotten posts before the fence leans. Tighten loose hardware on gates. Clear soil and debris away from the bottom of fence panels.',
  why_it_matters = 'One rotted post can cause an entire fence section to collapse, especially in wind. Catching rot early means replacing one post instead of rebuilding a whole section.',
  updated_at = now()
WHERE name = 'Inspect Fence Posts and Panels' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Gradually open the main valve, pressurize the system slowly, and run each zone to check for broken heads, leaks, and coverage issues.',
  tips = 'Open the main valve SLOWLY (quarter-turn at a time over 10 minutes) to avoid water hammer that can crack pipes. Walk each zone while it runs — look for geysers (broken heads), sunken heads, and dry spots. Adjust heads for coverage. Replace broken heads — they''re cheap and easy to swap.',
  why_it_matters = 'Freeze damage from winter can crack pipes and heads. Discovering this early prevents water waste, landscape damage, and high water bills from undetected leaks.',
  updated_at = now()
WHERE name = 'Spring Irrigation System Startup' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Blow out all irrigation lines with compressed air to prevent freeze damage. Shut off the irrigation water supply.',
  tips = 'You need an air compressor with at least 80 PSI and adequate CFM. Don''t exceed 50 PSI for PVC systems or 80 PSI for polyethylene. Blow out each zone twice. Many irrigation companies offer winterization — worth it if you''re not comfortable with compressors.',
  why_it_matters = 'Water left in irrigation lines freezes and expands, cracking pipes and fittings. The repairs are costly in spring, and you''ll have no irrigation until it''s fixed.',
  updated_at = now()
WHERE name = 'Winterize Irrigation System' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Remove the cover, reconnect equipment, fill to proper level, balance chemicals, clean surfaces, and run the pump.',
  tips = 'Open when water temperature consistently stays above 60°F. Remove, clean, and properly store the cover. Inspect all equipment before turning on. Prime the pump before starting. Shock the pool with high chlorine. Run the pump 24 hours initially.',
  why_it_matters = 'Proper opening prevents equipment damage and gets the water chemistry right from the start, avoiding weeks of fighting algae and cloudy water.',
  updated_at = now()
WHERE name = 'Open Pool for Season' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Balance chemistry, lower water level, blow out plumbing lines, add winterizing chemicals, install the cover.',
  tips = 'Balance chemistry before closing — it''s much harder to fix in spring if wrong. Lower water below skimmer level. Blow out all plumbing lines with a shop vac or compressor and plug them. Remove and store pump drain plugs. Use a quality winter cover with a tight fit.',
  why_it_matters = 'Water left in plumbing lines freezes and cracks pipes and fittings — and the repairs are costly. Improper closing also leads to staining and an expensive, difficult opening in spring.',
  updated_at = now()
WHERE name = 'Close Pool for Season' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Wipe down the cover with mild soap, rinse, and apply a UV protectant. Check for waterlogging and damage.',
  tips = 'A waterlogged cover gets extremely heavy and loses insulating ability. If the cover is noticeably heavier than when new, the foam cores are saturated and the cover needs replacement. UV protectant extends cover life significantly.',
  why_it_matters = 'The cover is the tub''s primary insulator — a damaged cover can double heating costs. It also keeps debris and contaminants out of the water.',
  updated_at = now()
WHERE name = 'Clean and Condition Hot Tub Cover' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

UPDATE task_instances SET
  description = 'Remove jet inserts if possible and soak in white vinegar. For non-removable jets, run a jet cleaning cycle with a plumbing flush product.',
  tips = 'Do this right before a drain-and-refill so the loosened biofilm gets drained away. If jets aren''t spinning freely, they may need individual replacement.',
  why_it_matters = 'Biofilm — a slimy bacterial coating — builds up inside jet plumbing and is a major source of water contamination and odors in hot tubs.',
  updated_at = now()
WHERE name = 'Clean Hot Tub Jets' AND is_custom = false
  AND (description ~ '\$[0-9]' OR tips ~ '\$[0-9]' OR why_it_matters ~ '\$[0-9]');

