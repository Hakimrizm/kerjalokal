"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
	ArrowUpRight,
	BriefcaseBusiness,
	Building2,
	ChevronRight,
	LoaderCircle,
	LogOut,
	Menu,
	ShieldAlert,
	UserRound,
	X,
} from "lucide-react";

type NavItem = {
	href: string;
	label: string;
	icon: typeof Building2;
};

export function EmployerShell({
	children,
	businessName,
	initials,
	email,
	logoUrl,
	verificationStatus,
}: {
	children: React.ReactNode;
	businessName: string;
	initials: string;
	email: string;
	logoUrl?: string | null;
	verificationStatus: "pending" | "verified" | "rejected";
}) {
	const pathname = usePathname();
	const router = useRouter();
	const [hasMounted, setHasMounted] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [signingOut, setSigningOut] = useState(false);

	// usePathname can differ between the server render and the browser
	// when the route is affected by rewrites. Keep the first render identical.
	useEffect(() => {
		setHasMounted(true);
	}, []);

	const currentPathname = hasMounted ? pathname : "";

	const items: NavItem[] = [
		{ href: "/dashboard/pelaku-usaha", label: "Ringkasan", icon: Building2 },
		{
			href: "/dashboard/pelaku-usaha/profil",
			label: "Profil Usaha",
			icon: UserRound,
		},
		{
			href: "/dashboard/pelaku-usaha/lowongan",
			label: "Kelola Lowongan",
			icon: BriefcaseBusiness,
		},
		{ href: "/lowongan", label: "Lihat Halaman Publik", icon: ArrowUpRight },
	];

	function navLinks(mobile = false) {
		return items.map((item) => {
			const active =
				item.href === "/dashboard/pelaku-usaha"
					? currentPathname === "/dashboard/pelaku-usaha"
					: currentPathname.startsWith(item.href);
			const Icon = item.icon;
			return (
				<Link
					key={item.href}
					href={item.href}
					onClick={() => setMobileOpen(false)}
					className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
						active
							? "bg-[#2C3E50] text-white"
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
								Area pelaku usaha
							</span>
						</span>
					</Link>
					<p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9AA5AB]">
						Menu usaha
					</p>
					<nav className="space-y-1">{navLinks()}</nav>
					<div className="mt-auto space-y-3">
						<div className="rounded-2xl bg-[#ECF0F1] p-4">
							<div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#34495E]">
								<ShieldAlert size={15} /> Verifikasi usaha
							</div>
							<p className="text-[11px] leading-5 text-[#7F8C8D]">
								{verificationStatus === "verified"
									? "Usaha telah terverifikasi."
									: "Profil usaha sedang diperiksa Admin. Persetujuan akhir diberikan oleh Super Admin."}
							</p>
						</div>
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
					<header className="sticky top-0 z-30 border-b border-[#DCE2E5] bg-white/90 backdrop-blur-xl">
						<div className="flex min-h-[72px] items-center justify-between gap-3 px-4 sm:px-7 lg:px-9">
							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={() => setMobileOpen((value) => !value)}
									className="btn btn-ghost btn-square btn-sm rounded-xl lg:hidden"
									aria-label={
										mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"
									}
									aria-expanded={mobileOpen}
									aria-controls="employer-mobile-navigation"
								>
									{mobileOpen ? <X size={20} /> : <Menu size={20} />}
								</button>
								<div className="flex items-center gap-2 lg:hidden">
									<span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2C3E50] text-white">
										<BriefcaseBusiness size={19} />
									</span>
									<span className="text-lg font-extrabold tracking-tight">
										kerja<span className="text-[#7F8C8D]">lokal</span>
									</span>
								</div>
								<div className="hidden lg:block">
									<p className="text-xs font-semibold text-[#8A969D]">
										AREA PELAKU USAHA
									</p>
									<p className="mt-0.5 text-sm font-bold text-[#34495E]">
										{currentPathname === "/dashboard/pelaku-usaha"
											? "Ringkasan usaha"
											: items.find(
													(item) =>
														currentPathname.startsWith(item.href) &&
														item.href !== "/dashboard/pelaku-usaha",
												)?.label || "Administrasi"}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="hidden text-right sm:block">
									<p className="max-w-[180px] truncate text-xs font-extrabold text-[#34495E]">
										{businessName}
									</p>
									<p className="text-[10px] text-[#8A969D]">{email}</p>
								</div>
								{logoUrl ? (
									<img
										src={logoUrl}
										alt={`Logo ${businessName}`}
										className="h-9 w-9 rounded-xl border border-[#DCE2E5] object-cover"
									/>
								) : (
									<span className="grid h-9 w-9 place-items-center rounded-xl bg-[#DCE4E8] text-xs font-extrabold text-[#34495E]">
										{initials}
									</span>
								)}
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
						{mobileOpen && (
							<div
								id="employer-mobile-navigation"
								className="border-t border-[#EEF1F2] bg-white px-4 py-3 shadow-lg lg:hidden"
							>
								<p className="mb-2 px-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9AA5AB]">
									Menu pelaku usaha
								</p>
								<nav aria-label="Navigasi pelaku usaha" className="space-y-1">
									{navLinks(true)}
								</nav>
							</div>
						)}
					</header>

					<main className="mx-auto w-full max-w-[1250px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
						{children}
					</main>

					<footer className="mx-auto flex max-w-[1250px] flex-col items-center justify-between gap-2 border-t border-[#DCE2E5] px-4 py-5 text-[10px] text-[#9AA5AB] sm:flex-row sm:px-7 lg:px-9">
						<span>© {new Date().getFullYear()} KerjaLokal</span>
						<span>Kelola rekrutmen usaha dengan lebih terstruktur.</span>
					</footer>
				</div>
			</div>
		</div>
	);
}
