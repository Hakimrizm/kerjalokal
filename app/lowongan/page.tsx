import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, BriefcaseBusiness, CalendarDays, MapPin, Wallet } from "lucide-react";

export const instant = false;

function currency(value: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}
function salaryLabel(job: { salary_min: number | null; salary_max: number | null; salary_negotiable: boolean }) {
  if (job.salary_negotiable && job.salary_min == null && job.salary_max == null) return "Dapat dinegosiasikan";
  if (job.salary_min != null && job.salary_max != null) return `${currency(job.salary_min)} – ${currency(job.salary_max)}`;
  if (job.salary_min != null) return `Mulai ${currency(job.salary_min)}`;
  if (job.salary_max != null) return `Maksimal ${currency(job.salary_max)}`;
  return "Gaji dibicarakan";
}

export default async function PublicJobsPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase.from("jobs").select("id,employer_id,title,category,employment_type,city,district,salary_min,salary_max,salary_negotiable,application_deadline,created_at").eq("status","published").order("created_at",{ascending:false});
  const rows = jobs ?? [];
  const employerIds = [...new Set(rows.map((job)=>job.employer_id))];
  const { data: employers } = employerIds.length ? await supabase.from("employer_profiles").select("user_id,business_name,business_type").in("user_id",employerIds) : { data: [] as {user_id:string;business_name:string;business_type:string}[] };
  
  return (
    <main className="min-h-screen bg-[#F3F5F6] px-4 py-8 text-[#2C3E50] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3"><Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2C3E50] text-white"><BriefcaseBusiness size={19}/></span><span className="text-lg font-extrabold tracking-tight">kerja<span className="text-[#7F8C8D]">lokal</span></span></Link><Link href="/auth/sign-up" className="btn btn-primary btn-sm rounded-full border-0 bg-[#2C3E50] px-5 text-white">Buat Profil Pencari Kerja <ArrowRight size={14}/></Link></header>
        <div className="mb-7"><span className="badge badge-outline border-[#BDC3C7] bg-white text-[10px] font-bold text-[#53616D]">LOWONGAN TERBIT</span><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Temukan pekerjaan di sekitar kamu.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#7F8C8D]">Lowongan dari usaha yang telah terverifikasi langsung ditampilkan setelah diterbitkan dan tetap dipantau oleh sistem keamanan.</p></div>
        {rows.length ? <div className="grid gap-4 md:grid-cols-2">{rows.map((job)=>{const employer=(employers ?? []).find((item)=>item.user_id===job.employer_id);return <article key={job.id} className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"><div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]"><BriefcaseBusiness size={21}/></span><div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#8A969D]">{job.category}</p><h2 className="mt-1 text-base font-extrabold text-[#2C3E50]">{job.title}</h2><p className="mt-1 text-xs font-semibold text-[#667681]">{employer?.business_name ?? "Usaha terverifikasi"}</p></div></div><div className="mt-5 space-y-2 border-y border-[#EEF1F2] py-4 text-xs text-[#7F8C8D]"><p className="flex items-center gap-2"><MapPin size={14}/>{job.district}, {job.city}</p><p className="flex items-center gap-2"><Wallet size={14}/>{salaryLabel(job)}</p><p className="flex items-center gap-2"><CalendarDays size={14}/>{job.application_deadline ? `Batas lamaran ${new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"long",year:"numeric"}).format(new Date(`${job.application_deadline}T00:00:00`))}` : "Tidak ada batas akhir yang ditentukan"}</p></div><div className="mt-4 flex items-center justify-between gap-3"><span className="badge badge-outline border-[#DCE3E6] text-[10px] text-[#53616D]">{job.employment_type}</span><Link href={`/lowongan/${job.id}`} className="btn btn-primary btn-sm rounded-lg border-0 bg-[#2C3E50] text-white">Lihat Detail <ArrowRight size={14}/></Link></div></article>;})}</div> : <div className="rounded-2xl border border-dashed border-[#C9D3D8] bg-white px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ECF0F1] text-[#53616D]"><BriefcaseBusiness size={25}/></span><h2 className="mt-4 text-base font-extrabold">Belum ada lowongan yang tayang</h2><p className="mt-2 text-sm text-[#8A969D]">Belum ada lowongan aktif. Coba periksa kembali nanti.</p></div>}
      </div>
    </main>
  );
}
