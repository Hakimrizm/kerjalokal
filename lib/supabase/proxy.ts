import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

function dashboardForRole(role: string | undefined) {
  if (role === "job_seeker") return "/dashboard/pencari-kerja";
  if (role === "employer") return "/dashboard/pelaku-usaha";
  if (role === "admin" || role === "super_admin" || role === "fraud_admin") {
    return "/admin";
  }
  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!hasEnvVars) return supabaseResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh and validate the Supabase session before making routing decisions.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  const pathname = request.nextUrl.pathname;

  // A signed-in user should not return to Login/Register, including via browser Back.
  const isAuthEntryRoute =
    pathname === "/auth/login" ||
    pathname === "/auth/admin-login" ||
    pathname === "/auth/sign-up" ||
    pathname.startsWith("/auth/sign-up/") ||
    pathname === "/auth/sign-up-success";

  if (userId && isAuthEntryRoute) {
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const destination = dashboardForRole(roleRow?.role);
    if (destination) {
      const url = request.nextUrl.clone();
      url.pathname = destination;
      url.search = "";
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });
      return redirectResponse;
    }
  }

  // Landing page and published job pages are public. All dashboards and other
  // application pages still require a valid Supabase session.
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/lowongan" ||
    pathname.startsWith("/lowongan/") ||
    pathname.startsWith("/auth/");

  if (!userId && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
