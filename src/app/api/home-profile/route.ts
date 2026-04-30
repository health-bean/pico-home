import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { homeSystems, appliances, homes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";
import { z } from "zod";

const updateHomeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  yearBuilt: z.number().int().min(1600).max(new Date().getFullYear() + 5).optional().nullable(),
  squareFootage: z.number().int().min(1).max(1_000_000).optional().nullable(),
  zipCode: z.string().max(20).optional(),
  state: z.string().max(50).optional(),
});

export const GET = apiHandler(async ({ user, request }) => {
  const { searchParams } = new URL(request.url);
  const homeId = searchParams.get("homeId") ?? undefined;
  const home = await getUserHome(user.id, homeId);

  if (!home) {
    return NextResponse.json({ home: null, systems: [], appliances: [] });
  }

  const systems = await db
    .select()
    .from(homeSystems)
    .where(eq(homeSystems.homeId, home.id))
    .orderBy(homeSystems.systemType);

  const homeAppliances = await db
    .select()
    .from(appliances)
    .where(eq(appliances.homeId, home.id))
    .orderBy(appliances.category, appliances.name);

  return NextResponse.json({
    home: {
      id: home.id,
      name: home.name,
      type: home.type,
      yearBuilt: home.yearBuilt,
      squareFootage: home.squareFootage,
      state: home.state,
      zipCode: home.zipCode,
      climateZone: home.climateZone,
      memberRole: home.memberRole,
    },
    systems: systems.map((s) => ({
      id: s.id,
      systemType: s.systemType,
      subtype: s.subtype,
      notes: s.notes,
    })),
    appliances: homeAppliances.map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      brand: a.brand,
      model: a.model,
      purchaseDate: a.purchaseDate,
      warrantyExpiry: a.warrantyExpiry,
    })),
  });
});

export const PATCH = apiHandler(async ({ user, request }) => {
  const home = await getUserHome(user.id);

  if (!home) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateHomeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [updated] = await db
    .update(homes)
    .set(parsed.data)
    .where(eq(homes.id, home.id))
    .returning();

  return NextResponse.json({ home: updated });
});
