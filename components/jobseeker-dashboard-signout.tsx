"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function JobSeekerDashboardSignOut() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoading(false);
      return;
    }

    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      aria-label="Keluar dari akun"
      title="Keluar"
      className="btn btn-ghost btn-square btn-sm h-10 w-10 rounded-full text-[#7F8C8D] hover:bg-[#F1F4F5] hover:text-[#2C3E50]"
    >
      {loading ? <LoaderCircle size={17} className="animate-spin" /> : <LogOut size={17} />}
    </button>
  );
}
