import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  users,
  homes,
  homeSystems,
  rooms,
  appliances,
  taskTemplates,
  taskInstances,
  taskCompletions,
  contractors,
  documents,
  notificationPreferences,
  pushSubscriptions,
  homeHealthScores,
} from "./schema";

// ─── Users ───────────────────────────────────────────────────────────────────
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// ─── Homes ───────────────────────────────────────────────────────────────────
export type Home = InferSelectModel<typeof homes>;
export type NewHome = InferInsertModel<typeof homes>;

// ─── Home Systems ────────────────────────────────────────────────────────────
export type HomeSystem = InferSelectModel<typeof homeSystems>;
export type NewHomeSystem = InferInsertModel<typeof homeSystems>;

// ─── Rooms ───────────────────────────────────────────────────────────────────
export type Room = InferSelectModel<typeof rooms>;
export type NewRoom = InferInsertModel<typeof rooms>;

// ─── Appliances ──────────────────────────────────────────────────────────────
export type Appliance = InferSelectModel<typeof appliances>;
export type NewAppliance = InferInsertModel<typeof appliances>;

// ─── Task Templates ──────────────────────────────────────────────────────────
export type TaskTemplate = InferSelectModel<typeof taskTemplates>;
export type NewTaskTemplate = InferInsertModel<typeof taskTemplates>;

// ─── Task Instances ──────────────────────────────────────────────────────────
export type TaskInstance = InferSelectModel<typeof taskInstances>;
export type NewTaskInstance = InferInsertModel<typeof taskInstances>;

// ─── Task Completions ────────────────────────────────────────────────────────
export type TaskCompletion = InferSelectModel<typeof taskCompletions>;
export type NewTaskCompletion = InferInsertModel<typeof taskCompletions>;

// ─── Contractors ─────────────────────────────────────────────────────────────
export type Contractor = InferSelectModel<typeof contractors>;
export type NewContractor = InferInsertModel<typeof contractors>;

// ─── Documents ───────────────────────────────────────────────────────────────
export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;

// ─── Notification Preferences ────────────────────────────────────────────────
export type NotificationPreference = InferSelectModel<
  typeof notificationPreferences
>;
export type NewNotificationPreference = InferInsertModel<
  typeof notificationPreferences
>;

// ─── Push Subscriptions ──────────────────────────────────────────────────────
export type PushSubscription = InferSelectModel<typeof pushSubscriptions>;
export type NewPushSubscription = InferInsertModel<typeof pushSubscriptions>;

// ─── Home Health Scores ──────────────────────────────────────────────────────
export type HomeHealthScore = InferSelectModel<typeof homeHealthScores>;
export type NewHomeHealthScore = InferInsertModel<typeof homeHealthScores>;
