"use client";

import React from "react";
import {
  Check,
  Loader2,
} from "lucide-react";
import type {
  SystemType,
  ApplianceCategory,
} from "@/lib/tasks/templates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HomeItem {
  key: string;
  label: string;
  icon: string;
  type: "system" | "appliance";
  mappedSystem?: SystemType;
  mappedAppliance?: ApplianceCategory;
  subtypes?: { value: string; label: string }[];
}

export interface HomeItemGroup {
  label: string;
  items: HomeItem[];
}

export interface FormData {
  name: string;
  type: string;
  yearBuilt: string;
  sqft: string;
  zip: string;
  state: string;
  selectedItems: Record<string, { enabled: boolean; subtypes: string[] }>;
  healthFlags: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const HOME_TYPES = [
  { value: "single_family", label: "House", icon: "\u{1F3E1}", desc: "Detached home" },
  { value: "townhouse", label: "Townhouse", icon: "\u{1F3D8}\uFE0F", desc: "Row or attached" },
  { value: "condo", label: "Condo", icon: "\u{1F3E2}", desc: "Unit in a building" },
];


export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

export const CLIMATE_ZONES: Record<string, string> = {
  AL: "3A", AK: "7", AZ: "2B", AR: "3A", CA: "3B", CO: "5B",
  CT: "5A", DE: "4A", FL: "2A", GA: "3A", HI: "1A", ID: "5B",
  IL: "5A", IN: "5A", IA: "5A", KS: "4A", KY: "4A", LA: "2A",
  ME: "6A", MD: "4A", MA: "5A", MI: "5A", MN: "6A", MS: "3A",
  MO: "4A", MT: "6B", NE: "5A", NV: "3B", NH: "6A", NJ: "4A",
  NM: "4B", NY: "5A", NC: "4A", ND: "6A", OH: "5A", OK: "3A",
  OR: "4C", PA: "5A", RI: "5A", SC: "3A", SD: "6A", TN: "4A",
  TX: "2A", UT: "5B", VT: "6A", VA: "4A", WA: "4C", WV: "4A",
  WI: "6A", WY: "6B", DC: "4A",
};

const CLIMATE_ZONE_LABELS: Record<string, string> = {
  "1A": "Hot-Humid", "2A": "Hot-Humid", "2B": "Hot-Dry",
  "3A": "Mixed-Humid", "3B": "Hot-Dry / Marine", "4A": "Mixed-Humid",
  "4B": "Mixed-Dry", "4C": "Marine", "5A": "Cold",
  "5B": "Cold / Dry", "6A": "Cold", "6B": "Cold / Dry",
  "7": "Subarctic",
};

export function climateZoneLabel(state: string): string {
  const code = CLIMATE_ZONES[state];
  if (!code) return "";
  const label = CLIMATE_ZONE_LABELS[code] || "";
  return label ? `${label} (Zone ${code})` : `Zone ${code}`;
}

export const MAJOR_SYSTEMS: HomeItemGroup[] = [
  {
    label: "Heating",
    items: [
      { key: "furnace", label: "Furnace (heat only)", icon: "\u{1F525}", type: "appliance", mappedAppliance: "furnace" as ApplianceCategory,
        subtypes: [
          { value: "gas", label: "Gas" },
          { value: "electric", label: "Electric" },
          { value: "oil", label: "Oil" },
          { value: "propane", label: "Propane" },
        ],
      },
      { key: "boiler", label: "Boiler (heat only, uses radiators)", icon: "\u2668\uFE0F", type: "appliance", mappedAppliance: "boiler" as ApplianceCategory,
        subtypes: [
          { value: "steam", label: "Steam" },
          { value: "hot-water", label: "Hot Water" },
        ],
      },
      { key: "heat-pump", label: "Heat Pump (heating and cooling)", icon: "\u{1F504}", type: "appliance", mappedAppliance: "heat_pump" as ApplianceCategory },
      { key: "fireplace", label: "Fireplace / Wood Stove", icon: "\u{1FAB5}", type: "appliance", mappedAppliance: "fireplace" as ApplianceCategory },
    ],
  },
  {
    label: "Cooling",
    items: [
      { key: "central-ac", label: "Central AC (cooling only)", icon: "\u2744\uFE0F", type: "appliance", mappedAppliance: "ac_unit" as ApplianceCategory },
      { key: "heat-pump-cooling", label: "Heat Pump", icon: "\u{1F504}", type: "appliance", mappedAppliance: "heat_pump" as ApplianceCategory },
      { key: "evap-cooler", label: "Swamp Cooler (cooling only, dry climates)", icon: "\u{1F4A8}", type: "appliance", mappedAppliance: "evap_cooler" as ApplianceCategory },
      { key: "mini-split", label: "Mini-Split (heating and cooling)", icon: "\u{1F32C}\uFE0F", type: "appliance", mappedAppliance: "mini_split" as ApplianceCategory },
    ],
  },
  {
    label: "Water",
    items: [
      { key: "water-heater", label: "Water Heater", icon: "\u{1F525}", type: "appliance", mappedAppliance: "water_heater" as ApplianceCategory,
        subtypes: [{ value: "tank", label: "Tank" }, { value: "tankless", label: "Tankless" }],
      },
      { key: "water-source", label: "Water Source", icon: "\u{1F4A7}", type: "system", mappedSystem: "water_source",
        subtypes: [{ value: "municipal", label: "Municipal" }, { value: "well", label: "Well" }],
      },
      { key: "sewage", label: "Sewer / Septic", icon: "\u{1F3D7}\uFE0F", type: "system", mappedSystem: "sewage",
        subtypes: [{ value: "sewer", label: "Sewer" }, { value: "septic", label: "Septic" }],
      },
    ],
  },
  {
    label: "Electrical",
    items: [
      { key: "electrical", label: "Electrical Panel", icon: "\u26A1", type: "system", mappedSystem: "electrical" },
      { key: "generator", label: "Generator", icon: "\u2699\uFE0F", type: "appliance", mappedAppliance: "generator" as ApplianceCategory },
      { key: "solar", label: "Solar Panels", icon: "\u2600\uFE0F", type: "system", mappedSystem: "solar" },
    ],
  },
  {
    label: "Structure",
    items: [
      { key: "roofing", label: "Roofing", icon: "\u{1F3E0}", type: "system", mappedSystem: "roofing",
        subtypes: [
          { value: "asphalt-shingle", label: "Asphalt" },
          { value: "metal", label: "Metal" },
          { value: "tile", label: "Tile" },
          { value: "flat", label: "Flat" },
        ],
      },
      { key: "foundation", label: "Foundation", icon: "\u{1F9F1}", type: "system", mappedSystem: "foundation",
        subtypes: [
          { value: "slab", label: "Slab" },
          { value: "crawlspace", label: "Crawlspace" },
          { value: "basement", label: "Basement" },
        ],
      },
    ],
  },
  {
    label: "Outdoor",
    items: [
      { key: "irrigation", label: "Irrigation / Sprinklers", icon: "\u{1F331}", type: "system", mappedSystem: "irrigation" },
      { key: "pool", label: "Pool", icon: "\u{1F3CA}", type: "system", mappedSystem: "pool" },
      { key: "hot-tub", label: "Hot Tub / Spa", icon: "\u2668\uFE0F", type: "appliance", mappedAppliance: "hot_tub" as ApplianceCategory },
    ],
  },
];

export const HEALTH_OPTIONS: { key: string; label: string; icon: string; desc: string }[] = [
  { key: "hasAllergies", label: "Allergies or asthma", icon: "\u{1FAC1}", desc: "We'll increase air quality tasks" },
  { key: "hasYoungChildren", label: "Young children (under 5)", icon: "\u{1F476}", desc: "We'll add safety checks" },
  { key: "hasPets", label: "Pets", icon: "\u{1F43E}", desc: "More frequent filter changes" },
  { key: "hasElderly", label: "Elderly family (65+)", icon: "\u{1F474}", desc: "We'll add accessibility checks" },
  { key: "hasImmunocompromised", label: "Immune-compromised", icon: "\u{1F6E1}\uFE0F", desc: "Extra mold & water quality checks" },
  { key: "prioritizeAirQuality", label: "Better indoor air quality", icon: "\u{1F331}", desc: "Humidity, ventilation, radon" },
  { key: "prioritizeEnergyEfficiency", label: "Energy efficiency", icon: "\u26A1", desc: "Weatherstripping, insulation, audits" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function initialSelectedItems(): Record<string, { enabled: boolean; subtypes: string[] }> {
  const map: Record<string, { enabled: boolean; subtypes: string[] }> = {};
  for (const group of MAJOR_SYSTEMS) {
    for (const item of group.items) {
      map[item.key] = { enabled: false, subtypes: [] };
    }
  }
  return map;
}

export function initialHealthFlags(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const opt of HEALTH_OPTIONS) {
    map[opt.key] = false;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Shared UI Components
// ---------------------------------------------------------------------------

export function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepIndex = i + 1;
        let bg = "bg-[var(--color-neutral-200)]";
        if (stepIndex < currentStep) bg = "bg-[var(--color-primary-500)]";
        else if (stepIndex === currentStep) bg = "bg-[var(--color-primary-200)]";
        return <div key={i} className={`h-1 flex-1 rounded-full ${bg}`} />;
      })}
    </div>
  );
}

export function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-[22px] font-extrabold text-[#1c1917] tracking-tight mb-1.5">
        {title}
      </h2>
      <p className="text-sm text-[var(--color-neutral-400)] mb-6 leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

export function ContinueButton({
  onClick,
  disabled = false,
  loading = false,
  children = "Continue",
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full h-[48px] bg-[#1c1917] text-white rounded-xl font-bold text-[14px] mt-6 transition-all flex items-center justify-center gap-2 ${
        disabled || loading ? "opacity-50 cursor-not-allowed" : "hover:bg-[#292524] active:scale-[0.98]"
      }`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-semibold text-[var(--color-neutral-400)] text-center mt-3 w-full transition-colors hover:text-[var(--color-neutral-600)]"
    >
      Back
    </button>
  );
}

export function SkipLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-[var(--color-neutral-400)] text-center mt-2 w-full"
    >
      Skip, I&apos;ll set this up later &rarr;
    </button>
  );
}

export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <p className="text-center text-xs text-[var(--color-neutral-400)] font-medium mt-3">
      Step {current} of {total}
    </p>
  );
}

export function SelectionCheckmark({ selected }: { selected: boolean }) {
  return (
    <div
      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
        selected
          ? "bg-[var(--color-primary-500)]"
          : "border-2 border-[var(--color-neutral-300)]"
      }`}
    >
      {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
    </div>
  );
}

export function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium text-[var(--color-neutral-700)] mb-1.5 block">
      {children}
    </label>
  );
}

export function FormInput({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maxLength?: number;
}) {
  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="h-10 w-full rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 text-sm font-medium focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-100)] outline-none transition-all"
      />
    </div>
  );
}

export function FormSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <select
        value={value}
        onChange={onChange}
        className="h-10 w-full rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 text-sm font-medium focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-100)] outline-none transition-all appearance-none"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: About Your Home (Basics + Location)
// ---------------------------------------------------------------------------

export function StepAboutHome({
  data,
  onChange,
  onNext,
  onBack,
  currentStep,
  totalSteps,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
  totalSteps: number;
}) {
  const climateZone = data.state ? climateZoneLabel(data.state) : "";
  // Name and property type are required, everything else is optional
  const canProceed = data.name.trim() !== "" && data.type !== "";

  return (
    <>
      <StepTitle
        title="About Your Home"
        subtitle="Basic info helps us tailor maintenance to your home and climate."
      />

      <div className="flex flex-col gap-5">
        <FormInput
          label="Home Name"
          placeholder='e.g., "Main House" or "Lake Cabin"'
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />

        {/* Property Type -- compact 2-column grid */}
        <div>
          <FormLabel>Property Type</FormLabel>
          <div className="grid grid-cols-2 gap-2">
            {HOME_TYPES.map((ht) => (
              <button
                key={ht.value}
                type="button"
                onClick={() => onChange({ type: ht.value })}
                className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                  data.type === ht.value
                    ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]"
                    : "border-[var(--color-neutral-200)] bg-white hover:border-[var(--color-neutral-300)]"
                }`}
              >
                <span className="text-lg">{ht.icon}</span>
                <span className="text-xs font-semibold text-[#1c1917]">{ht.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Year Built (optional)"
            type="number"
            placeholder="e.g., 1995"
            value={data.yearBuilt}
            onChange={(e) => onChange({ yearBuilt: e.target.value })}
          />
          <FormInput
            label="Sq Ft (optional)"
            type="number"
            placeholder="e.g., 2000"
            value={data.sqft}
            onChange={(e) => onChange({ sqft: e.target.value })}
          />
        </div>

        <div className="h-px bg-[var(--color-neutral-200)]" />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Zip Code (optional)"
            placeholder="12345"
            value={data.zip}
            onChange={(e) => onChange({ zip: e.target.value })}
            maxLength={10}
          />
          <FormSelect
            label="State (optional)"
            placeholder="Select"
            options={US_STATES}
            value={data.state}
            onChange={(e) => onChange({ state: e.target.value })}
          />
        </div>

        {climateZone && (
          <div className="rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-3">
            <span className="text-xs text-[var(--color-neutral-400)]">Climate zone: </span>
            <span className="text-xs font-semibold text-[#1c1917]">{climateZone}</span>
          </div>
        )}
      </div>

      <ContinueButton onClick={onNext} disabled={!canProceed} />
      <BackButton onClick={onBack} />
      <StepIndicator current={currentStep} total={totalSteps} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step: Major Systems
// ---------------------------------------------------------------------------

export function StepMajorSystems({
  data,
  onChange,
  onNext,
  onBack,
  onSkip,
  currentStep,
  totalSteps,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  currentStep: number;
  totalSteps: number;
}) {
  const heatPumpSelected = data.selectedItems["heat-pump"]?.enabled;

  const toggleItem = (key: string) => {
    const current = data.selectedItems[key];
    const willEnable = !current.enabled;
    const updates: Record<string, { enabled: boolean; subtypes: string[] }> = {
      [key]: { ...current, enabled: willEnable },
    };

    // Heat pump sync: selecting in Heating auto-selects in Cooling (and vice versa)
    if (key === "heat-pump") {
      updates["heat-pump-cooling"] = { enabled: willEnable, subtypes: [] };
    } else if (key === "heat-pump-cooling") {
      updates["heat-pump"] = { enabled: willEnable, subtypes: [] };
    }

    onChange({
      selectedItems: { ...data.selectedItems, ...updates },
    });
  };

  const toggleSubtype = (itemKey: string, subtype: string) => {
    const current = data.selectedItems[itemKey];
    const subtypes = current.subtypes.includes(subtype)
      ? current.subtypes.filter((v) => v !== subtype)
      : [...current.subtypes, subtype];
    onChange({
      selectedItems: {
        ...data.selectedItems,
        [itemKey]: { ...current, subtypes },
      },
    });
  };

  const selectedCount = Object.values(data.selectedItems).filter((s) => s.enabled).length;

  return (
    <>
      <StepTitle
        title="Your Home's Major Systems"
        subtitle="Let's start with the big stuff — you can always add more details later."
      />

      <div className="flex flex-col gap-6 mb-4">
        {MAJOR_SYSTEMS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-400)] mb-2">
              {group.label}
            </p>
            <div className={`grid gap-2 ${
              group.label === "Heating" || group.label === "Cooling"
                ? "grid-cols-1"
                : "grid-cols-2"
            }`}>
              {group.items.map((item) => {
                const selection = data.selectedItems[item.key];
                const active = selection?.enabled;
                const isHeatPumpCoolingMirror = item.key === "heat-pump-cooling" && heatPumpSelected;

                return (
                  <div key={item.key} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => !isHeatPumpCoolingMirror && toggleItem(item.key)}
                      disabled={isHeatPumpCoolingMirror}
                      className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                        isHeatPumpCoolingMirror
                          ? "border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] opacity-60 cursor-default"
                          : active
                            ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]"
                            : "border-[var(--color-neutral-200)] bg-white hover:border-[var(--color-neutral-300)]"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xs font-semibold text-[#1c1917]">
                        {item.label}
                        {isHeatPumpCoolingMirror && (
                          <span className="block text-[10px] font-normal text-[var(--color-neutral-400)]">Selected above</span>
                        )}
                      </span>
                    </button>
                    {active && !isHeatPumpCoolingMirror && item.subtypes && (
                      <div className="mt-1.5 ml-1 flex flex-wrap items-center gap-1.5">
                        {item.subtypes.map((st) => (
                          <button
                            key={st.value}
                            type="button"
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                              selection.subtypes.includes(st.value)
                                ? "bg-[var(--color-primary-500)] text-white"
                                : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-200)]"
                            }`}
                            onClick={() => toggleSubtype(item.key, st.value)}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary pill */}
      <div className="rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-3 text-center">
        <span className="text-xs font-medium text-[var(--color-neutral-400)]">
          {selectedCount} system{selectedCount !== 1 ? "s" : ""} selected
        </span>
      </div>

      <ContinueButton onClick={onNext} />
      <BackButton onClick={onBack} />
      <SkipLink onClick={onSkip} />
      <StepIndicator current={currentStep} total={totalSteps} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step: Your Household (health flags)
// ---------------------------------------------------------------------------

export function StepHousehold({
  data,
  onChange,
  onNext,
  onBack,
  onSkip,
  currentStep,
  totalSteps,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  currentStep: number;
  totalSteps: number;
}) {
  const toggleFlag = (key: string) => {
    onChange({
      healthFlags: {
        ...data.healthFlags,
        [key]: !data.healthFlags[key],
      },
    });
  };

  return (
    <>
      <StepTitle
        title="Your Household"
        subtitle="This helps us personalize your plan — you can set this up anytime in settings."
      />

      <div className="flex flex-col gap-2.5">
        {HEALTH_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => toggleFlag(opt.key)}
            className={`flex items-center gap-3 p-3.5 bg-white rounded-2xl border-2 cursor-pointer transition-all w-full text-left ${
              data.healthFlags[opt.key]
                ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]"
                : "border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]"
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-50)] flex items-center justify-center text-lg shrink-0">
              {opt.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-[#1c1917] block">{opt.label}</span>
              <span className="text-xs text-[var(--color-neutral-400)]">{opt.desc}</span>
            </div>
            <SelectionCheckmark selected={data.healthFlags[opt.key]} />
          </button>
        ))}
      </div>

      <ContinueButton onClick={onNext} />
      <BackButton onClick={onBack} />
      <SkipLink onClick={onSkip} />
      <StepIndicator current={currentStep} total={totalSteps} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step: All Set (completion)
// ---------------------------------------------------------------------------

export function StepComplete({
  systemCount,
  onFinish,
  loading,
  title,
  description,
  buttonLabel,
}: {
  systemCount: number;
  onFinish: () => void;
  loading: boolean;
  title?: string;
  description?: string;
  buttonLabel?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center -mx-5 -my-6 px-8 bg-gradient-to-b from-[#fffbeb] via-[#fef3c7] to-[#fde68a]">
      <div className="flex flex-col items-center text-center max-w-xs">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60 backdrop-blur-sm shadow-sm mb-5">
          <span className="text-3xl">{"\u2705"}</span>
        </div>
        <h1 className="text-[26px] font-extrabold text-[#451a03] tracking-tight leading-tight">
          {title ?? "You\u0027re all set!"}
        </h1>
        <p className="mt-2 text-sm text-[#92400e] leading-relaxed">
          {description ?? (
            <>
              We&apos;re building your personalized maintenance plan
              {systemCount > 0 && <> based on your {systemCount} system{systemCount !== 1 ? "s" : ""}</>}.
            </>
          )}
        </p>
        <div className="mt-6 flex gap-4 text-center">
          {[
            { icon: "\u{1F4CB}", label: "Tasks created" },
            { icon: "\u{1F514}", label: "Reminders set" },
            { icon: "\u{1F4CA}", label: "Health score" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/50 text-base">
                {item.icon}
              </div>
              <span className="text-[10px] font-bold text-[#78350f]">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs text-[#92400e]">
          You can add appliances, contractors, and more from your home profile anytime.
        </p>
        <button
          type="button"
          onClick={onFinish}
          disabled={loading}
          className="w-full h-[48px] bg-[#451a03] text-white rounded-xl font-bold text-[14px] mt-6 transition-all hover:bg-[#78350f] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {buttonLabel ?? "Go to My Dashboard"}
        </button>
      </div>
    </div>
  );
}
