import { NextResponse } from "next/server";
import { getUserHomes } from "@/lib/auth/get-user-home";
import { apiHandler } from "@/lib/api/handler";

export const GET = apiHandler(async ({ user }) => {
  const homes = await getUserHomes(user.id);

  return NextResponse.json({
    homes: homes.map((h) => ({
      id: h.id,
      name: h.name,
      type: h.type,
      memberRole: h.memberRole,
      city: h.city,
      state: h.state,
      zipCode: h.zipCode,
    })),
  });
});
