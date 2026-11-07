"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileUp,
  Globe2,
  LoaderCircle,
  MapPin,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";

type EmployerFormState = {
  business_name: string;
  business_type: string;
  description: string;
  established_year: string;
  logo_path: string;
  pic_name: string;
  pic_position: string;
  phone: string;
  contact_email: string;
  province: string;
  city: string;
  district: string;
  village: string;
  address: string;
  postal_code: string;
  document_type: string;
  document_number: string;
  website: string;
  instagram_url: string;
  facebook_url: string;
  operating_hours: string;
};

const emptyForm: EmployerFormState = {
  business_name: "",
  business_type: "",
  description: "",
  established_year: "",
  logo_path: "",
  pic_name: "",
  pic_position: "",
  phone: "",
  contact_email: "",
  province: "",
  city: "",
  district: "",
  village: "",
  address: "",
  postal_code: "",
  document_type: "",
  document_number: "",
  website: "",
  instagram_url: "",
  facebook_url: "",
  operating_hours: "",
};

const steps = [
  { title: "Profil usaha", subtitle: "Kenali usaha kamu", icon: Building2 },
  { title: "Penanggung jawab", subtitle: "Kontak yang bisa dihubungi", icon: UserRound },
  { title: "Lokasi usaha", subtitle: "Alamat tempat bekerja", icon: MapPin },
  { title: "Legalitas", subtitle: "Dokumen pendukung", icon: FileCheck2 },
  { title: "Informasi online", subtitle: "Kanal dan jam operasional", icon: Globe2 },
];

export function EmployerOnboarding({ userId, initialName }: { userId: string; initialName: string }) {
  const router = useRouter();
  const [form, setForm] = useState<EmployerFormState>({ ...emptyForm, pic_name: initialName });
  const [step, setStep] = useState(0);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [legalFile, setLegalFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingDocument, setExistingDocument] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const [{ data: profile }, { data: contact }, { data: document }] = await Promise.all([
        supabase.from("employer_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("employer_contacts").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("employer_verification_documents").select("id,document_type,document_number,file_path").eq("user_id", userId).limit(1).maybeSingle(),
      ]);
      if (!active) return;
      if (profile || contact || document) {
        setForm({
          business_name: profile?.business_name ?? "",
          business_type: profile?.business_type ?? "",
          description: profile?.description ?? "",
          established_year: profile?.established_year ? String(profile.established_year) : "",
          logo_path: profile?.logo_path ?? "",
          pic_name: contact?.pic_name ?? initialName,
          pic_position: contact?.pic_position ?? "",
          phone: contact?.phone ?? "",
          contact_email: contact?.contact_email ?? "",
          province: profile?.province ?? "",
          city: profile?.city ?? "",
          district: profile?.district ?? "",
          village: profile?.village ?? "",
          address: profile?.address ?? "",
          postal_code: profile?.postal_code ?? "",
          document_type: document?.document_type ?? "",
          document_number: document?.document_number ?? "",
          website: profile?.website ?? "",
          instagram_url: profile?.instagram_url ?? "",
          facebook_url: profile?.facebook_url ?? "",
          operating_hours: contact?.operating_hours ?? "",
        });
        setExistingDocument(Boolean(document));
        if (profile?.onboarding_step) {
          setStep(Math.max(0, Math.min(4, profile.onboarding_step - 1)));
        }
      }
      setLoadingData(false);
    }
    void load();
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  function update<K extends keyof EmployerFormState>(key: K, value: EmployerFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadFile(bucket: string, file: File) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const path = `${userId}/${Date.now()}-${safeName}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (uploadError) throw uploadError;
    return path;
  }

  function validateStep() {
    if (step === 0) {
      if (form.business_name.trim().length < 2) return "Nama usaha minimal 2 karakter.";
      if (!form.business_type) return "Pilih jenis usaha terlebih dahulu.";
      if (form.description.trim().length < 20) return "Deskripsi usaha minimal 20 karakter agar calon pekerja memahami usahamu.";
    }
    if (step === 1) {
      if (form.pic_name.trim().length < 3) return "Nama penanggung jawab minimal 3 karakter.";
      if (form.phone.trim().length < 8) return "Masukkan nomor WhatsApp/telepon yang aktif.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) return "Masukkan email kontak yang valid.";
    }
    if (step === 2) {
      if (!form.province.trim() || !form.city.trim() || !form.district.trim() || !form.village.trim() || !form.address.trim()) return "Lengkapi provinsi, kabupaten/kota, kecamatan, desa/kelurahan, dan alamat usaha.";
    }
    if (step === 3 && legalFile && legalFile.size > 5 * 1024 * 1024) return "Ukuran dokumen maksimal 5 MB.";
    if (step === 3 && legalFile && !form.document_type) return "Pilih jenis dokumen sebelum mengunggah.";
    if (step === 3 && form.document_type && !legalFile && !existingDocument) return "Unggah file untuk dokumen yang dipilih, atau kosongkan jenis dokumen jika belum tersedia.";
    return null;
  }

  async function saveAndContinue() {
    setError(null);
    const validation = validateStep();
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    try {
      if (step === 0) {
        let logoPath = form.logo_path;
        if (logoFile) logoPath = await uploadFile("business-logos", logoFile);
        const { error: saveError } = await supabase.from("employer_profiles").upsert({
          user_id: userId,
          business_name: form.business_name.trim(),
          business_type: form.business_type,
          description: form.description.trim(),
          established_year: form.established_year ? Number(form.established_year) : null,
          logo_path: logoPath || null,
          onboarding_step: 2,
          profile_completed: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (saveError) throw saveError;
        update("logo_path", logoPath);
      }

      if (step === 1) {
        const { error: saveError } = await supabase.from("employer_contacts").upsert({
          user_id: userId,
          pic_name: form.pic_name.trim(),
          pic_position: form.pic_position.trim() || null,
          phone: form.phone.trim(),
          contact_email: form.contact_email.trim().toLowerCase(),
          operating_hours: form.operating_hours.trim() || null,
        }, { onConflict: "user_id" });
        if (saveError) throw saveError;
        const { error: progressError } = await supabase.from("employer_profiles").update({
          onboarding_step: 3,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
        if (progressError) throw progressError;
      }

      if (step === 2) {
        const { error: saveError } = await supabase.from("employer_profiles").update({
          province: form.province.trim(),
          city: form.city.trim(),
          district: form.district.trim(),
          village: form.village.trim(),
          address: form.address.trim(),
          postal_code: form.postal_code.trim() || null,
          onboarding_step: 4,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
        if (saveError) throw saveError;
      }

      if (step === 3) {
        if (legalFile) {
          const filePath = await uploadFile("employer-verification", legalFile);
          const { error: deleteOldError } = await supabase
            .from("employer_verification_documents")
            .delete()
            .eq("user_id", userId)
            .eq("document_type", form.document_type);
          if (deleteOldError) throw deleteOldError;

          const { error: documentError } = await supabase.from("employer_verification_documents").insert({
            user_id: userId,
            document_type: form.document_type,
            document_number: form.document_number.trim() || null,
            file_path: filePath,
          });
          if (documentError) throw documentError;
          setExistingDocument(true);
        }
        const { error: progressError } = await supabase.from("employer_profiles").update({
          onboarding_step: 5,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
        if (progressError) throw progressError;
      }

      if (step === 4) {
        const { error: contactError } = await supabase.from("employer_contacts").update({
          operating_hours: form.operating_hours.trim() || null,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
        if (contactError) throw contactError;
        const { error: profileError } = await supabase.from("employer_profiles").update({
          website: form.website.trim() || null,
          instagram_url: form.instagram_url.trim() || null,
          facebook_url: form.facebook_url.trim() || null,
          onboarding_step: 5,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId);
        if (profileError) throw profileError;
        router.replace("/dashboard/pelaku-usaha");
        router.refresh();
        return;
      }

      setStep((current) => Math.min(4, current + 1));
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Data belum berhasil disimpan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingData) {
    return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm font-semibold text-[#53616D]"><LoaderCircle className="animate-spin" size={20} /> Memuat data usaha...</div>;
  }

  const StepIcon = steps[step].icon;

  return (
    <main className="min-h-screen bg-[#F3F5F6] px-4 py-8 text-[#2C3E50] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2C3E50] text-white"><Store size={19} /></span>
            <span className="text-lg font-extrabold tracking-tight">kerja<span className="text-[#7F8C8D]">lokal</span></span>
          </a>
          <span className="badge badge-outline border-[#BDC3C7] bg-white px-3 py-3 text-[10px] font-bold text-[#53616D]">PENDAFTARAN PELAKU USAHA</span>
        </header>

        <section className="overflow-hidden rounded-[28px] border border-[#E2E7E9] bg-white shadow-sm">
          <div className="bg-[#2C3E50] px-5 py-7 text-white sm:px-8 sm:py-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.17em] text-white/55">Lengkapi profil usaha</p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Kenalkan usahamu kepada calon pekerja.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Informasi ini membantu pencari kerja memahami tempat kerja dan membantu tim KerjaLokal melakukan verifikasi usaha.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-[10px] font-semibold text-white/60">TAHAP PENGISIAN</p>
                <p className="mt-1 text-xl font-extrabold">{step + 1}<span className="text-sm font-semibold text-white/50"> / 5</span></p>
              </div>
            </div>
            <div className="mt-7 flex gap-1.5">
              {steps.map((item, index) => <div key={item.title} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-[#ECF0F1]" : "bg-white/20"}`} />)}
            </div>
            <div className="mt-3 hidden grid-cols-5 gap-2 md:grid">
              {steps.map((item, index) => <div key={item.title} className={`text-[10px] font-semibold ${index === step ? "text-white" : index < step ? "text-white/70" : "text-white/35"}`}>{index + 1}. {item.title}</div>)}
            </div>
          </div>

          <div className="grid md:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="hidden border-r border-[#EEF1F2] bg-[#FAFBFB] p-5 md:block">
              <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#9AA5AB]">Tahapan profil</p>
              <div className="space-y-2">
                {steps.map((item, index) => {
                  const Icon = item.icon;
                  const active = index === step;
                  const done = index < step;
                  return <div key={item.title} className={`flex items-center gap-3 rounded-xl p-3 ${active ? "bg-[#2C3E50] text-white shadow-md" : done ? "bg-[#ECF0F1] text-[#34495E]" : "text-[#9AA5AB]"}`}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-white/10" : "bg-white"}`}>{done ? <Check size={16} /> : <Icon size={17} />}</span>
                    <span className="min-w-0"><span className="block text-xs font-bold">{item.title}</span><span className={`mt-0.5 block text-[10px] ${active ? "text-white/55" : "text-current opacity-70"}`}>{item.subtitle}</span></span>
                  </div>;
                })}
              </div>
              <div className="mt-7 rounded-xl border border-[#E2E7E9] bg-white p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#34495E]"><ShieldCheck size={15} /> Data aman</div>
                <p className="mt-2 text-[10px] leading-5 text-[#8A969D]">Dokumen legalitas disimpan di penyimpanan privat dan hanya dapat diakses pihak berwenang.</p>
              </div>
            </aside>

            <div className="min-w-0 p-5 sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ECF0F1] text-[#34495E]"><StepIcon size={22} /></span>
                <div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9AA5AB]">Tahap {step + 1}</p><h2 className="text-xl font-extrabold text-[#2C3E50]">{steps[step].title}</h2><p className="mt-1 text-xs text-[#7F8C8D]">{steps[step].subtitle}</p></div>
              </div>

              {step === 0 && (
                <div className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
                    <div className="form-control">
                      <label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Nama usaha <span className="text-red-500">*</span></span></label>
                      <input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="Contoh: Toko Berkah Jaya" maxLength={120} />
                    </div>
                    <div className="form-control">
                      <label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Tahun berdiri</span></label>
                      <input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" type="number" min="1900" max={new Date().getFullYear()} value={form.established_year} onChange={(e) => update("established_year", e.target.value)} placeholder="2020" />
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Jenis usaha <span className="text-red-500">*</span></span></label>
                    <select className="select select-bordered h-12 min-h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.business_type} onChange={(e) => update("business_type", e.target.value)}>
                      <option value="">Pilih jenis usaha</option>
                      {["UMKM / Usaha Rumahan","Toko / Retail","Restoran / Kuliner","Bengkel / Otomotif","Laundry / Jasa","Koperasi","Perusahaan","Lainnya"].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Deskripsi usaha <span className="text-red-500">*</span></span><span className="label-text-alt text-[10px] text-[#9AA5AB]">{form.description.length}/500</span></label>
                    <textarea className="textarea textarea-bordered min-h-32 rounded-xl border-[#D5DDE1] bg-white text-sm leading-6" value={form.description} onChange={(e) => update("description", e.target.value)} maxLength={500} placeholder="Ceritakan produk/jasa, aktivitas utama, dan lingkungan kerja di usahamu..." />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Logo usaha <span className="font-normal text-[#9AA5AB]">(opsional)</span></span></label>
                    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-[#C9D3D8] bg-[#FAFBFB] p-4">
                      <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl bg-[#ECF0F1] text-[#7F8C8D]">{logoPreview ? <img src={logoPreview} alt="Pratinjau logo" className="h-full w-full object-cover" /> : <Building2 size={25} />}</div>
                      <div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#34495E]">Unggah logo usaha</p><p className="mt-1 text-[10px] text-[#8A969D]">PNG, JPG, atau WEBP. Maksimal 3 MB.</p><input className="file-input file-input-bordered file-input-sm mt-2 w-full max-w-xs rounded-lg border-[#D5DDE1] bg-white text-xs" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e: ChangeEvent<HTMLInputElement>) => setLogoFile(e.target.files?.[0] ?? null)} /></div>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Nama penanggung jawab <span className="text-red-500">*</span></span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.pic_name} onChange={(e) => update("pic_name", e.target.value)} placeholder="Nama pemilik / PIC" /></div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Jabatan</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.pic_position} onChange={(e) => update("pic_position", e.target.value)} placeholder="Pemilik / HR / Pengelola" /></div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Nomor WhatsApp / telepon <span className="text-red-500">*</span></span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="08xxxxxxxxxx" /></div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Email kontak <span className="text-red-500">*</span></span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} placeholder="kontak@usaha.com" /></div>
                  <div className="sm:col-span-2 rounded-xl bg-[#ECF0F1] p-4 text-xs leading-5 text-[#53616D]">Informasi kontak digunakan untuk komunikasi terkait akun dan proses rekrutmen. Pastikan nomor yang dicantumkan aktif.</div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Provinsi <span className="text-red-500">*</span></span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.province} onChange={(e) => update("province", e.target.value)} placeholder="Contoh: Jawa Barat" /></div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Kabupaten / Kota <span className="text-red-500">*</span></span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Contoh: Kota Bandung" /></div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Kecamatan <span className="text-red-500">*</span></span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.district} onChange={(e) => update("district", e.target.value)} placeholder="Nama kecamatan" /></div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Desa / Kelurahan <span className="text-red-500">*</span></span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.village} onChange={(e) => update("village", e.target.value)} placeholder="Nama desa / kelurahan" /></div>
                  <div className="form-control sm:col-span-2"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Alamat lengkap usaha <span className="text-red-500">*</span></span></label><textarea className="textarea textarea-bordered min-h-24 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Nama jalan, nomor bangunan, RT/RW, patokan..." /></div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Kode pos</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} placeholder="40123" /></div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-[#DCE3E6] bg-[#F8FAFA] p-4">
                    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]"><ShieldCheck size={19} /></span><div><p className="text-sm font-extrabold text-[#34495E]">Verifikasi membantu menjaga kepercayaan</p><p className="mt-1 text-xs leading-5 text-[#7F8C8D]">Dokumen ini bersifat opsional saat pendaftaran. Usaha yang belum memiliki dokumen dapat melanjutkan, tetapi status verifikasi akan tetap menunggu pemeriksaan admin.</p></div></div>
                  </div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Jenis dokumen</span></label><select className="select select-bordered h-12 min-h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.document_type} onChange={(e) => update("document_type", e.target.value)}><option value="">Pilih jika tersedia</option><option value="NIB">Nomor Induk Berusaha (NIB)</option><option value="SKU">Surat Keterangan Usaha (SKU)</option><option value="SIUP">SIUP</option><option value="OTHER">Dokumen pendukung lainnya</option></select></div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Nomor dokumen</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.document_number} onChange={(e) => update("document_number", e.target.value)} placeholder="Masukkan nomor jika ada" /></div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">File dokumen <span className="font-normal text-[#9AA5AB]">(opsional)</span></span></label><div className="rounded-xl border border-dashed border-[#C9D3D8] bg-[#FAFBFB] p-4"><div className="flex items-center gap-3"><FileUp size={22} className="text-[#7F8C8D]" /><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#34495E]">{legalFile?.name ?? (existingDocument ? "Dokumen sudah pernah diunggah" : "Pilih dokumen legalitas")}</p><p className="mt-1 text-[10px] text-[#8A969D]">PDF, JPG, atau PNG. Maksimal 5 MB.</p></div></div><input className="file-input file-input-bordered file-input-sm mt-3 w-full rounded-lg border-[#D5DDE1] bg-white text-xs" type="file" accept=".pdf,image/jpeg,image/png" onChange={(e: ChangeEvent<HTMLInputElement>) => setLegalFile(e.target.files?.[0] ?? null)} /></div></div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <div className="rounded-xl bg-[#ECF0F1] p-4 text-xs leading-5 text-[#53616D]">Informasi berikut membantu calon pekerja mengenali usaha kamu. Semua kolom pada tahap ini bersifat opsional.</div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Website usaha</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" type="url" value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://website-usaha.com" /></div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Instagram</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.instagram_url} onChange={(e) => update("instagram_url", e.target.value)} placeholder="https://instagram.com/..." /></div>
                    <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Facebook</span></label><input className="input input-bordered h-12 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.facebook_url} onChange={(e) => update("facebook_url", e.target.value)} placeholder="https://facebook.com/..." /></div>
                  </div>
                  <div className="form-control"><label className="label"><span className="label-text text-xs font-bold text-[#34495E]">Jam operasional</span></label><textarea className="textarea textarea-bordered min-h-24 rounded-xl border-[#D5DDE1] bg-white text-sm" value={form.operating_hours} onChange={(e) => update("operating_hours", e.target.value)} placeholder="Contoh: Senin–Sabtu, 08.00–17.00 WIB" /></div>
                  <div className="rounded-xl border border-[#DCE3E6] p-4"><p className="text-xs font-extrabold text-[#34495E]">Sebelum menyelesaikan</p><div className="mt-3 space-y-2 text-xs text-[#667681]"><p className="flex items-center gap-2"><CheckCircle2 size={14} /> Informasi usaha dan penanggung jawab tersimpan.</p><p className="flex items-center gap-2"><CheckCircle2 size={14} /> Lokasi usaha sudah dilengkapi.</p><p className="flex items-center gap-2"><Clock3 size={14} /> Verifikasi usaha dapat diproses setelah dokumen diperiksa admin.</p></div></div>
                </div>
              )}

              {error && <div role="alert" className="alert alert-error mt-6 rounded-xl text-sm"><span>{error}</span></div>}

              <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-[#EEF1F2] pt-5 sm:flex-row">
                <button type="button" disabled={saving} onClick={() => step === 0 ? router.push("/auth/sign-up/employer") : setStep((current) => Math.max(0, current - 1))} className="btn btn-ghost min-h-12 rounded-xl px-5 text-sm font-bold text-[#53616D] hover:bg-[#ECF0F1]"><ArrowLeft size={16} /> {step === 0 ? "Kembali" : "Tahap sebelumnya"}</button>
                <button type="button" disabled={saving} onClick={() => void saveAndContinue()} className="btn btn-primary min-h-12 rounded-xl border-0 bg-[#2C3E50] px-6 text-sm font-bold text-white hover:bg-[#34495E]">{saving ? <><LoaderCircle size={17} className="animate-spin" /> Menyimpan...</> : step === 4 ? <>Selesaikan Profil Usaha <Check size={17} /></> : <>Simpan dan Lanjutkan <ArrowRight size={17} /></>}</button>
              </div>
            </div>
          </div>
        </section>
        <p className="mt-5 text-center text-[10px] leading-5 text-[#9AA5AB]">© 2026 KerjaLokal · Data usaha dapat diperbarui sesuai perkembangan bisnis.</p>
      </div>
    </main>
  );
}
