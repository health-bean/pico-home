"use client";

import { useState, useCallback, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Loader2,
} from "lucide-react";
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

interface HomeItem {
  key: string;
  label: string;
  icon: string;
  type: "system" | "appliance";
  mappedSystem?: SystemType;
  mappedAppliance?: ApplianceCategory;
  subtypes?: { value: string; label: string }[];
  allowOtherSubtype?: boolean;
}

interface HomeItemGroup {
  label: string;
  items: HomeItem[];
}

interface FormData {
  name: string;
  type: string;
  ownerRole: string;
  yearBuilt: string;
  sqft: string;
  zip: string;
  state: string;
  selectedItems: Record<string, { enabled: boolean; subtypes: string[]; otherSubtype: string }>;
  healthFlags: Record<string, boolean>;
  otherNotes: string;
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

const TOTAL_STEPS = 5; // Welcome is step 0 (not counted), steps 1-5

const HOME_TYPES = [
  { value: "single_family", label: "Single Family", icon: "\u{1F3E1}", desc: "Detached house" },
  { value: "townhouse", label: "Townhouse", icon: "\u{1F3D8}\uFE0F", desc: "Row or attached home" },
  { value: "condo", label: "Condo", icon: "\u{1F3E2}", desc: "Unit in a building" },
  { value: "apartment", label: "Apartment", icon: "\u{1F3EC}", desc: "Rental unit" },
  { value: "multi_family", label: "Multi-Family", icon: "\u{1F3E0}", desc: "Duplex or triplex" },
  { value: "mobile_home", label: "Mobile Home", icon: "\u{1F3D5}\uFE0F", desc: "Manufactured home" },
  { value: "vacation_home", label: "Vacation Home", icon: "\u{1F334}", desc: "Seasonal property" },
  { value: "rental_property", label: "Rental Property", icon: "\u{1F511}", desc: "Investment property" },
  { value: "apartment_building", label: "Apartment Building", icon: "\u{1F3D7}\uFE0F", desc: "Multi-unit building" },
  { value: "office_commercial", label: "Office / Commercial", icon: "\u{1F3DB}\uFE0F", desc: "Business space" },
  { value: "warehouse_industrial", label: "Warehouse / Industrial", icon: "\u{1F3ED}", desc: "Industrial space" },
];

const OWNER_ROLES = [
  { value: "i_live_here", label: "I live here" },
  { value: "i_manage_this", label: "I own/manage this property" },
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

const HOME_ITEM_GROUPS: HomeItemGroup[] = [
  {
    label: "Heating & Cooling",
    items: [
      { key: "hvac", label: "Central HVAC", icon: "\u{1F321}\uFE0F", type: "system", mappedSystem: "hvac",
        subtypes: [
          { value: "forced-air", label: "Forced Air" },
          { value: "radiant", label: "Radiant" },
          { value: "mini-split", label: "Mini-Split" },
          { value: "window-units", label: "Window Units" },
        ],
      },
      { key: "furnace", label: "Furnace", icon: "\u{1F525}", type: "appliance", mappedAppliance: "furnace" as ApplianceCategory },
      { key: "ac-unit", label: "AC Unit", icon: "\u2744\uFE0F", type: "appliance", mappedAppliance: "ac_unit" as ApplianceCategory },
    ],
  },
  {
    label: "Water & Plumbing",
    items: [
      { key: "water-heater", label: "Water Heater", icon: "\u{1F525}", type: "appliance", mappedAppliance: "water_heater" as ApplianceCategory,
        subtypes: [{ value: "tank", label: "Tank" }, { value: "tankless", label: "Tankless" }],
      },
      { key: "water-source", label: "Water Source", icon: "\u{1F4A7}", type: "system", mappedSystem: "water_source",
        subtypes: [{ value: "municipal", label: "Municipal" }, { value: "well", label: "Well" }],
      },
      { key: "sewage", label: "Sewer & Septic", icon: "\u{1F3D7}\uFE0F", type: "system", mappedSystem: "sewage",
        subtypes: [{ value: "sewer", label: "Sewer" }, { value: "septic", label: "Septic" }],
      },
      { key: "water-softener", label: "Water Softener", icon: "\u{1F4A6}", type: "appliance", mappedAppliance: "water_softener" as ApplianceCategory },
      { key: "sump-pump", label: "Sump Pump", icon: "\u{1F527}", type: "appliance", mappedAppliance: "sump_pump" as ApplianceCategory },
    ],
  },
  {
    label: "Kitchen",
    items: [
      { key: "refrigerator", label: "Refrigerator", icon: "\u{1F9CA}", type: "appliance", mappedAppliance: "refrigerator" },
      { key: "dishwasher", label: "Dishwasher", icon: "\u{1F37D}\uFE0F", type: "appliance", mappedAppliance: "dishwasher" },
      { key: "oven-range", label: "Oven / Range", icon: "\u{1F373}", type: "appliance", mappedAppliance: "oven_range" },
      { key: "microwave", label: "Microwave", icon: "\u{1F4E1}", type: "appliance", mappedAppliance: "microwave" },
      { key: "garbage-disposal", label: "Garbage Disposal", icon: "\u267B\uFE0F", type: "appliance", mappedAppliance: "garbage_disposal" },
    ],
  },
  {
    label: "Laundry",
    items: [
      { key: "washing-machine", label: "Washing Machine", icon: "\u{1F455}", type: "appliance", mappedAppliance: "washing_machine" },
      { key: "dryer", label: "Dryer", icon: "\u{1F300}", type: "appliance", mappedAppliance: "dryer" },
    ],
  },
  {
    label: "Structure",
    items: [
      { key: "roofing", label: "Roofing", icon: "\u{1F3E0}", type: "system", mappedSystem: "roofing",
        subtypes: [
          { value: "asphalt-shingle", label: "Asphalt Shingle" },
          { value: "metal", label: "Metal" },
          { value: "tile", label: "Tile" },
        ],
        allowOtherSubtype: true,
      },
      { key: "foundation", label: "Foundation", icon: "\u{1F9F1}", type: "system", mappedSystem: "foundation",
        subtypes: [
          { value: "slab", label: "Slab" },
          { value: "crawlspace", label: "Crawlspace" },
          { value: "basement", label: "Basement" },
        ],
      },
      { key: "electrical", label: "Electrical", icon: "\u26A1", type: "system", mappedSystem: "electrical" },
      { key: "plumbing", label: "Plumbing", icon: "\u{1F6BF}", type: "system", mappedSystem: "plumbing" },
    ],
  },
  {
    label: "Outdoor",
    items: [
      { key: "irrigation", label: "Sprinklers", icon: "\u{1F331}", type: "system", mappedSystem: "irrigation" },
      { key: "pool", label: "Pool / Spa", icon: "\u{1F3CA}", type: "system", mappedSystem: "pool" },
      { key: "hot-tub", label: "Hot Tub", icon: "\u2668\uFE0F", type: "appliance", mappedAppliance: "hot_tub" },
      { key: "generator", label: "Generator", icon: "\u2699\uFE0F", type: "appliance", mappedAppliance: "generator" },
      { key: "garage-door", label: "Garage Door", icon: "\u{1F697}", type: "appliance", mappedAppliance: "garage_door" },
    ],
  },
  {
    label: "Safety & Security",
    items: [
      { key: "security", label: "Security System", icon: "\u{1F512}", type: "system", mappedSystem: "security" },
    ],
  },
];

const HEALTH_OPTIONS: { key: string; label: string; icon: string; desc: string }[] = [
  { key: "hasAllergies", label: "Allergies or asthma", icon: "\u{1FAC1}", desc: "We'll increase air quality tasks" },
  { key: "hasYoungChildren", label: "Young children (under 5)", icon: "\u{1F476}", desc: "We'll add safety checks" },
  { key: "hasPets", label: "Pets", icon: "\u{1F43E}", desc: "More frequent filter changes" },
  { key: "hasElderly", label: "Elderly family (65+)", icon: "\u{1F474}", desc: "We'll add accessibility checks" },
  { key: "hasImmunocompromised", label: "Immune-compromised", icon: "\u{1F6E1}\uFE0F", desc: "Extra mold & water quality checks" },
  { key: "prioritizeAirQuality", label: "Better indoor air quality", icon: "\u{1F331}", desc: "Humidity, ventilation, radon" },
  { key: "prioritizeEnergyEfficiency", label: "Energy efficiency", icon: "\u26A1", desc: "Weatherstripping, insulation, audits" },
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

function initialSelectedItems(): Record<string, { enabled: boolean; subtypes: string[]; otherSubtype: string }> {
  const map: Record<string, { enabled: boolean; subtypes: string[]; otherSubtype: string }> = {};
  for (const group of HOME_ITEM_GROUPS) {
    for (const item of group.items) {
      map[item.key] = { enabled: false, subtypes: [], otherSubtype: "" };
    }
  }
  return map;
}

function initialHealthFlags(): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const opt of HEALTH_OPTIONS) {
    map[opt.key] = false;
  }
  return map;
}

function getActiveSystemTypes(selectedItems: FormData["selectedItems"]): SystemType[] {
  const systems: SystemType[] = [];
  for (const group of HOME_ITEM_GROUPS) {
    for (const item of group.items) {
      if (item.type === "system" && item.mappedSystem && selectedItems[item.key]?.enabled) {
        systems.push(item.mappedSystem);
      }
    }
  }
  return systems;
}

function getActiveApplianceCategories(selectedItems: FormData["selectedItems"]): ApplianceCategory[] {
  const appliances: ApplianceCategory[] = [];
  for (const group of HOME_ITEM_GROUPS) {
    for (const item of group.items) {
      if (item.type === "appliance" && item.mappedAppliance && selectedItems[item.key]?.enabled) {
        appliances.push(item.mappedAppliance);
      }
    }
  }
  return appliances;
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
// Shared UI Components
// ---------------------------------------------------------------------------

function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
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

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
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

function ContinueButton({
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

function BackButton({ onClick }: { onClick: () => void }) {
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

function SkipLink({ onClick }: { onClick: () => void }) {
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

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <p className="text-center text-xs text-[var(--color-neutral-400)] font-medium mt-3">
      Step {current} of {total}
    </p>
  );
}

function SelectionCheckmark({ selected }: { selected: boolean }) {
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

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium text-[var(--color-neutral-700)] mb-1.5 block">
      {children}
    </label>
  );
}

function FormInput({
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

function FormSelect({
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
// Step 1: Welcome
// ---------------------------------------------------------------------------

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center -mx-5 -my-6 px-8 bg-gradient-to-b from-[#fffbeb] via-[#fef3c7] to-[#fde68a]">
      <div className="flex flex-col items-center text-center max-w-xs">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/60 backdrop-blur-sm shadow-sm mb-5">
          <span className="text-3xl">{"\u{1F3E0}"}</span>
        </div>
        <h1 className="text-[26px] font-extrabold text-[#451a03] tracking-tight leading-tight">
          Let&apos;s set up your home
        </h1>
        <p className="mt-2 text-sm text-[#92400e] leading-relaxed">
          A few quick questions and we&apos;ll build a personalized maintenance plan.
        </p>
        <div className="mt-6 flex gap-4 text-center">
          {[
            { icon: "\u{1F4CB}", label: "Track" },
            { icon: "\u{1F514}", label: "Remind" },
            { icon: "\u{1F4CA}", label: "Score" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/50 text-base">
                {item.icon}
              </div>
              <span className="text-[10px] font-bold text-[#78350f]">{item.label}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onNext}
          className="w-full h-[48px] bg-[#451a03] text-white rounded-xl font-bold text-[14px] mt-8 transition-all hover:bg-[#78350f] active:scale-[0.98]"
        >
          Get Started
        </button>
        <p className="mt-3 text-[11px] text-[#92400e]">Takes about 2 minutes</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: About Your Home (Basics + Location)
// ---------------------------------------------------------------------------

function StepAboutHome({
  data,
  onChange,
  onNext,
  onBack,
  currentStep,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
}) {
  const climateZone = data.state ? CLIMATE_ZONES[data.state] ?? "" : "";
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

        {/* Owner role */}
        <div>
          <FormLabel>Your Role</FormLabel>
          <div className="flex gap-2">
            {OWNER_ROLES.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => onChange({ ownerRole: role.value })}
                className={`flex-1 h-10 rounded-xl border-2 px-3 text-sm font-semibold transition-all ${
                  data.ownerRole === role.value
                    ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[#1c1917]"
                    : "border-[var(--color-neutral-200)] text-[var(--color-neutral-400)] hover:border-[var(--color-neutral-300)]"
                }`}
              >
                {role.label}
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
      <StepIndicator current={currentStep} total={TOTAL_STEPS} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3: What's In Your Home (unified categories)
// ---------------------------------------------------------------------------

function StepWhatsInYourHome({
  data,
  onChange,
  onNext,
  onBack,
  onSkip,
  currentStep,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  currentStep: number;
}) {
  const toggleItem = (key: string) => {
    const current = data.selectedItems[key];
    onChange({
      selectedItems: {
        ...data.selectedItems,
        [key]: { ...current, enabled: !current.enabled },
      },
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

  const setOtherSubtype = (itemKey: string, value: string) => {
    const current = data.selectedItems[itemKey];
    onChange({
      selectedItems: {
        ...data.selectedItems,
        [itemKey]: { ...current, otherSubtype: value },
      },
    });
  };

  const selectedCount = Object.values(data.selectedItems).filter((s) => s.enabled).length;

  return (
    <>
      <StepTitle
        title="What's In Your Home?"
        subtitle="Select what applies — you can always add more from your home profile."
      />

      <div className="flex flex-col gap-6 mb-4">
        {HOME_ITEM_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-400)] mb-2">
              {group.label}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((item) => {
                const selection = data.selectedItems[item.key];
                const active = selection?.enabled;
                return (
                  <div key={item.key} className="col-span-1 flex flex-col">
                    <button
                      type="button"
                      onClick={() => toggleItem(item.key)}
                      className={`flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                        active
                          ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]"
                          : "border-[var(--color-neutral-200)] bg-white hover:border-[var(--color-neutral-300)]"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xs font-semibold text-[#1c1917]">{item.label}</span>
                    </button>
                    {active && item.subtypes && (
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
                        {item.allowOtherSubtype && (
                          <input
                            type="text"
                            placeholder="Other..."
                            value={selection.otherSubtype}
                            onChange={(e) => setOtherSubtype(item.key, e.target.value)}
                            className="h-6 rounded-full border border-[var(--color-neutral-200)] bg-white px-2.5 text-[11px] font-medium outline-none focus:border-[var(--color-primary-500)] w-20"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Other notes */}
      <div className="mb-2">
        <FormLabel>Anything else we should know?</FormLabel>
        <input
          type="text"
          placeholder="e.g., radiant floor heating, well water..."
          value={data.otherNotes}
          onChange={(e) => onChange({ otherNotes: e.target.value })}
          className="h-10 w-full rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 text-sm font-medium focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-[var(--color-primary-100)] outline-none transition-all"
        />
      </div>

      {/* Summary pill */}
      <div className="rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-3 text-center">
        <span className="text-xs font-medium text-[var(--color-neutral-400)]">
          {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
        </span>
      </div>

      <ContinueButton onClick={onNext} />
      <BackButton onClick={onBack} />
      <SkipLink onClick={onSkip} />
      <StepIndicator current={currentStep} total={TOTAL_STEPS} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Your Household (health flags)
// ---------------------------------------------------------------------------

function StepHousehold({
  data,
  onChange,
  onNext,
  onBack,
  onSkip,
  currentStep,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  currentStep: number;
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
      <StepIndicator current={currentStep} total={TOTAL_STEPS} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 5: Plan Preview
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
    <div className={`rounded-xl border p-3.5 transition-all ${
      setup.state === "skip"
        ? "border-[var(--color-neutral-200)] bg-[var(--color-neutral-100)] opacity-50"
        : "border-[var(--color-neutral-200)] bg-white"
    }`}>
      <div className="flex items-start gap-3">
        {/* Toggle */}
        <button
          type="button"
          onClick={() => onUpdate({ state: setup.state === "skip" ? "track" : "skip" })}
          className="mt-0.5 shrink-0"
          aria-label={setup.state !== "skip" ? "Enabled" : "Skipped"}
        >
          <SelectionCheckmark selected={setup.state !== "skip"} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#1c1917]">{template.name}</span>
            {isEssential && (
              <span className="inline-flex items-center rounded-full bg-[var(--color-danger-50)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-danger-500)]">
                Critical
              </span>
            )}
          </div>
          <span className="text-xs text-[var(--color-neutral-400)]">
            {frequencyLabel(template.frequencyValue, template.frequencyUnit)}
          </span>

          {/* Track / Already Done toggle -- only when not skipped */}
          {setup.state !== "skip" && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onUpdate({ state: "track" })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    setup.state === "track"
                      ? "bg-[var(--color-primary-500)] text-white"
                      : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-200)]"
                  }`}
                >
                  Start tracking
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate({ state: "done" })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    setup.state === "done"
                      ? "bg-[var(--color-success-500)] text-white"
                      : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-200)]"
                  }`}
                >
                  Already done
                </button>
              </div>

              {setup.state === "done" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-neutral-400)]">When?</span>
                  <select
                    value={setup.doneMonth}
                    onChange={(e) => onUpdate({ doneMonth: Number(e.target.value) })}
                    className="h-9 rounded-xl border border-[var(--color-neutral-200)] bg-white px-3 text-xs font-medium outline-none focus:border-[var(--color-primary-500)]"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <select
                    value={setup.doneYear}
                    onChange={(e) => onUpdate({ doneYear: Number(e.target.value) })}
                    className="h-9 rounded-xl border border-[var(--color-neutral-200)] bg-white px-3 text-xs font-medium outline-none focus:border-[var(--color-primary-500)]"
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
  onSkip,
  isPending,
  currentStep,
}: {
  form: FormData;
  taskSetups: Record<string, TaskSetup>;
  onUpdateTask: (templateId: string, update: Partial<TaskSetup>) => void;
  onBack: () => void;
  onFinish: () => void;
  onSkip: () => void;
  isPending: boolean;
  currentStep: number;
}) {
  const healthFlags = useMemo(() => {
    return Object.values(form.healthFlags).some(Boolean) ? form.healthFlags : undefined;
  }, [form.healthFlags]);

  const templates = useMemo(() => {
    return getApplicableTemplates({
      type: form.type as HomeType,
      systems: getActiveSystemTypes(form.selectedItems),
      appliances: getActiveApplianceCategories(form.selectedItems),
    }, healthFlags);
  }, [form, healthFlags]);

  const grouped = useMemo(() => groupTemplatesByCategory(templates), [templates]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
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
    <>
      <StepTitle
        title="Your Maintenance Plan"
        subtitle={`We found ${totalCount} tasks for your home. Customize what to track and mark anything you've already done.`}
      />

      {/* Summary bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] p-3.5 mb-4">
        <span className="text-2xl font-extrabold text-[var(--color-primary-500)]">{activeCount}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1c1917]">
            task{activeCount !== 1 ? "s" : ""} selected
          </p>
          <p className="text-xs text-[var(--color-neutral-400)]">
            {doneCount > 0 && `${doneCount} already done \u00B7 `}
            {totalCount - activeCount} skipped
          </p>
        </div>
      </div>

      {/* Category groups */}
      <div className="flex flex-col gap-2.5 mb-4">
        {CATEGORY_ORDER.filter((cat) => grouped.has(cat)).map((cat) => {
          const catTemplates = grouped.get(cat)!;
          const expanded = expandedCategories.has(cat);
          const catActiveCount = catTemplates.filter((t) => taskSetups[t.id]?.state !== "skip").length;
          const hasCritical = catTemplates.some((t) => t.priority === "safety" || t.priority === "prevent_damage");

          return (
            <div key={cat} className="rounded-2xl border border-[var(--color-neutral-200)] overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="flex w-full items-center gap-3 p-3.5 text-left hover:bg-[var(--color-neutral-50)] transition-colors"
              >
                <ChevronRight
                  className={`h-4 w-4 shrink-0 text-[var(--color-neutral-400)] transition-transform ${expanded ? "rotate-90" : ""}`}
                />
                <span className="flex-1 text-sm font-semibold text-[#1c1917]">
                  {CATEGORY_LABELS[cat]}
                </span>
                {hasCritical && (
                  <span className="inline-flex items-center rounded-full bg-[var(--color-danger-50)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-danger-500)]">
                    Has critical
                  </span>
                )}
                <span className="text-xs font-medium text-[var(--color-neutral-400)]">
                  {catActiveCount}/{catTemplates.length}
                </span>
              </button>

              {expanded && (
                <div className="flex flex-col gap-2.5 border-t border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-3">
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

      <div className="rounded-xl border border-[var(--color-info-500)]/20 bg-[var(--color-info-50)] p-3.5">
        <p className="text-xs text-[var(--color-info-700)] leading-relaxed">
          You can always add, remove, or adjust tasks later from the Tasks screen.
          Brand and model details can be added when you complete your first task for each appliance.
        </p>
      </div>

      <ContinueButton onClick={onFinish} loading={isPending}>
        Create My Plan
      </ContinueButton>
      <BackButton onClick={onBack} />
      <SkipLink onClick={onSkip} />
      <StepIndicator current={currentStep} total={TOTAL_STEPS} />
    </>
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
    ownerRole: "i_live_here",
    yearBuilt: "",
    sqft: "",
    zip: "",
    state: "",
    selectedItems: initialSelectedItems(),
    healthFlags: initialHealthFlags(),
    otherNotes: "",
  });

  const [taskSetups, setTaskSetups] = useState<Record<string, TaskSetup>>({});

  // When entering step 5, compute applicable templates and initialize setups
  const initializeTaskSetups = useCallback(() => {
    const healthFlags = Object.values(form.healthFlags).some(Boolean) ? form.healthFlags : undefined;
    const templates = getApplicableTemplates({
      type: form.type as HomeType,
      systems: getActiveSystemTypes(form.selectedItems),
      appliances: getActiveApplianceCategories(form.selectedItems),
    }, healthFlags);

    const now = new Date();
    const setups: Record<string, TaskSetup> = {};
    for (const t of templates) {
      // Preserve existing setup if re-entering this step
      if (taskSetups[t.id]) {
        setups[t.id] = taskSetups[t.id];
      } else {
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
      // Initialize task setups when entering the plan preview (step 5)
      if (next === 5 && dir === "forward") {
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

  // Convert unified selectedItems back to separate systems and appliances for the API
  const buildApiPayload = useCallback(() => {
    const systems: { key: string; subtype: string }[] = [];
    const appliances: string[] = [];

    for (const group of HOME_ITEM_GROUPS) {
      for (const item of group.items) {
        const selection = form.selectedItems[item.key];
        if (!selection?.enabled) continue;
        if (item.type === "system" && item.mappedSystem) {
          const subtypes = selection.subtypes.length > 0 ? [...selection.subtypes] : ["standard"];
          if (selection.otherSubtype) subtypes.push(selection.otherSubtype);
          for (const st of subtypes) {
            systems.push({ key: item.mappedSystem, subtype: st });
          }
        } else if (item.type === "appliance" && item.mappedAppliance) {
          appliances.push(item.mappedAppliance);
        }
      }
    }

    const householdHealth = Object.values(form.healthFlags).some(Boolean) ? form.healthFlags : undefined;

    return { systems, appliances, householdHealth };
  }, [form]);

  const handleFinish = useCallback(() => {
    startTransition(async () => {
      const { systems, appliances, householdHealth } = buildApiPayload();

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
              name: form.name.trim() || "My Home",
              type: form.type || "single_family",
              ownerRole: form.ownerRole || "i_live_here",
              yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : null,
              sqft: form.sqft ? Number(form.sqft) : null,
              zip: form.zip || "",
              state: form.state || "",
              climateZone: CLIMATE_ZONES[form.state] ?? "",
            },
            systems,
            appliances,
            taskSetups: taskSetupsList,
            householdHealth: householdHealth || undefined,
          }),
        });

        if (!res.ok) throw new Error("Failed to save");
      } catch {
        // Still navigate on error for now
        console.error("Failed to save onboarding data");
      }

      router.push("/dashboard");
    });
  }, [buildApiPayload, form, taskSetups, router, startTransition]);

  // Skip to end: submit with whatever data is collected so far
  const handleSkipToEnd = useCallback(() => {
    startTransition(async () => {
      const { systems, appliances, householdHealth } = buildApiPayload();

      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            home: {
              name: form.name.trim() || "My Home",
              type: form.type || "single_family",
              ownerRole: form.ownerRole || "i_live_here",
              yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : null,
              sqft: form.sqft ? Number(form.sqft) : null,
              zip: form.zip || "",
              state: form.state || "",
              climateZone: CLIMATE_ZONES[form.state] ?? "",
            },
            systems,
            appliances,
            taskSetups: [],
            householdHealth: householdHealth || undefined,
          }),
        });

        if (!res.ok) throw new Error("Failed to save");
      } catch {
        console.error("Failed to save onboarding data");
      }

      router.push("/dashboard");
    });
  }, [buildApiPayload, form, router, startTransition]);

  const translateClass = animating
    ? direction === "forward"
      ? "opacity-0 translate-x-8"
      : "opacity-0 -translate-x-8"
    : "opacity-100 translate-x-0";

  // Map step numbers: step 1 = welcome (no progress), steps 2-5 = wizard steps 1-4
  const wizardStep = step - 1; // 0 for welcome, 1-4 for wizard

  return (
    <div className="flex min-h-dvh flex-col bg-[#fafaf9]">
      {/* Progress bar for steps 2+ */}
      {step > 1 && (
        <div className="sticky top-0 z-10 bg-[#fafaf9]/80 px-5 pb-3 pt-4 backdrop-blur-sm">
          <ProgressBar currentStep={wizardStep} totalSteps={TOTAL_STEPS - 1} />
        </div>
      )}

      <div className={`flex flex-1 flex-col max-w-lg mx-auto w-full px-5 py-6 transition-all duration-200 ease-out ${translateClass}`}>
        {step === 1 && <StepWelcome onNext={next} />}
        {step === 2 && (
          <StepAboutHome
            data={form}
            onChange={updateForm}
            onNext={next}
            onBack={back}
            currentStep={wizardStep}
          />
        )}
        {step === 3 && (
          <StepWhatsInYourHome
            data={form}
            onChange={updateForm}
            onNext={next}
            onBack={back}
            onSkip={handleSkipToEnd}
            currentStep={wizardStep}
          />
        )}
        {step === 4 && (
          <StepHousehold
            data={form}
            onChange={updateForm}
            onNext={next}
            onBack={back}
            onSkip={handleSkipToEnd}
            currentStep={wizardStep}
          />
        )}
        {step === 5 && (
          <StepPlanPreview
            form={form}
            taskSetups={taskSetups}
            onUpdateTask={updateTaskSetup}
            onBack={back}
            onFinish={handleFinish}
            onSkip={handleSkipToEnd}
            isPending={isPending}
            currentStep={wizardStep}
          />
        )}
      </div>
    </div>
  );
}
