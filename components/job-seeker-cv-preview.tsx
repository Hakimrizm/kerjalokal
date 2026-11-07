"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import type { JobSeekerCvData } from "@/lib/cv/data";

function safeExternalUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function monthLabel(value?: string | null) {
  if (!value) return "";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(date);
}

function periodLabel(start?: string | null, end?: string | null, current?: boolean) {
  const from = monthLabel(start);
  const to = current ? "Sekarang" : monthLabel(end);
  return [from, to].filter(Boolean).join(" - ");
}

function yearPeriod(start?: number | null, end?: number | null, current?: boolean) {
  return [start, current ? "Sekarang" : end].filter(Boolean).join(" - ");
}

export function JobSeekerCvPreview({ data }: { data: JobSeekerCvData }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function downloadCv() {
    setError("");
    setDownloading(true);

    try {
      const response = await fetch("/api/cv/generate", { method: "GET", cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "CV belum berhasil dibuat. Coba kembali.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safeName = data.fullName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "Pencari-Kerja";
      anchor.href = url;
      anchor.download = `CV-${safeName}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Terjadi kesalahan saat mengunduh CV.");
    } finally {
      setDownloading(false);
    }
  }

  const linkedinHref = safeExternalUrl(data.linkedinUrl);
  const portfolioHref = safeExternalUrl(data.portfolioUrl);
  const hasContact = Boolean(data.email || data.phone || data.location || linkedinHref || portfolioHref);

  return (
    <main className="min-h-screen bg-[#F3F5F6] px-4 py-7 text-[#2C3E50] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard/pencari-kerja" className="inline-flex items-center gap-2 text-xs font-bold text-[#667681] transition hover:text-[#2C3E50]">
            <ArrowLeft size={16} /> Kembali ke Dashboard
          </Link>
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            kerja<span className="text-[#7F8C8D]">lokal</span>
          </Link>
        </header>

        <section className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#DCE5E8] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#EAF0F3] text-[#34495E]">
              <FileText size={22} />
            </span>
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF7F1] px-2.5 py-1 text-[10px] font-bold text-[#4E765B]">
                <CheckCircle2 size={12} /> CV SIAP DIGUNAKAN
              </span>
              <h1 className="mt-2 text-xl font-extrabold tracking-tight sm:text-2xl">Preview CV ATS</h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#7F8C8D]">
                CV dibuat otomatis dari data profilmu. Perbarui profil kapan saja untuk memperbarui isi CV.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void downloadCv()}
            disabled={downloading}
            className="btn min-h-12 rounded-xl border-0 bg-[#2C3E50] px-5 text-xs font-extrabold text-white hover:bg-[#34495E]"
          >
            {downloading ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
            {downloading ? "Menyiapkan PDF..." : "Download CV (PDF)"}
          </button>
        </section>

        {error && <div role="alert" className="mb-5 rounded-xl border border-[#F0CACA] bg-[#FFF4F4] px-4 py-3 text-xs font-semibold text-[#934444]">{error}</div>}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_270px]">
          <section className="overflow-hidden rounded-xl border border-[#DCE3E6] bg-white shadow-[0_12px_35px_rgba(44,62,80,0.08)]">
            <div className="border-b border-[#E9EDEF] bg-[#FAFBFB] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9AA5AB] sm:px-10">
              Tampilan dokumen · Format ATS satu kolom
            </div>
            <article className="mx-auto min-h-[1123px] max-w-[794px] px-7 py-9 text-[#202A30] sm:px-14 sm:py-14">
              <header className="border-b-2 border-[#2C3E50] pb-5">
                <h2 className="break-words text-3xl font-extrabold uppercase tracking-tight text-[#202A30]">{data.fullName}</h2>
                {data.desiredPosition && <p className="mt-2 text-sm font-bold text-[#53616D]">{data.desiredPosition}</p>}
                {hasContact && (
                  <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-5 text-[#53616D]">
                    {data.email && <span>{data.email}</span>}
                    {data.phone && <span>{data.phone}</span>}
                    {data.location && <span>{data.location}</span>}
                    {linkedinHref && <a href={linkedinHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">LinkedIn <ExternalLink size={10} /></a>}
                    {portfolioHref && <a href={portfolioHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">Portofolio <ExternalLink size={10} /></a>}
                  </div>
                )}
              </header>

              {data.summary && (
                <section className="mt-6">
                  <h3 className="border-b border-[#C9D1D5] pb-2 text-xs font-extrabold uppercase tracking-[0.13em]">Profil Profesional</h3>
                  <p className="mt-3 whitespace-pre-line text-[12px] leading-6 text-[#3F4A50]">{data.summary}</p>
                </section>
              )}

              {data.experiences.length > 0 && (
                <section className="mt-6">
                  <h3 className="border-b border-[#C9D1D5] pb-2 text-xs font-extrabold uppercase tracking-[0.13em]">Pengalaman Kerja</h3>
                  <div className="space-y-4 pt-3">
                    {data.experiences.map((item, index) => (
                      <div key={`${item.company}-${item.position}-${index}`}>
                        <h4 className="text-[13px] font-bold">{item.position}</h4>
                        <p className="mt-0.5 text-[11px] font-semibold text-[#53616D]">
                          {item.company}{item.location ? ` · ${item.location}` : ""}{item.employment_type ? ` · ${item.employment_type}` : ""}
                        </p>
                        {periodLabel(item.start_date, item.end_date, item.is_current) && (
                          <p className="mt-0.5 text-[10px] text-[#7F8C8D]">{periodLabel(item.start_date, item.end_date, item.is_current)}</p>
                        )}
                        {item.description && <p className="mt-2 whitespace-pre-line text-[11px] leading-5 text-[#3F4A50]">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {data.education.length > 0 && (
                <section className="mt-6">
                  <h3 className="border-b border-[#C9D1D5] pb-2 text-xs font-extrabold uppercase tracking-[0.13em]">Pendidikan</h3>
                  <div className="space-y-3 pt-3">
                    {data.education.map((item, index) => (
                      <div key={`${item.institution}-${item.start_year}-${index}`}>
                        <h4 className="text-[13px] font-bold">{item.institution}</h4>
                        <p className="mt-0.5 text-[11px] text-[#53616D]">
                          {item.education_level}{item.major ? ` · ${item.major}` : ""}
                        </p>
                        {yearPeriod(item.start_year, item.end_year, item.is_current) && <p className="mt-0.5 text-[10px] text-[#7F8C8D]">{yearPeriod(item.start_year, item.end_year, item.is_current)}</p>}
                        {item.description && <p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-[#3F4A50]">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {data.skills.length > 0 && (
                <section className="mt-6">
                  <h3 className="border-b border-[#C9D1D5] pb-2 text-xs font-extrabold uppercase tracking-[0.13em]">Keahlian</h3>
                  <p className="mt-3 text-[11px] leading-6 text-[#3F4A50]">{data.skills.join(" · ")}</p>
                </section>
              )}

              {data.certificates.length > 0 && (
                <section className="mt-6">
                  <h3 className="border-b border-[#C9D1D5] pb-2 text-xs font-extrabold uppercase tracking-[0.13em]">Sertifikasi dan Pelatihan</h3>
                  <div className="space-y-3 pt-3">
                    {data.certificates.map((item, index) => (
                      <div key={`${item.certificate_name}-${item.issuer}-${index}`}>
                        <h4 className="text-[12px] font-bold">{item.certificate_name}</h4>
                        <p className="mt-0.5 text-[11px] text-[#53616D]">
                          {item.issuer}{item.issue_date ? ` · ${monthLabel(item.issue_date)}` : ""}
                        </p>
                        {safeExternalUrl(item.credential_url) && <a href={safeExternalUrl(item.credential_url) || undefined} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-[10px] text-[#53616D] underline">{item.credential_url}</a>}
                        {item.description && <p className="mt-1 whitespace-pre-line text-[11px] leading-5 text-[#3F4A50]">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {data.languages.length > 0 && (
                <section className="mt-6">
                  <h3 className="border-b border-[#C9D1D5] pb-2 text-xs font-extrabold uppercase tracking-[0.13em]">Bahasa</h3>
                  <p className="mt-3 text-[11px] leading-6 text-[#3F4A50]">{data.languages.join(" · ")}</p>
                </section>
              )}

              {!data.summary && !data.experiences.length && !data.education.length && !data.skills.length && !data.certificates.length && !data.languages.length && (
                <div className="mt-8 rounded-lg border border-dashed border-[#CBD4D8] p-5 text-center text-xs leading-6 text-[#7F8C8D]">
                  Bagian pengalaman, pendidikan, keahlian, atau sertifikasi akan muncul otomatis setelah kamu menambahkannya pada profil.
                </div>
              )}
            </article>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[#DCE3E6] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#4E765B}" />
                <h2 className="text-sm font-extrabold">Format ramah ATS</h2>
              </div>
              <ul className="mt-4 space-y-3 text-xs leading-5 text-[#667681]">
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#4E765B]" /> Satu kolom dengan urutan informasi yang jelas.</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#4E765B]" /> Judul bagian standar agar mudah dipindai.</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#4E765B]" /> Tanpa tabel, grafik, atau foto yang mengganggu pembacaan teks.</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#4E765B]" /> File PDF dapat diunduh dan dilampirkan saat melamar.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-[#DCE3E6] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-extrabold">Ingin memperbarui isi CV?</h2>
              <p className="mt-2 text-xs leading-5 text-[#7F8C8D]">Ubah data identitas, keahlian, pendidikan, atau pengalaman. CV akan mengikuti data profil terbaru.</p>
              <Link href="/dashboard/pencari-kerja/profil" className="btn btn-outline mt-4 min-h-10 w-full rounded-xl border-[#BDC3C7] text-xs font-bold text-[#34495E] hover:bg-[#ECF0F1]">
                Buka Profil Saya
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
