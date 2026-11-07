"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";

const reasons = [
  "Lowongan palsu atau usaha tidak jelas",
  "Meminta biaya pendaftaran / transfer uang",
  "Informasi pekerjaan menyesatkan",
  "Meminta data pribadi yang tidak relevan",
  "Dugaan penipuan lainnya",
];

export function FraudReportButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setLoading(true); setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(`/lowongan/${jobId}`)}`);
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("fraud_reports").insert({
      reporter_id: user.id,
      target_type: "job",
      target_id: jobId,
      reason,
      description: description.trim() || null,
    });
    setLoading(false);
    if (error) {
      setMessage(error.code === "23505" ? "Laporan tidak dapat dikirim. Silakan coba lagi nanti." : error.message);
      return;
    }
    setOpen(false);
    setDescription("");
    setMessage("Laporan berhasil dikirim. Tim Super Admin akan meninjaunya.");
  }

  return (
    <>
      <button type="button" onClick={()=>{setOpen(true);setMessage("");}} className="btn btn-ghost btn-sm mt-3 w-full rounded-lg text-xs font-bold text-[#9A5555] hover:bg-[#FFF1F1]"><AlertTriangle size={14}/> Laporkan lowongan ini</button>
      {message && !open && <p role="status" className="mt-2 text-center text-[10px] leading-5 text-[#7F8C8D]">{message}</p>}
      {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17212B]/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="fraud-report-title">
        <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><span className="badge badge-outline border-[#E6CACA] text-[10px] text-[#A34E4E]">LAPORAN KEAMANAN</span><h2 id="fraud-report-title" className="mt-2 text-lg font-extrabold text-[#2C3E50]">Laporkan dugaan penipuan</h2><p className="mt-1 text-xs leading-5 text-[#8A969D]">Berikan informasi yang benar agar tim dapat melakukan pemeriksaan.</p></div><button type="button" onClick={()=>setOpen(false)} className="btn btn-ghost btn-sm btn-square rounded-full"><X size={17}/></button></div>
          <label className="label mt-4"><span className="label-text text-xs font-bold text-[#34495E]">Alasan laporan</span></label>
          <select value={reason} onChange={(e)=>setReason(e.target.value)} className="select select-bordered h-11 min-h-11 w-full rounded-xl border-[#D5DDE1] bg-white text-xs">{reasons.map((item)=><option key={item}>{item}</option>)}</select>
          <label className="label mt-3"><span className="label-text text-xs font-bold text-[#34495E]">Keterangan tambahan (opsional)</span></label>
          <textarea value={description} onChange={(e)=>setDescription(e.target.value)} maxLength={1500} className="textarea textarea-bordered min-h-28 w-full rounded-xl border-[#D5DDE1] bg-white text-xs leading-5" placeholder="Ceritakan kronologi atau bukti yang kamu ketahui..."/>
          {message && <p role="alert" className="mt-3 text-xs text-red-600">{message}</p>}
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setOpen(false)} className="btn btn-ghost btn-sm rounded-lg text-xs">Batal</button><button type="button" disabled={loading} onClick={()=>void submit()} className="btn btn-sm rounded-lg border-0 bg-[#2C3E50] text-xs text-white">{loading?<LoaderCircle size={14} className="animate-spin"/>:<AlertTriangle size={14}/>} Kirim Laporan</button></div>
        </div>
      </div>}
    </>
  );
}
