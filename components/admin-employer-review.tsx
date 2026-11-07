"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";

type Role = "admin" | "super_admin";
export function AdminEmployerReview({
  employerId,
  role,
  status,
  recommendation,
  reviewerNotes,
  decisionNotes,
}: {
  employerId: string;
  role: Role;
  status: string;
  recommendation: string;
  reviewerNotes?: string | null;
  decisionNotes?: string | null;
}) {
  const router = useRouter();
  const [nextRecommendation, setNextRecommendation] = useState(recommendation === "not_reviewed" ? "recommend_approve" : recommendation);
  const [reviewNote, setReviewNote] = useState(reviewerNotes ?? "");
  const [decisionNote, setDecisionNote] = useState(decisionNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isSuper = role === "super_admin";

  async function submitReview() {
    setSaving(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_submit_employer_review", {
      target_user_id: employerId,
      next_recommendation: nextRecommendation,
      note: reviewNote,
    });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage("Hasil pemeriksaan awal berhasil disimpan.");
    router.refresh();
  }

  async function decide(nextStatus: "verified" | "rejected") {
    if (!decisionNote.trim()) {
      setMessage("Tuliskan catatan keputusan agar pelaku usaha memahami hasil verifikasi.");
      return;
    }
    setSaving(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_review_employer_profile", {
      target_user_id: employerId,
      next_status: nextStatus,
      decision_note: decisionNote,
    });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage(nextStatus === "verified" ? "Usaha berhasil disetujui dan notifikasi telah dibuat." : "Usaha ditolak dan notifikasi telah dibuat.");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]"><ShieldCheck size={19}/></span><div><h2 className="text-base font-extrabold">Hasil pemeriksaan</h2><p className="mt-1 text-xs leading-5 text-[#8A969D]">{isSuper ? "Tinjau rekomendasi Admin, kemudian tetapkan keputusan akhir." : "Catat hasil pengecekan. Rekomendasi ini akan menjadi bahan keputusan Super Admin."}</p></div></div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-[#F7F9FA] p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9AA5AB]">Status saat ini</p><p className="mt-2 text-sm font-extrabold text-[#34495E]">{status==="verified"?"Terverifikasi":status==="rejected"?"Ditolak":"Menunggu keputusan"}</p></div>
        <div className="rounded-xl bg-[#F7F9FA] p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9AA5AB]">Rekomendasi Admin</p><p className="mt-2 text-sm font-extrabold text-[#34495E]">{recommendation==="recommend_approve"?"Direkomendasikan disetujui":recommendation==="recommend_reject"?"Direkomendasikan ditolak":recommendation==="needs_more_info"?"Memerlukan informasi tambahan":"Belum diperiksa"}</p></div>
      </div>

      <div className="mt-5 space-y-3">
        <label className="label pb-1"><span className="label-text text-xs font-bold text-[#34495E]">{isSuper ? "Catatan pemeriksaan / rekomendasi" : "Catatan hasil pengecekan"}</span></label>
        <textarea value={reviewNote} onChange={(event)=>setReviewNote(event.target.value)} maxLength={2000} className="textarea textarea-bordered min-h-28 w-full rounded-xl border-[#D5DDE1] bg-white text-sm leading-6" placeholder="Contoh: alamat usaha telah dikunjungi, nomor kontak aktif, dan dokumen sesuai dengan informasi yang diberikan."/>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <select value={nextRecommendation} onChange={(event)=>setNextRecommendation(event.target.value)} className="select select-bordered h-11 min-h-11 rounded-xl border-[#D5DDE1] bg-white text-xs">
            <option value="recommend_approve">Direkomendasikan disetujui</option>
            <option value="recommend_reject">Direkomendasikan ditolak</option>
            <option value="needs_more_info">Memerlukan informasi tambahan</option>
          </select>
          <button type="button" disabled={saving} onClick={()=>void submitReview()} className="btn min-h-11 rounded-xl border-0 bg-[#34495E] px-5 text-xs font-bold text-white hover:bg-[#2C3E50]">{saving?<LoaderCircle size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>} Simpan hasil pemeriksaan</button>
        </div>
      </div>

      {isSuper && status !== "verified" && status !== "rejected" && (
        <div className="mt-6 border-t border-[#EEF1F2] pt-5">
          <p className="text-xs font-extrabold text-[#34495E]">Keputusan akhir Super Admin</p>
          <p className="mt-1 text-[11px] leading-5 text-[#8A969D]">Keputusan ini akan mengubah status verifikasi dan mengirim notifikasi pada dashboard pelaku usaha.</p>
          <textarea value={decisionNote} onChange={(event)=>setDecisionNote(event.target.value)} maxLength={1000} className="textarea textarea-bordered mt-3 min-h-24 w-full rounded-xl border-[#D5DDE1] bg-white text-sm" placeholder="Wajib diisi: alasan persetujuan atau hal yang harus diperbaiki..."/>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={saving} onClick={()=>void decide("verified")} className="btn min-h-11 flex-1 rounded-xl border-0 bg-[#2F7657] text-xs font-bold text-white hover:bg-[#276347]"><CheckCircle2 size={16}/> Setujui & Verifikasi Usaha</button>
            <button type="button" disabled={saving} onClick={()=>void decide("rejected")} className="btn min-h-11 flex-1 rounded-xl border border-[#E6CACA] bg-[#FFF7F7] text-xs font-bold text-[#A34E4E] hover:bg-[#FCEEEE]">Tolak / Minta Perbaikan</button>
          </div>
        </div>
      )}

      {status === "verified" && <p className="mt-5 rounded-xl bg-[#EFF8F2] p-3 text-xs font-semibold text-[#347052]">Usaha ini sudah terverifikasi.</p>}
      {status === "rejected" && <p className="mt-5 rounded-xl bg-[#FFF5F5] p-3 text-xs font-semibold text-[#A34E4E]">Verifikasi usaha ini ditolak. Pelaku usaha dapat memperbaiki data sesuai catatan.</p>}
      {message && <p role="status" className="mt-3 rounded-lg bg-[#F3F5F6] p-3 text-xs text-[#53616D]">{message}</p>}
    </section>
  );
}
