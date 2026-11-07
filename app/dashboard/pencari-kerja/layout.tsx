import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobSeekerShell } from "@/components/jobseeker-shell";

export const instant = false;

export default async function JobSeekerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/dashboard/pencari-kerja");

  const { data: roleRow, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !roleRow || roleRow.role !== "job_seeker") {
    redirect("/dashboard");
  }

  const [{ data: profile }, { data: jobProfile }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("job_seeker_profiles").select("profile_completed").eq("user_id", user.id).maybeSingle(),
  ]);

  if (!jobProfile?.profile_completed) {
    redirect("/onboarding/job-seeker");
  }

  const name = profile?.full_name || user.user_metadata?.full_name || "Pencari Kerja";
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0])
    .join("")
    .toUpperCase();

  const { data: signedPhoto } = profile?.photo_path
    ? await supabase.storage.from("profile-photos").createSignedUrl(profile.photo_path, 60 * 60)
    : { data: null };

  return (
    <JobSeekerShell
      name={name}
      initials={initials}
      email={user.email ?? ""}
      photoUrl={signedPhoto?.signedUrl ?? null}
    >
      {children}
    </JobSeekerShell>
  );
}