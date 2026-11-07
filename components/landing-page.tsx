"use client";

import Link from "next/link";
import {
	useEffect,
	useMemo,
	useState,
	type CSSProperties,
	type FormEvent,
} from "react";
import {
	ArrowRight,
	ArrowUpRight,
	BadgeCheck,
	BriefcaseBusiness,
	Building2,
	CheckCircle2,
	ChevronRight,
	Clock3,
	FileText,
	MapPin,
	Menu,
	Search,
	ShieldCheck,
	Sparkles,
	Target,
	Users,
	Wallet,
	X,
} from "lucide-react";

export type LandingJob = {
	id: string;
	title: string;
	company: string;
	district: string;
	location: string;
	salary: string;
	category: string;
	type: string;
	initials: string;
};

const navItems = [
	{ label: "Cari Lowongan", href: "#lowongan" },
	{ label: "Keunggulan", href: "#fitur" },
	{ label: "Cara Kerja", href: "#cara-kerja" },
	{ label: "Tentang", href: "#tentang" },
];

const features = [
	{
		icon: FileText,
		number: "01",
		title: "CV otomatis, tanpa ribet",
		description:
			"Isi profil, pendidikan, dan keahlianmu. KerjaLokal menyusunnya menjadi CV yang rapi dan siap digunakan.",
		tag: "CV Generator",
	},
	{
		icon: Target,
		number: "02",
		title: "Temukan pekerjaan yang cocok",
		description:
			"CareerMatch membantu membandingkan keahlian, pendidikan, pengalaman, dan lokasi dengan kebutuhan lowongan.",
		tag: "CareerMatch AI",
	},
	{
		icon: ShieldCheck,
		number: "03",
		title: "Lowongan lebih terarah",
		description:
			"Informasi usaha dan lowongan melewati proses pemeriksaan untuk membantu pengguna mengenali indikasi risiko.",
		tag: "Pemeriksaan lowongan",
	},
];

export function LandingPage({
	jobs,
	isAuthenticated,
}: {
	jobs: LandingJob[];
	isAuthenticated: boolean;
}) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [keyword, setKeyword] = useState("");
	const [district, setDistrict] = useState("all");
	const [appliedKeyword, setAppliedKeyword] = useState("");
	const [appliedDistrict, setAppliedDistrict] = useState("all");

	const filteredJobs = useMemo(() => {
		const normalizedKeyword = appliedKeyword.toLowerCase();

		return jobs.filter((job) => {
			const matchesKeyword =
				!normalizedKeyword ||
				`${job.title} ${job.company} ${job.category} ${job.location}`
					.toLowerCase()
					.includes(normalizedKeyword);
			const matchesDistrict =
				appliedDistrict === "all" || job.district === appliedDistrict;

			return matchesKeyword && matchesDistrict;
		});
	}, [jobs, appliedKeyword, appliedDistrict]);

	// Animasi elemen saat masuk ke viewport. Elemen hanya dianimasikan sekali.
	useEffect(() => {
		const elements = Array.from(
			document.querySelectorAll<HTMLElement>("[data-reveal]"),
		).filter((element) => element.dataset.revealed !== "true");

		if (elements.length === 0) return;

		const revealImmediately = () => {
			elements.forEach((element) => {
				element.dataset.revealed = "true";
			});
		};

		const prefersReducedMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		if (prefersReducedMotion || !("IntersectionObserver" in window)) {
			revealImmediately();
			return;
		}

		elements.forEach((element) => {
			const direction = element.dataset.reveal;
			element.classList.add(
				"opacity-0",
				"transition-all",
				"duration-700",
				"ease-out",
				"will-change-transform",
			);

			if (direction === "fade-left") {
				element.classList.add("translate-x-8");
			} else if (direction === "fade-right") {
				element.classList.add("-translate-x-8");
			} else if (direction === "zoom") {
				element.classList.add("scale-95");
			} else {
				element.classList.add("translate-y-8");
			}

			const delay = Number(element.dataset.revealDelay ?? 0);
			element.style.transitionDelay = `${Math.max(0, delay)}ms`;
		});

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;

					const element = entry.target as HTMLElement;
					element.classList.remove(
						"opacity-0",
						"translate-y-8",
						"translate-x-8",
						"-translate-x-8",
						"scale-95",
					);
					element.classList.add(
						"opacity-100",
						"translate-y-0",
						"translate-x-0",
						"scale-100",
					);
					element.dataset.revealed = "true";
					observer.unobserve(element);
				});
			},
			{
				threshold: 0.12,
				rootMargin: "0px 0px -48px 0px",
			},
		);

		elements.forEach((element) => observer.observe(element));

		return () => observer.disconnect();
	}, [filteredJobs]);

	function handleSearch(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setAppliedKeyword(keyword.trim());
		setAppliedDistrict(district);
		document.getElementById("lowongan")?.scrollIntoView({ behavior: "smooth" });
	}

	function resetSearch() {
		setKeyword("");
		setDistrict("all");
		setAppliedKeyword("");
		setAppliedDistrict("all");
	}

	function closeMobileMenu() {
		setMobileMenuOpen(false);
	}

	return (
		<main
			data-theme="kerjalokal"
			className="min-h-screen overflow-x-hidden bg-base-100 pt-[76px] text-base-content"
		>
			<header className="fixed inset-x-0 top-0 z-50 border-b border-[#2C3E50]/10 bg-[#ECF0F1]/95 backdrop-blur-xl">
				<div className="mx-auto grid min-h-[76px] w-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:px-8 xl:grid-cols-[auto_minmax(0,1fr)_auto]">
					{/* LOGO */}
					<div className="min-w-0">
						<Link
							href="#beranda"
							onClick={closeMobileMenu}
							aria-label="KerjaLokal Beranda"
							className="flex w-fit max-w-full items-center gap-3"
						>
							<span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#2C3E50] text-white shadow-lg shadow-[#2C3E50]/15">
								<BriefcaseBusiness size={22} strokeWidth={2.2} />
							</span>

							<span className="flex min-w-0 flex-col leading-none">
								<span className="whitespace-nowrap text-[19px] font-extrabold tracking-tight text-[#2C3E50]">
									kerja<span className="text-[#7F8C8D]">lokal</span>
								</span>

								<span className="mt-1 hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7F8C8D] sm:block">
									Peluang dekat, masa depan hebat
								</span>
							</span>
						</Link>
					</div>

					{/* DESKTOP NAVIGATION */}
					<nav
						className="hidden min-w-0 items-center justify-center xl:flex"
						aria-label="Navigasi utama"
					>
						<ul className="menu menu-horizontal flex-nowrap items-center gap-1 whitespace-nowrap p-0 text-[13px] font-semibold text-[#34495E]">
							{navItems.map((item) => (
								<li key={item.href} className="shrink-0">
									<Link
										href={item.href}
										onClick={closeMobileMenu}
										className="rounded-full px-3 py-2.5 transition-all duration-200 hover:bg-white hover:text-[#2C3E50]"
									>
										{item.label}
									</Link>
								</li>
							))}
						</ul>
					</nav>

					{/* DESKTOP ACTION + MOBILE TOGGLE */}
					<div className="flex items-center justify-end gap-2">
						{/* Desktop account actions */}
						<div className="hidden items-center gap-2 xl:flex">
							{isAuthenticated ? (
								<Link
									href="/dashboard"
									className="btn btn-primary rounded-full border-0 px-6 text-sm font-semibold text-white shadow-md shadow-[#2C3E50]/15 transition-all hover:-translate-y-0.5 hover:bg-[#34495E]"
								>
									Dashboard <ArrowRight size={16} />
								</Link>
							) : (
								<>
									<Link
										href="/auth/login"
										className="btn btn-ghost rounded-full px-5 text-sm font-bold text-[#34495E] hover:bg-white"
									>
										Sign in
									</Link>
									<Link
										href="/auth/sign-up"
										className="btn btn-primary rounded-full border-0 bg-[#2C3E50] px-6 text-sm font-semibold text-white shadow-md shadow-[#2C3E50]/15 transition-all hover:-translate-y-0.5 hover:bg-[#34495E]"
									>
										Sign up <ArrowRight size={16} />
									</Link>
								</>
							)}
						</div>

						{/* Mobile hamburger */}
						<button
							type="button"
							className="btn btn-square btn-ghost btn-sm h-11 w-11 text-[#2C3E50] hover:bg-white xl:hidden"
							aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
							aria-expanded={mobileMenuOpen}
							aria-controls="mobile-navigation"
							onClick={() => setMobileMenuOpen((open) => !open)}
						>
							{mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
						</button>
					</div>
				</div>

				{/* MOBILE / TABLET NAVIGATION */}
				{mobileMenuOpen && (
					<div
						id="mobile-navigation"
						className="border-t border-[#2C3E50]/10 bg-[#ECF0F1] shadow-lg xl:hidden"
					>
						<div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
							<nav aria-label="Navigasi mobile">
								<ul className="menu menu-vertical w-full gap-1 p-0 text-sm font-semibold text-[#34495E]">
									{navItems.map((item) => (
										<li key={item.href}>
											<Link
												href={item.href}
												onClick={closeMobileMenu}
												className="rounded-xl px-4 py-3 transition-colors hover:bg-white hover:text-[#2C3E50]"
											>
												{item.label}
											</Link>
										</li>
									))}
								</ul>
							</nav>

							<div className="mt-4 flex gap-2 border-t border-[#2C3E50]/10 pt-4">
								{isAuthenticated ? (
									<Link
										href="/dashboard"
										onClick={closeMobileMenu}
										className="btn btn-primary min-h-11 w-full rounded-full border-0 bg-[#2C3E50] text-sm font-semibold text-white hover:bg-[#34495E]"
									>
										Dashboard <ArrowRight size={15} />
									</Link>
								) : (
									<>
										<Link
											href="/auth/login"
											onClick={closeMobileMenu}
											className="btn btn-ghost min-h-11 flex-1 rounded-full text-sm font-bold text-[#34495E] hover:bg-white"
										>
											Sign in
										</Link>
										<Link
											href="/auth/sign-up"
											onClick={closeMobileMenu}
											className="btn btn-primary min-h-11 flex-1 rounded-full border-0 bg-[#2C3E50] text-sm font-semibold text-white hover:bg-[#34495E]"
										>
											Sign up <ArrowRight size={15} />
										</Link>
									</>
								)}
							</div>

							<p className="mt-4 text-center text-[10px] font-medium tracking-wide text-[#7F8C8D]">
								KerjaLokal — Peluang dekat, masa depan hebat.
							</p>
						</div>
					</div>
				)}
			</header>

			<section
				id="beranda"
				className="relative isolate scroll-mt-[76px] overflow-hidden bg-primary text-primary-content"
			>
				<div className="pointer-events-none absolute -right-40 -top-48 h-[34rem] w-[34rem] rounded-full border border-white/10" />
				<div className="pointer-events-none absolute -right-20 -top-28 h-[25rem] w-[25rem] rounded-full border border-white/10" />
				<div className="pointer-events-none absolute -bottom-64 left-[38%] h-[34rem] w-[34rem] rounded-full bg-white/[0.035] blur-2xl" />
				<div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-gradient-to-l from-[#34495E]/70 to-transparent lg:block" />

				<div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-16 sm:px-6 sm:pb-28 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8 lg:py-24">
					<div className="relative z-10 max-w-2xl" data-reveal="fade-up">
						<div className="badge badge-outline mb-7 gap-2 border-white/25 bg-white/[0.07] px-4 py-3 text-[11px] font-semibold tracking-wide text-white">
							<span className="h-2 w-2 rounded-full bg-[#BDC3C7]" />
							PELUANG KERJA DARI LINGKUNGAN TERDEKAT
						</div>

						<h1 className="max-w-2xl text-[2.7rem] font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-6xl lg:text-[4.15rem]">
							Kerja lebih dekat.
							<span className="mt-2 block text-[#BDC3C7]">
								Peluang lebih luas.
							</span>
						</h1>

						<p className="mt-7 max-w-xl text-base leading-8 text-white/75 sm:text-lg">
							Temukan pekerjaan di sekitar tempat tinggalmu. Buat CV dengan
							mudah, temukan lowongan yang sesuai, dan mulai langkah baru
							bersama KerjaLokal.
						</p>

						<div className="mt-9 flex flex-col gap-3 sm:flex-row">
							<Link
								href="#lowongan"
								className="btn h-[52px] min-h-[52px] rounded-full border-0 bg-[#ECF0F1] px-7 text-sm font-bold text-primary shadow-xl shadow-black/10 hover:bg-white"
							>
								Cari Lowongan <ArrowRight size={17} />
							</Link>
							<Link
								href={isAuthenticated ? "/dashboard" : "/auth/login"}
								className="btn btn-outline h-[52px] min-h-[52px] rounded-full border-white/35 px-7 text-sm font-bold text-white hover:border-white hover:bg-white/10 hover:text-white"
							>
								{isAuthenticated ? "Buka Dashboard" : "Sign in"}{" "}
								<ArrowRight size={17} />
							</Link>
						</div>

						<div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-white/15 pt-7">
							<div className="flex items-center gap-2.5">
								<span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[#BDC3C7]">
									<MapPin size={17} />
								</span>
								<span className="text-xs font-medium leading-5 text-white/75">
									Fokus pada peluang
									<strong className="block text-sm text-white">
										di sekitar kamu
									</strong>
								</span>
							</div>
							<div className="flex items-center gap-2.5">
								<span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[#BDC3C7]">
									<Sparkles size={17} />
								</span>
								<span className="text-xs font-medium leading-5 text-white/75">
									Didukung fitur
									<strong className="block text-sm text-white">
										AI yang membantu
									</strong>
								</span>
							</div>
						</div>
					</div>

					<div
						className="relative mx-auto w-full max-w-[510px] lg:mr-0"
						data-reveal="fade-left"
					>
						<div className="absolute -left-8 top-16 h-28 w-28 rounded-full bg-[#7F8C8D]/30 blur-3xl" />
						<div className="absolute -bottom-8 -right-5 h-36 w-36 rounded-full bg-[#BDC3C7]/20 blur-3xl" />

						<div className="relative rounded-[2rem] border border-white/15 bg-white/[0.09] p-3 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-4">
							<div className="card overflow-hidden rounded-[1.45rem] bg-base-100 text-base-content shadow-xl">
								<div className="flex items-center justify-between border-b border-base-200 px-5 py-4 sm:px-6">
									<div className="flex items-center gap-2.5">
										<span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-content">
											<Sparkles size={17} />
										</span>
										<div>
											<p className="text-sm font-extrabold text-primary">
												CareerMatch AI
											</p>
											<p className="text-[10px] font-medium text-[#7F8C8D]">
												Pratinjau kecocokan kandidat
											</p>
										</div>
									</div>
									<span className="badge badge-success badge-outline gap-1 border-[#7F8C8D]/40 px-2.5 text-[10px] text-[#536C62]">
										<span className="h-1.5 w-1.5 rounded-full bg-[#7F8C8D]" />
										Contoh
									</span>
								</div>

								<div className="p-5 sm:p-6">
									<div className="flex items-start justify-between gap-4">
										<div>
											<p className="text-xs font-semibold text-[#7F8C8D]">
												REKOMENDASI PEKERJAAN
											</p>
											<h2 className="mt-2 text-xl font-extrabold tracking-tight text-primary sm:text-2xl">
												Staff Operasional
											</h2>
											<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7F8C8D]">
												<span className="inline-flex items-center gap-1">
													<Building2 size={13} /> Mitra Usaha Lokal
												</span>
												<span className="inline-flex items-center gap-1">
													<MapPin size={13} /> Rancasari
												</span>
											</div>
										</div>
										<div
											className="radial-progress shrink-0 bg-[#ECF0F1] text-primary"
											style={
												{
													"--value": 92,
													"--size": "5.1rem",
													"--thickness": "6px",
												} as CSSProperties
											}
											role="progressbar"
											aria-valuenow={92}
										>
											<span className="text-lg font-extrabold">92%</span>
										</div>
									</div>

									<div className="mt-6 rounded-2xl bg-[#ECF0F1] p-4">
										<div className="flex items-center justify-between gap-3">
											<p className="text-xs font-bold text-primary">
												Ringkasan kecocokan
											</p>
											<span className="text-[10px] font-semibold text-[#7F8C8D]">
												Ilustrasi
											</span>
										</div>
										<div className="mt-4 space-y-3">
											{[
												{ label: "Keahlian", value: 95 },
												{ label: "Pendidikan", value: 90 },
												{ label: "Lokasi", value: 92 },
											].map((item) => (
												<div key={item.label}>
													<div className="mb-1.5 flex justify-between text-[11px] font-semibold text-[#34495E]">
														<span>{item.label}</span>
														<span>{item.value}%</span>
													</div>
													<div className="h-1.5 overflow-hidden rounded-full bg-[#BDC3C7]/70">
														<div
															className="h-full rounded-full bg-primary"
															style={{ width: `${item.value}%` }}
														/>
													</div>
												</div>
											))}
										</div>
									</div>

									<div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#7F8C8D]/20 p-3.5">
										<span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#BDC3C7]/45 text-primary">
											<FileText size={19} />
										</span>
										<div className="min-w-0 flex-1">
											<p className="text-xs font-extrabold text-primary">
												CV kamu siap digunakan
											</p>
											<p className="mt-0.5 text-[10px] text-[#7F8C8D]">
												Dibuat dari data profil yang kamu isi
											</p>
										</div>
										<CheckCircle2
											className="shrink-0 text-[#7F8C8D]"
											size={19}
										/>
									</div>
								</div>
							</div>
						</div>

						<div className="absolute -bottom-6 -left-5 hidden items-center gap-3 rounded-2xl border border-white/70 bg-white px-4 py-3 text-primary shadow-xl shadow-black/10 sm:flex">
							<span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ECF0F1] text-primary">
								<BadgeCheck size={21} />
							</span>
							<span>
								<strong className="block text-xs">Lebih terarah</strong>
								<span className="text-[10px] text-[#7F8C8D]">
									Cari peluang di sekitarmu
								</span>
							</span>
						</div>
					</div>
				</div>
			</section>

			<section className="relative z-20 mx-auto -mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
				<div
					className="rounded-[1.5rem] border border-primary/10 bg-white p-4 shadow-[0_18px_55px_rgba(44,62,80,0.12)] sm:p-6 lg:p-7"
					data-reveal="fade-up"
				>
					<div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
						<div>
							<p className="text-[11px] font-extrabold uppercase tracking-[0.17em] text-[#7F8C8D]">
								Mulai pencarianmu
							</p>
							<h2 className="mt-1 text-xl font-extrabold tracking-tight text-primary sm:text-2xl">
								Pekerjaan yang dekat, peluang yang tepat.
							</h2>
						</div>
						<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7F8C8D]">
							<MapPin size={14} /> Fokus lowongan lokal
						</span>
					</div>

					<form
						onSubmit={handleSearch}
						className="grid gap-3 lg:grid-cols-[1.3fr_1fr_auto]"
					>
						<label className="form-control w-full">
							<span className="label pb-1.5 pt-0">
								<span className="label-text text-xs font-bold text-primary">
									Posisi atau kata kunci
								</span>
							</span>
							<div className="relative">
								<Search
									className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7F8C8D]"
									size={17}
								/>
								<input
									type="search"
									value={keyword}
									onChange={(event) => setKeyword(event.target.value)}
									placeholder="Contoh: kasir, admin, operator..."
									className="input input-bordered h-12 w-full rounded-xl border-[#BDC3C7]/80 bg-[#ECF0F1]/55 pl-11 text-sm text-primary placeholder:text-[#7F8C8D] focus:border-primary focus:outline-none"
								/>
							</div>
						</label>

						<label className="form-control w-full">
							<span className="label pb-1.5 pt-0">
								<span className="label-text text-xs font-bold text-primary">
									Wilayah pekerjaan
								</span>
							</span>
							<div className="relative">
								<MapPin
									className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#7F8C8D]"
									size={17}
								/>
								<select
									value={district}
									onChange={(event) => setDistrict(event.target.value)}
									className="select select-bordered h-12 min-h-12 w-full rounded-xl border-[#BDC3C7]/80 bg-[#ECF0F1]/55 pl-11 pr-9 text-sm text-primary focus:border-primary focus:outline-none"
								>
									<option value="all">Semua kecamatan</option>
									{Array.from(
										new Set(jobs.map((job) => job.district).filter(Boolean)),
									)
										.sort()
										.map((item) => (
											<option key={item} value={item}>
												{item}
											</option>
										))}
								</select>
							</div>
						</label>

						<div className="flex items-end">
							<button
								type="submit"
								className="btn btn-primary h-12 min-h-12 w-full rounded-xl px-7 text-sm font-bold shadow-md shadow-primary/15 lg:w-auto"
							>
								Cari Lowongan <ArrowRight size={16} />
							</button>
						</div>
					</form>
				</div>
			</section>

			<section id="fitur" className="scroll-mt-[76px] py-24 sm:py-28">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="mx-auto max-w-2xl text-center" data-reveal="fade-up">
						<span className="badge badge-outline border-primary/20 bg-white px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
							Kenapa KerjaLokal?
						</span>
						<h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-primary sm:text-4xl">
							Bukan sekadar mencari kerja.{" "}
							<span className="text-[#7F8C8D]">
								Mulai karier dengan lebih siap.
							</span>
						</h2>
						<p className="mt-4 text-sm leading-7 text-[#7F8C8D] sm:text-base">
							Fitur yang dirancang untuk membantu pencari kerja dan pelaku usaha
							lokal terhubung dengan lebih mudah.
						</p>
					</div>

					<div className="mt-14 grid gap-5 md:grid-cols-3">
						{features.map((feature, index) => {
							const Icon = feature.icon;
							return (
								<article
									key={feature.number}
									data-reveal="fade-up"
									data-reveal-delay={index * 120}
									className="card group border border-primary/10 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
								>
									<div className="card-body p-7 sm:p-8">
										<div className="flex items-center justify-between">
											<span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#ECF0F1] text-primary transition group-hover:bg-primary group-hover:text-primary-content">
												<Icon size={25} strokeWidth={1.8} />
											</span>
											<span className="text-xs font-extrabold tracking-[0.18em] text-[#BDC3C7]">
												{feature.number}
											</span>
										</div>
										<span className="badge badge-outline mt-7 w-fit border-[#7F8C8D]/30 text-[10px] font-bold text-[#7F8C8D]">
											{feature.tag}
										</span>
										<h3 className="mt-3 text-xl font-extrabold leading-snug text-primary">
											{feature.title}
										</h3>
										<p className="mt-2 text-sm leading-7 text-[#7F8C8D]">
											{feature.description}
										</p>
										<div className="mt-5 flex items-center gap-2 text-xs font-bold text-primary">
											Dirancang untuk membantu <ArrowRight size={14} />
										</div>
									</div>
								</article>
							);
						})}
					</div>
				</div>
			</section>

			<section
				id="lowongan"
				className="scroll-mt-[76px] bg-[#BDC3C7]/25 py-24 sm:py-28"
			>
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
						<div className="max-w-2xl" data-reveal="fade-up">
							<span className="badge badge-outline border-primary/20 bg-white px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
								Jelajahi peluang
							</span>
							<h2 className="mt-5 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
								Lowongan di sekitar kamu.
							</h2>
							<p className="mt-3 text-sm leading-7 text-[#7F8C8D] sm:text-base">
								Temukan beragam posisi dari usaha lokal dan pilih pekerjaan yang
								sesuai dengan kebutuhanmu.
							</p>
						</div>
						<span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/10 bg-white px-4 py-2.5 text-xs font-bold text-primary">
							<MapPin size={15} /> Wilayah lowongan aktif
						</span>
					</div>

					<div className="mt-9 flex flex-wrap items-center justify-between gap-3">
						<p className="text-xs font-semibold text-[#7F8C8D]">
							{appliedKeyword || appliedDistrict !== "all"
								? `${filteredJobs.length} lowongan ditemukan`
								: "Lowongan terbaru dari database"}
						</p>
						{(appliedKeyword || appliedDistrict !== "all") && (
							<button
								type="button"
								onClick={resetSearch}
								className="btn btn-ghost btn-xs rounded-full text-primary"
							>
								Reset pencarian <X size={13} />
							</button>
						)}
					</div>

					<div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
						{filteredJobs.map((job, index) => (
							<article
								key={job.id}
								data-reveal="fade-up"
								data-reveal-delay={(index % 4) * 90}
								className="card border border-primary/10 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
							>
								<div className="card-body gap-4 p-5">
									<div className="flex items-start justify-between gap-3">
										<span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ECF0F1] text-sm font-extrabold text-primary">
											{job.initials}
										</span>
										<span className="badge badge-outline border-[#7F8C8D]/30 text-[10px] font-bold text-[#7F8C8D]">
											Tayang
										</span>
									</div>
									<div>
										<span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#7F8C8D]">
											{job.category}
										</span>
										<h3 className="mt-1.5 min-h-[3.5rem] text-lg font-extrabold leading-snug text-primary">
											{job.title}
										</h3>
										<p className="mt-1 text-xs font-medium text-[#7F8C8D]">
											{job.company}
										</p>
									</div>
									<div className="space-y-2 border-y border-base-200 py-3 text-xs text-[#7F8C8D]">
										<p className="flex items-center gap-2">
											<MapPin size={14} className="shrink-0" />
											{job.location}
										</p>
										<p className="flex items-center gap-2">
											<Wallet size={14} className="shrink-0" />
											{job.salary}
										</p>
										<p className="flex items-center gap-2">
											<Clock3 size={14} className="shrink-0" />
											{job.type}
										</p>
									</div>
									<div className="card-actions items-center justify-end">
										<Link
											href={`/lowongan/${job.id}`}
											className="btn btn-ghost btn-sm rounded-full px-2 text-xs font-bold text-primary hover:bg-[#ECF0F1]"
										>
											Lihat detail <ChevronRight size={14} />
										</Link>
									</div>
								</div>
							</article>
						))}
					</div>

					{filteredJobs.length === 0 && (
						<div
							className="mt-5 rounded-3xl border border-dashed border-primary/20 bg-white px-6 py-14 text-center"
							data-reveal="zoom"
						>
							<Search className="mx-auto text-[#7F8C8D]" size={30} />
							<h3 className="mt-4 text-lg font-extrabold text-primary">
								{jobs.length === 0
									? "Belum ada lowongan yang tayang"
									: "Belum ada lowongan yang cocok"}
							</h3>
							<p className="mt-2 text-sm text-[#7F8C8D]">
								{jobs.length === 0
									? "Lowongan yang diterbitkan pelaku usaha akan muncul di sini."
									: "Coba kata kunci atau wilayah lainnya."}
							</p>
							<button
								type="button"
								onClick={resetSearch}
								className="btn btn-primary btn-sm mt-5 rounded-full px-5"
							>
								Reset pencarian
							</button>
						</div>
					)}
					<div className="mt-8 flex justify-center">
						<Link
							href="/lowongan"
							className="btn btn-outline btn-primary rounded-full border-primary px-6 text-xs font-bold hover:bg-primary hover:text-white"
						>
							Lihat lowongan aktif <ArrowRight size={15} />
						</Link>
					</div>
				</div>
			</section>

			<section id="cara-kerja" className="scroll-mt-[76px] py-24 sm:py-28">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div className="mx-auto max-w-2xl text-center" data-reveal="fade-up">
						<span className="badge badge-outline border-primary/20 bg-white px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
							Mulai dengan mudah
						</span>
						<h2 className="mt-5 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
							Tiga langkah menuju peluang baru.
						</h2>
						<p className="mt-4 text-sm leading-7 text-[#7F8C8D] sm:text-base">
							Proses yang sederhana agar kamu bisa fokus menemukan pekerjaan
							yang tepat.
						</p>
					</div>

					<div className="relative mt-14 grid gap-8 md:grid-cols-3 md:gap-5">
						<div className="absolute left-[17%] right-[17%] top-10 hidden border-t border-dashed border-[#BDC3C7] md:block" />
						{[
							{
								icon: Users,
								step: "01",
								title: "Buat akun & lengkapi profil",
								text: "Masukkan informasi diri, pendidikan, keterampilan, dan lokasi tempat tinggal.",
							},
							{
								icon: Sparkles,
								step: "02",
								title: "Temukan pekerjaan yang cocok",
								text: "Jelajahi lowongan lokal dan manfaatkan CareerMatch sebagai panduan awal.",
							},
							{
								icon: CheckCircle2,
								step: "03",
								title: "Kirim lamaran & pantau",
								text: "Gunakan CV otomatis, kirim lamaran, lalu pantau perkembangan seleksimu.",
							},
						].map((item, index) => {
							const Icon = item.icon;
							return (
								<article
									key={item.step}
									data-reveal="zoom"
									data-reveal-delay={index * 130}
									className="relative z-10 flex flex-col items-center px-4 text-center"
								>
									<div className="relative grid h-20 w-20 place-items-center rounded-[1.7rem] border border-primary/10 bg-white text-primary shadow-lg shadow-primary/5">
										<Icon size={29} strokeWidth={1.7} />
										<span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-primary text-[10px] font-extrabold text-white ring-4 ring-base-100">
											{item.step}
										</span>
									</div>
									<h3 className="mt-7 text-lg font-extrabold text-primary">
										{item.title}
									</h3>
									<p className="mt-3 max-w-xs text-sm leading-7 text-[#7F8C8D]">
										{item.text}
									</p>
								</article>
							);
						})}
					</div>
				</div>
			</section>

			<section id="tentang" className="scroll-mt-[76px] pb-24 sm:pb-28">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<div
						className="relative overflow-hidden rounded-[2rem] bg-secondary px-6 py-12 text-white shadow-2xl shadow-primary/10 sm:px-10 sm:py-14 lg:px-14"
						data-reveal="fade-up"
					>
						<div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border border-white/10" />
						<div className="pointer-events-none absolute -right-4 -top-16 h-56 w-56 rounded-full border border-white/10" />
						<div className="relative grid items-center gap-9 lg:grid-cols-[1fr_auto]">
							<div className="max-w-2xl">
								<span className="badge badge-outline border-white/25 bg-white/5 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.15em] text-white">
									Untuk pelaku usaha lokal
								</span>
								<h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
									Temukan talenta terbaik dari sekitar usahamu.
								</h2>
								<p className="mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
									Pasang informasi lowongan dan temukan kandidat lokal dengan
									proses rekrutmen yang lebih terstruktur.
								</p>
							</div>
							<div
								className="flex flex-col gap-3 sm:flex-row lg:flex-col"
								data-reveal="fade-left"
							>
								<Link
									href={
										isAuthenticated ? "/dashboard" : "/auth/sign-up/employer"
									}
									className="btn h-12 rounded-full border-0 bg-[#ECF0F1] px-7 font-bold text-primary hover:bg-white"
								>
									{isAuthenticated ? "Dashboard" : "Sign up"}{" "}
									<ArrowUpRight size={16} />
								</Link>
								<Link
									href="#cara-kerja"
									className="btn btn-outline h-12 rounded-full border-white/30 px-7 font-bold text-white hover:border-white hover:bg-white/10 hover:text-white"
								>
									Pelajari cara kerja <ArrowRight size={16} />
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>

			<footer className="bg-[#2C3E50] text-white">
				<div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
					<div className="grid gap-10 md:grid-cols-[1.4fr_0.7fr_0.7fr]">
						<div className="max-w-sm">
							<Link href="#beranda" className="inline-flex items-center gap-3">
								<span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-white">
									<BriefcaseBusiness size={21} />
								</span>
								<span className="text-xl font-extrabold tracking-tight">
									kerja<span className="text-[#BDC3C7]">lokal</span>
								</span>
							</Link>
							<p className="mt-5 text-sm leading-7 text-white/60">
								Menghubungkan pencari kerja dan pelaku usaha lokal untuk membuka
								lebih banyak peluang dari lingkungan terdekat.
							</p>
						</div>

						<div>
							<h3 className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#BDC3C7]">
								Jelajahi
							</h3>
							<ul className="mt-5 space-y-3 text-sm text-white/70">
								<li>
									<Link
										href="#lowongan"
										className="transition hover:text-white"
									>
										Cari Lowongan
									</Link>
								</li>
								<li>
									<Link href="#fitur" className="transition hover:text-white">
										Keunggulan
									</Link>
								</li>
								<li>
									<Link
										href="#cara-kerja"
										className="transition hover:text-white"
									>
										Cara Kerja
									</Link>
								</li>
							</ul>
						</div>

						<div>
							<h3 className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#BDC3C7]">
								Akun
							</h3>
							<ul className="mt-5 space-y-3 text-sm text-white/70">
								<li>
									<Link
										href={isAuthenticated ? "/dashboard" : "/auth/login"}
										className="transition hover:text-white"
									>
										{isAuthenticated ? "Buka Dashboard" : "Sign in"}
									</Link>
								</li>
							</ul>
						</div>
					</div>

					<div className="mt-12 flex flex-col justify-between gap-3 border-t border-white/15 pt-6 text-xs text-white/45 sm:flex-row sm:items-center">
						<p>© 2026 KerjaLokal. Semua hak dilindungi.</p>
						<p>Dibangun untuk membuka peluang kerja lokal.</p>
					</div>
				</div>
			</footer>
		</main>
	);
}
