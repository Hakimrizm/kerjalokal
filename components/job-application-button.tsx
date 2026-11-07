"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Send,
  X,
} from "lucide-react";

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "Pencari-Kerja";
}

export function JobApplicationButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkApplication() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("job_applications")
          .select("id")
          .eq("job_id", jobId)
          .eq("applicant_id", user.id)
          .maybeSingle();

        if (active && data) setApplied(true);
      }

      if (active) setChecking(false);
    }

    void checkApplication();
    return () => {
      active = false;
    };
  }, [jobId]);

  async function submitApplication() {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    let uploadedCvPath: string | null = null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/auth/login?next=${encodeURIComponent(`/lowongan/${jobId}`)}`);
        return;
      }

      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (role?.role !== "job_seeker") {
        throw new Error("Fitur melamar hanya tersedia untuk akun pencari kerja.");
      }

      const { data: profile } = await supabase
        .from("job_seeker_profiles")
        .select("profile_completed")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile?.profile_completed) {
        router.push("/onboarding/job-seeker");
        return;
      }

      // Generate PDF dari data profil terbaru melalui server yang terautentikasi.
      const cvResponse = await fetch("/api/cv/generate", {
        method: "GET",
        cache: "no-store",
      });

      if (!cvResponse.ok) {
        const result = await cvResponse.json().catch(() => null);
        throw new Error(result?.error || "CV belum berhasil dibuat. Periksa kembali profilmu.");
      }

      const cvBlob = await cvResponse.blob();
      const serverFileName = cvResponse.headers
        .get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1];
      const fileName = serverFileName || `CV-${safeFileName(
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : user.email?.split("@")[0] || "Pencari-Kerja",
      )}.pdf`;
      const uniquePart = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const cvPath = `${user.id}/${jobId}/${uniquePart}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("job-seeker-cvs")
        .upload(cvPath, cvBlob, {
          contentType: "application/pdf",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`CV berhasil dibuat, tetapi belum dapat dilampirkan: ${uploadError.message}`);
      }
      uploadedCvPath = cvPath;

      const { error: insertError } = await supabase.from("job_applications").insert({
        job_id: jobId,
        applicant_id: user.id,
        cover_letter: coverLetter.trim() || null,
        cv_path: cvPath,
        cv_file_name: fileName,
        cv_generated_at: new Date().toISOString(),
      });

      if (insertError) {
        if (uploadedCvPath) {
          await supabase.storage.from("job-seeker-cvs").remove([uploadedCvPath]);
          uploadedCvPath = null;
        }
        if (insertError.code === "23505") {
          throw new Error("Kamu sudah pernah melamar lowongan ini.");
        }
        throw new Error(insertError.message || "Lamaran belum berhasil dikirim.");
      }

      setApplied(true);
      setOpen(false);
      setCoverLetter("");
      router.refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Lamaran belum berhasil dikirim.");
    } finally {
      setLoading(false);
    }
  }

  if (applied) {
    return (
      <div className="rounded-xl border border-[#D9E6DF] bg-[#F2F8F4] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[#476B56]">
          <CheckCircle2 size={18} /> Lamaran dan CV ATS berhasil dikirim
        </div>
        <Link
          href="/dashboard/pencari-kerja/cv"
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#476B56] underline underline-offset-2"
        >
          <FileText size={13} /> Lihat CV saya
        </Link>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={checking}
        onClick={() => setOpen(true)}
        className="btn btn-primary min-h-12 w-full rounded-xl border-0 bg-[#2C3E50] text-sm font-extrabold text-white hover:bg-[#34495E]"
      >
        {checking ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : (
          <>
            <Send size={16} /> Lamar Sekarang <ArrowRight size={16} />
          </>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17212B]/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="apply-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="badge badge-outline border-[#DCE3E6] text-[10px] text-[#53616D]">
                  LAMARAN + CV OTOMATIS
                </span>
                <h2 id="apply-title" className="mt-2 text-xl font-extrabold text-[#2C3E50]">
                  Kirim lamaran pekerjaan
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#8A969D]">
                  CV ATS akan dibuat dari profil terbarumu dan otomatis dilampirkan ke lamaran ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="btn btn-ghost btn-sm btn-square rounded-full"
                aria-label="Tutup form lamaran"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#DCE5E8] bg-[#F7F9FA] p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-[#34495E]">
                <FileText size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-[#34495E]">CV ATS · PDF</p>
                <p className="mt-0.5 text-[10px] leading-4 text-[#8A969D]">
                  Dibuat otomatis saat kamu mengirim lamaran.
                </p>
              </div>
              <Link
                href="/dashboard/pencari-kerja/cv"
                target="_blank"
                className="shrink-0 text-[10px] font-bold text-[#34495E] underline underline-offset-2"
              >
                Preview
              </Link>
            </div>

            <div className="mt-5 form-control">
              <label className="label">
                <span className="label-text text-xs font-bold text-[#34495E]">
                  Pesan singkat untuk pelaku usaha{" "}
                  <span className="font-normal text-[#9AA5AB]">(opsional)</span>
                </span>
              </label>
              <textarea
                value={coverLetter}
                onChange={(event) => setCoverLetter(event.target.value)}
                maxLength={1500}
                className="textarea textarea-bordered min-h-28 rounded-xl border-[#D5DDE1] bg-white text-sm leading-6"
                placeholder="Ceritakan secara singkat alasan kamu tertarik dan hal yang bisa kamu kontribusikan..."
              />
              <span className="mt-1 text-right text-[10px] text-[#A0AAAF]">{coverLetter.length}/1500</span>
            </div>

            <div className="mt-4 rounded-lg bg-[#F2F6F8] px-3 py-2.5 text-[10px] leading-5 text-[#667681]">
              Setelah dikirim, CV PDF akan tersimpan sebagai dokumen lamaran dan dapat dilihat serta diunduh oleh pelaku usaha pemilik lowongan ini.
            </div>

            {error && (
              <div role="alert" className="alert alert-error mt-4 rounded-xl text-xs">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="btn btn-ghost rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void submitApplication()}
                className="btn btn-primary rounded-xl border-0 bg-[#2C3E50] text-xs text-white hover:bg-[#34495E]"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" /> Membuat CV & mengirim...
                  </>
                ) : (
                  <>
                    <Download size={15} /> Kirim Lamaran + CV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
