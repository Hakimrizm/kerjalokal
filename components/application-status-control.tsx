"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

const options = [
  { value: "submitted", label: "Lamaran masuk" },
  { value: "reviewing", label: "Sedang ditinjau" },
  { value: "interview", label: "Wawancara" },
  { value: "accepted", label: "Diterima" },
  { value: "rejected", label: "Ditolak" },
];

export function ApplicationStatusControl({ applicationId, currentStatus }: { applicationId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function changeStatus(next: string) {
    if (next === status) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setMessage("Sesi berakhir. Silakan masuk kembali.");
      return;
    }
    const { error } = await supabase.from("job_applications").update({
      status: next,
      updated_at: new Date().toISOString(),
    }).eq("id", applicationId);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setStatus(next);
    setMessage("Status tersimpan.");
    router.refresh();
  }

  return (
    <div className="min-w-[170px]">
      <label className="label py-1"><span className="label-text text-[10px] font-bold text-[#8A969D]">STATUS SELEKSI</span></label>
      <div className="relative">
        <select disabled={saving} value={status} onChange={(event) => void changeStatus(event.target.value)} className="select select-bordered select-sm h-10 min-h-10 w-full rounded-lg border-[#D5DDE1] bg-white pr-8 text-xs font-semibold text-[#34495E]">
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {saving && <LoaderCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#53616D]"/>}
      </div>
      {message && <p className="mt-1 text-[10px] text-[#7F8C8D]">{message}</p>}
    </div>
  );
}
