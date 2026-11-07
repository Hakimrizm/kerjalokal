"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	useEffect,
	useMemo,
	useState,
	type ChangeEvent,
	type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
	ArrowLeft,
	ArrowRight,
	Award,
	BriefcaseBusiness,
	Check,
	CheckCircle2,
	ChevronRight,
	CircleHelp,
	GraduationCap,
	LoaderCircle,
	MapPin,
	Plus,
	ShieldCheck,
	Sparkles,
	Trash2,
	UserRound,
	X,
} from "lucide-react";

type IdentityForm = {
	full_name: string;
	phone: string;
	birth_date: string;
	gender: string;
	province: string;
	city: string;
	district: string;
	village: string;
	address: string;
	postal_code: string;
	latitude: string;
	longitude: string;
};

type PreferenceForm = {
	desired_position: string;
	job_category: string;
	employment_types: string[];
	expected_salary_min: string;
	expected_salary_max: string;
	availability: string;
	summary: string;
	portfolio_url: string;
	linkedin_url: string;
	languages: string;
};

type EducationItem = {
	id: string;
	education_level: string;
	institution: string;
	major: string;
	start_year: string;
	end_year: string;
	is_current: boolean;
	description: string;
};

type ExperienceItem = {
	id: string;
	company: string;
	position: string;
	employment_type: string;
	location: string;
	start_month: string;
	end_month: string;
	is_current: boolean;
	description: string;
};

type CertificateItem = {
	id: string;
	certificate_name: string;
	issuer: string;
	issue_date: string;
	expiry_date: string;
	credential_url: string;
	description: string;
};

type Props = {
	userId: string;
	initialName: string;
	isEditing?: boolean;
	initialStep?: number;
};

const steps = [
	{ title: "Identitas", subtitle: "Data diri & lokasi", icon: UserRound },
	{ title: "Keahlian", subtitle: "Skill & preferensi", icon: Sparkles },
	{ title: "Pendidikan", subtitle: "Riwayat belajar", icon: GraduationCap },
	{
		title: "Pengalaman",
		subtitle: "Riwayat pekerjaan",
		icon: BriefcaseBusiness,
	},
	{ title: "Sertifikat", subtitle: "Portofolio & lainnya", icon: Award },
];

const skillSuggestions = [
	"Komunikasi",
	"Microsoft Excel",
	"Pelayanan pelanggan",
	"Administrasi",
	"Kasir",
	"Manajemen waktu",
	"Desain grafis",
	"Digital marketing",
	"Pengoperasian komputer",
	"Kerja sama tim",
];

const employmentOptions = [
	"Full-time",
	"Part-time",
	"Kontrak",
	"Freelance",
	"Magang",
];

const categories = [
	"Administrasi",
	"Penjualan & Retail",
	"Makanan & Minuman",
	"Perhotelan & Pariwisata",
	"Teknisi & Bengkel",
	"Logistik & Pengiriman",
	"Pendidikan",
	"Kesehatan",
	"Kreatif & Digital",
	"Lainnya",
];

const educationLevels = [
	"Tidak/belum sekolah",
	"SD/Sederajat",
	"SMP/Sederajat",
	"SMA/Sederajat",
	"SMK/Sederajat",
	"Diploma 1 (D1)",
	"Diploma 2 (D2)",
	"Diploma 3 (D3)",
	"Diploma 4 (D4)",
	"Sarjana (S1)",
	"Magister (S2)",
	"Doktor (S3)",
];

const emptyIdentity = (name: string): IdentityForm => ({
	full_name: name,
	phone: "",
	birth_date: "",
	gender: "",
	province: "",
	city: "",
	district: "",
	village: "",
	address: "",
	postal_code: "",
	latitude: "",
	longitude: "",
});

const emptyPreferences = (): PreferenceForm => ({
	desired_position: "",
	job_category: "",
	employment_types: [],
	expected_salary_min: "",
	expected_salary_max: "",
	availability: "",
	summary: "",
	portfolio_url: "",
	linkedin_url: "",
	languages: "",
});

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyEducation = (): EducationItem => ({
	id: newId(),
	education_level: "",
	institution: "",
	major: "",
	start_year: "",
	end_year: "",
	is_current: false,
	description: "",
});

const emptyExperience = (): ExperienceItem => ({
	id: newId(),
	company: "",
	position: "",
	employment_type: "",
	location: "",
	start_month: "",
	end_month: "",
	is_current: false,
	description: "",
});

const emptyCertificate = (): CertificateItem => ({
	id: newId(),
	certificate_name: "",
	issuer: "",
	issue_date: "",
	expiry_date: "",
	credential_url: "",
	description: "",
});

function Field({
	label,
	htmlFor,
	required = false,
	hint,
	children,
}: {
	label: string;
	htmlFor?: string;
	required?: boolean;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<div className="form-control min-w-0 w-full gap-1.5">
			<label htmlFor={htmlFor} className="label justify-start gap-1 p-0">
				<span className="label-text text-xs font-bold text-[#34495E] sm:text-sm">
					{label}
				</span>
				{required && <span className="text-xs font-bold text-red-500">*</span>}
			</label>
			{children}
			{hint && (
				<span className="text-[11px] leading-5 text-[#7F8C8D]">{hint}</span>
			)}
		</div>
	);
}

const inputClass =
	"input input-bordered h-12 w-full rounded-xl border-[#BDC3C7] bg-white text-sm text-[#2C3E50] placeholder:text-[#7F8C8D]/70 focus:border-[#34495E] focus:outline-none";
const selectClass =
	"select select-bordered h-12 min-h-12 w-full rounded-xl border-[#BDC3C7] bg-white text-sm text-[#2C3E50] focus:border-[#34495E] focus:outline-none";
const textareaClass =
	"textarea textarea-bordered min-h-28 w-full rounded-xl border-[#BDC3C7] bg-white text-sm leading-6 text-[#2C3E50] placeholder:text-[#7F8C8D]/70 focus:border-[#34495E] focus:outline-none";

function asMonth(value: string | null | undefined) {
	return value ? value.slice(0, 7) : "";
}

function monthToDate(value: string) {
	return value ? `${value}-01` : null;
}

function validOptionalUrl(value: string) {
	if (!value.trim()) return true;
	try {
		const parsed = new URL(value);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

export function JobSeekerOnboarding({
	userId,
	initialName,
	isEditing = false,
	initialStep = 0,
}: Props) {
	const router = useRouter();
	const [currentStep, setCurrentStep] = useState(() => (isEditing ? Math.max(0, Math.min(4, initialStep)) : 0));
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [geoLoading, setGeoLoading] = useState(false);
	const [setupError, setSetupError] = useState("");
	const [error, setError] = useState("");

	const [identity, setIdentity] = useState<IdentityForm>(() =>
		emptyIdentity(initialName),
	);
	const [preferences, setPreferences] =
		useState<PreferenceForm>(emptyPreferences);
	const [skills, setSkills] = useState<string[]>([]);
	const [skillInput, setSkillInput] = useState("");
	const [educations, setEducations] = useState<EducationItem[]>([
		emptyEducation(),
	]);
	const [experiences, setExperiences] = useState<ExperienceItem[]>([]);
	const [certificates, setCertificates] = useState<CertificateItem[]>([]);
	const [noExperience, setNoExperience] = useState(false);
	const [photoFile, setPhotoFile] = useState<File | null>(null);
	const [photoPath, setPhotoPath] = useState<string | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);

	const progress = useMemo(
		() => Math.round(((currentStep + 1) / steps.length) * 100),
		[currentStep],
	);

	useEffect(() => {
		let active = true;

		async function loadSavedData() {
			const supabase = createClient();
			setLoading(true);

			const [
				profileResult,
				preferenceResult,
				skillsResult,
				educationResult,
				experienceResult,
				certificateResult,
			] = await Promise.all([
				supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
				supabase
					.from("job_seeker_profiles")
					.select("*")
					.eq("user_id", userId)
					.maybeSingle(),
				supabase.from("job_seeker_skills").select("*").eq("user_id", userId),
				supabase
					.from("job_seeker_education")
					.select("*")
					.eq("user_id", userId)
					.order("start_year", { ascending: false }),
				supabase
					.from("job_seeker_experiences")
					.select("*")
					.eq("user_id", userId)
					.order("start_date", { ascending: false }),
				supabase
					.from("job_seeker_certificates")
					.select("*")
					.eq("user_id", userId)
					.order("issue_date", { ascending: false }),
			]);

			if (!active) return;

			const results = [
				profileResult,
				preferenceResult,
				skillsResult,
				educationResult,
				experienceResult,
				certificateResult,
			];
			const failed = results.find((result) => result.error);
			if (failed?.error) {
				setSetupError(
					"Struktur database onboarding belum tersedia atau kebijakan aksesnya belum lengkap. Jalankan file SQL supabase/migrations/202611070001_jobseeker_onboarding.sql di Supabase SQL Editor, lalu muat ulang halaman ini.",
				);
				setLoading(false);
				return;
			}

			const savedProfile = profileResult.data;
			if (savedProfile) {
				setIdentity({
					full_name: savedProfile.full_name ?? initialName,
					phone: savedProfile.phone ?? "",
					birth_date: savedProfile.birth_date ?? "",
					gender: savedProfile.gender ?? "",
					province: savedProfile.province ?? "",
					city: savedProfile.city ?? "",
					district: savedProfile.district ?? "",
					village: savedProfile.village ?? "",
					address: savedProfile.address ?? "",
					postal_code: savedProfile.postal_code ?? "",
					latitude: savedProfile.latitude?.toString() ?? "",
					longitude: savedProfile.longitude?.toString() ?? "",
				});
				setPhotoPath(savedProfile.photo_path ?? null);

				if (savedProfile.photo_path) {
					const { data: signedPhoto } = await supabase.storage
						.from("profile-photos")
						.createSignedUrl(savedProfile.photo_path, 60 * 60);
					if (active && signedPhoto?.signedUrl)
						setPhotoPreview(signedPhoto.signedUrl);
				}
			}

			const savedPreferences = preferenceResult.data;
			if (savedPreferences) {
				setPreferences({
					desired_position: savedPreferences.desired_position ?? "",
					job_category: savedPreferences.job_category ?? "",
					employment_types: savedPreferences.employment_types ?? [],
					expected_salary_min:
						savedPreferences.expected_salary_min?.toString() ?? "",
					expected_salary_max:
						savedPreferences.expected_salary_max?.toString() ?? "",
					availability: savedPreferences.availability ?? "",
					summary: savedPreferences.summary ?? "",
					portfolio_url: savedPreferences.portfolio_url ?? "",
					linkedin_url: savedPreferences.linkedin_url ?? "",
					languages: (savedPreferences.languages ?? []).join(", "),
				});
				setCurrentStep(
					isEditing
						? Math.max(0, Math.min(4, initialStep))
						: Math.max(
								0,
								Math.min(4, (savedPreferences.onboarding_step ?? 1) - 1),
							),
				);
			}

			if (skillsResult.data?.length) {
				setSkills(skillsResult.data.map((item) => item.skill_name));
			}

			if (educationResult.data?.length) {
				setEducations(
					educationResult.data.map((item) => ({
						id: item.id,
						education_level: item.education_level ?? "",
						institution: item.institution ?? "",
						major: item.major ?? "",
						start_year: item.start_year?.toString() ?? "",
						end_year: item.end_year?.toString() ?? "",
						is_current: item.is_current ?? false,
						description: item.description ?? "",
					})),
				);
			}

			if (experienceResult.data?.length) {
				setExperiences(
					experienceResult.data.map((item) => ({
						id: item.id,
						company: item.company ?? "",
						position: item.position ?? "",
						employment_type: item.employment_type ?? "",
						location: item.location ?? "",
						start_month: asMonth(item.start_date),
						end_month: asMonth(item.end_date),
						is_current: item.is_current ?? false,
						description: item.description ?? "",
					})),
				);
			}

			if (certificateResult.data?.length) {
				setCertificates(
					certificateResult.data.map((item) => ({
						id: item.id,
						certificate_name: item.certificate_name ?? "",
						issuer: item.issuer ?? "",
						issue_date: item.issue_date ?? "",
						expiry_date: item.expiry_date ?? "",
						credential_url: item.credential_url ?? "",
						description: item.description ?? "",
					})),
				);
			}

			setLoading(false);
		}

		loadSavedData().catch((caughtError: unknown) => {
			if (!active) return;
			setSetupError(
				caughtError instanceof Error
					? caughtError.message
					: "Data profil belum dapat dimuat.",
			);
			setLoading(false);
		});

		return () => {
			active = false;
		};
	}, [userId, initialName, isEditing, initialStep]);

	function updateIdentity<K extends keyof IdentityForm>(
		key: K,
		value: IdentityForm[K],
	) {
		setIdentity((current) => ({ ...current, [key]: value }));
	}

	function updatePreferences<K extends keyof PreferenceForm>(
		key: K,
		value: PreferenceForm[K],
	) {
		setPreferences((current) => ({ ...current, [key]: value }));
	}

	function updateEducation(
		id: string,
		key: keyof EducationItem,
		value: string | boolean,
	) {
		setEducations((items) =>
			items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
		);
	}

	function updateExperience(
		id: string,
		key: keyof ExperienceItem,
		value: string | boolean,
	) {
		setExperiences((items) =>
			items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
		);
	}

	function updateCertificate(
		id: string,
		key: keyof CertificateItem,
		value: string,
	) {
		setCertificates((items) =>
			items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
		);
	}

	function addSkill(value: string) {
		const normalized = value.trim().replace(/\s+/g, " ");
		if (!normalized) return;
		if (
			skills.some((skill) => skill.toLowerCase() === normalized.toLowerCase())
		) {
			setSkillInput("");
			return;
		}
		setSkills((current) => [...current, normalized]);
		setSkillInput("");
	}

	async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
		const input = event.currentTarget;
		const file = input.files?.[0];
		if (!file) return;

		const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
		if (!allowedTypes.includes(file.type)) {
			setError("Foto profil harus berformat JPG, PNG, atau WEBP.");
			input.value = "";
			return;
		}
		if (file.size > 3 * 1024 * 1024) {
			setError("Ukuran foto maksimal 3 MB.");
			input.value = "";
			return;
		}

		try {
			let normalizedFile = file;
			if (file.type === "image/webp") {
				const bitmap = await createImageBitmap(file);
				const canvas = document.createElement("canvas");
				canvas.width = bitmap.width;
				canvas.height = bitmap.height;
				const context = canvas.getContext("2d");
				if (!context) throw new Error("Foto belum dapat diproses. Coba gunakan JPG atau PNG.");
				context.drawImage(bitmap, 0, 0);
				bitmap.close();
				const jpegBlob = await new Promise<Blob>((resolve, reject) => {
					canvas.toBlob(
						(blob) => blob ? resolve(blob) : reject(new Error("Konversi foto gagal.")),
						"image/jpeg",
						0.9,
					);
				});
				normalizedFile = new File(
					[jpegBlob],
					file.name.replace(/\.[^.]+$/, "") + ".jpg",
					{ type: "image/jpeg", lastModified: Date.now() },
				);
			}

			setError("");
			setPhotoFile(normalizedFile);
			setPhotoPreview(URL.createObjectURL(normalizedFile));
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Foto belum dapat diproses.");
		} finally {
			input.value = "";
		}
	}

	function validateCurrentStep() {
		setError("");

		if (currentStep === 0) {
			if (identity.full_name.trim().length < 3) {
				setError("Nama lengkap minimal 3 karakter.");
				return false;
			}
			if (
				!identity.phone.trim() ||
				!/^[0-9+()\-\s]{8,20}$/.test(identity.phone.trim())
			) {
				setError("Masukkan nomor telepon aktif dengan format yang benar.");
				return false;
			}
			if (
				identity.birth_date &&
				identity.birth_date > new Date().toISOString().slice(0, 10)
			) {
				setError("Tanggal lahir tidak boleh berada di masa depan.");
				return false;
			}
			const requiredLocation = [
				identity.province,
				identity.city,
				identity.district,
				identity.village,
				identity.address,
			];
			if (requiredLocation.some((value) => !value.trim())) {
				setError(
					"Lengkapi provinsi, kota/kabupaten, kecamatan, desa/kelurahan, dan alamat.",
				);
				return false;
			}
			return true;
		}

		if (currentStep === 1) {
			if (!preferences.desired_position.trim()) {
				setError("Isi posisi pekerjaan yang kamu cari.");
				return false;
			}
			if (!preferences.job_category) {
				setError("Pilih kategori pekerjaan yang kamu minati.");
				return false;
			}
			if (skills.length === 0) {
				setError(
					"Tambahkan minimal satu keahlian agar sistem dapat mencocokkan lowongan.",
				);
				return false;
			}
			if (preferences.employment_types.length === 0) {
				setError("Pilih minimal satu tipe pekerjaan yang kamu inginkan.");
				return false;
			}
			const min = preferences.expected_salary_min
				? Number(preferences.expected_salary_min)
				: null;
			const max = preferences.expected_salary_max
				? Number(preferences.expected_salary_max)
				: null;
			if (min !== null && min < 0) {
				setError("Ekspektasi gaji minimum tidak boleh negatif.");
				return false;
			}
			if (max !== null && max < 0) {
				setError("Ekspektasi gaji maksimum tidak boleh negatif.");
				return false;
			}
			if (min !== null && max !== null && min > max) {
				setError("Gaji minimum tidak boleh lebih besar dari gaji maksimum.");
				return false;
			}
			return true;
		}

		if (currentStep === 2) {
			const filled = educations.filter(
				(item) =>
					item.education_level ||
					item.institution ||
					item.major ||
					item.start_year ||
					item.end_year,
			);
			if (filled.length === 0) {
				setError(
					"Tambahkan minimal satu riwayat pendidikan. Jika belum menempuh pendidikan formal, pilih opsi Tidak/belum sekolah.",
				);
				return false;
			}
			if (
				filled.some((item) => !item.education_level || !item.institution.trim())
			) {
				setError(
					"Setiap riwayat pendidikan yang ditambahkan harus memiliki jenjang dan nama institusi.",
				);
				return false;
			}
			if (
				filled.some(
					(item) =>
						item.start_year &&
						item.end_year &&
						Number(item.start_year) > Number(item.end_year),
				)
			) {
				setError(
					"Tahun mulai pendidikan tidak boleh lebih besar dari tahun selesai.",
				);
				return false;
			}
			return true;
		}

		if (currentStep === 3) {
			const filled = experiences.filter(
				(item) =>
					item.company ||
					item.position ||
					item.start_month ||
					item.end_month ||
					item.description,
			);
			if (
				filled.some((item) => !item.company.trim() || !item.position.trim())
			) {
				setError(
					"Lengkapi nama perusahaan dan posisi untuk setiap pengalaman kerja yang ditambahkan.",
				);
				return false;
			}
			if (
				filled.some(
					(item) =>
						item.start_month &&
						item.end_month &&
						item.start_month > item.end_month &&
						!item.is_current,
				)
			) {
				setError(
					"Periode mulai kerja tidak boleh lebih akhir dari periode selesai.",
				);
				return false;
			}
			return true;
		}

		const filledCertificates = certificates.filter(
			(item) =>
				item.certificate_name ||
				item.issuer ||
				item.issue_date ||
				item.credential_url ||
				item.description,
		);
		if (
			filledCertificates.some(
				(item) => !item.certificate_name.trim() || !item.issuer.trim(),
			)
		) {
			setError(
				"Lengkapi nama sertifikat dan lembaga penerbit untuk setiap sertifikat yang ditambahkan.",
			);
			return false;
		}
		if (
			!validOptionalUrl(preferences.portfolio_url) ||
			!validOptionalUrl(preferences.linkedin_url)
		) {
			setError(
				"Tautan portofolio dan LinkedIn harus menggunakan URL yang valid (https://...).",
			);
			return false;
		}
		if (
			filledCertificates.some((item) => !validOptionalUrl(item.credential_url))
		) {
			setError("Tautan bukti sertifikat harus menggunakan URL yang valid.");
			return false;
		}
		if (
			filledCertificates.some(
				(item) =>
					item.issue_date &&
					item.expiry_date &&
					item.issue_date > item.expiry_date,
			)
		) {
			setError(
				"Tanggal kedaluwarsa sertifikat tidak boleh lebih awal dari tanggal diterbitkan.",
			);
			return false;
		}
		return true;
	}

	async function saveCurrentStep() {
		const supabase = createClient();

		if (currentStep === 0) {
			let savedPhotoPath = photoPath;
			if (photoFile) {
				const extension =
					photoFile.type === "image/png"
						? "png"
						: photoFile.type === "image/webp"
							? "webp"
							: "jpg";
				const nextPath = `${userId}/profile-${Date.now()}.${extension}`;
				const { error: uploadError } = await supabase.storage
					.from("profile-photos")
					.upload(nextPath, photoFile, {
						upsert: false,
						cacheControl: "3600",
						contentType: photoFile.type,
					});
				if (uploadError) throw uploadError;
				if (photoPath && photoPath !== nextPath) {
					await supabase.storage.from("profile-photos").remove([photoPath]);
				}
				savedPhotoPath = nextPath;
				setPhotoPath(nextPath);
				const { data: signedPhoto } = await supabase.storage
					.from("profile-photos")
					.createSignedUrl(nextPath, 60 * 60);
				if (signedPhoto?.signedUrl) setPhotoPreview(signedPhoto.signedUrl);
				setPhotoFile(null);
			}

			const { error: profileError } = await supabase.from("profiles").upsert(
				{
					id: userId,
					full_name: identity.full_name.trim(),
					phone: identity.phone.trim(),
					birth_date: identity.birth_date || null,
					gender: identity.gender || null,
					province: identity.province.trim(),
					city: identity.city.trim(),
					district: identity.district.trim(),
					village: identity.village.trim(),
					address: identity.address.trim(),
					postal_code: identity.postal_code.trim() || null,
					latitude: identity.latitude ? Number(identity.latitude) : null,
					longitude: identity.longitude ? Number(identity.longitude) : null,
					photo_path: savedPhotoPath,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "id" },
			);
			if (profileError) throw profileError;

			const { error: progressError } = await supabase
				.from("job_seeker_profiles")
				.upsert(
					{ user_id: userId, onboarding_step: 2 },
					{ onConflict: "user_id" },
				);
			if (progressError) throw progressError;
			return;
		}

		if (currentStep === 1) {
			const { error: preferenceError } = await supabase
				.from("job_seeker_profiles")
				.upsert(
					{
						user_id: userId,
						desired_position: preferences.desired_position.trim(),
						job_category: preferences.job_category,
						employment_types: preferences.employment_types,
						expected_salary_min: preferences.expected_salary_min
							? Number(preferences.expected_salary_min)
							: null,
						expected_salary_max: preferences.expected_salary_max
							? Number(preferences.expected_salary_max)
							: null,
						availability: preferences.availability || null,
						summary: preferences.summary.trim() || null,
						onboarding_step: 3,
					},
					{ onConflict: "user_id" },
				);
			if (preferenceError) throw preferenceError;

			const { error: deleteSkillsError } = await supabase
				.from("job_seeker_skills")
				.delete()
				.eq("user_id", userId);
			if (deleteSkillsError) throw deleteSkillsError;

			if (skills.length > 0) {
				const { error: insertSkillsError } = await supabase
					.from("job_seeker_skills")
					.insert(
						skills.map((skill) => ({
							user_id: userId,
							skill_name: skill.trim(),
						})),
					);
				if (insertSkillsError) throw insertSkillsError;
			}
			return;
		}

		if (currentStep === 2) {
			const filled = educations.filter(
				(item) =>
					item.education_level ||
					item.institution ||
					item.major ||
					item.start_year ||
					item.end_year,
			);
			const { error: deleteError } = await supabase
				.from("job_seeker_education")
				.delete()
				.eq("user_id", userId);
			if (deleteError) throw deleteError;

			if (filled.length > 0) {
				const { error: insertError } = await supabase
					.from("job_seeker_education")
					.insert(
						filled.map((item) => ({
							user_id: userId,
							education_level: item.education_level,
							institution: item.institution.trim(),
							major: item.major.trim() || null,
							start_year: item.start_year ? Number(item.start_year) : null,
							end_year: item.is_current
								? null
								: item.end_year
									? Number(item.end_year)
									: null,
							is_current: item.is_current,
							description: item.description.trim() || null,
						})),
					);
				if (insertError) throw insertError;
			}

			const { error: progressError } = await supabase
				.from("job_seeker_profiles")
				.upsert(
					{ user_id: userId, onboarding_step: 4 },
					{ onConflict: "user_id" },
				);
			if (progressError) throw progressError;
			return;
		}

		if (currentStep === 3) {
			const filled = experiences.filter(
				(item) =>
					item.company ||
					item.position ||
					item.start_month ||
					item.end_month ||
					item.description,
			);
			const { error: deleteError } = await supabase
				.from("job_seeker_experiences")
				.delete()
				.eq("user_id", userId);
			if (deleteError) throw deleteError;

			if (filled.length > 0) {
				const { error: insertError } = await supabase
					.from("job_seeker_experiences")
					.insert(
						filled.map((item) => ({
							user_id: userId,
							company: item.company.trim(),
							position: item.position.trim(),
							employment_type: item.employment_type || null,
							location: item.location.trim() || null,
							start_date: monthToDate(item.start_month),
							end_date: item.is_current ? null : monthToDate(item.end_month),
							is_current: item.is_current,
							description: item.description.trim() || null,
						})),
					);
				if (insertError) throw insertError;
			}

			const { error: progressError } = await supabase
				.from("job_seeker_profiles")
				.upsert(
					{ user_id: userId, onboarding_step: 5 },
					{ onConflict: "user_id" },
				);
			if (progressError) throw progressError;
			return;
		}

		const filled = certificates.filter(
			(item) =>
				item.certificate_name ||
				item.issuer ||
				item.issue_date ||
				item.credential_url ||
				item.description,
		);
		const { error: deleteError } = await supabase
			.from("job_seeker_certificates")
			.delete()
			.eq("user_id", userId);
		if (deleteError) throw deleteError;

		if (filled.length > 0) {
			const { error: insertError } = await supabase
				.from("job_seeker_certificates")
				.insert(
					filled.map((item) => ({
						user_id: userId,
						certificate_name: item.certificate_name.trim(),
						issuer: item.issuer.trim(),
						issue_date: item.issue_date || null,
						expiry_date: item.expiry_date || null,
						credential_url: item.credential_url.trim() || null,
						description: item.description.trim() || null,
					})),
				);
			if (insertError) throw insertError;
		}

		const languages = preferences.languages
			.split(",")
			.map((language) => language.trim())
			.filter(Boolean);

		const { error: finalError } = await supabase
			.from("job_seeker_profiles")
			.upsert(
				{
					user_id: userId,
					portfolio_url: preferences.portfolio_url.trim() || null,
					linkedin_url: preferences.linkedin_url.trim() || null,
					languages,
					onboarding_step: 5,
					profile_completed: true,
					completed_at: new Date().toISOString(),
				},
				{ onConflict: "user_id" },
			);
		if (finalError) throw finalError;
	}

	async function handleNext() {
		if (!validateCurrentStep()) return;
		setSaving(true);
		setError("");

		try {
			await saveCurrentStep();

			if (isEditing) {
				// Mode edit hanya menyimpan bagian yang sedang dibuka.
				// Setelah tersimpan, kembali ke halaman Profil Saya.
				router.replace("/dashboard/pencari-kerja/profil");
				router.refresh();
				return;
			}

			if (currentStep === steps.length - 1) {
				router.replace("/dashboard/pencari-kerja");
				router.refresh();
			} else {
				setCurrentStep((step) => step + 1);
				window.scrollTo({ top: 0, behavior: "smooth" });
			}
		} catch (caughtError: unknown) {
			setError(
				caughtError instanceof Error
					? caughtError.message
					: "Data belum berhasil disimpan. Periksa koneksi lalu coba lagi.",
			);
		} finally {
			setSaving(false);
		}
	}

	function handleBack() {
		setError("");
		setCurrentStep((step) => Math.max(0, step - 1));
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	const currentStepInfo = steps[currentStep];
	const CurrentIcon = currentStepInfo.icon;

	if (loading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-[#ECF0F1] px-4">
				<div className="flex flex-col items-center gap-3 text-center">
					<span className="loading loading-spinner loading-lg text-[#2C3E50]" />
					<p className="text-sm font-semibold text-[#53616D]">
						Menyiapkan profil pencari kerja...
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-[#ECF0F1] px-3 py-5 sm:px-5 sm:py-8 lg:px-8">
			<div className="mx-auto max-w-7xl">
				<header className="mb-6 flex items-center justify-between gap-3 px-1 sm:mb-8">
					<Link href="/" className="flex min-w-0 items-center gap-2.5">
						<span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#2C3E50] text-white shadow-md shadow-[#2C3E50]/10">
							<BriefcaseBusiness size={20} />
						</span>
						<span className="min-w-0">
							<span className="block text-lg font-extrabold leading-none tracking-tight text-[#2C3E50]">
								kerja<span className="text-[#7F8C8D]">lokal</span>
							</span>
							<span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7F8C8D] sm:block">
								Peluang dekat, masa depan hebat
							</span>
						</span>
					</Link>
					<div className="flex items-center gap-2 text-xs font-semibold text-[#7F8C8D]">
						<ShieldCheck size={16} />
						<span className="hidden sm:inline">
							Data profil tersimpan secara aman
						</span>
						<span className="sm:hidden">Profil aman</span>
					</div>
				</header>

				<div className={isEditing ? "mx-auto max-w-4xl" : "grid items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)] xl:gap-7"}>
					{!isEditing && (
					<aside className="rounded-[1.75rem] bg-[#2C3E50] p-5 text-white shadow-xl shadow-[#2C3E50]/10 sm:p-6 lg:sticky lg:top-6">
						<div className="hidden lg:block">
							<span className="badge badge-outline border-white/20 bg-white/5 px-3 py-3 text-[10px] font-bold tracking-wider text-[#BDC3C7]">
								PROFIL PENCARI KERJA
							</span>
							<h1 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight">
								Ceritakan tentang dirimu.
							</h1>
							<p className="mt-3 text-xs leading-6 text-white/60">
								Profil yang lengkap membantu KerjaLokal memahami kemampuan dan
								menemukan peluang kerja yang lebih sesuai.
							</p>
						</div>

						<div className="mt-1 hidden lg:block">
							<div className="my-6 flex items-center justify-between text-[11px] font-bold text-white/65">
								<span>PROGRES PROFIL</span>
								<span className="text-[#ECF0F1]">{progress}%</span>
							</div>
							<progress
								className="progress h-2 w-full bg-white/15 [--progress-color:#BDC3C7]"
								value={progress}
								max="100"
							/>
							<div className="mt-7 space-y-5">
								{steps.map((step, index) => {
									const Icon = step.icon;
									const completed = index < currentStep;
									const active = index === currentStep;
									return (
										<div key={step.title} className="flex items-center gap-3">
											<span
												className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
													completed
														? "border-[#BDC3C7] bg-[#BDC3C7] text-[#2C3E50]"
														: active
															? "border-white bg-white text-[#2C3E50] shadow-lg shadow-black/10"
															: "border-white/15 bg-white/5 text-white/45"
												}`}
											>
												{completed ? <Check size={18} /> : <Icon size={18} />}
											</span>
											<div className="min-w-0">
												<p
													className={`text-sm font-bold ${active ? "text-white" : completed ? "text-[#BDC3C7]" : "text-white/55"}`}
												>
													{step.title}
												</p>
												<p className="mt-0.5 text-[10px] text-white/40">
													{step.subtitle}
												</p>
											</div>
											{active && (
												<ChevronRight
													size={16}
													className="ml-auto text-[#BDC3C7]"
												/>
											)}
										</div>
									);
								})}
							</div>
						</div>

						<div className="lg:hidden">
							<div className="mb-3 flex items-center justify-between gap-3">
								<div>
									<p className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/55">
										Lengkapi profil
									</p>
									<p className="mt-1 text-sm font-extrabold">
										Tahap {currentStep + 1} dari 5
									</p>
								</div>
								<span className="text-sm font-extrabold text-[#BDC3C7]">
									{progress}%
								</span>
							</div>
							<progress
								className="progress h-2 w-full bg-white/15 [--progress-color:#BDC3C7]"
								value={progress}
								max="100"
							/>
							<div className="mt-4 flex gap-2 overflow-x-auto pb-1">
								{steps.map((step, index) => {
									const Icon = step.icon;
									const active = index === currentStep;
									const completed = index < currentStep;
									return (
										<div
											key={step.title}
											className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold ${
												active
													? "bg-white text-[#2C3E50]"
													: completed
														? "bg-white/15 text-[#ECF0F1]"
														: "bg-white/5 text-white/45"
											}`}
										>
											{completed ? <Check size={13} /> : <Icon size={13} />}
											{step.title}
										</div>
									);
								})}
							</div>
						</div>

						<div className="mt-7 hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 lg:block">
							<div className="flex items-center gap-2 text-[#BDC3C7]">
								<CircleHelp size={16} />
								<span className="text-xs font-bold">Butuh bantuan?</span>
							</div>
							<p className="mt-2 text-[11px] leading-5 text-white/55">
								Isi informasi sesuai keadaan sebenarnya. Bagian pengalaman dan
								sertifikat boleh dikosongkan jika belum memilikinya.
							</p>
						</div>
					</aside>
					)}

					<section className="min-w-0 overflow-hidden rounded-[1.75rem] border border-[#BDC3C7]/65 bg-white shadow-xl shadow-[#2C3E50]/5">
						<div className="border-b border-[#BDC3C7]/45 px-5 py-5 sm:px-8 sm:py-7">
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0">
									<div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#7F8C8D]">
										<CurrentIcon size={14} /> {isEditing ? "EDIT PROFIL" : `TAHAP ${currentStep + 1} DARI 5`}
									</div>
									<h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#2C3E50] sm:text-[1.8rem]">
										{currentStep === 0 && "Identitas & lokasi"}
										{currentStep === 1 && "Keahlian & preferensi kerja"}
										{currentStep === 2 && "Riwayat pendidikan"}
										{currentStep === 3 && "Pengalaman kerja"}
										{currentStep === 4 && "Sertifikat & portofolio"}
									</h2>
									<p className="mt-2 max-w-2xl text-xs leading-6 text-[#7F8C8D] sm:text-sm">
									{isEditing
										? "Perbarui informasi pada bagian ini saja. Bagian profil lainnya tidak akan berubah. Setelah disimpan, kamu akan kembali ke halaman Profil Saya."
										: currentStep === 0
											? "Informasi dasar membantu pelaku usaha mengenalmu dan membantu sistem menemukan lowongan di wilayahmu."
											: currentStep === 1
												? "Tambahkan kemampuan dan jenis pekerjaan yang kamu inginkan agar rekomendasi lebih tepat."
												: currentStep === 2
													? "Masukkan pendidikan formal maupun nonformal. Kamu dapat menambahkan lebih dari satu riwayat."
													: currentStep === 3
														? "Ceritakan pengalaman kerja, magang, organisasi, atau pekerjaan lepas. Fresh graduate boleh melewati tahap ini."
														: "Tambahkan sertifikat, tautan portofolio, dan informasi pendukung lainnya jika tersedia."}
								</p>
								</div>
								<span className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#ECF0F1] text-[#34495E] sm:grid">
									<CurrentIcon size={22} />
								</span>
							</div>
						</div>

						{setupError ? (
							<div className="p-5 sm:p-8">
								<div
									role="alert"
									className="alert alert-warning rounded-2xl border border-[#BDC3C7] bg-[#ECF0F1] text-[#34495E]"
								>
									<CircleHelp size={21} />
									<div>
										<h3 className="font-extrabold">Database perlu disiapkan</h3>
										<p className="mt-1 text-xs leading-5">{setupError}</p>
									</div>
								</div>
							</div>
						) : (
							<form
								className="space-y-7 px-5 py-6 sm:px-8 sm:py-8"
								onSubmit={(event) => {
									event.preventDefault();
									void handleNext();
								}}
							>
								{error && (
									<div
										role="alert"
										className="alert alert-error rounded-xl py-3 text-sm"
									>
										<span>{error}</span>
									</div>
								)}

								{currentStep === 0 && (
									<div className="space-y-6">
										<div className="flex flex-col gap-4 rounded-2xl bg-[#ECF0F1]/70 p-4 sm:flex-row sm:items-center sm:p-5">
											<div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-[#BDC3C7] bg-white text-[#7F8C8D]">
												{photoPreview ? (
													<Image
														src={photoPreview}
														alt="Pratinjau foto profil"
														width={96}
														height={96}
														unoptimized
														className="h-full w-full object-cover"
													/>
												) : (
													<UserRound size={34} />
												)}
											</div>
											<div className="min-w-0">
												<h3 className="text-sm font-extrabold text-[#2C3E50]">
													Foto profil
												</h3>
												<p className="mt-1 max-w-lg text-xs leading-5 text-[#7F8C8D]">
													Gunakan foto yang jelas dan pantas agar pelaku usaha
													lebih mudah mengenalimu. Foto bersifat opsional.
												</p>
												<div className="mt-3 flex flex-wrap items-center gap-2">
													<label className="btn btn-sm min-h-9 cursor-pointer rounded-lg border-0 bg-[#2C3E50] px-4 text-xs font-bold text-white hover:bg-[#34495E]">
														Pilih foto
														<input
															type="file"
															accept="image/jpeg,image/png,image/webp"
															className="hidden"
															onChange={handlePhotoChange}
														/>
													</label>
													{photoPreview && (
														<button
															type="button"
															onClick={() => {
																setPhotoFile(null);
																setPhotoPreview(null);
																setPhotoPath(null);
															}}
															className="btn btn-ghost btn-sm min-h-9 rounded-lg text-xs text-[#7F8C8D] hover:bg-white"
														>
															<X size={14} /> Hapus pilihan
														</button>
													)}
													<span className="text-[10px] text-[#7F8C8D]">
														JPG, PNG, WEBP · Maks. 3 MB
													</span>
												</div>
											</div>
										</div>

										<div className="grid gap-4 sm:grid-cols-2">
											<Field
												label="Nama lengkap"
												required
												htmlFor="identity-name"
											>
												<input
													id="identity-name"
													className={inputClass}
													value={identity.full_name}
													onChange={(event) =>
														updateIdentity("full_name", event.target.value)
													}
													placeholder="Nama sesuai identitas"
													autoComplete="name"
												/>
											</Field>
											<Field
												label="Nomor telepon / WhatsApp"
												required
												htmlFor="identity-phone"
												hint="Gunakan nomor yang aktif dan dapat dihubungi."
											>
												<input
													id="identity-phone"
													className={inputClass}
													value={identity.phone}
													onChange={(event) =>
														updateIdentity("phone", event.target.value)
													}
													placeholder="08xxxxxxxxxx"
													type="tel"
													autoComplete="tel"
												/>
											</Field>
											<Field label="Tanggal lahir" htmlFor="identity-birth">
												<input
													id="identity-birth"
													className={inputClass}
													value={identity.birth_date}
													onChange={(event) =>
														updateIdentity("birth_date", event.target.value)
													}
													type="date"
												/>
											</Field>
											<Field
												label="Jenis kelamin"
												htmlFor="identity-gender"
												hint="Opsional. Boleh tidak diisi."
											>
												<select
													id="identity-gender"
													className={selectClass}
													value={identity.gender}
													onChange={(event) =>
														updateIdentity("gender", event.target.value)
													}
												>
													<option value="">Pilih jika ingin mengisi</option>
													<option value="Laki-laki">Laki-laki</option>
													<option value="Perempuan">Perempuan</option>
													<option value="Tidak ingin menyebutkan">
														Tidak ingin menyebutkan
													</option>
												</select>
											</Field>
										</div>

										<div className="border-t border-[#BDC3C7]/50 pt-5">
											<div className="mb-4 flex items-center gap-2">
												<MapPin size={17} className="text-[#7F8C8D]" />
												<div>
													<h3 className="text-sm font-extrabold text-[#2C3E50]">
														Domisili saat ini
													</h3>
													<p className="mt-0.5 text-[11px] text-[#7F8C8D]">
														Isi berdasarkan tempat tinggal sekarang, bukan
														alamat asal jika berbeda.
													</p>
												</div>
											</div>
											<div className="grid gap-4 sm:grid-cols-2">
												<Field
													label="Provinsi"
													required
													htmlFor="identity-province"
												>
													<input
														id="identity-province"
														className={inputClass}
														value={identity.province}
														onChange={(event) =>
															updateIdentity("province", event.target.value)
														}
														placeholder="Contoh: Jawa Barat"
														autoComplete="address-level1"
													/>
												</Field>
												<Field
													label="Kota / Kabupaten"
													required
													htmlFor="identity-city"
												>
													<input
														id="identity-city"
														className={inputClass}
														value={identity.city}
														onChange={(event) =>
															updateIdentity("city", event.target.value)
														}
														placeholder="Contoh: Kota Bandung"
														autoComplete="address-level2"
													/>
												</Field>
												<Field
													label="Kecamatan"
													required
													htmlFor="identity-district"
												>
													<input
														id="identity-district"
														className={inputClass}
														value={identity.district}
														onChange={(event) =>
															updateIdentity("district", event.target.value)
														}
														placeholder="Nama kecamatan"
													/>
												</Field>
												<Field
													label="Desa / Kelurahan"
													required
													htmlFor="identity-village"
												>
													<input
														id="identity-village"
														className={inputClass}
														value={identity.village}
														onChange={(event) =>
															updateIdentity("village", event.target.value)
														}
														placeholder="Nama desa atau kelurahan"
													/>
												</Field>
												<div className="sm:col-span-2">
													<Field
														label="Alamat lengkap"
														required
														htmlFor="identity-address"
														hint="Contoh: Jl. Melati No. 12, RT 02/RW 04, dekat kantor kelurahan."
													>
														<textarea
															id="identity-address"
															className={`${textareaClass} min-h-24`}
															value={identity.address}
															onChange={(event) =>
																updateIdentity("address", event.target.value)
															}
															placeholder="Nama jalan, nomor rumah, RT/RW, dan patokan lokasi"
														/>
													</Field>
												</div>
												<Field label="Kode pos" htmlFor="identity-postal">
													<input
														id="identity-postal"
														className={inputClass}
														value={identity.postal_code}
														onChange={(event) =>
															updateIdentity("postal_code", event.target.value)
														}
														placeholder="Contoh: 40292"
														inputMode="numeric"
														maxLength={10}
													/>
												</Field>
											</div>
											<div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#BDC3C7]/60 bg-[#ECF0F1]/55 p-4 sm:flex-row sm:items-center sm:justify-between">
												<div className="flex items-start gap-2.5">
													<MapPin
														size={17}
														className="mt-0.5 shrink-0 text-[#34495E]"
													/>
													<div>
														<p className="text-xs font-bold text-[#34495E]">
															Tandai titik lokasi (opsional)
														</p>
														<p className="mt-1 max-w-xl text-[11px] leading-5 text-[#7F8C8D]">
															Izinkan browser menggunakan lokasi perangkat agar
															pencarian lowongan berdasarkan jarak dapat lebih
															akurat. Koordinat tidak ditampilkan sebagai alamat
															publik.
														</p>
														{identity.latitude && identity.longitude && (
															<span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#536C62]">
																<CheckCircle2 size={12} /> Titik lokasi berhasil
																ditambahkan
															</span>
														)}
													</div>
												</div>
												<button
													type="button"
													disabled={geoLoading}
													onClick={() => {
														setError("");
														if (!navigator.geolocation) {
															setError(
																"Browser ini tidak mendukung fitur lokasi. Kamu tetap dapat melanjutkan dengan alamat administratif.",
															);
															return;
														}
														setGeoLoading(true);
														navigator.geolocation.getCurrentPosition(
															(position) => {
																updateIdentity(
																	"latitude",
																	position.coords.latitude.toString(),
																);
																updateIdentity(
																	"longitude",
																	position.coords.longitude.toString(),
																);
																setGeoLoading(false);
															},
															(geoError) => {
																setGeoLoading(false);
																setError(
																	geoError.code === 1
																		? "Izin lokasi ditolak. Aktifkan izin lokasi di browser jika ingin menambahkan titik koordinat."
																		: "Lokasi belum dapat diperoleh. Coba lagi atau lanjutkan tanpa koordinat.",
																);
															},
															{
																enableHighAccuracy: false,
																timeout: 12000,
																maximumAge: 300000,
															},
														);
													}}
													className="btn btn-outline btn-sm min-h-10 shrink-0 rounded-lg border-[#7F8C8D] text-[11px] font-bold text-[#34495E] hover:border-[#2C3E50] hover:bg-white"
												>
													{geoLoading ? (
														<LoaderCircle size={14} className="animate-spin" />
													) : (
														<MapPin size={14} />
													)}
													{geoLoading
														? "Mencari lokasi..."
														: identity.latitude
															? "Perbarui lokasi"
															: "Gunakan lokasi saya"}
												</button>
											</div>
										</div>
									</div>
								)}

								{currentStep === 1 && (
									<div className="space-y-6">
										<div className="grid gap-4 sm:grid-cols-2">
											<Field
												label="Posisi pekerjaan yang dicari"
												required
												htmlFor="desired-position"
												hint="Contoh: Admin toko, kasir, barista, staf gudang."
											>
												<input
													id="desired-position"
													className={inputClass}
													value={preferences.desired_position}
													onChange={(event) =>
														updatePreferences(
															"desired_position",
															event.target.value,
														)
													}
													placeholder="Posisi yang kamu inginkan"
												/>
											</Field>
											<Field
												label="Kategori pekerjaan"
												required
												htmlFor="job-category"
											>
												<select
													id="job-category"
													className={selectClass}
													value={preferences.job_category}
													onChange={(event) =>
														updatePreferences(
															"job_category",
															event.target.value,
														)
													}
												>
													<option value="">Pilih kategori</option>
													{categories.map((category) => (
														<option key={category} value={category}>
															{category}
														</option>
													))}
												</select>
											</Field>
										</div>

										<div>
											<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
												<div>
													<h3 className="text-sm font-extrabold text-[#2C3E50]">
														Keahlian yang kamu miliki{" "}
														<span className="text-red-500">*</span>
													</h3>
													<p className="mt-1 text-[11px] text-[#7F8C8D]">
														Tambahkan kemampuan teknis maupun nonteknis.
													</p>
												</div>
												<span className="badge badge-outline border-[#BDC3C7] text-[10px] text-[#7F8C8D]">
													{skills.length} keahlian
												</span>
											</div>
											<div className="flex flex-col gap-2 sm:flex-row">
												<input
													className={inputClass}
													value={skillInput}
													onChange={(event) =>
														setSkillInput(event.target.value)
													}
													onKeyDown={(event) => {
														if (event.key === "Enter") {
															event.preventDefault();
															addSkill(skillInput);
														}
													}}
													placeholder="Ketik keahlian, lalu tekan Enter"
													aria-label="Tambah keahlian"
												/>
												<button
													type="button"
													onClick={() => addSkill(skillInput)}
													className="btn min-h-12 rounded-xl border-0 bg-[#34495E] px-5 text-white hover:bg-[#2C3E50]"
												>
													<Plus size={17} /> Tambah
												</button>
											</div>
											{skills.length > 0 && (
												<div className="mt-3 flex flex-wrap gap-2">
													{skills.map((skill) => (
														<span
															key={skill}
															className="badge badge-lg gap-2 border-0 bg-[#ECF0F1] px-3 py-4 text-xs font-semibold text-[#34495E]"
														>
															{skill}
															<button
																type="button"
																onClick={() =>
																	setSkills((current) =>
																		current.filter((item) => item !== skill),
																	)
																}
																aria-label={`Hapus ${skill}`}
																className="rounded-full text-[#7F8C8D] hover:text-red-600"
															>
																<X size={13} />
															</button>
														</span>
													))}
												</div>
											)}
											<div className="mt-4">
												<p className="mb-2 text-[11px] font-bold text-[#7F8C8D]">
													Ide keahlian yang bisa ditambahkan:
												</p>
												<div className="flex flex-wrap gap-2">
													{skillSuggestions
														.filter(
															(suggestion) =>
																!skills.some(
																	(skill) =>
																		skill.toLowerCase() ===
																		suggestion.toLowerCase(),
																),
														)
														.slice(0, 8)
														.map((suggestion) => (
															<button
																key={suggestion}
																type="button"
																onClick={() => addSkill(suggestion)}
																className="badge badge-outline cursor-pointer border-[#BDC3C7] px-3 py-3 text-[10px] font-medium text-[#53616D] transition hover:border-[#34495E] hover:bg-[#ECF0F1]"
															>
																+ {suggestion}
															</button>
														))}
												</div>
											</div>
										</div>

										<div className="border-t border-[#BDC3C7]/50 pt-5">
											<h3 className="text-sm font-extrabold text-[#2C3E50]">
												Tipe pekerjaan yang diminati{" "}
												<span className="text-red-500">*</span>
											</h3>
											<p className="mt-1 text-[11px] text-[#7F8C8D]">
												Kamu boleh memilih lebih dari satu.
											</p>
											<div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
												{employmentOptions.map((option) => {
													const checked =
														preferences.employment_types.includes(option);
													return (
														<label
															key={option}
															className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs font-semibold transition ${checked ? "border-[#34495E] bg-[#ECF0F1] text-[#2C3E50]" : "border-[#BDC3C7]/70 bg-white text-[#53616D] hover:bg-[#ECF0F1]/50"}`}
														>
															<input
																type="checkbox"
																className="checkbox checkbox-sm checkbox-primary rounded-md border-[#BDC3C7] [--chkbg:#2C3E50] [--chkfg:#ECF0F1]"
																checked={checked}
																onChange={(event) =>
																	updatePreferences(
																		"employment_types",
																		event.target.checked
																			? [
																					...preferences.employment_types,
																					option,
																				]
																			: preferences.employment_types.filter(
																					(item) => item !== option,
																				),
																	)
																}
															/>
															{option}
														</label>
													);
												})}
											</div>
										</div>

										<div className="grid gap-4 sm:grid-cols-2">
											<Field
												label="Ekspektasi gaji minimum (Rp/bulan)"
												htmlFor="salary-min"
												hint="Opsional. Masukkan angka tanpa titik."
											>
												<input
													id="salary-min"
													className={inputClass}
													type="number"
													min="0"
													inputMode="numeric"
													value={preferences.expected_salary_min}
													onChange={(event) =>
														updatePreferences(
															"expected_salary_min",
															event.target.value,
														)
													}
													placeholder="Contoh: 3000000"
												/>
											</Field>
											<Field
												label="Ekspektasi gaji maksimum (Rp/bulan)"
												htmlFor="salary-max"
												hint="Opsional. Sesuaikan dengan targetmu."
											>
												<input
													id="salary-max"
													className={inputClass}
													type="number"
													min="0"
													inputMode="numeric"
													value={preferences.expected_salary_max}
													onChange={(event) =>
														updatePreferences(
															"expected_salary_max",
															event.target.value,
														)
													}
													placeholder="Contoh: 5000000"
												/>
											</Field>
											<Field
												label="Kapan bisa mulai bekerja?"
												htmlFor="availability"
											>
												<select
													id="availability"
													className={selectClass}
													value={preferences.availability}
													onChange={(event) =>
														updatePreferences(
															"availability",
															event.target.value,
														)
													}
												>
													<option value="">Pilih ketersediaan</option>
													<option value="Segera">Segera</option>
													<option value="Dalam 1-2 minggu">
														Dalam 1–2 minggu
													</option>
													<option value="Dalam 1 bulan">Dalam 1 bulan</option>
													<option value="Masih bekerja">Masih bekerja</option>
													<option value="Fleksibel">Fleksibel</option>
												</select>
											</Field>
										</div>

										<Field
											label="Ringkasan singkat tentang dirimu"
											htmlFor="profile-summary"
											hint="Tulis 2–4 kalimat tentang kemampuan, minat, atau tujuan kerjamu. Jangan menambahkan informasi yang tidak sesuai kenyataan."
										>
											<textarea
												id="profile-summary"
												className={textareaClass}
												maxLength={600}
												value={preferences.summary}
												onChange={(event) =>
													updatePreferences("summary", event.target.value)
												}
												placeholder="Contoh: Saya lulusan SMK yang tertarik pada bidang administrasi. Terbiasa menggunakan Microsoft Office, teliti, dan mampu bekerja dalam tim."
											/>
										</Field>
									</div>
								)}

								{currentStep === 2 && (
									<div className="space-y-5">
										<div className="rounded-xl border border-[#BDC3C7]/60 bg-[#ECF0F1]/60 p-4 text-xs leading-5 text-[#53616D]">
											<div className="flex items-center gap-2 font-bold text-[#34495E]">
												<GraduationCap size={16} /> Riwayat pendidikan
											</div>
											<p className="mt-1">
												Masukkan pendidikan terakhir terlebih dahulu. Jika
												memiliki pendidikan lain atau pelatihan formal, kamu
												dapat menambahkannya.
											</p>
										</div>

										{educations.map((item, index) => (
											<div
												key={item.id}
												className="rounded-2xl border border-[#BDC3C7]/70 p-4 sm:p-5"
											>
												<div className="mb-4 flex items-center justify-between gap-3">
													<h3 className="text-sm font-extrabold text-[#2C3E50]">
														Pendidikan {index + 1}
													</h3>
													{educations.length > 1 && (
														<button
															type="button"
															onClick={() =>
																setEducations((current) =>
																	current.filter(
																		(entry) => entry.id !== item.id,
																	),
																)
															}
															className="btn btn-ghost btn-xs rounded-lg text-red-600 hover:bg-red-50"
														>
															<Trash2 size={14} /> Hapus
														</button>
													)}
												</div>
												<div className="grid gap-4 sm:grid-cols-2">
													<Field
														label="Jenjang pendidikan"
														required
														htmlFor={`education-level-${item.id}`}
													>
														<select
															id={`education-level-${item.id}`}
															className={selectClass}
															value={item.education_level}
															onChange={(event) =>
																updateEducation(
																	item.id,
																	"education_level",
																	event.target.value,
																)
															}
														>
															<option value="">Pilih jenjang</option>
															{educationLevels.map((level) => (
																<option key={level} value={level}>
																	{level}
																</option>
															))}
														</select>
													</Field>
													<Field
														label="Nama sekolah / institusi"
														required
														htmlFor={`education-institution-${item.id}`}
													>
														<input
															id={`education-institution-${item.id}`}
															className={inputClass}
															value={item.institution}
															onChange={(event) =>
																updateEducation(
																	item.id,
																	"institution",
																	event.target.value,
																)
															}
															placeholder="Nama sekolah atau kampus"
														/>
													</Field>
													<Field
														label="Jurusan / bidang studi"
														htmlFor={`education-major-${item.id}`}
													>
														<input
															id={`education-major-${item.id}`}
															className={inputClass}
															value={item.major}
															onChange={(event) =>
																updateEducation(
																	item.id,
																	"major",
																	event.target.value,
																)
															}
															placeholder="Contoh: Akuntansi, Multimedia"
														/>
													</Field>
													<div className="grid grid-cols-2 gap-3">
														<Field
															label="Tahun mulai"
															htmlFor={`education-start-${item.id}`}
														>
															<input
																id={`education-start-${item.id}`}
																className={inputClass}
																type="number"
																min="1950"
																max="2100"
																value={item.start_year}
																onChange={(event) =>
																	updateEducation(
																		item.id,
																		"start_year",
																		event.target.value,
																	)
																}
																placeholder="2019"
															/>
														</Field>
														<Field
															label="Tahun selesai"
															htmlFor={`education-end-${item.id}`}
														>
															<input
																id={`education-end-${item.id}`}
																className={inputClass}
																type="number"
																min="1950"
																max="2100"
																disabled={item.is_current}
																value={item.end_year}
																onChange={(event) =>
																	updateEducation(
																		item.id,
																		"end_year",
																		event.target.value,
																	)
																}
																placeholder="2022"
															/>
														</Field>
													</div>
													<div className="sm:col-span-2">
														<label className="flex cursor-pointer items-center gap-3 text-xs font-medium text-[#53616D]">
															<input
																type="checkbox"
																className="checkbox checkbox-sm checkbox-primary rounded-md [--chkbg:#2C3E50] [--chkfg:#ECF0F1]"
																checked={item.is_current}
																onChange={(event) =>
																	updateEducation(
																		item.id,
																		"is_current",
																		event.target.checked,
																	)
																}
															/>
															Saya masih menempuh pendidikan ini
														</label>
													</div>
													<div className="sm:col-span-2">
														<Field
															label="Keterangan tambahan"
															htmlFor={`education-description-${item.id}`}
														>
															<textarea
																id={`education-description-${item.id}`}
																className={`${textareaClass} min-h-20`}
																value={item.description}
																onChange={(event) =>
																	updateEducation(
																		item.id,
																		"description",
																		event.target.value,
																	)
																}
																placeholder="Opsional: prestasi, organisasi, atau fokus pembelajaran."
															/>
														</Field>
													</div>
												</div>
											</div>
										))}

										<button
											type="button"
											onClick={() =>
												setEducations((current) => [
													...current,
													emptyEducation(),
												])
											}
											className="btn btn-outline min-h-11 w-full rounded-xl border-dashed border-[#7F8C8D] text-xs font-bold text-[#34495E] hover:border-[#2C3E50] hover:bg-[#ECF0F1]"
										>
											<Plus size={16} /> Tambah pendidikan lain
										</button>
									</div>
								)}

								{currentStep === 3 && (
									<div className="space-y-5">
										<div className="rounded-xl border border-[#BDC3C7]/60 bg-[#ECF0F1]/60 p-4">
											<label className="flex cursor-pointer items-start gap-3">
												<input
													type="checkbox"
													className="checkbox checkbox-sm checkbox-primary mt-0.5 rounded-md [--chkbg:#2C3E50] [--chkfg:#ECF0F1]"
													checked={noExperience}
													onChange={(event) => {
														setNoExperience(event.target.checked);
														if (event.target.checked) setExperiences([]);
													}}
												/>
												<span>
													<span className="block text-sm font-extrabold text-[#2C3E50]">
														Saya belum memiliki pengalaman kerja
													</span>
													<span className="mt-1 block text-xs leading-5 text-[#7F8C8D]">
														Tidak masalah. Kamu tetap dapat melanjutkan sebagai
														fresh graduate atau pencari kerja pertama.
													</span>
												</span>
											</label>
										</div>

										{!noExperience && (
											<>
												{experiences.length === 0 && (
													<div className="rounded-2xl border border-dashed border-[#BDC3C7] px-5 py-9 text-center">
														<BriefcaseBusiness
															size={28}
															className="mx-auto text-[#7F8C8D]"
														/>
														<h3 className="mt-3 text-sm font-extrabold text-[#2C3E50]">
															Belum ada pengalaman yang ditambahkan
														</h3>
														<p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#7F8C8D]">
															Kamu dapat menambahkan pekerjaan formal, magang,
															freelance, atau pengalaman relevan lainnya. Tahap
															ini boleh dilewati.
														</p>
														<button
															type="button"
															onClick={() =>
																setExperiences([emptyExperience()])
															}
															className="btn btn-sm mt-4 rounded-lg border-0 bg-[#2C3E50] text-white hover:bg-[#34495E]"
														>
															<Plus size={15} /> Tambah pengalaman
														</button>
													</div>
												)}

												{experiences.map((item, index) => (
													<div
														key={item.id}
														className="rounded-2xl border border-[#BDC3C7]/70 p-4 sm:p-5"
													>
														<div className="mb-4 flex items-center justify-between gap-3">
															<h3 className="text-sm font-extrabold text-[#2C3E50]">
																Pengalaman {index + 1}
															</h3>
															<button
																type="button"
																onClick={() =>
																	setExperiences((current) =>
																		current.filter(
																			(entry) => entry.id !== item.id,
																		),
																	)
																}
																className="btn btn-ghost btn-xs rounded-lg text-red-600 hover:bg-red-50"
															>
																<Trash2 size={14} /> Hapus
															</button>
														</div>
														<div className="grid gap-4 sm:grid-cols-2">
															<Field
																label="Nama perusahaan / tempat kerja"
																required
																htmlFor={`experience-company-${item.id}`}
															>
																<input
																	id={`experience-company-${item.id}`}
																	className={inputClass}
																	value={item.company}
																	onChange={(event) =>
																		updateExperience(
																			item.id,
																			"company",
																			event.target.value,
																		)
																	}
																	placeholder="Nama perusahaan atau usaha"
																/>
															</Field>
															<Field
																label="Posisi / jabatan"
																required
																htmlFor={`experience-position-${item.id}`}
															>
																<input
																	id={`experience-position-${item.id}`}
																	className={inputClass}
																	value={item.position}
																	onChange={(event) =>
																		updateExperience(
																			item.id,
																			"position",
																			event.target.value,
																		)
																	}
																	placeholder="Contoh: Kasir, Barista"
																/>
															</Field>
															<Field
																label="Tipe pekerjaan"
																htmlFor={`experience-type-${item.id}`}
															>
																<select
																	id={`experience-type-${item.id}`}
																	className={selectClass}
																	value={item.employment_type}
																	onChange={(event) =>
																		updateExperience(
																			item.id,
																			"employment_type",
																			event.target.value,
																		)
																	}
																>
																	<option value="">Pilih tipe</option>
																	{employmentOptions.map((option) => (
																		<option key={option} value={option}>
																			{option}
																		</option>
																	))}
																	<option value="Organisasi / Relawan">
																		Organisasi / Relawan
																	</option>
																</select>
															</Field>
															<Field
																label="Lokasi pekerjaan"
																htmlFor={`experience-location-${item.id}`}
															>
																<input
																	id={`experience-location-${item.id}`}
																	className={inputClass}
																	value={item.location}
																	onChange={(event) =>
																		updateExperience(
																			item.id,
																			"location",
																			event.target.value,
																		)
																	}
																	placeholder="Kota atau kecamatan"
																/>
															</Field>
															<Field
																label="Mulai bekerja"
																htmlFor={`experience-start-${item.id}`}
															>
																<input
																	id={`experience-start-${item.id}`}
																	className={inputClass}
																	type="month"
																	value={item.start_month}
																	onChange={(event) =>
																		updateExperience(
																			item.id,
																			"start_month",
																			event.target.value,
																		)
																	}
																/>
															</Field>
															<Field
																label="Selesai bekerja"
																htmlFor={`experience-end-${item.id}`}
															>
																<input
																	id={`experience-end-${item.id}`}
																	className={inputClass}
																	type="month"
																	disabled={item.is_current}
																	value={item.end_month}
																	onChange={(event) =>
																		updateExperience(
																			item.id,
																			"end_month",
																			event.target.value,
																		)
																	}
																/>
															</Field>
															<div className="sm:col-span-2">
																<label className="flex cursor-pointer items-center gap-3 text-xs font-medium text-[#53616D]">
																	<input
																		type="checkbox"
																		className="checkbox checkbox-sm checkbox-primary rounded-md [--chkbg:#2C3E50] [--chkfg:#ECF0F1]"
																		checked={item.is_current}
																		onChange={(event) =>
																			updateExperience(
																				item.id,
																				"is_current",
																				event.target.checked,
																			)
																		}
																	/>
																	Saya masih bekerja di tempat ini
																</label>
															</div>
															<div className="sm:col-span-2">
																<Field
																	label="Deskripsi pekerjaan dan tanggung jawab"
																	htmlFor={`experience-description-${item.id}`}
																	hint="Tuliskan tugas utama atau pencapaian secara singkat."
																>
																	<textarea
																		id={`experience-description-${item.id}`}
																		className={textareaClass}
																		value={item.description}
																		onChange={(event) =>
																			updateExperience(
																				item.id,
																				"description",
																				event.target.value,
																			)
																		}
																		placeholder="Contoh: Melayani pelanggan, mengelola transaksi kasir, dan membuat laporan penjualan harian."
																	/>
																</Field>
															</div>
														</div>
													</div>
												))}

												{experiences.length > 0 && (
													<button
														type="button"
														onClick={() =>
															setExperiences((current) => [
																...current,
																emptyExperience(),
															])
														}
														className="btn btn-outline min-h-11 w-full rounded-xl border-dashed border-[#7F8C8D] text-xs font-bold text-[#34495E] hover:border-[#2C3E50] hover:bg-[#ECF0F1]"
													>
														<Plus size={16} /> Tambah pengalaman lain
													</button>
												)}
											</>
										)}
									</div>
								)}

								{currentStep === 4 && (
									<div className="space-y-6">
										<div>
											<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
												<div>
													<h3 className="text-sm font-extrabold text-[#2C3E50]">
														Sertifikat & pelatihan
													</h3>
													<p className="mt-1 text-[11px] text-[#7F8C8D]">
														Opsional. Tambahkan sertifikat kompetensi, kursus,
														atau pelatihan.
													</p>
												</div>
												<span className="badge badge-outline border-[#BDC3C7] text-[10px] text-[#7F8C8D]">
													{certificates.length} sertifikat
												</span>
											</div>

											{certificates.map((item, index) => (
												<div
													key={item.id}
													className="mb-4 rounded-2xl border border-[#BDC3C7]/70 p-4 sm:p-5"
												>
													<div className="mb-4 flex items-center justify-between gap-3">
														<h4 className="text-sm font-extrabold text-[#2C3E50]">
															Sertifikat {index + 1}
														</h4>
														<button
															type="button"
															onClick={() =>
																setCertificates((current) =>
																	current.filter(
																		(entry) => entry.id !== item.id,
																	),
																)
															}
															className="btn btn-ghost btn-xs rounded-lg text-red-600 hover:bg-red-50"
														>
															<Trash2 size={14} /> Hapus
														</button>
													</div>
													<div className="grid gap-4 sm:grid-cols-2">
														<Field
															label="Nama sertifikat / pelatihan"
															required
															htmlFor={`certificate-name-${item.id}`}
														>
															<input
																id={`certificate-name-${item.id}`}
																className={inputClass}
																value={item.certificate_name}
																onChange={(event) =>
																	updateCertificate(
																		item.id,
																		"certificate_name",
																		event.target.value,
																	)
																}
																placeholder="Contoh: Sertifikat Microsoft Excel"
															/>
														</Field>
														<Field
															label="Penerbit / penyelenggara"
															required
															htmlFor={`certificate-issuer-${item.id}`}
														>
															<input
																id={`certificate-issuer-${item.id}`}
																className={inputClass}
																value={item.issuer}
																onChange={(event) =>
																	updateCertificate(
																		item.id,
																		"issuer",
																		event.target.value,
																	)
																}
																placeholder="Nama lembaga"
															/>
														</Field>
														<Field
															label="Tanggal diterbitkan"
															htmlFor={`certificate-issued-${item.id}`}
														>
															<input
																id={`certificate-issued-${item.id}`}
																className={inputClass}
																type="date"
																value={item.issue_date}
																onChange={(event) =>
																	updateCertificate(
																		item.id,
																		"issue_date",
																		event.target.value,
																	)
																}
															/>
														</Field>
														<Field
															label="Tanggal kedaluwarsa"
															htmlFor={`certificate-expiry-${item.id}`}
															hint="Kosongkan jika tidak memiliki masa berlaku."
														>
															<input
																id={`certificate-expiry-${item.id}`}
																className={inputClass}
																type="date"
																value={item.expiry_date}
																onChange={(event) =>
																	updateCertificate(
																		item.id,
																		"expiry_date",
																		event.target.value,
																	)
																}
															/>
														</Field>
														<div className="sm:col-span-2">
															<Field
																label="Tautan sertifikat"
																htmlFor={`certificate-url-${item.id}`}
																hint="Opsional. Gunakan tautan publik yang dapat diverifikasi, jika tersedia."
															>
																<input
																	id={`certificate-url-${item.id}`}
																	className={inputClass}
																	type="url"
																	value={item.credential_url}
																	onChange={(event) =>
																		updateCertificate(
																			item.id,
																			"credential_url",
																			event.target.value,
																		)
																	}
																	placeholder="https://..."
																/>
															</Field>
														</div>
														<div className="sm:col-span-2">
															<Field
																label="Keterangan"
																htmlFor={`certificate-description-${item.id}`}
															>
																<textarea
																	id={`certificate-description-${item.id}`}
																	className={`${textareaClass} min-h-20`}
																	value={item.description}
																	onChange={(event) =>
																		updateCertificate(
																			item.id,
																			"description",
																			event.target.value,
																		)
																	}
																	placeholder="Opsional: kompetensi atau materi yang dipelajari."
																/>
															</Field>
														</div>
													</div>
												</div>
											))}

											<button
												type="button"
												onClick={() =>
													setCertificates((current) => [
														...current,
														emptyCertificate(),
													])
												}
												className="btn btn-outline min-h-11 w-full rounded-xl border-dashed border-[#7F8C8D] text-xs font-bold text-[#34495E] hover:border-[#2C3E50] hover:bg-[#ECF0F1]"
											>
												<Plus size={16} /> Tambah sertifikat
											</button>
										</div>

										<div className="border-t border-[#BDC3C7]/50 pt-5">
											<h3 className="mb-4 text-sm font-extrabold text-[#2C3E50]">
												Portofolio & informasi tambahan
											</h3>
											<div className="grid gap-4 sm:grid-cols-2">
												<Field
													label="Tautan portofolio"
													htmlFor="portfolio-url"
													hint="Opsional: Google Drive, Behance, GitHub, atau website pribadi."
												>
													<input
														id="portfolio-url"
														className={inputClass}
														type="url"
														value={preferences.portfolio_url}
														onChange={(event) =>
															updatePreferences(
																"portfolio_url",
																event.target.value,
															)
														}
														placeholder="https://..."
													/>
												</Field>
												<Field
													label="Profil LinkedIn"
													htmlFor="linkedin-url"
													hint="Opsional."
												>
													<input
														id="linkedin-url"
														className={inputClass}
														type="url"
														value={preferences.linkedin_url}
														onChange={(event) =>
															updatePreferences(
																"linkedin_url",
																event.target.value,
															)
														}
														placeholder="https://linkedin.com/in/..."
													/>
												</Field>
												<div className="sm:col-span-2">
													<Field
														label="Bahasa yang dikuasai"
														htmlFor="languages"
														hint="Pisahkan dengan koma. Contoh: Bahasa Indonesia, Bahasa Inggris."
													>
														<input
															id="languages"
															className={inputClass}
															value={preferences.languages}
															onChange={(event) =>
																updatePreferences(
																	"languages",
																	event.target.value,
																)
															}
															placeholder="Bahasa Indonesia, Bahasa Inggris"
														/>
													</Field>
												</div>
											</div>
										</div>

										<div className="rounded-2xl border border-[#BDC3C7]/70 bg-[#ECF0F1]/65 p-4 sm:p-5">
											<div className="flex items-start gap-3">
												<span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-[#34495E]">
													<ShieldCheck size={18} />
												</span>
												<div>
													<h3 className="text-xs font-extrabold text-[#2C3E50]">
														Kontrol data profil
													</h3>
													<p className="mt-1 text-[11px] leading-5 text-[#7F8C8D]">
														Informasi profil dan dokumen tidak otomatis
														dibagikan ke semua pelaku usaha. Saat melamar, kamu
														akan diminta memberikan persetujuan pembagian CV
														kepada usaha yang membuka lowongan tersebut.
													</p>
												</div>
											</div>
										</div>
									</div>
								)}

								<div className="flex flex-col-reverse gap-3 border-t border-[#BDC3C7]/50 pt-5 sm:flex-row sm:items-center sm:justify-between">
									<button
										type="button"
										onClick={() => {
							if (isEditing) {
								router.replace("/dashboard/pencari-kerja/profil");
								return;
							}
							handleBack();
						}}
										disabled={(!isEditing && currentStep === 0) || saving}
										className="btn btn-ghost min-h-12 rounded-xl px-5 text-sm font-bold text-[#53616D] hover:bg-[#ECF0F1] disabled:opacity-40"
									>
										<ArrowLeft size={16} /> {isEditing ? "Batal" : "Kembali"}
									</button>
									<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
										{currentStep === 3 && !noExperience && (
											<span className="hidden text-[10px] text-[#7F8C8D] sm:inline">
												Tahap ini boleh dilewati.
											</span>
										)}
										{currentStep === 4 && (
											<span className="hidden text-[10px] text-[#7F8C8D] sm:inline">
												Sertifikat dan tautan bersifat opsional.
											</span>
										)}
										<button
											type="submit"
											disabled={saving}
											className="btn btn-primary min-h-12 rounded-xl border-0 bg-[#2C3E50] px-6 text-sm font-bold text-white shadow-md shadow-[#2C3E50]/10 hover:bg-[#34495E]"
										>
											{saving ? (
												<>
													<LoaderCircle size={17} className="animate-spin" />{" "}
													Menyimpan...
												</>
											) : isEditing ? (
								<>
									Simpan Perubahan <CheckCircle2 size={17} />
								</>
							) : currentStep === steps.length - 1 ? (
												<>
													Simpan & Selesaikan <CheckCircle2 size={17} />
												</>
											) : (
												<>
													Simpan & Lanjut <ArrowRight size={17} />
												</>
											)}
										</button>
									</div>
								</div>
							</form>
						)}
					</section>
				</div>

				<footer className="mt-6 flex flex-col items-center justify-between gap-2 px-1 text-center text-[10px] text-[#7F8C8D] sm:flex-row sm:text-left">
					<span>© 2026 KerjaLokal</span>
					<span>
						Profil dapat dilengkapi bertahap. Jangan masukkan informasi yang
						tidak benar.
					</span>
				</footer>
			</div>
		</main>
	);
}
