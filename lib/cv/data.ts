import type { SupabaseClient } from "@supabase/supabase-js";

export type CvExperience = {
  company: string;
  position: string;
  employment_type: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
};

export type CvEducation = {
  education_level: string;
  institution: string;
  major: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
  description: string | null;
};

export type CvCertificate = {
  certificate_name: string;
  issuer: string;
  issue_date: string | null;
  expiry_date: string | null;
  credential_url: string | null;
  description: string | null;
};

export type JobSeekerCvData = {
  fullName: string;
  photoPath?: string | null;
  photoUrl?: string | null;
  email: string;
  phone: string;
  location: string;
  desiredPosition: string;
  summary: string;
  linkedinUrl: string;
  portfolioUrl: string;
  languages: string[];
  skills: string[];
  experiences: CvExperience[];
  education: CvEducation[];
  certificates: CvCertificate[];
};

export async function loadJobSeekerCvData(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
  fallbackName?: string | null,
): Promise<JobSeekerCvData> {
  const [
    profileResult,
    preferenceResult,
    skillsResult,
    educationResult,
    experienceResult,
    certificateResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,phone,province,city,district,village,photo_path")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("job_seeker_profiles")
      .select("desired_position,summary,linkedin_url,portfolio_url,languages")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("job_seeker_skills")
      .select("skill_name")
      .eq("user_id", userId)
      .order("skill_name"),
    supabase
      .from("job_seeker_education")
      .select("education_level,institution,major,start_year,end_year,is_current,description")
      .eq("user_id", userId)
      .order("start_year", { ascending: false }),
    supabase
      .from("job_seeker_experiences")
      .select("company,position,employment_type,location,start_date,end_date,is_current,description")
      .eq("user_id", userId)
      .order("start_date", { ascending: false }),
    supabase
      .from("job_seeker_certificates")
      .select("certificate_name,issuer,issue_date,expiry_date,credential_url,description")
      .eq("user_id", userId)
      .order("issue_date", { ascending: false }),
  ]);

  const profile = profileResult.data;
  const preference = preferenceResult.data;

  return {
    fullName: profile?.full_name || fallbackName || "Pencari Kerja",
    photoPath: profile?.photo_path || null,
    email: email || "",
    phone: profile?.phone || "",
    location: [profile?.village, profile?.district, profile?.city, profile?.province]
      .filter(Boolean)
      .join(", "),
    desiredPosition: preference?.desired_position || "",
    summary: preference?.summary || "",
    linkedinUrl: preference?.linkedin_url || "",
    portfolioUrl: preference?.portfolio_url || "",
    languages: preference?.languages || [],
    skills: (skillsResult.data || []).map((item) => item.skill_name).filter(Boolean),
    experiences: (experienceResult.data || []) as CvExperience[],
    education: (educationResult.data || []) as CvEducation[],
    certificates: (certificateResult.data || []) as CvCertificate[],
  };
}
