import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Activity, CalendarDays, ShieldCheck } from "lucide-react";

export const instant = false;
const actionLabels: Record<string,string> = {
  "employer.review_submitted": "Admin mengirim hasil pemeriksaan usaha",
  "employer.verification_decided": "Super Admin memutuskan verifikasi usaha",
  "job.moderation_decided": "Riwayat moderasi lowongan (alur lama)",
  "job.status_changed": "Pelaku usaha mengubah status lowongan",
  "job.fraud_review_cleared": "Super Admin menyatakan lowongan aman",
  "job.fraud_banned": "Super Admin memblokir lowongan karena fraud",
  "fraud_report.updated": "Super Admin memperbarui laporan fraud",
  "admin.account_created": "Super Admin membuat akun Admin",
};
function dateLabel(value:string) { return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value)); }

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
  if (roleRow?.role !== "super_admin" && roleRow?.role !== "fraud_admin") redirect("/admin");
  const { data: logs, error } = await supabase.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(150);
  const rows = logs ?? [];
  const actorIds = [...new Set(rows.map((row)=>row.actor_id).filter(Boolean))] as string[];
  const { data: profiles } = actorIds.length ? await supabase.from("profiles").select("id,full_name").in("id",actorIds) : {data:[] as {id:string;full_name:string|null}[]};

  return <div className="space-y-6">
    <header><span className="badge badge-outline border-[#BDC3C7] bg-white text-[10px] font-bold text-[#53616D]">KHUSUS SUPER ADMIN</span><h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Audit Aktivitas</h1><p className="mt-2 text-sm text-[#7F8C8D]">Riwayat keputusan verifikasi usaha, pemeriksaan FraudGuard, pemblokiran lowongan, dan pengelolaan akun Admin.</p></header>
    {error && <div role="alert" className="alert alert-error rounded-xl text-xs">Audit log belum dapat dimuat. Pastikan migrasi 0005 sudah dijalankan.</div>}
    <div className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#EEF1F2] px-5 py-4"><Activity size={17} className="text-[#53616D]"/><h2 className="text-sm font-extrabold">Aktivitas terbaru</h2><span className="badge badge-ghost badge-sm ml-auto">{rows.length} catatan</span></div>
      {rows.length ? <div className="divide-y divide-[#EEF1F2]">{rows.map((row)=>{const actor=profiles?.find((p)=>p.id===row.actor_id);return <article key={row.id} className="flex gap-3 px-5 py-4 sm:px-6"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#53616D]"><ShieldCheck size={16}/></span><div className="min-w-0 flex-1"><p className="text-xs font-extrabold text-[#34495E]">{actionLabels[row.action]??row.action}</p><p className="mt-1 text-[11px] text-[#8A969D]">{actor?.full_name ?? "Administrator"} · {row.entity_type} · ID {row.entity_id ?? "—"}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[#A0AAB0]"><CalendarDays size={11}/>{dateLabel(row.created_at)}</p>{row.details && <pre className="mt-2 overflow-x-auto rounded-lg bg-[#F7F9FA] p-2 text-[10px] text-[#667681]">{JSON.stringify(row.details,null,2)}</pre>}</div></article>;})}</div> : <div className="px-6 py-14 text-center"><Activity size={24} className="mx-auto text-[#9AA5AB]"/><p className="mt-3 text-sm font-bold text-[#53616D]">Belum ada aktivitas tercatat.</p><p className="mt-1 text-xs text-[#9AA5AB]">Setiap tindakan administratif akan muncul di sini.</p></div>}
    </div>
  </div>;
}
