"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

export function AdminJobReview({ jobId, role, status }: { jobId: string; role: "admin" | "super_admin"; status: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isSuper = role === "super_admin";

  async function decide(nextStatus: "published" | "rejected") {
    if (nextStatus === "rejected" && !note.trim()) {
      setMessage("Tuliskan alasan penolakan agar pelaku usaha dapat memperbaiki lowongannya.");
      return;
    }
    setSaving(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_review_job", {
      target_job_id: jobId,
      next_status: nextStatus,
      rejection_note: note,
    });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage(nextStatus === "published" ? "Lowongan berhasil diterbitkan." : "Lowongan ditolak dengan catatan.");
    router.refresh();
  }

  if (status !== "pending_review") return <span className={`badge badge-sm ${status==="published"?"badge-success":status==="rejected"?"badge-error":"badge-ghost"}`}>{status==="published"?"Tayang":status==="rejected"?"Ditolak":status}</span>;
  if (!isSuper) return <span className="badge badge-warning badge-sm">Menunggu keputusan Super Admin</span>;

  return (
    <div className="w-full max-w-sm space-y-2">
      <textarea value={note} onChange={(e)=>setNote(e.target.value)} maxLength={1000} className="textarea textarea-bordered min-h-20 w-full rounded-lg border-[#D5DDE1] bg-white text-xs" placeholder="Catatan jika lowongan ditolak (wajib untuk penolakan)"/>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving} onClick={()=>void decide("published")} className="btn btn-success btn-sm flex-1 rounded-lg text-xs text-white">{saving?<LoaderCircle size={14} className="animate-spin"/>:<CheckCircle2 size={14}/>} Terbitkan</button>
        <button type="button" disabled={saving} onClick={()=>void decide("rejected")} className="btn btn-outline btn-error btn-sm flex-1 rounded-lg text-xs"> <XCircle size={14}/> Tolak</button>
      </div>
      {message && <p role="status" className="text-[10px] text-[#7F8C8D]">{message}</p>}
    </div>
  );
}
