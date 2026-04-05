import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { homeSystems, appliances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";

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
      addressLine1: home.addressLine1,
      city: home.city,
      state: home.state,
      zipCode: home.zipCode,
      ownerRole: home.ownerRole,
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
