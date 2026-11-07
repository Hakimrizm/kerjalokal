"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, FileText, LoaderCircle, Send, Save } from "lucide-react";

export type EmployerJobRecord = {
  id: string;
  title: string;
  category: string;
  employment_type: string;
  description: string;
  responsibilities: string | null;
  requirements: string;
  experience_level: string | null;
  education_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_negotiable: boolean;
  vacancies: number;
  application_deadline: string | null;
  province: string;
  city: string;
  district: string;
  village: string | null;
  address: string | null;
  status: string;
};

type FormState = {
  title: string;
  category: string;
  employment_type: string;
  description: string;
  responsibilities: string;
  requirements: string;
  experience_level: string;
  education_level: string;
  salary_min: string;
  salary_max: string;
  salary_negotiable: boolean;
  vacancies: string;
  application_deadline: string;
  province: string;
  city: string;
  district: string;
  village: string;
  address: string;
};

export function EmployerJobForm({
  employerId,
  initialJob,
  defaultLocation,
}: {
  employerId: string;
  initialJob?: EmployerJobRecord | null;
  defaultLocation?: { province?: string | null; city?: string | null; district?: string | null; village?: string | null; address?: string | null } | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    title: initialJob?.title ?? "",
    category: initialJob?.category ?? "",
    employment_type: initialJob?.employment_type ?? "Full-time",
    description: initialJob?.description ?? "",
    responsibilities: initialJob?.responsibilities ?? "",
    requirements: initialJob?.requirements ?? "",
    experience_level: initialJob?.experience_level ?? "Tidak harus berpengalaman",
    education_level: initialJob?.education_level ?? "Tidak ada batasan",
    salary_min: initialJob?.salary_min != null ? String(initialJob.salary_min) : "",
    salary_max: initialJob?.salary_max != null ? String(initialJob.salary_max) : "",
    salary_negotiable: initialJob?.salary_negotiable ?? false,
    vacancies: String(initialJob?.vacancies ?? 1),
    application_deadline: initialJob?.application_deadline ?? "",
    province: initialJob?.province ?? defaultLocation?.province ?? "",
    city: initialJob?.city ?? defaultLocation?.city ?? "",
    district: initialJob?.district ?? defaultLocation?.district ?? "",
    village: initialJob?.village ?? defaultLocation?.village ?? "",
    address: initialJob?.address ?? defaultLocation?.address ?? "",
  });
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveJob(mode: "draft" | "publish") {
    setError(null);
    if (form.title.trim().length < 3) return setError("Judul lowongan minimal 3 karakter.");
    if (!form.category) return setError("Pilih kategori pekerjaan.");
    if (!form.description.trim() || form.description.trim().length < 30) return setError("Deskripsi pekerjaan minimal 30 karakter.");
    if (!form.requirements.trim() || form.requirements.trim().length < 10) return setError("Tuliskan persyaratan kandidat minimal 10 karakter.");
    if (!form.province.trim() || !form.city.trim() || !form.district.trim()) return setError("Lengkapi provinsi, kota/kabupaten, dan kecamatan lokasi kerja.");
    if (!form.salary_negotiable && form.salary_min && form.salary_max && Number(form.salary_min) > Number(form.salary_max)) return setError("Gaji minimum tidak boleh lebih besar dari gaji maksimum.");
    if (Number(form.vacancies) < 1) return setError("Jumlah tenaga kerja minimal 1 orang.");

    setSaving(mode);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== employerId) throw new Error("Sesi akun tidak valid. Silakan masuk kembali.");
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
      if (role?.role !== "employer") throw new Error("Hanya akun pelaku usaha yang dapat mengelola lowongan.");

      // Payload bersama untuk INSERT dan UPDATE.
      // employer_id hanya dikirim saat INSERT karena tidak boleh diubah pemilik.
      const payload = {
        title: form.title.trim(),
        category: form.category,
        employment_type: form.employment_type,
        description: form.description.trim(),
        responsibilities: form.responsibilities.trim() || null,
        requirements: form.requirements.trim(),
        experience_level: form.experience_level,
        education_level: form.education_level,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        salary_negotiable: form.salary_negotiable,
        vacancies: Number(form.vacancies),
        application_deadline: form.application_deadline || null,
        province: form.province.trim(),
        city: form.city.trim(),
        district: form.district.trim(),
        village: form.village.trim() || null,
        address: form.address.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (initialJob?.id) {
        // UPDATE hanya mengubah kolom yang memang diberikan hak oleh RLS.
        const { error: updateError } = await supabase
          .from("jobs")
          .update(payload)
          .eq("id", initialJob.id)
          .eq("employer_id", employerId);

        if (updateError) throw updateError;

        // Perubahan status dilakukan melalui RPC karena kolom status dilindungi.
        if (mode === "publish" && initialJob.status !== "published") {
          const { error: publishError } = await supabase.rpc("employer_set_job_status", {
            target_job_id: initialJob.id,
            next_status: "published",
          });

          if (publishError) throw publishError;
        }
      } else {
        // Lowongan baru langsung tayang saat memilih Terbitkan.
        const { error: insertError } = await supabase.from("jobs").insert({
          ...payload,
          employer_id: employerId,
          status: mode === "publish" ? "published" : "draft",
        });

        if (insertError) throw insertError;
      }

      router.replace("/dashboard/pelaku-usaha/lowongan?saved=1");
      router.refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Lowongan belum berhasil disimpan.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
      <div className="border-b border-[#EEF1F2] px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]"><FileText size={20} /></span><div><h1 className="text-lg font-extrabold text-[#2C3E50]">{initialJob ? "Edit lowongan" : "Buat lowongan baru"}</h1><p className="mt-1 text-xs text-[#8A969D]">Lowongan langsung tayang setelah diterbitkan. Sistem tetap memeriksa indikator risiko secara otomatis.</p></div></div>
      </div>

      <div className="space-y-7 p-5 sm:p-7">
        <section>
          <h2 className="text-sm font-extrabold text-[#34495E]">Informasi posisi</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="form-control sm:col-span-2"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Nama posisi <span className="text-red-500">*</span></span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Contoh: Kasir Toko" maxLength={120} /></div>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Kategori pekerjaan <span className="text-red-500">*</span></span></label><select className="select select-bordered h-12 min-h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.category} onChange={(e) => update("category", e.target.value)}><option value="">Pilih kategori</option>{["Administrasi","Akuntansi & Keuangan","Customer Service","Desain & Kreatif","Gudang & Logistik","Kesehatan","Kuliner & F&B","Marketing & Penjualan","Operasional","Pendidikan","Retail","Teknik & Bengkel","Teknologi Informasi","Lainnya"].map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Tipe pekerjaan <span className="text-red-500">*</span></span></label><select className="select select-bordered h-12 min-h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.employment_type} onChange={(e) => update("employment_type", e.target.value)}>{["Full-time","Part-time","Kontrak","Freelance","Magang","Harian"].map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Pengalaman yang dibutuhkan</span></label><select className="select select-bordered h-12 min-h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.experience_level} onChange={(e) => update("experience_level", e.target.value)}>{["Tidak harus berpengalaman","Fresh graduate","Kurang dari 1 tahun","1–2 tahun","3–5 tahun","Lebih dari 5 tahun"].map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Pendidikan minimum</span></label><select className="select select-bordered h-12 min-h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.education_level} onChange={(e) => update("education_level", e.target.value)}>{["Tidak ada batasan","SD / Sederajat","SMP / Sederajat","SMA / SMK","D1 / D2 / D3","S1 / D4","S2","Lainnya"].map((item) => <option key={item}>{item}</option>)}</select></div>
          </div>
        </section>

        <section className="border-t border-[#EEF1F2] pt-6">
          <h2 className="text-sm font-extrabold text-[#34495E]">Deskripsi dan persyaratan</h2>
          <div className="mt-4 space-y-4">
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Deskripsi pekerjaan <span className="text-red-500">*</span></span></label><textarea className="textarea textarea-bordered min-h-32 rounded-xl border-[#D5DDE1] bg-white text-sm leading-6" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Jelaskan gambaran pekerjaan, lingkungan kerja, dan tujuan posisi ini..." /></div>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Tanggung jawab</span></label><textarea className="textarea textarea-bordered min-h-28 rounded-xl border-[#D5DDE1] bg-white text-sm leading-6" value={form.responsibilities} onChange={(e) => update("responsibilities", e.target.value)} placeholder="Tuliskan tugas utama. Pisahkan setiap poin dengan baris baru." /></div>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Persyaratan kandidat <span className="text-red-500">*</span></span></label><textarea className="textarea textarea-bordered min-h-28 rounded-xl border-[#D5DDE1] bg-white text-sm leading-6" value={form.requirements} onChange={(e) => update("requirements", e.target.value)} placeholder="Contoh: mampu berkomunikasi dengan baik, teliti, bersedia bekerja shift..." /></div>
          </div>
        </section>

        <section className="border-t border-[#EEF1F2] pt-6">
          <h2 className="text-sm font-extrabold text-[#34495E]">Kompensasi dan kebutuhan</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Gaji minimum (Rp)</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" type="number" min="0" value={form.salary_min} onChange={(e) => update("salary_min", e.target.value)} placeholder="Contoh: 2500000" disabled={form.salary_negotiable} /></div>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Gaji maksimum (Rp)</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" type="number" min="0" value={form.salary_max} onChange={(e) => update("salary_max", e.target.value)} placeholder="Contoh: 3500000" disabled={form.salary_negotiable} /></div>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#F4F6F7] p-3 sm:col-span-2"><input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={form.salary_negotiable} onChange={(e) => update("salary_negotiable", e.target.checked)} /><span className="text-xs font-semibold text-[#53616D]">Gaji dapat dinegosiasikan / dibicarakan saat wawancara.</span></label>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Jumlah tenaga kerja</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" type="number" min="1" max="999" value={form.vacancies} onChange={(e) => update("vacancies", e.target.value)} /></div>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Batas akhir lamaran</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" type="date" min={new Date().toISOString().slice(0, 10)} value={form.application_deadline} onChange={(e) => update("application_deadline", e.target.value)} /></div>
          </div>
        </section>

        <section className="border-t border-[#EEF1F2] pt-6">
          <h2 className="text-sm font-extrabold text-[#34495E]">Lokasi pekerjaan</h2>
          <p className="mt-1 text-xs text-[#8A969D]">Lokasi otomatis diisi dari profil usaha. Kamu tetap dapat mengubahnya jika tempat kerja berbeda.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Provinsi *</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.province} onChange={(e) => update("province", e.target.value)} /></div>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Kabupaten / Kota *</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.city} onChange={(e) => update("city", e.target.value)} /></div>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Kecamatan *</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.district} onChange={(e) => update("district", e.target.value)} /></div>
            <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Desa / Kelurahan</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.village} onChange={(e) => update("village", e.target.value)} /></div>
            <div className="form-control sm:col-span-2"><label className="label"><span className="label-text text-xs font-bold text-[#53616D]">Alamat / patokan tempat kerja</span></label><textarea className="textarea textarea-bordered min-h-20 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Alamat lengkap atau patokan lokasi kerja" /></div>
          </div>
        </section>

        {error && <div role="alert" className="alert alert-error rounded-xl text-sm">{error}</div>}

        <div className="flex flex-col-reverse justify-between gap-3 border-t border-[#EEF1F2] pt-5 sm:flex-row">
          <button type="button" onClick={() => router.back()} className="btn btn-ghost min-h-12 rounded-xl text-sm font-bold text-[#53616D]"><ArrowLeft size={16} /> Kembali</button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={saving !== null} onClick={() => void saveJob("draft")} className="btn btn-outline min-h-12 rounded-xl border-[#BDC3C7] text-sm font-bold text-[#34495E]">{saving === "draft" ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} {initialJob ? "Simpan Perubahan" : "Simpan Draft"}</button>
            <button type="button" disabled={saving !== null} onClick={() => void saveJob("publish")} className="btn btn-primary min-h-12 rounded-xl border-0 bg-[#2C3E50] px-5 text-sm font-bold text-white hover:bg-[#34495E]">{saving === "publish" ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />} {initialJob ? "Simpan & Tayangkan" : "Terbitkan Lowongan"} <ArrowRight size={15} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
