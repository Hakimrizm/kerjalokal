import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCareerMatch,
  type CareerMatchApplicant,
  type CareerMatchJob,
} from "@/lib/career-match-scoring";

const JOB_ID_LIMIT = 100;

type SkillRow = { skill_name: string };
type ExperienceRow = {
  position: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  description: string | null;
};
type EducationRow = { education_level: string; major: string | null };
type JobRow = CareerMatchJob & { id: string };

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Silakan masuk sebagai pencari kerja untuk melihat kecocokan lowongan." },
        { status: 401 },
      );
    }

    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      return NextResponse.json({ error: "Role pengguna tidak dapat diverifikasi." }, { status: 500 });
    }

    if (roleRow?.role !== "job_seeker") {
      return NextResponse.json(
        { error: "CareerMatch hanya tersedia untuk akun pencari kerja." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const incomingIds = Array.isArray(body?.jobIds) ? body.jobIds : [];
    const jobIds = [...new Set(
      incomingIds.filter((value: unknown): value is string =>
        typeof value === "string" && value.length > 0 && value.length <= 64,
      ),
    )].slice(0, JOB_ID_LIMIT);

    if (!jobIds.length) {
      return NextResponse.json(
        { error: "Daftar lowongan untuk dianalisis belum tersedia." },
        { status: 400 },
      );
    }

    const [
      profileResult,
      preferenceResult,
      skillsResult,
      experiencesResult,
      educationResult,
      jobsResult,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name,province,city,district,village")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("job_seeker_profiles")
        .select("desired_position,job_category,employment_types,expected_salary_min,expected_salary_max")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("job_seeker_skills")
        .select("skill_name")
        .eq("user_id", user.id),
      supabase
        .from("job_seeker_experiences")
        .select("position,start_date,end_date,is_current,description")
        .eq("user_id", user.id),
      supabase
        .from("job_seeker_education")
        .select("education_level,major")
        .eq("user_id", user.id),
      supabase
        .from("jobs")
        .select("id,title,category,employment_type,description,responsibilities,requirements,experience_level,education_level,salary_min,salary_max,salary_negotiable,province,city,district,village")
        .in("id", jobIds)
        .eq("status", "published"),
    ]);

    const queryErrors = [
      profileResult.error,
      preferenceResult.error,
      skillsResult.error,
      experiencesResult.error,
      educationResult.error,
      jobsResult.error,
    ].filter(Boolean);

    if (queryErrors.length) {
      console.error("CareerMatch batch query error:", queryErrors);
      return NextResponse.json(
        { error: "Data profil atau lowongan gagal dibaca. Silakan coba kembali." },
        { status: 500 },
      );
    }

    const skillRows = (skillsResult.data ?? []) as SkillRow[];
    const experienceRows = (experiencesResult.data ?? []) as ExperienceRow[];
    const educationRows = (educationResult.data ?? []) as EducationRow[];
    const jobRows = (jobsResult.data ?? []) as JobRow[];

    const applicant: CareerMatchApplicant = {
      profile: profileResult.data,
      preferences: preferenceResult.data,
      skills: skillRows.map((item) => item.skill_name),
      experiences: experienceRows.map((item) => ({
        position: item.position,
        start_date: item.start_date,
        end_date: item.end_date,
        is_current: item.is_current,
        description: item.description,
      })),
      education: educationRows.map((item) => ({
        education_level: item.education_level,
        major: item.major,
      })),
    };

    const scores = Object.fromEntries(
      jobRows.map((job) => {
        const jobData: CareerMatchJob = {
          title: job.title,
          category: job.category,
          employment_type: job.employment_type,
          description: job.description,
          responsibilities: job.responsibilities,
          requirements: job.requirements,
          experience_level: job.experience_level,
          education_level: job.education_level,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          salary_negotiable: job.salary_negotiable,
          province: job.province,
          city: job.city,
          district: job.district,
          village: job.village,
        };

        return [job.id, calculateCareerMatch(applicant, jobData)];
      }),
    );

    return NextResponse.json({
      success: true,
      data: scores,
      analyzed_count: Object.keys(scores).length,
      requested_count: jobIds.length,
    });
  } catch (error) {
    console.error("CareerMatch batch API error:", error);
    return NextResponse.json(
      { error: "Terjadi kendala saat menghitung kecocokan lowongan." },
      { status: 500 },
    );
  }
}
