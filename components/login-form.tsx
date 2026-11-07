"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { notify, notifyInvalidForm, resetInvalidForm } from "@/lib/notify";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ComponentPropsWithoutRef } from "react";
import {
	ArrowRight,
	Eye,
	EyeOff,
	LoaderCircle,
	LockKeyhole,
	Mail,
} from "lucide-react";

type LoginFormProps = ComponentPropsWithoutRef<"div">;

export function LoginForm({ className, ...props }: LoginFormProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();
	const searchParams = useSearchParams();

	const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const supabase = createClient();
		setIsLoading(true);
		setError(null);

		try {
			const { data, error: loginError } =
				await supabase.auth.signInWithPassword({
					email: email.trim().toLowerCase(),
					password,
				});

			if (loginError) throw loginError;

			const { data: roleData, error: roleError } = await supabase
				.from("user_roles")
				.select("role")
				.eq("user_id", data.user.id)
				.maybeSingle();

			if (roleError) {
				throw new Error(
					"Role akun belum dapat diperiksa. Pastikan seluruh migrasi database KerjaLokal sudah dijalankan, lalu coba masuk kembali.",
				);
			}

			if (!roleData?.role) {
				throw new Error(
					"Role akun belum terdaftar. Jalankan migrasi role KerjaLokal di Supabase sebelum masuk.",
				);
			}

			if (roleData.role === "employer") {
				const { data: employerProfile, error: employerProfileError } =
					await supabase
						.from("employer_profiles")
						.select("profile_completed")
						.eq("user_id", data.user.id)
						.maybeSingle();

				if (employerProfileError) throw employerProfileError;

				router.replace(
					employerProfile?.profile_completed
						? "/dashboard/pelaku-usaha"
						: "/onboarding/employer",
				);
			} else if (roleData.role === "job_seeker") {
				const { data: jobProfile, error: jobProfileError } = await supabase
					.from("job_seeker_profiles")
					.select("profile_completed")
					.eq("user_id", data.user.id)
					.maybeSingle();

				if (jobProfileError) throw jobProfileError;

				const requestedNextPath = searchParams.get("next");
				const safeNextPath =
					requestedNextPath &&
					requestedNextPath.startsWith("/") &&
					!requestedNextPath.startsWith("//")
						? requestedNextPath
						: undefined;

				router.replace(
					jobProfile?.profile_completed
						? (safeNextPath ?? "/dashboard/pencari-kerja")
						: "/onboarding/job-seeker",
				);
			} else if (
				roleData.role === "admin" ||
				roleData.role === "super_admin" ||
				roleData.role === "fraud_admin"
			) {
				router.replace("/admin");
			} else {
				throw new Error(
					"Role akun tidak dikenali. Hubungi administrator KerjaLokal.",
				);
			}

			notify("success", "Berhasil masuk ke akun KerjaLokal.");
			router.refresh();
		} catch (caughtError: unknown) {
			const message =
				caughtError instanceof Error
					? caughtError.message
					: "Email atau password tidak sesuai.";

			setError(message);
			notify("error", message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className={cn("w-full", className)} {...props}>
			<div className="mb-7">
				<span className="badge badge-outline border-[#BDC3C7] bg-[#ECF0F1] px-3 py-3 text-[11px] font-bold tracking-wide text-[#34495E]">
					AKUN KERJALOKAL
				</span>

				<h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#2C3E50] sm:text-[2.1rem]">
					Selamat datang kembali.
				</h1>

				<p className="mt-2 text-sm leading-6 text-[#7F8C8D]">
					Masuk untuk menemukan peluang, mengelola lowongan, dan melanjutkan
					aktivitasmu di KerjaLokal.
				</p>
			</div>

			<form
				onSubmit={handleLogin}
				onInvalidCapture={(event) =>
					notifyInvalidForm(
						event.currentTarget,
						"Masukkan email dan password dengan format yang benar.",
					)
				}
				onInputCapture={(event) => resetInvalidForm(event.currentTarget)}
				className="space-y-4"
			>
				<div className="form-control w-full">
					<label className="label pb-2" htmlFor="email">
						<span className="label-text text-sm font-bold text-[#34495E]">
							Email <span className="text-red-500">*</span>
						</span>
					</label>

					<label
						className={cn(
							"input input-bordered flex h-12 items-center gap-3 rounded-xl bg-white transition-all focus-within:outline-none",
							error
								? "border-red-400 focus-within:border-red-500"
								: "border-[#BDC3C7] focus-within:border-[#34495E]",
						)}
					>
						<Mail size={18} className="shrink-0 text-[#7F8C8D]" />
						<input
							id="email"
							type="email"
							placeholder="nama@email.com"
							autoComplete="email"
							required
							value={email}
							aria-invalid={Boolean(error)}
							onChange={(event) => {
								setError(null);
								setEmail(event.target.value);
							}}
							className="grow text-sm text-[#2C3E50] placeholder:text-[#7F8C8D]/70 focus:outline-none"
						/>
					</label>
				</div>

				<div className="form-control w-full">
					<div className="mb-2 flex items-center justify-between gap-2">
						<label htmlFor="password">
							<span className="text-sm font-bold text-[#34495E]">
								Password <span className="text-red-500">*</span>
							</span>
						</label>

						<Link
							href="/auth/forgot-password"
							className="text-xs font-semibold text-[#7F8C8D] underline-offset-4 transition hover:text-[#2C3E50] hover:underline"
						>
							Lupa Password?
						</Link>
					</div>

					<label
						className={cn(
							"input input-bordered flex h-12 items-center gap-3 rounded-xl bg-white transition-all focus-within:outline-none",
							error
								? "border-red-400 focus-within:border-red-500"
								: "border-[#BDC3C7] focus-within:border-[#34495E]",
						)}
					>
						<LockKeyhole size={18} className="shrink-0 text-[#7F8C8D]" />
						<input
							id="password"
							type={showPassword ? "text" : "password"}
							autoComplete="current-password"
							required
							value={password}
							aria-invalid={Boolean(error)}
							onChange={(event) => {
								setError(null);
								setPassword(event.target.value);
							}}
							placeholder="Masukkan password"
							className="grow text-sm text-[#2C3E50] placeholder:text-[#7F8C8D]/70 focus:outline-none"
						/>
						<button
							type="button"
							className="btn btn-ghost btn-xs btn-square rounded-lg text-[#7F8C8D] hover:bg-[#ECF0F1]"
							onClick={() => setShowPassword((visible) => !visible)}
							aria-label={
								showPassword ? "Sembunyikan password" : "Tampilkan password"
							}
						>
							{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
						</button>
					</label>
				</div>

				{error && (
					<div
						role="alert"
						className="alert alert-error rounded-xl border border-[#F0CACA] bg-[#FFF6F6] py-3 text-sm text-[#A34E4E]"
					>
						<span>{error}</span>
					</div>
				)}

				<button
					type="submit"
					disabled={isLoading}
					className="btn btn-primary mt-2 h-12 min-h-12 w-full rounded-xl border-0 bg-[#2C3E50] text-sm font-bold text-white shadow-lg shadow-[#2C3E50]/15 transition-all hover:-translate-y-0.5 hover:bg-[#34495E] disabled:translate-y-0 disabled:opacity-70"
				>
					{isLoading ? (
						<>
							<LoaderCircle size={18} className="animate-spin" />
							Memeriksa akun...
						</>
					) : (
						<>
							Masuk ke KerjaLokal
							<ArrowRight size={17} />
						</>
					)}
				</button>
			</form>

			<div className="divider my-5 text-[10px] text-[#7F8C8D]">
				BELUM MEMILIKI AKUN?
			</div>

			<div className="space-y-3 text-center">
				<p className="text-sm text-[#53616D]">
					Daftar sebagai{" "}
					<Link
						href="/auth/sign-up"
						className="font-extrabold text-[#2C3E50] underline decoration-[#BDC3C7] underline-offset-4 transition hover:text-[#7F8C8D]"
					>
						Pencari Kerja
					</Link>
					{" atau "}
					<Link
						href="/auth/sign-up/employer"
						className="font-extrabold text-[#2C3E50] underline decoration-[#BDC3C7] underline-offset-4 transition hover:text-[#7F8C8D]"
					>
						Pelaku Usaha
					</Link>
				</p>
			</div>
		</div>
	);
}
