import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  time,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const homeTypeEnum = pgEnum("home_type", [
  "single_family",
  "townhouse",
  "condo",
  "apartment",
  "multi_family",
  "mobile_home",
]);

export const systemTypeEnum = pgEnum("system_type", [
  "hvac",
  "plumbing",
  "electrical",
  "roofing",
  "foundation",
  "water_source",
  "sewage",
  "irrigation",
  "pool",
  "security",
]);

export const roomTypeEnum = pgEnum("room_type", [
  "kitchen",
  "bathroom",
  "bedroom",
  "living_room",
  "dining_room",
  "basement",
  "attic",
  "garage",
  "laundry",
  "office",
  "outdoor",
  "other",
]);

export const applianceCategoryEnum = pgEnum("appliance_category", [
  "refrigerator",
  "dishwasher",
  "washing_machine",
  "dryer",
  "oven_range",
  "microwave",
  "garbage_disposal",
  "water_heater",
  "furnace",
  "ac_unit",
  "water_softener",
  "water_filter",
  "humidifier",
  "dehumidifier",
  "garage_door",
  "pool_pump",
  "sump_pump",
  "generator",
  "other",
]);

export const taskCategoryEnum = pgEnum("task_category", [
  "hvac",
  "plumbing",
  "electrical",
  "safety",
  "roof_gutters",
  "exterior",
  "windows_doors",
  "appliance",
  "lawn_landscape",
  "pest_control",
  "garage",
  "pool",
  "cleaning",
  "seasonal",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "safety",
  "prevent_damage",
  "efficiency",
  "cosmetic",
]);

export const frequencyUnitEnum = pgEnum("frequency_unit", [
  "days",
  "weeks",
  "months",
  "years",
  "one_time",
]);

export const diyDifficultyEnum = pgEnum("diy_difficulty", [
  "easy",
  "moderate",
  "hard",
  "professional",
]);

export const contractorSpecialtyEnum = pgEnum("contractor_specialty", [
  "general",
  "hvac",
  "plumbing",
  "electrical",
  "roofing",
  "landscaping",
  "pest_control",
  "cleaning",
  "painting",
  "flooring",
  "appliance_repair",
  "other",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "warranty",
  "manual",
  "receipt",
  "inspection_report",
  "insurance",
  "permit",
  "photo",
  "other",
]);

// ─── Tables ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  timezone: varchar("timezone", { length: 64 }).default("America/New_York"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const homes = pgTable(
  "homes",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    type: homeTypeEnum("type"),
    yearBuilt: integer("year_built"),
    squareFootage: integer("square_footage"),
    climateZone: varchar("climate_zone", { length: 10 }),
    addressLine1: varchar("address_line1", { length: 255 }),
    addressLine2: varchar("address_line2", { length: 255 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 50 }),
    zipCode: varchar("zip_code", { length: 20 }),
    country: varchar("country", { length: 2 }).default("US"),
    ownershipDate: date("ownership_date"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("homes_user_id_idx").on(table.userId),
  }),
);

export const homeSystems = pgTable(
  "home_systems",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    homeId: uuid("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    systemType: systemTypeEnum("system_type").notNull(),
    subtype: varchar("subtype", { length: 100 }),
    details: jsonb("details"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    homeIdIdx: index("home_systems_home_id_idx").on(table.homeId),
  }),
);

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    homeId: uuid("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    type: roomTypeEnum("type"),
    floor: integer("floor"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    homeIdIdx: index("rooms_home_id_idx").on(table.homeId),
  }),
);

export const appliances = pgTable(
  "appliances",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    homeId: uuid("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => rooms.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    category: applianceCategoryEnum("category"),
    brand: varchar("brand", { length: 100 }),
    model: varchar("model", { length: 100 }),
    serialNumber: varchar("serial_number", { length: 100 }),
    purchaseDate: date("purchase_date"),
    warrantyExpiry: date("warranty_expiry"),
    manualUrl: text("manual_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    homeIdIdx: index("appliances_home_id_idx").on(table.homeId),
  }),
);

export const taskTemplates = pgTable("task_templates", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: taskCategoryEnum("category").notNull(),
  priority: taskPriorityEnum("priority").notNull(),
  defaultFrequencyValue: integer("default_frequency_value").notNull(),
  defaultFrequencyUnit: frequencyUnitEnum("default_frequency_unit").notNull(),
  estimatedMinutes: integer("estimated_minutes"),
  estimatedCostLow: integer("estimated_cost_low"),
  estimatedCostHigh: integer("estimated_cost_high"),
  diyDifficulty: diyDifficultyEnum("diy_difficulty"),
  applicableHomeTypes: text("applicable_home_types").array(),
  applicableSystems: text("applicable_systems").array(),
  applicableApplianceCategories: text(
    "applicable_appliance_categories",
  ).array(),
  seasonalMonths: integer("seasonal_months").array(),
  isSystemTemplate: boolean("is_system_template").default(true),
  tips: text("tips"),
  whyItMatters: text("why_it_matters"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const taskInstances = pgTable(
  "task_instances",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    homeId: uuid("home_id")
      .notNull()
      .references(() => homes.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => taskTemplates.id, {
      onDelete: "set null",
    }),
    applianceId: uuid("appliance_id").references(() => appliances.id, {
      onDelete: "set null",
    }),
    roomId: uuid("room_id").references(() => rooms.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: taskCategoryEnum("category").notNull(),
    priority: taskPriorityEnum("priority").notNull(),
    frequencyUnit: frequencyUnitEnum("frequency_unit").notNull(),
    frequencyValue: integer("frequency_value").notNull(),
    nextDueDate: date("next_due_date").notNull(),
    lastCompletedDate: date("last_completed_date"),
    isActive: boolean("is_active").default(true),
    isCustom: boolean("is_custom").default(false),
    notificationDaysBefore: integer("notification_days_before").default(3),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    homeIdIdx: index("task_instances_home_id_idx").on(table.homeId),
    templateIdIdx: index("task_instances_template_id_idx").on(
      table.templateId,
    ),
  }),
);

export const contractors = pgTable(
  "contractors",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    company: varchar("company", { length: 255 }),
    specialty: contractorSpecialtyEnum("specialty"),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 255 }),
    website: text("website"),
    rating: integer("rating"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("contractors_user_id_idx").on(table.userId),
  }),
);

export const taskCompletions = pgTable(
  "task_completions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    taskInstanceId: uuid("task_instance_id")
      .notNull()
      .references(() => taskInstances.id, { onDelete: "cascade" }),
    completedBy: uuid("completed_by")
      .notNull()
      .references(() => users.id),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    costCents: integer("cost_cents"),
    contractorId: uuid("contractor_id").references(() => contractors.id, {
      onDelete: "set null",
    }),
    isDiy: boolean("is_diy").default(true),
    timeSpentMinutes: integer("time_spent_minutes"),
    notes: text("notes"),
    photos: text("photos").array(),
    skipped: boolean("skipped").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    taskInstanceIdIdx: index("task_completions_task_instance_id_idx").on(
      table.taskInstanceId,
    ),
  }),
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    homeId: uuid("home_id").references(() => homes.id, {
      onDelete: "set null",
    }),
    applianceId: uuid("appliance_id").references(() => appliances.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    type: documentTypeEnum("type"),
    fileUrl: text("file_url").notNull(),
    fileSizeBytes: integer("file_size_bytes"),
    mimeType: varchar("mime_type", { length: 100 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    userIdIdx: index("documents_user_id_idx").on(table.userId),
  }),
);

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  pushEnabled: boolean("push_enabled").default(true),
  emailEnabled: boolean("email_enabled").default(false),
  reminderTime: time("reminder_time").default("09:00"),
  reminderDaysBefore: integer("reminder_days_before")
    .array()
    .default(sql`'{1,3,7}'`),
  weeklyDigest: boolean("weekly_digest").default(true),
  weeklyDigestDay: integer("weekly_digest_day").default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const homeHealthScores = pgTable("home_health_scores", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  homeId: uuid("home_id")
    .notNull()
    .references(() => homes.id, { onDelete: "cascade" }),
  score: integer("score").notNull(),
  safetyScore: integer("safety_score").notNull(),
  maintenanceScore: integer("maintenance_score").notNull(),
  efficiencyScore: integer("efficiency_score").notNull(),
  calculatedAt: timestamp("calculated_at", { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  homes: many(homes),
  contractors: many(contractors),
  documents: many(documents),
  taskCompletions: many(taskCompletions),
  notificationPreferences: one(notificationPreferences),
  pushSubscriptions: many(pushSubscriptions),
}));

export const homesRelations = relations(homes, ({ one, many }) => ({
  user: one(users, { fields: [homes.userId], references: [users.id] }),
  rooms: many(rooms),
  appliances: many(appliances),
  homeSystems: many(homeSystems),
  taskInstances: many(taskInstances),
  documents: many(documents),
  healthScores: many(homeHealthScores),
}));

export const homeSystemsRelations = relations(homeSystems, ({ one }) => ({
  home: one(homes, {
    fields: [homeSystems.homeId],
    references: [homes.id],
  }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  home: one(homes, { fields: [rooms.homeId], references: [homes.id] }),
  appliances: many(appliances),
  taskInstances: many(taskInstances),
}));

export const appliancesRelations = relations(appliances, ({ one, many }) => ({
  home: one(homes, {
    fields: [appliances.homeId],
    references: [homes.id],
  }),
  room: one(rooms, {
    fields: [appliances.roomId],
    references: [rooms.id],
  }),
  taskInstances: many(taskInstances),
  documents: many(documents),
}));

export const taskTemplatesRelations = relations(taskTemplates, ({ many }) => ({
  instances: many(taskInstances),
}));

export const taskInstancesRelations = relations(
  taskInstances,
  ({ one, many }) => ({
    home: one(homes, {
      fields: [taskInstances.homeId],
      references: [homes.id],
    }),
    template: one(taskTemplates, {
      fields: [taskInstances.templateId],
      references: [taskTemplates.id],
    }),
    appliance: one(appliances, {
      fields: [taskInstances.applianceId],
      references: [appliances.id],
    }),
    room: one(rooms, {
      fields: [taskInstances.roomId],
      references: [rooms.id],
    }),
    completions: many(taskCompletions),
  }),
);

export const taskCompletionsRelations = relations(
  taskCompletions,
  ({ one }) => ({
    taskInstance: one(taskInstances, {
      fields: [taskCompletions.taskInstanceId],
      references: [taskInstances.id],
    }),
    user: one(users, {
      fields: [taskCompletions.completedBy],
      references: [users.id],
    }),
    contractor: one(contractors, {
      fields: [taskCompletions.contractorId],
      references: [contractors.id],
    }),
  }),
);

export const contractorsRelations = relations(contractors, ({ one, many }) => ({
  user: one(users, {
    fields: [contractors.userId],
    references: [users.id],
  }),
  taskCompletions: many(taskCompletions),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  home: one(homes, {
    fields: [documents.homeId],
    references: [homes.id],
  }),
  appliance: one(appliances, {
    fields: [documents.applianceId],
    references: [appliances.id],
  }),
}));

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
  }),
);

export const pushSubscriptionsRelations = relations(
  pushSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [pushSubscriptions.userId],
      references: [users.id],
    }),
  }),
);

export const homeHealthScoresRelations = relations(
  homeHealthScores,
  ({ one }) => ({
    home: one(homes, {
      fields: [homeHealthScores.homeId],
      references: [homes.id],
    }),
  }),
);
