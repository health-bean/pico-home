"use client";

import { useState, useCallback, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  Input,
  Select,
  Progress,
  Badge,
} from "@/components/ui";
import { getApplicableTemplates } from "@/lib/tasks/scheduling";
import type {
  TaskTemplate,
  TaskCategory,
  HomeType,
  SystemType,
  ApplianceCategory,
} from "@/lib/tasks/templates";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormData {
  name: string;
  type: string;
  yearBuilt: string;
  sqft: string;
  zip: string;
  state: string;
  systems: Record<string, { enabled: boolean; subtypes: string[] }>;
  appliances: Record<string, boolean>;
}

type TaskSetupState = "track" | "done" | "skip";

interface TaskSetup {
  templateId: string;
  state: TaskSetupState;
  doneMonth: number;
  doneYear: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 5;

const HOME_TYPES = [
  { value: "single_family", label: "Single Family" },
  { value: "townhouse", label: "Townhouse" },
  { value: "condo", label: "Condo" },
  { value: "apartment", label: "Apartment" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "mobile_home", label: "Mobile Home" },
];

const US_STATES = [
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

const CLIMATE_ZONES: Record<string, string> = {
  AL: "Hot-Humid (Zone 3A)", AK: "Subarctic (Zone 7/8)", AZ: "Hot-Dry (Zone 2B)",
  AR: "Mixed-Humid (Zone 3A)", CA: "Marine / Hot-Dry (Zone 3B-3C)", CO: "Cold (Zone 5B)",
  CT: "Cold (Zone 5A)", DE: "Mixed-Humid (Zone 4A)", FL: "Hot-Humid (Zone 1A-2A)",
  GA: "Hot-Humid (Zone 3A)", HI: "Hot-Humid (Zone 1A)", ID: "Cold (Zone 5B-6B)",
  IL: "Cold (Zone 5A)", IN: "Cold (Zone 5A)", IA: "Cold (Zone 5A)",
  KS: "Mixed-Dry (Zone 4A)", KY: "Mixed-Humid (Zone 4A)", LA: "Hot-Humid (Zone 2A)",
  ME: "Cold (Zone 6A)", MD: "Mixed-Humid (Zone 4A)", MA: "Cold (Zone 5A)",
  MI: "Cold (Zone 5A)", MN: "Cold (Zone 6A)", MS: "Hot-Humid (Zone 3A)",
  MO: "Mixed-Humid (Zone 4A)", MT: "Cold (Zone 6B)", NE: "Cold (Zone 5A)",
  NV: "Hot-Dry (Zone 3B)", NH: "Cold (Zone 6A)", NJ: "Mixed-Humid (Zone 4A)",
  NM: "Hot-Dry (Zone 4B)", NY: "Cold (Zone 5A)", NC: "Mixed-Humid (Zone 3A-4A)",
  ND: "Cold (Zone 6A)", OH: "Cold (Zone 5A)", OK: "Mixed-Humid (Zone 3A)",
  OR: "Marine (Zone 4C)", PA: "Cold (Zone 5A)", RI: "Cold (Zone 5A)",
  SC: "Hot-Humid (Zone 3A)", SD: "Cold (Zone 6A)", TN: "Mixed-Humid (Zone 4A)",
  TX: "Hot-Humid / Hot-Dry (Zone 2A-3B)", UT: "Cold / Dry (Zone 5B)",
  VT: "Cold (Zone 6A)", VA: "Mixed-Humid (Zone 4A)", WA: "Marine (Zone 4C)",
  WV: "Mixed-Humid (Zone 4A)", WI: "Cold (Zone 6A)", WY: "Cold (Zone 6B)",
  DC: "Mixed-Humid (Zone 4A)",
};

interface SystemDef {
  key: string;
  mappedType: SystemType;
  icon: string;
  label: string;
  hint: string;
  multiSelect: boolean;
  subtypes?: { value: string; label: string }[];
}

const SYSTEMS: SystemDef[] = [
  { key: "hvac", mappedType: "hvac", icon: "🌡️", label: "HVAC", hint: "Heating & cooling reminders", multiSelect: true,
    subtypes: [
      { value: "forced-air", label: "Forced Air" },
      { value: "radiant", label: "Radiant" },
      { value: "mini-split", label: "Mini-Split" },
      { value: "window-units", label: "Window Units" },
    ],
  },
  { key: "plumbing", mappedType: "plumbing", icon: "🚿", label: "Plumbing", hint: "Pipes, drains & water heater", multiSelect: false },
  { key: "electrical", mappedType: "electrical", icon: "⚡", label: "Electrical", hint: "Panel, outlets & wiring", multiSelect: false },
  { key: "roofing", mappedType: "roofing", icon: "🏠", label: "Roofing", hint: "Roof & gutter maintenance", multiSelect: true,
    subtypes: [
      { value: "asphalt-shingle", label: "Asphalt Shingle" },
      { value: "metal", label: "Metal" },
      { value: "tile", label: "Tile" },
    ],
  },
  { key: "foundation", mappedType: "foundation", icon: "🧱", label: "Foundation", hint: "Structural & moisture checks", multiSelect: true,
    subtypes: [
      { value: "slab", label: "Slab" },
      { value: "crawlspace", label: "Crawlspace" },
      { value: "basement", label: "Basement" },
    ],
  },
  { key: "water-source", mappedType: "water_source", icon: "💧", label: "Water Source", hint: "Water quality & supply", multiSelect: false,
    subtypes: [
      { value: "municipal", label: "Municipal" },
      { value: "well", label: "Well" },
    ],
  },
  { key: "sewage", mappedType: "sewage", icon: "🏗️", label: "Sewage", hint: "Sewer or septic maintenance", multiSelect: false,
    subtypes: [
      { value: "sewer", label: "Sewer" },
      { value: "septic", label: "Septic" },
    ],
  },
  { key: "irrigation", mappedType: "irrigation", icon: "🌱", label: "Irrigation", hint: "Sprinkler system care", multiSelect: false },
  { key: "pool", mappedType: "pool", icon: "🏊", label: "Pool", hint: "Pool chemicals & equipment", multiSelect: false },
  { key: "security", mappedType: "security", icon: "🔒", label: "Security", hint: "Alarm & camera system", multiSelect: false },
];

interface ApplianceDef {
  key: string;
  mappedCategory: ApplianceCategory;
  icon: string;
  label: string;
}

const APPLIANCES: ApplianceDef[] = [
  { key: "refrigerator", mappedCategory: "refrigerator", icon: "🧊", label: "Refrigerator" },
  { key: "dishwasher", mappedCategory: "dishwasher", icon: "🍽️", label: "Dishwasher" },
  { key: "washing-machine", mappedCategory: "washing_machine", icon: "👕", label: "Washing Machine" },
  { key: "dryer", mappedCategory: "dryer", icon: "🌀", label: "Dryer" },
  { key: "oven-range", mappedCategory: "oven_range", icon: "🍳", label: "Oven / Range" },
  { key: "microwave", mappedCategory: "microwave", icon: "📡", label: "Microwave" },
  { key: "garbage-disposal", mappedCategory: "garbage_disposal", icon: "♻️", label: "Garbage Disposal" },
  { key: "water-heater", mappedCategory: "water_heater", icon: "🔥", label: "Water Heater" },
  { key: "furnace", mappedCategory: "furnace", icon: "🌬️", label: "Furnace" },
  { key: "ac-unit", mappedCategory: "ac_unit", icon: "❄️", label: "AC Unit" },
  { key: "water-softener", mappedCategory: "water_softener", icon: "💦", label: "Water Softener" },
  { key: "garage-door", mappedCategory: "garage_door", icon: "🚗", label: "Garage Door" },
  { key: "sump-pump", mappedCategory: "sump_pump", icon: "🔧", label: "Sump Pump" },
  { key: "generator", mappedCategory: "generator", icon: "⚙️", label: "Generator" },
  { key: "hot-tub", mappedCategory: "hot_tub", icon: "♨️", label: "Hot Tub" },
];

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  safety: "Safety & Detection",
  roof_gutters: "Roof & Gutters",
  exterior: "Exterior",
  windows_doors: "Windows & Doors",
  appliance: "Appliances",
  lawn_landscape: "Lawn & Landscape",
  pest_control: "Pest Control",
  garage: "Garage",
  pool: "Pool",
  cleaning: "Cleaning",
  seasonal: "Seasonal",
};

const CATEGORY_ORDER: TaskCategory[] = [
  "safety", "hvac", "plumbing", "electrical", "roof_gutters",
  "exterior", "windows_doors", "appliance", "lawn_landscape",
  "pest_control", "garage", "pool", "seasonal",
];

const MONTHS = [
  { value: "1", label: "Jan" }, { value: "2", label: "Feb" },
  { value: "3", label: "Mar" }, { value: "4", label: "Apr" },
  { value: "5", label: "May" }, { value: "6", label: "Jun" },
  { value: "7", label: "Jul" }, { value: "8", label: "Aug" },
  { value: "9", label: "Sep" }, { value: "10", label: "Oct" },
  { value: "11", label: "Nov" }, { value: "12", label: "Dec" },
];

function getYearOptions(): { value: string; label: string }[] {
  const current = new Date().getFullYear();
  const years: { value: string; label: string }[] = [];
  for (let y = current; y >= current - 15; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

const YEAR_OPTIONS = getYearOptions();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initialSystems(): Record<string, { enabled: boolean; subtypes: string[] }> {
  const map: Record<string, { enabled: boolean; subtypes: string[] }> = {};
  for (const s of SYSTEMS) {
    map[s.key] = { enabled: false, subtypes: [] };
  }
  return map;
}

function initialAppliances(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const a of APPLIANCES) {
    map[a.key] = false;
  }
  return map;
}

function getActiveSystemTypes(systems: FormData["systems"]): SystemType[] {
  return SYSTEMS
    .filter((s) => systems[s.key].enabled)
    .map((s) => s.mappedType);
}

function getActiveApplianceCategories(appliances: FormData["appliances"]): ApplianceCategory[] {
  return APPLIANCES
    .filter((a) => appliances[a.key])
    .map((a) => a.mappedCategory);
}

function frequencyLabel(value: number, unit: string): string {
  if (unit === "one_time") return "One time";
  const unitLabel = unit === "days" ? "day" : unit === "weeks" ? "week" : unit === "months" ? "month" : "year";
  if (value === 1) return `Every ${unitLabel}`;
  return `Every ${value} ${unitLabel}s`;
}

function groupTemplatesByCategory(templates: TaskTemplate[]): Map<TaskCategory, TaskTemplate[]> {
  const groups = new Map<TaskCategory, TaskTemplate[]>();
  for (const t of templates) {
    const list = groups.get(t.category) || [];
    list.push(t);
    groups.set(t.category, list);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Step 1: Welcome
// ---------------------------------------------------------------------------

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--color-primary-100)] text-5xl shadow-md dark:bg-[var(--color-primary-900)]/40">
        🏠
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Let&apos;s set up your home
        </h1>
        <p className="mx-auto max-w-sm text-base text-muted-foreground">
          Answer a few quick questions and we&apos;ll build a personalized maintenance
          plan you can customize.
        </p>
      </div>
      <Button size="lg" className="w-full max-w-xs" onClick={onNext}>
        Get Started
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Home Basics + Location (combined)
// ---------------------------------------------------------------------------

function StepBasicsAndLocation({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const climateZone = data.state ? CLIMATE_ZONES[data.state] ?? "" : "";
  const canProceed =
    data.name.trim() !== "" &&
    data.type !== "" &&
    data.yearBuilt !== "" &&
    data.zip.trim().length >= 5 &&
    data.state !== "";

  return (
    <div className="flex flex-1 flex-col gap-6 px-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">About Your Home</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Basic info helps us tailor maintenance to your home and climate.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Home Name"
          placeholder='e.g., "Main House" or "Lake Cabin"'
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Home Type"
            placeholder="Select"
            options={HOME_TYPES}
            value={data.type}
            onChange={(e) => onChange({ type: e.target.value })}
          />
          <Input
            label="Year Built"
            type="number"
            placeholder="e.g., 1995"
            value={data.yearBuilt}
            onChange={(e) => onChange({ yearBuilt: e.target.value })}
          />
        </div>
        <Input
          label="Square Footage"
          type="number"
          placeholder="Optional"
          helperText="Approximate living space"
          value={data.sqft}
          onChange={(e) => onChange({ sqft: e.target.value })}
        />

        <hr className="border-border" />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Zip Code"
            placeholder="12345"
            value={data.zip}
            onChange={(e) => onChange({ zip: e.target.value })}
            maxLength={10}
          />
          <Select
            label="State"
            placeholder="Select"
            options={US_STATES}
            value={data.state}
            onChange={(e) => onChange({ state: e.target.value })}
          />
        </div>
        {climateZone && (
          <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
            <span className="text-xs text-muted-foreground">Climate zone: </span>
            <span className="text-xs font-medium text-foreground">{climateZone}</span>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pb-2">
        <button type="button" onClick={onBack} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Back
        </button>
        <Button onClick={onNext} disabled={!canProceed}>Next</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Systems & Appliances (combined)
// ---------------------------------------------------------------------------

function StepSystemsAndAppliances({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggleSystem = (key: string) => {
    onChange({
      systems: {
        ...data.systems,
        [key]: { ...data.systems[key], enabled: !data.systems[key].enabled },
      },
    });
  };

  const toggleSubtype = (sysKey: string, subtype: string, multiSelect: boolean) => {
    const current = data.systems[sysKey].subtypes;
    let next: string[];
    if (multiSelect) {
      // Multi-select: toggle the value in/out of the array
      next = current.includes(subtype)
        ? current.filter((v) => v !== subtype)
        : [...current, subtype];
    } else {
      // Single-select (radio): select or deselect
      next = current.includes(subtype) ? [] : [subtype];
    }
    onChange({
      systems: {
        ...data.systems,
        [sysKey]: { ...data.systems[sysKey], subtypes: next },
      },
    });
  };

  const toggleAppliance = (key: string) => {
    onChange({
      appliances: { ...data.appliances, [key]: !data.appliances[key] },
    });
  };

  const enabledSystems = Object.values(data.systems).filter((s) => s.enabled);
  const systemCount = enabledSystems.length;
  const subtypeCount = enabledSystems.reduce((sum, s) => sum + s.subtypes.length, 0);
  const applianceCount = Object.values(data.appliances).filter(Boolean).length;

  return (
    <div className="flex flex-1 flex-col gap-6 px-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">What&apos;s in Your Home?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select what applies. We&apos;ll create relevant maintenance tasks for each.
        </p>
      </div>

      {/* Systems */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Systems
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {SYSTEMS.map((sys) => {
            const entry = data.systems[sys.key];
            return (
              <button
                key={sys.key}
                type="button"
                onClick={() => toggleSystem(sys.key)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                  entry.enabled
                    ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]/50 shadow-sm dark:border-[var(--color-primary-400)] dark:bg-[var(--color-primary-900)]/20"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex w-full items-center gap-2">
                  <span className="text-lg">{sys.icon}</span>
                  <span className="text-sm font-medium text-foreground">{sys.label}</span>
                  {entry.enabled && (
                    <svg className="ml-auto h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{sys.hint}</span>
                {entry.enabled && sys.subtypes && (
                  <div className="mt-1 flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {sys.subtypes.map((st) => (
                      <button
                        key={st.value}
                        type="button"
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          entry.subtypes.includes(st.value)
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        onClick={(e) => { e.stopPropagation(); toggleSubtype(sys.key, st.value, sys.multiSelect); }}
                      >
                        {st.label}
                      </button>
                    ))}
                    {entry.subtypes.length > 1 && (
                      <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-semibold text-primary">
                        {entry.subtypes.length}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Appliances */}
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Major Appliances
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {APPLIANCES.map((app) => {
            const active = data.appliances[app.key];
            return (
              <button
                key={app.key}
                type="button"
                onClick={() => toggleAppliance(app.key)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all ${
                  active
                    ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]/50 shadow-sm dark:border-[var(--color-primary-400)] dark:bg-[var(--color-primary-900)]/20"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <span className="text-xl">{app.icon}</span>
                <span className="text-xs font-medium text-foreground">{app.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-center">
        <span className="text-xs text-muted-foreground">
          {systemCount} system{systemCount !== 1 ? "s" : ""}
          {subtypeCount > 0 && ` (${subtypeCount} subtype${subtypeCount !== 1 ? "s" : ""})`}
          {" "}and {applianceCount} appliance{applianceCount !== 1 ? "s" : ""} selected
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between pb-2">
        <button type="button" onClick={onBack} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Back
        </button>
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Plan Preview
// ---------------------------------------------------------------------------

function TaskRow({
  template,
  setup,
  onUpdate,
}: {
  template: TaskTemplate;
  setup: TaskSetup;
  onUpdate: (s: Partial<TaskSetup>) => void;
}) {
  const isEssential = template.priority === "safety" || template.priority === "prevent_damage";

  return (
    <div className={`rounded-lg border p-3 transition-all ${
      setup.state === "skip"
        ? "border-border bg-muted/30 opacity-50"
        : "border-border bg-white dark:bg-[var(--color-neutral-900)]"
    }`}>
      <div className="flex items-start gap-3">
        {/* Toggle */}
        <button
          type="button"
          onClick={() => onUpdate({ state: setup.state === "skip" ? "track" : "skip" })}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
            setup.state !== "skip"
              ? "border-primary bg-primary text-white"
              : "border-muted-foreground/30 bg-transparent"
          }`}
          aria-label={setup.state !== "skip" ? "Enabled" : "Skipped"}
        >
          {setup.state !== "skip" && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{template.name}</span>
            {isEssential && <Badge variant="danger" size="sm">Critical</Badge>}
          </div>
          <span className="text-xs text-muted-foreground">
            {frequencyLabel(template.frequencyValue, template.frequencyUnit)}
          </span>

          {/* Track / Already Done toggle — only when not skipped */}
          {setup.state !== "skip" && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onUpdate({ state: "track" })}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    setup.state === "track"
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Start tracking
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate({ state: "done" })}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    setup.state === "done"
                      ? "bg-[var(--color-success-500)] text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Already done
                </button>
              </div>

              {setup.state === "done" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">When?</span>
                  <select
                    value={setup.doneMonth}
                    onChange={(e) => onUpdate({ doneMonth: Number(e.target.value) })}
                    className="rounded-md border border-border bg-white px-2 py-1 text-xs text-foreground dark:bg-[var(--color-neutral-900)]"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={setup.doneYear}
                    onChange={(e) => onUpdate({ doneYear: Number(e.target.value) })}
                    className="rounded-md border border-border bg-white px-2 py-1 text-xs text-foreground dark:bg-[var(--color-neutral-900)]"
                  >
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y.value} value={y.value}>{y.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepPlanPreview({
  form,
  taskSetups,
  onUpdateTask,
  onBack,
  onFinish,
  isPending,
}: {
  form: FormData;
  taskSetups: Record<string, TaskSetup>;
  onUpdateTask: (templateId: string, update: Partial<TaskSetup>) => void;
  onBack: () => void;
  onFinish: () => void;
  isPending: boolean;
}) {
  const templates = useMemo(() => {
    return getApplicableTemplates({
      type: form.type as HomeType,
      systems: getActiveSystemTypes(form.systems),
      appliances: getActiveApplianceCategories(form.appliances),
    });
  }, [form]);

  const grouped = useMemo(() => groupTemplatesByCategory(templates), [templates]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    // Auto-expand categories that have critical tasks
    const expanded = new Set<string>();
    for (const [cat, catTemplates] of grouped) {
      if (catTemplates.some((t) => t.priority === "safety" || t.priority === "prevent_damage")) {
        expanded.add(cat);
      }
    }
    return expanded;
  });

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const activeCount = Object.values(taskSetups).filter((s) => s.state !== "skip").length;
  const totalCount = templates.length;
  const doneCount = Object.values(taskSetups).filter((s) => s.state === "done").length;

  return (
    <div className="flex flex-1 flex-col gap-4 px-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Your Maintenance Plan</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We found {totalCount} tasks for your home. Customize what to track and mark
          anything you&apos;ve already done.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 rounded-xl border border-[var(--color-primary-500)]/30 bg-[var(--color-primary-50)]/50 p-3 dark:bg-[var(--color-primary-900)]/10">
        <span className="text-2xl font-bold text-primary">{activeCount}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            task{activeCount !== 1 ? "s" : ""} selected
          </p>
          <p className="text-xs text-muted-foreground">
            {doneCount > 0 && `${doneCount} already done · `}
            {totalCount - activeCount} skipped
          </p>
        </div>
      </div>

      {/* Category groups */}
      <div className="flex flex-col gap-2 overflow-y-auto">
        {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
          const catTemplates = grouped.get(cat)!;
          const expanded = expandedCategories.has(cat);
          const catActiveCount = catTemplates.filter((t) => taskSetups[t.id]?.state !== "skip").length;
          const hasCritical = catTemplates.some((t) => t.priority === "safety" || t.priority === "prevent_damage");

          return (
            <div key={cat} className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <svg
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="flex-1 text-sm font-semibold text-foreground">
                  {CATEGORY_LABELS[cat]}
                </span>
                {hasCritical && (
                  <Badge variant="danger" size="sm">Has critical</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {catActiveCount}/{catTemplates.length}
                </span>
              </button>

              {expanded && (
                <div className="flex flex-col gap-2 border-t border-border bg-muted/20 p-3">
                  {catTemplates.map((template) => (
                    <TaskRow
                      key={template.id}
                      template={template}
                      setup={taskSetups[template.id]}
                      onUpdate={(update) => onUpdateTask(template.id, update)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-[var(--color-info-500)]/20 bg-[var(--color-info-50)] p-3 dark:bg-sky-950/20">
        <p className="text-xs text-[var(--color-info-700)] dark:text-sky-300">
          You can always add, remove, or adjust tasks later from the Tasks screen.
          Brand and model details can be added when you complete your first task for each appliance.
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between pb-2">
        <button type="button" onClick={onBack} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Back
        </button>
        <Button size="lg" onClick={onFinish} loading={isPending}>
          Create My Plan
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  const [form, setForm] = useState<FormData>({
    name: "",
    type: "",
    yearBuilt: "",
    sqft: "",
    zip: "",
    state: "",
    systems: initialSystems(),
    appliances: initialAppliances(),
  });

  const [taskSetups, setTaskSetups] = useState<Record<string, TaskSetup>>({});

  // When entering step 4, compute applicable templates and initialize setups
  const initializeTaskSetups = useCallback(() => {
    const templates = getApplicableTemplates({
      type: form.type as HomeType,
      systems: getActiveSystemTypes(form.systems),
      appliances: getActiveApplianceCategories(form.appliances),
    });

    const now = new Date();
    const setups: Record<string, TaskSetup> = {};
    for (const t of templates) {
      // Preserve existing setup if re-entering this step
      if (taskSetups[t.id]) {
        setups[t.id] = taskSetups[t.id];
      } else {
        // Essential tasks default to "track", others to "track" as well but user can skip
        setups[t.id] = {
          templateId: t.id,
          state: "track",
          doneMonth: now.getMonth() + 1,
          doneYear: now.getFullYear(),
        };
      }
    }
    setTaskSetups(setups);
  }, [form, taskSetups]);

  const updateForm = useCallback((partial: Partial<FormData>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateTaskSetup = useCallback((templateId: string, update: Partial<TaskSetup>) => {
    setTaskSetups((prev) => ({
      ...prev,
      [templateId]: { ...prev[templateId], ...update },
    }));
  }, []);

  const goTo = useCallback(
    (next: number, dir: "forward" | "backward") => {
      if (animating) return;
      // Initialize task setups when entering the plan preview
      if (next === 4 && dir === "forward") {
        initializeTaskSetups();
      }
      setDirection(dir);
      setAnimating(true);
      setTimeout(() => {
        setStep(next);
        setTimeout(() => setAnimating(false), 30);
      }, 200);
    },
    [animating, initializeTaskSetups]
  );

  const next = useCallback(() => goTo(step + 1, "forward"), [goTo, step]);
  const back = useCallback(() => goTo(step - 1, "backward"), [goTo, step]);

  const handleFinish = () => {
    startTransition(async () => {
      const activeSystems = SYSTEMS
        .filter((s) => form.systems[s.key].enabled)
        .flatMap((s) => {
          const subtypes = form.systems[s.key].subtypes;
          if (subtypes.length === 0) {
            return [{ key: s.mappedType, subtype: "standard" }];
          }
          return subtypes.map((st) => ({ key: s.mappedType, subtype: st }));
        });

      const activeAppliances = APPLIANCES
        .filter((a) => form.appliances[a.key])
        .map((a) => a.mappedCategory);

      const taskSetupsList = Object.values(taskSetups).map((s) => ({
        templateId: s.templateId,
        state: s.state,
        doneMonth: s.doneMonth,
        doneYear: s.doneYear,
      }));

      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            home: {
              name: form.name,
              type: form.type,
              yearBuilt: Number(form.yearBuilt),
              sqft: form.sqft ? Number(form.sqft) : null,
              zip: form.zip,
              state: form.state,
              climateZone: CLIMATE_ZONES[form.state] ?? "",
            },
            systems: activeSystems,
            appliances: activeAppliances,
            taskSetups: taskSetupsList,
          }),
        });

        if (!res.ok) throw new Error("Failed to save");
      } catch {
        // Still navigate on error for now — we'll handle this better later
        console.error("Failed to save onboarding data");
      }

      router.push("/dashboard");
    });
  };

  const translateClass = animating
    ? direction === "forward"
      ? "opacity-0 translate-x-8"
      : "opacity-0 -translate-x-8"
    : "opacity-100 translate-x-0";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {step > 1 && (
        <div className="sticky top-0 z-10 bg-background/80 px-6 pb-2 pt-4 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Step {step - 1} of {TOTAL_STEPS - 1}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100)}%
            </span>
          </div>
          <Progress value={step - 1} max={TOTAL_STEPS - 1} variant="warning" />
        </div>
      )}

      <div className={`flex flex-1 flex-col py-6 transition-all duration-200 ease-out ${translateClass}`}>
        {step === 1 && <StepWelcome onNext={next} />}
        {step === 2 && (
          <StepBasicsAndLocation data={form} onChange={updateForm} onNext={next} onBack={back} />
        )}
        {step === 3 && (
          <StepSystemsAndAppliances data={form} onChange={updateForm} onNext={next} onBack={back} />
        )}
        {step === 4 && (
          <StepPlanPreview
            form={form}
            taskSetups={taskSetups}
            onUpdateTask={updateTaskSetup}
            onBack={back}
            onFinish={handleFinish}
            isPending={isPending}
          />
        )}
      </div>
    </div>
  );
}
