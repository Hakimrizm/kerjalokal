import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
	ArrowLeft,
	BriefcaseBusiness,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { CareerMatchJobList } from "@/components/career-match-job-list";

export const instant = false;

type PublicJobRow = {
	id: string;
	employer_id: string;
	title: string;
	category: string;
	employment_type: string;
	city: string;
	district: string;
	province: string;
	village: string | null;
	latitude: number | null;
	longitude: number | null;
	salary_min: number | null;
	salary_max: number | null;
	salary_negotiable: boolean;
	application_deadline: string | null;
	created_at: string;
	description: string;
	responsibilities: string | null;
	requirements: string;
	experience_level: string | null;
	education_level: string | null;
};

type EmployerRow = {
	user_id: string;
	business_name: string | null;
	business_type: string | null;
	latitude: number | null;
	longitude: number | null;
};

function validCoordinates(latitude: unknown, longitude: unknown) {
	const lat = Number(latitude);
	const lng = Number(longitude);
	return (
		latitude !== null &&
		latitude !== undefined &&
		latitude !== "" &&
		longitude !== null &&
		longitude !== undefined &&
		longitude !== "" &&
		Number.isFinite(lat) &&
		Number.isFinite(lng) &&
		lat >= -90 &&
		lat <= 90 &&
		lng >= -180 &&
		lng <= 180
	);
}

// Menghitung jarak garis lurus antara dua koordinat menggunakan rumus Haversine.
function calculateDistanceKm(
	startLatitude: number,
	startLongitude: number,
	endLatitude: number,
	endLongitude: number,
) {
	const earthRadiusKm = 6371;
	const toRadians = (degree: number) => (degree * Math.PI) / 180;
	const latitudeDifference = toRadians(endLatitude - startLatitude);
	const longitudeDifference = toRadians(endLongitude - startLongitude);
	const startLatRadians = toRadians(startLatitude);
	const endLatRadians = toRadians(endLatitude);

	const haversine =
		Math.sin(latitudeDifference / 2) ** 2 +
		Math.cos(startLatRadians) *
			Math.cos(endLatRadians) *
			Math.sin(longitudeDifference / 2) ** 2;
	const safeHaversine = Math.min(1, Math.max(0, haversine));

	return (
		earthRadiusKm *
		2 *
		Math.atan2(Math.sqrt(safeHaversine), Math.sqrt(1 - safeHaversine))
	);
}

const ITEMS_PER_PAGE = 5;

export default async function PublicJobsPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const resolvedSearchParams = await searchParams;
	const pageParam = Number(resolvedSearchParams.page);
	const currentPage =
		Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const from = (currentPage - 1) * ITEMS_PER_PAGE;
	const to = from + ITEMS_PER_PAGE - 1;

	const [countResult, jobsResult, roleResult, profileResult] =
		await Promise.all([
			supabase
				.from("jobs")
				.select("id", { count: "exact", head: true })
				.eq("status", "published"),
			supabase
				.from("jobs")
				.select(
					"id,employer_id,title,category,employment_type,city,district,province,village,latitude,longitude,salary_min,salary_max,salary_negotiable,application_deadline,created_at,description,responsibilities,requirements,experience_level,education_level",
				)
				.eq("status", "published")
				.order("created_at", { ascending: false })
				.range(from, to),
			user
				? supabase
						.from("user_roles")
						.select("role")
						.eq("user_id", user.id)
						.maybeSingle()
				: Promise.resolve({ data: null, error: null }),
			user
				? supabase
						.from("profiles")
						.select("latitude,longitude")
						.eq("id", user.id)
						.maybeSingle()
				: Promise.resolve({ data: null, error: null }),
		]);

	const totalJobs = countResult.count ?? 0;
	const totalPages = Math.ceil(totalJobs / ITEMS_PER_PAGE) || 1;
	const rows = (jobsResult.data ?? []) as PublicJobRow[];

	const employerIds = [...new Set(rows.map((job) => job.employer_id))];
	const { data: employers } = employerIds.length
		? await supabase
				.from("employer_profiles")
				.select("user_id,business_name,business_type,latitude,longitude")
				.in("user_id", employerIds)
		: { data: [] as EmployerRow[] };

	const employerRows = (employers ?? []) as EmployerRow[];
	const employerMap = new Map(
		employerRows.map((employer) => [employer.user_id, employer]),
	);
	const canUseCareerMatch = roleResult.data?.role === "job_seeker";
	const hasApplicantCoordinates =
		canUseCareerMatch &&
		validCoordinates(
			profileResult.data?.latitude,
			profileResult.data?.longitude,
		);
	const applicantLatitude = hasApplicantCoordinates
		? Number(profileResult.data?.latitude)
		: null;
	const applicantLongitude = hasApplicantCoordinates
		? Number(profileResult.data?.longitude)
		: null;

	const listingJobs = rows.map((job) => {
		const employer = employerMap.get(job.employer_id);
		const jobLatitude = validCoordinates(job.latitude, job.longitude)
			? Number(job.latitude)
			: validCoordinates(employer?.latitude, employer?.longitude)
				? Number(employer?.latitude)
				: null;
		const jobLongitude = validCoordinates(job.latitude, job.longitude)
			? Number(job.longitude)
			: validCoordinates(employer?.latitude, employer?.longitude)
				? Number(employer?.longitude)
				: null;

		const distance =
			applicantLatitude !== null &&
			applicantLongitude !== null &&
			jobLatitude !== null &&
			jobLongitude !== null
				? calculateDistanceKm(
						applicantLatitude,
						applicantLongitude,
						jobLatitude,
						jobLongitude,
					)
				: null;

		return {
			...job,
			business_name: employer?.business_name ?? "Usaha terverifikasi",
			distance_km: distance === null ? null : Math.round(distance * 10) / 10,
		};
	});

	return (
		<main className="min-h-screen bg-[#F3F5F6] px-4 py-8 text-[#2C3E50] sm:px-6 lg:px-8">
			<div className="mx-auto max-w-6xl">
				<header className="mb-8 flex flex-wrap items-center justify-between gap-3">
					<Link
						href="/dashboard"
						className="inline-flex items-center gap-2 text-[13px] font-extrabold text-[#284B67] transition-colors hover:text-[#2C3E50]"
					>
						<ArrowLeft size={15} /> Kembali
					</Link>
					<Link href="/" className="flex items-center gap-3">
						<span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2C3E50] text-white">
							<BriefcaseBusiness size={19} />
						</span>
						<span className="text-lg font-extrabold tracking-tight">
							kerja<span className="text-[#7F8C8D]">lokal</span>
						</span>
					</Link>
				</header>

				<div className="mb-7">
					<span className="badge badge-outline border-[#BDC3C3] bg-white text-[10px] font-bold text-[#53616D]">
						LOWONGAN TERBIT
					</span>
					<h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
						Temukan pekerjaan di sekitar kamu.
					</h1>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-[#7F8C8D]">
						Lihat seluruh lowongan aktif dari usaha lokal dan temukan peluang
						yang paling sesuai dengan kualifikasi serta preferensi kerjamu.
					</p>
				</div>

				{listingJobs.length ? (
					<div className="space-y-8">
						<CareerMatchJobList
							jobs={listingJobs}
							canUseCareerMatch={canUseCareerMatch}
							isAuthenticated={Boolean(user)}
							hasApplicantCoordinates={hasApplicantCoordinates}
						/>

						{/* Pagination Controls */}
						{totalPages > 1 && (
							<nav
								aria-label="Navigasi Halaman Lowongan"
								className="flex items-center justify-between rounded-2xl border border-[#E2E7E9] bg-white px-5 py-4 shadow-sm"
							>
								<div className="text-xs text-[#7F8C8D]">
									Halaman{" "}
									<span className="font-extrabold text-[#2C3E50]">
										{currentPage}
									</span>{" "}
									dari{" "}
									<span className="font-extrabold text-[#2C3E50]">
										{totalPages}
									</span>{" "}
									(Total {totalJobs} lowongan)
								</div>

								<div className="flex items-center gap-2">
									{currentPage > 1 ? (
										<Link
											href={`/jobs?page=${currentPage - 1}`}
											className="inline-flex items-center gap-1 rounded-xl border border-[#E2E7E9] bg-white px-3 py-2 text-xs font-bold text-[#34495E] transition-colors hover:bg-[#F3F5F6]"
										>
											<ChevronLeft size={14} /> Sebelumnya
										</Link>
									) : (
										<span className="inline-flex items-center gap-1 rounded-xl border border-[#E2E7E9] bg-[#F7F9FA] px-3 py-2 text-xs font-bold text-[#BDC3C3] cursor-not-allowed">
											<ChevronLeft size={14} /> Sebelumnya
										</span>
									)}

									{currentPage < totalPages ? (
										<Link
											href={`/jobs?page=${currentPage + 1}`}
											className="inline-flex items-center gap-1 rounded-xl border border-[#E2E7E9] bg-white px-3 py-2 text-xs font-bold text-[#34495E] transition-colors hover:bg-[#F3F5F6]"
										>
											Selanjutnya <ChevronRight size={14} />
										</Link>
									) : (
										<span className="inline-flex items-center gap-1 rounded-xl border border-[#E2E7E9] bg-[#F7F9FA] px-3 py-2 text-xs font-bold text-[#BDC3C3] cursor-not-allowed">
											Selanjutnya <ChevronRight size={14} />
										</span>
									)}
								</div>
							</nav>
						)}
					</div>
				) : (
					<div className="rounded-2xl border border-dashed border-[#C9D3D8] bg-white px-6 py-16 text-center">
						<span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#ECF0F1] text-[#53616D]">
							<BriefcaseBusiness size={25} />
						</span>
						<h2 className="mt-4 text-base font-extrabold">
							Belum ada lowongan yang tayang
						</h2>
						<p className="mt-2 text-sm text-[#8A969D]">
							Belum ada lowongan aktif. Coba periksa kembali nanti.
						</p>
					</div>
				)}
			</div>
		</main>
	);
}
