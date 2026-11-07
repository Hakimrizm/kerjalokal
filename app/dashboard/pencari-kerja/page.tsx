import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileUser,
  MapPin,
  Sparkles,
} from "lucide-react";

// Dashboard memakai session Supabase per request, sehingga harus dirender dinamis.
export const instant = false;

export default async function JobSeekerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: jobProfile }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, city, district, village")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("job_seeker_profiles")
      .select("profile_completed")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!jobProfile?.profile_completed) {
    redirect("/onboarding/job-seeker");
  }

  const name = profile?.full_name || user.user_metadata?.full_name || "Pencari Kerja";
  const location = [profile?.village, profile?.district, profile?.city]
    .filter(Boolean)
    .join(", ");

  return (
    <main className="min-h-screen bg-[#ECF0F1] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#2C3E50] text-white">
              <BriefcaseBusiness size={21} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[#2C3E50]">
              kerja<span className="text-[#7F8C8D]">lokal</span>
            </span>
          </Link>
          <span className="badge badge-outline border-[#BDC3C7] bg-white px-3 py-3 text-xs font-semibold text-[#34495E]">
            Pencari Kerja
          </span>
        </header>

        <section className="mt-10 overflow-hidden rounded-[2rem] bg-[#2C3E50] text-white shadow-xl shadow-[#2C3E50]/10">
          <div className="relative px-6 py-10 sm:px-10 sm:py-14">
            <div className="pointer-events-none absolute -right-20 -top-36 h-80 w-80 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-2 -top-20 h-56 w-56 rounded-full border border-white/10" />
            <div className="relative max-w-2xl">
              <span className="badge badge-outline border-white/25 bg-white/10 px-3 py-3 text-[10px] font-bold tracking-wider text-[#ECF0F1]">
                <CheckCircle2 size={13} /> PROFIL BERHASIL DILENGKAPI
              </span>
              <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Selamat datang, {name}!
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                Profil pencari kerjamu sudah tersimpan. Sekarang kamu bisa
                melanjutkan perjalanan untuk menemukan peluang kerja yang
                sesuai dengan kemampuan dan lokasi tempat tinggalmu.
              </p>
              {location && (
                <p className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#BDC3C7]">
                  <MapPin size={15} /> {location}
                </p>
              )}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/#lowongan"
                  className="btn min-h-12 rounded-full border-0 bg-[#ECF0F1] px-6 font-bold text-[#2C3E50] hover:bg-white"
                >
                  Jelajahi Lowongan <ArrowRight size={17} />
                </Link>
                <Link
                  href="/onboarding/job-seeker?edit=1"
                  className="btn btn-outline min-h-12 rounded-full border-white/30 px-6 font-bold text-white hover:border-white hover:bg-white/10 hover:text-white"
                >
                  Perbarui Profil
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: FileUser,
              title: "Buat CV otomatis",
              description: "Gunakan informasi profil untuk menyusun CV yang rapi.",
            },
            {
              icon: Sparkles,
              title: "Temukan kecocokan",
              description: "Lihat kesesuaian skill dan preferensi dengan lowongan.",
            },
            {
              icon: MapPin,
              title: "Cari kerja lokal",
              description: "Temukan peluang di desa dan kecamatan sekitar.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="card border border-[#BDC3C7]/60 bg-white shadow-sm">
                <div className="card-body p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]">
                    <Icon size={20} />
                  </span>
                  <h2 className="mt-2 text-base font-extrabold text-[#2C3E50]">{item.title}</h2>
                  <p className="text-sm leading-6 text-[#7F8C8D]">{item.description}</p>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
