import Link from "next/link";
import { SignUpForm } from "@/components/sign-up-form";
import {
	ArrowLeft,
	Building2,
	BriefcaseBusiness,
	CheckCircle2,
	FileUser,
	MapPin,
	Sparkles,
} from "lucide-react";

const benefits = [
	{
		icon: FileUser,
		title: "CV otomatis",
		description: "Susun CV profesional dari profil yang kamu isi.",
	},
	{
		icon: Sparkles,
		title: "Rekomendasi lebih relevan",
		description: "Temukan pekerjaan berdasarkan skill dan preferensimu.",
	},
	{
		icon: MapPin,
		title: "Peluang di sekitar rumah",
		description: "Fokus pada lowongan di desa dan kecamatan terdekat.",
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
						LANGKAH PERTAMA MENUJU PEKERJAAN BARU
					</span>
					<h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight xl:text-5xl">
						Kesempatan kerja
						<span className="block text-[#BDC3C7]">dimulai dari sini.</span>
					</h1>
					<p className="mt-6 max-w-lg text-sm leading-7 text-white/70 xl:text-base">
						Bangun profil yang menggambarkan kemampuanmu. KerjaLokal membantu
						mempertemukan pencari kerja dengan pelaku usaha di lingkungan
						terdekat.
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
						Gratis untuk membuat akun pencari kerja.
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
					<SignUpForm />
					<div className="mt-5 rounded-xl border border-[#BDC3C7]/70 bg-white p-4">
						<div className="flex items-center gap-3">
							<span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#ECF0F1] text-[#34495E]">
								<Building2 size={19} />
							</span>
							<div className="min-w-0 flex-1">
								<p className="text-xs font-bold text-[#34495E]">Mewakili usaha atau UMKM?</p>
								<p className="mt-1 text-[11px] leading-5 text-[#7F8C8D]">Buat akun khusus untuk memasang lowongan dan mengelola pelamar.</p>
							</div>
						</div>
						<Link href="/auth/sign-up/employer" className="btn btn-outline btn-sm mt-3 w-full rounded-lg border-[#34495E] text-xs font-bold text-[#34495E] hover:bg-[#34495E] hover:text-white">
							Daftar sebagai Pelaku Usaha
						</Link>
					</div>
				</div>

				<p className="pb-3 text-center text-[10px] leading-5 text-[#7F8C8D]">
					Dengan membuat akun, kamu dapat melengkapi profil dan mengelola
					lamaran pekerjaan melalui KerjaLokal.
				</p>
			</section>
		</main>
	);
}
