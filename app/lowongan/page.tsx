import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, BriefcaseBusiness } from "lucide-react";
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
};

export default async function PublicJobsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const [{ data: jobs }, roleResult] = await Promise.all([
		supabase
			.from("jobs")
			.select(
				"id,employer_id,title,category,employment_type,city,district,province,salary_min,salary_max,salary_negotiable,application_deadline,created_at,description,responsibilities,requirements,experience_level,education_level",
			)
			.eq("status", "published")
			.order("created_at", { ascending: false }),
		user
			? supabase
					.from("user_roles")
					.select("role")
					.eq("user_id", user.id)
					.maybeSingle()
			: Promise.resolve({ data: null, error: null }),
	]);

	const rows = (jobs ?? []) as PublicJobRow[];
	const employerIds = [...new Set(rows.map((job) => job.employer_id))];
	const { data: employers } = employerIds.length
		? await supabase
				.from("employer_profiles")
				.select("user_id,business_name,business_type")
				.in("user_id", employerIds)
		: { data: [] as EmployerRow[] };

	const employerRows = (employers ?? []) as EmployerRow[];
	const listingJobs = rows.map((job) => ({
		...job,
		business_name:
			employerRows.find((item) => item.user_id === job.employer_id)
				?.business_name ?? "Usaha terverifikasi",
	}));

	const canUseCareerMatch = roleResult.data?.role === "job_seeker";

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
					<CareerMatchJobList
						jobs={listingJobs}
						canUseCareerMatch={canUseCareerMatch}
						isAuthenticated={Boolean(user)}
					/>
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
