"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Activity, BadgeCheck, BriefcaseBusiness, Building2, ChevronRight,
  ClipboardCheck, FileWarning, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, X
} from "lucide-react";

type AdminRole = "admin" | "super_admin";
type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; superOnly?: boolean };

export function AdminShell({
  children,
  role,
  email,
  fullName,
}: {
  children: React.ReactNode;
  role: AdminRole;
  email: string;
  fullName?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const isSuper = role === "super_admin";

  const items: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/verifikasi-usaha", label: "Verifikasi Usaha", icon: Building2 },
    { href: "/admin/lowongan", label: "Moderasi Lowongan", icon: BriefcaseBusiness },
    { href: "/admin/fraud", label: "FraudGuard & Laporan", icon: FileWarning, superOnly: true },
    { href: "/admin/kelola-admin", label: "Kelola Admin", icon: Users, superOnly: true },
    { href: "/admin/audit", label: "Audit Aktivitas", icon: Activity, superOnly: true },
  ];
  const visibleItems = items.filter((item) => !item.superOnly || isSuper);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setSigningOut(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  function navLinks(mobile = false) {
    return visibleItems.map((item) => {
      const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
      const Icon = item.icon;
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
            active
              ? "bg-[#2C3E50] text-white shadow-md shadow-[#2C3E50]/10"
              : "text-[#64727D] hover:bg-[#ECF0F1] hover:text-[#2C3E50]"
          } ${mobile ? "whitespace-nowrap" : ""}`}
        >
          <Icon size={18} className={active ? "text-white" : "text-[#82909A] group-hover:text-[#34495E]"} />
          <span className="flex-1">{item.label}</span>
          {active && <ChevronRight size={15} className="opacity-70" />}
        </Link>
      );
    });
  }

  return (
    <div className="min-h-screen bg-[#F3F5F6] text-[#2C3E50]">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 flex-col border-r border-[#E1E6E8] bg-white px-5 py-6 lg:flex">
          <Link href="/admin" className="mb-9 flex items-center gap-3 px-2">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#2C3E50] text-white"><BriefcaseBusiness size={21}/></span>
            <span>
              <span className="block text-[19px] font-extrabold leading-none tracking-tight">kerja<span className="text-[#7F8C8D]">lokal</span></span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-[#9AA5AB]">Control Center</span>
            </span>
          </Link>

          <div className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#A0AAB0]">Menu utama</div>
          <nav className="space-y-1">{navLinks()}</nav>

          <div className="mt-auto">
            <div className="mb-4 rounded-2xl bg-[#ECF0F1] p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#34495E]">
                {isSuper ? <ShieldCheck size={16}/> : <ClipboardCheck size={16}/>}
                {isSuper ? "Akses Super Admin" : "Akses Admin"}
              </div>
              <p className="mt-2 text-[10px] leading-5 text-[#7F8C8D]">
                {isSuper
                  ? "Kamu memiliki wewenang keputusan akhir, pengelolaan admin, FraudGuard, dan audit."
                  : "Periksa data usaha dan berikan rekomendasi. Persetujuan akhir hanya dilakukan Super Admin."}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-[#E7EBED] p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#34495E] text-white">
                {isSuper ? <ShieldCheck size={17}/> : <Users size={17}/>}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold">{fullName || (isSuper ? "Super Admin" : "Admin")}</span>
                <span className="mt-0.5 block truncate text-[10px] text-[#8A969D]">{email}</span>
              </span>
            </div>
            <button onClick={() => void handleSignOut()} disabled={signingOut} className="mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-[#7F8C8D] transition hover:bg-[#FCEEEE] hover:text-[#A34E4E] disabled:opacity-50">
              <LogOut size={16}/> {signingOut ? "Keluar..." : "Keluar dari akun"}
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[#E1E6E8] bg-white/95 backdrop-blur-xl">
            <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setMobileOpen((value) => !value)} className="btn btn-ghost btn-square btn-sm rounded-xl lg:hidden" aria-label="Buka menu">
                  {mobileOpen ? <X size={20}/> : <Menu size={20}/>}
                </button>
                <div className="lg:hidden">
                  <p className="text-base font-extrabold tracking-tight">kerja<span className="text-[#7F8C8D]">lokal</span></p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#9AA5AB]">Admin Control Center</p>
                </div>
                <div className="hidden lg:block">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9AA5AB]">Control Center</p>
                  <p className="mt-0.5 text-sm font-extrabold">{pathname === "/admin" ? "Dashboard" : visibleItems.find((item) => pathname.startsWith(item.href) && item.href !== "/admin")?.label || "Administrasi"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden rounded-full border border-[#E2E7E9] bg-[#F8FAFA] px-3 py-1.5 text-[10px] font-bold text-[#667681] sm:inline-flex">
                  {isSuper ? "SUPER ADMIN" : "ADMIN"}
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]">
                  {isSuper ? <ShieldCheck size={17}/> : <Users size={17}/>}
                </span>
                <button onClick={() => void handleSignOut()} disabled={signingOut} className="btn btn-ghost btn-sm btn-square rounded-xl text-[#7F8C8D] lg:hidden" aria-label="Keluar">
                  <LogOut size={17}/>
                </button>
              </div>
            </div>
            {mobileOpen && <div className="border-t border-[#EEF1F2] bg-white px-3 py-3 lg:hidden"><nav className="grid grid-cols-2 gap-2">{navLinks(true)}</nav></div>}
          </header>
          <main className="mx-auto w-full max-w-[1450px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
            {children}
          </main>
          <footer className="mx-auto flex max-w-[1450px] flex-col gap-1 border-t border-[#E1E6E8] px-4 py-5 text-[10px] text-[#A0AAB0] sm:flex-row sm:justify-between sm:px-6 lg:px-8">
            <span>© {new Date().getFullYear()} KerjaLokal · Admin Control Center</span>
            <span>Kelola platform dengan aman dan bertanggung jawab.</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
