CREATE TYPE "public"."appliance_category" AS ENUM('refrigerator', 'dishwasher', 'washing_machine', 'dryer', 'oven_range', 'microwave', 'garbage_disposal', 'water_heater', 'furnace', 'ac_unit', 'water_softener', 'water_filter', 'humidifier', 'dehumidifier', 'garage_door', 'pool_pump', 'hot_tub', 'sump_pump', 'generator', 'other');--> statement-breakpoint
CREATE TYPE "public"."contractor_specialty" AS ENUM('general', 'hvac', 'plumbing', 'electrical', 'roofing', 'landscaping', 'pest_control', 'cleaning', 'painting', 'flooring', 'appliance_repair', 'other');--> statement-breakpoint
CREATE TYPE "public"."diy_difficulty" AS ENUM('easy', 'moderate', 'hard', 'professional');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('warranty', 'manual', 'receipt', 'inspection_report', 'insurance', 'permit', 'photo', 'other');--> statement-breakpoint
CREATE TYPE "public"."frequency_unit" AS ENUM('days', 'weeks', 'months', 'years', 'one_time');--> statement-breakpoint
CREATE TYPE "public"."home_invite_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."home_member_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."home_role" AS ENUM('i_live_here', 'i_manage_this');--> statement-breakpoint
CREATE TYPE "public"."home_type" AS ENUM('single_family', 'townhouse', 'condo', 'apartment', 'multi_family', 'mobile_home', 'vacation_home', 'rental_property', 'apartment_building', 'office_commercial', 'warehouse_industrial');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('kitchen', 'bathroom', 'bedroom', 'living_room', 'dining_room', 'basement', 'attic', 'garage', 'laundry', 'office', 'outdoor', 'other');--> statement-breakpoint
CREATE TYPE "public"."system_type" AS ENUM('hvac', 'plumbing', 'electrical', 'roofing', 'foundation', 'water_source', 'sewage', 'irrigation', 'pool', 'security');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('hvac', 'plumbing', 'electrical', 'safety', 'roof_gutters', 'exterior', 'windows_doors', 'appliance', 'lawn_landscape', 'pest_control', 'garage', 'pool', 'cleaning', 'seasonal');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('safety', 'prevent_damage', 'efficiency', 'cosmetic');--> statement-breakpoint
CREATE TABLE "appliances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"room_id" uuid,
	"name" varchar(255) NOT NULL,
	"category" "appliance_category",
	"brand" varchar(100),
	"model" varchar(100),
	"serial_number" varchar(100),
	"purchase_date" date,
	"warranty_expiry" date,
	"manual_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"company" varchar(255),
	"specialty" "contractor_specialty",
	"phone" varchar(30),
	"email" varchar(255),
	"website" text,
	"rating" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"home_id" uuid,
	"appliance_id" uuid,
	"name" varchar(255) NOT NULL,
	"type" "document_type",
	"file_url" text NOT NULL,
	"file_size_bytes" integer,
	"mime_type" varchar(100),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_health_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"critical_tasks_score" integer NOT NULL,
	"preventive_care_score" integer NOT NULL,
	"home_efficiency_score" integer NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"invited_email" varchar(255) NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" "home_invite_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "home_member_role" DEFAULT 'member' NOT NULL,
	"invited_by" uuid,
	"joined_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "home_systems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"system_type" "system_type" NOT NULL,
	"subtype" varchar(100),
	"details" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "home_type",
	"year_built" integer,
	"square_footage" integer,
	"climate_zone" varchar(10),
	"address_line1" varchar(255),
	"address_line2" varchar(255),
	"city" varchar(100),
	"state" varchar(50),
	"zip_code" varchar(20),
	"country" varchar(2) DEFAULT 'US',
	"owner_role" "home_role" DEFAULT 'i_live_here',
	"ownership_date" date,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"push_enabled" boolean DEFAULT true,
	"email_enabled" boolean DEFAULT false,
	"reminder_time" time DEFAULT '09:00',
	"reminder_days_before" integer[] DEFAULT '{1,3,7}',
	"weekly_digest" boolean DEFAULT true,
	"weekly_digest_day" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "room_type",
	"floor" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_instance_id" uuid NOT NULL,
	"completed_by" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"cost_cents" integer,
	"contractor_id" uuid,
	"is_diy" boolean DEFAULT true,
	"time_spent_minutes" integer,
	"notes" text,
	"photos" text[],
	"skipped" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"home_id" uuid NOT NULL,
	"template_id" uuid,
	"appliance_id" uuid,
	"room_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" "task_category" NOT NULL,
	"priority" "task_priority" NOT NULL,
	"frequency_unit" "frequency_unit" NOT NULL,
	"frequency_value" integer NOT NULL,
	"next_due_date" date NOT NULL,
	"last_completed_date" date,
	"is_active" boolean DEFAULT true,
	"is_custom" boolean DEFAULT false,
	"notification_days_before" integer DEFAULT 3,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" "task_category" NOT NULL,
	"priority" "task_priority" NOT NULL,
	"default_frequency_value" integer NOT NULL,
	"default_frequency_unit" "frequency_unit" NOT NULL,
	"estimated_minutes" integer,
	"estimated_cost_low" integer,
	"estimated_cost_high" integer,
	"diy_difficulty" "diy_difficulty",
	"applicable_home_types" text[],
	"applicable_systems" text[],
	"applicable_appliance_categories" text[],
	"seasonal_months" integer[],
	"is_system_template" boolean DEFAULT true,
	"tips" text,
	"why_it_matters" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"avatar_url" text,
	"timezone" varchar(64) DEFAULT 'America/New_York',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "appliances" ADD CONSTRAINT "appliances_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appliances" ADD CONSTRAINT "appliances_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_appliance_id_appliances_id_fk" FOREIGN KEY ("appliance_id") REFERENCES "public"."appliances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_health_scores" ADD CONSTRAINT "home_health_scores_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_invites" ADD CONSTRAINT "home_invites_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_invites" ADD CONSTRAINT "home_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_members" ADD CONSTRAINT "home_members_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_members" ADD CONSTRAINT "home_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_members" ADD CONSTRAINT "home_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_systems" ADD CONSTRAINT "home_systems_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homes" ADD CONSTRAINT "homes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_instance_id_task_instances_id_fk" FOREIGN KEY ("task_instance_id") REFERENCES "public"."task_instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_template_id_task_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_appliance_id_appliances_id_fk" FOREIGN KEY ("appliance_id") REFERENCES "public"."appliances"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appliances_home_id_idx" ON "appliances" USING btree ("home_id");--> statement-breakpoint
CREATE INDEX "contractors_user_id_idx" ON "contractors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "home_invites_email_idx" ON "home_invites" USING btree ("invited_email");--> statement-breakpoint
CREATE INDEX "home_members_home_id_idx" ON "home_members" USING btree ("home_id");--> statement-breakpoint
CREATE INDEX "home_members_user_id_idx" ON "home_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "home_members_unique_idx" ON "home_members" USING btree ("home_id","user_id");--> statement-breakpoint
CREATE INDEX "home_systems_home_id_idx" ON "home_systems" USING btree ("home_id");--> statement-breakpoint
CREATE INDEX "homes_user_id_idx" ON "homes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rooms_home_id_idx" ON "rooms" USING btree ("home_id");--> statement-breakpoint
CREATE INDEX "task_completions_task_instance_id_idx" ON "task_completions" USING btree ("task_instance_id");--> statement-breakpoint
CREATE INDEX "task_instances_home_id_idx" ON "task_instances" USING btree ("home_id");--> statement-breakpoint
CREATE INDEX "task_instances_template_id_idx" ON "task_instances" USING btree ("template_id");