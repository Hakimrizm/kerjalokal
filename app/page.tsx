import { LandingPage, type LandingJob } from "@/components/landing-page";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

function formatSalary(job: {
  salary_min: number | string | null;
  salary_max: number | string | null;
  salary_negotiable: boolean;
}) {
  const currency = (value: number | string) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value));

  if (job.salary_negotiable && job.salary_min == null && job.salary_max == null) {
    return "Dapat dinegosiasikan";
  }
  if (job.salary_min != null && job.salary_max != null) {
    return `${currency(job.salary_min)} – ${currency(job.salary_max)}`;
  }
  if (job.salary_min != null) return `Mulai ${currency(job.salary_min)}`;
  if (job.salary_max != null) return `Maksimal ${currency(job.salary_max)}`;
  return "Gaji dibicarakan";
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id,employer_id,title,category,employment_type,city,district,salary_min,salary_max,salary_negotiable,application_deadline,created_at",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(8);

  const rows = jobs ?? [];
  const employerIds = [...new Set(rows.map((job) => job.employer_id))];
  const { data: employers } = employerIds.length
    ? await supabase
        .from("employer_profiles")
        .select("user_id,business_name")
        .in("user_id", employerIds)
    : { data: [] as { user_id: string; business_name: string }[] };

  const landingJobs: LandingJob[] = rows.map((job) => {
    const employer = employers?.find((item) => item.user_id === job.employer_id);
    const company = employer?.business_name || "Usaha lokal";
    const district = job.district || "Wilayah belum ditentukan";

    return {
      id: job.id,
      title: job.title,
      company,
      district,
      location: [job.district, job.city].filter(Boolean).join(", ") || "Lokasi tidak tersedia",
      salary: formatSalary(job),
      category: job.category,
      type: job.employment_type,
      initials: company
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
    };
  });

  return <LandingPage jobs={landingJobs} isAuthenticated={Boolean(user)} />;
}
