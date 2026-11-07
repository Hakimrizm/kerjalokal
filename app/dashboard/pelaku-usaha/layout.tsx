import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployerShell } from "@/components/employer-shell";

export const instant = false;

export default async function EmployerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/dashboard/pelaku-usaha");

  const { data: roleRow, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !roleRow || roleRow.role !== "employer") {
    redirect("/dashboard");
  }

  const [{ data: profile }, { data: contact }] = await Promise.all([
    supabase.from("employer_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("employer_contacts").select("pic_name").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!profile?.profile_completed) {
    redirect("/onboarding/employer");
  }

  const businessName = profile.business_name || "Usaha kamu";
  const initials = businessName.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();
  const displayName = contact?.pic_name || user.email || "Pengelola";

  const { data: signedLogo } = profile.logo_path
    ? await supabase.storage.from("business-logos").createSignedUrl(profile.logo_path, 3600)
    : { data: null };

  return (
    <EmployerShell
      businessName={businessName}
      initials={initials}
      email={displayName}
      logoUrl={signedLogo?.signedUrl ?? null}
      verificationStatus={profile.verification_status as "pending" | "verified" | "rejected"}
    >
      {children}
    </EmployerShell>
  );
}