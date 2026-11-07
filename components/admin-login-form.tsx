"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { notify, notifyInvalidForm, resetInvalidForm } from "@/lib/notify";
import { BriefcaseBusiness, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;

      const { data: roleRow, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (roleError) {
        await supabase.auth.signOut();
        throw new Error("Role akun tidak dapat diperiksa. Pastikan migrasi Admin KerjaLokal sudah dijalankan.");
      }
      if (!roleRow || !["admin", "super_admin", "fraud_admin"].includes(roleRow.role)) {
        await supabase.auth.signOut();
        throw new Error("Akun ini bukan akun Admin KerjaLokal. Gunakan halaman login sesuai jenis akun.");
      }

      notify("success", "Berhasil masuk ke Control Center.");
      router.replace("/admin");
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Email atau password tidak sesuai.";
      setError(message);
      notify("error", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#ECF0F1] px-4 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#DCE3E6] bg-white shadow-xl shadow-[#2C3E50]/10">
        <div className="bg-[#2C3E50] px-7 py-8 text-white sm:px-9">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15"><BriefcaseBusiness size={21}/></span>
            <span><span className="block text-lg font-extrabold">kerja<span className="text-[#BDC3C7]">lokal</span></span><span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-white/55">Control Center</span></span>
          </Link>
          <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><ShieldCheck size={24}/></div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Login Administrator</h1>
          <p className="mt-2 text-sm leading-6 text-white/65">Halaman khusus Admin dan Super Admin KerjaLokal.</p>
        </div>
        <form
          onSubmit={submit}
          onInvalidCapture={(event) => notifyInvalidForm(event.currentTarget, "Masukkan email dan password dengan format yang benar.")}
        onInputCapture={(event) => resetInvalidForm(event.currentTarget)}
          className="space-y-5 p-7 sm:p-9"
        >
          <div className="form-control">
            <label htmlFor="admin-email" className="label pb-2"><span className="label-text text-xs font-bold text-[#34495E]">Email administrator</span></label>
            <label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#D5DDE1] bg-white">
              <Mail size={17} className="text-[#8A969D]"/>
              <input id="admin-email" type="email" required autoComplete="username" value={email} aria-invalid={Boolean(error)} onChange={(e)=>{setError("");setEmail(e.target.value);}} placeholder="admin@kerjalokal.id" className="grow text-sm"/>
            </label>
          </div>
          <div className="form-control">
            <label htmlFor="admin-password" className="label pb-2"><span className="label-text text-xs font-bold text-[#34495E]">Password</span></label>
            <label className="input input-bordered flex h-12 items-center gap-3 rounded-xl border-[#D5DDE1] bg-white">
              <LockKeyhole size={17} className="text-[#8A969D]"/>
              <input id="admin-password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} aria-invalid={Boolean(error)} onChange={(e)=>{setError("");setPassword(e.target.value);}} placeholder="Masukkan password" className="grow text-sm"/>
              <button type="button" onClick={()=>setShowPassword((value)=>!value)} className="btn btn-ghost btn-xs btn-square text-[#8A969D]" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>} </button>
            </label>
          </div>
          {error && <div role="alert" className="alert alert-error rounded-xl py-3 text-xs">{error}</div>}
          <button type="submit" disabled={loading} className="btn min-h-12 w-full rounded-xl border-0 bg-[#2C3E50] text-sm font-extrabold text-white hover:bg-[#34495E]">
            {loading ? <><LoaderCircle size={17} className="animate-spin"/> Memeriksa akses...</> : <><ShieldCheck size={17}/> Masuk ke Control Center</>}
          </button>
          <p className="text-center text-[11px] leading-5 text-[#9AA5AB]">Akun administrator dibuat oleh Super Admin. Pendaftaran publik tidak menyediakan akses admin.</p>
          <div className="border-t border-[#EEF1F2] pt-4 text-center"><Link href="/auth/login" className="text-xs font-bold text-[#53616D] underline underline-offset-4 hover:text-[#2C3E50]">Kembali ke login pengguna</Link></div>
        </form>
      </section>
    </main>
  );
}
