import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin-shell";

export const instant = false;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/admin-login");

  const { data: roleRow, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !roleRow) redirect("/auth/admin-login");

  const role = roleRow.role === "fraud_admin" ? "super_admin" : roleRow.role;
  if (role !== "admin" && role !== "super_admin") {
    if (role === "employer") redirect("/dashboard/pelaku-usaha");
    if (role === "job_seeker") redirect("/dashboard/pencari-kerja");
    redirect("/auth/admin-login");
  }

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  return (
    <AdminShell
      role={role}
      email={user.email ?? ""}
      fullName={profile?.full_name ?? user.user_metadata?.full_name ?? null}
    >
      {children}
    </AdminShell>
  );
}
