import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";

export const instant = false;
type PageProps = { searchParams: Promise<{ status?: string }> };
const labels: Record<string,string> = { pending: "Menunggu pemeriksaan", verified: "Terverifikasi", rejected: "Perlu perbaikan" };

export default async function AdminBusinessListPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = ["pending", "verified", "rejected"].includes(params.status ?? "") ? params.status! : "pending";
  const supabase = await createClient();
  let query = supabase.from("employer_profiles")
    .select("user_id,business_name,business_type,city,district,village,verification_status,review_recommendation,reviewed_at,created_at")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("verification_status", status);
  const { data: businesses, error } = await query;
  const rows = businesses ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><span className="badge badge-outline border-[#BDC3C7] bg-white text-[10px] font-bold text-[#53616D]">PEMERIKSAAN MITRA</span><h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Verifikasi Usaha</h1><p className="mt-2 text-sm text-[#7F8C8D]">Periksa identitas, lokasi, penanggung jawab, dan dokumen pendukung setiap usaha.</p></div>
        <div className="flex items-center gap-2 rounded-xl border border-[#E2E7E9] bg-white px-4 py-3"><Building2 size={18} className="text-[#53616D]"/><div><p className="text-lg font-extrabold">{rows.length}</p><p className="text-[10px] text-[#8A969D]">{labels[status]}</p></div></div>
      </header>

      <div className="flex flex-wrap gap-2">
        {["pending","verified","rejected"].map((item)=><Link key={item} href={`/admin/verifikasi-usaha?status=${item}`} className={`btn btn-sm rounded-full ${status===item ? "border-0 bg-[#2C3E50] text-white hover:bg-[#34495E]" : "btn-outline border-[#D5DDE1] bg-white text-[#53616D]"}`}>{labels[item]}</Link>)}
      </div>

      {error && <div role="alert" className="alert alert-error rounded-xl text-xs">Data usaha tidak dapat dimuat. Periksa migrasi dan kebijakan RLS.</div>}

      {rows.length ? <div className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
        <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_150px_130px] gap-4 border-b border-[#EEF1F2] bg-[#FAFBFB] px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-[#9AA5AB] md:grid"><span>Nama usaha</span><span>Lokasi</span><span>Rekomendasi</span><span>Aksi</span></div>
        <div className="divide-y divide-[#EEF1F2]">
          {rows.map((business)=>(
            <article key={business.user_id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_150px_130px] md:items-center md:gap-4">
              <div className="min-w-0"><p className="truncate text-sm font-extrabold text-[#34495E]">{business.business_name}</p><p className="mt-1 text-[11px] text-[#8A969D]">{business.business_type} · {business.village ?? "Desa belum diisi"}</p></div>
              <p className="text-xs text-[#667681]">{business.district}, {business.city}</p>
              <div><span className={`badge badge-sm ${business.review_recommendation==="recommend_approve"?"badge-success":business.review_recommendation==="recommend_reject"?"badge-error":business.review_recommendation==="needs_more_info"?"badge-warning":"badge-ghost"}`}>{business.review_recommendation==="recommend_approve"?"Direkomendasikan":business.review_recommendation==="recommend_reject"?"Tidak direkomendasikan":business.review_recommendation==="needs_more_info"?"Perlu data":"Belum diperiksa"}</span></div>
              <Link href={`/admin/verifikasi-usaha/${business.user_id}`} className="btn btn-outline btn-sm w-fit rounded-lg border-[#BDC3C7] text-xs text-[#34495E]">Buka pemeriksaan <ArrowRight size={13}/></Link>
            </article>
          ))}
        </div>
      </div> : <div className="rounded-2xl border border-dashed border-[#C9D3D8] bg-white px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ECF0F1] text-[#53616D]"><ShieldCheck size={25}/></span><h2 className="mt-4 text-base font-extrabold">Tidak ada usaha pada kategori ini</h2><p className="mt-2 text-sm text-[#8A969D]">Pendaftaran baru akan muncul setelah pelaku usaha melengkapi profil.</p></div>}
    </div>
  );
}
