"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import type { CareerMatchScore } from "@/lib/career-match-scoring";

type JobListing = {
  id: string;
  employer_id: string;
  title: string;
  category: string;
  employment_type: string;
  city: string;
  district: string;
  province: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_negotiable: boolean;
  application_deadline: string | null;
  created_at: string;
  description: string;
  responsibilities: string | null;
  requirements: string;
  experience_level: string | null;
  education_level: string | null;
  business_name: string;
};

type AiAnalysis = {
  summary?: string;
  strengths?: string[];
  gaps?: string[];
  recommendations?: string[];
  skill_matches?: { skill: string; status: "matched" | "partial" | "missing" }[];
  source?: "gemini" | "heuristic";
};

function formatCurrency(value: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function salaryLabel(job: JobListing) {
  if (job.salary_negotiable && job.salary_min == null && job.salary_max == null) {
    return "Dapat dinegosiasikan";
  }
  if (job.salary_min != null && job.salary_max != null) {
    return `${formatCurrency(job.salary_min)} – ${formatCurrency(job.salary_max)}`;
  }
  if (job.salary_min != null) return `Mulai ${formatCurrency(job.salary_min)}`;
  if (job.salary_max != null) return `Maksimal ${formatCurrency(job.salary_max)}`;
  return "Gaji dibicarakan";
}

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-100";
  if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-100";
  return "text-rose-700 bg-rose-50 border-rose-100";
}

function progressTone(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-rose-500";
}

export function CareerMatchJobList({
  jobs,
  canUseCareerMatch,
  isAuthenticated,
}: {
  jobs: JobListing[];
  canUseCareerMatch: boolean;
  isAuthenticated: boolean;
}) {
  const jobIdKey = jobs.map((job) => job.id).join(",");
  const [matches, setMatches] = useState<Record<string, CareerMatchScore>>({});
  const [loading, setLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, AiAnalysis>>({});
  const [aiLoadingJobId, setAiLoadingJobId] = useState<string | null>(null);
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!canUseCareerMatch || !jobIdKey) return;

    let cancelled = false;
    const loadMatches = async () => {
      setLoading(true);
      setMatchError(null);
      try {
        const allJobIds = jobIdKey.split(",").filter(Boolean);
        const combinedScores: Record<string, CareerMatchScore> = {};

        for (let index = 0; index < allJobIds.length; index += 100) {
          const jobIds = allJobIds.slice(index, index + 100);
          const response = await fetch("/api/career-match/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobIds }),
          });
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.error || "Kecocokan lowongan gagal dihitung.");
          }
          Object.assign(combinedScores, result.data ?? {});
        }

        if (!cancelled) setMatches(combinedScores);
      } catch (error) {
        if (!cancelled) {
          setMatchError(error instanceof Error ? error.message : "Terjadi kesalahan saat menghitung kecocokan.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadMatches();
    return () => {
      cancelled = true;
    };
  }, [canUseCareerMatch, jobIdKey, retry]);

  async function loadAiAnalysis(jobId: string) {
    if (aiAnalysis[jobId] || aiLoadingJobId === jobId) return;
    setAiLoadingJobId(jobId);
    setAiErrors((current) => ({ ...current, [jobId]: "" }));
    try {
      const response = await fetch("/api/career-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Analisis AI belum dapat dimuat.");
      }
      setAiAnalysis((current) => ({ ...current, [jobId]: result.data }));
    } catch (error) {
      setAiErrors((current) => ({
        ...current,
        [jobId]: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat analisis AI.",
      }));
    } finally {
      setAiLoadingJobId(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-2xl border border-[#DCE6EC] bg-gradient-to-r from-[#F0F5F8] to-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#2C3E50] text-white">
            <BrainCircuit size={21} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold text-[#2C3E50]">CareerMatch AI</h2>
              <span className="rounded-full border border-[#C9D8E1] bg-white px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#456278]">
                Analisis personal
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#71818B]">
              Persentase kecocokan dihitung dengan membandingkan keahlian, pengalaman, pendidikan,
              preferensi posisi, domisili, jenis pekerjaan, dan ekspektasi gaji pada profilmu.
            </p>
          </div>
        </div>
        {canUseCareerMatch ? (
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#647783]">
            {loading ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} className="text-emerald-600" />}
            {loading ? "Menganalisis lowongan..." : "Analisis aktif"}
          </div>
        ) : isAuthenticated ? (
          <span className="shrink-0 rounded-xl border border-[#DCE6EC] bg-white px-3 py-2.5 text-[10px] font-semibold text-[#71818B]">
            Khusus akun pencari kerja
          </span>
        ) : (
          <Link
            href="/auth/login?next=%2Flowongan"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2C3E50] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1F3040]"
          >
            Masuk untuk melihat kecocokan <ArrowRight size={14} />
          </Link>
        )}
      </section>

      {matchError && canUseCareerMatch && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          <span className="flex items-center gap-2"><AlertCircle size={15} />{matchError}</span>
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="inline-flex items-center gap-1.5 font-bold underline underline-offset-2"
          >
            <RefreshCw size={13} /> Coba lagi
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {jobs.map((job) => {
          const match = matches[job.id];
          const isExpanded = expandedJobId === job.id;
          const ai = aiAnalysis[job.id];

          return (
            <article
              key={job.id}
              className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]">
                    <BriefcaseBusiness size={21} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A969D]">{job.category}</p>
                    <h2 className="mt-1 text-base font-extrabold text-[#2C3E50]">{job.title}</h2>
                    <p className="mt-1 text-xs font-semibold text-[#667681]">{job.business_name || "Usaha terverifikasi"}</p>
                  </div>
                  {canUseCareerMatch && (
                    <div className="min-w-[76px] text-right">
                      {loading && !match ? (
                        <div className="ml-auto flex h-[62px] w-[76px] flex-col items-center justify-center rounded-xl bg-[#F3F6F7] text-[#82919A]">
                          <LoaderCircle size={16} className="animate-spin" />
                          <span className="mt-1 text-[9px] font-semibold">Menghitung</span>
                        </div>
                      ) : match?.match_score != null ? (
                        <div className={`rounded-xl border px-2 py-2 ${scoreTone(match.match_score)}`}>
                          <p className="text-xl font-black leading-none tabular-nums">{match.match_score}%</p>
                          <p className="mt-1 text-[8px] font-extrabold uppercase tracking-wide">Cocok</p>
                        </div>
                      ) : match ? (
                        <div className="rounded-xl border border-amber-100 bg-amber-50 px-2 py-2 text-amber-700">
                          <Target size={16} className="mx-auto" />
                          <p className="mt-1 text-[8px] font-extrabold uppercase leading-3">Profil perlu<br />dilengkapi</p>
                        </div>
                      ) : matchError ? (
                        <div className="rounded-xl border border-rose-100 bg-rose-50 px-2 py-2 text-rose-700">
                          <AlertCircle size={16} className="mx-auto" />
                          <p className="mt-1 text-[8px] font-extrabold uppercase leading-3">Analisis<br />gagal</p>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-[#E8EDF0] bg-[#F6F8F9] px-2 py-2 text-[#84939B]">
                          <Target size={16} className="mx-auto" />
                          <p className="mt-1 text-[8px] font-extrabold uppercase leading-3">Belum<br />tersedia</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 space-y-2 border-y border-[#EEF1F2] py-4 text-xs text-[#7F8C8D]">
                  <p className="flex items-center gap-2"><MapPin size={14} />{job.district}, {job.city}</p>
                  <p className="flex items-center gap-2"><Wallet size={14} />{salaryLabel(job)}</p>
                  <p className="flex items-center gap-2"><BriefcaseBusiness size={14} />{job.employment_type}</p>
                  <p className="flex items-center gap-2">
                    <CalendarDays size={14} />
                    {job.application_deadline
                      ? `Batas lamaran ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${job.application_deadline}T00:00:00`))}`
                      : "Tidak ada batas akhir yang ditentukan"}
                  </p>
                </div>

                {canUseCareerMatch && match?.match_score != null && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${scoreTone(match.match_score)}`}>
                      {match.verdict}
                    </span>
                    <span className="text-[10px] text-[#8A969D]">
                      {match.available_attributes}/{match.total_attributes} atribut dianalisis
                    </span>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="badge badge-outline border-[#DCE3E6] text-[10px] text-[#53616D]">{job.employment_type}</span>
                  <div className="flex items-center gap-2">
                    {canUseCareerMatch && (
                      <button
                        type="button"
                        onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#D9E1E5] px-3 py-2 text-[11px] font-bold text-[#435A69] transition hover:bg-[#F5F7F8]"
                      >
                        {isExpanded ? "Tutup analisis" : "Rincian cocok"}
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    )}
                    <Link
                      href={`/lowongan/${job.id}`}
                      className="btn btn-primary btn-sm rounded-lg border-0 bg-[#2C3E50] text-white"
                    >
                      Lihat Detail <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>

                {canUseCareerMatch && isExpanded && (
                  <div className="mt-5 space-y-4 border-t border-[#E9EEF0] pt-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-extrabold text-[#2C3E50]">Rincian kecocokan atribut</h3>
                        {match && <span className="text-[10px] font-semibold text-[#82919A]">Cakupan data {match.coverage}%</span>}
                      </div>
                      <p className="mt-1 text-[10px] leading-5 text-[#87949B]">
                        Bobot setiap atribut digunakan untuk menghitung persentase. Atribut yang belum memiliki data tidak dipaksakan menjadi nilai 0.
                      </p>
                    </div>

                    {match?.attributes.map((attribute) => (
                      <div key={attribute.key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-bold text-[#4B5E69]">
                            {attribute.label}
                            <span className="ml-1 font-normal text-[#9AA5AB]">({attribute.weight}%)</span>
                          </span>
                          <span className="text-[11px] font-extrabold tabular-nums text-[#34495E]">
                            {attribute.score == null ? "Belum ada data" : `${attribute.score}%`}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#EDF1F3]">
                          {attribute.score != null && (
                            <div
                              className={`h-full rounded-full transition-all ${progressTone(attribute.score)}`}
                              style={{ width: `${attribute.score}%` }}
                            />
                          )}
                        </div>
                        <p className="text-[10px] leading-5 text-[#82919A]">{attribute.detail}</p>
                        {attribute.matched.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {attribute.matched.map((item) => (
                              <span key={item} className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">{item}</span>
                            ))}
                          </div>
                        )}
                        {attribute.missing.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {attribute.missing.map((item) => (
                              <span key={item} className="rounded-md bg-rose-50 px-2 py-1 text-[9px] font-semibold text-rose-700">{item}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {match?.match_score == null && (
                      <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                        <p className="text-[11px] font-bold text-amber-800">Data profil belum cukup</p>
                        <p className="mt-1 text-[10px] leading-5 text-amber-700">
                          Lengkapi keahlian, pengalaman, pendidikan, dan preferensi pekerjaan agar CareerMatch dapat menghitung persentase yang lebih akurat.
                        </p>
                        <Link href="/dashboard/pencari-kerja/profil" className="mt-2 inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 underline underline-offset-2">
                          Lengkapi profil <ArrowRight size={12} />
                        </Link>
                      </div>
                    )}

                    {match?.summary && (
                      <p className="rounded-xl bg-[#F5F7F8] p-3 text-[10px] leading-5 text-[#637580]">{match.summary}</p>
                    )}

                    <div className="border-t border-[#E9EEF0] pt-3">
                      <button
                        type="button"
                        onClick={() => void loadAiAnalysis(job.id)}
                        disabled={aiLoadingJobId === job.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#2C3E50] px-3 py-2.5 text-[10px] font-bold text-white transition hover:bg-[#1F3040] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {aiLoadingJobId === job.id ? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />}
                        {ai ? "Analisis AI dimuat" : "Analisis AI lebih lanjut"}
                      </button>

                      {aiErrors[job.id] && (
                        <p className="mt-2 text-[10px] text-rose-600">{aiErrors[job.id]}</p>
                      )}

                      {ai && (
                        <div className="mt-3 space-y-3 rounded-xl border border-[#DCE6EC] bg-[#F7FAFB] p-3">
                          <div className="flex items-center gap-2">
                            <BrainCircuit size={15} className="text-[#456278]" />
                            <p className="text-[11px] font-extrabold text-[#2C3E50]">Insight CareerMatch AI</p>
                            <span className="ml-auto rounded-full bg-white px-2 py-1 text-[8px] font-bold uppercase text-[#73838D]">
                              {ai.source === "gemini" ? "Gemini AI" : "Analisis heuristik"}
                            </span>
                          </div>
                          {ai.summary && <p className="text-[10px] leading-5 text-[#647783]">{ai.summary}</p>}
                          {ai.strengths?.length ? (
                            <div>
                              <p className="mb-1 text-[10px] font-extrabold text-emerald-800">Kekuatan profil</p>
                              <ul className="list-disc space-y-1 pl-4 text-[10px] leading-5 text-[#647783]">
                                {ai.strengths.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                              </ul>
                            </div>
                          ) : null}
                          {ai.gaps?.length ? (
                            <div>
                              <p className="mb-1 text-[10px] font-extrabold text-amber-800">Hal yang perlu ditingkatkan</p>
                              <ul className="list-disc space-y-1 pl-4 text-[10px] leading-5 text-[#647783]">
                                {ai.gaps.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                              </ul>
                            </div>
                          ) : null}
                          {ai.recommendations?.length ? (
                            <div>
                              <p className="mb-1 text-[10px] font-extrabold text-[#456278]">Rekomendasi</p>
                              <ul className="list-disc space-y-1 pl-4 text-[10px] leading-5 text-[#647783]">
                                {ai.recommendations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                              </ul>
                            </div>
                          ) : null}
                          {ai.skill_matches?.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {ai.skill_matches.map((item) => (
                                <span
                                  key={item.skill}
                                  className={`rounded-md px-2 py-1 text-[9px] font-bold ${
                                    item.status === "matched"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : item.status === "partial"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {item.skill}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
