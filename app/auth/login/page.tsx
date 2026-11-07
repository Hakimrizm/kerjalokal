import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import {
	ArrowLeft,
	BriefcaseBusiness,
	CheckCircle2,
	FileText,
	MapPin,
	ShieldCheck,
	Sparkles,
} from "lucide-react";

const benefits = [
	{
		icon: Sparkles,
		title: "Rekomendasi lebih relevan",
		description:
			"Temukan lowongan berdasarkan keahlian, pendidikan, pengalaman, dan lokasi.",
	},
	{
		icon: FileText,
		title: "CV siap digunakan",
		description:
			"Lengkapi profil dan siapkan CV profesional untuk mendukung lamaranmu.",
	},
	{
		icon: MapPin,
		title: "Peluang di sekitar rumah",
		description:
			"Jelajahi kesempatan kerja dari usaha lokal di wilayah terdekat.",
	},
];

export default function Page() {
	return (
		<main className="min-h-screen bg-[#ECF0F1] lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(500px,1.08fr)]">
			<aside className="relative hidden min-h-screen overflow-hidden bg-[#2C3E50] px-10 py-10 text-white lg:flex lg:flex-col xl:px-16">
				<div className="pointer-events-none absolute -right-36 top-20 h-[28rem] w-[28rem] rounded-full border border-white/10" />
				<div className="pointer-events-none absolute -right-16 top-40 h-[18rem] w-[18rem] rounded-full border border-white/10" />
				<div className="pointer-events-none absolute -bottom-36 -left-20 h-[26rem] w-[26rem] rounded-full bg-white/[0.04] blur-2xl" />

				<Link href="/" className="relative z-10 flex w-fit items-center gap-3">
					<span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
						<BriefcaseBusiness size={24} />
					</span>
					<span>
						<span className="block text-xl font-extrabold tracking-tight">
							kerja<span className="text-[#BDC3C7]">lokal</span>
						</span>
						<span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55">
							Peluang dekat, masa depan hebat
						</span>
					</span>
				</Link>

				<div className="relative z-10 my-auto max-w-xl py-16">
					<span className="badge badge-outline mb-6 border-white/25 bg-white/5 px-3 py-3 text-[10px] font-bold tracking-[0.12em] text-[#ECF0F1]">
						SENANG MENEMUKAN PELUANG BARU
					</span>

					<h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight xl:text-5xl">
						Satu langkah lagi
						<span className="block text-[#BDC3C7]">menuju peluangmu.</span>
					</h1>

					<p className="mt-6 max-w-lg text-sm leading-7 text-white/70 xl:text-base">
						Masuk ke akun KerjaLokal untuk melanjutkan perjalanan karier,
						menemukan pekerjaan yang sesuai, atau mengelola kebutuhan rekrutmen
				usaha lokalmu.
					</p>

					<div className="mt-10 space-y-5">
						{benefits.map((benefit) => {
							const Icon = benefit.icon;
							return (
								<div key={benefit.title} className="flex items-start gap-4">
									<span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-[#BDC3C7] ring-1 ring-white/10">
										<Icon size={20} />
									</span>
									<div>
										<h2 className="text-sm font-bold">{benefit.title}</h2>
										<p className="mt-1 text-xs leading-5 text-white/60">
											{benefit.description}
										</p>
									</div>
								</div>
							);
						})}
					</div>

					<div className="mt-12 flex items-center gap-2 border-t border-white/15 pt-6 text-xs text-white/55">
						<CheckCircle2 size={15} className="text-[#BDC3C7]" />
						Satu akun untuk mengakses layanan KerjaLokal sesuai peranmu.
					</div>
				</div>

				<p className="relative z-10 text-[10px] tracking-wide text-white/35">
					© 2026 KerjaLokal. Peluang dekat, masa depan hebat.
				</p>
			</aside>

			<section className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-20">
				<div className="flex items-center justify-between">
					<Link
						href="/"
						className="btn btn-ghost btn-sm rounded-full text-[#34495E] hover:bg-white lg:invisible"
					>
						<ArrowLeft size={16} /> Beranda
					</Link>
					<Link
						href="/"
						className="hidden text-xs font-semibold text-[#7F8C8D] transition hover:text-[#2C3E50] lg:inline-flex"
					>
						Kembali ke Beranda
					</Link>
				</div>

				<div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
					<div className="mb-6 flex items-center gap-2 lg:hidden">
						<span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2C3E50] text-white">
							<BriefcaseBusiness size={20} />
						</span>
						<span className="text-lg font-extrabold tracking-tight text-[#2C3E50]">
							kerja<span className="text-[#7F8C8D]">lokal</span>
						</span>
					</div>

					<Suspense
						fallback={
							<div className="w-full animate-pulse space-y-4 rounded-2xl bg-white/70 p-6">
								<div className="h-7 w-2/3 rounded-lg bg-[#ECF0F1]" />
								<div className="h-4 w-full rounded bg-[#ECF0F1]" />
								<div className="h-12 w-full rounded-xl bg-[#ECF0F1]" />
								<div className="h-12 w-full rounded-xl bg-[#ECF0F1]" />
								<div className="h-12 w-full rounded-xl bg-[#ECF0F1]" />
							</div>
						}
					>
						<LoginForm />
					</Suspense>
				</div>

				<p className="pb-3 text-center text-[10px] leading-5 text-[#7F8C8D]">
					Dengan masuk, kamu dapat melanjutkan aktivitas dan mengelola akun
					melalui layanan KerjaLokal.
				</p>
			</section>
		</main>
	);
}
