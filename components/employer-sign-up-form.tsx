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

export function EmployerSignUpForm() {
  const [picName, setPicName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const normalizedName = picName.trim().replace(/\s+/g, " ");
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 3) {
      setError("Masukkan nama pemilik atau penanggung jawab minimal 3 karakter.");
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
      setError("Silakan setujui pernyataan kebenaran data terlebih dahulu.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedName,
            account_type: "employer",
          },
        },
      });

      if (signupError) {
        const message = signupError.message.toLowerCase();
        if (message.includes("rate limit")) {
          throw new Error("Supabase masih membatasi pendaftaran. Pastikan Confirm email sudah OFF dan coba kembali beberapa saat lagi.");
        }
        throw signupError;
      }

      if (!data.session) {
        throw new Error("Akun belum mendapatkan sesi login. Pastikan Authentication → Sign In / Providers → Email → Confirm email sudah OFF.");
      }

      router.replace("/onboarding/employer");
      router.refresh();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Pendaftaran pelaku usaha belum berhasil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-7">
        <span className="badge badge-outline border-[#BDC3C7] bg-[#ECF0F1] px-3 py-3 text-[11px] font-bold tracking-wide text-[#34495E]">
          AKUN PELAKU USAHA
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#2C3E50] sm:text-[2.1rem]">
          Temukan talenta dari sekitar usahamu.
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#7F8C8D]">
          Buat akun usaha, lengkapi profil, lalu pasang lowongan untuk menjangkau calon karyawan lokal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control w-full">
          <label className="label pb-2" htmlFor="employer-pic-name">
            <span className="label-text text-sm font-bold text-[#34495E]">Nama pemilik / penanggung jawab <span className="text-red-500">*</span></span>
          </label>
          <label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#BDC3C7] bg-white focus-within:border-[#34495E]">
            <UserRound size={18} className="text-[#7F8C8D]" />
            <input id="employer-pic-name" value={picName} onChange={(event) => setPicName(event.target.value)} type="text" autoComplete="name" required minLength={3} maxLength={100} placeholder="Contoh: Budi Santoso" className="grow text-sm text-[#2C3E50] placeholder:text-[#7F8C8D]/70" />
          </label>
        </div>

        <div className="form-control w-full">
          <label className="label pb-2" htmlFor="employer-email">
            <span className="label-text text-sm font-bold text-[#34495E]">Email usaha / penanggung jawab <span className="text-red-500">*</span></span>
          </label>
          <label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#BDC3C7] bg-white focus-within:border-[#34495E]">
            <Mail size={18} className="text-[#7F8C8D]" />
            <input id="employer-email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="usaha@email.com" className="grow text-sm text-[#2C3E50] placeholder:text-[#7F8C8D]/70" />
          </label>
        </div>

        <div className="form-control w-full">
          <label className="label pb-2" htmlFor="employer-password">
            <span className="label-text text-sm font-bold text-[#34495E]">Password <span className="text-red-500">*</span></span>
            <span className="label-text-alt text-[11px] text-[#7F8C8D]">Minimal 8 karakter</span>
          </label>
          <label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#BDC3C7] bg-white focus-within:border-[#34495E]">
            <LockKeyhole size={18} className="shrink-0 text-[#7F8C8D]" />
            <input id="employer-password" value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} placeholder="Buat password yang kuat" className="grow text-sm text-[#2C3E50] placeholder:text-[#7F8C8D]/70" />
            <button type="button" className="btn btn-ghost btn-xs btn-square text-[#7F8C8D]" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </label>
        </div>

        <div className="form-control w-full">
          <label className="label pb-2" htmlFor="employer-repeat-password">
            <span className="label-text text-sm font-bold text-[#34495E]">Konfirmasi password <span className="text-red-500">*</span></span>
          </label>
          <label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#BDC3C7] bg-white focus-within:border-[#34495E]">
            <LockKeyhole size={18} className="shrink-0 text-[#7F8C8D]" />
            <input id="employer-repeat-password" value={repeatPassword} onChange={(event) => setRepeatPassword(event.target.value)} type={showRepeatPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} placeholder="Ulangi password" className="grow text-sm text-[#2C3E50] placeholder:text-[#7F8C8D]/70" />
            <button type="button" className="btn btn-ghost btn-xs btn-square text-[#7F8C8D]" onClick={() => setShowRepeatPassword((value) => !value)} aria-label={showRepeatPassword ? "Sembunyikan konfirmasi password" : "Tampilkan password"}>
              {showRepeatPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-[#ECF0F1] p-3.5">
          <input type="checkbox" className="checkbox checkbox-sm checkbox-primary mt-0.5 rounded-md border-[#7F8C8D] [--chkbg:#2C3E50] [--chkfg:#ECF0F1]" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <span className="text-xs leading-5 text-[#53616D]">Saya menyatakan bahwa informasi akun dan usaha yang diberikan adalah benar serta dapat dipertanggungjawabkan.</span>
        </label>

        {error && <div role="alert" className="alert alert-error rounded-xl py-3 text-sm"><span>{error}</span></div>}

        <button type="submit" disabled={loading} className="btn btn-primary h-12 min-h-12 w-full rounded-xl border-0 bg-[#2C3E50] text-sm font-bold text-white shadow-lg shadow-[#2C3E50]/15 hover:bg-[#34495E]">
          {loading ? <><LoaderCircle size={18} className="animate-spin" /> Membuat akun usaha...</> : <>Buat Akun Pelaku Usaha <ArrowRight size={17} /></>}
        </button>
      </form>

      <div className="divider my-5 text-[10px] text-[#7F8C8D]">SUDAH TERDAFTAR?</div>
      <p className="text-center text-sm text-[#53616D]">Sudah punya akun? <Link href="/auth/login" className="font-extrabold text-[#2C3E50] underline underline-offset-4">Masuk di sini</Link></p>
      <p className="mt-4 text-center text-xs text-[#7F8C8D]">Mencari pekerjaan? <Link href="/auth/sign-up" className="font-bold text-[#34495E] underline underline-offset-4">Daftar sebagai pencari kerja</Link></p>
    </div>
  );
}
