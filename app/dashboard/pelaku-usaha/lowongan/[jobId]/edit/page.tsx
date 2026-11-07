import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmployerJobForm, type EmployerJobRecord } from "@/components/employer-job-form";
import { ArrowLeft } from "lucide-react";

export const instant = false;

type PageProps = { params: Promise<{ jobId: string }> };

export default async function EditEmployerJobPage({ params }: PageProps) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (role?.role !== "employer") redirect("/dashboard/pencari-kerja");
  const { data: profile } = await supabase.from("employer_profiles").select("profile_completed,province,city,district,village,address").eq("user_id", user.id).maybeSingle();
  if (!profile?.profile_completed) redirect("/onboarding/employer");
  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).eq("employer_id", user.id).maybeSingle();
  if (!job) notFound();
  if (job.status === "banned") redirect("/dashboard/pelaku-usaha/lowongan");

  return <main className="min-h-screen bg-[#F3F5F6] px-4 py-7 text-[#2C3E50] sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl"><Link href="/dashboard/pelaku-usaha/lowongan" className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-[#7F8C8D] hover:text-[#2C3E50]"><ArrowLeft size={15}/> Kembali ke Kelola Lowongan</Link><EmployerJobForm employerId={user.id} initialJob={job as EmployerJobRecord} defaultLocation={profile}/></div></main>;
}
