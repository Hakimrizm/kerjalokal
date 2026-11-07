"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Check, X, LoaderCircle, Sparkles } from "lucide-react";

export function JobSeekerSummaryEditor({
  initialSummary = "",
}: {
  initialSummary?: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState(initialSummary);
  const [draft, setDraft] = useState(initialSummary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleStartEdit() {
    setDraft(summary);
    setError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft(summary);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Sesi login berakhir. Silakan login kembali.");
      }

      const trimmed = draft.trim();
      const { error: updateError } = await supabase
        .from("job_seeker_profiles")
        .upsert(
          {
            user_id: user.id,
            summary: trimmed || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (updateError) throw updateError;

      setSummary(trimmed);
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan ringkasan profil.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="mt-5 rounded-2xl border border-[#2C3E50]/20 bg-[#F8FAFB] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label
            htmlFor="summary-input"
            className="flex items-center gap-1.5 text-xs font-extrabold text-[#2C3E50]"
          >
            <Sparkles size={14} className="text-[#3E556B]" />
            <span>Tentang Saya / Ringkasan Profil (Summary)</span>
          </label>
          <span className="text-[10px] text-[#8A969D]">
            {draft.length}/600 karakter
          </span>
        </div>
        <p className="mb-3 text-[11px] text-[#7F8C8D] leading-4">
          Tuliskan 2–4 kalimat mengenai latar belakang keahlian, pengalaman, dan minat kerjamu untuk menarik perhatian pelaku usaha.
        </p>
        <textarea
          id="summary-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={600}
          rows={4}
          disabled={saving}
          placeholder="Contoh: Barista dan staf F&B berpengalaman 2 tahun yang terbiasa mengoperasikan mesin espresso, kasir POS, dan melayani pelanggan dengan ramah..."
          className="w-full rounded-xl border border-[#DCE3E6] bg-white p-3 text-xs leading-6 text-[#2C3E50] outline-none transition focus:border-[#2C3E50] focus:ring-2 focus:ring-[#2C3E50]/10 disabled:opacity-50"
        />

        {error && (
          <p className="mt-2 text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded-lg">
            {error}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="btn btn-ghost btn-sm rounded-xl text-xs font-semibold text-[#667681]"
          >
            <X size={14} /> Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary btn-sm rounded-xl border-0 bg-[#2C3E50] px-4 text-xs font-extrabold text-white hover:bg-[#34495E]"
          >
            {saving ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            <span>{saving ? "Menyimpan..." : "Simpan Ringkasan"}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {summary ? (
        <div className="group relative rounded-2xl bg-[#F7F9FA] p-4 border border-[#E9EFF2] transition hover:border-[#DCE5EA]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#9AA5AB]">
                Tentang Saya
              </span>
              <p className="mt-1.5 whitespace-pre-line text-xs leading-6 text-[#53616D]">
                {summary}
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartEdit}
              className="btn btn-ghost btn-xs gap-1 rounded-lg border border-[#DCE3E6] bg-white text-[11px] font-bold text-[#34495E] hover:bg-[#ECF0F1] shrink-0"
              title="Edit ringkasan profil"
            >
              <Pencil size={12} /> Edit
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#CBD4D9] bg-[#F8FAFA] p-4 text-center">
          <p className="text-xs text-[#7F8C8D]">
            Belum ada ringkasan profil. Tulis deskripsi singkat tentang dirimu agar pelaku usaha lebih mudah mengenal kualifikasimu.
          </p>
          <button
            type="button"
            onClick={handleStartEdit}
            className="btn btn-ghost btn-xs mt-2.5 gap-1.5 rounded-full border border-[#CBD4D9] bg-white text-[11px] font-extrabold text-[#34495E] hover:bg-[#ECF0F1]"
          >
            <Pencil size={12} /> Tambah Ringkasan Profil
          </button>
        </div>
      )}
    </div>
  );
}

