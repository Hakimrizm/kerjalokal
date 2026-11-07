export type CareerMatchAttribute = {
  key: string;
  label: string;
  weight: number;
  score: number | null;
  detail: string;
  matched: string[];
  missing: string[];
};

export type CareerMatchScore = {
  match_score: number | null;
  verdict: "Sangat Cocok" | "Cocok" | "Cukup Cocok" | "Perlu Penyesuaian" | "Data Belum Cukup";
  coverage: number;
  available_attributes: number;
  total_attributes: number;
  summary: string;
  attributes: CareerMatchAttribute[];
};

export type CareerMatchApplicant = {
  profile: {
    full_name?: string | null;
    province?: string | null;
    city?: string | null;
    district?: string | null;
    village?: string | null;
  } | null;
  preferences: {
    desired_position?: string | null;
    job_category?: string | null;
    employment_types?: string[] | null;
    expected_salary_min?: number | string | null;
    expected_salary_max?: number | string | null;
  } | null;
  skills: string[];
  experiences: {
    position: string;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean | null;
    description?: string | null;
  }[];
  education: {
    education_level: string;
    major?: string | null;
  }[];
};

export type CareerMatchJob = {
  title: string;
  category: string;
  employment_type: string;
  description: string;
  responsibilities?: string | null;
  requirements: string;
  experience_level?: string | null;
  education_level?: string | null;
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  salary_negotiable?: boolean | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  village?: string | null;
};

const WEIGHTS = {
  skills: 35,
  experience: 20,
  education: 15,
  position: 10,
  location: 10,
  employment_type: 5,
  salary: 5,
} as const;

const SKILL_ALIASES: Record<string, string[]> = {
  "microsoft excel": ["excel", "ms excel", "microsoft excel", "spreadsheet"],
  "microsoft word": ["word", "ms word", "microsoft word"],
  "microsoft office": ["microsoft office", "ms office", "office"],
  administrasi: ["administrasi", "administrative", "administration", "admin"],
  komunikasi: ["komunikasi", "communication", "komunikatif", "communicate"],
  "customer service": ["customer service", "customer support", "layanan pelanggan", "pelayanan pelanggan"],
  penjualan: ["penjualan", "sales", "selling"],
  marketing: ["marketing", "pemasaran", "digital marketing"],
  "desain grafis": ["desain grafis", "graphic design", "canva", "adobe illustrator", "photoshop"],
  akuntansi: ["akuntansi", "accounting", "pembukuan", "bookkeeping"],
  kasir: ["kasir", "cashier", "point of sale", "pos"],
  "pengelolaan stok": ["pengelolaan stok", "inventory", "stock opname", "persediaan"],
  teamwork: ["teamwork", "kerja tim", "kolaborasi", "team work"],
  "problem solving": ["problem solving", "pemecahan masalah", "analisis masalah"],
  leadership: ["leadership", "kepemimpinan", "memimpin tim"],
  "social media": ["social media", "media sosial", "instagram", "tiktok"],
  "content writing": ["content writing", "penulisan konten", "copywriting", "menulis konten"],
  "data entry": ["data entry", "input data", "pengolahan data"],
  programming: ["programming", "pemrograman", "coding", "developer"],
  javascript: ["javascript", "js"],
  typescript: ["typescript", "ts"],
  python: ["python"],
  sql: ["sql", "database", "basis data"],
  "html css": ["html", "css", "web design", "pengembangan web"],
  "project management": ["project management", "manajemen proyek", "pengelolaan proyek"],
  negotiation: ["negotiation", "negosiasi", "bernegosiasi"],
  "time management": ["time management", "manajemen waktu", "mengatur waktu"],
  "public speaking": ["public speaking", "presentasi", "berbicara di depan umum"],
};

const STOP_WORDS = new Set([
  "dan", "atau", "dengan", "untuk", "dari", "pada", "yang", "di", "ke", "the", "a", "an",
  "of", "to", "in", "for", "and", "as", "by", "on", "pekerjaan", "kerja", "pekerja",
  "posisi", "staff", "staf", "junior", "senior", "dan", "serta", "mampu", "memiliki",
  "minimal", "maksimal", "lebih", "kurang", "tahun", "bulan", "pengalaman",
]);

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokens(value: string): string[] {
  const equivalentTokens: Record<string, string> = {
    administrasi: "admin",
    administrative: "admin",
    administration: "admin",
    cashier: "kasir",
    accounting: "akuntansi",
    sales: "penjualan",
    marketing: "pemasaran",
    communication: "komunikasi",
  };

  return normalize(value)
    .split(" ")
    .map((token) => equivalentTokens[token] ?? token)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function normalizePlace(value: unknown): string {
  return normalize(value)
    .replace(/^(desa\/kelurahan|kelurahan|desa)\s+/, "")
    .replace(/^(kota|kabupaten administrasi|kabupaten|kab)\s+/, "");
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const normalizedHaystack = ` ${normalize(haystack)} `;
  const normalizedPhrase = normalize(phrase);
  return Boolean(normalizedPhrase) && normalizedHaystack.includes(` ${normalizedPhrase} `);
}

function tokenOverlapScore(left: string, right: string): number {
  const leftTokens = [...new Set(tokens(left))];
  const rightSet = new Set(tokens(right));
  if (!leftTokens.length || !rightSet.size) return 0;
  const overlap = leftTokens.filter((token) => rightSet.has(token)).length;
  return Math.round((overlap / leftTokens.length) * 100);
}

function makeAttribute(
  key: string,
  label: string,
  weight: number,
  score: number | null,
  detail: string,
  matched: string[] = [],
  missing: string[] = [],
): CareerMatchAttribute {
  return { key, label, weight, score, detail, matched, missing };
}

function skillAttribute(applicant: CareerMatchApplicant, job: CareerMatchJob): CareerMatchAttribute {
  const skills = [...new Set((applicant.skills ?? []).map((skill) => skill.trim()).filter(Boolean))];
  if (!skills.length) {
    return makeAttribute("skills", "Keahlian", WEIGHTS.skills, null, "Keahlian belum dicantumkan pada profil.");
  }

  const jobText = [
    job.title,
    job.category,
    job.description,
    job.responsibilities,
    job.requirements,
  ].filter(Boolean).join(" ");
  const normalizedJobText = normalize(jobText);
  let points = 0;
  const matched: string[] = [];
  const partial: string[] = [];
  const missing: string[] = [];

  for (const skill of skills) {
    const normalizedSkill = normalize(skill);
    const aliasGroup = Object.entries(SKILL_ALIASES).find(([canonical, aliases]) =>
      canonical === normalizedSkill || aliases.some((alias) => normalize(alias) === normalizedSkill),
    );
    const variants = aliasGroup
      ? [...new Set([aliasGroup[0], ...aliasGroup[1]])]
      : [skill];

    const exact = variants.some((variant) => containsPhrase(normalizedJobText, variant));
    if (exact) {
      points += 1;
      matched.push(skill);
      continue;
    }

    const overlap = tokenOverlapScore(skill, jobText);
    if (overlap >= 50 && tokens(skill).length > 1) {
      points += 0.5;
      partial.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const score = Math.round((points / skills.length) * 100);
  const detail = `${matched.length} keahlian disebut secara langsung dan ${partial.length} keahlian memiliki keterkaitan sebagian dari ${skills.length} keahlian profil.`;
  return makeAttribute(
    "skills",
    "Keahlian",
    WEIGHTS.skills,
    score,
    detail,
    [...matched, ...partial],
    missing,
  );
}

function calculateExperienceMonths(experiences: CareerMatchApplicant["experiences"]): number | null {
  const intervals = experiences
    .filter((item) => item.start_date)
    .map((item) => {
      const start = new Date(`${item.start_date}T00:00:00`);
      const end = item.is_current
        ? new Date()
        : item.end_date
          ? new Date(`${item.end_date}T00:00:00`)
          : null;
      if (Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) return null;
      return { start, end };
    })
    .filter((item): item is { start: Date; end: Date } => item !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (!intervals.length) return null;

  const merged: Array<{ start: Date; end: Date }> = [];
  for (const interval of intervals) {
    const previous = merged[merged.length - 1];
    if (previous && interval.start.getTime() <= previous.end.getTime()) {
      if (interval.end.getTime() > previous.end.getTime()) previous.end = interval.end;
    } else {
      merged.push({ ...interval });
    }
  }

  return merged.reduce((sum, interval) => {
    const months = Math.max(
      0,
      (interval.end.getFullYear() - interval.start.getFullYear()) * 12 +
        interval.end.getMonth() - interval.start.getMonth(),
    );
    return sum + months;
  }, 0);
}

function experienceRequirementYears(level: string): number | null {
  const value = normalize(level);
  if (!value || value.includes("tidak harus") || value.includes("fresh graduate")) return 0;
  if (value.includes("kurang dari 1")) return 0.5;
  if (value.includes("1 2")) return 1;
  if (value.includes("3 5")) return 3;
  if (value.includes("lebih dari 5")) return 5;
  return null;
}

function experienceAttribute(applicant: CareerMatchApplicant, job: CareerMatchJob): CareerMatchAttribute {
  const experiences = applicant.experiences ?? [];
  const requirement = job.experience_level?.trim() ?? "";
  const hasRequirement = Boolean(requirement && !["tidak ditentukan", "tidak ada batasan"].includes(normalize(requirement)));
  if (!hasRequirement && !experiences.length) {
    return makeAttribute("experience", "Pengalaman", WEIGHTS.experience, null, "Data pengalaman kerja belum dicantumkan.");
  }

  const requiredYears = experienceRequirementYears(requirement);
  const months = calculateExperienceMonths(experiences);
  const years = months == null ? null : months / 12;
  const hasExperience = experiences.length > 0;

  let yearsScore = 100;
  if (requiredYears == null) {
    yearsScore = hasExperience ? 70 : 0;
  } else if (requiredYears === 0) {
    yearsScore = years != null && years > 1.5 ? 90 : 100;
  } else if (!hasExperience && requiredYears <= 0.5) {
    yearsScore = 100;
  } else if (years == null) {
    yearsScore = hasExperience ? 65 : 0;
  } else {
    yearsScore = Math.min(100, Math.round((years / requiredYears) * 100));
  }

  const jobRoleText = `${job.title} ${job.category} ${job.requirements}`;
  const roleScores = experiences.map((experience) =>
    Math.max(
      tokenOverlapScore(experience.position, `${job.title} ${job.category}`),
      tokenOverlapScore(`${experience.position} ${experience.description ?? ""}`, jobRoleText),
    ),
  );
  const roleScore = roleScores.length
    ? Math.max(...roleScores)
    : (requiredYears === 0 || requiredYears === 0.5 ? 100 : 0);
  const score = Math.round(yearsScore * 0.7 + roleScore * 0.3);

  const relevantExperiences = experiences
    .filter((experience, index) => (roleScores[index] ?? 0) >= 40)
    .map((experience) => experience.position);
  const detail = hasExperience
    ? `${experiences.length} pengalaman tersimpan${years != null ? `, sekitar ${years.toFixed(1)} tahun akumulasi` : ""}. ${relevantExperiences.length ? `${relevantExperiences.length} pengalaman memiliki keterkaitan dengan posisi.` : "Keterkaitan posisi masih perlu diperjelas."}`
    : `Lowongan mensyaratkan "${requirement}", sementara pengalaman kerja belum dicantumkan.`;

  return makeAttribute(
    "experience",
    "Pengalaman",
    WEIGHTS.experience,
    score,
    detail,
    relevantExperiences,
    experiences.filter((experience, index) => (roleScores[index] ?? 0) < 40).map((experience) => experience.position),
  );
}

const EDUCATION_RANKS: Array<[string[], number]> = [
  [["s2", "magister", "master"], 6],
  [["s1", "d4", "sarjana"], 5],
  [["d1", "d2", "d3", "diploma"], 4],
  [["sma", "smk", "sederajat", "high school"], 3],
  [["smp", "junior high"], 2],
  [["sd", "sekolah dasar", "elementary"], 1],
];

function educationRank(value: string): number {
  const normalized = normalize(value);
  for (const [labels, rank] of EDUCATION_RANKS) {
    if (labels.some((label) => normalized.includes(normalize(label)))) return rank;
  }
  return 0;
}

function educationAttribute(applicant: CareerMatchApplicant, job: CareerMatchJob): CareerMatchAttribute {
  const requirement = job.education_level?.trim() ?? "";
  const normalizedRequirement = normalize(requirement);
  if (!requirement || normalizedRequirement.includes("tidak ada batasan") || normalizedRequirement.includes("tidak ditentukan")) {
    return makeAttribute("education", "Pendidikan", WEIGHTS.education, null, "Lowongan tidak menetapkan pendidikan minimum.");
  }

  const education = applicant.education ?? [];
  if (!education.length) {
    return makeAttribute("education", "Pendidikan", WEIGHTS.education, null, `Persyaratan minimum ${requirement}, tetapi riwayat pendidikan belum dicantumkan.`);
  }

  const requiredRank = educationRank(requirement);
  const best = education.reduce((max, item) => Math.max(max, educationRank(item.education_level)), 0);
  if (!requiredRank || !best) {
    return makeAttribute("education", "Pendidikan", WEIGHTS.education, null, "Jenjang pendidikan belum dapat dibandingkan secara otomatis.");
  }

  const difference = best - requiredRank;
  const score = difference >= 0 ? 100 : difference === -1 ? 70 : difference === -2 ? 40 : 0;
  return makeAttribute(
    "education",
    "Pendidikan",
    WEIGHTS.education,
    score,
    difference >= 0
      ? `Pendidikan tertinggi pada profil memenuhi atau melampaui syarat ${requirement}.`
      : `Pendidikan pada profil belum mencapai syarat minimum ${requirement}.`,
    difference >= 0 ? [education.find((item) => educationRank(item.education_level) === best)?.education_level ?? "Pendidikan sesuai"] : [],
    difference < 0 ? [`Minimum ${requirement}`] : [],
  );
}

function positionAttribute(applicant: CareerMatchApplicant, job: CareerMatchJob): CareerMatchAttribute {
  const preferences = applicant.preferences;
  const desiredPosition = preferences?.desired_position?.trim() ?? "";
  const desiredCategory = preferences?.job_category?.trim() ?? "";
  if (!desiredPosition && !desiredCategory) {
    return makeAttribute("position", "Posisi & kategori", WEIGHTS.position, null, "Posisi atau kategori yang diminati belum diisi pada profil.");
  }

  const titleScore = desiredPosition
    ? Math.max(
        containsPhrase(job.title, desiredPosition) ? 100 : 0,
        tokenOverlapScore(desiredPosition, job.title),
      )
    : null;
  const categoryScore = desiredCategory
    ? normalize(desiredCategory) === normalize(job.category) ? 100 : tokenOverlapScore(desiredCategory, job.category)
    : null;

  const candidates = [titleScore, categoryScore].filter((value): value is number => value != null);
  const score = Math.round(candidates.reduce((sum, value) => sum + value, 0) / candidates.length);
  const matched: string[] = [];
  const missing: string[] = [];
  if (desiredPosition) (titleScore ?? 0) >= 60 ? matched.push(desiredPosition) : missing.push(desiredPosition);
  if (desiredCategory) (categoryScore ?? 0) >= 60 ? matched.push(desiredCategory) : missing.push(desiredCategory);

  return makeAttribute(
    "position",
    "Posisi & kategori",
    WEIGHTS.position,
    score,
    `Dibandingkan dengan posisi "${job.title}" dan kategori "${job.category}".`,
    matched,
    missing,
  );
}

function locationAttribute(applicant: CareerMatchApplicant, job: CareerMatchJob): CareerMatchAttribute {
  const profile = applicant.profile;
  const applicantVillage = normalizePlace(profile?.village);
  const applicantDistrict = normalizePlace(profile?.district);
  const applicantCity = normalizePlace(profile?.city);
  const applicantProvince = normalizePlace(profile?.province);

  if (!applicantVillage && !applicantDistrict && !applicantCity && !applicantProvince) {
    return makeAttribute("location", "Domisili", WEIGHTS.location, null, "Domisili belum dicantumkan pada profil.");
  }

  const jobVillage = normalizePlace(job.village);
  const jobDistrict = normalizePlace(job.district);
  const jobCity = normalizePlace(job.city);
  const jobProvince = normalizePlace(job.province);

  let score = 15;
  let detail = "Lokasi lowongan berada di luar wilayah domisili yang tercantum pada profil.";

  if (applicantVillage && jobVillage && applicantVillage === jobVillage && applicantDistrict === jobDistrict && applicantCity === jobCity) {
    score = 100;
    detail = "Desa/kelurahan, kecamatan, dan kota/kabupaten sama dengan domisili profil.";
  } else if (applicantDistrict && jobDistrict && applicantDistrict === jobDistrict && applicantCity === jobCity) {
    score = 95;
    detail = "Kecamatan dan kota/kabupaten sama dengan domisili profil.";
  } else if (applicantCity && jobCity && applicantCity === jobCity) {
    score = 85;
    detail = "Kota/kabupaten sama dengan domisili profil.";
  } else if (applicantProvince && jobProvince && applicantProvince === jobProvince) {
    score = 65;
    detail = "Provinsi sama, tetapi kabupaten/kota berbeda.";
  }

  return makeAttribute(
    "location",
    "Domisili",
    WEIGHTS.location,
    score,
    detail,
    score >= 65 ? ["Wilayah kerja"] : [],
    score < 65 ? ["Kedekatan lokasi"] : [],
  );
}

function employmentTypeAttribute(applicant: CareerMatchApplicant, job: CareerMatchJob): CareerMatchAttribute {
  const preferences = applicant.preferences?.employment_types ?? [];
  if (!preferences.length) {
    return makeAttribute("employment_type", "Jenis pekerjaan", WEIGHTS.employment_type, null, "Preferensi jenis pekerjaan belum dipilih.");
  }

  const selected = preferences.some((value) => normalize(value) === normalize(job.employment_type) || normalize(value) === "semua");
  return makeAttribute(
    "employment_type",
    "Jenis pekerjaan",
    WEIGHTS.employment_type,
    selected ? 100 : 0,
    selected
      ? `Jenis pekerjaan ${job.employment_type} sesuai dengan preferensi profil.`
      : `Jenis pekerjaan ${job.employment_type} belum termasuk preferensi yang dipilih.`,
    selected ? [job.employment_type] : [],
    selected ? [] : [job.employment_type],
  );
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function salaryAttribute(applicant: CareerMatchApplicant, job: CareerMatchJob): CareerMatchAttribute {
  const expectedMin = toNumber(applicant.preferences?.expected_salary_min);
  const expectedMax = toNumber(applicant.preferences?.expected_salary_max);
  const jobMin = toNumber(job.salary_min);
  const jobMax = toNumber(job.salary_max);

  if ((expectedMin == null && expectedMax == null) || (jobMin == null && jobMax == null)) {
    return makeAttribute("salary", "Kisaran gaji", WEIGHTS.salary, null, "Kisaran gaji belum cukup lengkap untuk dibandingkan.");
  }

  const candidateMin = expectedMin ?? 0;
  const candidateMax = expectedMax ?? expectedMin ?? 0;
  const offeredMin = jobMin ?? jobMax ?? 0;
  const offeredMax = jobMax ?? jobMin ?? 0;

  let score = 100;
  let detail = "Kisaran gaji lowongan sesuai dengan ekspektasi profil.";
  if (offeredMax < candidateMin) {
    score = candidateMin > 0 ? Math.max(0, Math.round((offeredMax / candidateMin) * 100)) : 100;
    detail = "Kisaran gaji yang ditawarkan berada di bawah ekspektasi minimum.";
  } else if (offeredMin > candidateMax && candidateMax > 0) {
    score = 100;
    detail = "Penawaran gaji berada di atas ekspektasi maksimum profil.";
  }

  return makeAttribute("salary", "Kisaran gaji", WEIGHTS.salary, score, detail, score >= 70 ? ["Kisaran gaji"] : [], score < 70 ? ["Ekspektasi gaji"] : []);
}

export function calculateCareerMatch(
  applicant: CareerMatchApplicant,
  job: CareerMatchJob,
): CareerMatchScore {
  const attributes = [
    skillAttribute(applicant, job),
    experienceAttribute(applicant, job),
    educationAttribute(applicant, job),
    positionAttribute(applicant, job),
    locationAttribute(applicant, job),
    employmentTypeAttribute(applicant, job),
    salaryAttribute(applicant, job),
  ];

  const available = attributes.filter((attribute) => attribute.score !== null);
  const availableWeight = available.reduce((sum, attribute) => sum + attribute.weight, 0);
  const weightedTotal = available.reduce(
    (sum, attribute) => sum + (attribute.score ?? 0) * attribute.weight,
    0,
  );
  const matchScore =
    availableWeight >= 35 && available.length >= 2
      ? Math.round(weightedTotal / availableWeight)
      : null;
  const coverage = Math.round(availableWeight);

  let verdict: CareerMatchScore["verdict"] = "Data Belum Cukup";
  if (matchScore !== null) {
    if (matchScore >= 85) verdict = "Sangat Cocok";
    else if (matchScore >= 70) verdict = "Cocok";
    else if (matchScore >= 50) verdict = "Cukup Cocok";
    else verdict = "Perlu Penyesuaian";
  }

  const strong = available.filter((attribute) => (attribute.score ?? 0) >= 75).map((attribute) => attribute.label);
  const improve = available.filter((attribute) => (attribute.score ?? 0) < 50).map((attribute) => attribute.label);
  const summary = matchScore === null
    ? "Data profil belum cukup untuk menghasilkan persentase yang dapat diandalkan. Lengkapi keahlian, preferensi posisi, pengalaman, atau domisili."
    : `Analisis membandingkan ${available.length} dari ${attributes.length} atribut yang tersedia. ${strong.length ? `Kekuatan utama: ${strong.slice(0, 3).join(", ")}.` : ""} ${improve.length ? `Hal yang perlu diperhatikan: ${improve.slice(0, 3).join(", ")}.` : "Sebagian besar atribut yang tersedia sudah selaras."}`;

  return {
    match_score: matchScore,
    verdict,
    coverage,
    available_attributes: available.length,
    total_attributes: attributes.length,
    summary,
    attributes,
  };
}
