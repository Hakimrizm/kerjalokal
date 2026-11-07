"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";

const options = [
  { value: "submitted", label: "Lamaran masuk", rank: 0 },
  { value: "reviewing", label: "Sedang ditinjau", rank: 1 },
  { value: "interview", label: "Wawancara", rank: 2 },
  { value: "accepted", label: "Diterima", rank: 3 },
  { value: "rejected", label: "Ditolak", rank: 3 },
];

const terminalStatuses = new Set(["accepted", "rejected"]);

export function ApplicationStatusControl({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");


  const currentRank = options.find((option) => option.value === status)?.rank ?? 0;
  const isFinal = terminalStatuses.has(status);

  async function changeStatus(next: string) {
    if (next === status || saving || isFinal) return;

    const nextOption = options.find((option) => option.value === next);
    if (!nextOption || nextOption.rank < currentRank) {
      setMessage("Status seleksi tidak dapat dimundurkan.");
      return;
    }

    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setMessage("Sesi berakhir. Silakan masuk kembali.");
      return;
    }

    const { error } = await supabase
      .from("job_applications")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", applicationId);

    setSaving(false);
    if (error) {
      if (error.code === "23505" || error.message.includes("sudah memiliki kandidat")) {
        setMessage("Lowongan ini sudah memiliki kandidat yang diterima.");
      } else if (error.code === "P0001" || error.message.includes("Status seleksi")) {
        setMessage(error.message);
      } else {
        setMessage("Status belum berhasil diperbarui. Silakan coba kembali.");
      }
      return;
    }

    setStatus(next);
    setMessage(
      next === "accepted"
        ? "Kandidat diterima. Kandidat lain pada lowongan ini otomatis ditolak."
        : next === "rejected"
          ? "Lamaran ditolak dan status ini tidak dapat diubah kembali."
          : "Status berhasil diperbarui.",
    );
    router.refresh();
  }

  return (
    <div className="min-w-[170px]">
      <label className="label py-1">
        <span className="label-text text-[10px] font-bold text-[#8A969D]">STATUS SELEKSI</span>
      </label>
      <div className="relative">
        <select
          disabled={saving || isFinal}
          value={status}
          onChange={(event) => void changeStatus(event.target.value)}
          className="select select-bordered select-sm h-10 min-h-10 w-full rounded-lg border-[#D5DDE1] bg-white pr-8 text-xs font-semibold text-[#34495E] disabled:cursor-not-allowed disabled:bg-[#F1F3F4] disabled:text-[#7F8C8D]"
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={isFinal || option.rank < currentRank}
            >
              {option.label}
            </option>
          ))}
        </select>
        {saving && (
          <LoaderCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#53616D]" />
        )}
        {!saving && isFinal && (
          <LockKeyhole size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8A969D]" />
        )}
      </div>
      {message ? (
        <p className="mt-1.5 flex items-start gap-1 text-[10px] leading-4 text-[#667681]">
          {status === "accepted" && <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-[#4D8063]" />}
          {message}
        </p>
      ) : isFinal ? (
        <p className="mt-1.5 text-[10px] text-[#8A969D]">Status final, tidak dapat diubah.</p>
      ) : (
        <p className="mt-1.5 text-[10px] text-[#8A969D]">Status hanya dapat dilanjutkan ke tahap berikutnya.</p>
      )}
    </div>
  );
}
