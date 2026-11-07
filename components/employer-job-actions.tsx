"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, PauseCircle, RotateCcw } from "lucide-react";

export function EmployerJobActions({ jobId, status }: { jobId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!["published", "closed"].includes(status)) return null;

  async function updateStatus() {
    const nextStatus = status === "published" ? "closed" : "published";
    const confirmed = window.confirm(
      status === "published"
        ? "Tutup lowongan ini? Pencari kerja tidak dapat mengirim lamaran baru."
        : "Tayangkan kembali lowongan ini? Lowongan akan langsung terlihat oleh pencari kerja.",
    );
    if (!confirmed) return;
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { error } = await supabase.rpc("employer_set_job_status", {
      target_job_id: jobId,
      next_status: nextStatus,
    });
    setLoading(false);
    if (!error) router.refresh();
  }

  return (
    <button type="button" onClick={() => void updateStatus()} disabled={loading} className="btn btn-ghost btn-sm rounded-lg text-xs text-[#53616D]">
      {loading ? <LoaderCircle size={14} className="animate-spin"/> : status === "published" ? <PauseCircle size={14}/> : <RotateCcw size={14}/>}
      {status === "published" ? "Tutup" : "Tayangkan kembali"}
    </button>
  );
}
