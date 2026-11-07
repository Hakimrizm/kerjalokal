import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmployerJobForm } from "@/components/employer-job-form";
import { ArrowLeft } from "lucide-react";

export const instant = false;

export default async function NewEmployerJobPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (role?.role !== "employer") redirect("/dashboard/pencari-kerja");
  const { data: profile } = await supabase.from("employer_profiles").select("profile_completed,verification_status,province,city,district,village,address,latitude,longitude").eq("user_id", user.id).maybeSingle();
  if (!profile?.profile_completed) redirect("/onboarding/employer");
  if (profile.verification_status !== "verified") redirect("/dashboard/pelaku-usaha");

  return (
    <div className="space-y-6">
      <Link href="/dashboard/pelaku-usaha/lowongan" className="mb-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-[#284B67] transition-colors hover:text-[#2C3E50]">
        <ArrowLeft size={15} /> Kembali ke Kelola Lowongan
      </Link>
      <EmployerJobForm employerId={user.id} defaultLocation={profile} />
    </div>
  );
}