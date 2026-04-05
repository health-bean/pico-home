import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api/handler";

export const GET = apiHandler(async ({ user }) => {
  return NextResponse.json({
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
  });
});
