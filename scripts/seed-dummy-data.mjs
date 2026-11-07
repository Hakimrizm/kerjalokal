// scripts/seed-dummy-data.mjs
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local
const envFile = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
const env = {};
envFile.split("\n").forEach((line) => {
  const [k, ...rest] = line.split("=");
  if (k && rest.length) env[k.trim()] = rest.join("=").trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getOrCreateUser(email, password, role, fullName) {
  // Check if user already exists
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId;
  if (existing) {
    console.log(`User ${email} already exists (${existing.id})`);
    userId = existing.id;
    // update password
    await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, account_type: role },
    });
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, account_type: role },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`Created user ${email} (${userId})`);
  }

  // Ensure user_roles
  await supabase.from("user_roles").upsert(
    { user_id: userId, role },
    { onConflict: "user_id" }
  );

  // Ensure profiles
  await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      province: "DKI Jakarta",
      city: "Kota Jakarta Selatan",
      district: "Tebet",
      village: "Tebet Timur",
      address: "Jl. Tebet Timur Raya No. 45",
      postal_code: "12820",
    },
    { onConflict: "id" }
  );

  return userId;
}

async function seed() {
  console.log("=== SEEDING DUMMY DATA FOR CAREERMATCH AI ===");

  // 1. Pelaku Usaha (Employer)
  const employerEmail = "pelakuusaha@demo.com";
  const employerPassword = "Password123!";
  const employerId = await getOrCreateUser(
    employerEmail,
    employerPassword,
    "employer",
    "Budi Santoso (Kopi Seduh Nusantara)"
  );

  // Employer profile
  await supabase.from("employer_profiles").upsert(
    {
      user_id: employerId,
      business_name: "Kopi Seduh Nusantara",
      business_type: "Kafe & Roastery",
      description: "Kedai kopi lokal modern yang menyajikan biji kopi pilihan nusantara dengan suasana hangat dan ramah di jantung Tebet, Jakarta Selatan.",
      established_year: 2021,
      province: "DKI Jakarta",
      city: "Kota Jakarta Selatan",
      district: "Tebet",
      village: "Tebet Timur",
      address: "Jl. Tebet Timur Raya No. 45",
      postal_code: "12820",
      website: "https://kopiseduhnusantara.example.com",
      instagram_url: "https://instagram.com/kopiseduhnusantara",
      verification_status: "verified",
      profile_completed: true,
      onboarding_step: 5,
    },
    { onConflict: "user_id" }
  );

  // Employer contact
  await supabase.from("employer_contacts").upsert(
    {
      user_id: employerId,
      pic_name: "Budi Santoso",
      pic_position: "Pemilik Usaha & Pengelola",
      phone: "081298765432",
      contact_email: employerEmail,
      operating_hours: "Senin - Minggu: 08.00 - 22.00 WIB",
    },
    { onConflict: "user_id" }
  );

  // Jobs
  console.log("Creating jobs...");
  // Job 1: Barista & Kasir
  const { data: existingJobs } = await supabase
    .from("jobs")
    .select("id, title")
    .eq("employer_id", employerId);

  let job1Id = existingJobs?.find((j) => j.title.includes("Barista"))?.id;
  if (!job1Id) {
    const { data: newJob, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        employer_id: employerId,
        title: "Barista & Kasir Kafe",
        category: "Makanan & Minuman",
        employment_type: "Penuh Waktu",
        description: "Kopi Seduh Nusantara membuka kesempatan bagi Barista & Kasir yang ramah, teliti, dan berdedikasi tinggi untuk menyajikan kopi terbaik serta melayani pelanggan di outlet kami di Tebet Timur.",
        responsibilities: "- Mengoperasikan mesin espresso komersial dan menyajikan kopi manual brew (V60/Aeropress).\n- Melayani pemesanan dan pembayaran kasir dengan ramah menggunakan sistem POS.\n- Melakukan pencatatan stok bahan baku dan kebersihan area bar.\n- Memastikan higienitas dan standar pelayanan kafe tetap terjaga.",
        requirements: "- Pendidikan minimal SMA/SMK (Tata Boga/Perhotelan menjadi nilai tambah).\n- Pengalaman minimal 1 tahun sebagai Barista di coffee shop.\n- Mampu mengoperasikan mesin espresso dan memiliki teknik dasar latte art.\n- Komunikatif, berpenampilan rapi, disiplin, dan bersedia bekerja shift.",
        experience_level: "1 - 3 tahun",
        education_level: "SMA / SMK",
        salary_min: 3800000,
        salary_max: 4800000,
        salary_negotiable: false,
        vacancies: 2,
        application_deadline: "2026-12-31",
        province: "DKI Jakarta",
        city: "Kota Jakarta Selatan",
        district: "Tebet",
        village: "Tebet Timur",
        address: "Jl. Tebet Timur Raya No. 45",
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (jobErr) console.error("Error creating job 1:", jobErr);
    else job1Id = newJob.id;
  }

  // Job 2: Social Media & Content Creator
  let job2Id = existingJobs?.find((j) => j.title.includes("Content"))?.id;
  if (!job2Id) {
    const { data: newJob, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        employer_id: employerId,
        title: "Social Media & Content Creator",
        category: "Pemasaran & Komunikasi",
        employment_type: "Penuh Waktu",
        description: "Mencari content creator kreatif untuk mengelola media sosial Kopi Seduh Nusantara, membuat konten video pendek, reels, serta meningkatkan interaksi dan daya tarik pelanggan kafe.",
        responsibilities: "- Merencanakan dan membuat konten video pendek harian (TikTok & Instagram Reels).\n- Mengambil foto produk minuman dan suasana kafe.\n- Menulis copywriting interaktif dan merespons komentar/DM pelanggan.\n- Menganalisis performa konten media sosial mingguan.",
        requirements: "- Pengalaman membuat konten media sosial minimal 1 tahun.\n- Terampil menggunakan tools editing seperti Canva dan CapCut / Premiere.\n- Percaya diri tampil di depan kamera dan komunikatif.\n- Mengikuti tren kopi dan gaya hidup anak muda terkini.",
        experience_level: "Kurang dari 1 tahun",
        education_level: "SMA / SMK / D3 / S1",
        salary_min: 4000000,
        salary_max: 5200000,
        salary_negotiable: true,
        vacancies: 1,
        application_deadline: "2026-12-31",
        province: "DKI Jakarta",
        city: "Kota Jakarta Selatan",
        district: "Tebet",
        village: "Tebet Timur",
        address: "Jl. Tebet Timur Raya No. 45",
        status: "published",
        published_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (jobErr) console.error("Error creating job 2:", jobErr);
    else job2Id = newJob.id;
  }

  console.log("Jobs ready: Job 1 =", job1Id, ", Job 2 =", job2Id);

  // 2. Pelamar 1 (Sangat Cocok untuk Barista)
  const pelamar1Email = "pelamar1@demo.com";
  const pelamar1Id = await getOrCreateUser(
    pelamar1Email,
    "Password123!",
    "job_seeker",
    "Rizky Ramadhan"
  );

  await supabase.from("profiles").upsert({
    id: pelamar1Id,
    full_name: "Rizky Ramadhan",
    phone: "081312345678",
    birth_date: "2002-05-14",
    gender: "Laki-laki",
    province: "DKI Jakarta",
    city: "Kota Jakarta Selatan",
    district: "Tebet",
    village: "Tebet Barat",
    address: "Jl. Tebet Barat Dalam No. 12",
    postal_code: "12810",
  }, { onConflict: "id" });

  await supabase.from("job_seeker_profiles").upsert({
    user_id: pelamar1Id,
    desired_position: "Barista / F&B Staff",
    job_category: "Makanan & Minuman",
    employment_types: ["Penuh Waktu"],
    expected_salary_min: 4000000,
    expected_salary_max: 5000000,
    availability: "Tersedia segera",
    summary: "Barista berpengalaman 2 tahun di coffee shop lokal Jakarta Selatan. Terampil mengoperasikan mesin espresso komersial, membuat latte art, manual brew V60, serta melayani transaksi kasir POS dengan ramah dan cekatan.",
    portfolio_url: "https://instagram.com/rizky.latteart",
    profile_completed: true,
    onboarding_step: 5,
  }, { onConflict: "user_id" });

  // Skills
  const p1Skills = [
    "Mesin Espresso Commercial",
    "Latte Art",
    "Manual Brew (V60 & Aeropress)",
    "Kasir POS",
    "Customer Service",
    "Manajemen Stok Bahan",
    "Food Hygiene & Sanitation",
  ];
  for (const skill of p1Skills) {
    await supabase.from("job_seeker_skills").upsert({
      user_id: pelamar1Id,
      skill_name: skill,
    }, { onConflict: "user_id,skill_name" });
  }

  // Education
  await supabase.from("job_seeker_education").upsert({
    user_id: pelamar1Id,
    education_level: "SMK",
    institution: "SMK Pariwisata Jakarta Selatan",
    major: "Tata Boga & Perhotelan",
    start_year: 2019,
    end_year: 2022,
    is_current: false,
    description: "Mempelajari manajemen operasional makanan & minuman, hospitality, dan teknik dasar barista.",
  }, { onConflict: "id" });

  // Experience
  await supabase.from("job_seeker_experiences").upsert({
    user_id: pelamar1Id,
    company: "Kopi Kenangan Senja",
    position: "Barista & Kasir",
    employment_type: "Penuh Waktu",
    location: "Tebet, Jakarta Selatan",
    start_date: "2023-01-01",
    end_date: "2024-12-31",
    is_current: false,
    description: "Meracik 120+ minuman espresso dan manual brew per hari, mengelola sistem kasir POS Moka, dan mengontrol inventaris sirup & biji kopi.",
  }, { onConflict: "id" });

  // Certificates
  await supabase.from("job_seeker_certificates").upsert({
    user_id: pelamar1Id,
    certificate_name: "Sertifikasi Barista Level 2 BNSP",
    issuer: "Badan Nasional Sertifikasi Profesi",
    issue_date: "2023-08-15",
  }, { onConflict: "id" });

  // Lamaran Pelamar 1 ke Job 1
  if (job1Id) {
    await supabase.from("job_applications").upsert({
      job_id: job1Id,
      applicant_id: pelamar1Id,
      status: "reviewing",
      cover_letter: "Selamat siang Bapak/Ibu Pimpinan Kopi Seduh Nusantara. Saya sangat tertarik melamar sebagai Barista & Kasir karena pengalaman saya selama 2 tahun di kedai kopi Tebet dan sertifikasi BNSP yang saya miliki. Saya siap berkontribusi memberikan cita rasa kopi terbaik dan pelayanan ramah bagi pelanggan.",
      applied_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    }, { onConflict: "job_id,applicant_id" });
  }

  // 3. Pelamar 2 (Cukup Cocok / Background Kasir Minimarket, Belum Ahli Mesin Kopi)
  const pelamar2Email = "pelamar2@demo.com";
  const pelamar2Id = await getOrCreateUser(
    pelamar2Email,
    "Password123!",
    "job_seeker",
    "Dina Maulida"
  );

  await supabase.from("profiles").upsert({
    id: pelamar2Id,
    full_name: "Dina Maulida",
    phone: "081598761234",
    birth_date: "2004-03-20",
    gender: "Perempuan",
    province: "DKI Jakarta",
    city: "Kota Jakarta Selatan",
    district: "Tebet",
    village: "Manggarai Selatan",
    address: "Jl. Saharjo No. 88",
    postal_code: "12860",
  }, { onConflict: "id" });

  await supabase.from("job_seeker_profiles").upsert({
    user_id: pelamar2Id,
    desired_position: "Kasir / Staff Toko / Pelayanan",
    job_category: "Makanan & Minuman",
    employment_types: ["Penuh Waktu"],
    expected_salary_min: 3500000,
    expected_salary_max: 4200000,
    availability: "Tersedia segera",
    summary: "Lulusan SMA yang ramah, jujur, dan memiliki pengalaman 1 tahun sebagai kasir minimarket. Terbiasa melayani ratusan pelanggan setiap hari dan menghitung uang kasir secara teliti. Bersemangat belajar meracik kopi.",
    profile_completed: true,
    onboarding_step: 5,
  }, { onConflict: "user_id" });

  const p2Skills = [
    "Kasir POS",
    "Customer Service",
    "Komunikasi Ramah",
    "Perhitungan Uang & Transaksi",
    "Kerja Tim",
  ];
  for (const skill of p2Skills) {
    await supabase.from("job_seeker_skills").upsert({
      user_id: pelamar2Id,
      skill_name: skill,
    }, { onConflict: "user_id,skill_name" });
  }

  await supabase.from("job_seeker_education").upsert({
    user_id: pelamar2Id,
    education_level: "SMA",
    institution: "SMA Negeri 35 Jakarta",
    major: "IPS",
    start_year: 2020,
    end_year: 2023,
    is_current: false,
    description: "Aktif dalam kegiatan OSIS bidang kewirausahaan sekolah.",
  }, { onConflict: "id" });

  await supabase.from("job_seeker_experiences").upsert({
    user_id: pelamar2Id,
    company: "Minimarket Berkah Jaya",
    position: "Kasir & Pramuniaga",
    employment_type: "Penuh Waktu",
    location: "Tebet, Jakarta Selatan",
    start_date: "2023-07-01",
    end_date: "2024-07-01",
    is_current: false,
    description: "Melayani transaksi pelanggan, menghitung uang cash harian, dan menjaga kebersihan toko.",
  }, { onConflict: "id" });

  // Lamaran Pelamar 2 ke Job 1
  if (job1Id) {
    await supabase.from("job_applications").upsert({
      job_id: job1Id,
      applicant_id: pelamar2Id,
      status: "submitted",
      cover_letter: "Halo Kopi Seduh Nusantara, saya Dina ingin mengajukan diri sebagai kasir dan staf kafe. Saya memiliki pengalaman kasir yang kuat dan sangat ingin belajar teknik peracikan kopi langsung dari tim profesional.",
      applied_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    }, { onConflict: "job_id,applicant_id" });
  }

  // 4. Pelamar 3 (Cocok untuk Social Media)
  const pelamar3Email = "pelamar3@demo.com";
  const pelamar3Id = await getOrCreateUser(
    pelamar3Email,
    "Password123!",
    "job_seeker",
    "Fajar Hidayat"
  );

  await supabase.from("profiles").upsert({
    id: pelamar3Id,
    full_name: "Fajar Hidayat",
    phone: "081776543210",
    birth_date: "2001-11-09",
    gender: "Laki-laki",
    province: "DKI Jakarta",
    city: "Kota Jakarta Selatan",
    district: "Tebet",
    village: "Menteng Dalam",
    address: "Jl. Menteng Dalam No. 5",
    postal_code: "12870",
  }, { onConflict: "id" });

  await supabase.from("job_seeker_profiles").upsert({
    user_id: pelamar3Id,
    desired_position: "Social Media Specialist / Content Creator",
    job_category: "Pemasaran & Komunikasi",
    employment_types: ["Penuh Waktu", "Paruh Waktu"],
    expected_salary_min: 4500000,
    expected_salary_max: 5500000,
    availability: "Tersedia segera",
    summary: "Content creator muda dengan keahlian video pendek (TikTok & Instagram Reels), visual branding Canva, fotografi produk makanan & minuman, dan tren media sosial.",
    portfolio_url: "https://tiktok.com/@fajarcreates",
    profile_completed: true,
    onboarding_step: 5,
  }, { onConflict: "user_id" });

  const p3Skills = [
    "CapCut Video Editing",
    "Canva Graphic Design",
    "Instagram & TikTok Content Strategy",
    "Copywriting",
    "Fotografi Produk F&B",
    "Public Speaking & Host Live",
  ];
  for (const skill of p3Skills) {
    await supabase.from("job_seeker_skills").upsert({
      user_id: pelamar3Id,
      skill_name: skill,
    }, { onConflict: "user_id,skill_name" });
  }

  await supabase.from("job_seeker_education").upsert({
    user_id: pelamar3Id,
    education_level: "S1",
    institution: "Universitas Negeri Jakarta",
    major: "Ilmu Komunikasi",
    start_year: 2019,
    end_year: 2023,
    is_current: false,
    description: "Fokus peminatan Komunikasi Massa dan Media Digital.",
  }, { onConflict: "id" });

  await supabase.from("job_seeker_experiences").upsert({
    user_id: pelamar3Id,
    company: "Studio Kreatif Lokal",
    position: "Content Creator & Social Media Officer",
    employment_type: "Penuh Waktu",
    location: "Jakarta Selatan",
    start_date: "2023-08-01",
    end_date: "2024-10-01",
    is_current: false,
    description: "Membuat 20+ video reels per bulan untuk 3 brand kuliner lokal, meningkatkan engagement rate sebesar 35%.",
  }, { onConflict: "id" });

  // Lamaran Pelamar 3 ke Job 2
  if (job2Id) {
    await supabase.from("job_applications").upsert({
      job_id: job2Id,
      applicant_id: pelamar3Id,
      status: "interview",
      cover_letter: "Salam hangat Kopi Seduh Nusantara! Saya tertarik membantu meningkatkan eksposur dan interaksi kafe melalui konten video TikTok dan Reels yang engaging. Portofolio video kuliner saya dapat dilihat di tautan tertera.",
      applied_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    }, { onConflict: "job_id,applicant_id" });
  }

  console.log("=== SEEDING COMPLETED SUCCESSFULLY ===");
  console.log("\nAkun Demo yang Dibuat:");
  console.log("1. Pelaku Usaha:");
  console.log(`   Email: ${employerEmail}`);
  console.log(`   Password: ${employerPassword}`);
  console.log(`   Usaha: Kopi Seduh Nusantara (2 Lowongan)`);
  console.log("\n2. Pelamar 1 (Sangat Cocok Barista):");
  console.log(`   Email: ${pelamar1Email}`);
  console.log(`   Password: Password123!`);
  console.log("\n3. Pelamar 2 (Cocok Kasir / Perlu Training Mesin Kopi):");
  console.log(`   Email: ${pelamar2Email}`);
  console.log(`   Password: Password123!`);
  console.log("\n4. Pelamar 3 (Cocok Content Creator):");
  console.log(`   Email: ${pelamar3Email}`);
  console.log(`   Password: Password123!`);
}

seed().catch(console.error);

