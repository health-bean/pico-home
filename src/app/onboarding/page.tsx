"use client";

import { useState, useCallback, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  Home,
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

interface FormData {
  name: string;
  type: string;
  ownerRole: string;
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

const TOTAL_STEPS = 4; // Welcome is step 0 (not counted), steps 1-4

const HOME_TYPES = [
  { value: "single_family", label: "Single Family", icon: "🏡", desc: "Detached house" },
  { value: "townhouse", label: "Townhouse", icon: "🏘️", desc: "Row or attached home" },
  { value: "condo", label: "Condo", icon: "🏢", desc: "Unit in a building" },
  { value: "apartment", label: "Apartment", icon: "🏬", desc: "Rental unit" },
  { value: "multi_family", label: "Multi-Family", icon: "🏠", desc: "Duplex or triplex" },
  { value: "mobile_home", label: "Mobile Home", icon: "🏕️", desc: "Manufactured home" },
  { value: "vacation_home", label: "Vacation Home", icon: "🌴", desc: "Seasonal property" },
  { value: "rental_property", label: "Rental Property", icon: "🔑", desc: "Investment property" },
  { value: "apartment_building", label: "Apartment Building", icon: "🏗️", desc: "Multi-unit building" },
  { value: "office_commercial", label: "Office / Commercial", icon: "🏛️", desc: "Business space" },
  { value: "warehouse_industrial", label: "Warehouse / Industrial", icon: "🏭", desc: "Industrial space" },
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

interface SystemDef {
  key: string;
  mappedType: SystemType;
  icon: string;
  label: string;
  hint: string;
  multiSelect: boolean;
  iconBg: string;
  subtypes?: { value: string; label: string }[];
}

const SYSTEMS: SystemDef[] = [
  { key: "hvac", mappedType: "hvac", icon: "🌡️", label: "HVAC", hint: "Heating & cooling reminders", iconBg: "bg-[var(--color-danger-50)]", multiSelect: true,
    subtypes: [
      { value: "forced-air", label: "Forced Air" },
      { value: "radiant", label: "Radiant" },
      { value: "mini-split", label: "Mini-Split" },
      { value: "window-units", label: "Window Units" },
    ],
  },
  { key: "plumbing", mappedType: "plumbing", icon: "🚿", label: "Plumbing", hint: "Pipes, drains & water heater", iconBg: "bg-[var(--color-info-50)]", multiSelect: false },
  { key: "electrical", mappedType: "electrical", icon: "⚡", label: "Electrical", hint: "Panel, outlets & wiring", iconBg: "bg-[var(--color-warning-50)]", multiSelect: false },
  { key: "roofing", mappedType: "roofing", icon: "🏠", label: "Roofing", hint: "Roof & gutter maintenance", iconBg: "bg-[var(--color-primary-50)]", multiSelect: true,
    subtypes: [
      { value: "asphalt-shingle", label: "Asphalt Shingle" },
      { value: "metal", label: "Metal" },
      { value: "tile", label: "Tile" },
    ],
  },
  { key: "foundation", mappedType: "foundation", icon: "🧱", label: "Foundation", hint: "Structural & moisture checks", iconBg: "bg-[var(--color-neutral-100)]", multiSelect: true,
    subtypes: [
      { value: "slab", label: "Slab" },
      { value: "crawlspace", label: "Crawlspace" },
      { value: "basement", label: "Basement" },
    ],
  },
  { key: "water-source", mappedType: "water_source", icon: "💧", label: "Water Source", hint: "Water quality & supply", iconBg: "bg-[var(--color-info-50)]", multiSelect: false,
    subtypes: [
      { value: "municipal", label: "Municipal" },
      { value: "well", label: "Well" },
    ],
  },
  { key: "sewage", mappedType: "sewage", icon: "🏗️", label: "Sewage", hint: "Sewer or septic maintenance", iconBg: "bg-[var(--color-neutral-100)]", multiSelect: false,
    subtypes: [
      { value: "sewer", label: "Sewer" },
      { value: "septic", label: "Septic" },
    ],
  },
  { key: "irrigation", mappedType: "irrigation", icon: "🌱", label: "Irrigation", hint: "Sprinkler system care", iconBg: "bg-[var(--color-success-50)]", multiSelect: false },
  { key: "pool", mappedType: "pool", icon: "🏊", label: "Pool", hint: "Pool chemicals & equipment", iconBg: "bg-[var(--color-info-50)]", multiSelect: false },
  { key: "security", mappedType: "security", icon: "🔒", label: "Security", hint: "Alarm & camera system", iconBg: "bg-[var(--color-warning-50)]", multiSelect: false },
];

interface ApplianceDef {
  key: string;
  mappedCategory: ApplianceCategory;
  icon: string;
  label: string;
  iconBg: string;
}

const APPLIANCES: ApplianceDef[] = [
  { key: "refrigerator", mappedCategory: "refrigerator", icon: "🧊", label: "Refrigerator", iconBg: "bg-[var(--color-info-50)]" },
  { key: "dishwasher", mappedCategory: "dishwasher", icon: "🍽️", label: "Dishwasher", iconBg: "bg-[var(--color-primary-50)]" },
  { key: "washing-machine", mappedCategory: "washing_machine", icon: "👕", label: "Washing Machine", iconBg: "bg-[var(--color-info-50)]" },
  { key: "dryer", mappedCategory: "dryer", icon: "🌀", label: "Dryer", iconBg: "bg-[var(--color-warning-50)]" },
  { key: "oven-range", mappedCategory: "oven_range", icon: "🍳", label: "Oven / Range", iconBg: "bg-[var(--color-danger-50)]" },
  { key: "microwave", mappedCategory: "microwave", icon: "📡", label: "Microwave", iconBg: "bg-[var(--color-neutral-100)]" },
  { key: "garbage-disposal", mappedCategory: "garbage_disposal", icon: "♻️", label: "Garbage Disposal", iconBg: "bg-[var(--color-success-50)]" },
  { key: "water-heater", mappedCategory: "water_heater", icon: "🔥", label: "Water Heater", iconBg: "bg-[var(--color-danger-50)]" },
  { key: "furnace", mappedCategory: "furnace", icon: "🌬️", label: "Furnace", iconBg: "bg-[var(--color-warning-50)]" },
  { key: "ac-unit", mappedCategory: "ac_unit", icon: "❄️", label: "AC Unit", iconBg: "bg-[var(--color-info-50)]" },
  { key: "water-softener", mappedCategory: "water_softener", icon: "💦", label: "Water Softener", iconBg: "bg-[var(--color-info-50)]" },
  { key: "garage-door", mappedCategory: "garage_door", icon: "🚗", label: "Garage Door", iconBg: "bg-[var(--color-neutral-100)]" },
  { key: "sump-pump", mappedCategory: "sump_pump", icon: "🔧", label: "Sump Pump", iconBg: "bg-[var(--color-neutral-100)]" },
  { key: "generator", mappedCategory: "generator", icon: "⚙️", label: "Generator", iconBg: "bg-[var(--color-warning-50)]" },
  { key: "hot-tub", mappedCategory: "hot_tub", icon: "♨️", label: "Hot Tub", iconBg: "bg-[var(--color-danger-50)]" },
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

function SelectionCard({
  selected,
  onClick,
  icon,
  iconBg = "bg-[var(--color-primary-50)]",
  label,
  description,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 p-3.5 bg-white rounded-2xl border-2 cursor-pointer transition-all w-full text-left ${
        selected
          ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]"
          : "border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]"
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-[#1c1917] block">{label}</span>
        {description && (
          <span className="text-xs text-[var(--color-neutral-400)]">{description}</span>
        )}
        {children}
      </div>
      <SelectionCheckmark selected={selected} />
    </button>
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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-5 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-primary-50)]">
        <Home className="h-10 w-10 text-[var(--color-primary-500)]" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-extrabold text-[#1c1917] tracking-tight">
          Let&apos;s set up your home
        </h1>
        <p className="mx-auto max-w-sm text-sm text-[var(--color-neutral-400)] leading-relaxed">
          Answer a few quick questions and we&apos;ll build a personalized maintenance
          plan you can customize.
        </p>
      </div>
      <ContinueButton onClick={onNext}>
        Get Started
      </ContinueButton>
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
  currentStep,
}: {
  data: FormData;
  onChange: (d: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  currentStep: number;
}) {
  const climateZone = data.state ? CLIMATE_ZONES[data.state] ?? "" : "";
  const canProceed =
    data.name.trim() !== "" &&
    data.type !== "" &&
    data.yearBuilt !== "" &&
    data.zip.trim().length >= 5 &&
    data.state !== "";

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

        {/* Property Type as selection cards */}
        <div>
          <FormLabel>Property Type</FormLabel>
          <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto">
            {HOME_TYPES.map((ht) => (
              <SelectionCard
                key={ht.value}
                selected={data.type === ht.value}
                onClick={() => onChange({ type: ht.value })}
                icon={ht.icon}
                iconBg="bg-[var(--color-primary-50)]"
                label={ht.label}
                description={ht.desc}
              />
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
            label="Year Built"
            type="number"
            placeholder="e.g., 1995"
            value={data.yearBuilt}
            onChange={(e) => onChange({ yearBuilt: e.target.value })}
          />
          <FormInput
            label="Square Footage"
            type="number"
            placeholder="Optional"
            value={data.sqft}
            onChange={(e) => onChange({ sqft: e.target.value })}
          />
        </div>

        <div className="h-px bg-[var(--color-neutral-200)]" />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Zip Code"
            placeholder="12345"
            value={data.zip}
            onChange={(e) => onChange({ zip: e.target.value })}
            maxLength={10}
          />
          <FormSelect
            label="State"
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
// Step 3: Systems & Appliances (combined)
// ---------------------------------------------------------------------------

function StepSystemsAndAppliances({
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
      next = current.includes(subtype)
        ? current.filter((v) => v !== subtype)
        : [...current, subtype];
    } else {
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
  const applianceCount = Object.values(data.appliances).filter(Boolean).length;

  return (
    <>
      <StepTitle
        title="What's in Your Home?"
        subtitle="Select what applies. We'll create relevant maintenance tasks for each."
      />

      {/* Systems */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-400)] mb-3">
          Systems
        </p>
        <div className="flex flex-col gap-2.5">
          {SYSTEMS.map((sys) => {
            const entry = data.systems[sys.key];
            return (
              <div key={sys.key}>
                <SelectionCard
                  selected={entry.enabled}
                  onClick={() => toggleSystem(sys.key)}
                  icon={sys.icon}
                  iconBg={sys.iconBg}
                  label={sys.label}
                  description={sys.hint}
                />
                {/* Subtype pills when expanded */}
                {entry.enabled && sys.subtypes && (
                  <div className="mt-1 ml-[52px] flex flex-wrap items-center gap-1.5 pb-1">
                    {sys.subtypes.map((st) => (
                      <button
                        key={st.value}
                        type="button"
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                          entry.subtypes.includes(st.value)
                            ? "bg-[var(--color-primary-500)] text-white"
                            : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-200)]"
                        }`}
                        onClick={() => toggleSubtype(sys.key, st.value, sys.multiSelect)}
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

      {/* Appliances */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-400)] mb-3">
          Major Appliances
        </p>
        <div className="flex flex-col gap-2.5">
          {APPLIANCES.map((app) => {
            const active = data.appliances[app.key];
            return (
              <SelectionCard
                key={app.key}
                selected={active}
                onClick={() => toggleAppliance(app.key)}
                icon={app.icon}
                iconBg={app.iconBg}
                label={app.label}
              />
            );
          })}
        </div>
      </div>

      {/* Summary pill */}
      <div className="rounded-xl border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-3 text-center">
        <span className="text-xs font-medium text-[var(--color-neutral-400)]">
          {systemCount} system{systemCount !== 1 ? "s" : ""}
          {" "}and {applianceCount} appliance{applianceCount !== 1 ? "s" : ""} selected
        </span>
      </div>

      <ContinueButton onClick={onNext} />
      <BackButton onClick={onBack} />
      <StepIndicator current={currentStep} total={TOTAL_STEPS} />
    </>
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
    <div className={`rounded-xl border-2 p-3.5 transition-all ${
      setup.state === "skip"
        ? "border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] opacity-50"
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
  isPending,
  currentStep,
}: {
  form: FormData;
  taskSetups: Record<string, TaskSetup>;
  onUpdateTask: (templateId: string, update: Partial<TaskSetup>) => void;
  onBack: () => void;
  onFinish: () => void;
  isPending: boolean;
  currentStep: number;
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
      <div className="flex items-center gap-3 rounded-2xl border-2 border-[var(--color-primary-500)]/30 bg-[var(--color-primary-50)] p-3.5 mb-4">
        <span className="text-2xl font-extrabold text-[var(--color-primary-500)]">{activeCount}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1c1917]">
            task{activeCount !== 1 ? "s" : ""} selected
          </p>
          <p className="text-xs text-[var(--color-neutral-400)]">
            {doneCount > 0 && `${doneCount} already done · `}
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
            <div key={cat} className="rounded-2xl border-2 border-[var(--color-neutral-200)] overflow-hidden">
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
              ownerRole: form.ownerRole,
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
        // Still navigate on error for now
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

  // Map step numbers: step 1 = welcome (no progress), steps 2-4 = wizard steps 1-3
  const wizardStep = step - 1; // 0 for welcome, 1-3 for wizard

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
          <StepBasicsAndLocation
            data={form}
            onChange={updateForm}
            onNext={next}
            onBack={back}
            currentStep={wizardStep}
          />
        )}
        {step === 3 && (
          <StepSystemsAndAppliances
            data={form}
            onChange={updateForm}
            onNext={next}
            onBack={back}
            currentStep={wizardStep}
          />
        )}
        {step === 4 && (
          <StepPlanPreview
            form={form}
            taskSetups={taskSetups}
            onUpdateTask={updateTaskSetup}
            onBack={back}
            onFinish={handleFinish}
            isPending={isPending}
            currentStep={wizardStep}
          />
        )}
      </div>
    </div>
  );
}
