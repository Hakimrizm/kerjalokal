import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowUpRight, BriefcaseBusiness, MapPin, ShieldAlert } from "lucide-react";

export const instant = false;

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_review: "Perlu pemeriksaan",
  published: "Tayang",
  rejected: "Perlu perbaikan",
  closed: "Ditutup",
  finished: "Selesai",
  banned: "Diblokir karena fraud",
};

function statusClass(status: string) {
  if (status === "published") return "badge-success";
  if (status === "banned" || status === "rejected") return "badge-error";
  if (status === "pending_review") return "badge-warning";
  if (status === "finished") return "badge-info";
  return "badge-ghost";
}

export default async function AdminJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const isSuper = roleRow?.role === "super_admin";

  const { data: jobs, error } = await supabase.from("jobs")
    .select("id,title,category,employment_type,city,district,created_at,status,employer_id,description,requirements,ban_reason,fraud_risk_score,fraud_risk_level,fraud_review_status")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = jobs ?? [];
  const employerIds = [...new Set(rows.map((job) => job.employer_id))];
  const { data: employers } = employerIds.length
    ? await supabase.from("employer_profiles").select("user_id,business_name,verification_status").in("user_id", employerIds)
    : { data: [] as { user_id: string; business_name: string; verification_status: string }[] };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <span className="badge badge-outline border-[#BDC3C7] bg-white text-[10px] font-bold text-[#53616D]">MONITORING PLATFORM</span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Data Lowongan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7F8C8D]">Pantau seluruh lowongan yang dibuat pelaku usaha. Lowongan langsung tayang setelah diterbitkan; sistem memeriksa indikator risiko secara otomatis.</p>
        </div>
        {isSuper && (
          <Link href="/admin/fraud" className="btn btn-primary btn-sm rounded-xl border-0 bg-[#2C3E50] text-white">
            <ShieldAlert size={15} /> Antrean FraudGuard
          </Link>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        <span className="badge badge-success">Tayang: {rows.filter((job) => job.status === "published").length}</span>
        <span className="badge badge-warning">Ditandai sistem: {rows.filter((job) => job.fraud_review_status === "pending_review").length}</span>
        <span className="badge badge-error">Diblokir: {rows.filter((job) => job.status === "banned").length}</span>
        <span className="badge badge-info">Selesai: {rows.filter((job) => job.status === "finished").length}</span>
      </div>

      {error && <div role="alert" className="alert alert-error rounded-xl text-xs">Data lowongan tidak dapat dimuat. Periksa migrasi dan kebijakan RLS.</div>}

      {rows.length ? (
        <div className="space-y-4">
          {rows.map((job) => {
            const employer = (employers ?? []).find((item) => item.user_id === job.employer_id);
            return (
              <article key={job.id} className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold">{job.title}</h2>
                      <span className={`badge badge-sm ${statusClass(job.status)}`}>{statusLabels[job.status] ?? job.status}</span>
                      {job.fraud_review_status === "pending_review" && job.status !== "banned" && <span className="badge badge-warning badge-sm">Perlu pemeriksaan FraudGuard</span>}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#53616D]">{employer?.business_name ?? "Usaha tidak ditemukan"}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#8A969D]">
                      <span>{job.category} · {job.employment_type}</span>
                      <span className="inline-flex items-center gap-1"><MapPin size={12} />{job.district}, {job.city}</span>
                      <span>{new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(job.created_at))}</span>
                    </p>
                    <p className="mt-3 line-clamp-3 whitespace-pre-line text-xs leading-6 text-[#667681]">{job.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`badge badge-sm ${employer?.verification_status === "verified" ? "badge-success" : "badge-warning"}`}>Usaha {employer?.verification_status === "verified" ? "terverifikasi" : "belum terverifikasi"}</span>
                      <Link href={`/admin/verifikasi-usaha/${job.employer_id}`} className="link link-hover text-[10px] font-bold text-[#53616D]">Periksa profil usaha</Link>
                      {job.fraud_review_status === "pending_review" && <span className="text-[10px] font-semibold text-[#A16B2C]">Skor risiko: {job.fraud_risk_score}/100 ({job.fraud_risk_level})</span>}
                    </div>
                    {job.status === "banned" && job.ban_reason && <p className="mt-3 rounded-lg bg-[#FFF1F1] px-3 py-2 text-[11px] leading-5 text-[#934444]">Alasan blokir: {job.ban_reason}</p>}
                  </div>
                  <div className="w-full xl:w-[190px]">
                    {job.status === "published" ? (
                      <Link href={`/lowongan/${job.id}`} target="_blank" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7F8C8D] hover:text-[#34495E]">Lihat tampilan publik <ArrowUpRight size={12} /></Link>
                    ) : (
                      <p className="text-[10px] text-[#A0AAB0]">{job.status === "banned" ? "Tidak lagi tampil untuk publik." : "Tidak sedang ditampilkan untuk publik."}</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#C9D3D8] bg-white px-6 py-16 text-center">
          <BriefcaseBusiness size={26} className="mx-auto text-[#7F8C8D]" />
          <h2 className="mt-3 text-base font-extrabold">Belum ada lowongan</h2>
          <p className="mt-1 text-xs text-[#8A969D]">Lowongan yang diterbitkan pelaku usaha akan tampil di sini.</p>
        </div>
      )}
    </div>
  );
}
