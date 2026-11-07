import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApplicationStatusControl } from "@/components/application-status-control";
import { ArrowLeft, CheckCircle2, Download, FileText, MapPin, Phone, Sparkles, Users } from "lucide-react";

export const instant = false;

type PageProps = { params: Promise<{ jobId: string }> };
function dateLabel(value?: string | null) {
  if (!value) return "Tanggal tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

export default async function EmployerJobApplicantsPage({ params }: PageProps) {
  const { jobId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  if (role?.role !== "employer") redirect("/dashboard/pencari-kerja");

  const { data: job } = await supabase.from("jobs").select("id,title,category,employment_type,status,city,district,vacancies").eq("id", jobId).eq("employer_id", user.id).maybeSingle();
  if (!job) notFound();

  const { data: applications } = await supabase.from("job_applications")
    .select("id,applicant_id,cover_letter,status,applied_at,cv_path,cv_file_name,cv_generated_at")
    .eq("job_id", jobId)
    .order("applied_at", { ascending: false });

  const rows = await Promise.all((applications ?? []).map(async (application) => {
    if (!application.cv_path) return { ...application, cv_signed_url: null as string | null };
    const { data: signedFile } = await supabase.storage
      .from("job-seeker-cvs")
      .createSignedUrl(application.cv_path, 60 * 60, {
        download: application.cv_file_name || true,
      });
    return { ...application, cv_signed_url: signedFile?.signedUrl ?? null };
  }));
  const applicantIds = [...new Set(rows.map((item) => item.applicant_id))];

  const [profilesResult, preferencesResult, skillsResult, educationResult, experienceResult] = applicantIds.length
    ? await Promise.all([
        supabase.from("profiles").select("id,full_name,phone,province,city,district,village,address").in("id", applicantIds),
        supabase.from("job_seeker_profiles").select("user_id,desired_position,summary").in("user_id", applicantIds),
        supabase.from("job_seeker_skills").select("id,user_id,skill_name").in("user_id", applicantIds),
        supabase.from("job_seeker_education").select("id,user_id,education_level,institution,major,start_year,end_year,is_current").in("user_id", applicantIds),
        supabase.from("job_seeker_experiences").select("id,user_id,company,position,start_date,end_date,is_current,description").in("user_id", applicantIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const profiles = profilesResult.data ?? [];
  const preferences = preferencesResult.data ?? [];
  const skills = skillsResult.data ?? [];
  const education = educationResult.data ?? [];
  const experience = experienceResult.data ?? [];

  const profileMap = new Map<string, (typeof profiles)[number]>();
  profiles.forEach((item) => profileMap.set(item.id, item));
  const preferenceMap = new Map<string, (typeof preferences)[number]>();
  preferences.forEach((item) => preferenceMap.set(item.user_id, item));
  const skillMap = new Map<string, string[]>();
  for (const item of skills) skillMap.set(item.user_id, [...(skillMap.get(item.user_id) ?? []), item.skill_name]);
  const educationMap = new Map<string, typeof education>();
  for (const item of education) educationMap.set(item.user_id, [...(educationMap.get(item.user_id) ?? []), item]);
  const experienceMap = new Map<string, typeof experience>();
  for (const item of experience) experienceMap.set(item.user_id, [...(experienceMap.get(item.user_id) ?? []), item]);

  const countByStatus = (status: string) => rows.filter((item) => item.status === status).length;
  const acceptedCount = countByStatus("accepted");
  const vacancies = Number(job.vacancies) || 1;
  const remainingVacancies = Math.max(0, vacancies - acceptedCount);
  const quotaFilled = acceptedCount >= vacancies || job.status === "finished";

  return (
    <div className="space-y-6">
      <Link href="/dashboard/pelaku-usaha/lowongan" className="inline-flex items-center gap-2 text-[13px] font-extrabold text-[#284B67] transition-colors hover:text-[#2C3E50]">
        <ArrowLeft size={15} /> Kembali ke Kelola Lowongan
      </Link>

      <header>
        <span className="badge badge-outline border-[#BDC3C7] bg-white text-[10px] font-bold text-[#53616D]">DAFTAR PELAMAR PER LOWONGAN</span>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">{job.title}</h1>
        <p className="mt-1 text-xs text-[#7F8C8D]">{job.category} · {job.employment_type} · {job.district}, {job.city}</p>
      </header>

      <div className="flex items-center gap-2 rounded-xl border border-[#E2E7E9] bg-white px-4 py-3">
        <Users size={18} className="text-[#53616D]" />
        <div>
          <p className="text-lg font-extrabold">{rows.length}</p>
          <p className="text-[10px] text-[#8A969D]">Total pelamar</p>
        </div>
      </div>

      {acceptedCount > 0 && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${quotaFilled ? "border-[#CFE2D5] bg-[#F0F7F2] text-[#355E45]" : "border-[#DCE5EA] bg-[#F2F7FA] text-[#355E73]"}`}>
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-extrabold">{quotaFilled ? "Kuota tenaga kerja terpenuhi" : "Proses penerimaan masih berlangsung"}</p>
            <p className={`mt-1 text-[11px] leading-5 ${quotaFilled ? "text-[#557562]" : "text-[#5E7787]"}`}>
              {quotaFilled
                ? `${acceptedCount} dari ${vacancies} posisi telah terisi. Lowongan ditandai selesai dan tidak lagi ditampilkan kepada pencari kerja. Pelamar aktif yang tersisa otomatis ditolak.`
                : `${acceptedCount} dari ${vacancies} posisi telah terisi. Masih tersedia ${remainingVacancies} posisi, sehingga kandidat lain tetap dapat diproses dan status wawancara masih bisa diperbarui.`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {[
          ["Masuk", countByStatus("submitted")],
          ["Ditinjau", countByStatus("reviewing")],
          ["Wawancara", countByStatus("interview")],
          ["Diterima", `${acceptedCount}/${vacancies}`],
          ["Ditolak", countByStatus("rejected")],
          ["Posisi tersisa", remainingVacancies],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-[#E2E7E9] bg-white p-3">
            <p className="text-[10px] font-semibold text-[#8A969D]">{label}</p>
            <p className="mt-1 text-xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>

      {rows.length ? (
        <div className="space-y-4">
          {rows.map((application) => {
            const candidate = profileMap.get(application.applicant_id);
            const preference = preferenceMap.get(application.applicant_id);
            const candidateName = candidate?.full_name || "Nama belum tersedia";
            const initials = candidateName.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();
            const candidateLocation = [candidate?.village, candidate?.district, candidate?.city].filter(Boolean).join(", ");
            const candidateSkills = skillMap.get(application.applicant_id) ?? [];
            const candidateEducation = educationMap.get(application.applicant_id) ?? [];
            const candidateExperience = experienceMap.get(application.applicant_id) ?? [];
            return (
              <article key={application.id} className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
                <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#ECF0F1] text-base font-extrabold text-[#34495E]">
                      {initials || "PK"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-extrabold text-[#2C3E50]">{candidateName}</h2>
                        <span className="badge badge-outline border-[#DCE3E6] text-[10px] text-[#7F8C8D]">Pelamar</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-[#53616D]">{preference?.desired_position || "Posisi yang diminati belum diisi"}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#8A969D]">
                        <span className="inline-flex items-center gap-1"><MapPin size={12} />{candidateLocation || "Lokasi belum diisi"}</span>
                        {candidate?.phone && <span className="inline-flex items-center gap-1"><Phone size={12} />{candidate.phone}</span>}
                      </div>
                      <p className="mt-2 text-[10px] text-[#9AA5AB]">Melamar pada {dateLabel(application.applied_at)}</p>
                      {preference?.summary && <p className="mt-3 max-w-3xl text-xs leading-6 text-[#667681]">{preference.summary}</p>}
                    </div>
                  </div>
                  <div className="shrink-0 lg:w-[190px]">
                    <ApplicationStatusControl key={`${application.id}:${application.status}`} applicationId={application.id} currentStatus={application.status} acceptedCount={acceptedCount} vacancies={vacancies} />
                  </div>
                </div>
                <div className="mx-5 mb-4 flex flex-col gap-3 rounded-xl border border-[#DCE5E8] bg-[#F7F9FA] p-4 sm:mx-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[#34495E]"><FileText size={19} /></span>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-[#34495E]">{application.cv_path ? "CV ATS terlampir" : "Belum ada CV terlampir"}</p>
                      <p className="mt-0.5 truncate text-[10px] text-[#8A969D]">{application.cv_file_name || (application.cv_path ? "Dokumen CV PDF" : "Lamaran sebelum fitur CV otomatis")}</p>
                    </div>
                  </div>
                  {application.cv_signed_url ? (
                    <a href={application.cv_signed_url} target="_blank" rel="noreferrer" download={application.cv_file_name || "CV-Pelamar.pdf"} className="btn btn-sm min-h-9 shrink-0 rounded-lg border-0 bg-[#2C3E50] px-4 text-[11px] font-bold text-white hover:bg-[#34495E]">
                      <Download size={14} /> Unduh CV
                    </a>
                  ) : (
                    <span className="text-[10px] text-[#9AA5AB]">{application.cv_path ? "Akses dokumen belum aktif." : "Lamaran ini dikirim sebelum fitur CV otomatis tersedia."}</span>
                  )}
                </div>
                <div className="border-t border-[#EEF1F2] bg-[#FBFCFC] px-5 py-4 sm:px-6">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-extrabold text-[#34495E]">
                      <span className="inline-flex items-center gap-2"><Sparkles size={15} /> Lihat ringkasan kandidat</span>
                      <span className="text-[10px] font-semibold text-[#8A969D] group-open:hidden">Buka detail</span>
                      <span className="hidden text-[10px] font-semibold text-[#8A969D] group-open:inline">Tutup detail</span>
                    </summary>
                    <div className="mt-4 grid gap-5 md:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9AA5AB]">Keahlian</p>
                        {candidateSkills.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {candidateSkills.map((skill) => (
                              <span key={skill} className="rounded-full bg-[#ECF0F1] px-2.5 py-1.5 text-[10px] font-semibold text-[#53616D]">
                                {skill}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-[#8A969D]">Belum ada keahlian.</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9AA5AB]">Pendidikan</p>
                        {candidateEducation.length ? (
                          candidateEducation.slice(0, 2).map((item) => (
                            <div key={item.id} className="mt-2">
                              <p className="text-xs font-bold text-[#53616D]">{item.institution}</p>
                              <p className="mt-0.5 text-[10px] text-[#8A969D]">{item.education_level}{item.major ? ` · ${item.major}` : ""}</p>
                            </div>
                          ))
                        ) : (
                          <p className="mt-2 text-xs text-[#8A969D]">Belum ada pendidikan.</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9AA5AB]">Pengalaman</p>
                        {candidateExperience.length ? (
                          candidateExperience.slice(0, 2).map((item) => (
                            <div key={item.id} className="mt-2">
                              <p className="text-xs font-bold text-[#53616D]">{item.position}</p>
                              <p className="mt-0.5 text-[10px] text-[#8A969D]">{item.company}</p>
                            </div>
                          ))
                        ) : (
                          <p className="mt-2 text-xs text-[#8A969D]">Belum ada pengalaman kerja.</p>
                        )}
                      </div>
                    </div>
                    {application.cover_letter && (
                      <div className="mt-5 rounded-xl border border-[#E2E7E9] bg-white p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9AA5AB]">Pesan lamaran</p>
                        <p className="mt-2 whitespace-pre-line text-xs leading-6 text-[#53616D]">{application.cover_letter}</p>
                      </div>
                    )}
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#C9D3D8] bg-white px-6 py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ECF0F1] text-[#53616D]">
            <Users size={25} />
          </span>
          <h2 className="mt-4 text-base font-extrabold">Belum ada pelamar</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8A969D]">
            Lamaran yang masuk untuk posisi {job.title} akan tampil di halaman ini. Pelamar dari lowongan lain tidak akan tercampur di sini.
          </p>
        </div>
      )}
    </div>
  );
}