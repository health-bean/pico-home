"use client";

import { useState, useCallback, useTransition } from "react";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HomeBasics {
  name: string;
  type: string;
  yearBuilt: string;
  sqft: string;
}

interface LocationData {
  address: string;
  city: string;
  state: string;
  zip: string;
}

interface SystemEntry {
  enabled: boolean;
  subtype: string;
}

interface ApplianceEntry {
  enabled: boolean;
  brand: string;
  model: string;
}

interface FormData {
  basics: HomeBasics;
  location: LocationData;
  systems: Record<string, SystemEntry>;
  appliances: Record<string, ApplianceEntry>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 6;

const HOME_TYPES = [
  { value: "single-family", label: "Single Family" },
  { value: "townhouse", label: "Townhouse" },
  { value: "condo", label: "Condo" },
  { value: "apartment", label: "Apartment" },
  { value: "multi-family", label: "Multi-Family" },
  { value: "mobile-home", label: "Mobile Home" },
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
  AL: "Hot-Humid (Zone 3A)",
  AK: "Subarctic (Zone 7/8)",
  AZ: "Hot-Dry (Zone 2B)",
  AR: "Mixed-Humid (Zone 3A)",
  CA: "Marine / Hot-Dry (Zone 3B-3C)",
  CO: "Cold (Zone 5B)",
  CT: "Cold (Zone 5A)",
  DE: "Mixed-Humid (Zone 4A)",
  FL: "Hot-Humid (Zone 1A-2A)",
  GA: "Hot-Humid (Zone 3A)",
  HI: "Hot-Humid (Zone 1A)",
  ID: "Cold (Zone 5B-6B)",
  IL: "Cold (Zone 5A)",
  IN: "Cold (Zone 5A)",
  IA: "Cold (Zone 5A)",
  KS: "Mixed-Dry (Zone 4A)",
  KY: "Mixed-Humid (Zone 4A)",
  LA: "Hot-Humid (Zone 2A)",
  ME: "Cold (Zone 6A)",
  MD: "Mixed-Humid (Zone 4A)",
  MA: "Cold (Zone 5A)",
  MI: "Cold (Zone 5A)",
  MN: "Cold (Zone 6A)",
  MS: "Hot-Humid (Zone 3A)",
  MO: "Mixed-Humid (Zone 4A)",
  MT: "Cold (Zone 6B)",
  NE: "Cold (Zone 5A)",
  NV: "Hot-Dry (Zone 3B)",
  NH: "Cold (Zone 6A)",
  NJ: "Mixed-Humid (Zone 4A)",
  NM: "Hot-Dry (Zone 4B)",
  NY: "Cold (Zone 5A)",
  NC: "Mixed-Humid (Zone 3A-4A)",
  ND: "Cold (Zone 6A)",
  OH: "Cold (Zone 5A)",
  OK: "Mixed-Humid (Zone 3A)",
  OR: "Marine (Zone 4C)",
  PA: "Cold (Zone 5A)",
  RI: "Cold (Zone 5A)",
  SC: "Hot-Humid (Zone 3A)",
  SD: "Cold (Zone 6A)",
  TN: "Mixed-Humid (Zone 4A)",
  TX: "Hot-Humid / Hot-Dry (Zone 2A-3B)",
  UT: "Cold / Dry (Zone 5B)",
  VT: "Cold (Zone 6A)",
  VA: "Mixed-Humid (Zone 4A)",
  WA: "Marine (Zone 4C)",
  WV: "Mixed-Humid (Zone 4A)",
  WI: "Cold (Zone 6A)",
  WY: "Cold (Zone 6B)",
  DC: "Mixed-Humid (Zone 4A)",
};

interface SystemDef {
  key: string;
  icon: string;
  label: string;
  subtypes?: { value: string; label: string }[];
}

const SYSTEMS: SystemDef[] = [
  {
    key: "hvac",
    icon: "🌡️",
    label: "HVAC",
    subtypes: [
      { value: "forced-air", label: "Forced Air" },
      { value: "radiant", label: "Radiant" },
      { value: "mini-split", label: "Mini-Split" },
      { value: "window-units", label: "Window Units" },
    ],
  },
  { key: "plumbing", icon: "🚿", label: "Plumbing" },
  { key: "electrical", icon: "⚡", label: "Electrical" },
  {
    key: "roofing",
    icon: "🏠",
    label: "Roofing",
    subtypes: [
      { value: "asphalt-shingle", label: "Asphalt Shingle" },
      { value: "metal", label: "Metal" },
      { value: "tile", label: "Tile" },
    ],
  },
  {
    key: "foundation",
    icon: "🧱",
    label: "Foundation",
    subtypes: [
      { value: "slab", label: "Slab" },
      { value: "crawlspace", label: "Crawlspace" },
      { value: "basement", label: "Basement" },
    ],
  },
  {
    key: "water-source",
    icon: "💧",
    label: "Water Source",
    subtypes: [
      { value: "municipal", label: "Municipal" },
      { value: "well", label: "Well" },
    ],
  },
  {
    key: "sewage",
    icon: "🏗️",
    label: "Sewage",
    subtypes: [
      { value: "sewer", label: "Sewer" },
      { value: "septic", label: "Septic" },
    ],
  },
  {
    key: "irrigation",
    icon: "🌱",
    label: "Irrigation System",
    subtypes: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "pool",
    icon: "🏊",
    label: "Pool",
    subtypes: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  {
    key: "security",
    icon: "🔒",
    label: "Security System",
    subtypes: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
];

interface ApplianceDef {
  key: string;
  icon: string;
  label: string;
}

const APPLIANCES: ApplianceDef[] = [
  { key: "refrigerator", icon: "🧊", label: "Refrigerator" },
  { key: "dishwasher", icon: "🍽️", label: "Dishwasher" },
  { key: "washing-machine", icon: "👕", label: "Washing Machine" },
  { key: "dryer", icon: "🌀", label: "Dryer" },
  { key: "oven-range", icon: "🍳", label: "Oven / Range" },
  { key: "microwave", icon: "📡", label: "Microwave" },
  { key: "garbage-disposal", icon: "♻️", label: "Garbage Disposal" },
  { key: "water-heater", icon: "🔥", label: "Water Heater" },
  { key: "furnace", icon: "🌬️", label: "Furnace" },
  { key: "ac-unit", icon: "❄️", label: "AC Unit" },
  { key: "water-softener", icon: "💦", label: "Water Softener" },
  { key: "garage-door-opener", icon: "🚗", label: "Garage Door Opener" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initialSystems(): Record<string, SystemEntry> {
  const map: Record<string, SystemEntry> = {};
  for (const s of SYSTEMS) {
    map[s.key] = { enabled: false, subtype: s.subtypes?.[0]?.value ?? "standard" };
  }
  return map;
}

function initialAppliances(): Record<string, ApplianceEntry> {
  const map: Record<string, ApplianceEntry> = {};
  for (const a of APPLIANCES) {
    map[a.key] = { enabled: false, brand: "", model: "" };
  }
  return map;
}

function countEnabled(rec: Record<string, { enabled: boolean }>): number {
  return Object.values(rec).filter((v) => v.enabled).length;
}

function estimateTaskCount(form: FormData): number {
  // Base tasks for any home
  let count = 18;
  // Add per-system
  const sys = form.systems;
  if (sys.hvac.enabled) count += 6;
  if (sys.plumbing.enabled) count += 4;
  if (sys.electrical.enabled) count += 3;
  if (sys.roofing.enabled) count += 3;
  if (sys.foundation.enabled) count += 2;
  if (sys["water-source"].enabled) count += 2;
  if (sys.sewage.enabled) count += sys.sewage.subtype === "septic" ? 4 : 1;
  if (sys.irrigation.enabled && sys.irrigation.subtype === "yes") count += 3;
  if (sys.pool.enabled && sys.pool.subtype === "yes") count += 6;
  if (sys.security.enabled && sys.security.subtype === "yes") count += 2;
  // Add per-appliance
  count += countEnabled(form.appliances) * 2;
  return count;
}

// ---------------------------------------------------------------------------
// Step Components
// ---------------------------------------------------------------------------

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-amber-100 text-5xl shadow-md dark:bg-amber-900/40">
        🏠
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Let&apos;s set up your home
        </h1>
        <p className="mx-auto max-w-sm text-base text-muted-foreground">
          We&apos;ll ask a few questions to create a personalized maintenance
          plan for your home.
        </p>
      </div>
      <Button size="lg" className="w-full max-w-xs" onClick={onNext}>
        Get Started
      </Button>
    </div>
  );
}

function StepBasics({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: HomeBasics;
  onChange: (d: HomeBasics) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const set = (key: keyof HomeBasics, val: string) =>
    onChange({ ...data, [key]: val });

  const canProceed = data.name.trim() !== "" && data.type !== "" && data.yearBuilt !== "";

  return (
    <div className="flex flex-1 flex-col gap-6 px-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Home Basics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us about your home so we can tailor your plan.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Home Name"
          placeholder="e.g., Main House"
          value={data.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <Select
          label="Home Type"
          placeholder="Select a type"
          options={HOME_TYPES}
          value={data.type}
          onChange={(e) => set("type", e.target.value)}
        />
        <Input
          label="Year Built"
          type="number"
          placeholder="e.g., 1995"
          value={data.yearBuilt}
          onChange={(e) => set("yearBuilt", e.target.value)}
        />
        <Input
          label="Square Footage"
          type="number"
          placeholder="Optional"
          helperText="Approximate living space in sq ft"
          value={data.sqft}
          onChange={(e) => set("sqft", e.target.value)}
        />
      </div>

      <div className="mt-auto flex items-center justify-between pb-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <Button onClick={onNext} disabled={!canProceed}>
          Next
        </Button>
      </div>
    </div>
  );
}

function StepLocation({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: LocationData;
  onChange: (d: LocationData) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const set = (key: keyof LocationData, val: string) =>
    onChange({ ...data, [key]: val });

  const climateZone = data.state ? CLIMATE_ZONES[data.state] ?? "Unknown" : "";
  const canProceed =
    data.address.trim() !== "" && data.city.trim() !== "" && data.state !== "" && data.zip.trim() !== "";

  return (
    <div className="flex flex-1 flex-col gap-6 px-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Location</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your location helps us factor in climate-specific maintenance.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Address"
          placeholder="123 Main St"
          value={data.address}
          onChange={(e) => set("address", e.target.value)}
        />
        <Input
          label="City"
          placeholder="Springfield"
          value={data.city}
          onChange={(e) => set("city", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="State"
            placeholder="Select"
            options={US_STATES}
            value={data.state}
            onChange={(e) => set("state", e.target.value)}
          />
          <Input
            label="Zip Code"
            placeholder="12345"
            value={data.zip}
            onChange={(e) => set("zip", e.target.value)}
            maxLength={10}
          />
        </div>
        {climateZone && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Climate Zone</span>
            <div className="flex h-10 w-full items-center rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground">
              {climateZone}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between pb-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <Button onClick={onNext} disabled={!canProceed}>
          Next
        </Button>
      </div>
    </div>
  );
}

function StepSystems({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Record<string, SystemEntry>;
  onChange: (d: Record<string, SystemEntry>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggle = (key: string) => {
    onChange({
      ...data,
      [key]: { ...data[key], enabled: !data[key].enabled },
    });
  };

  const setSubtype = (key: string, subtype: string) => {
    onChange({
      ...data,
      [key]: { ...data[key], subtype },
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Home Systems</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select the systems your home has. We&apos;ll create tasks for each.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 overflow-y-auto">
        {SYSTEMS.map((sys) => {
          const entry = data[sys.key];
          return (
            <Card
              key={sys.key}
              className={`cursor-pointer transition-all duration-200 ${
                entry.enabled
                  ? "border-amber-500 bg-amber-50/50 shadow-md dark:border-amber-400 dark:bg-amber-950/20"
                  : "hover:border-muted-foreground/30"
              }`}
              onClick={() => toggle(sys.key)}
            >
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <span className="text-2xl">{sys.icon}</span>
                <span className="text-sm font-medium text-foreground">{sys.label}</span>
                {entry.enabled && sys.subtypes && sys.subtypes.length > 2 && (
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-white px-2 py-1 text-xs text-foreground dark:bg-[var(--color-neutral-900)]"
                    value={entry.subtype}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSubtype(sys.key, e.target.value);
                    }}
                  >
                    {sys.subtypes.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                )}
                {entry.enabled && sys.subtypes && sys.subtypes.length === 2 && (
                  <div className="mt-1 flex gap-1">
                    {sys.subtypes.map((st) => (
                      <button
                        key={st.value}
                        type="button"
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          entry.subtype === st.value
                            ? "bg-amber-500 text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubtype(sys.key, st.value);
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between pb-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  );
}

function StepAppliances({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: Record<string, ApplianceEntry>;
  onChange: (d: Record<string, ApplianceEntry>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggle = (key: string) => {
    onChange({
      ...data,
      [key]: { ...data[key], enabled: !data[key].enabled },
    });
  };

  const setField = (key: string, field: "brand" | "model", value: string) => {
    onChange({
      ...data,
      [key]: { ...data[key], [field]: value },
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Appliances</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select major appliances. Add brand/model for smarter reminders.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 overflow-y-auto">
        {APPLIANCES.map((app) => {
          const entry = data[app.key];
          return (
            <Card
              key={app.key}
              className={`cursor-pointer transition-all duration-200 ${
                entry.enabled
                  ? "border-amber-500 bg-amber-50/50 shadow-md dark:border-amber-400 dark:bg-amber-950/20"
                  : "hover:border-muted-foreground/30"
              }`}
              onClick={() => toggle(app.key)}
            >
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <span className="text-2xl">{app.icon}</span>
                <span className="text-sm font-medium text-foreground">{app.label}</span>
                {entry.enabled && (
                  <div
                    className="mt-1 flex w-full flex-col gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground dark:bg-[var(--color-neutral-900)]"
                      placeholder="Brand"
                      value={entry.brand}
                      onChange={(e) => setField(app.key, "brand", e.target.value)}
                    />
                    <input
                      className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground dark:bg-[var(--color-neutral-900)]"
                      placeholder="Model"
                      value={entry.model}
                      onChange={(e) => setField(app.key, "model", e.target.value)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between pb-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  );
}

function StepReview({
  form,
  onBack,
  onFinish,
  isPending,
}: {
  form: FormData;
  onBack: () => void;
  onFinish: () => void;
  isPending: boolean;
}) {
  const enabledSystems = SYSTEMS.filter((s) => form.systems[s.key].enabled);
  const enabledAppliances = APPLIANCES.filter((a) => form.appliances[a.key].enabled);
  const taskCount = estimateTaskCount(form);
  const homeType = HOME_TYPES.find((t) => t.value === form.basics.type)?.label ?? "";
  const stateName = US_STATES.find((s) => s.value === form.location.state)?.label ?? "";

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Review Your Home</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm everything looks right before we build your plan.
        </p>
      </div>

      {/* Home Basics */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Home Basics
          </h3>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium text-foreground">{form.basics.name}</span>
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium text-foreground">{homeType}</span>
            <span className="text-muted-foreground">Year Built</span>
            <span className="font-medium text-foreground">{form.basics.yearBuilt}</span>
            {form.basics.sqft && (
              <>
                <span className="text-muted-foreground">Size</span>
                <span className="font-medium text-foreground">
                  {Number(form.basics.sqft).toLocaleString()} sq ft
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Location
          </h3>
          <div className="text-sm">
            <p className="font-medium text-foreground">{form.location.address}</p>
            <p className="text-muted-foreground">
              {form.location.city}, {stateName} {form.location.zip}
            </p>
            {form.location.state && (
              <p className="mt-1 text-xs text-muted-foreground">
                {CLIMATE_ZONES[form.location.state]}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Systems */}
      {enabledSystems.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Systems
            </h3>
            <div className="flex flex-wrap gap-2">
              {enabledSystems.map((s) => (
                <Badge key={s.key} variant="default" size="md">
                  {s.icon} {s.label}
                  {form.systems[s.key].subtype !== "standard" && (
                    <span className="ml-1 opacity-70">
                      ({
                        s.subtypes?.find(
                          (st) => st.value === form.systems[s.key].subtype
                        )?.label
                      })
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appliances */}
      {enabledAppliances.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Appliances
            </h3>
            <div className="flex flex-wrap gap-2">
              {enabledAppliances.map((a) => {
                const entry = form.appliances[a.key];
                const detail = [entry.brand, entry.model].filter(Boolean).join(" ");
                return (
                  <Badge key={a.key} variant="default" size="md">
                    {a.icon} {a.label}
                    {detail && <span className="ml-1 opacity-70">({detail})</span>}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task estimate */}
      <Card className="border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/10">
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <span className="text-4xl font-bold text-amber-600 dark:text-amber-400">
            {taskCount}
          </span>
          <p className="text-sm text-muted-foreground">
            personalized maintenance tasks will be generated for your home
          </p>
        </CardContent>
      </Card>

      <div className="mt-auto flex items-center justify-between pb-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
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
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [animating, setAnimating] = useState(false);

  const [form, setForm] = useState<FormData>({
    basics: { name: "", type: "", yearBuilt: "", sqft: "" },
    location: { address: "", city: "", state: "", zip: "" },
    systems: initialSystems(),
    appliances: initialAppliances(),
  });

  const goTo = useCallback(
    (next: number, dir: "forward" | "backward") => {
      if (animating) return;
      setDirection(dir);
      setAnimating(true);
      // Brief delay for exit animation, then swap step
      setTimeout(() => {
        setStep(next);
        // Allow enter animation to play
        setTimeout(() => setAnimating(false), 30);
      }, 200);
    },
    [animating]
  );

  const next = useCallback(() => goTo(step + 1, "forward"), [goTo, step]);
  const back = useCallback(() => goTo(step - 1, "backward"), [goTo, step]);

  const handleFinish = () => {
    startTransition(() => {
      router.push("/dashboard");
    });
  };

  // Determine translate direction for animation
  const translateClass = animating
    ? direction === "forward"
      ? "opacity-0 translate-x-8"
      : "opacity-0 -translate-x-8"
    : "opacity-100 translate-x-0";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Progress bar — hidden on welcome step */}
      {step > 1 && (
        <div className="sticky top-0 z-10 bg-background/80 px-6 pb-2 pt-4 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-medium text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100)}%
            </span>
          </div>
          <Progress
            value={step - 1}
            max={TOTAL_STEPS - 1}
            variant="warning"
          />
        </div>
      )}

      {/* Step content with transition */}
      <div
        className={`flex flex-1 flex-col py-6 transition-all duration-200 ease-out ${translateClass}`}
      >
        {step === 1 && <StepWelcome onNext={next} />}
        {step === 2 && (
          <StepBasics
            data={form.basics}
            onChange={(basics) => setForm((f) => ({ ...f, basics }))}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 3 && (
          <StepLocation
            data={form.location}
            onChange={(location) => setForm((f) => ({ ...f, location }))}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 4 && (
          <StepSystems
            data={form.systems}
            onChange={(systems) => setForm((f) => ({ ...f, systems }))}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 5 && (
          <StepAppliances
            data={form.appliances}
            onChange={(appliances) => setForm((f) => ({ ...f, appliances }))}
            onNext={next}
            onBack={back}
          />
        )}
        {step === 6 && (
          <StepReview
            form={form}
            onBack={back}
            onFinish={handleFinish}
            isPending={isPending}
          />
        )}
      </div>
    </div>
  );
}
