import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployerOnboarding } from "@/components/employer-onboarding";

export const instant = false;

export default async function EmployerOnboardingPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/login");

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleData?.role !== "employer") redirect("/dashboard/pencari-kerja");

  const { data: employerProfile } = await supabase.from("employer_profiles").select("profile_completed").eq("user_id", user.id).maybeSingle();
  if (employerProfile?.profile_completed) redirect("/dashboard/pelaku-usaha");

  return <EmployerOnboarding userId={user.id} initialName={user.user_metadata?.full_name ?? ""} />;
}
