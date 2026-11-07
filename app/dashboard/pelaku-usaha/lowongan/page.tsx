import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployerJobActions } from "@/components/employer-job-actions";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, Clock3, FilePlus2, MapPin, Users } from "lucide-react";

export const instant = false;

const labels: Record<string, string> = { draft: "Draft", pending_review: "Perlu pemeriksaan", published: "Tayang", rejected: "Perlu perbaikan", closed: "Ditutup", finished: "Selesai", banned: "Diblokir karena fraud" };
const classes: Record<string, string> = { draft: "badge-ghost", pending_review: "badge-warning", published: "badge-success", rejected: "badge-error", closed: "badge-outline", finished: "badge-info", banned: "badge-error" };
function dateLabel(value?: string | null) { return value ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value.slice(0,10)}T00:00:00`)) : "Tidak ditentukan"; }

export default async function EmployerJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (role?.role !== "employer") redirect("/dashboard/pencari-kerja");
  const [{ data: jobs }, { data: employerProfile }] = await Promise.all([
    supabase.from("jobs").select("*").eq("employer_id", user.id).order("created_at", { ascending: false }),
    supabase.from("employer_profiles").select("verification_status").eq("user_id", user.id).maybeSingle(),
  ]);
  const canCreateJob = employerProfile?.verification_status === "verified";
  const rows = jobs ?? [];
  const ids = rows.map((job) => job.id);
  const { data: applications } = ids.length ? await supabase.from("job_applications").select("id,job_id,status").in("job_id", ids) : { data: [] as {id:string;job_id:string;status:string}[] };
  const counts = new Map<string, number>();
  const acceptedCounts = new Map<string, number>();
  for (const app of applications ?? []) {
    counts.set(app.job_id, (counts.get(app.job_id) ?? 0) + 1);
    if (app.status === "accepted") {
      acceptedCounts.set(app.job_id, (acceptedCounts.get(app.job_id) ?? 0) + 1);
    }
  }

  return (
    <main className="min-h-screen bg-[#F3F5F6] px-4 py-7 text-[#2C3E50] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div><Link href="/dashboard/pelaku-usaha" className="inline-flex items-center gap-2 text-xs font-bold text-[#7F8C8D] hover:text-[#2C3E50]"><ArrowLeft size={15} /> Dashboard usaha</Link><h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Kelola lowongan</h1><p className="mt-1 text-sm text-[#7F8C8D]">Setiap lowongan langsung tayang setelah diterbitkan. Sistem tetap memeriksa indikator risiko untuk melindungi pencari kerja.</p></div>
          {canCreateJob ? (
            <Link href="/dashboard/pelaku-usaha/lowongan/baru" className="btn btn-primary min-h-11 rounded-xl border-0 bg-[#2C3E50] px-5 text-xs font-bold text-white hover:bg-[#34495E]"><FilePlus2 size={16} /> Buat Lowongan</Link>
          ) : (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#EADCB9] bg-[#FFF9EC] px-4 text-xs font-bold text-[#80632C]"><Clock3 size={15}/> Menunggu verifikasi usaha</span>
          )}
        </header>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {[{label:"Semua lowongan",value:rows.length},{label:"Sedang tayang",value:rows.filter((j)=>j.status==="published").length},{label:"Total pelamar",value:applications?.length ?? 0}].map((item)=><div key={item.label} className="rounded-2xl border border-[#E2E7E9] bg-white p-4"><p className="text-xs font-semibold text-[#8A969D]">{item.label}</p><p className="mt-2 text-2xl font-extrabold">{item.value}</p></div>)}
        </div>

        {rows.length ? <div className="space-y-4">{rows.map((job)=><article key={job.id} className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-extrabold text-[#2C3E50]">{job.title}</h2><span className={`badge badge-sm ${classes[job.status] ?? "badge-ghost"}`}>{labels[job.status] ?? job.status}</span></div>
              <p className="mt-2 text-xs text-[#7F8C8D]">{job.category} · {job.employment_type} · {job.vacancies} orang dibutuhkan</p>
              <p className="mt-1 text-[11px] font-semibold text-[#53616D]">{acceptedCounts.get(job.id) ?? 0} dari {job.vacancies} posisi telah terisi</p>
              {job.status === "finished" && <p className="mt-3 rounded-lg bg-[#EEF6FA] px-3 py-2 text-[11px] leading-5 text-[#355E73]"><b>Lowongan selesai.</b> Seluruh kebutuhan tenaga kerja sudah terpenuhi. Lowongan otomatis tidak lagi ditampilkan kepada pencari kerja.</p>}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#7F8C8D]"><span className="inline-flex items-center gap-1"><MapPin size={13}/>{job.district}, {job.city}</span><span className="inline-flex items-center gap-1"><CalendarDays size={13}/>Batas lamaran: {dateLabel(job.application_deadline)}</span><span className="inline-flex items-center gap-1"><Users size={13}/>{counts.get(job.id) ?? 0} pelamar</span></div>
              {job.fraud_review_status === "pending_review" && job.status !== "banned" && <p className="mt-3 rounded-lg bg-[#FFF8E8] px-3 py-2 text-[11px] leading-5 text-[#80632C]">Sistem mendeteksi beberapa indikator yang perlu diperiksa. Lowongan tetap tayang selama pemeriksaan dan akan diberi tahu jika ada keputusan.</p>}
              {job.status === "banned" && <p className="mt-3 rounded-lg bg-[#FCEEEE] px-3 py-2 text-[11px] leading-5 text-[#934444]"><b>Lowongan diblokir.</b> {job.ban_reason || "Lowongan tidak lagi ditampilkan kepada pencari kerja karena terindikasi penipuan."}</p>}
              {job.status === "rejected" && job.rejection_reason && <p className="mt-3 rounded-lg bg-[#FCEEEE] px-3 py-2 text-[11px] leading-5 text-[#934444]">Catatan admin: {job.rejection_reason}</p>}
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link href={`/dashboard/pelaku-usaha/lowongan/${job.id}/pelamar`} className="btn btn-outline btn-sm rounded-lg border-[#BDC3C7] text-xs text-[#34495E]"><Users size={14}/> Pelamar ({counts.get(job.id) ?? 0})</Link>
              {!["banned", "finished"].includes(job.status) && <Link href={`/dashboard/pelaku-usaha/lowongan/${job.id}/edit`} className="btn btn-ghost btn-sm rounded-lg text-xs text-[#53616D]">Edit</Link>}
              <EmployerJobActions jobId={job.id} status={job.status}/>
            </div>
          </div>
        </article>)}</div> : <div className="rounded-2xl border border-dashed border-[#C9D3D8] bg-white px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ECF0F1] text-[#53616D]"><BriefcaseBusiness size={25}/></span><h2 className="mt-4 text-base font-extrabold">Belum ada lowongan</h2><p className="mt-2 text-sm text-[#8A969D]">Buat lowongan pertama agar pencari kerja di sekitar usahamu dapat menemukan kesempatan kerja.</p><Link href="/dashboard/pelaku-usaha/lowongan/baru" className="btn btn-primary mt-5 rounded-xl border-0 bg-[#2C3E50] text-white">Buat Lowongan <ArrowRight size={15}/></Link></div>}
      </div>
    </main>
  );
}
