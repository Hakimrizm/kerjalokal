import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadJobSeekerCvData } from "@/lib/cv/data";
import { JobSeekerCvPreview } from "@/components/job-seeker-cv-preview";

// Halaman CV membutuhkan sesi pengguna dan data profil saat request berlangsung.
export const instant = false;


export default async function JobSeekerCvPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/dashboard/pencari-kerja/cv");

  const [{ data: role }, { data: jobProfile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("job_seeker_profiles").select("profile_completed").eq("user_id", user.id).maybeSingle(),
  ]);

  if (role?.role !== "job_seeker") {
    if (role?.role === "employer") redirect("/dashboard/pelaku-usaha");
    if (role?.role === "super_admin" || role?.role === "fraud_admin") redirect("/admin");
    redirect("/auth/login");
  }
  if (!jobProfile?.profile_completed) redirect("/onboarding/job-seeker");

  const data = await loadJobSeekerCvData(
    supabase,
    user.id,
    user.email,
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
  );

  return <JobSeekerCvPreview data={data} />;
}
