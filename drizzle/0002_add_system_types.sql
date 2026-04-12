-- Add new system types for major systems onboarding
ALTER TYPE "public"."system_type" ADD VALUE IF NOT EXISTS 'solar';

-- Add new appliance categories for heating/cooling equipment
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'heat_pump';
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'boiler';
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'fireplace';
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'mini_split';
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'evap_cooler';
ALTER TYPE "public"."appliance_category" ADD VALUE IF NOT EXISTS 'solar_panels';
