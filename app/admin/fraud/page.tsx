import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminFraudReview } from "@/components/admin-fraud-review";
import { AdminSuspiciousJobReview } from "@/components/admin-suspicious-job-review";
import { AlertTriangle, CalendarDays, ShieldAlert, UserRound } from "lucide-react";

export const instant = false;

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default async function AdminFraudPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/admin-login");

  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleRow?.role !== "super_admin") redirect("/admin");

  const [
    { data: reports, error: reportsError },
    { data: suspiciousJobs, error: jobsError },
  ] = await Promise.all([
    supabase.from("fraud_reports").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("jobs")
      .select("id,title,employer_id,city,district,created_at,status,fraud_risk_score,fraud_risk_level,fraud_risk_reasons,fraud_review_status")
      .eq("fraud_review_status", "pending_review")
      .neq("status", "banned")
      .order("fraud_risk_score", { ascending: false })
      .limit(100),
  ]);

  const reportRows = reports ?? [];
  const suspiciousRows = suspiciousJobs ?? [];
  const reportJobIds = reportRows.filter((report) => report.target_type === "job").map((report) => report.target_id);
  const allJobIds = [...new Set([...reportJobIds, ...suspiciousRows.map((job) => job.id)])];

  const { data: reportJobs } = allJobIds.length
    ? await supabase.from("jobs").select("id,title,employer_id,status,ban_reason").in("id", allJobIds)
    : { data: [] as { id: string; title: string; employer_id: string; status: string; ban_reason: string | null }[] };

  const employerIds = [...new Set([
    ...(reportJobs ?? []).map((job) => job.employer_id),
    ...suspiciousRows.map((job) => job.employer_id),
  ])];

  const { data: employers } = employerIds.length
    ? await supabase.from("employer_profiles").select("user_id,business_name").in("user_id", employerIds)
    : { data: [] as { user_id: string; business_name: string }[] };

  const employerName = (id?: string) => (employers ?? []).find((item) => item.user_id === id)?.business_name ?? "Usaha tidak diketahui";

  return (
    <div className="space-y-7">
      <header>
        <span className="badge badge-outline border-[#E6CACA] bg-white text-[10px] font-bold text-[#A34E4E]">KHUSUS SUPER ADMIN</span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">FraudGuard & Pemeriksaan</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7F8C8D]">
          Sistem memeriksa isi lowongan secara otomatis menggunakan indikator risiko. Hasil pemeriksaan adalah sinyal awal, bukan bukti final. Super Admin memeriksa alasan dan menentukan apakah lowongan aman atau harus diblokir.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Lowongan ditandai sistem", value: suspiciousRows.length },
          { label: "Laporan baru", value: reportRows.filter((report) => report.status === "open").length },
          { label: "Dalam investigasi", value: reportRows.filter((report) => report.status === "investigating").length },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-[#E2E7E9] bg-white p-4">
            <p className="text-xs text-[#8A969D]">{item.label}</p>
            <p className="mt-2 text-2xl font-extrabold">{item.value}</p>
          </div>
        ))}
      </div>

      {(jobsError || reportsError) && (
        <div role="alert" className="alert alert-error rounded-xl text-xs">
          Data FraudGuard tidak dapat dimuat. Pastikan migration 202611070006_fraudguard_instant_publish.sql sudah dijalankan.
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-2"><ShieldAlert size={18} className="text-[#A16B2C]" /><h2 className="text-lg font-extrabold">Antrean lowongan mencurigakan</h2></div>
            <p className="mt-1 text-xs text-[#8A969D]">Lowongan tetap tayang sampai Super Admin menetapkan pemblokiran. Periksa alasan dan bukti sebelum mengambil keputusan.</p>
          </div>
          <span className="badge badge-warning">{suspiciousRows.length} perlu diperiksa</span>
        </div>

        {suspiciousRows.length ? (
          <div className="space-y-4">
            {suspiciousRows.map((job) => (
              <article key={job.id} className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge badge-error badge-sm">{job.fraud_risk_level === "high" ? "Risiko tinggi" : "Perlu perhatian"}</span>
                      <span className="badge badge-outline badge-sm">Skor risiko {job.fraud_risk_score}/100</span>
                      <span className="badge badge-success badge-sm">Masih tayang</span>
                    </div>
                    <h3 className="mt-2 text-base font-extrabold text-[#34495E]">{job.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-[#667681]">{employerName(job.employer_id)}</p>
                    <p className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#9AA5AB]">
                      <span>{job.district}, {job.city}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{dateLabel(job.created_at)}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-xl bg-[#FFF8E8] p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A6A2E]">Indikator yang ditemukan sistem</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[#80632C]">
                    {(job.fraud_risk_reasons ?? []).map((reason: string, index: number) => <li key={`${job.id}-${index}`}>{reason}</li>)}
                  </ul>
                  <p className="mt-3 text-[10px] leading-5 text-[#9A7C4A]">Skor ini merupakan penapisan otomatis berbasis pola teks. Cocokkan dengan isi lowongan dan informasi usaha sebelum memutuskan.</p>
                </div>
                <AdminSuspiciousJobReview jobId={job.id} title={job.title} />
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#C9D3D8] bg-white px-6 py-12 text-center">
            <ShieldAlert size={25} className="mx-auto text-[#7F8C8D]" />
            <h3 className="mt-3 text-sm font-extrabold">Tidak ada lowongan yang ditandai</h3>
            <p className="mt-1 text-xs text-[#8A969D]">Lowongan yang terindikasi pola berisiko akan otomatis masuk ke antrean pemeriksaan ini.</p>
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-[#E2E7E9] pt-7">
        <div>
          <h2 className="text-lg font-extrabold">Laporan dari pengguna</h2>
          <p className="mt-1 text-xs text-[#8A969D]">Laporan yang dikirim pencari kerja atau pengguna lain. Jika terbukti fraud, gunakan tindakan blokir agar lowongan benar-benar tidak lagi tayang.</p>
        </div>
        {reportRows.length ? (
          <div className="space-y-4">
            {reportRows.map((report) => {
              const job = (reportJobs ?? []).find((item) => item.id === report.target_id);
              return (
                <article key={report.id} className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge badge-sm ${report.status === "resolved" ? "badge-success" : report.status === "dismissed" ? "badge-ghost" : report.status === "investigating" ? "badge-info" : "badge-warning"}`}>
                          {report.status === "open" ? "Baru" : report.status === "investigating" ? "Investigasi" : report.status === "resolved" ? (job?.status === "banned" ? "Diblokir / selesai" : "Selesai lama · cek blokir") : "Ditutup"}
                        </span>
                        {job?.status === "banned" && <span className="badge badge-error badge-sm">Lowongan diblokir</span>}
                        <span className="text-[10px] text-[#9AA5AB]">#{String(report.id).slice(0, 8)}</span>
                      </div>
                      <h3 className="mt-2 text-base font-extrabold text-[#34495E]">{report.reason}</h3>
                      <p className="mt-1 text-xs text-[#667681]">{job?.title ?? "Lowongan tidak ditemukan"} · {employerName(job?.employer_id)}</p>
                      <p className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#9AA5AB]">
                        <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{dateLabel(report.created_at)}</span>
                        <span className="inline-flex items-center gap-1"><UserRound size={12} />Pelapor: {report.reporter_id?.slice(0, 8) ?? "Akun dihapus"}</span>
                      </p>
                    </div>
                  </div>
                  {report.description && (
                    <div className="mt-4 rounded-xl bg-[#F7F9FA] p-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9AA5AB]">Keterangan pelapor</p>
                      <p className="mt-2 whitespace-pre-line text-xs leading-6 text-[#53616D]">{report.description}</p>
                    </div>
                  )}
                  {job && report.status === "resolved" && job.status !== "banned" && (
                    <p className="mt-3 rounded-lg bg-[#FFF8E8] px-3 py-2 text-[11px] leading-5 text-[#80632C]">Laporan ini pernah ditandai selesai, tetapi lowongannya belum berstatus diblokir. Periksa kembali laporan dan blokir lowongan jika hasil pemeriksaan membuktikan fraud.</p>
                  )}
                  {job?.status === "banned" && job.ban_reason && (
                    <p className="mt-3 rounded-lg bg-[#FCEEEE] px-3 py-2 text-[11px] text-[#934444]">Alasan blokir: {job.ban_reason}</p>
                  )}
                  {job?.status === "banned" ? (
                    <p className="mt-4 rounded-lg bg-[#F1F8F3] px-3 py-3 text-[11px] leading-5 text-[#347052]">
                      Penanganan selesai. Lowongan sudah diblokir dan tidak lagi tampil di halaman publik.
                    </p>
                  ) : (
                    <AdminFraudReview
                      reportId={report.id}
                      status={report.status}
                      notes={report.admin_notes}
                      jobId={job?.id}
                      jobTitle={job?.title}
                    />
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#C9D3D8] bg-white px-6 py-12 text-center">
            <AlertTriangle size={25} className="mx-auto text-[#7F8C8D]" />
            <h3 className="mt-3 text-sm font-extrabold">Belum ada laporan dari pengguna</h3>
            <p className="mt-1 text-xs text-[#8A969D]">Laporan lowongan yang dikirim pengguna akan muncul di sini.</p>
          </div>
        )}
      </section>
    </div>
  );
}
