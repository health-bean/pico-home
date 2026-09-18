# Tester feedback — task content changes (agreed 2026-09-18)

Source: external tester's "PICO home edits" notes, reviewed item by item with Dee.
Grouping-by-appliance and the fridge water-filter dispenser gate shipped earlier
(steps 1–2); this spec covers the remaining content.

## Cross-cutting decisions

- **Existing homes get the changes.** Renamed/rewritten tasks are updated in
  place by name; new tasks are inserted into every existing home that
  qualifies (incl. the tester's). Nothing is deleted: completion history, due
  dates and dismissed tasks are untouched; dismissed tasks are not revived.
  Frequency changes only apply where the user hasn't edited the frequency.
- **Climate gating.** Use the home's saved climate zone (IECC, derived from
  state). Cold-weather tasks go to zone 4 and colder.

## Items

1. **Driveway** — "Power Wash Driveway and Walkways" → **Wash Driveway and
   Walkways** (yearly): push broom + concrete/paver cleaner, hose rinse. Tips:
   degreaser on oil stains; re-sand paver joints.
2. **Siding** — "Power Wash Siding" → **Wash Siding** (yearly), tester's
   method: soft/flexible brush, cladding-appropriate siding wash, low-pressure
   rinse at an angle, never pointed at the siding. Harm-reduction line for
   people who pressure-wash anyway (maker's guidance/warranty, lowest setting,
   widest tip, downward angle, never at seams/windows/vents/laps).
3. **Deck** — "Clean and Seal Deck" → **Clean Deck (Seal If Needed)**
   (yearly): scrub + rinse, water-bead test decides sealing; composite/PVC
   never need sealing; same pressure-washer harm-reduction line.
4. **Gutters** — "Clean Gutters and Downspouts" (6 mo) → **Check Gutters
   (Clean If Needed)** every 3 months: watch them in a heavy rain; clean if
   overflowing/behind-gutter/weak downspouts, or in spring/fall.
5. **Ice dams (new)** — **Check for Ice Dams**, yearly, first due mid-January,
   roofing homes in climate zone 4+. Tip: check after every heavy snow; never
   chip ice; roof rake from the ground; repeat dams → attic heat loss.
6. **Heat pump** — "Heat Pump Professional Tune-Up" (6 mo) → **Professional
   Heat Pump Cleaning**, yearly (indoor coil/blower/drain pan + outdoor coil).
   Tip: while there, ask them to glance at refrigerant/defrost; otherwise
   service only when something's off.
7. **Ducts** — "Professional Duct Cleaning" and "Inspect Ductwork for Leaks"
   go to any ducted system: furnace, central AC, heat pump, evaporative cooler
   (not boiler, not mini-split).
8. **Freestanding units** — new onboarding/Property options "Portable air
   purifier(s)" (new appliance type `air_purifier`) and "Portable
   dehumidifier(s)". Tasks: **Clean Air Purifier Pre-Filters** (monthly),
   **Replace Air Purifier Filters** (6 months, editable), **Clean Dehumidifier
   Filters** (2 months, incl. wiping the bucket).
   Air Quality & Health gets sub-headings: Air Purifiers, Dehumidifiers,
   Mold & Moisture, Radon.
9. **Drain treatment** — one task; stays every 3 months under Plumbing, monthly
   for mold-sensitive homes. *Tester's method pending — revisit copy.*
10. **Mold sensitivity** — new household option ("Extra checks for moisture,
    mold and drains"): adds Inspect for Mold Growth (3 mo) and Check Indoor
    Humidity (monthly); drain treatment monthly; duct cleaning every 2 years.

## Behaviour fixes agreed alongside

- Ticking a household option in Settings **adds** its tasks (today it only
  re-times existing ones).
- Changing household options never overwrites a frequency the user edited:
  only tasks still at the frequency the old options produced are re-timed.
