"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoaderCircle, Save, ShieldBan } from "lucide-react";

export function AdminFraudReview({
  reportId,
  status,
  notes,
  jobId,
  jobTitle,
}: {
  reportId: string;
  status: string;
  notes?: string | null;
  jobId?: string | null;
  jobTitle?: string | null;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState(status === "open" || status === "resolved" ? "investigating" : status);
  const [note, setNote] = useState(notes ?? "");
  const [saving, setSaving] = useState<"save" | "ban" | null>(null);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving("save");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_update_fraud_report", {
      target_report_id: reportId,
      next_status: nextStatus,
      note,
    });
    setSaving(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Status laporan berhasil diperbarui.");
    router.refresh();
  }

  async function banReportedJob() {
    if (!jobId) {
      setMessage("Data lowongan tidak ditemukan sehingga tidak dapat diblokir dari laporan ini.");
      return;
    }
    if (note.trim().length < 5) {
      setMessage("Tuliskan alasan dan hasil pemeriksaan minimal 5 karakter.");
      return;
    }
    const confirmed = window.confirm(
      `Tetapkan "${jobTitle || "lowongan ini"}" sebagai fraud dan blokir dari halaman publik? Pelaku usaha akan menerima pemberitahuan.`,
    );
    if (!confirmed) return;

    setSaving("ban");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_ban_job", {
      target_job_id: jobId,
      note: note.trim(),
      target_report_id: reportId,
    });
    setSaving(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Laporan ditandai selesai dan lowongan berhasil diblokir. Pelaku usaha telah menerima pemberitahuan.");
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-2 border-t border-[#EEF1F2] pt-4">
      <label className="label pb-1">
        <span className="label-text text-[10px] font-bold text-[#667681]">STATUS PENANGANAN LAPORAN</span>
      </label>
      <select
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value)}
        className="select select-bordered h-10 min-h-10 w-full rounded-lg border-[#D5DDE1] bg-white text-xs"
      >
        <option value="investigating">Sedang diselidiki</option>
        <option value="dismissed">Tidak terbukti / laporan ditutup</option>
      </select>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={1500}
        className="textarea textarea-bordered min-h-20 w-full rounded-lg border-[#D5DDE1] bg-white text-xs"
        placeholder="Catatan hasil pemeriksaan atau alasan penutupan laporan..."
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => void save()}
          className="btn btn-outline btn-sm rounded-lg border-[#BDC3C7] text-xs text-[#53616D]"
        >
          {saving === "save" ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
          Simpan Status
        </button>
        {jobId && (
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => void banReportedJob()}
            className="btn btn-error btn-sm rounded-lg text-xs text-white"
          >
            {saving === "ban" ? <LoaderCircle size={14} className="animate-spin" /> : <ShieldBan size={14} />}
            Terbukti Fraud · Blokir
          </button>
        )}
      </div>
      {message && <p role="status" className="text-[10px] leading-5 text-[#7F8C8D]">{message}</p>}
    </div>
  );
}
