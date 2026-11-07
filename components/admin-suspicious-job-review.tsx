"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, LoaderCircle, ShieldBan } from "lucide-react";

export function AdminSuspiciousJobReview({
  jobId,
  title,
}: {
  jobId: string;
  title: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState<"clear" | "ban" | null>(null);
  const [message, setMessage] = useState("");

  async function clearFlag() {
    setSaving("clear");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_clear_job_fraud_review", {
      target_job_id: jobId,
      note: note.trim() || "Lowongan telah diperiksa dan tidak ditemukan bukti penipuan.",
    });
    setSaving(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Lowongan ditandai aman. Status tayang tidak berubah.");
    router.refresh();
  }

  async function banJob() {
    if (note.trim().length < 5) {
      setMessage("Tuliskan alasan pemblokiran minimal 5 karakter.");
      return;
    }
    const confirmed = window.confirm(
      `Blokir "${title}" sebagai lowongan fraud? Lowongan akan langsung disembunyikan dan pelaku usaha menerima pemberitahuan.`,
    );
    if (!confirmed) return;

    setSaving("ban");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_ban_job", {
      target_job_id: jobId,
      note: note.trim(),
      target_report_id: null,
    });
    setSaving(null);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Lowongan berhasil diblokir, disembunyikan dari publik, dan pemberitahuan dikirim ke pelaku usaha.");
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-3 border-t border-[#EEF1F2] pt-4">
      <label className="form-control">
        <span className="mb-1 text-[10px] font-bold text-[#667681]">CATATAN PEMERIKSAAN / ALASAN PEMBLOKIRAN</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1500}
          className="textarea textarea-bordered min-h-20 w-full rounded-lg border-[#D5DDE1] bg-white text-xs"
          placeholder="Tuliskan hasil pemeriksaan atau bukti yang mendasari keputusan..."
        />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => void clearFlag()}
          className="btn btn-outline btn-sm flex-1 rounded-lg border-[#AFC8B7] text-xs text-[#347052]"
        >
          {saving === "clear" ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Tandai Aman
        </button>
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => void banJob()}
          className="btn btn-error btn-sm flex-1 rounded-lg text-xs text-white"
        >
          {saving === "ban" ? <LoaderCircle size={14} className="animate-spin" /> : <ShieldBan size={14} />}
          Blokir sebagai Fraud
        </button>
      </div>
      {message && <p role="status" className="text-[10px] leading-5 text-[#667681]">{message}</p>}
    </div>
  );
}
