import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, Clock3, FileWarning, ShieldCheck } from "lucide-react";

export const instant = false;

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
  const isSuper = roleRow?.role === "super_admin" || roleRow?.role === "fraud_admin";

  const [
    pendingEmployersResult,
    verifiedEmployersResult,
    rejectedEmployersResult,
    publishedJobsResult,
    flaggedJobsResult,
    recentEmployersResult,
    reportsResult,
  ] = await Promise.all([
    supabase.from("employer_profiles").select("user_id", { count: "exact", head: true }).eq("profile_completed", true).eq("verification_status", "pending"),
    supabase.from("employer_profiles").select("user_id", { count: "exact", head: true }).eq("verification_status", "verified"),
    supabase.from("employer_profiles").select("user_id", { count: "exact", head: true }).eq("verification_status", "rejected"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("fraud_review_status", "pending_review").neq("status", "banned"),
    supabase.from("employer_profiles").select("user_id,business_name,business_type,city,district,verification_status,review_recommendation,created_at").order("created_at", { ascending: false }).limit(6),
    isSuper ? supabase.from("fraud_reports").select("id", { count: "exact", head: true }).in("status", ["open", "investigating"]) : Promise.resolve({ count: 0, error: null }),
  ]);

  const cards = [
    { label: "Menunggu verifikasi usaha", value: pendingEmployersResult.count ?? 0, icon: Clock3, color: "text-amber-700", bg: "bg-amber-50", href: "/admin/verifikasi-usaha?status=pending" },
    { label: "Usaha terverifikasi", value: verifiedEmployersResult.count ?? 0, icon: BadgeCheck, color: "text-emerald-700", bg: "bg-emerald-50", href: "/admin/verifikasi-usaha?status=verified" },
    { label: "Lowongan tayang", value: publishedJobsResult.count ?? 0, icon: BriefcaseBusiness, color: "text-blue-700", bg: "bg-blue-50", href: "/admin/lowongan" },
    ...(isSuper ? [
      { label: "Lowongan mencurigakan", value: flaggedJobsResult.count ?? 0, icon: BriefcaseBusiness, color: "text-amber-700", bg: "bg-amber-50", href: "/admin/fraud" },
      { label: "Laporan fraud aktif", value: reportsResult.count ?? 0, icon: FileWarning, color: "text-rose-700", bg: "bg-rose-50", href: "/admin/fraud" },
    ] : []),
  ];

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[26px] bg-[#2C3E50] p-6 text-white shadow-xl shadow-[#2C3E50]/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10"/>
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-white/75">
              <ShieldCheck size={13}/> {isSuper ? "Super Admin Workspace" : "Admin Workspace"}
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Selamat datang di Control Center.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
              {isSuper
                ? "Pantau operasional KerjaLokal, ambil keputusan verifikasi akhir, periksa antrean FraudGuard, dan awasi aktivitas administrator."
                : "Periksa kelengkapan dan keberadaan usaha. Kirim rekomendasi pemeriksaan agar Super Admin dapat mengambil keputusan akhir."}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><Building2 size={23}/></span>
            <div><p className="text-[10px] font-semibold text-white/55">TUGAS UTAMA</p><p className="mt-1 text-sm font-extrabold">{isSuper ? "Pengawasan platform" : "Pemeriksaan usaha"}</p></div>
          </div>
        </div>
      </section>

      <section className={`grid gap-3 ${cards.length >= 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"}`}>
        {cards.map((item) => { const Icon = item.icon; return (
          <Link key={item.label} href={item.href} className="group rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-[#7F8C8D]">{item.label}</p><span className={`grid h-10 w-10 place-items-center rounded-xl ${item.bg} ${item.color}`}><Icon size={19}/></span></div>
            <div className="mt-4 flex items-end justify-between"><p className="text-3xl font-extrabold tracking-tight text-[#2C3E50]">{item.value}</p><ArrowRight size={16} className="mb-1 text-[#A0AAB0] transition group-hover:translate-x-1"/></div>
          </Link>
        ); })}
      </section>

      {!isSuper && (
        <section className="flex items-start gap-3 rounded-2xl border border-[#DCE3E6] bg-white p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]"><ShieldCheck size={19}/></span>
          <div><h2 className="text-sm font-extrabold">Batas wewenang Admin</h2><p className="mt-1 text-xs leading-6 text-[#7F8C8D]">Admin dapat memeriksa data usaha, melihat dokumen, dan mengirim rekomendasi. Tombol persetujuan atau penolakan final hanya tersedia untuk Super Admin. Admin tidak memiliki akses ke FraudGuard dan audit log.</p></div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF1F2] px-5 py-4 sm:px-6">
          <div><h2 className="text-base font-extrabold">Pendaftaran usaha terbaru</h2><p className="mt-1 text-xs text-[#8A969D]">Usaha yang baru melengkapi profil dan menunggu proses pemeriksaan.</p></div>
          <Link href="/admin/verifikasi-usaha" className="inline-flex items-center gap-1 text-xs font-extrabold text-[#34495E] hover:underline">Lihat semua <ArrowRight size={14}/></Link>
        </div>
        {recentEmployersResult.data?.length ? (
          <div className="divide-y divide-[#EEF1F2]">
            {recentEmployersResult.data.map((business) => (
              <div key={business.user_id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-[#34495E]">{business.business_name}</p>
                  <p className="mt-1 text-[11px] text-[#8A969D]">{business.business_type} · {business.district}, {business.city} · Daftar {formatDate(business.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge badge-sm ${business.verification_status === "verified" ? "badge-success" : business.verification_status === "rejected" ? "badge-error" : "badge-warning"}`}>{business.verification_status === "verified" ? "Terverifikasi" : business.verification_status === "rejected" ? "Perlu perbaikan" : "Menunggu"}</span>
                  <Link href={`/admin/verifikasi-usaha/${business.user_id}`} className="btn btn-outline btn-sm rounded-lg border-[#BDC3C7] text-xs text-[#34495E]">Periksa <ArrowRight size={13}/></Link>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="px-6 py-12 text-center"><p className="text-sm font-bold text-[#53616D]">Belum ada pendaftaran usaha.</p><p className="mt-1 text-xs text-[#9AA5AB]">Data usaha akan muncul setelah pelaku usaha menyelesaikan onboarding.</p></div>}
      </section>
    </div>
  );
}
