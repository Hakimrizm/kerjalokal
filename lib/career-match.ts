// lib/career-match.ts

export type SkillMatch = {
  skill: string;
  status: "matched" | "partial" | "missing";
};

export type CareerMatchResult = {
  match_score: number;
  verdict: "Sangat Cocok" | "Cocok" | "Cukup Cocok" | "Perlu Penyesuaian";
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  skill_matches: SkillMatch[];
  source: "gemini" | "heuristic";
};

export type ApplicantData = {
  fullName: string;
  location?: string | null;
  desiredPosition?: string | null;
  summary?: string | null;
  skills: string[];
  experiences: {
    position: string;
    company: string;
    duration?: string;
    description?: string | null;
  }[];
  education: {
    level: string;
    institution: string;
    major?: string | null;
  }[];
  certificates: {
    name: string;
    issuer?: string | null;
  }[];
};

export type JobData = {
  title: string;
  category: string;
  companyName: string;
  employmentType: string;
  experienceLevel?: string | null;
  educationLevel?: string | null;
  location: string;
  description: string;
  responsibilities?: string | null;
  requirements: string;
  salaryText?: string | null;
};

export async function analyzeCareerMatch(
  applicant: ApplicantData,
  job: JobData
): Promise<CareerMatchResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const prompt = `Anda adalah "CareerMatch AI", sistem kecerdasan buatan cerdas untuk platform ketenagakerjaan lokal "KerjaLokal".
Tugas Anda adalah menganalisis kecocokan antara kualifikasi seorang pelamar kerja dengan spesifikasi lowongan pekerjaan secara objektif, mendalam, dan konstruktif.

=== DATA PELAMAR ===
- Nama: ${applicant.fullName}
- Lokasi: ${applicant.location || "Tidak dicantumkan"}
- Posisi yang diminati: ${applicant.desiredPosition || "Tidak dicantumkan"}
- Ringkasan Profil: ${applicant.summary || "Belum ada ringkasan"}
- Keahlian / Keterampilan: ${applicant.skills.length ? applicant.skills.join(", ") : "Belum dicantumkan"}
- Riwayat Pengalaman Kerja:
${
  applicant.experiences.length
    ? applicant.experiences
        .map(
          (e) =>
            `  * ${e.position} di ${e.company}${e.duration ? ` (${e.duration})` : ""}${
              e.description ? `: ${e.description}` : ""
            }`
        )
        .join("\n")
    : "  * Belum ada pengalaman kerja formal"
}
- Riwayat Pendidikan:
${
  applicant.education.length
    ? applicant.education
        .map((ed) => `  * ${ed.level} - ${ed.institution}${ed.major ? ` (${ed.major})` : ""}`)
        .join("\n")
    : "  * Tidak dicantumkan"
}
- Sertifikasi & Pelatihan:
${
  applicant.certificates.length
    ? applicant.certificates
        .map((c) => `  * ${c.name}${c.issuer ? ` (${c.issuer})` : ""}`)
        .join("\n")
    : "  * Tidak ada sertifikasi"
}

=== DATA LOWONGAN PEKERJAAN ===
- Posisi: ${job.title}
- Nama Usaha/Perusahaan: ${job.companyName}
- Kategori: ${job.category}
- Tipe Pekerjaan: ${job.employmentType}
- Lokasi Kerja: ${job.location}
- Tingkat Pengalaman Dicari: ${job.experienceLevel || "Tidak ditentukan"}
- Tingkat Pendidikan Dicari: ${job.educationLevel || "Tidak ditentukan"}
- Kisaran Gaji: ${job.salaryText || "Sesuai kesepakatan"}
- Deskripsi Pekerjaan:
${job.description}
${job.responsibilities ? `- Tanggung Jawab Utama:\n${job.responsibilities}` : ""}
- Persyaratan Kandidat:
${job.requirements}

=== INSTRUKSI ANALISIS ===
1. Nilai kecocokan secara objektif berdasarkan keterampilan (skills), pengalaman relevan, pendidikan, dan kesesuaian lokasi.
2. Berikan "match_score" integer antara 0 sampai 100:
   - 85-100: "Sangat Cocok"
   - 70-84: "Cocok"
   - 50-69: "Cukup Cocok"
   - 0-49: "Perlu Penyesuaian"
3. "summary": Ringkasan 2-3 kalimat dalam bahasa Indonesia yang ramah, profesional, dan to the point.
4. "strengths": 3-5 poin kekuatan pelamar yang paling sesuai dengan kebutuhan lowongan.
5. "gaps": 1-3 poin perbedaan atau kualifikasi yang belum terpenuhi / perlu ditingkatkan (jika ada).
6. "recommendations": 2-3 saran praktis bagi pelamar untuk mempersiapkan diri atau menghadapi proses seleksi.
7. "skill_matches": Analisis 3-6 keterampilan kunci dari lowongan, dengan status "matched" (dikuasai pelamar), "partial" (relevan tapi belum spesifik), atau "missing" (belum ada di profil).

Kembalikan respon DALAM FORMAT JSON MURNI sesuai skema:
{
  "match_score": number,
  "verdict": "Sangat Cocok" | "Cocok" | "Cukup Cocok" | "Perlu Penyesuaian",
  "summary": string,
  "strengths": string[],
  "gaps": string[],
  "recommendations": string[],
  "skill_matches": [
    { "skill": string, "status": "matched" | "partial" | "missing" }
  ]
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text) as Omit<CareerMatchResult, "source">;
          return {
            ...parsed,
            source: "gemini",
          };
        }
      } else {
        console.warn("Gemini API call returned non-OK status:", response.status);
      }
    } catch (err) {
      console.error("Gemini API invocation error, using fallback heuristic:", err);
    }
  }

  // Fallback heuristic matcher if Gemini is unavailable
  return fallbackHeuristicMatch(applicant, job);
}

function fallbackHeuristicMatch(
  applicant: ApplicantData,
  job: JobData
): CareerMatchResult {
<<<<<<< HEAD
  const reqLower = `${job.title} ${job.category} ${job.description} ${job.requirements} ${job.responsibilities || ""}`.toLowerCase();
  const skillMatches: SkillMatch[] = applicant.skills.map((skill) => {
    const normalized = skill.toLowerCase().trim();
    if (normalized && reqLower.includes(normalized)) {
      return { skill, status: "matched" };
    }

    const words = normalized.split(/\s+/).filter((word) => word.length > 2);
    const overlap = words.filter((word) => reqLower.includes(word)).length;
    if (words.length > 1 && overlap > 0) {
      return { skill, status: "partial" };
    }
    return { skill, status: "missing" };
  });

  const matchedSkillsCount = skillMatches.filter((item) => item.status === "matched").length;
  const partialSkillsCount = skillMatches.filter((item) => item.status === "partial").length;
  const hasExp = applicant.experiences.length > 0;
  const expMatch = applicant.experiences.some((experience) =>
    reqLower.includes(experience.position.toLowerCase())
  );
  const hasEducation = applicant.education.length > 0;
  const hasCertificates = applicant.certificates.length > 0;
  const positionMatch = Boolean(
    applicant.desiredPosition &&
    (job.title.toLowerCase().includes(applicant.desiredPosition.toLowerCase()) ||
      applicant.desiredPosition.toLowerCase().includes(job.title.toLowerCase()))
  );

  let score = 35;
  if (applicant.skills.length) {
    score += Math.round(
      ((matchedSkillsCount + partialSkillsCount * 0.5) / applicant.skills.length) * 35
    );
  }
  if (expMatch) score += 15;
  else if (hasExp) score += 8;
  if (hasEducation) score += 8;
  if (positionMatch) score += 7;
  if (hasCertificates) score += 5;
  score = Math.max(0, Math.min(score, 98));

  let verdict: CareerMatchResult["verdict"] = "Perlu Penyesuaian";
  if (score >= 85) verdict = "Sangat Cocok";
  else if (score >= 70) verdict = "Cocok";
  else if (score >= 50) verdict = "Cukup Cocok";

  const strengths: string[] = [];
  if (matchedSkillsCount) {
    strengths.push(`Keahlian yang disebut langsung pada lowongan: ${skillMatches
      .filter((item) => item.status === "matched")
      .map((item) => item.skill)
      .slice(0, 4)
      .join(", ")}`);
  }
  if (expMatch) strengths.push("Posisi pada pengalaman kerja memiliki keterkaitan langsung dengan lowongan.");
  else if (hasExp) strengths.push("Memiliki riwayat pengalaman kerja yang dapat dijelaskan lebih lanjut.");
  if (hasEducation) strengths.push("Riwayat pendidikan sudah tersedia pada profil.");

  const gaps: string[] = [];
  const missingSkills = skillMatches
    .filter((item) => item.status === "missing")
    .map((item) => item.skill);
  if (missingSkills.length) gaps.push(`Keahlian yang belum terlihat pada deskripsi lowongan: ${missingSkills.slice(0, 4).join(", ")}.`);
  if (!hasExp) gaps.push("Riwayat pengalaman kerja belum dicantumkan; tonjolkan proyek, magang, atau pengalaman organisasi bila ada.");
  if (!hasEducation) gaps.push("Riwayat pendidikan belum dicantumkan pada profil.");

  const summary =
    score >= 85
      ? `Beberapa atribut profil ${applicant.fullName} terlihat sangat selaras dengan lowongan ${job.title}. Tetap periksa persyaratan rinci sebelum mengirim lamaran.`
      : score >= 70
        ? `Profil ${applicant.fullName} memiliki sejumlah kecocokan dengan lowongan ${job.title}, tetapi ada beberapa hal yang perlu dipastikan kembali.`
        : score >= 50
          ? `Profil ${applicant.fullName} memiliki kecocokan sebagian dengan lowongan ${job.title}. Perhatikan persyaratan yang belum terlihat pada profil.`
          : `Kecocokan profil ${applicant.fullName} dengan lowongan ${job.title} masih terbatas berdasarkan informasi yang tersedia.`;
=======
  const reqLower = `${job.title} ${job.description} ${job.requirements} ${job.responsibilities || ""}`.toLowerCase();

  let matchedSkillsCount = 0;
  const skillMatches: SkillMatch[] = [];

  applicant.skills.forEach((skill) => {
    const sLower = skill.toLowerCase();
    if (reqLower.includes(sLower)) {
      matchedSkillsCount++;
      skillMatches.push({ skill, status: "matched" });
    } else {
      skillMatches.push({ skill, status: "partial" });
    }
  });

  const hasExp = applicant.experiences.length > 0;
  const expMatch = applicant.experiences.some((e) =>
    reqLower.includes(e.position.toLowerCase())
  );

  let score = 50;
  if (matchedSkillsCount >= 3) score += 25;
  else if (matchedSkillsCount >= 1) score += 15;

  if (expMatch) score += 20;
  else if (hasExp) score += 10;

  if (applicant.certificates.length > 0) score += 5;
  score = Math.min(score, 98);

  let verdict: CareerMatchResult["verdict"] = "Cukup Cocok";
  if (score >= 85) verdict = "Sangat Cocok";
  else if (score >= 70) verdict = "Cocok";
  else if (score < 50) verdict = "Perlu Penyesuaian";
>>>>>>> b96e565cc610b719a55391a3e68793219d83edfc

  return {
    match_score: score,
    verdict,
<<<<<<< HEAD
    summary,
    strengths: strengths.length ? strengths : ["Informasi profil masih terbatas untuk mengidentifikasi kekuatan yang spesifik."],
    gaps: gaps.length ? gaps : ["Tidak ada kekurangan utama yang terdeteksi dari data profil yang tersedia."],
    recommendations: [
      "Sesuaikan ringkasan profil dan pengalaman dengan tanggung jawab yang tertulis pada lowongan.",
      "Pastikan keahlian yang relevan sudah dicantumkan secara jelas pada profil dan CV.",
      "Baca kembali persyaratan lowongan sebelum mengirim lamaran.",
    ],
    skill_matches: skillMatches.slice(0, 6),
    source: "heuristic",
  };
}
=======
    summary: `Profil kualifikasi ${applicant.fullName} memiliki kecocokan yang baik dengan posisi ${job.title}. Memiliki keahlian utama yang relevan dan pengalaman yang dapat mendukung operasional usaha.`,
    strengths: [
      `Memiliki keterampilan dasar: ${applicant.skills.slice(0, 3).join(", ") || "komunikasi & kerja tim"}`,
      hasExp ? "Memiliki riwayat pengalaman kerja yang relevan" : "Termotivasi dan siap belajar hal baru",
      "Kualifikasi pendidikan memenuhi kriteria dasar posisi ini",
    ],
    gaps: [
      score < 80 ? "Beberapa spesifikasi teknis mungkin memerlukan pelatihan awal dari pemberi kerja" : "Perlu penyesuaian dengan alur kerja internal spesifik perusahaan",
    ],
    recommendations: [
      "Tonjolkan keahlian praktis dan kesiapan bekerja saat sesi wawancara",
      "Pelajari profil dan produk usaha sebelum menghadiri wawancara",
    ],
    skill_matches: skillMatches.slice(0, 5),
    source: "heuristic",
  };
}

>>>>>>> b96e565cc610b719a55391a3e68793219d83edfc
