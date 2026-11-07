import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminUsersManager } from "@/components/admin-users-manager";
import { ShieldCheck } from "lucide-react";

export const instant = false;

export default async function ManageAdminsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
  if (roleRow?.role !== "super_admin" && roleRow?.role !== "fraud_admin") redirect("/admin");

  return <div className="space-y-6">
    <header><span className="badge badge-outline border-[#BDC3C7] bg-white text-[10px] font-bold text-[#53616D]">AKSES KHUSUS SUPER ADMIN</span><h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Kelola Admin</h1><p className="mt-2 text-sm text-[#7F8C8D]">Buat akun administrator operasional dan pantau akun yang sudah terdaftar.</p></header>
    <div className="flex items-start gap-3 rounded-2xl border border-[#DCE3E6] bg-white p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]"><ShieldCheck size={17}/></span><p className="text-xs leading-6 text-[#667681]">Akun Admin dibuat melalui server dengan hak akses terbatas. Pembuatan akun otomatis mengonfirmasi email dan menetapkan role <b>admin</b>. Jangan pernah membagikan service role key Supabase kepada browser atau pengguna.</p></div>
    <AdminUsersManager/>
  </div>;
}
