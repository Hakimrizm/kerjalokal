import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminFraudReview } from "@/components/admin-fraud-review";
import { AlertTriangle, CalendarDays, UserRound } from "lucide-react";

export const instant = false;
function dateLabel(value: string) { return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value)); }

export default async function AdminFraudPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
  if (roleRow?.role !== "super_admin" && roleRow?.role !== "fraud_admin") redirect("/admin");
  const { data: reports, error } = await supabase.from("fraud_reports").select("*").order("created_at",{ascending:false}).limit(100);
  const rows = reports ?? [];
  const jobIds = [...new Set(rows.filter((r)=>r.target_type==="job").map((r)=>r.target_id))];
  const { data: jobs } = jobIds.length ? await supabase.from("jobs").select("id,title,employer_id").in("id",jobIds) : {data:[] as {id:string;title:string;employer_id:string}[]};
  const employerIds = [...new Set((jobs??[]).map((j)=>j.employer_id))];
  const { data: employers } = employerIds.length ? await supabase.from("employer_profiles").select("user_id,business_name").in("user_id",employerIds) : {data:[] as {user_id:string;business_name:string}[]};

  return (
    <div className="space-y-6">
      <header><span className="badge badge-outline border-[#E6CACA] bg-white text-[10px] font-bold text-[#A34E4E]">KHUSUS SUPER ADMIN</span><h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">FraudGuard & Laporan</h1><p className="mt-2 text-sm text-[#7F8C8D]">Tinjau laporan dugaan penipuan, catat hasil investigasi, dan tutup laporan setelah ditangani.</p></header>
      <div className="grid gap-3 sm:grid-cols-3">
        {[{label:"Semua laporan",value:rows.length},{label:"Belum ditangani",value:rows.filter((r)=>r.status==="open").length},{label:"Dalam investigasi",value:rows.filter((r)=>r.status==="investigating").length}].map((item)=><div key={item.label} className="rounded-2xl border border-[#E2E7E9] bg-white p-4"><p className="text-xs text-[#8A969D]">{item.label}</p><p className="mt-2 text-2xl font-extrabold">{item.value}</p></div>)}
      </div>
      {error && <div role="alert" className="alert alert-error rounded-xl text-xs">Laporan tidak dapat dimuat. Jalankan migrasi Admin/Super Admin.</div>}
      {rows.length ? <div className="space-y-4">{rows.map((report)=>{
        const job = (jobs??[]).find((j)=>j.id===report.target_id);
        const employer = (employers??[]).find((e)=>e.user_id===job?.employer_id);
        return <article key={report.id} className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`badge badge-sm ${report.status==="resolved"?"badge-success":report.status==="dismissed"?"badge-ghost":report.status==="investigating"?"badge-info":"badge-warning"}`}>{report.status==="open"?"Baru":report.status==="investigating"?"Investigasi":report.status==="resolved"?"Selesai":"Ditutup"}</span><span className="text-[10px] text-[#9AA5AB]">#{String(report.id).slice(0,8)}</span></div><h2 className="mt-2 text-base font-extrabold text-[#34495E]">{report.reason}</h2><p className="mt-1 text-xs text-[#667681]">{job?.title ?? "Lowongan tidak ditemukan"} · {employer?.business_name ?? "Usaha tidak diketahui"}</p><p className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#9AA5AB]"><span className="inline-flex items-center gap-1"><CalendarDays size={12}/>{dateLabel(report.created_at)}</span><span className="inline-flex items-center gap-1"><UserRound size={12}/>Pelapor: {report.reporter_id?.slice(0,8) ?? "Akun dihapus"}</span></p></div>
          </div>
          {report.description && <div className="mt-4 rounded-xl bg-[#F7F9FA] p-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9AA5AB]">Keterangan pelapor</p><p className="mt-2 whitespace-pre-line text-xs leading-6 text-[#53616D]">{report.description}</p></div>}
          <AdminFraudReview reportId={report.id} status={report.status} notes={report.admin_notes}/>
        </article>;
      })}</div> : <div className="rounded-2xl border border-dashed border-[#C9D3D8] bg-white px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FFF5E9] text-[#A16B2C]"><AlertTriangle size={25}/></span><h2 className="mt-4 text-base font-extrabold">Belum ada laporan fraud</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#8A969D]">Laporan dari pengguna akan masuk ke halaman ini. Super Admin dapat melakukan investigasi dan mencatat hasilnya.</p></div>}
    </div>
  );
}
