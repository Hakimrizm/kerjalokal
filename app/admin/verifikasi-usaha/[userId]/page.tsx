import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminEmployerReview } from "@/components/admin-employer-review";
import { ArrowLeft, Building2, CalendarDays, ExternalLink, FileText, Globe2, Mail, MapPin, Phone, UserRound } from "lucide-react";

export const instant = false;
type PageProps = { params: Promise<{ userId: string }> };
function dateLabel(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

export default async function AdminBusinessDetailPage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
  const role = roleRow?.role === "fraud_admin" ? "super_admin" : roleRow?.role;
  const [{ data: business }, { data: contact }, { data: documents }] = await Promise.all([
    supabase.from("employer_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("employer_contacts").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("employer_verification_documents").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);
  if (!business) notFound();

  const documentRows = await Promise.all((documents ?? []).map(async (document) => {
    const { data } = await supabase.storage.from("employer-verification").createSignedUrl(document.file_path, 600);
    return { ...document, signedUrl: data?.signedUrl ?? null };
  }));
  const { data: logo } = business.logo_path
    ? await supabase.storage.from("business-logos").createSignedUrl(business.logo_path, 600)
    : { data: null };

  const statusLabel = business.verification_status === "verified" ? "Terverifikasi" : business.verification_status === "rejected" ? "Ditolak" : "Menunggu pemeriksaan";
  return (
    <div className="space-y-6">
      <Link href="/admin/verifikasi-usaha" className="inline-flex items-center gap-2 text-xs font-bold text-[#7F8C8D] hover:text-[#2C3E50]"><ArrowLeft size={15}/> Kembali ke daftar usaha</Link>
      <header className="flex flex-col justify-between gap-4 rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#ECF0F1] text-[#34495E]">{logo?.signedUrl ? <img src={logo.signedUrl} alt={`Logo ${business.business_name}`} className="h-full w-full object-cover"/> : <Building2 size={26}/>}</span>
          <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9AA5AB]">Detail verifikasi usaha</p><h1 className="mt-1 truncate text-xl font-extrabold tracking-tight sm:text-2xl">{business.business_name}</h1><p className="mt-1 text-xs text-[#8A969D]">{business.business_type} · Terdaftar {dateLabel(business.created_at)}</p></div>
        </div>
        <span className={`badge badge-lg ${business.verification_status==="verified"?"badge-success":business.verification_status==="rejected"?"badge-error":"badge-warning"}`}>{statusLabel}</span>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-extrabold">Informasi usaha</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#667681]">{business.description || "Deskripsi belum diisi."}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Info icon={Building2} label="Jenis usaha" value={business.business_type}/>
              <Info icon={CalendarDays} label="Tahun berdiri" value={business.established_year?.toString()}/>
              <Info icon={MapPin} label="Lokasi" value={[business.address,business.village,business.district,business.city,business.province,business.postal_code].filter(Boolean).join(", ")}/>
              <Info icon={Globe2} label="Website" value={business.website} link/>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-sm font-extrabold">Penanggung jawab usaha</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info icon={UserRound} label="Nama PIC" value={contact?.pic_name}/>
              <Info icon={UserRound} label="Jabatan" value={contact?.pic_position}/>
              <Info icon={Phone} label="Telepon / WhatsApp" value={contact?.phone}/>
              <Info icon={Mail} label="Email kontak" value={contact?.contact_email}/>
              <Info icon={CalendarDays} label="Jam operasional" value={contact?.operating_hours}/>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-extrabold">Dokumen legalitas</h2><span className="badge badge-outline border-[#DCE3E6] text-[10px] text-[#7F8C8D]">{documentRows.length} dokumen</span></div>
            {documentRows.length ? <div className="mt-4 space-y-3">{documentRows.map((document)=>(
              <div key={document.id} className="flex flex-col justify-between gap-3 rounded-xl border border-[#EEF1F2] p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#53616D]"><FileText size={18}/></span><div className="min-w-0"><p className="text-xs font-extrabold text-[#34495E]">{document.document_type}</p><p className="mt-1 truncate text-[11px] text-[#8A969D]">Nomor: {document.document_number || "Tidak dicantumkan"}</p></div></div>
                {document.signedUrl ? <a href={document.signedUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm rounded-lg border-[#BDC3C7] text-xs text-[#34495E]">Buka dokumen <ExternalLink size={13}/></a> : <span className="text-[10px] text-[#A0AAB0]">File tidak dapat dibuka</span>}
              </div>
            ))}</div> : <div className="mt-4 rounded-xl bg-[#FFF8E8] p-4 text-xs leading-5 text-[#80632C]">Pelaku usaha belum mengunggah dokumen legalitas. Admin perlu memeriksa keberadaan usaha melalui informasi dan bukti pendukung lain sebelum memberi rekomendasi.</div>}
          </section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24">
          <AdminEmployerReview
            employerId={userId}
            role={role === "super_admin" ? "super_admin" : "admin"}
            status={business.verification_status}
            recommendation={business.review_recommendation}
            reviewerNotes={business.reviewer_notes}
            decisionNotes={business.decision_notes}
          />
          <section className="rounded-2xl border border-[#E2E7E9] bg-[#F8FAFA] p-4">
            <p className="text-xs font-extrabold text-[#34495E]">Panduan pemeriksaan</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[11px] leading-5 text-[#7F8C8D]">
              <li>Periksa kecocokan nama dan alamat usaha.</li>
              <li>Hubungi nomor PIC yang terdaftar.</li>
              <li>Periksa dokumen legalitas jika tersedia.</li>
              <li>Catat bukti dan alasan rekomendasi.</li>
              <li>Keputusan akhir dilakukan Super Admin.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value, link = false }: { icon: typeof Building2; label: string; value?: string | null; link?: boolean }) {
  const display = value || "Belum diisi";
  return <div className="flex min-w-0 items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#F1F4F5] text-[#7F8C8D]"><Icon size={16}/></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">{label}</p>{link && value ? <a href={value} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs font-semibold text-[#34495E] underline">{display}</a> : <p className="mt-1 break-words text-xs font-semibold leading-5 text-[#53616D]">{display}</p>}</div></div>;
}
