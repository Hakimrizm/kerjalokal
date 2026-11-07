"use client";

import { createClient } from "@/lib/supabase/client";
import { IndonesiaRegionSelect, type IndonesiaRegionValue } from "@/components/indonesia-region-select";
import { notify } from "@/lib/notify";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CalendarDays,
  Clock3,
  ExternalLink,
  Facebook,
  FileCheck2,
  FileUp,
  Globe2,
  Instagram,
  LoaderCircle,
  LocateFixed,
  Mail,
  MapPin,
  MapPinned,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

type EmployerProfile = {
  user_id: string;
  business_name: string | null;
  business_type: string | null;
  description: string | null;
  established_year: number | null;
  logo_path: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  village: string | null;
  address: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  verification_status: "pending" | "verified" | "rejected";
  decision_notes?: string | null;
  updated_at?: string | null;
};

type EmployerContact = {
  pic_name: string | null;
  pic_position: string | null;
  phone: string | null;
  contact_email: string | null;
  operating_hours: string | null;
};

type EmployerDocument = {
  id: string;
  document_type: string;
  document_number: string | null;
  file_path: string;
  verification_status: "pending" | "verified" | "rejected";
  created_at: string;
  signed_url: string | null;
};

type FormState = {
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
  latitude: string;
  longitude: string;
  website: string;
  instagram_url: string;
  facebook_url: string;
  operating_hours: string;
};

const businessTypes = [
  "UMKM / Usaha Rumahan",
  "Toko / Retail",
  "Restoran / Kuliner",
  "Bengkel / Otomotif",
  "Laundry / Jasa",
  "Koperasi",
  "Perusahaan",
  "Lainnya",
];

const documentTypes = [
  { value: "NIB", label: "Nomor Induk Berusaha (NIB)" },
  { value: "SKU", label: "Surat Keterangan Usaha (SKU)" },
  { value: "SIUP", label: "Surat Izin Usaha Perdagangan (SIUP)" },
  { value: "OTHER", label: "Dokumen pendukung lainnya" },
];

function toForm(profile: EmployerProfile, contact: EmployerContact): FormState {
  return {
    business_name: profile.business_name ?? "",
    business_type: profile.business_type ?? "",
    description: profile.description ?? "",
    established_year: profile.established_year ? String(profile.established_year) : "",
    logo_path: profile.logo_path ?? "",
    pic_name: contact.pic_name ?? "",
    pic_position: contact.pic_position ?? "",
    phone: contact.phone ?? "",
    contact_email: contact.contact_email ?? "",
    province: profile.province ?? "",
    city: profile.city ?? "",
    district: profile.district ?? "",
    village: profile.village ?? "",
    address: profile.address ?? "",
    postal_code: profile.postal_code ?? "",
    latitude: profile.latitude != null ? String(profile.latitude) : "",
    longitude: profile.longitude != null ? String(profile.longitude) : "",
    website: profile.website ?? "",
    instagram_url: profile.instagram_url ?? "",
    facebook_url: profile.facebook_url ?? "",
    operating_hours: contact.operating_hours ?? "",
  };
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#EEF1F2] px-4 py-4 sm:px-6">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]">
          <Icon size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-[#2C3E50]">{title}</h2>
          <p className="mt-0.5 text-[11px] leading-5 text-[#8A969D]">{description}</p>
        </div>
      </div>
      <div className="space-y-5 p-4 sm:p-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-control min-w-0 gap-1.5">
      <label className="label justify-start p-0">
        <span className="label-text text-xs font-bold text-[#34495E]">{label}</span>
      </label>
      {children}
      {error ? (
        <p className="text-[11px] leading-4 text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-[10px] leading-4 text-[#9AA5AB]">{hint}</p>
      ) : null}
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "verified") return "Terverifikasi";
  if (status === "rejected") return "Perlu perbaikan";
  return "Menunggu pemeriksaan";
}

function documentLabel(type: string) {
  return documentTypes.find((item) => item.value === type)?.label ?? type;
}

const baseInput =
  "input input-bordered h-12 min-h-12 w-full rounded-xl bg-white text-sm text-[#2C3E50] placeholder:text-[#AAB4BA] focus:outline-none focus:ring-2 focus:ring-[#34495E]/10";
const baseTextarea =
  "textarea textarea-bordered min-h-28 w-full rounded-xl bg-white text-sm leading-6 text-[#2C3E50] placeholder:text-[#AAB4BA] focus:outline-none focus:ring-2 focus:ring-[#34495E]/10";

export function EmployerProfileManager({
  userId,
  accountEmail,
  initialProfile,
  initialContact,
  initialLogoUrl,
  initialDocuments,
}: {
  userId: string;
  accountEmail: string;
  initialProfile: EmployerProfile;
  initialContact: EmployerContact;
  initialLogoUrl: string | null;
  initialDocuments: EmployerDocument[];
}) {
  const [form, setForm] = useState<FormState>(() => toForm(initialProfile, initialContact));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [documents, setDocuments] = useState<EmployerDocument[]>(initialDocuments);
  const [newDocumentType, setNewDocumentType] = useState("");
  const [newDocumentNumber, setNewDocumentNumber] = useState("");
  const [newDocumentFile, setNewDocumentFile] = useState<File | null>(null);
  const [documentBusy, setDocumentBusy] = useState(false);

  const location: IndonesiaRegionValue = useMemo(
    () => ({
      province: form.province,
      city: form.city,
      district: form.district,
      village: form.village,
    }),
    [form.province, form.city, form.district, form.village],
  );

  const initials = form.business_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase() || "KL";

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSubmitError("");
  }

  function inputClass(key: string) {
    return `${baseInput} ${
      errors[key]
        ? "border-red-400 focus:border-red-500"
        : "border-[#D5DDE1] focus:border-[#34495E]"
    }`;
  }

  function textareaClass(key: string) {
    return `${baseTextarea} ${
      errors[key]
        ? "border-red-400 focus:border-red-500"
        : "border-[#D5DDE1] focus:border-[#34495E]"
    }`;
  }

  function validate() {
    const next: Record<string, string> = {};

    if (form.business_name.trim().length < 2) {
      next.business_name = "Nama usaha minimal 2 karakter.";
    }
    if (!form.business_type) {
      next.business_type = "Pilih jenis usaha terlebih dahulu.";
    }
    if (form.description.trim().length < 20) {
      next.description = "Deskripsi usaha minimal 20 karakter.";
    }
    if (form.established_year) {
      const year = Number(form.established_year);
      if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
        next.established_year = "Tahun berdiri tidak valid.";
      }
    }

    if (form.pic_name.trim().length < 3) {
      next.pic_name = "Nama pemilik/penanggung jawab minimal 3 karakter.";
    }
    if (!/^[0-9+()\-\s]{8,20}$/.test(form.phone.trim())) {
      next.phone = "Masukkan nomor WhatsApp/telepon yang valid.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) {
      next.contact_email = "Masukkan email kontak yang valid.";
    }

    if (!form.province.trim()) next.province = "Pilih provinsi.";
    if (!form.city.trim()) next.city = "Pilih kota/kabupaten.";
    if (!form.district.trim()) next.district = "Pilih kecamatan.";
    if (!form.village.trim()) next.village = "Pilih desa/kelurahan.";
    if (!form.address.trim()) next.address = "Alamat lengkap usaha wajib diisi.";
    if (form.postal_code.trim() && !/^\d{5}$/.test(form.postal_code.trim())) {
      next.postal_code = "Kode pos harus terdiri dari 5 angka.";
    }

    if (Boolean(form.latitude.trim()) !== Boolean(form.longitude.trim())) {
      next.latitude = "Isi latitude dan longitude secara lengkap.";
      next.longitude = "Isi latitude dan longitude secara lengkap.";
    } else if (form.latitude.trim() && form.longitude.trim()) {
      const latitude = Number(form.latitude);
      const longitude = Number(form.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        next.latitude = "Latitude harus berupa angka antara -90 sampai 90.";
      }
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        next.longitude = "Longitude harus berupa angka antara -180 sampai 180.";
      }
    }

    for (const [key, label] of [
      ["website", "Website"],
      ["instagram_url", "Instagram"],
      ["facebook_url", "Facebook"],
    ] as const) {
      const value = form[key].trim();
      if (value) {
        try {
          const parsed = new URL(value);
          if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
        } catch {
          next[key] = `${label} harus menggunakan URL yang valid (https://...).`;
        }
      }
    }

    if (logoFile) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(logoFile.type)) {
        next.logo_file = "Logo harus berupa JPG, PNG, atau WEBP.";
      } else if (logoFile.size > 3 * 1024 * 1024) {
        next.logo_file = "Ukuran logo maksimal 3 MB.";
      }
    }

    setErrors(next);
    if (Object.keys(next).length) {
      const message = Object.values(next)[0];
      notify("error", message);
      return false;
    }
    return true;
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      notify("error", "Browser tidak mendukung pengambilan lokasi. Masukkan koordinat secara manual.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        update("latitude", position.coords.latitude.toFixed(7));
        update("longitude", position.coords.longitude.toFixed(7));
        setGeoLoading(false);
        notify("success", "Koordinat lokasi usaha berhasil diambil.");
      },
      () => {
        setGeoLoading(false);
        notify("error", "Lokasi belum dapat diperoleh. Periksa izin lokasi browser atau masukkan koordinat secara manual.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  async function uploadFile(bucket: string, file: File) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const path = `${userId}/${Date.now()}-${safeName}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    return path;
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setSaving(true);
    const supabase = createClient();
    const oldLogoPath = form.logo_path;
    let uploadedLogoPath: string | null = null;
    let profileSaved = false;

    try {
      let nextLogoPath = form.logo_path || null;
      if (logoFile) {
        uploadedLogoPath = await uploadFile("business-logos", logoFile);
        nextLogoPath = uploadedLogoPath;
      }

      const { error: profileError } = await supabase
        .from("employer_profiles")
        .update({
          business_name: form.business_name.trim(),
          business_type: form.business_type,
          description: form.description.trim(),
          established_year: form.established_year ? Number(form.established_year) : null,
          logo_path: nextLogoPath,
          province: form.province.trim(),
          city: form.city.trim(),
          district: form.district.trim(),
          village: form.village.trim(),
          address: form.address.trim(),
          postal_code: form.postal_code.trim() || null,
          latitude: form.latitude.trim() ? Number(form.latitude) : null,
          longitude: form.longitude.trim() ? Number(form.longitude) : null,
          website: form.website.trim() || null,
          instagram_url: form.instagram_url.trim() || null,
          facebook_url: form.facebook_url.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;
      profileSaved = true;

      if (logoFile && uploadedLogoPath) {
        const { data: signed } = await supabase.storage
          .from("business-logos")
          .createSignedUrl(uploadedLogoPath, 3600);
        setLogoUrl(signed?.signedUrl ?? logoPreview);
        setLogoFile(null);
        setForm((current) => ({ ...current, logo_path: uploadedLogoPath! }));
      } else if (!nextLogoPath) {
        setLogoUrl(null);
      }

      if (oldLogoPath && oldLogoPath !== nextLogoPath) {
        await supabase.storage.from("business-logos").remove([oldLogoPath]);
      }

      const { error: contactError } = await supabase
        .from("employer_contacts")
        .upsert(
          {
            user_id: userId,
            pic_name: form.pic_name.trim(),
            pic_position: form.pic_position.trim() || null,
            phone: form.phone.trim(),
            contact_email: form.contact_email.trim().toLowerCase(),
            operating_hours: form.operating_hours.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

      if (contactError) throw contactError;

      notify("success", "Profil usaha berhasil diperbarui.");
    } catch (caught) {
      if (uploadedLogoPath && !profileSaved) {
        await supabase.storage.from("business-logos").remove([uploadedLogoPath]);
      }
      const message =
        caught instanceof Error
          ? caught.message
          : "Profil usaha belum berhasil disimpan. Silakan coba kembali.";
      const visibleMessage = profileSaved
        ? `Identitas usaha sudah tersimpan, tetapi data penanggung jawab belum berhasil diperbarui: ${message}`
        : message;
      setSubmitError(visibleMessage);
      notify("error", visibleMessage);
    } finally {
      setSaving(false);
    }
  }

  async function addOrReplaceDocument() {
    if (!newDocumentType) {
      notify("error", "Pilih jenis dokumen terlebih dahulu.");
      return;
    }
    if (!newDocumentFile) {
      notify("error", "Pilih file dokumen yang ingin diunggah.");
      return;
    }
    if (!["application/pdf", "image/jpeg", "image/png"].includes(newDocumentFile.type)) {
      notify("error", "Dokumen harus berupa PDF, JPG, atau PNG.");
      return;
    }
    if (newDocumentFile.size > 5 * 1024 * 1024) {
      notify("error", "Ukuran dokumen maksimal 5 MB.");
      return;
    }

    setDocumentBusy(true);
    const supabase = createClient();
    let uploadedPath: string | null = null;
    const existing = documents.find((item) => item.document_type === newDocumentType);

    try {
      uploadedPath = await uploadFile("employer-verification", newDocumentFile);

      if (existing) {
        const { error: deleteError } = await supabase
          .from("employer_verification_documents")
          .delete()
          .eq("id", existing.id)
          .eq("user_id", userId);
        if (deleteError) throw deleteError;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("employer_verification_documents")
        .insert({
          user_id: userId,
          document_type: newDocumentType,
          document_number: newDocumentNumber.trim() || null,
          file_path: uploadedPath,
          verification_status: "pending",
        })
        .select("id,document_type,document_number,file_path,verification_status,created_at")
        .single();

      if (insertError) {
        if (existing) {
          await supabase.from("employer_verification_documents").insert({
            user_id: userId,
            document_type: existing.document_type,
            document_number: existing.document_number,
            file_path: existing.file_path,
            verification_status: "pending",
          });
        }
        throw insertError;
      }

      const { data: signed } = await supabase.storage
        .from("employer-verification")
        .createSignedUrl(uploadedPath, 3600);

      setDocuments((current) => [
        ...current.filter((item) => item.document_type !== newDocumentType),
        {
          ...inserted,
          signed_url: signed?.signedUrl ?? null,
        },
      ]);
      if (existing) {
        await supabase.storage.from("employer-verification").remove([existing.file_path]);
      }
      setNewDocumentType("");
      setNewDocumentNumber("");
      setNewDocumentFile(null);
      notify("success", existing ? "Dokumen berhasil diganti dan menunggu pemeriksaan ulang." : "Dokumen berhasil diunggah.");
    } catch (caught) {
      if (uploadedPath) {
        await supabase.storage.from("employer-verification").remove([uploadedPath]);
      }
      const message =
        caught instanceof Error ? caught.message : "Dokumen belum berhasil disimpan.";
      notify("error", message);
    } finally {
      setDocumentBusy(false);
    }
  }

  async function removeDocument(document: EmployerDocument) {
    const confirmed = window.confirm(
      `Hapus dokumen ${documentLabel(document.document_type)} dari profil usaha?`,
    );
    if (!confirmed) return;

    const supabase = createClient();
    setDocumentBusy(true);
    const { error } = await supabase
      .from("employer_verification_documents")
      .delete()
      .eq("id", document.id)
      .eq("user_id", userId);

    if (error) {
      notify("error", error.message);
      setDocumentBusy(false);
      return;
    }

    await supabase.storage.from("employer-verification").remove([document.file_path]);
    setDocuments((current) => current.filter((item) => item.id !== document.id));
    notify("success", "Dokumen berhasil dihapus dari profil usaha.");
    setDocumentBusy(false);
  }

  const locationText = [form.village, form.district, form.city, form.province]
    .filter(Boolean)
    .join(", ");

  const verificationTone =
    initialProfile.verification_status === "verified"
      ? "border-[#D6E8DC] bg-[#F1F8F3] text-[#347052]"
      : initialProfile.verification_status === "rejected"
        ? "border-[#E8CACA] bg-[#FFF5F5] text-[#A34E4E]"
        : "border-[#EADCB9] bg-[#FFF9EC] text-[#8A6A2E]";

  return (
    <div className="w-full min-w-0 space-y-6">
      <section className="overflow-hidden rounded-[26px] bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-[#2C3E50] via-[#34495E] to-[#7F8C8D] sm:h-36" />
        <div className="px-4 pb-5 sm:px-8 sm:pb-6">
          <div className="-mt-10 flex flex-col items-center gap-4 text-center sm:-mt-12 sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div className="flex w-full min-w-0 flex-col items-center gap-3 text-center sm:w-auto sm:flex-row sm:items-end sm:gap-4 sm:text-left">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-white bg-[#ECF0F1] text-xl font-extrabold text-[#34495E] shadow-md sm:h-28 sm:w-28">
                {logoPreview || logoUrl ? (
                  <img src={logoPreview ?? logoUrl ?? ""} alt={`Logo ${form.business_name}`} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex min-w-0 w-full flex-col items-center text-center sm:w-auto sm:items-start sm:text-left">
                <span className="inline-flex items-center rounded-full border border-[#DCE3E6] bg-[#F7F9FA] px-2.5 py-1 text-[9px] font-bold text-[#53616D]">
                  PROFIL PELAKU USAHA
                </span>
                <h1 className="mt-2 line-clamp-2 break-words text-lg font-extrabold leading-snug text-[#2C3E50] sm:text-2xl">
                  {form.business_name || "Nama usaha"}
                </h1>
                <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-4 text-[#7F8C8D] sm:items-center sm:text-xs">
                  <MapPin size={13} className="mt-0.5 shrink-0 sm:mt-0" />
                  <span>{locationText || "Lokasi usaha belum dilengkapi"}</span>
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-bold ${verificationTone}`}>
              {initialProfile.verification_status === "verified" ? <BadgeCheck size={14} /> : <Clock3 size={14} />}
              {statusLabel(initialProfile.verification_status)}
            </span>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <form
          onSubmit={handleSave}
          noValidate
          className="min-w-0 space-y-5"
        >
          <SectionCard icon={Building2} title="Identitas usaha" description="Informasi dasar yang ditampilkan kepada pencari kerja.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama usaha" error={errors.business_name}>
                <input className={inputClass("business_name")} value={form.business_name} onChange={(event) => update("business_name", event.target.value)} aria-invalid={Boolean(errors.business_name)} required maxLength={120} placeholder="Contoh: Toko Berkah Jaya" />
              </Field>
              <Field label="Tahun berdiri" error={errors.established_year}>
                <input className={inputClass("established_year")} type="number" min="1900" max={new Date().getFullYear()} value={form.established_year} onChange={(event) => update("established_year", event.target.value)} aria-invalid={Boolean(errors.established_year)} placeholder="Contoh: 2020" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Jenis usaha" error={errors.business_type}>
                  <select className={`select select-bordered h-12 min-h-12 w-full rounded-xl bg-white text-sm ${errors.business_type ? "border-red-400" : "border-[#D5DDE1]"}`} value={form.business_type} onChange={(event) => update("business_type", event.target.value)} aria-invalid={Boolean(errors.business_type)} required>
                    <option value="">Pilih jenis usaha</option>
                    {businessTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Deskripsi usaha" error={errors.description} hint={`${form.description.length}/500 karakter`}>
                  <textarea className={textareaClass("description")} value={form.description} onChange={(event) => update("description", event.target.value)} aria-invalid={Boolean(errors.description)} required minLength={20} maxLength={500} placeholder="Ceritakan produk/jasa, aktivitas utama, dan lingkungan kerja di usahamu." />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Logo usaha" error={errors.logo_file} hint="PNG, JPG, atau WEBP. Maksimal 3 MB.">
                  <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[#C9D3D8] bg-[#FAFBFB] p-4 sm:flex-row sm:items-center">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#ECF0F1] text-[#53616D]">
                      {logoPreview || logoUrl ? <img src={logoPreview ?? logoUrl ?? ""} alt="Pratinjau logo usaha" className="h-full w-full object-cover" /> : <Building2 size={24} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <input className="file-input file-input-bordered file-input-sm w-full max-w-sm rounded-lg border-[#D5DDE1] bg-white text-xs" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => { setLogoFile(event.target.files?.[0] ?? null); setErrors((current) => { const next = { ...current }; delete next.logo_file; return next; }); }} />
                      {form.logo_path && !logoFile && (
                        <button type="button" onClick={() => { update("logo_path", ""); setLogoUrl(null); }} className="mt-2 text-[11px] font-semibold text-red-600 hover:underline">
                          Hapus logo saat ini
                        </button>
                      )}
                    </div>
                  </div>
                </Field>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={UserRound} title="Pemilik & penanggung jawab" description="Kontak orang yang bertanggung jawab atas usaha dan proses rekrutmen.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama pemilik / penanggung jawab" error={errors.pic_name}>
                <input className={inputClass("pic_name")} value={form.pic_name} onChange={(event) => update("pic_name", event.target.value)} aria-invalid={Boolean(errors.pic_name)} required minLength={3} placeholder="Nama lengkap pemilik atau PIC" />
              </Field>
              <Field label="Jabatan" error={errors.pic_position}>
                <input className={inputClass("pic_position")} value={form.pic_position} onChange={(event) => update("pic_position", event.target.value)} aria-invalid={Boolean(errors.pic_position)} placeholder="Contoh: Pemilik, HR, Pengelola" />
              </Field>
              <Field label="Nomor WhatsApp / telepon" error={errors.phone}>
                <div className="relative">
                  <Phone size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A969D]" />
                  <input className={`${inputClass("phone")} pl-10`} type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} aria-invalid={Boolean(errors.phone)} required placeholder="08xxxxxxxxxx" />
                </div>
              </Field>
              <Field label="Email kontak" error={errors.contact_email}>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A969D]" />
                  <input className={`${inputClass("contact_email")} pl-10`} type="email" value={form.contact_email} onChange={(event) => update("contact_email", event.target.value)} aria-invalid={Boolean(errors.contact_email)} required placeholder="kontak@usaha.com" />
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Jam operasional" hint="Contoh: Senin–Sabtu, 08.00–17.00 WIB.">
                  <textarea className={baseTextarea + " border-[#D5DDE1]"} value={form.operating_hours} onChange={(event) => update("operating_hours", event.target.value)} placeholder="Tuliskan jam operasional usaha." />
                </Field>
              </div>
              <div className="sm:col-span-2 rounded-xl bg-[#F4F7F8] p-4 text-[11px] leading-5 text-[#667681]">
                Email akun yang digunakan untuk login: <strong className="break-all text-[#34495E]">{accountEmail || "Tidak tersedia"}</strong>. Email kontak di atas dapat berbeda dari email akun.
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={MapPinned} title="Lokasi usaha" description="Alamat dan titik koordinat yang digunakan untuk informasi lokasi lowongan.">
            <div className="grid gap-4 sm:grid-cols-2">
              <IndonesiaRegionSelect
                value={location}
                onChange={(next) => {
                  update("province", next.province);
                  update("city", next.city);
                  update("district", next.district);
                  update("village", next.village);
                }}
                errors={{
                  province: errors.province,
                  city: errors.city,
                  district: errors.district,
                  village: errors.village,
                }}
              />
              <div className="sm:col-span-2">
                <Field label="Alamat lengkap usaha" error={errors.address}>
                  <textarea className={textareaClass("address")} value={form.address} onChange={(event) => update("address", event.target.value)} aria-invalid={Boolean(errors.address)} required placeholder="Nama jalan, nomor bangunan, RT/RW, patokan..." />
                </Field>
              </div>
              <Field label="Kode pos" error={errors.postal_code}>
                <input className={inputClass("postal_code")} value={form.postal_code} onChange={(event) => update("postal_code", event.target.value.replace(/\D/g, "").slice(0, 5))} aria-invalid={Boolean(errors.postal_code)} inputMode="numeric" maxLength={5} placeholder="40123" />
              </Field>
            </div>

            <div className="rounded-xl border border-[#DCE3E6] bg-[#F8FAFA] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-[#34495E]" />
                  <div>
                    <p className="text-xs font-extrabold text-[#34495E]">Titik lokasi Maps</p>
                    <p className="mt-1 text-[10px] leading-5 text-[#7F8C8D]">Koordinat ini menjadi lokasi default lowongan dan membantu pencari kerja menghitung jarak ke tempat usaha.</p>
                  </div>
                </div>
                <button type="button" onClick={getCurrentLocation} disabled={geoLoading} className="btn btn-outline btn-sm shrink-0 rounded-lg border-[#BDC3C7] text-[11px] text-[#34495E]">
                  {geoLoading ? <LoaderCircle size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                  Gunakan lokasi perangkat
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Latitude" error={errors.latitude}>
                  <input className={inputClass("latitude")} inputMode="decimal" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} placeholder="Contoh: -6.2000000" />
                </Field>
                <Field label="Longitude" error={errors.longitude}>
                  <input className={inputClass("longitude")} inputMode="decimal" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} placeholder="Contoh: 106.8166660" />
                </Field>
              </div>
              {form.latitude && form.longitude && (
                <a href={`https://www.google.com/maps?q=${encodeURIComponent(`${form.latitude},${form.longitude}`)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#34495E] hover:underline">
                  Lihat titik di Google Maps <ExternalLink size={12} />
                </a>
              )}
            </div>
          </SectionCard>

          <SectionCard icon={FileCheck2} title="Legalitas usaha" description="Kelola dokumen pendukung untuk proses verifikasi usaha.">
            <div className="rounded-xl border border-[#EADCB9] bg-[#FFF9EC] p-4 text-[11px] leading-5 text-[#80632C]">
              Dokumen yang diganti akan kembali berstatus menunggu pemeriksaan. Status verifikasi akhir hanya dapat ditetapkan oleh Super Admin.
            </div>

            {documents.length ? (
              <div className="space-y-3">
                {documents.map((document) => (
                  <div key={document.id} className="flex flex-col gap-3 rounded-xl border border-[#E2E7E9] p-4 sm:flex-row sm:items-center">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]">
                      <FileCheck2 size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold text-[#34495E]">{documentLabel(document.document_type)}</p>
                      <p className="mt-1 break-all text-[10px] text-[#8A969D]">Nomor: {document.document_number || "Tidak dicantumkan"}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${
                        document.verification_status === "verified"
                          ? "bg-[#EAF5ED] text-[#347052]"
                          : document.verification_status === "rejected"
                            ? "bg-[#FCEEEE] text-[#A34E4E]"
                            : "bg-[#FFF5DD] text-[#8A6A2E]"
                      }`}>
                        {statusLabel(document.verification_status)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {document.signed_url && (
                        <a href={document.signed_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm rounded-lg text-[10px] text-[#34495E]">
                          Lihat <ExternalLink size={13} />
                        </a>
                      )}
                      <button type="button" disabled={documentBusy} onClick={() => void removeDocument(document)} className="btn btn-ghost btn-sm btn-square rounded-lg text-red-500 hover:bg-red-50" aria-label="Hapus dokumen">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#C9D3D8] px-4 py-7 text-center">
                <FileUp size={22} className="mx-auto text-[#9AA5AB]" />
                <p className="mt-2 text-xs font-semibold text-[#667681]">Belum ada dokumen legalitas.</p>
                <p className="mt-1 text-[10px] text-[#9AA5AB]">Unggah NIB, SKU, SIUP, atau dokumen pendukung jika tersedia.</p>
              </div>
            )}

            <div className="rounded-xl bg-[#F7F9FA] p-4">
              <p className="text-xs font-extrabold text-[#34495E]">{documents.length ? "Tambah atau ganti dokumen" : "Unggah dokumen legalitas"}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Jenis dokumen">
                  <select className="select select-bordered h-12 min-h-12 w-full rounded-xl border-[#D5DDE1] bg-white text-sm" value={newDocumentType} onChange={(event) => setNewDocumentType(event.target.value)}>
                    <option value="">Pilih jenis dokumen</option>
                    {documentTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </Field>
                <Field label="Nomor dokumen">
                  <input className={baseInput + " border-[#D5DDE1]"} value={newDocumentNumber} onChange={(event) => setNewDocumentNumber(event.target.value)} placeholder="Nomor dokumen (opsional)" />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="File dokumen" hint="PDF, JPG, atau PNG. Maksimal 5 MB.">
                    <input className="file-input file-input-bordered file-input-sm w-full rounded-lg border-[#D5DDE1] bg-white text-xs" type="file" accept=".pdf,image/jpeg,image/png" onChange={(event: ChangeEvent<HTMLInputElement>) => setNewDocumentFile(event.target.files?.[0] ?? null)} />
                  </Field>
                </div>
              </div>
              <button type="button" onClick={() => void addOrReplaceDocument()} disabled={documentBusy || saving} className="btn btn-outline btn-sm mt-4 rounded-lg border-[#BDC3C7] text-xs font-bold text-[#34495E]">
                {documentBusy ? <LoaderCircle size={14} className="animate-spin" /> : <FileUp size={14} />}
                {documents.some((item) => item.document_type === newDocumentType) ? "Ganti dokumen" : "Unggah dokumen"}
              </button>
            </div>
          </SectionCard>

          <SectionCard icon={Globe2} title="Informasi online" description="Tautan publik dan informasi tambahan agar usaha lebih mudah ditemukan.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Website usaha" error={errors.website}>
                  <div className="relative">
                    <Globe2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A969D]" />
                    <input className={`${inputClass("website")} pl-10`} type="url" value={form.website} onChange={(event) => update("website", event.target.value)} aria-invalid={Boolean(errors.website)} placeholder="https://website-usaha.com" />
                  </div>
                </Field>
              </div>
              <Field label="Instagram" error={errors.instagram_url}>
                <div className="relative">
                  <Instagram size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A969D]" />
                  <input className={`${inputClass("instagram_url")} pl-10`} value={form.instagram_url} onChange={(event) => update("instagram_url", event.target.value)} aria-invalid={Boolean(errors.instagram_url)} placeholder="https://instagram.com/..." />
                </div>
              </Field>
              <Field label="Facebook" error={errors.facebook_url}>
                <div className="relative">
                  <Facebook size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A969D]" />
                  <input className={`${inputClass("facebook_url")} pl-10`} value={form.facebook_url} onChange={(event) => update("facebook_url", event.target.value)} aria-invalid={Boolean(errors.facebook_url)} placeholder="https://facebook.com/..." />
                </div>
              </Field>
            </div>
          </SectionCard>

          {submitError && (
            <div role="alert" className="alert alert-error rounded-xl text-sm">
              <AlertCircle size={17} />
              <span>{submitError}</span>
            </div>
          )}

          <div className="sticky bottom-3 z-20 flex flex-col-reverse gap-3 rounded-2xl border border-[#E2E7E9] bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="hidden text-[10px] leading-5 text-[#8A969D] sm:block">
              Perubahan identitas usaha dan kontak akan disimpan ke profil akun ini.
            </p>
            <button type="submit" disabled={saving || documentBusy} className="btn min-h-12 rounded-xl border-0 bg-[#2C3E50] px-6 text-sm font-extrabold text-white hover:bg-[#34495E] disabled:opacity-60">
              {saving ? <><LoaderCircle size={17} className="animate-spin" /> Menyimpan profil...</> : <><Save size={17} /> Simpan perubahan profil</>}
            </button>
          </div>
        </form>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-24">
          <section className={`rounded-2xl border p-5 ${verificationTone}`}>
            <div className="flex items-center gap-2">
              {initialProfile.verification_status === "verified" ? <BadgeCheck size={18} /> : <ShieldCheck size={18} />}
              <h2 className="text-sm font-extrabold">Status verifikasi</h2>
            </div>
            <p className="mt-3 text-base font-extrabold">{statusLabel(initialProfile.verification_status)}</p>
            <p className="mt-2 text-[11px] leading-5 opacity-80">
              {initialProfile.verification_status === "verified"
                ? "Usaha kamu sudah terverifikasi dan dapat menggunakan fitur rekrutmen sesuai ketentuan."
                : initialProfile.verification_status === "rejected"
                  ? initialProfile.decision_notes || "Periksa kembali data dan dokumen usaha, lalu perbarui informasi yang diperlukan."
                  : "Data usaha sedang diperiksa. Keputusan akhir verifikasi diberikan oleh Super Admin."}
            </p>
          </section>

          <section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-[#53616D]" />
              <h2 className="text-sm font-extrabold text-[#2C3E50]">Privasi data usaha</h2>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#7F8C8D]">
              Informasi publik usaha digunakan untuk memperkenalkan bisnis kepada pencari kerja. Kontak penanggung jawab dan dokumen legalitas dikelola secara terpisah dengan kebijakan akses Supabase.
            </p>
          </section>

          <section className="rounded-2xl bg-[#2C3E50] p-5 text-white shadow-lg shadow-[#2C3E50]/10">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
              <CalendarDays size={19} />
            </span>
            <h2 className="mt-4 text-sm font-extrabold">Profil usaha selalu bisa diperbarui</h2>
            <p className="mt-2 text-[11px] leading-5 text-white/65">
              Perbarui alamat, kontak, atau informasi usaha ketika ada perubahan agar calon pekerja memperoleh informasi yang akurat.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
