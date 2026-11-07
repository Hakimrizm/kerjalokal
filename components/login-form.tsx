"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type LoginFormProps = React.ComponentPropsWithoutRef<"div"> & {
  nextPath?: string;
};

export function LoginForm({
  className,
  nextPath,
  ...props
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (loginError) throw loginError;

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (roleError) {
        throw new Error(
          "Role akun belum dapat diperiksa. Pastikan seluruh migrasi database KerjaLokal sudah dijalankan, lalu coba masuk kembali.",
        );
      }

      if (!roleData?.role) {
        throw new Error(
          "Role akun belum terdaftar. Jalankan migrasi role KerjaLokal di Supabase sebelum masuk.",
        );
      }

      if (roleData.role === "employer") {
        const { data: employerProfile, error: employerProfileError } = await supabase
          .from("employer_profiles")
          .select("profile_completed")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (employerProfileError) throw employerProfileError;

        router.replace(
          employerProfile?.profile_completed
            ? "/dashboard/pelaku-usaha"
            : "/onboarding/employer",
        );
      } else if (roleData.role === "job_seeker") {
        const { data: jobProfile, error: jobProfileError } = await supabase
          .from("job_seeker_profiles")
          .select("profile_completed")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (jobProfileError) throw jobProfileError;

        const safeNextPath =
          nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
            ? nextPath
            : undefined;
        router.replace(
          jobProfile?.profile_completed
            ? safeNextPath ?? "/dashboard/pencari-kerja"
            : "/onboarding/job-seeker",
        );
      } else if (
        roleData.role === "admin" ||
        roleData.role === "super_admin" ||
        roleData.role === "fraud_admin"
      ) {
        router.replace("/admin");
      } else {
        throw new Error("Role akun tidak dikenali. Hubungi administrator KerjaLokal.");
      }
      router.refresh();
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : "Email atau password tidak sesuai.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-[#BDC3C7]/70 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-extrabold text-[#2C3E50]">Masuk ke KerjaLokal</CardTitle>
          <CardDescription className="text-[#7F8C8D]">
            Masukkan email dan password untuk melanjutkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-[#34495E]">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 border-[#BDC3C7] focus-visible:ring-[#34495E]"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="password" className="text-[#34495E]">Password</Label>
                  <Link href="/auth/forgot-password" className="text-xs font-semibold text-[#7F8C8D] underline-offset-4 hover:text-[#2C3E50] hover:underline">
                    Lupa Password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 border-[#BDC3C7] focus-visible:ring-[#34495E]"
                />
              </div>
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="h-11 w-full bg-[#2C3E50] font-bold text-white hover:bg-[#34495E]" disabled={isLoading}>
                {isLoading ? "Memeriksa akun..." : "Masuk"}
              </Button>
            </div>
            <div className="mt-5 text-center text-sm text-[#53616D]">
              Belum punya akun?{" "}
              <Link href="/auth/sign-up" className="font-bold text-[#2C3E50] underline underline-offset-4">
                Pencari kerja
              </Link>
              {" · "}
              <Link href="/auth/sign-up/employer" className="font-bold text-[#2C3E50] underline underline-offset-4">
                Pelaku usaha
              </Link>
              {" · "}
              <Link href="/auth/admin-login" className="font-bold text-[#7F8C8D] underline underline-offset-4">
                Admin
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
