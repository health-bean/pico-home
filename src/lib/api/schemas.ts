import { z } from "zod";

// ─── Shared enums (match DB enums exactly) ─────────────────────────────────

const taskCategoryValues = [
  "safety", "heating_cooling", "plumbing", "power",
  "exterior_structure", "lawn_outdoors", "appliances",
] as const;

const taskPriorityValues = [
  "safety", "prevent_damage", "efficiency", "cosmetic",
] as const;

const frequencyUnitValues = [
  "days", "weeks", "months", "years", "one_time",
] as const;

const homeTypeValues = [
  "single_family", "townhouse", "condo",
] as const;

const systemTypeValues = [
  "hvac", "plumbing", "electrical", "roofing", "foundation",
  "water_source", "sewage", "irrigation", "pool", "security", "solar",
] as const;

const applianceCategoryValues = [
  "refrigerator", "dishwasher", "washing_machine", "dryer", "oven_range",
  "microwave", "garbage_disposal", "water_heater", "furnace", "ac_unit",
  "water_softener", "water_filter", "humidifier", "dehumidifier",
  "garage_door", "pool_pump", "hot_tub", "sump_pump", "generator",
  "heat_pump", "boiler", "fireplace", "mini_split", "evap_cooler", "solar_panels",
  "other",
] as const;

// ─── API Schemas ────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  homeId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  category: z.enum(taskCategoryValues).default("appliances"),
  priority: z.enum(taskPriorityValues).default("efficiency"),
  frequencyUnit: z.enum(frequencyUnitValues).default("months"),
  frequencyValue: z.number().int().min(1).max(365).default(1),
  notes: z.string().max(2000).optional().nullable(),
});

export const completeTaskSchema = z.object({
  isDiy: z.boolean().default(true),
  costCents: z.number().int().min(0).max(10_000_000).optional().nullable(),
  timeSpentMinutes: z.number().int().min(0).max(10_000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const snoozeTaskSchema = z.object({
  days: z.number().int().min(1).max(365).default(7),
});

export const inviteSchema = z.object({
  email: z.string().email().max(255).transform((v) => v.trim().toLowerCase()),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
});

export const onboardingHomeSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(homeTypeValues),
  yearBuilt: z.number().int().min(1600).max(new Date().getFullYear() + 5).optional().nullable(),
  sqft: z.number().int().min(1).max(1_000_000).optional().nullable(),
  zip: z.string().max(20).default(""),
  state: z.string().max(50).default(""),
  climateZone: z.string().max(10).default(""),
});

export const onboardingSystemSchema = z.object({
  key: z.enum(systemTypeValues),
  subtype: z.string().max(100),
});

export const onboardingTaskSetupSchema = z.object({
  templateId: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Invalid template ID format"),
  state: z.enum(["track", "done", "skip"]),
  doneMonth: z.number().int().min(1).max(12),
  doneYear: z.number().int().min(2000).max(new Date().getFullYear() + 1),
});

export const householdHealthSchema = z.object({
  hasAllergies: z.boolean().default(false),
  hasYoungChildren: z.boolean().default(false),
  hasPets: z.boolean().default(false),
  hasElderly: z.boolean().default(false),
  hasImmunocompromised: z.boolean().default(false),
  prioritizeAirQuality: z.boolean().default(false),
  prioritizeEnergyEfficiency: z.boolean().default(false),
});

export type HouseholdHealthInput = z.infer<typeof householdHealthSchema>;

export const onboardingSchema = z.object({
  home: onboardingHomeSchema,
  systems: z.array(onboardingSystemSchema).max(50),
  appliances: z.array(z.enum(applianceCategoryValues)).max(50),
  taskSetups: z.array(onboardingTaskSetupSchema).max(500),
  householdHealth: householdHealthSchema.optional(),
});

export const updateNotificationPreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  reminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:MM format")
    .optional(),
  reminderDaysBefore: z
    .array(z.number().int().min(1).max(30))
    .max(10)
    .optional(),
  weeklyDigest: z.boolean().optional(),
  weeklyDigestDay: z.number().int().min(0).max(6).optional(),
});

const contractorSpecialtyValues = [
  "general", "hvac", "plumbing", "electrical", "roofing", "landscaping",
  "pest_control", "cleaning", "painting", "flooring", "appliance_repair", "other",
] as const;

// Phone validation: allows international format with digits, spaces, dashes,
// parentheses, and an optional leading +. 7-20 chars after stripping formatting.
const phoneRegex = /^\+?[\d\s\-().]{7,30}$/;

export const createContractorSchema = z.object({
  homeId: z.string().uuid(),
  name: z.string().min(1).max(255),
  company: z.string().max(255).optional().nullable(),
  phone: z
    .string()
    .max(30)
    .regex(phoneRegex, "Invalid phone number format")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z.string().email().max(255).optional().nullable().or(z.literal("")),
  specialty: z.enum(contractorSpecialtyValues).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});

// ─── Types ──────────────────────────────────────────────────────────────────

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
export type SnoozeTaskInput = z.infer<typeof snoozeTaskSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
export type CreateContractorInput = z.infer<typeof createContractorSchema>;
