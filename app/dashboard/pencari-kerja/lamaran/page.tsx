import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
	ArrowLeft,
	ArrowRight,
	BriefcaseBusiness,
	CalendarDays,
	CheckCircle2,
	Clock3,
	FileText,
	MapPin,
} from "lucide-react";

export const instant = false;

const statusInfo: Record<
	string,
	{ label: string; className: string; description: string }
> = {
	submitted: {
		label: "Lamaran dikirim",
		className: "badge-info",
		description: "Lamaran sudah diterima oleh sistem dan menunggu ditinjau.",
	},
	reviewing: {
		label: "Sedang ditinjau",
		className: "badge-warning",
		description: "Pelaku usaha sedang memeriksa profil dan lamaran kamu.",
	},
	interview: {
		label: "Tahap wawancara",
		className: "badge-primary",
		description:
			"Kamu masuk ke tahap wawancara. Periksa kontak yang kamu cantumkan.",
	},
	accepted: {
		label: "Diterima",
		className: "badge-success",
		description: "Pelaku usaha telah menandai lamaran kamu diterima.",
	},
	rejected: {
		label: "Belum sesuai",
		className: "badge-ghost",
		description:
			"Lamaran ini belum berhasil. Tetap semangat mencari peluang lain.",
	},
};

function dateLabel(value: string) {
	return new Intl.DateTimeFormat("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(value));
}

export default async function JobSeekerApplicationsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect("/auth/login");
	const { data: role } = await supabase
		.from("user_roles")
		.select("role")
		.eq("user_id", user.id)
		.maybeSingle();
	if (role?.role !== "job_seeker") redirect("/dashboard/pelaku-usaha");

	const { data: applications } = await supabase
		.from("job_applications")
		.select(
			"id, job_id, status, applied_at, cover_letter, cv_file_name, cv_generated_at",
		)
		.eq("applicant_id", user.id)
		.order("applied_at", { ascending: false });
	const rows = applications ?? [];
	const jobIds = [...new Set(rows.map((item) => item.job_id))];
	const { data: jobs } = jobIds.length
		? await supabase
				.from("jobs")
				.select(
					"id, title, category, employment_type, city, district, employer_id, status, ban_reason",
				)
				.in("id", jobIds)
		: {
				data: [] as {
					id: string;
					title: string;
					category: string;
					employment_type: string;
					city: string;
					district: string;
					employer_id: string;
					status: string;
					ban_reason: string | null;
				}[],
			};
	const employerIds = [
		...new Set((jobs ?? []).map((item) => item.employer_id)),
	];
	const { data: employers } = employerIds.length
		? await supabase
				.from("employer_profiles")
				.select("user_id, business_name")
				.in("user_id", employerIds)
		: { data: [] as { user_id: string; business_name: string }[] };

	return (
		<div className="space-y-6">
			<header>
				<span className="badge badge-outline border-[#BDC3C7] bg-white text-[10px] font-bold text-[#53616D]">
					RIWAYAT REKRUTMEN
				</span>
				<h1 className="mt-3 text-3xl font-extrabold tracking-tight">
					Lamaran Saya
				</h1>
				<p className="mt-2 text-sm text-[#7F8C8D]">
					Pantau perkembangan setiap lamaran pekerjaan yang kamu kirim.
				</p>
			</header>

			{rows.length ? (
				<div className="space-y-4">
					{rows.map((application) => {
						const job = (jobs ?? []).find(
							(item) => item.id === application.job_id,
						);
						const info = statusInfo[application.status] ?? statusInfo.submitted;
						return (
							<article
								key={application.id}
								className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6"
							>
								<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<h2 className="text-base font-extrabold">
												{job?.title ?? "Lowongan tidak tersedia"}
											</h2>
											<span className={`badge badge-sm ${info.className}`}>
												{info.label}
											</span>
											{job?.status === "banned" && (
												<span className="badge badge-error badge-sm">
													Lowongan diblokir
												</span>
											)}
											{job?.status === "finished" && (
												<span className="badge badge-info badge-sm">
													Lowongan selesai
												</span>
											)}
										</div>
										<p className="mt-1 text-xs font-semibold text-[#667681]">
											{(employers ?? []).find(
												(item) => item.user_id === job?.employer_id,
											)?.business_name ?? "Usaha lokal"}
										</p>
										<div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#8A969D]">
											<span className="inline-flex items-center gap-1">
												<MapPin size={13} />
												{job?.district}, {job?.city}
											</span>
											<span className="inline-flex items-center gap-1">
												<BriefcaseBusiness size={13} />
												{job?.employment_type}
											</span>
											<span className="inline-flex items-center gap-1">
												<CalendarDays size={13} /> Dikirim{" "}
												{dateLabel(application.applied_at)}
											</span>
										</div>
										<p className="mt-3 max-w-2xl text-xs leading-5 text-[#7F8C8D]">
											{info.description}
										</p>
										{application.cv_file_name && (
											<span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#EFF7F1] px-2.5 py-1.5 text-[10px] font-bold text-[#4E765B]">
												<CheckCircle2 size={12} />
												<FileText size={12} /> CV ATS terlampir:{" "}
												{application.cv_file_name}
											</span>
										)}
										{job?.status === "banned" && (
											<p className="mt-3 rounded-lg bg-[#FFF1F1] px-3 py-2 text-[11px] leading-5 text-[#934444]">
												Lowongan ini telah diblokir oleh KerjaLokal setelah
												pemeriksaan keamanan. Lamaran yang sudah kamu kirim
												tetap tercatat, tetapi lowongan tidak lagi menerima
												lamaran baru.
												{job.ban_reason ? ` Catatan: ${job.ban_reason}` : ""}
											</p>
										)}
									</div>
									{job && job.status === "published" && (
										<Link
											href={`/lowongan/${job.id}`}
											className="btn btn-outline btn-sm shrink-0 rounded-lg border-[#BDC3C7] text-xs text-[#34495E]"
										>
											Lihat Lowongan <ArrowRight size={13} />
										</Link>
									)}
								</div>
							</article>
						);
					})}
				</div>
			) : (
				<div className="rounded-2xl border border-dashed border-[#C9D3D8] bg-white px-6 py-16 text-center">
					<span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ECF0F1] text-[#53616D]">
						<Clock3 size={25} />
					</span>
					<h2 className="mt-4 text-base font-extrabold">Belum ada lamaran</h2>
					<p className="mt-2 text-sm text-[#8A969D]">
						Lowongan yang kamu lamar akan tercatat di sini, lengkap dengan
						status seleksinya.
					</p>
					<Link
						href="/lowongan"
						className="btn btn-primary mt-5 rounded-xl border-0 bg-[#2C3E50] text-white"
					>
						Jelajahi Lowongan <ArrowRight size={15} />
					</Link>
				</div>
			)}
		</div>
	);
}
