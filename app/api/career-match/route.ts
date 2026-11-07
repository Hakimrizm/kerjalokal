import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeCareerMatch, ApplicantData, JobData } from "@/lib/career-match";

function formatSalary(job: {
  salary_min: number | null;
  salary_max: number | null;
  salary_negotiable: boolean;
}) {
  if (job.salary_negotiable && job.salary_min == null && job.salary_max == null) {
    return "Dapat dinegosiasikan";
  }
  const curr = (val: number | null) =>
    val == null
      ? null
      : new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(val);

  if (job.salary_min != null && job.salary_max != null) {
    return `${curr(job.salary_min)} – ${curr(job.salary_max)}`;
  }
  if (job.salary_min != null) return `Mulai ${curr(job.salary_min)}`;
  if (job.salary_max != null) return `Maksimal ${curr(job.salary_max)}`;
  return "Sesuai kesepakatan";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Silakan login terlebih dahulu untuk menggunakan CareerMatch AI." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { jobId, applicantId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: "Parameter jobId wajib disertakan." },
        { status: 400 }
      );
    }

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = roleRow?.role || "job_seeker";

    let targetApplicantId = user.id;
    if (role === "employer" || role === "admin" || role === "super_admin") {
      if (applicantId) {
        targetApplicantId = applicantId;
      }
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError || !job) {
      return NextResponse.json(
        { error: "Data lowongan pekerjaan tidak ditemukan." },
        { status: 404 }
      );
    }

    if (role === "employer" && job.employer_id !== user.id) {
      return NextResponse.json(
        { error: "Anda hanya dapat memeriksa kecocokan pelamar pada lowongan milik usaha Anda." },
        { status: 403 }
      );
    }

    const { data: employer } = await supabase
      .from("employer_profiles")
      .select("business_name, business_type, description")
      .eq("user_id", job.employer_id)
      .maybeSingle();

    const [
      profileRes,
      jobProfileRes,
      skillsRes,
      experiencesRes,
      educationRes,
      certificatesRes,
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", targetApplicantId).maybeSingle(),
      supabase.from("job_seeker_profiles").select("*").eq("user_id", targetApplicantId).maybeSingle(),
      supabase.from("job_seeker_skills").select("skill_name").eq("user_id", targetApplicantId),
      supabase.from("job_seeker_experiences").select("*").eq("user_id", targetApplicantId).order("start_date", { ascending: false }),
      supabase.from("job_seeker_education").select("*").eq("user_id", targetApplicantId).order("start_year", { ascending: false }),
      supabase.from("job_seeker_certificates").select("*").eq("user_id", targetApplicantId),
    ]);

    const profile = profileRes.data;
    const jobProfile = jobProfileRes.data;
    const skills = (skillsRes.data ?? []).map((s) => s.skill_name);
    const experiences = (experiencesRes.data ?? []).map((e) => ({
      position: e.position,
      company: e.company,
      duration: `${e.start_date || ""} s/d ${e.is_current ? "Sekarang" : e.end_date || ""}`,
      description: e.description,
    }));
    const education = (educationRes.data ?? []).map((ed) => ({
      level: ed.education_level,
      institution: ed.institution,
      major: ed.major,
    }));
    const certificates = (certificatesRes.data ?? []).map((c) => ({
      name: c.certificate_name,
      issuer: c.issuer,
    }));

    const applicantData: ApplicantData = {
      fullName: profile?.full_name || "Pelamar KerjaLokal",
      location: [profile?.village, profile?.district, profile?.city, profile?.province]
        .filter(Boolean)
        .join(", "),
      desiredPosition: jobProfile?.desired_position,
      summary: jobProfile?.summary,
      skills,
      experiences,
      education,
      certificates,
    };

    const jobData: JobData = {
      title: job.title,
      category: job.category,
      companyName: employer?.business_name || "Usaha Lokal",
      employmentType: job.employment_type,
      experienceLevel: job.experience_level,
      educationLevel: job.education_level,
      location: [job.village, job.district, job.city, job.province].filter(Boolean).join(", "),
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      salaryText: formatSalary(job),
    };

    const analysis = await analyzeCareerMatch(applicantData, jobData);

    return NextResponse.json({
      success: true,
      data: analysis,
      applicant: {
        id: targetApplicantId,
        name: applicantData.fullName,
      },
      job: {
        id: job.id,
        title: job.title,
        company: jobData.companyName,
      },
    });
  } catch (err: any) {
    console.error("CareerMatch API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Terjadi kendala saat menganalisis kecocokan karier." },
      { status: 500 }
    );
  }
}

