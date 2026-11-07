import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminJobReview } from "@/components/admin-job-review";
import { ArrowUpRight, BriefcaseBusiness, MapPin } from "lucide-react";

export const instant = false;

export default async function AdminJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
  const role = roleRow?.role === "super_admin" || roleRow?.role === "fraud_admin" ? "super_admin" : "admin";

  const { data: jobs, error } = await supabase.from("jobs")
    .select("id,title,category,employment_type,city,district,created_at,status,employer_id,description,requirements")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = jobs ?? [];
  const employerIds = [...new Set(rows.map((job)=>job.employer_id))];
  const { data: employers } = employerIds.length
    ? await supabase.from("employer_profiles").select("user_id,business_name,verification_status").in("user_id", employerIds)
    : { data: [] as {user_id:string;business_name:string;verification_status:string}[] };

  return (
    <div className="space-y-6">
      <header><span className="badge badge-outline border-[#BDC3C7] bg-white text-[10px] font-bold text-[#53616D]">KONTROL KONTEN</span><h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Moderasi Lowongan</h1><p className="mt-2 text-sm text-[#7F8C8D]">Periksa lowongan yang dikirim pelaku usaha sebelum ditampilkan kepada pencari kerja.</p></header>
      <div className="flex flex-wrap gap-2">
        <span className="badge badge-warning">Menunggu review: {rows.filter((job)=>job.status==="pending_review").length}</span>
        <span className="badge badge-success">Tayang: {rows.filter((job)=>job.status==="published").length}</span>
        <span className="badge badge-error">Ditolak: {rows.filter((job)=>job.status==="rejected").length}</span>
      </div>
      {error && <div role="alert" className="alert alert-error rounded-xl text-xs">Data lowongan tidak dapat dimuat. Periksa migrasi dan kebijakan RLS.</div>}
      {rows.length ? <div className="space-y-4">{rows.map((job)=>{
        const employer = (employers??[]).find((item)=>item.user_id===job.employer_id);
        return <article key={job.id} className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-extrabold">{job.title}</h2><span className={`badge badge-sm ${job.status==="pending_review"?"badge-warning":job.status==="published"?"badge-success":job.status==="rejected"?"badge-error":"badge-ghost"}`}>{job.status==="pending_review"?"Menunggu review":job.status==="published"?"Tayang":job.status==="rejected"?"Ditolak":job.status}</span></div>
              <p className="mt-1 text-xs font-semibold text-[#53616D]">{employer?.business_name ?? "Usaha tidak ditemukan"}</p>
              <p className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#8A969D]"><span>{job.category} · {job.employment_type}</span><span className="inline-flex items-center gap-1"><MapPin size={12}/>{job.district}, {job.city}</span><span>{new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date(job.created_at))}</span></p>
              <p className="mt-3 line-clamp-3 whitespace-pre-line text-xs leading-6 text-[#667681]">{job.description}</p>
              <div className="mt-3 flex flex-wrap gap-2"><span className={`badge badge-sm ${employer?.verification_status==="verified"?"badge-success":"badge-warning"}`}>Usaha {employer?.verification_status==="verified"?"terverifikasi":"belum terverifikasi"}</span><Link href={`/admin/verifikasi-usaha/${job.employer_id}`} className="link link-hover text-[10px] font-bold text-[#53616D]">Periksa profil usaha</Link></div>
            </div>
            <div className="w-full xl:w-[300px]">
              <AdminJobReview jobId={job.id} role={role} status={job.status}/>
              {job.status === "published" ? (
                <Link href={`/lowongan/${job.id}`} target="_blank" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-[#7F8C8D] hover:text-[#34495E]">Lihat tampilan publik <ArrowUpRight size={12}/></Link>
              ) : (
                <p className="mt-3 text-[10px] text-[#A0AAB0]">Pratinjau publik tersedia setelah lowongan diterbitkan.</p>
              )}
            </div>
          </div>
        </article>;
      })}</div> : <div className="rounded-2xl border border-dashed border-[#C9D3D8] bg-white px-6 py-16 text-center"><BriefcaseBusiness size={26} className="mx-auto text-[#7F8C8D]"/><h2 className="mt-3 text-base font-extrabold">Belum ada lowongan</h2><p className="mt-1 text-xs text-[#8A969D]">Lowongan yang dikirim pelaku usaha akan tampil di sini.</p></div>}
    </div>
  );
}
