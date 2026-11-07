import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
	ArrowRight,
	Award,
	BriefcaseBusiness,
	CalendarDays,
	CheckCircle2,
	Clock3,
	FileUser,
	GraduationCap,
	MapPin,
	Plus,
	Search,
	Sparkles,
	Wallet,
	XCircle,
} from "lucide-react";

export const instant = false;

function formatDate(value?: string | null) {
	if (!value) return "";

	const date = new Date(`${value.slice(0, 10)}T00:00:00`);

	if (Number.isNaN(date.getTime())) return "";

	return new Intl.DateTimeFormat("id-ID", {
		month: "short",
		year: "numeric",
	}).format(date);
}

function formatSalary(value?: number | string | null) {
	if (value === null || value === undefined || value === "") return null;

	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		maximumFractionDigits: 0,
	}).format(Number(value));
}

export default async function JobSeekerDashboardPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/auth/login?next=/dashboard/pencari-kerja");
	}

	// Mengambil seluruh data dashboard secara bersamaan.
	const [
		profileResult,
		jobProfileResult,
		skillsResult,
		educationResult,
		experienceResult,
		certificateResult,
		applicationResult,
	] = await Promise.all([
		supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),

		supabase
			.from("job_seeker_profiles")
			.select("*")
			.eq("user_id", user.id)
			.maybeSingle(),

		supabase
			.from("job_seeker_skills")
			.select("id, skill_name")
			.eq("user_id", user.id)
			.order("skill_name"),

		supabase
			.from("job_seeker_education")
			.select(
				"id, education_level, institution, major, start_year, end_year, is_current",
			)
			.eq("user_id", user.id)
			.order("start_year", { ascending: false }),

		supabase
			.from("job_seeker_experiences")
			.select(
				"id, company, position, location, start_date, end_date, is_current, description",
			)
			.eq("user_id", user.id)
			.order("start_date", { ascending: false }),

		supabase
			.from("job_seeker_certificates")
			.select("id, certificate_name, issuer, issue_date")
			.eq("user_id", user.id)
			.order("issue_date", { ascending: false }),

		// Mengambil data lamaran milik pengguna yang sedang login.
		supabase
			.from("job_applications")
			.select("id, status, applied_at")
			.eq("applicant_id", user.id)
			.order("applied_at", { ascending: false }),
	]);

	const profile = profileResult.data;
	const jobProfile = jobProfileResult.data;

	if (!jobProfile?.profile_completed) {
		redirect("/onboarding/job-seeker");
	}

	const skills = skillsResult.data ?? [];
	const educations = educationResult.data ?? [];
	const experiences = experienceResult.data ?? [];
	const certificates = certificateResult.data ?? [];
	const applications = applicationResult.data ?? [];

	// Normalisasi status lamaran.
	// Mendukung beberapa variasi status bahasa Inggris dan Indonesia.
	const countApplicationsByStatus = (statusAliases: string[]) => {
		return applications.filter((application) => {
			const status = String(application.status ?? "")
				.trim()
				.toLowerCase()
				.replace(/[\s-]+/g, "_");

			return statusAliases.includes(status);
		}).length;
	};

	// Menghitung setiap kategori status lamaran.
	const submittedApplications = countApplicationsByStatus([
		"submitted",
		"applied",
		"pending",
		"pending_review",
		"new",
		"menunggu",
		"menunggu_tinjauan",
		"menunggu_review",
		"waiting",
	]);

	const reviewingApplications = countApplicationsByStatus([
		"reviewing",
		"review",
		"under_review",
		"in_review",
		"screening",
		"shortlisted",
		"in_progress",
		"sedang_ditinjau",
		"ditinjau",
		"diproses",
	]);

	const interviewApplications = countApplicationsByStatus([
		"interview",
		"interviewed",
		"wawancara",
		"tahap_wawancara",
	]);

	const acceptedApplications = countApplicationsByStatus([
		"accepted",
		"hired",
		"selected",
		"diterima",
	]);

	const rejectedApplications = countApplicationsByStatus([
		"rejected",
		"declined",
		"ditolak",
	]);

	// Statistik aktivitas lamaran.
	const applicationStats = {
		total: applications.length,

		submitted: submittedApplications,

		reviewing: reviewingApplications,

		interview: interviewApplications,

		accepted: acceptedApplications,

		rejected: rejectedApplications,

		active:
			submittedApplications + reviewingApplications + interviewApplications,
	};

	// Informasi pengguna.
	const name =
		profile?.full_name || user.user_metadata?.full_name || "Pencari Kerja";

	const firstName = name.trim().split(/\s+/)[0] || "Teman";

	const location = [profile?.village, profile?.district, profile?.city]
		.filter(Boolean)
		.join(", ");

	// Preferensi gaji.
	const salaryMin = formatSalary(jobProfile?.expected_salary_min);
	const salaryMax = formatSalary(jobProfile?.expected_salary_max);

	const salaryText =
		salaryMin && salaryMax
			? `${salaryMin} – ${salaryMax}`
			: salaryMin
				? `Mulai ${salaryMin}`
				: salaryMax
					? `Maksimal ${salaryMax}`
					: "Belum ditentukan";

	return (
		<div className="flex-1 w-full flex flex-col gap-12">
			{/* Welcome */}
			<section className="relative overflow-hidden rounded-[28px] bg-[#2C3E50] p-6 text-white shadow-xl shadow-[#2C3E50]/10 sm:p-8 lg:p-9">
				<div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border border-white/10" />

				<div className="pointer-events-none absolute right-24 -top-32 h-64 w-64 rounded-full border border-white/10" />

				<div className="relative flex flex-col justify-between gap-7 md:flex-row md:items-center">
					<div className="max-w-2xl">
						<span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[#D9E1E5]">
							<Sparkles size={13} />
							Ruang karier kamu
						</span>

						<h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-[2.15rem]">
							Halo, {firstName}! 👋
						</h1>

						<p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
							Senang melihatmu kembali. Pantau proses lamaran, lihat
							perkembangan seleksi, dan temukan peluang kerja yang dekat dengan
							tempat tinggalmu.
						</p>

						{location && (
							<p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#D5DEE3]">
								<MapPin size={15} />
								{location}
							</p>
						)}

						<div className="mt-6 flex flex-wrap gap-3">
							<Link
								href="/lowongan"
								className="btn min-h-11 rounded-full border-0 bg-[#ECF0F1] px-5 text-xs font-extrabold text-[#2C3E50] hover:bg-white"
							>
								Cari Lowongan
								<ArrowRight size={15} />
							</Link>

							<Link
								href="/dashboard/pencari-kerja/profil"
								className="btn btn-outline min-h-11 rounded-full border-white/30 px-5 text-xs font-bold text-white hover:border-white hover:bg-white/10 hover:text-white"
							>
								Lihat Profil
							</Link>
						</div>
					</div>

					{/* Lamaran aktif */}
					<div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm md:min-w-[220px] md:flex-col md:items-start md:p-5">
						<div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 text-[#ECF0F1]">
							<BriefcaseBusiness size={25} />
						</div>

						<div>
							<p className="text-xs font-semibold text-white/65">
								Lamaran aktif
							</p>

							<p className="mt-1 text-2xl font-extrabold">
								{applicationStats.active}
							</p>

							<p className="mt-1 text-[10px] text-white/55">
								Lamaran dalam proses seleksi
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Overview application stats */}
			<section className="mt-6">
				<div className="mb-4">
					<h2 className="text-base font-extrabold text-[#2C3E50]">
						Aktivitas Lamaran
					</h2>

					<p className="mt-1 text-xs text-[#8A969D]">
						Pantau perkembangan seluruh lamaran pekerjaanmu.
					</p>
				</div>

				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{/* Total lamaran */}
					<article className="rounded-2xl border border-[#E2E7E9] bg-white p-4 shadow-sm shadow-[#2C3E50]/[0.02]">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-[#7F8C8D]">
								Total lamaran
							</span>

							<span className="grid h-9 w-9 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]">
								<FileUser size={17} />
							</span>
						</div>

						<p className="mt-3 text-2xl font-extrabold text-[#2C3E50]">
							{applicationStats.total}
						</p>

						<Link
							href="/dashboard/pencari-kerja/lamaran"
							className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#53616D] hover:underline"
						>
							Lihat semua lamaran
							<ArrowRight size={12} />
						</Link>
					</article>

					{/* Menunggu tinjauan */}
					<article className="rounded-2xl border border-[#E2E7E9] bg-white p-4 shadow-sm shadow-[#2C3E50]/[0.02]">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-[#7F8C8D]">
								Menunggu tinjauan
							</span>

							<span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF4DF] text-[#B7791F]">
								<Clock3 size={17} />
							</span>
						</div>

						<p className="mt-3 text-2xl font-extrabold text-[#2C3E50]">
							{applicationStats.submitted}
						</p>

						<p className="mt-1 text-[11px] text-[#8A969D]">
							Lamaran menunggu pemeriksaan
						</p>
					</article>

					{/* Sedang ditinjau */}
					<article className="rounded-2xl border border-[#E2E7E9] bg-white p-4 shadow-sm shadow-[#2C3E50]/[0.02]">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-[#7F8C8D]">
								Sedang ditinjau
							</span>

							<span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF1FF] text-[#4169A1]">
								<Search size={17} />
							</span>
						</div>

						<p className="mt-3 text-2xl font-extrabold text-[#2C3E50]">
							{applicationStats.reviewing}
						</p>

						<p className="mt-1 text-[11px] text-[#8A969D]">
							Lamaran sedang diproses
						</p>
					</article>

					{/* Wawancara */}
					<article className="rounded-2xl border border-[#E2E7E9] bg-white p-4 shadow-sm shadow-[#2C3E50]/[0.02]">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-[#7F8C8D]">
								Tahap wawancara
							</span>

							<span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EAF1FF] text-[#4169A1]">
								<CalendarDays size={17} />
							</span>
						</div>

						<p className="mt-3 text-2xl font-extrabold text-[#2C3E50]">
							{applicationStats.interview}
						</p>

						<p className="mt-1 text-[11px] text-[#8A969D]">
							Lamaran pada tahap wawancara
						</p>
					</article>

					{/* Diterima */}
					<article className="rounded-2xl border border-[#E2E7E9] bg-white p-4 shadow-sm shadow-[#2C3E50]/[0.02]">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-[#7F8C8D]">
								Diterima
							</span>

							<span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E8F6EC] text-[#27834B]">
								<CheckCircle2 size={17} />
							</span>
						</div>

						<p className="mt-3 text-2xl font-extrabold text-[#27834B]">
							{applicationStats.accepted}
						</p>

						<p className="mt-1 text-[11px] text-[#8A969D]">
							Lamaran berhasil diterima
						</p>
					</article>

					{/* Ditolak */}
					<article className="rounded-2xl border border-[#E2E7E9] bg-white p-4 shadow-sm shadow-[#2C3E50]/[0.02]">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold text-[#7F8C8D]">
								Ditolak
							</span>

							<span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FDECEC] text-[#B94A48]">
								<XCircle size={17} />
							</span>
						</div>

						<p className="mt-3 text-2xl font-extrabold text-[#B94A48]">
							{applicationStats.rejected}
						</p>

						<p className="mt-1 text-[11px] text-[#8A969D]">
							Lamaran tidak dilanjutkan
						</p>
					</article>
				</div>
			</section>

			{/* Main dashboard content */}
			<div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
				<div className="space-y-6">
					{/* Profile snapshot */}
					<section className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm shadow-[#2C3E50]/[0.02]">
						<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF1F2] px-5 py-4 sm:px-6">
							<div>
								<h2 className="text-base font-extrabold text-[#2C3E50]">
									Ringkasan profil
								</h2>

								<p className="mt-1 text-xs text-[#8A969D]">
									Informasi utama yang dilihat saat menyiapkan lamaran.
								</p>
							</div>

							<Link
								href="/dashboard/pencari-kerja/profil"
								className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#34495E] hover:underline"
							>
								Lihat semua
								<ArrowRight size={14} />
							</Link>
						</div>

						<div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
							<div>
								<p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">
									Posisi yang dicari
								</p>

								<p className="mt-1.5 text-sm font-bold text-[#34495E]">
									{jobProfile?.desired_position || "Belum diisi"}
								</p>
							</div>

							<div>
								<p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">
									Kategori pekerjaan
								</p>

								<p className="mt-1.5 text-sm font-bold text-[#34495E]">
									{jobProfile?.job_category || "Belum diisi"}
								</p>
							</div>

							<div>
								<p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">
									Tipe pekerjaan
								</p>

								<p className="mt-1.5 text-sm font-bold text-[#34495E]">
									{jobProfile?.employment_types?.length
										? jobProfile.employment_types.join(", ")
										: "Belum dipilih"}
								</p>
							</div>

							<div>
								<p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">
									Ekspektasi gaji
								</p>

								<p className="mt-1.5 text-sm font-bold text-[#34495E]">
									{salaryText}
								</p>
							</div>

							<div className="sm:col-span-2">
								<p className="text-[10px] font-bold uppercase tracking-wider text-[#9AA5AB]">
									Tentang saya
								</p>

								<p className="mt-1.5 text-sm leading-6 text-[#667681]">
									{jobProfile?.summary ||
										"Tambahkan ringkasan singkat tentang dirimu agar pelaku usaha lebih mudah mengenalmu."}
								</p>
							</div>
						</div>
					</section>

					{/* Skills */}
					<section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm shadow-[#2C3E50]/[0.02] sm:p-6">
						<div className="flex items-center justify-between gap-3">
							<div>
								<h2 className="text-base font-extrabold text-[#2C3E50]">
									Keahlian saya
								</h2>

								<p className="mt-1 text-xs text-[#8A969D]">
									Kemampuan yang dapat mendukung pekerjaanmu.
								</p>
							</div>

							<Link
								href="/onboarding/job-seeker?edit=1&step=skills"
								aria-label="Edit keahlian"
								className="btn btn-ghost btn-sm rounded-full text-[#34495E] hover:bg-[#ECF0F1]"
							>
								<Plus size={16} />
								<span className="hidden sm:inline">Tambah</span>
							</Link>
						</div>

						{skills.length ? (
							<div className="mt-4 flex flex-wrap gap-2">
								{skills.map((skill: { id: string; skill_name: string }) => (
									<span
										key={skill.id}
										className="rounded-full border border-[#DCE3E6] bg-[#F5F7F8] px-3.5 py-2 text-xs font-semibold text-[#53616D]"
									>
										{skill.skill_name}
									</span>
								))}
							</div>
						) : (
							<div className="mt-4 rounded-xl border border-dashed border-[#CBD4D9] bg-[#F8FAFA] px-4 py-5 text-center">
								<p className="text-sm font-semibold text-[#53616D]">
									Belum ada keahlian yang ditambahkan.
								</p>

								<Link
									href="/onboarding/job-seeker?edit=1&step=skills"
									className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-[#34495E] hover:underline"
								>
									Tambahkan keahlian
									<ArrowRight size={13} />
								</Link>
							</div>
						)}
					</section>

					{/* Experience preview */}
					<section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm shadow-[#2C3E50]/[0.02] sm:p-6">
						<div className="flex items-center justify-between gap-3">
							<div>
								<h2 className="text-base font-extrabold text-[#2C3E50]">
									Pengalaman kerja
								</h2>

								<p className="mt-1 text-xs text-[#8A969D]">
									Riwayat pekerjaan dan aktivitas profesional.
								</p>
							</div>

							<Link
								href="/onboarding/job-seeker?edit=1&step=experience"
								className="btn btn-ghost btn-sm rounded-full text-[#34495E] hover:bg-[#ECF0F1]"
							>
								<Plus size={16} />
								<span className="hidden sm:inline">Tambah</span>
							</Link>
						</div>

						{experiences.length ? (
							<div className="mt-5 space-y-4">
								{experiences
									.slice(0, 3)
									.map(
										(item: {
											id: string;
											position: string;
											company: string;
											location: string | null;
											start_date: string | null;
											end_date: string | null;
											is_current: boolean;
											description: string | null;
										}) => (
											<div key={item.id} className="flex gap-3">
												<span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]">
													<BriefcaseBusiness size={17} />
												</span>

												<div className="min-w-0 flex-1">
													<p className="text-sm font-extrabold text-[#34495E]">
														{item.position}
													</p>

													<p className="mt-0.5 text-xs font-semibold text-[#667681]">
														{item.company}
														{item.location ? ` · ${item.location}` : ""}
													</p>

													<p className="mt-1 text-[10px] text-[#9AA5AB]">
														{formatDate(item.start_date)} –{" "}
														{item.is_current
															? "Sekarang"
															: formatDate(item.end_date)}
													</p>
												</div>
											</div>
										),
									)}
							</div>
						) : (
							<div className="mt-4 rounded-xl border border-dashed border-[#CBD4D9] bg-[#F8FAFA] px-4 py-5">
								<div className="flex items-start gap-3">
									<span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#53616D]">
										<BriefcaseBusiness size={18} />
									</span>

									<div>
										<p className="text-sm font-semibold text-[#53616D]">
											Belum ada pengalaman kerja.
										</p>

										<p className="mt-1 text-xs leading-5 text-[#8A969D]">
											Fresh graduate tetap bisa menggunakan KerjaLokal. Kamu
											dapat menambahkan pengalaman magang, organisasi, atau
											pekerjaan paruh waktu jika ada.
										</p>

										<Link
											href="/onboarding/job-seeker?edit=1&step=experience"
											className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-[#34495E] hover:underline"
										>
											Tambahkan pengalaman
											<ArrowRight size={13} />
										</Link>
									</div>
								</div>
							</div>
						)}
					</section>
				</div>

				{/* Right sidebar content */}
				<aside className="space-y-6">
					{/* Education */}
					<section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm shadow-[#2C3E50]/[0.02] sm:p-6">
						<div className="flex items-center justify-between gap-2">
							<h2 className="text-base font-extrabold text-[#2C3E50]">
								Pendidikan
							</h2>

							<Link
								href="/onboarding/job-seeker?edit=1&step=education"
								className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#34495E] hover:underline"
							>
								<Plus size={13} />
								Tambah
							</Link>
						</div>

						{educations.length ? (
							<div className="mt-4 space-y-4">
								{educations
									.slice(0, 2)
									.map(
										(item: {
											id: string;
											education_level: string;
											institution: string;
											major: string | null;
											start_year: number | null;
											end_year: number | null;
											is_current: boolean;
										}) => (
											<div key={item.id} className="flex gap-3">
												<span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#ECF0F1] text-[#53616D]">
													<GraduationCap size={17} />
												</span>

												<div className="min-w-0">
													<p className="text-xs font-extrabold text-[#34495E]">
														{item.institution}
													</p>

													<p className="mt-0.5 text-[11px] text-[#7F8C8D]">
														{item.education_level}
														{item.major ? ` · ${item.major}` : ""}
													</p>

													<p className="mt-1 text-[10px] text-[#9AA5AB]">
														{item.start_year || "—"} –{" "}
														{item.is_current
															? "Sekarang"
															: item.end_year || "—"}
													</p>
												</div>
											</div>
										),
									)}
							</div>
						) : (
							<p className="mt-3 text-xs leading-5 text-[#8A969D]">
								Tambahkan pendidikan terakhir untuk memperkuat profilmu.
							</p>
						)}
					</section>

					{/* Certificates */}
					<section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm shadow-[#2C3E50]/[0.02] sm:p-6">
						<div className="flex items-center justify-between gap-2">
							<h2 className="text-base font-extrabold text-[#2C3E50]">
								Sertifikat
							</h2>

							<Link
								href="/onboarding/job-seeker?edit=1&step=certificates"
								className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#34495E] hover:underline"
							>
								<Plus size={13} />
								Tambah
							</Link>
						</div>

						{certificates.length ? (
							<div className="mt-4 space-y-3">
								{certificates
									.slice(0, 2)
									.map(
										(item: {
											id: string;
											certificate_name: string;
											issuer: string;
											issue_date: string | null;
										}) => (
											<div key={item.id} className="flex gap-3">
												<span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#ECF0F1] text-[#53616D]">
													<Award size={17} />
												</span>

												<div className="min-w-0">
													<p className="text-xs font-extrabold text-[#34495E]">
														{item.certificate_name}
													</p>

													<p className="mt-0.5 text-[11px] text-[#7F8C8D]">
														{item.issuer}
													</p>

													<p className="mt-1 text-[10px] text-[#9AA5AB]">
														{formatDate(item.issue_date)}
													</p>
												</div>
											</div>
										),
									)}
							</div>
						) : (
							<p className="mt-3 text-xs leading-5 text-[#8A969D]">
								Sertifikat pelatihan atau kursus bersifat opsional, tetapi dapat
								menambah nilai profil.
							</p>
						)}
					</section>

					{/* Career preference */}
					<section className="rounded-2xl bg-[#E7ECEF] p-5 sm:p-6">
						<div className="flex items-center gap-2 text-[#34495E]">
							<Wallet size={17} />

							<h2 className="text-sm font-extrabold">Preferensi kerja</h2>
						</div>

						<div className="mt-3 space-y-3 text-xs">
							<div className="flex items-start justify-between gap-3">
								<span className="text-[#7F8C8D]">Ketersediaan</span>

								<span className="text-right font-bold text-[#34495E]">
									{jobProfile?.availability || "Belum diatur"}
								</span>
							</div>

							<div className="flex items-start justify-between gap-3">
								<span className="text-[#7F8C8D]">Ekspektasi gaji</span>

								<span className="max-w-[60%] text-right font-bold text-[#34495E]">
									{salaryText}
								</span>
							</div>
						</div>

						<Link
							href="/onboarding/job-seeker?edit=1&step=skills"
							className="mt-4 inline-flex items-center gap-1 text-xs font-extrabold text-[#34495E] hover:underline"
						>
							Ubah preferensi
							<ArrowRight size={13} />
						</Link>
					</section>
				</aside>
			</div>
		</div>
	);
}
