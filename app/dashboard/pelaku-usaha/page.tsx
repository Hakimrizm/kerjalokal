import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployerDashboardSignOut } from "@/components/employer-dashboard-signout";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  FilePlus2,
  MapPin,
  ShieldAlert,
  Users,
} from "lucide-react";

export const instant = false;

const statusLabel: Record<string, string> = {
  draft: "Draft",
  pending_review: "Perlu pemeriksaan",
  published: "Tayang",
  rejected: "Perlu perbaikan",
  closed: "Ditutup",
  banned: "Diblokir karena fraud",
};

function statusClass(status: string) {
  if (status === "published") return "badge-success";
  if (status === "rejected") return "badge-error";
  if (status === "pending_review") return "badge-warning";
  if (status === "closed") return "badge-ghost";
  if (status === "banned") return "badge-error";
  return "badge-outline";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

export default async function EmployerDashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/auth/login");

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (roleData?.role !== "employer") redirect("/dashboard/pencari-kerja");

  const [{ data: profile }, { data: contact }, { data: jobs }, { data: notifications }] = await Promise.all([
    supabase.from("employer_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("employer_contacts").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("jobs").select("id,title,status,fraud_review_status,ban_reason,employment_type,created_at,application_deadline,city,district").eq("employer_id", user.id).order("created_at", { ascending: false }),
    supabase.from("user_notifications").select("id,title,message,notification_type,read_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
  ]);

  if (!profile?.profile_completed) redirect("/onboarding/employer");

  const jobRows = jobs ?? [];
  const jobIds = jobRows.map((job) => job.id);
  const { data: applications } = jobIds.length
    ? await supabase.from("job_applications").select("id,job_id,status").in("job_id", jobIds)
    : { data: [] as { id: string; job_id: string; status: string }[] };

  const totalApplications = applications?.length ?? 0;
  const activeJobs = jobRows.filter((job) => job.status === "published").length;
  const flaggedJobs = jobRows.filter((job) => job.fraud_review_status === "pending_review" && job.status !== "banned").length;
  const counts = new Map<string, number>();
  for (const application of applications ?? []) counts.set(application.job_id, (counts.get(application.job_id) ?? 0) + 1);

  const { data: logo } = profile.logo_path
    ? await supabase.storage.from("business-logos").createSignedUrl(profile.logo_path, 3600)
    : { data: null };

  const businessName = profile.business_name || "Usaha kamu";
  const initials = businessName.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();
  const location = [profile.village, profile.district, profile.city].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-[#F3F5F6] text-[#2C3E50]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[258px] shrink-0 flex-col border-r border-[#DCE2E5] bg-white px-5 py-7 lg:flex">
          <Link href="/" className="mb-10 flex items-center gap-3 px-2">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#2C3E50] text-white"><BriefcaseBusiness size={21} /></span>
            <span><span className="block text-[19px] font-extrabold leading-none tracking-tight">kerja<span className="text-[#7F8C8D]">lokal</span></span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A969D]">Area pelaku usaha</span></span>
          </Link>
          <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9AA5AB]">Menu usaha</p>
          <nav className="space-y-1">
            <Link href="/dashboard/pelaku-usaha" className="flex items-center gap-3 rounded-xl bg-[#2C3E50] px-3.5 py-3 text-sm font-bold text-white"><Building2 size={18} /> Ringkasan</Link>
            <Link href="/dashboard/pelaku-usaha/lowongan" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#667681] hover:bg-[#ECF0F1] hover:text-[#2C3E50]"><BriefcaseBusiness size={18} /> Kelola Lowongan</Link>
            <Link href="/lowongan" className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#667681] hover:bg-[#ECF0F1] hover:text-[#2C3E50]"><ArrowUpRight size={18} /> Lihat Halaman Publik</Link>
          </nav>
          <div className="mt-auto rounded-2xl bg-[#ECF0F1] p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#34495E]"><ShieldAlert size={15} /> Verifikasi usaha</div>
            <p className="mt-2 text-[11px] leading-5 text-[#7F8C8D]">{profile.verification_status === "verified" ? "Usaha telah terverifikasi." : "Profil usaha sedang diperiksa Admin. Persetujuan akhir diberikan oleh Super Admin."}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[#DCE2E5] bg-white/90 backdrop-blur-xl">
            <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-9">
              <div className="flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2C3E50] text-white"><BriefcaseBusiness size={19} /></span><span className="text-lg font-extrabold tracking-tight">kerja<span className="text-[#7F8C8D]">lokal</span></span></div>
              <div className="hidden lg:block"><p className="text-xs font-semibold text-[#8A969D]">AREA PELAKU USAHA</p><p className="mt-0.5 text-sm font-bold text-[#34495E]">Dashboard usaha</p></div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block"><p className="max-w-[180px] truncate text-xs font-extrabold text-[#34495E]">{businessName}</p><p className="text-[10px] text-[#8A969D]">{contact?.pic_name ?? user.email}</p></div>
                {logo?.signedUrl ? <img src={logo.signedUrl} alt={`Logo ${businessName}`} className="h-9 w-9 rounded-xl border border-[#DCE2E5] object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#DCE4E8] text-xs font-extrabold text-[#34495E]">{initials}</span>}
                <EmployerDashboardSignOut />
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto border-t border-[#EEF1F2] px-4 py-2 lg:hidden">
              <Link href="/dashboard/pelaku-usaha" className="whitespace-nowrap rounded-full bg-[#2C3E50] px-3.5 py-2 text-xs font-bold text-white">Ringkasan</Link>
              <Link href="/dashboard/pelaku-usaha/lowongan" className="whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold text-[#53616D] hover:bg-[#ECF0F1]">Kelola Lowongan</Link>
              <Link href="/lowongan" className="whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold text-[#53616D] hover:bg-[#ECF0F1]">Lihat Lowongan</Link>
            </nav>
          </header>

          <div className="mx-auto max-w-[1250px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
            <section className="relative overflow-hidden rounded-[28px] bg-[#2C3E50] p-6 text-white shadow-xl shadow-[#2C3E50]/10 sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border border-white/10" />
              <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[#D9E1E5]"><Building2 size={13} /> Ruang usaha kamu</span>
                  <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Selamat datang, {businessName}!</h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Kelola kebutuhan rekrutmen, tinjau kandidat, dan temukan tenaga kerja dari wilayah sekitar usahamu.</p>
                  {location && <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#D5DEE3]"><MapPin size={15} /> {location}</p>}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {profile.verification_status === "verified" ? (
                      <Link href="/dashboard/pelaku-usaha/lowongan/baru" className="btn min-h-11 rounded-full border-0 bg-[#ECF0F1] px-5 text-xs font-extrabold text-[#2C3E50] hover:bg-white"><FilePlus2 size={16} /> Buat Lowongan</Link>
                    ) : (
                      <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 text-xs font-bold text-white/70"><Clock3 size={15}/> Menunggu verifikasi usaha</span>
                    )}
                    <Link href="/dashboard/pelaku-usaha/lowongan" className="btn btn-outline min-h-11 rounded-full border-white/30 px-5 text-xs font-bold text-white hover:border-white hover:bg-white/10 hover:text-white">Kelola Lowongan</Link>
                  </div>
                </div>
                <div className="flex min-w-[220px] items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15"><CheckCircle2 size={24} /></div>
                  <div><p className="text-xs font-semibold text-white/65">Status verifikasi</p><p className="mt-1 text-base font-extrabold">{profile.verification_status === "verified" ? "Terverifikasi" : profile.verification_status === "rejected" ? "Perlu perbaikan" : "Menunggu review"}</p><p className="mt-1 text-[10px] text-white/55">Status profil usaha</p></div>
                </div>
              </div>
            </section>

            {notifications && notifications.length > 0 && (
              <section className="mt-6 overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
                <div className="border-b border-[#EEF1F2] px-5 py-3"><h2 className="text-xs font-extrabold text-[#34495E]">Pemberitahuan KerjaLokal</h2></div>
                <div className="divide-y divide-[#EEF1F2]">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="flex items-start gap-3 px-5 py-3.5">
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${notification.notification_type === "job_banned" ? "bg-[#FCEEEE] text-[#A34E4E]" : notification.notification_type === "employer_verification" ? "bg-[#ECF0F1] text-[#34495E]" : notification.notification_type === "job_fraud_cleared" ? "bg-[#EAF5ED] text-[#347052]" : "bg-[#F3F5F6] text-[#7F8C8D]"}`}><ShieldAlert size={15}/></span>
                      <div className="min-w-0 flex-1"><p className="text-xs font-extrabold text-[#34495E]">{notification.title}</p><p className={`mt-1 text-[11px] leading-5 ${notification.notification_type === "job_banned" ? "font-semibold text-[#934444]" : "text-[#7F8C8D]"}`}>{notification.message}</p><p className="mt-1 text-[9px] text-[#A0AAB0]">{formatDate(notification.created_at)}</p></div>
                      {!notification.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#34495E]" title="Belum dibaca"/>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {profile.verification_status === "pending" && (
              <section className="mt-6 flex items-start gap-3 rounded-2xl border border-[#EADCB9] bg-[#FFF9EC] p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F6EBCF] text-[#8A6A2E]"><Clock3 size={19}/></span>
                <div><h2 className="text-sm font-extrabold text-[#725725]">Profil usaha sedang menunggu persetujuan</h2><p className="mt-1 text-xs leading-6 text-[#8A7045]">Data usaha kamu sudah tersimpan. Tim Admin sedang memeriksa informasi dan dokumen, kemudian Super Admin akan memberikan keputusan akhir. Kamu akan melihat pemberitahuan di dashboard ini setelah status berubah. Fitur membuat lowongan akan terbuka setelah usaha disetujui.</p></div>
              </section>
            )}
            {profile.verification_status === "rejected" && (
              <section className="mt-6 flex items-start gap-3 rounded-2xl border border-[#E8CACA] bg-[#FFF5F5] p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F8E4E4] text-[#A34E4E]"><ShieldAlert size={19}/></span>
                <div><h2 className="text-sm font-extrabold text-[#934444]">Verifikasi usaha memerlukan perbaikan</h2><p className="mt-1 text-xs leading-6 text-[#A06464]">{profile.decision_notes || "Silakan periksa kembali data dan dokumen usaha yang kamu kirim."} Hubungi tim KerjaLokal jika membutuhkan bantuan.</p></div>
              </section>
            )}
            {profile.verification_status === "verified" && (
              <section className="mt-6 flex items-start gap-3 rounded-2xl border border-[#D6E8DC] bg-[#F1F8F3] p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#DDEFE3] text-[#347052]"><CheckCircle2 size={17}/></span>
                <div><h2 className="text-xs font-extrabold text-[#347052]">Usaha sudah terverifikasi</h2><p className="mt-1 text-[11px] leading-5 text-[#5E866E]">Kamu sudah dapat membuat lowongan. Setiap lowongan langsung tayang dan tetap dipantau oleh pemeriksaan keamanan otomatis.</p></div>
              </section>
            )}

            <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total lowongan", value: jobRows.length, icon: BriefcaseBusiness, note: "Semua lowongan usaha" },
                { label: "Lowongan tayang", value: activeJobs, icon: CheckCircle2, note: "Dapat menerima lamaran" },
                { label: "Perlu pemeriksaan", value: flaggedJobs, icon: ShieldAlert, note: "Ditandai sistem untuk ditinjau" },
                { label: "Total pelamar", value: totalApplications, icon: Users, note: "Dari seluruh lowongan" },
              ].map((item) => { const Icon = item.icon; return <article key={item.label} className="rounded-2xl border border-[#E2E7E9] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#7F8C8D]">{item.label}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]"><Icon size={17} /></span></div><p className="mt-3 text-2xl font-extrabold text-[#2C3E50]">{item.value}</p><p className="mt-1 text-[11px] text-[#8A969D]">{item.note}</p></article>; })}
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF1F2] px-5 py-4 sm:px-6">
                <div><h2 className="text-base font-extrabold text-[#2C3E50]">Lowongan terbaru</h2><p className="mt-1 text-xs text-[#8A969D]">Setiap lowongan memiliki daftar pelamar masing-masing.</p></div>
                <Link href="/dashboard/pelaku-usaha/lowongan" className="inline-flex items-center gap-1 text-xs font-extrabold text-[#34495E] hover:underline">Semua lowongan <ArrowRight size={14} /></Link>
              </div>
              {jobRows.length ? <div className="divide-y divide-[#EEF1F2]">{jobRows.slice(0, 5).map((job) => <div key={job.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-extrabold text-[#34495E]">{job.title}</h3><span className={`badge ${statusClass(job.status)} badge-sm`}>{statusLabel[job.status] ?? job.status}</span></div><p className="mt-1 text-[11px] text-[#8A969D]">{job.employment_type} · {job.district}, {job.city} · Dibuat {formatDate(job.created_at)}</p><p className="mt-1 text-[11px] font-semibold text-[#53616D]">{counts.get(job.id) ?? 0} pelamar terdaftar</p>{job.status === "banned" && <p className="mt-1 text-[11px] leading-5 text-[#A34E4E]">Diblokir: {job.ban_reason || "Lowongan terindikasi penipuan."}</p>}{job.fraud_review_status === "pending_review" && job.status !== "banned" && <p className="mt-1 text-[11px] leading-5 text-[#9A742D]">Sedang diperiksa oleh tim KerjaLokal.</p>}</div><div className="flex shrink-0 flex-wrap gap-2"><Link href={`/dashboard/pelaku-usaha/lowongan/${job.id}/pelamar`} className="btn btn-outline btn-sm rounded-lg border-[#BDC3C7] text-xs text-[#34495E]">Lihat Pelamar</Link>{job.status !== "banned" && <Link href={`/dashboard/pelaku-usaha/lowongan/${job.id}/edit`} className="btn btn-ghost btn-sm rounded-lg text-xs text-[#53616D]">Kelola</Link>}</div></div>)}</div> : <div className="px-6 py-12 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ECF0F1] text-[#53616D]"><BriefcaseBusiness size={24} /></span><h3 className="mt-4 text-sm font-extrabold text-[#34495E]">Belum ada lowongan</h3><p className="mt-1 text-xs text-[#8A969D]">Buat lowongan pertama untuk mulai menjangkau kandidat lokal.</p><Link href="/dashboard/pelaku-usaha/lowongan/baru" className="btn btn-primary btn-sm mt-4 rounded-full border-0 bg-[#2C3E50] px-5 text-white">Buat Lowongan <ArrowRight size={14} /></Link></div>}
            </section>
            <footer className="mt-9 flex flex-col items-center justify-between gap-2 border-t border-[#DCE2E5] py-5 text-[10px] text-[#9AA5AB] sm:flex-row"><span>© {new Date().getFullYear()} KerjaLokal</span><span>Kelola rekrutmen usaha dengan lebih terstruktur.</span></footer>
          </div>
        </div>
      </div>
    </main>
  );
}
