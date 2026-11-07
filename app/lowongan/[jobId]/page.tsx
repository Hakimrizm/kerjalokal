import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobApplicationButton } from "@/components/job-application-button";
import { FraudReportButton } from "@/components/fraud-report-button";
import {
	ArrowLeft,
	BriefcaseBusiness,
	Building2,
	CalendarDays,
	GraduationCap,
	MapPin,
	Users,
	Wallet,
} from "lucide-react";

export const instant = false;

type PageProps = { params: Promise<{ jobId: string }> };
function currency(value: number | null) {
	return value == null
		? null
		: new Intl.NumberFormat("id-ID", {
				style: "currency",
				currency: "IDR",
				maximumFractionDigits: 0,
			}).format(value);
}
function salaryLabel(job: {
	salary_min: number | null;
	salary_max: number | null;
	salary_negotiable: boolean;
}) {
	if (job.salary_negotiable && job.salary_min == null && job.salary_max == null)
		return "Dapat dinegosiasikan";
	if (job.salary_min != null && job.salary_max != null)
		return `${currency(job.salary_min)} – ${currency(job.salary_max)}`;
	if (job.salary_min != null) return `Mulai ${currency(job.salary_min)}`;
	if (job.salary_max != null) return `Maksimal ${currency(job.salary_max)}`;
	return "Dibicarakan saat seleksi";
}

export default async function PublicJobDetailPage({ params }: PageProps) {
	const { jobId } = await params;
	const supabase = await createClient();
	const { data: job } = await supabase
		.from("jobs")
		.select("*")
		.eq("id", jobId)
		.eq("status", "published")
		.maybeSingle();
	if (!job) notFound();
	const { data: employer } = await supabase
		.from("employer_profiles")
		.select(
			"business_name,business_type,description,province,city,district,village,address,website",
		)
		.eq("user_id", job.employer_id)
		.maybeSingle();

	// Hanya akun pencari kerja yang boleh mengirim lamaran.
	// Pengunjung tanpa sesi tetap dapat menekan tombol untuk diarahkan login
	// melalui alur pengiriman lamaran yang sudah tersedia.
	const {
		data: { user },
	} = await supabase.auth.getUser();
	let canApply = !user;

	if (user) {
		const { data: roleRow } = await supabase
			.from("user_roles")
			.select("role")
			.eq("user_id", user.id)
			.maybeSingle();
		canApply = roleRow?.role === "job_seeker";
	}

	return (
		<main className="min-h-screen bg-[#F3F5F6] px-4 py-7 text-[#2C3E50] sm:px-6 lg:px-8">
			<div className="mx-auto max-w-5xl">
				<header className="mb-6 flex items-center justify-between gap-3">
					<Link
						href="/lowongan"
						className="inline-flex items-center gap-2 text-[13px] font-extrabold text-[#284B67] transition-colors hover:text-[#2C3E50]"
					>
						<ArrowLeft size={16} /> Kembali
					</Link>
					<Link href="/dashboard" className="text-sm font-extrabold">
						kerja<span className="text-[#7F8C8D]">lokal</span>
					</Link>
				</header>
				<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
					<article className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
						<div className="bg-[#2C3E50] p-6 text-white sm:p-8">
							<span className="badge badge-outline border-white/30 text-[10px] text-white">
								{job.category}
							</span>
							<h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
								{job.title}
							</h1>
							<p className="mt-2 text-sm text-white/70">
								{employer?.business_name ?? "Usaha lokal"} ·{" "}
								{job.employment_type}
							</p>
							<div className="mt-5 flex flex-wrap gap-4 text-xs text-white/70">
								<span className="inline-flex items-center gap-1.5">
									<MapPin size={14} />
									{job.district}, {job.city}
								</span>
								<span className="inline-flex items-center gap-1.5">
									<Users size={14} />
									{job.vacancies} posisi
								</span>
							</div>
						</div>
						<div className="space-y-7 p-6 sm:p-8">
							<section>
								<h2 className="text-sm font-extrabold">Tentang pekerjaan</h2>
								<p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#667681]">
									{job.description}
								</p>
							</section>
							{job.responsibilities && (
								<section>
									<h2 className="text-sm font-extrabold">Tanggung jawab</h2>
									<p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#667681]">
										{job.responsibilities}
									</p>
								</section>
							)}
							<section>
								<h2 className="text-sm font-extrabold">Persyaratan kandidat</h2>
								<p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#667681]">
									{job.requirements}
								</p>
							</section>
							<section>
								<h2 className="text-sm font-extrabold">Kualifikasi</h2>
								<div className="mt-3 grid gap-3 sm:grid-cols-2">
									<div className="rounded-xl bg-[#F5F7F8] p-3">
										<p className="text-[10px] font-bold text-[#9AA5AB]">
											PENGALAMAN
										</p>
										<p className="mt-1 text-xs font-semibold">
											{job.experience_level || "Tidak ditentukan"}
										</p>
									</div>
									<div className="rounded-xl bg-[#F5F7F8] p-3">
										<p className="text-[10px] font-bold text-[#9AA5AB]">
											PENDIDIKAN
										</p>
										<p className="mt-1 text-xs font-semibold">
											{job.education_level || "Tidak ditentukan"}
										</p>
									</div>
								</div>
							</section>
							<section>
								<h2 className="text-sm font-extrabold">Lokasi kerja</h2>
								<p className="mt-3 text-sm leading-7 text-[#667681]">
									{[
										job.address,
										job.village,
										job.district,
										job.city,
										job.province,
									]
										.filter(Boolean)
										.join(", ")}
								</p>
							</section>
						</div>
					</article>
					<aside className="space-y-4 lg:sticky lg:top-6">
						<section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm">
							<h2 className="text-sm font-extrabold">Ringkasan lowongan</h2>
							<div className="mt-4 space-y-4 text-xs">
								<div className="flex items-start gap-3">
									<Wallet size={16} className="text-[#7F8C8D]" />
									<div>
										<p className="text-[#9AA5AB]">Kisaran gaji</p>
										<p className="mt-1 font-bold text-[#34495E]">
											{salaryLabel(job)}
										</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<BriefcaseBusiness size={16} className="text-[#7F8C8D]" />
									<div>
										<p className="text-[#9AA5AB]">Tipe pekerjaan</p>
										<p className="mt-1 font-bold text-[#34495E]">
											{job.employment_type}
										</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<GraduationCap size={16} className="text-[#7F8C8D]" />
									<div>
										<p className="text-[#9AA5AB]">Pendidikan</p>
										<p className="mt-1 font-bold text-[#34495E]">
											{job.education_level || "Tidak ditentukan"}
										</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<CalendarDays size={16} className="text-[#7F8C8D]" />
									<div>
										<p className="text-[#9AA5AB]">Batas lamaran</p>
										<p className="mt-1 font-bold text-[#34495E]">
											{job.application_deadline
												? new Intl.DateTimeFormat("id-ID", {
														day: "numeric",
														month: "long",
														year: "numeric",
													}).format(
														new Date(`${job.application_deadline}T00:00:00`),
													)
												: "Tidak ditentukan"}
										</p>
									</div>
								</div>
							</div>
							<div className="mt-5 border-t border-[#EEF1F2] pt-5">
								<JobApplicationButton jobId={job.id} canApply={canApply} />
								<FraudReportButton jobId={job.id} />
							</div>
						</section>
						<section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm">
							<div className="flex items-center gap-2">
								<Building2 size={17} className="text-[#53616D]" />
								<h2 className="text-sm font-extrabold">Tentang usaha</h2>
							</div>
							<p className="mt-3 text-sm font-bold text-[#34495E]">
								{employer?.business_name ?? "Usaha lokal"}
							</p>
							<p className="mt-1 text-xs text-[#8A969D]">
								{employer?.business_type}
							</p>
							{employer?.description && (
								<p className="mt-3 text-xs leading-6 text-[#7F8C8D]">
									{employer.description}
								</p>
							)}
						</section>
					</aside>
				</div>
			</div>
		</main>
	);
}
