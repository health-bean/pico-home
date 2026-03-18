import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Skip auth routes entirely — let the callback handler do its job
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // API routes handle their own auth, but still need session refresh
  // so that cookies stay valid across API calls
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Create Supabase client to refresh the session cookie
    let apiResponse = NextResponse.next({ request });
    const apiSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }
            apiResponse = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet) {
              apiResponse.cookies.set(name, value, options);
            }
          },
        },
      }
    );
    await apiSupabase.auth.getUser();
    return apiResponse;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect app routes — redirect to landing if not signed in
  const isAppRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/tasks") ||
    request.nextUrl.pathname.startsWith("/home-profile") ||
    request.nextUrl.pathname.startsWith("/settings");

  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // If signed in and on landing page, redirect to dashboard
  // But DON'T redirect if there's an error param (auth failed)
  if (user && request.nextUrl.pathname === "/" && !request.nextUrl.searchParams.has("error")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
