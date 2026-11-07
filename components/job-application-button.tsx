"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, Send, X } from "lucide-react";

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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("job_applications").select("id").eq("job_id", jobId).eq("applicant_id", user.id).maybeSingle();
        if (active && data) setApplied(true);
      }
      if (active) setChecking(false);
    }
    void checkApplication();
    return () => { active = false; };
  }, [jobId]);

  async function submitApplication() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/auth/login?next=${encodeURIComponent(`/lowongan/${jobId}`)}`);
        return;
      }

      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (role?.role !== "job_seeker") {
        throw new Error("Fitur melamar hanya tersedia untuk akun pencari kerja. Akun pelaku usaha tidak dapat melamar lowongan.");
      }

      const { data: profile } = await supabase.from("job_seeker_profiles").select("profile_completed").eq("user_id", user.id).maybeSingle();
      if (!profile?.profile_completed) {
        router.push("/onboarding/job-seeker");
        return;
      }

      const { error: insertError } = await supabase.from("job_applications").insert({
        job_id: jobId,
        applicant_id: user.id,
        cover_letter: coverLetter.trim() || null,
      });
      if (insertError) {
        if (insertError.code === "23505") throw new Error("Kamu sudah pernah melamar lowongan ini.");
        throw insertError;
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
    return <div className="flex items-center gap-2 rounded-xl border border-[#D9E6DF] bg-[#F2F8F4] px-4 py-3 text-sm font-bold text-[#476B56]"><CheckCircle2 size={18}/> Lamaran sudah dikirim</div>;
  }

  return (
    <>
      <button type="button" disabled={checking} onClick={() => setOpen(true)} className="btn btn-primary min-h-12 w-full rounded-xl border-0 bg-[#2C3E50] text-sm font-extrabold text-white hover:bg-[#34495E]">
        {checking ? <LoaderCircle size={17} className="animate-spin"/> : <><Send size={16}/> Lamar Sekarang <ArrowRight size={16}/></>}
      </button>

      {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17212B]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="apply-title">
        <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-3"><div><span className="badge badge-outline border-[#DCE3E6] text-[10px] text-[#53616D]">FORM LAMARAN</span><h2 id="apply-title" className="mt-2 text-xl font-extrabold text-[#2C3E50]">Kirim lamaran pekerjaan</h2><p className="mt-1 text-xs leading-5 text-[#8A969D]">Profil pencari kerja yang sudah kamu lengkapi akan menjadi dasar informasi kandidat.</p></div><button type="button" onClick={() => {setOpen(false);setError(null);}} className="btn btn-ghost btn-sm btn-square rounded-full"><X size={18}/></button></div>
          <div className="mt-5 form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Pesan singkat untuk pelaku usaha <span className="font-normal text-[#9AA5AB]">(opsional)</span></span></label><textarea value={coverLetter} onChange={(event)=>setCoverLetter(event.target.value)} maxLength={1500} className="textarea textarea-bordered min-h-32 rounded-xl border-[#D5DDE1] bg-white text-sm leading-6" placeholder="Ceritakan secara singkat alasan kamu tertarik dan hal yang bisa kamu kontribusikan..."/></div>
          {error && <div role="alert" className="alert alert-error mt-4 rounded-xl text-xs">{error}</div>}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={()=>setOpen(false)} className="btn btn-ghost rounded-xl text-xs">Batal</button><button type="button" disabled={loading} onClick={()=>void submitApplication()} className="btn btn-primary rounded-xl border-0 bg-[#2C3E50] text-xs text-white hover:bg-[#34495E]">{loading ? <LoaderCircle size={16} className="animate-spin"/> : <Send size={15}/>} Kirim Lamaran</button></div>
        </div>
      </div>}
    </>
  );
}
