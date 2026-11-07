"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoaderCircle, Save } from "lucide-react";

export function AdminFraudReview({ reportId, status, notes }: { reportId: string; status: string; notes?: string | null }) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(status === "open" ? "investigating" : status);
  const [note, setNote] = useState(notes ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true); setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_update_fraud_report", {
      target_report_id: reportId,
      next_status: nextStatus,
      note,
    });
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage("Penanganan laporan berhasil diperbarui.");
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-2 border-t border-[#EEF1F2] pt-4">
      <label className="label pb-1"><span className="label-text text-[10px] font-bold text-[#667681]">STATUS PENANGANAN</span></label>
      <select value={nextStatus} onChange={(e)=>setNextStatus(e.target.value)} className="select select-bordered h-10 min-h-10 w-full rounded-lg border-[#D5DDE1] bg-white text-xs">
        <option value="investigating">Sedang diselidiki</option>
        <option value="resolved">Selesai ditangani</option>
        <option value="dismissed">Tidak terbukti / ditutup</option>
      </select>
      <textarea value={note} onChange={(e)=>setNote(e.target.value)} maxLength={1500} className="textarea textarea-bordered min-h-20 w-full rounded-lg border-[#D5DDE1] bg-white text-xs" placeholder="Catatan hasil pemeriksaan..."/>
      <button type="button" disabled={saving} onClick={()=>void save()} className="btn btn-sm w-full rounded-lg border-0 bg-[#2C3E50] text-xs text-white">{saving?<LoaderCircle size={14} className="animate-spin"/>:<Save size={14}/>} Simpan penanganan</button>
      {message && <p role="status" className="text-[10px] text-[#7F8C8D]">{message}</p>}
    </div>
  );
}
