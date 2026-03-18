import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  users,
  homes,
  homeMembers,
  homeSystems,
  appliances,
  taskInstances,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getApplicableTemplates, getNextDueDate } from "@/lib/tasks/scheduling";
import type { HomeType, SystemType, ApplianceCategory } from "@/lib/tasks/templates";
import { onboardingSchema } from "@/lib/api/schemas";
import { rateLimit, RATE_LIMITS } from "@/lib/api/rate-limit";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit onboarding (sensitive — creates many records)
    const rl = rateLimit(`${authUser.id}:onboarding`, RATE_LIMITS.sensitive);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Validate input
    const raw = await request.json();
    const body = onboardingSchema.parse(raw);

    // Upsert our app user record
    let [appUser] = await db
      .select()
      .from(users)
      .where(eq(users.authId, authUser.id));

    if (!appUser) {
      [appUser] = await db
        .insert(users)
        .values({
          authId: authUser.id,
          email: authUser.email!,
          name:
            authUser.user_metadata?.full_name ??
            authUser.email!.split("@")[0],
          avatarUrl: authUser.user_metadata?.avatar_url ?? null,
        })
        .returning();
    }

    // Create home
    const [home] = await db
      .insert(homes)
      .values({
        userId: appUser.id,
        name: body.home.name,
        type: body.home.type as HomeType,
        yearBuilt: body.home.yearBuilt,
        squareFootage: body.home.sqft,
        zipCode: body.home.zip,
        state: body.home.state,
        climateZone: body.home.climateZone,
        ownerRole: body.home.ownerRole as "i_live_here" | "i_manage_this",
      })
      .returning();

    // Create owner membership
    await db.insert(homeMembers).values({
      homeId: home.id,
      userId: appUser.id,
      role: "owner",
    });

    // Create home systems
    if (body.systems.length > 0) {
      await db.insert(homeSystems).values(
        body.systems.map((s) => ({
          homeId: home.id,
          systemType: s.key as SystemType,
          subtype: s.subtype,
        }))
      );
    }

    // Create appliances
    if (body.appliances.length > 0) {
      await db.insert(appliances).values(
        body.appliances.map((category) => ({
          homeId: home.id,
          name: category
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          category: category as ApplianceCategory,
        }))
      );
    }

    // Create task instances from user selections
    const activeSetups = body.taskSetups.filter((s) => s.state !== "skip");

    if (activeSetups.length > 0) {
      const templates = getApplicableTemplates({
        type: body.home.type as HomeType,
        systems: body.systems.map((s) => s.key as SystemType),
        appliances: body.appliances as ApplianceCategory[],
      });

      const templateMap = new Map(templates.map((t) => [t.id, t]));

      const taskValues = activeSetups
        .filter((setup) => templateMap.has(setup.templateId))
        .map((setup) => {
          const template = templateMap.get(setup.templateId)!;

          let lastCompletedDate: Date | null = null;
          if (setup.state === "done") {
            lastCompletedDate = new Date(
              setup.doneYear,
              setup.doneMonth - 1,
              15
            );
          }

          const nextDueDate = getNextDueDate(
            template.frequencyValue,
            template.frequencyUnit,
            lastCompletedDate ?? undefined
          );

          return {
            homeId: home.id,
            name: template.name,
            description: template.description,
            category: template.category,
            priority: template.priority,
            frequencyUnit: template.frequencyUnit,
            frequencyValue: template.frequencyValue,
            nextDueDate: nextDueDate.toISOString().split("T")[0],
            lastCompletedDate: lastCompletedDate
              ? lastCompletedDate.toISOString().split("T")[0]
              : null,
            isActive: true,
            isCustom: false,
            notificationDaysBefore: 3,
          };
        });

      if (taskValues.length > 0) {
        await db.insert(taskInstances).values(taskValues);
      }
    }

    return NextResponse.json({
      success: true,
      homeId: home.id,
      tasksCreated: activeSetups.length,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "ZodError" &&
      "issues" in error
    ) {
      const issues = (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
      return NextResponse.json(
        {
          error: "Validation error",
          details: issues.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    console.error("[Onboarding Error]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
