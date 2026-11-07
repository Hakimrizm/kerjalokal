import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BriefcaseBusiness,
  CalendarDays,
  GraduationCap,
  FileUser,
  Link2,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

export const instant = false;

function editHref(step: string) {
  return `/onboarding/job-seeker?edit=1&step=${step}`;
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  href,
}: {
  icon: typeof UserRound;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#EEF1F2] px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-[#2C3E50]">{title}</h2>
          <p className="mt-0.5 text-[11px] text-[#8A969D]">{subtitle}</p>
        </div>
      </div>
      <Link
        href={href}
        className="btn btn-ghost btn-sm min-h-9 rounded-full px-3 text-xs font-bold text-[#34495E] hover:bg-[#ECF0F1]"
      >
        <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
      </Link>
    </div>
  );
}

function EmptySection({
  text,
  href,
  action,
}: {
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="px-5 py-6 text-center sm:px-6">
      <p className="text-xs text-[#8A969D]">{text}</p>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#34495E] hover:underline">
        <Plus size={13} /> {action}
      </Link>
    </div>
  );
}

export default async function JobSeekerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/dashboard/pencari-kerja/profil");

  const [
    profileResult,
    jobProfileResult,
    skillsResult,
    educationResult,
    experienceResult,
    certificateResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("job_seeker_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("job_seeker_skills").select("id, skill_name").eq("user_id", user.id).order("skill_name"),
    supabase.from("job_seeker_education").select("*").eq("user_id", user.id).order("start_year", { ascending: false }),
    supabase.from("job_seeker_experiences").select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
    supabase.from("job_seeker_certificates").select("*").eq("user_id", user.id).order("issue_date", { ascending: false }),
  ]);

  const profile = profileResult.data;
  const jobProfile = jobProfileResult.data;

  if (!jobProfile?.profile_completed) redirect("/onboarding/job-seeker");

  const skills = skillsResult.data ?? [];
  const educations = educationResult.data ?? [];
  const experiences = experienceResult.data ?? [];
  const certificates = certificateResult.data ?? [];

  const name = profile?.full_name || user.user_metadata?.full_name || "Pencari Kerja";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();
  const location = [profile?.village, profile?.district, profile?.city, profile?.province].filter(Boolean).join(", ");
  const { data: signedPhoto } = profile?.photo_path
    ? await supabase.storage.from("profile-photos").createSignedUrl(profile.photo_path, 60 * 60)
    : { data: null };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/pencari-kerja" className="inline-flex items-center gap-2 text-xs font-bold text-[#667681] transition hover:text-[#2C3E50]">
          <ArrowLeft size={16} /> Kembali ke Dashboard
        </Link>
      </div>

      <section className="overflow-hidden rounded-[26px] bg-white shadow-sm">
          <div className="h-28 bg-gradient-to-r from-[#2C3E50] via-[#34495E] to-[#7F8C8D] sm:h-36" />
          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-11 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-end gap-4">
                {signedPhoto?.signedUrl ? (
                  <img src={signedPhoto.signedUrl} alt={`Foto profil ${name}`} className="h-24 w-24 rounded-2xl border-4 border-white object-cover shadow-md sm:h-28 sm:w-28" />
                ) : (
                  <span className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border-4 border-white bg-[#DCE4E8] text-2xl font-extrabold text-[#34495E] shadow-md sm:h-28 sm:w-28">{initials || "PK"}</span>
                )}
                <div className="min-w-0 pb-1">
                  <span className="badge badge-outline border-[#DCE3E6] bg-[#F7F9FA] text-[10px] font-bold text-[#53616D]">PROFIL PENCARI KERJA</span>
                  <h1 className="mt-2 truncate text-xl font-extrabold tracking-tight text-[#2C3E50] sm:text-2xl">{name}</h1>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#7F8C8D]"><MapPin size={13} />{location || "Lokasi belum ditambahkan"}</p>
                </div>
              </div>
              <Link href={editHref("identity")} className="btn btn-primary min-h-11 rounded-xl border-0 bg-[#2C3E50] px-5 text-xs font-bold text-white hover:bg-[#34495E]">
                <Pencil size={15} /> Edit Profil
              </Link>
            </div>
            {jobProfile?.summary && (
              <p className="mt-6 max-w-3xl text-sm leading-7 text-[#667681]">{jobProfile.summary}</p>
            )}
          </div>
        </section>

        <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-[#DCE5E8] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]"><FileUser size={20}/></span>
            <div>
              <h2 className="text-sm font-extrabold text-[#2C3E50]">CV Profesional Otomatis</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#7F8C8D]">Data profilmu sudah dapat disusun menjadi CV berformat ATS. Lihat pratinjau atau unduh PDF untuk digunakan melamar pekerjaan.</p>
            </div>
          </div>
          <Link href="/dashboard/pencari-kerja/cv" className="btn min-h-10 shrink-0 rounded-xl border-0 bg-[#2C3E50] px-4 text-xs font-bold text-white hover:bg-[#34495E]">
            Preview CV <ArrowRight size={14}/>
          </Link>
        </section>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
              <SectionHeading icon={UserRound} title="Informasi pribadi" subtitle="Identitas dan alamat tempat tinggal" href={editHref("identity")} />
              <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
                {[
                  ["Nama lengkap", profile?.full_name || "Belum diisi"],
                  ["Email", user.email || "—"],
                  ["Nomor telepon", profile?.phone || "Belum diisi"],
                  ["Tanggal lahir", profile?.birth_date || "Belum diisi"],
                  ["Jenis kelamin", profile?.gender || "Belum diisi"],
                  ["Kode pos", profile?.postal_code || "Belum diisi"],
                  ["Provinsi", profile?.province || "Belum diisi"],
                  ["Kabupaten/Kota", profile?.city || "Belum diisi"],
                  ["Kecamatan", profile?.district || "Belum diisi"],
                  ["Desa/Kelurahan", profile?.village || "Belum diisi"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">{label}</p>
                    <p className="mt-1.5 break-words text-sm font-semibold text-[#53616D]">{value}</p>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">Alamat lengkap</p>
                  <p className="mt-1.5 text-sm leading-6 text-[#53616D]">{profile?.address || "Belum diisi"}</p>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
              <SectionHeading icon={Sparkles} title="Keahlian & preferensi kerja" subtitle="Skill dan jenis pekerjaan yang diminati" href={editHref("skills")} />
              <div className="p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">Posisi yang dicari</p>
                    <p className="mt-1.5 text-sm font-semibold text-[#53616D]">{jobProfile?.desired_position || "Belum diisi"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">Kategori</p>
                    <p className="mt-1.5 text-sm font-semibold text-[#53616D]">{jobProfile?.job_category || "Belum diisi"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">Tipe pekerjaan</p>
                    <p className="mt-1.5 text-sm font-semibold text-[#53616D]">{jobProfile?.employment_types?.join(", ") || "Belum dipilih"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">Ketersediaan</p>
                    <p className="mt-1.5 text-sm font-semibold text-[#53616D]">{jobProfile?.availability || "Belum diatur"}</p>
                  </div>
                </div>
                <div className="mt-5 border-t border-[#EEF1F2] pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">Daftar keahlian</p>
                  {skills.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skills.map((skill: { id: string; skill_name: string }) => <span key={skill.id} className="rounded-full bg-[#F1F4F5] px-3 py-2 text-xs font-semibold text-[#53616D]">{skill.skill_name}</span>)}
                    </div>
                  ) : (
                    <EmptySection text="Belum ada keahlian." href={editHref("skills")} action="Tambah keahlian" />
                  )}
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
              <SectionHeading icon={GraduationCap} title="Pendidikan" subtitle="Riwayat pendidikan formal maupun nonformal" href={editHref("education")} />
              {educations.length ? (
                <div className="divide-y divide-[#EEF1F2]">
                  {educations.map((item: { id: string; education_level: string; institution: string; major: string | null; start_year: number | null; end_year: number | null; is_current: boolean; description: string | null }) => (
                    <div key={item.id} className="flex gap-3 px-5 py-4 sm:px-6">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#53616D]"><GraduationCap size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-[#34495E]">{item.institution}</p>
                        <p className="mt-1 text-xs text-[#667681]">{item.education_level}{item.major ? ` · ${item.major}` : ""}</p>
                        <p className="mt-1 text-[10px] text-[#9AA5AB]">{item.start_year || "—"} – {item.is_current ? "Sekarang" : item.end_year || "—"}</p>
                        {item.description && <p className="mt-2 text-xs leading-5 text-[#7F8C8D]">{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptySection text="Belum ada riwayat pendidikan yang ditambahkan." href={editHref("education")} action="Tambah pendidikan" />
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
              <SectionHeading icon={BriefcaseBusiness} title="Pengalaman kerja" subtitle="Pekerjaan, magang, dan pengalaman profesional" href={editHref("experience")} />
              {experiences.length ? (
                <div className="divide-y divide-[#EEF1F2]">
                  {experiences.map((item: { id: string; company: string; position: string; employment_type: string | null; location: string | null; start_date: string | null; end_date: string | null; is_current: boolean; description: string | null }) => (
                    <div key={item.id} className="flex gap-3 px-5 py-4 sm:px-6">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#53616D]"><BriefcaseBusiness size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-[#34495E]">{item.position}</p>
                        <p className="mt-1 text-xs font-semibold text-[#667681]">{item.company}{item.location ? ` · ${item.location}` : ""}</p>
                        <p className="mt-1 text-[10px] text-[#9AA5AB]">{formatDate(item.start_date)} – {item.is_current ? "Sekarang" : formatDate(item.end_date)}{item.employment_type ? ` · ${item.employment_type}` : ""}</p>
                        {item.description && <p className="mt-2 whitespace-pre-line text-xs leading-5 text-[#7F8C8D]">{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-6 sm:px-6">
                  <p className="text-xs leading-5 text-[#8A969D]">Belum ada pengalaman kerja. Jika kamu fresh graduate, bagian ini boleh dikosongkan. Kamu juga dapat menambahkan magang, freelance, organisasi, atau pengalaman relevan lainnya.</p>
                  <Link href={editHref("experience")} className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#34495E] hover:underline"><Plus size={13} /> Tambah pengalaman</Link>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
              <SectionHeading icon={Award} title="Sertifikat & pelatihan" subtitle="Sertifikat kompetensi, kursus, dan pelatihan" href={editHref("certificates")} />
              {certificates.length ? (
                <div className="divide-y divide-[#EEF1F2]">
                  {certificates.map((item: { id: string; certificate_name: string; issuer: string; issue_date: string | null; expiry_date: string | null; credential_url: string | null; description: string | null }) => (
                    <div key={item.id} className="flex gap-3 px-5 py-4 sm:px-6">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#53616D]"><Award size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-[#34495E]">{item.certificate_name}</p>
                        <p className="mt-1 text-xs text-[#667681]">{item.issuer}</p>
                        <p className="mt-1 text-[10px] text-[#9AA5AB]">{formatDate(item.issue_date)}{item.expiry_date ? ` – ${formatDate(item.expiry_date)}` : ""}</p>
                        {item.credential_url && <a href={item.credential_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#53616D] hover:underline"><Link2 size={12} /> Lihat bukti sertifikat</a>}
                        {item.description && <p className="mt-2 text-xs leading-5 text-[#7F8C8D]">{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptySection text="Belum ada sertifikat atau pelatihan yang ditambahkan. Bagian ini opsional." href={editHref("certificates")} action="Tambah sertifikat" />
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-[#53616D]" />
                <h2 className="text-sm font-extrabold text-[#2C3E50]">Privasi profil</h2>
              </div>
              <p className="mt-2 text-xs leading-6 text-[#7F8C8D]">Kamu dapat memperbarui informasi kapan saja. Informasi profil dan dokumen pribadi sebaiknya hanya dibagikan kepada pelaku usaha melalui proses lamaran yang kamu setujui.</p>
            </section>

            <section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Link2 size={17} className="text-[#53616D]" />
                <h2 className="text-sm font-extrabold text-[#2C3E50]">Tautan profesional</h2>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">Portofolio</p>
                  {jobProfile?.portfolio_url ? <a href={jobProfile.portfolio_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs font-semibold text-[#53616D] hover:underline">{jobProfile.portfolio_url}</a> : <p className="mt-1 text-xs text-[#8A969D]">Belum ditambahkan</p>}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">LinkedIn</p>
                  {jobProfile?.linkedin_url ? <a href={jobProfile.linkedin_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs font-semibold text-[#53616D] hover:underline">{jobProfile.linkedin_url}</a> : <p className="mt-1 text-xs text-[#8A969D]">Belum ditambahkan</p>}
                </div>
                <Link href={editHref("certificates")} className="inline-flex items-center gap-1 text-xs font-extrabold text-[#34495E] hover:underline"><Pencil size={12} /> Ubah tautan</Link>
              </div>
            </section>

            <section className="rounded-2xl bg-[#2C3E50] p-5 text-white shadow-lg shadow-[#2C3E50]/10">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><CalendarDays size={19} /></span>
              <h2 className="mt-4 text-base font-extrabold">Profil bisa berkembang</h2>
              <p className="mt-2 text-xs leading-6 text-white/65">Tidak perlu menunggu sampai memiliki banyak pengalaman. Tambahkan informasi baru setiap kali kamu mengikuti pelatihan, menyelesaikan pendidikan, atau mendapatkan pengalaman kerja.</p>
              <Link href="/dashboard/pencari-kerja" className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-white hover:underline">Kembali ke dashboard <ArrowRight size={13} /></Link>
            </section>
          </aside>
        </div>
      </div>
  );
}
