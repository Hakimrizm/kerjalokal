"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { notify, notifyInvalidForm, resetInvalidForm } from "@/lib/notify";
import {
	ArrowLeft,
	BriefcaseBusiness,
	CheckCircle2,
	Eye,
	EyeOff,
	FileText,
	LoaderCircle,
	LockKeyhole,
	Mail,
	ShieldCheck,
	Users,
} from "lucide-react";

const adminBenefits = [
	{
		icon: ShieldCheck,
		title: "Keamanan Ekosistem",
		description:
			"Verifikasi pelaku usaha dan lowongan untuk menjaga keamanan platform.",
	},
	{
		icon: Users,
		title: "Manajemen Pengguna",
		description: "Pantau dan kelola aktivitas pencari kerja dan pelaku UMKM.",
	},
	{
		icon: FileText,
		title: "Moderasi Konten",
		description: "Tinjau laporan dan pastikan kualitas lowongan tetap relevan.",
	},
];

export function AdminLoginForm() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLoading(true);
		setError("");
		const supabase = createClient();

		try {
			const { data, error: signInError } =
				await supabase.auth.signInWithPassword({
					email: email.trim().toLowerCase(),
					password,
				});
			if (signInError) throw signInError;

			const { data: roleRow, error: roleError } = await supabase
				.from("user_roles")
				.select("role")
				.eq("user_id", data.user.id)
				.maybeSingle();

			if (roleError) {
				await supabase.auth.signOut();
				throw new Error(
					"Role akun tidak dapat diperiksa. Pastikan migrasi Admin KerjaLokal sudah dijalankan.",
				);
			}
			if (
				!roleRow ||
				!["admin", "super_admin", "fraud_admin"].includes(roleRow.role)
			) {
				await supabase.auth.signOut();
				throw new Error(
					"Akun ini bukan akun Admin KerjaLokal. Gunakan halaman login sesuai jenis akun.",
				);
			}

			notify("success", "Berhasil masuk ke Control Center.");
			router.replace("/admin");
			router.refresh();
		} catch (caught) {
			const message =
				caught instanceof Error
					? caught.message
					: "Email atau password tidak sesuai.";
			setError(message);
			notify("error", message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="min-h-screen bg-[#ECF0F1] lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(500px,1.08fr)]">
			{/* BAGIAN KIRI - DEKORASI & INFO ADMIN */}
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
							Control Center
						</span>
					</span>
				</Link>

				<div className="relative z-10 my-auto max-w-xl py-16">
					<span className="badge badge-outline mb-6 border-white/25 bg-white/5 px-3 py-3 text-[10px] font-bold tracking-[0.12em] text-[#ECF0F1]">
						HANYA UNTUK INTERNAL
					</span>
					<h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight xl:text-5xl">
						Pusat Kendali
						<span className="block text-[#BDC3C7]">KerjaLokal.</span>
					</h1>
					<p className="mt-6 max-w-lg text-sm leading-7 text-white/70 xl:text-base">
						Halaman ini dikhususkan bagi administrator untuk memantau ekosistem
						KerjaLokal, memverifikasi pelaku usaha, dan menjaga keamanan
						platform.
					</p>

					<div className="mt-10 space-y-5">
						{adminBenefits.map((benefit) => {
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
						Aktivitas di Control Center dipantau oleh sistem.
					</div>
				</div>

				<p className="relative z-10 text-[10px] tracking-wide text-white/35">
					© 2026 KerjaLokal. Peluang dekat, masa depan hebat.
				</p>
			</aside>

			{/* BAGIAN KANAN - FORM LOGIN ADMIN */}
			<section className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-20">
				<div className="flex items-center justify-between">
					<Link
						href="/auth/login"
						className="btn btn-ghost btn-sm rounded-full text-[#34495E] hover:bg-white lg:invisible"
					>
						<ArrowLeft size={16} /> Kembali
					</Link>
					<Link
						href="/auth/login"
						className="hidden text-xs font-semibold text-[#7F8C8D] transition hover:text-[#2C3E50] lg:inline-flex"
					>
						Kembali ke login pengguna
					</Link>
				</div>

				<div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
					<div className="mb-6 flex items-center gap-2 lg:hidden">
						<span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2C3E50] text-white">
							<ShieldCheck size={20} />
						</span>
						<span className="text-lg font-extrabold tracking-tight text-[#2C3E50]">
							kerja<span className="text-[#7F8C8D]">lokal</span>
						</span>
					</div>

					<div className="mb-8">
						<h2 className="text-2xl font-extrabold tracking-tight text-[#2C3E50]">
							Login Administrator
						</h2>
						<p className="mt-2 text-sm text-[#7F8C8D]">
							Silakan masuk untuk mengakses Control Center KerjaLokal.
						</p>
					</div>

					<form
						onSubmit={submit}
						onInvalidCapture={(event) =>
							notifyInvalidForm(
								event.currentTarget,
								"Masukkan email dan password dengan format yang benar.",
							)
						}
						onInputCapture={(event) => resetInvalidForm(event.currentTarget)}
						className="space-y-5"
					>
						<div className="form-control">
							<label htmlFor="admin-email" className="label pb-2">
								<span className="label-text text-xs font-bold text-[#34495E]">
									Email administrator
								</span>
							</label>
							<label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#BDC3C7]/70 bg-white focus-within:border-[#2C3E50]">
								<Mail size={17} className="text-[#8A969D]" />
								<input
									id="admin-email"
									type="email"
									required
									autoComplete="username"
									value={email}
									aria-invalid={Boolean(error)}
									onChange={(e) => {
										setError("");
										setEmail(e.target.value);
									}}
									placeholder="admin@kerjalokal.id"
									className="grow text-sm text-[#2C3E50] placeholder:text-[#9AA5AB] focus:outline-none"
								/>
							</label>
						</div>

						<div className="form-control">
							<label htmlFor="admin-password" className="label pb-2">
								<span className="label-text text-xs font-bold text-[#34495E]">
									Password
								</span>
							</label>
							<label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#BDC3C7]/70 bg-white focus-within:border-[#2C3E50]">
								<LockKeyhole size={17} className="text-[#8A969D]" />
								<input
									id="admin-password"
									type={showPassword ? "text" : "password"}
									required
									autoComplete="current-password"
									value={password}
									aria-invalid={Boolean(error)}
									onChange={(e) => {
										setError("");
										setPassword(e.target.value);
									}}
									placeholder="Masukkan password"
									className="grow text-sm text-[#2C3E50] placeholder:text-[#9AA5AB] focus:outline-none"
								/>
								<button
									type="button"
									onClick={() => setShowPassword((value) => !value)}
									className="btn btn-ghost btn-xs btn-square text-[#8A969D] hover:bg-transparent hover:text-[#34495E]"
									aria-label={
										showPassword ? "Sembunyikan password" : "Tampilkan password"
									}
								>
									{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</label>
						</div>

						{error && (
							<div
								role="alert"
								className="alert alert-error rounded-xl py-3 text-xs"
							>
								{error}
							</div>
						)}

						<button
							type="submit"
							disabled={loading}
							className="btn min-h-12 mt-2 w-full rounded-xl border-0 bg-[#2C3E50] text-sm font-extrabold text-white hover:bg-[#34495E]"
						>
							{loading ? (
								<>
									<LoaderCircle size={17} className="animate-spin" /> Memeriksa
									akses...
								</>
							) : (
								<>
									<ShieldCheck size={17} /> Masuk ke Control Center
								</>
							)}
						</button>

						<p className="mt-4 text-center text-[11px] leading-5 text-[#9AA5AB]">
							Akun administrator dibuat secara internal. Pendaftaran publik
							tidak menyediakan akses ke halaman ini.
						</p>
					</form>
				</div>
			</section>
		</main>
	);
}
