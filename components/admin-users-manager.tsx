"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { notify, notifyInvalidForm, resetInvalidForm } from "@/lib/notify";
import { Eye, EyeOff, LoaderCircle, Plus, RefreshCw, ShieldCheck, Users } from "lucide-react";

type AdminUser = { user_id: string; email: string; full_name: string; created_at: string; last_sign_in_at: string | null };

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/accounts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Daftar Admin gagal dimuat.");
      setUsers(data.users ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Akun Admin gagal dibuat.");
      setSuccess(data.message);
      notify("success", data.message || "Akun Admin berhasil ditambahkan.");
      setFullName(""); setEmail(""); setPassword("");
      await loadUsers();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Terjadi kesalahan.";
      setError(message);
      notify("error", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-2xl border border-[#E2E7E9] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]"><Plus size={19}/></span><div><h2 className="text-base font-extrabold">Buat akun Admin</h2><p className="mt-0.5 text-[11px] text-[#8A969D]">Hanya Super Admin yang dapat membuat akun.</p></div></div>
        <form
          onSubmit={submit}
          onInvalidCapture={(event) => notifyInvalidForm(event.currentTarget, "Periksa kembali input yang ditandai merah dan lengkapi sesuai ketentuan.")}
        onInputCapture={(event) => resetInvalidForm(event.currentTarget)}
          className="mt-5 space-y-4"
        >
          <div className="form-control"><label className="label pb-1"><span className="label-text text-xs font-bold text-[#34495E]">Nama lengkap</span></label><input value={fullName} onChange={(e)=>{setError("");setFullName(e.target.value);}} aria-invalid={Boolean(error && (fullName.trim().length < 3 || /nama/i.test(error)))} required minLength={3} className="input input-bordered h-11 rounded-xl border-[#D5DDE1] bg-white text-sm" placeholder="Nama admin"/></div>
          <div className="form-control"><label className="label pb-1"><span className="label-text text-xs font-bold text-[#34495E]">Email</span></label><input type="email" value={email} onChange={(e)=>{setError("");setEmail(e.target.value);}} aria-invalid={Boolean(error && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || /email|terdaftar|sudah ada/i.test(error)))} required className="input input-bordered h-11 rounded-xl border-[#D5DDE1] bg-white text-sm" placeholder="admin@kerjalokal.id"/></div>
          <div className="form-control"><label className="label pb-1"><span className="label-text text-xs font-bold text-[#34495E]">Password sementara</span></label><label className="input input-bordered flex h-11 items-center gap-2 rounded-xl border-[#D5DDE1] bg-white"><input type={showPassword?"text":"password"} value={password} onChange={(e)=>{setError("");setPassword(e.target.value);}} aria-invalid={Boolean(error && (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || /password/i.test(error)))} required minLength={12} pattern="(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{12,}" title="Gunakan minimal 12 karakter, huruf besar, huruf kecil, dan angka." className="grow text-sm" placeholder="Minimal 12 karakter"/><button type="button" onClick={()=>setShowPassword((v)=>!v)} className="btn btn-ghost btn-xs btn-square" aria-label={showPassword?"Sembunyikan password":"Tampilkan password"}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></label><p className="mt-1 text-[10px] text-[#9AA5AB]">Gunakan huruf besar, huruf kecil, dan angka.</p></div>
          <div className="rounded-xl bg-[#F3F6F7] p-3 text-[11px] leading-5 text-[#667681]"><ShieldCheck size={14} className="mr-1 inline"/> Role akun ditetapkan otomatis sebagai <b>Admin</b>. Akun ini tidak memiliki akses keputusan final, FraudGuard, atau audit.</div>
          {error && <div role="alert" className="alert alert-error rounded-xl py-3 text-xs">{error}</div>}
          {success && <div role="status" className="alert alert-success rounded-xl py-3 text-xs">{success}</div>}
          <button type="submit" disabled={saving} className="btn min-h-11 w-full rounded-xl border-0 bg-[#2C3E50] text-xs font-extrabold text-white hover:bg-[#34495E]">{saving?<LoaderCircle size={15} className="animate-spin"/>:<Plus size={15}/>} Buat Akun Admin</button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E2E7E9] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[#EEF1F2] px-5 py-4 sm:px-6"><div><h2 className="text-base font-extrabold">Daftar Admin</h2><p className="mt-1 text-xs text-[#8A969D]">{users.length} akun Admin terdaftar</p></div><button type="button" onClick={()=>void loadUsers()} disabled={loading} className="btn btn-ghost btn-sm rounded-lg text-xs"><RefreshCw size={14} className={loading?"animate-spin":""}/> Refresh</button></div>
        {loading ? <div className="p-10 text-center text-xs text-[#8A969D]"><LoaderCircle size={20} className="mx-auto mb-2 animate-spin"/>Memuat akun...</div> : users.length ? <div className="divide-y divide-[#EEF1F2]">{users.map((item)=>(
          <div key={item.user_id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ECF0F1] text-[#34495E]"><Users size={17}/></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold text-[#34495E]">{item.full_name}</p><p className="mt-0.5 truncate text-[11px] text-[#8A969D]">{item.email}</p><p className="mt-1 text-[10px] text-[#A0AAB0]">Dibuat {new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date(item.created_at))}</p></div><span className="badge badge-outline border-[#DCE3E6] text-[10px] text-[#53616D]">Admin</span></div>
        ))}</div> : <div className="px-6 py-12 text-center text-xs text-[#8A969D]">Belum ada akun Admin tambahan.</div>}
      </section>
    </div>
  );
}
