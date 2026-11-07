import { createClient } from "@/lib/supabase/server";
import { loadJobSeekerCvData } from "@/lib/cv/data";
import { buildJobSeekerCvPdf } from "@/lib/cv/pdf";

export const runtime = "nodejs";

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "Pencari-Kerja";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Silakan masuk terlebih dahulu untuk membuat CV." }, { status: 401 });
  }

  const [{ data: role }, { data: jobProfile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("job_seeker_profiles").select("profile_completed").eq("user_id", user.id).maybeSingle(),
  ]);

  if (role?.role !== "job_seeker") {
    return Response.json({ error: "Fitur CV hanya tersedia untuk akun pencari kerja." }, { status: 403 });
  }

  if (!jobProfile?.profile_completed) {
    return Response.json({ error: "Lengkapi profil pencari kerja terlebih dahulu sebelum membuat CV." }, { status: 422 });
  }

  const cvData = await loadJobSeekerCvData(
    supabase,
    user.id,
    user.email,
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
  );

  if (!cvData.fullName || cvData.fullName === "Pencari Kerja") {
    return Response.json({ error: "Nama lengkap belum tersedia. Perbarui identitas pada profil terlebih dahulu." }, { status: 422 });
  }

  const pdfBytes = Buffer.from(buildJobSeekerCvPdf(cvData));
  const fileName = `CV-${safeFileName(cvData.fullName)}.pdf`;

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(pdfBytes.length),
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
