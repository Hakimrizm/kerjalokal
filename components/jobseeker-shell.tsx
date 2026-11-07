"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
	ArrowRight,
	BriefcaseBusiness,
	ChevronRight,
	FileUser,
	LayoutDashboard,
	LoaderCircle,
	LogOut,
	Menu,
	Search,
	Sparkles,
	UserRound,
	X,
} from "lucide-react";

type NavItem = {
	href: string;
	label: string;
	icon: typeof LayoutDashboard;
};

export function JobSeekerShell({
	children,
	name,
	initials,
	email,
	photoUrl,
}: {
	children: React.ReactNode;
	name: string;
	initials: string;
	email: string;
	photoUrl?: string | null;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [signingOut, setSigningOut] = useState(false);

	const items: NavItem[] = [
		{
			href: "/dashboard/pencari-kerja",
			label: "Dashboard",
			icon: LayoutDashboard,
		},
		{
			href: "/dashboard/pencari-kerja/profil",
			label: "Profil Saya",
			icon: UserRound,
		},
		{
			href: "/dashboard/pencari-kerja/lamaran",
			label: "Lamaran Saya",
			icon: BriefcaseBusiness,
		},
		{ href: "/dashboard/pencari-kerja/cv", label: "CV Saya", icon: FileUser },
		{ href: "/lowongan", label: "Cari Lowongan", icon: Search },
	];

	function navLinks(mobile = false) {
		return items.map((item) => {
			const active =
				item.href === "/dashboard/pencari-kerja"
					? pathname === "/dashboard/pencari-kerja"
					: pathname.startsWith(item.href);
			const Icon = item.icon;
			return (
				<Link
					key={item.href}
					href={item.href}
					onClick={() => setMobileOpen(false)}
					className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
						active
							? "bg-[#2C3E50] text-white shadow-md shadow-[#2C3E50]/10"
							: "text-[#667681] hover:bg-[#ECF0F1] hover:text-[#2C3E50]"
					} ${mobile ? "w-full justify-start whitespace-nowrap" : ""}`}
				>
					<Icon
						size={18}
						className={
							active
								? "text-white"
								: "text-[#8A969D] group-hover:text-[#34495E]"
						}
					/>
					<span className="flex-1">{item.label}</span>
					{active && <ChevronRight size={15} className="opacity-70" />}
				</Link>
			);
		});
	}

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

	return (
		<div className="min-h-screen bg-[#F3F5F6] text-[#2C3E50]">
			<div className="mx-auto flex min-h-screen max-w-[1600px]">
				{/* Desktop sidebar */}
				<aside className="sticky top-0 hidden h-screen w-[258px] shrink-0 flex-col border-r border-[#DCE2E5] bg-white px-5 py-7 lg:flex">
					<Link href="/" className="mb-10 flex items-center gap-3 px-2">
						<span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#2C3E50] text-white">
							<BriefcaseBusiness size={21} />
						</span>
						<span>
							<span className="block text-[19px] font-extrabold leading-none tracking-tight">
								kerja<span className="text-[#7F8C8D]">lokal</span>
							</span>
							<span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A969D]">
								Peluang dekat, masa depan hebat
							</span>
						</span>
					</Link>

					<p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9AA5AB]">
						Menu utama
					</p>
					<nav className="space-y-1">{navLinks()}</nav>

					<div className="mt-auto space-y-3">
						{/* <div className="rounded-2xl bg-[#ECF0F1] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#34495E]">
                <Sparkles size={15} />
                Profil pencari kerja
              </div>
              <p className="text-[11px] leading-5 text-[#7F8C8D]">
                Perbarui informasi agar peluang yang kamu temukan semakin relevan.
              </p>
              <Link
                href="/dashboard/pencari-kerja/profil"
                className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-[#2C3E50] hover:underline"
              >
                Kelola profil <ArrowRight size={13} />
              </Link>
            </div> */}
						<button
							type="button"
							onClick={() => void handleSignOut()}
							disabled={signingOut}
							className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[#8A969D] transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
						>
							{signingOut ? (
								<LoaderCircle
									size={16}
									className="animate-spin text-rose-500"
								/>
							) : (
								<LogOut size={16} />
							)}
							<span>
								{signingOut ? "Sedang keluar..." : "Keluar dari akun"}
							</span>
						</button>
					</div>
				</aside>

				<div className="min-w-0 flex-1">
					{/* Top bar */}
					<header className="sticky top-0 z-30 border-b border-[#DCE2E5] bg-white/90 backdrop-blur-xl">
						<div className="flex min-h-[72px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-9">
							<div className="flex items-center gap-3 lg:hidden">
								<button
									type="button"
									onClick={() => setMobileOpen((value) => !value)}
									className="btn btn-ghost btn-square btn-sm rounded-xl"
									aria-label={
										mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"
									}
									aria-expanded={mobileOpen}
									aria-controls="jobseeker-mobile-navigation"
								>
									{mobileOpen ? <X size={20} /> : <Menu size={20} />}
								</button>
								<span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2C3E50] text-white">
									<BriefcaseBusiness size={19} />
								</span>
								<span className="text-lg font-extrabold tracking-tight">
									kerja<span className="text-[#7F8C8D]">lokal</span>
								</span>
							</div>
							<div className="hidden lg:block">
								<p className="text-xs font-semibold text-[#8A969D]">
									AREA PENCARI KERJA
								</p>
								<p className="mt-0.5 text-sm font-bold text-[#34495E]">
									{pathname === "/dashboard/pencari-kerja"
										? "Dashboard"
										: items.find(
												(item) =>
													pathname.startsWith(item.href) &&
													item.href !== "/dashboard/pencari-kerja",
											)?.label || "Profil"}
								</p>
							</div>
							<div className="flex items-center gap-2 sm:gap-4">
								{/* <Link
									href="/dashboard/pencari-kerja/profil"
									className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-[#53616D] transition hover:bg-[#ECF0F1] sm:flex"
								>
									<UserRound size={16} />
									Profil Saya
								</Link> */}
								<div className="hidden h-8 w-px bg-[#E3E8EA] sm:block" />
								<div className="flex items-center gap-2.5">
									{photoUrl ? (
										<img
											src={photoUrl}
											alt={`Foto profil ${name}`}
											className="h-9 w-9 rounded-full border border-[#DCE2E5] object-cover"
										/>
									) : (
										<span className="grid h-9 w-9 place-items-center rounded-full bg-[#DCE4E8] text-xs font-extrabold text-[#34495E]">
											{initials || "PK"}
										</span>
									)}
									<div className="hidden min-w-0 sm:block">
										<p className="max-w-[150px] truncate text-xs font-extrabold text-[#34495E]">
											{name}
										</p>
										<p className="text-[10px] text-[#8A969D]">Pencari Kerja</p>
									</div>
								</div>
								<button
									type="button"
									onClick={() => void handleSignOut()}
									disabled={signingOut}
									className="btn btn-ghost btn-sm btn-square rounded-xl text-[#7F8C8D] hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
									aria-label="Keluar"
									title="Keluar"
								>
									{signingOut ? (
										<LoaderCircle
											size={17}
											className="animate-spin text-rose-500"
										/>
									) : (
										<LogOut size={17} />
									)}
								</button>
							</div>
						</div>
						{/* Mobile dropdown navigation */}
						{mobileOpen && (
							<div
								id="jobseeker-mobile-navigation"
								className="border-t border-[#EEF1F2] bg-white px-4 py-3 shadow-lg lg:hidden"
							>
								<p className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9AA5AB]">
									Menu pencari kerja
								</p>
								<nav aria-label="Navigasi pencari kerja" className="space-y-1">
									{navLinks(true)}
								</nav>
							</div>
						)}
					</header>

					<main className="mx-auto w-full max-w-[1250px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
						{children}
					</main>

					<footer className="mx-auto flex max-w-[1250px] flex-col items-center justify-between gap-2 border-t border-[#DCE2E5] px-4 py-5 text-[10px] text-[#9AA5AB] sm:flex-row sm:px-7 lg:px-9">
						<span>
							© {new Date().getFullYear()} KerjaLokal. Peluang dekat, masa depan
							hebat.
						</span>
						<span className="inline-flex items-center gap-1.5">
							Profil dapat diperbarui kapan saja
						</span>
					</footer>
				</div>
			</div>
		</div>
	);
}
