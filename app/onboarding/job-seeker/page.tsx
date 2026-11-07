import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobSeekerOnboarding } from "@/components/jobseeker-onboarding";

// Halaman onboarding memakai session Supabase per request, jadi jangan prerender statis.
export const instant = false;

type PageProps = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function JobSeekerOnboardingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isEditing = params.edit === "1";
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login?next=/onboarding/job-seeker");
  }

  const { data: onboarding } = await supabase
    .from("job_seeker_profiles")
    .select("profile_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (onboarding?.profile_completed && !isEditing) {
    redirect("/dashboard/pencari-kerja");
  }

  return (
    <JobSeekerOnboarding
      userId={user.id}
      initialName={user.user_metadata?.full_name ?? ""}
      isEditing={isEditing}
    />
  );
}
