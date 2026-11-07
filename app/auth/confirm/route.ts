import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  // Default Supabase email template returns a PKCE authorization code.
  const code = searchParams.get("code");

  // These parameters are used if a custom email template is enabled later.
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const requestedNext = searchParams.get("next") ?? "/onboarding/job-seeker";

  // Only allow internal paths to prevent open redirects.
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/onboarding/job-seeker";

  const supabase = await createClient();

  // Flow 1: default Supabase template ({{ .ConfirmationURL }}).
  // Supabase verifies the email, then redirects here with ?code=...
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }

    const errorUrl = new URL("/auth/error", origin);
    errorUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(errorUrl);
  }

  // Flow 2: custom template using {{ .TokenHash }}.
  // Kept for compatibility if custom SMTP/template editing is enabled later.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }

    const errorUrl = new URL("/auth/error", origin);
    errorUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(errorUrl);
  }

  const errorUrl = new URL("/auth/error", origin);
  errorUrl.searchParams.set(
    "error",
    "Link verifikasi tidak memiliki code atau token yang diperlukan. Silakan minta email verifikasi baru.",
  );

  return NextResponse.redirect(errorUrl);
}
