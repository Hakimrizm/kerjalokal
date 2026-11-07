"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";

export function SignUpForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const normalizedName = fullName.trim().replace(/\s+/g, " ");
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 3) {
      setError("Masukkan nama lengkap minimal 3 karakter.");
      return;
    }

    if (password.length < 8) {
      setError("Password minimal terdiri dari 8 karakter.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Konfirmasi password belum sama dengan password.");
      return;
    }

    if (!agreed) {
      setError("Silakan konfirmasi bahwa data yang kamu berikan benar.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      // Pendaftaran langsung membuat session hanya jika opsi
      // Authentication > Sign In / Providers > Email > Confirm email
      // di Supabase sudah dinonaktifkan.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedName,
            account_type: "job_seeker",
          },
        },
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();

        if (message.includes("rate limit")) {
          throw new Error(
            "Supabase masih membatasi pengiriman email. Pastikan Confirm email sudah OFF di pengaturan Email Provider Supabase. Jika baru saja mengubah pengaturan, tunggu sebentar sebelum mencoba lagi.",
          );
        }

        throw signUpError;
      }

      if (data.session && data.user) {
        // Pastikan database benar-benar menyimpan role yang dipilih.
        // Jika migrasi role belum dijalankan, jangan biarkan akun salah diarahkan.
        const { data: roleRow, error: roleCheckError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (roleCheckError || roleRow?.role !== "job_seeker") {
          throw new Error(
            "Role Pencari Kerja belum tersimpan dengan benar. Jalankan migrasi database KerjaLokal 0002 dan 0003 di Supabase, lalu masuk kembali menggunakan akun ini.",
          );
        }

        router.replace("/onboarding/job-seeker");
        router.refresh();
        return;
      }

      // Jangan arahkan pengguna ke halaman konfirmasi email.
      // Session kosong berarti Confirm email masih aktif di Supabase.
      setError(
        "Akun belum mendapatkan sesi login. Buka Supabase Dashboard → Authentication → Sign In / Providers → Email, lalu nonaktifkan opsi Confirm email. Setelah itu, coba daftar kembali.",
      );
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Pendaftaran belum berhasil. Silakan coba kembali.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-7">
        <span className="badge badge-outline border-[#BDC3C7] bg-[#ECF0F1] px-3 py-3 text-[11px] font-bold tracking-wide text-[#34495E]">
          AKUN PENCARI KERJA
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#2C3E50] sm:text-[2.1rem]">
          Mulai perjalanan kariermu.
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#7F8C8D]">
          Buat akun KerjaLokal. Setelah registrasi, kamu akan melengkapi profil
          agar rekomendasi pekerjaan lebih relevan.
        </p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="form-control w-full">
          <label className="label pb-2" htmlFor="full-name">
            <span className="label-text text-sm font-bold text-[#34495E]">
              Nama lengkap <span className="text-red-500">*</span>
            </span>
          </label>
          <label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#BDC3C7] bg-white focus-within:border-[#34495E] focus-within:outline-none">
            <UserRound size={18} className="text-[#7F8C8D]" />
            <input
              id="full-name"
              type="text"
              autoComplete="name"
              placeholder="Contoh: Andi Pratama"
              className="grow text-sm text-[#2C3E50] placeholder:text-[#7F8C8D]/70"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              minLength={3}
              maxLength={100}
            />
          </label>
        </div>

        <div className="form-control w-full">
          <label className="label pb-2" htmlFor="signup-email">
            <span className="label-text text-sm font-bold text-[#34495E]">
              Email aktif <span className="text-red-500">*</span>
            </span>
          </label>
          <label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#BDC3C7] bg-white focus-within:border-[#34495E] focus-within:outline-none">
            <Mail size={18} className="text-[#7F8C8D]" />
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="nama@email.com"
              className="grow text-sm text-[#2C3E50] placeholder:text-[#7F8C8D]/70"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
        </div>

        <div className="form-control w-full">
          <label className="label pb-2" htmlFor="signup-password">
            <span className="label-text text-sm font-bold text-[#34495E]">
              Password <span className="text-red-500">*</span>
            </span>
            <span className="label-text-alt text-[11px] text-[#7F8C8D]">
              Minimal 8 karakter
            </span>
          </label>
          <label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#BDC3C7] bg-white focus-within:border-[#34495E] focus-within:outline-none">
            <LockKeyhole size={18} className="shrink-0 text-[#7F8C8D]" />
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Buat password yang kuat"
              className="grow text-sm text-[#2C3E50] placeholder:text-[#7F8C8D]/70"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square text-[#7F8C8D] hover:bg-[#ECF0F1]"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </label>
        </div>

        <div className="form-control w-full">
          <label className="label pb-2" htmlFor="repeat-password">
            <span className="label-text text-sm font-bold text-[#34495E]">
              Konfirmasi password <span className="text-red-500">*</span>
            </span>
          </label>
          <label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#BDC3C7] bg-white focus-within:border-[#34495E] focus-within:outline-none">
            <LockKeyhole size={18} className="shrink-0 text-[#7F8C8D]" />
            <input
              id="repeat-password"
              type={showRepeatPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ulangi password"
              className="grow text-sm text-[#2C3E50] placeholder:text-[#7F8C8D]/70"
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square text-[#7F8C8D] hover:bg-[#ECF0F1]"
              onClick={() => setShowRepeatPassword((visible) => !visible)}
              aria-label={showRepeatPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
            >
              {showRepeatPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#ECF0F1] p-3.5">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary mt-0.5 rounded-md border-[#7F8C8D] [--chkbg:#2C3E50] [--chkfg:#ECF0F1]"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
          />
          <span className="text-xs leading-5 text-[#53616D]">
            Saya menyatakan bahwa informasi yang saya berikan untuk pendaftaran
            KerjaLokal adalah benar.
          </span>
        </label>

        {error && (
          <div role="alert" className="alert alert-error rounded-xl py-3 text-sm">
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary h-12 min-h-12 w-full rounded-xl border-0 bg-[#2C3E50] text-sm font-bold text-white shadow-lg shadow-[#2C3E50]/15 hover:bg-[#34495E]"
        >
          {isLoading ? (
            <>
              <LoaderCircle size={18} className="animate-spin" />
              Membuat akun...
            </>
          ) : (
            <>
              Buat Akun Pencari Kerja
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <div className="divider my-5 text-[10px] text-[#7F8C8D]">SUDAH TERDAFTAR?</div>
      <p className="text-center text-sm text-[#53616D]">
        Sudah punya akun?{" "}
        <Link
          href="/auth/login"
          className="font-extrabold text-[#2C3E50] underline decoration-[#BDC3C7] underline-offset-4 hover:text-[#7F8C8D]"
        >
          Masuk di sini
        </Link>
      </p>
      <p className="mt-4 text-center text-xs text-[#7F8C8D]">
        Mewakili usaha dan ingin merekrut?{" "}
        <Link href="/auth/sign-up/employer" className="font-extrabold text-[#34495E] underline underline-offset-4">
          Daftar sebagai pelaku usaha
        </Link>
      </p>
    </div>
  );
}
