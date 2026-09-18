import { describe, it, expect } from "vitest";
import { TASK_TEMPLATES } from "./templates";
import { getApplicableTemplates, adjustFrequencyForHealth } from "./scheduling";
import type { SystemType, ApplianceCategory } from "./templates";

// Agreed 2026-09-18 — docs/superpowers/specs/2026-09-18-tester-feedback-content-design.md
const byId = (id: string) => {
  const t = TASK_TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`missing template ${id}`);
  return t;
};
const text = (id: string) => {
  const t = byId(id);
  return `${t.name} ${t.description} ${t.tips ?? ""} ${t.whyItMatters ?? ""}`;
};
const ids = (ts: { id: string }[]) => ts.map((t) => t.id);

const house = (systems: SystemType[], appliances: ApplianceCategory[] = [], climateZone?: string) => ({
  type: "single_family" as const,
  systems,
  appliances,
  climateZone,
});

describe("no power washing as the recommended method", () => {
  it("no task is named or described as power washing", () => {
    for (const t of TASK_TEMPLATES) {
      expect(`${t.name} ${t.description}`, t.name).not.toMatch(/power.?wash|pressure.?wash/i);
    }
  });

  it("siding is washed by brush and rinsed at an angle, never pointed straight at it", () => {
    const s = text("exterior-wash-siding");
    expect(byId("exterior-wash-siding").name).toBe("Wash Siding");
    expect(s).toMatch(/brush/i);
    expect(s).toMatch(/angle/i);
    expect(s).not.toMatch(/\d[,\d]*\s*PSI/i); // no PSI instructions
  });

  it("driveway and deck tasks say wash/scrub, and deck sealing is conditional", () => {
    expect(byId("exterior-wash-hardscape").name).toBe("Wash Driveway and Walkways");
    expect(byId("exterior-clean-deck").name).toBe("Clean Deck (Seal If Needed)");
    expect(text("exterior-clean-deck")).toMatch(/composite/i);
  });

  it("deck cleaning stays yearly for every household — twice a year is more than anyone does", () => {
    const d = byId("exterior-clean-deck");
    const allFlags = { hasAllergies: true, hasImmunocompromised: true, moldSensitive: true, prioritizeAirQuality: true };
    expect(adjustFrequencyForHealth(d.frequencyValue, d.frequencyUnit, d.healthMultipliers, allFlags)).toEqual({
      frequencyValue: 1,
      frequencyUnit: "years",
    });
  });
});

describe("gutters and ice dams", () => {
  it("gutters are checked (cleaned if needed) every 3 months", () => {
    const g = byId("roof-check-gutters");
    expect(g.name).toBe("Check Gutters (Clean If Needed)");
    expect([g.frequencyValue, g.frequencyUnit]).toEqual([3, "months"]);
    expect(text("roof-check-gutters")).toMatch(/rain/i);
  });

  it("ice dam check goes to roofed homes in climate zone 4 and colder", () => {
    for (const zone of ["4A", "5A", "6A", "7"]) {
      expect(ids(getApplicableTemplates(house(["roofing"], [], zone))), zone).toContain("roof-check-ice-dams");
    }
    for (const zone of ["1A", "2A", "2B", "3A", "3B"]) {
      expect(ids(getApplicableTemplates(house(["roofing"], [], zone))), zone).not.toContain("roof-check-ice-dams");
    }
  });

  it("ice dam check is due in January", () => {
    expect(byId("roof-check-ice-dams").seasonalMonths).toEqual([1]);
  });
});

describe("heat pump and ducts", () => {
  it("heat pump gets a yearly professional cleaning, not a tune-up", () => {
    const hp = TASK_TEMPLATES.filter((t) => t.subgroup === "heat_pump");
    expect(hp.map((t) => t.name).join(" ")).not.toMatch(/tune.?up/i);
    const c = byId("heat-pump-professional-cleaning");
    expect([c.frequencyValue, c.frequencyUnit]).toEqual([1, "years"]);
  });

  it("duct tasks go to every ducted system and not to boilers or mini-splits", () => {
    for (const id of ["hvac-duct-cleaning", "hvac-inspect-ductwork"]) {
      for (const a of ["furnace", "ac_unit", "heat_pump", "evap_cooler"] as const) {
        expect(ids(getApplicableTemplates(house(["hvac"], [a]))), `${id} ${a}`).toContain(id);
      }
      for (const a of ["boiler", "mini_split"] as const) {
        expect(ids(getApplicableTemplates(house(["hvac"], [a]))), `${id} ${a}`).not.toContain(id);
      }
    }
  });
});

describe("freestanding air purifiers and dehumidifiers", () => {
  it("air purifier owners get monthly pre-filter cleaning and 6-monthly replacement", () => {
    const got = ids(getApplicableTemplates(house([], ["air_purifier"])));
    expect(got).toContain("air-purifier-clean-prefilter");
    expect(got).toContain("air-purifier-replace-filter");
    expect(byId("air-purifier-clean-prefilter").frequencyUnit).toBe("months");
    expect(byId("air-purifier-clean-prefilter").frequencyValue).toBe(1);
    expect([byId("air-purifier-replace-filter").frequencyValue, byId("air-purifier-replace-filter").frequencyUnit]).toEqual([6, "months"]);
  });

  it("dehumidifier owners clean the filter every 2 months", () => {
    const d = byId("dehumidifier-clean-filter");
    expect(ids(getApplicableTemplates(house([], ["dehumidifier"])))).toContain(d.id);
    expect([d.frequencyValue, d.frequencyUnit]).toEqual([2, "months"]);
  });

  it("nobody without the unit gets its tasks", () => {
    const got = ids(getApplicableTemplates(house(["hvac", "plumbing"], ["refrigerator"])));
    expect(got).not.toContain("air-purifier-clean-prefilter");
    expect(got).not.toContain("dehumidifier-clean-filter");
  });

  it("air quality tasks are grouped under purifiers, dehumidifiers, mold & moisture, radon", () => {
    const allowed = ["air_purifier", "dehumidifier", "mold_moisture", "radon"];
    for (const t of TASK_TEMPLATES.filter((t) => t.category === "air_quality")) {
      expect(allowed, t.name).toContain(t.subgroup);
    }
  });
});

describe("mold sensitivity", () => {
  const moldy = { moldSensitive: true };

  it("adds mold inspection and humidity checks", () => {
    const got = ids(getApplicableTemplates(house(["plumbing"]), moldy));
    expect(got).toContain("health-inspect-mold");
    expect(got).toContain("health-check-humidity");
  });

  it("makes drain treatment monthly (3-monthly otherwise)", () => {
    const d = byId("plumbing-drain-treatment");
    expect([d.frequencyValue, d.frequencyUnit]).toEqual([3, "months"]);
    expect(adjustFrequencyForHealth(d.frequencyValue, d.frequencyUnit, d.healthMultipliers, moldy)).toEqual({
      frequencyValue: 1,
      frequencyUnit: "months",
    });
  });

  it("makes duct cleaning every 2 years (4 otherwise)", () => {
    const d = byId("hvac-duct-cleaning");
    expect(adjustFrequencyForHealth(d.frequencyValue, d.frequencyUnit, d.healthMultipliers, moldy)).toEqual({
      frequencyValue: 2,
      frequencyUnit: "years",
    });
  });
});
