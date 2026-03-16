import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has completed onboarding (has a home)
      // For now, always redirect to onboarding for new users
      // TODO: check DB for existing home, redirect to dashboard if found
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // Auth error — redirect to landing page
  return NextResponse.redirect(`${origin}/?error=auth`);
}
