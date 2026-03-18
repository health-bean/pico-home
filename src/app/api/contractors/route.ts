import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { contractors } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { createContractorSchema } from "@/lib/api/schemas";

// ─── GET /api/contractors?homeId=... ─────────────────────────────────────────
// List all contractors for the authenticated user, authorized via home membership.

export const GET = apiHandler(async ({ user, request }) => {
  const { searchParams } = new URL(request.url);
  const homeId = searchParams.get("homeId") ?? undefined;
  const home = await getUserHome(user.id, homeId);

  if (!home) {
    return NextResponse.json({ contractors: [] });
  }

  const results = await db
    .select()
    .from(contractors)
    .where(eq(contractors.userId, user.id))
    .orderBy(contractors.name);

  return NextResponse.json({ contractors: results, homeId: home.id });
});

// ─── POST /api/contractors ───────────────────────────────────────────────────
// Create a new contractor. User must be a member of the specified home.

export const POST = apiHandler(async ({ user, request }) => {
  const body = await parseBody(request, createContractorSchema);
  const home = await getUserHome(user.id, body.homeId);

  if (!home) {
    return NextResponse.json(
      { error: "Home not found or access denied" },
      { status: 403 }
    );
  }

  const [contractor] = await db
    .insert(contractors)
    .values({
      userId: user.id,
      name: body.name,
      company: body.company || null,
      phone: body.phone || null,
      email: body.email || null,
      specialty: body.specialty || null,
      notes: body.notes || null,
      rating: body.rating || null,
    })
    .returning();

  return NextResponse.json({ contractor }, { status: 201 });
});

// ─── DELETE /api/contractors?id=... ──────────────────────────────────────────
// Delete a contractor. Must belong to the authenticated user.

export const DELETE = apiHandler(async ({ user, request }) => {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing required query parameter: id" },
      { status: 400 }
    );
  }

  // Verify the contractor belongs to this user
  const [existing] = await db
    .select({ id: contractors.id, userId: contractors.userId })
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      { error: "Contractor not found" },
      { status: 404 }
    );
  }

  if (existing.userId !== user.id) {
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 }
    );
  }

  await db
    .delete(contractors)
    .where(and(eq(contractors.id, id), eq(contractors.userId, user.id)));

  return NextResponse.json({ success: true });
});
