import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployerProfileManager } from "@/components/employer-profile-manager";

export const instant = false;

export default async function EmployerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth/login?next=/dashboard/pelaku-usaha/profil");
  }

  const [
    { data: profile, error: profileError },
    { data: contact, error: contactError },
    { data: documents, error: documentsError },
  ] = await Promise.all([
    supabase
      .from("employer_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("employer_contacts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("employer_verification_documents")
      .select("id,document_type,document_number,file_path,verification_status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (profileError || contactError || documentsError) {
    throw new Error("Data profil usaha belum dapat dimuat. Silakan muat ulang halaman.");
  }

  if (!profile?.profile_completed) {
    redirect("/onboarding/employer");
  }

  const [{ data: logoData }, documentRows] = await Promise.all([
    profile.logo_path
      ? supabase.storage.from("business-logos").createSignedUrl(profile.logo_path, 3600)
      : Promise.resolve({ data: null }),
    Promise.all(
      (documents ?? []).map(async (document) => {
        const { data } = await supabase.storage
          .from("employer-verification")
          .createSignedUrl(document.file_path, 3600);
        return {
          ...document,
          signed_url: data?.signedUrl ?? null,
        };
      }),
    ),
  ]);

  return (
    <EmployerProfileManager
      userId={user.id}
      accountEmail={user.email ?? ""}
      initialProfile={profile}
      initialContact={contact ?? {
        pic_name: "",
        pic_position: "",
        phone: "",
        contact_email: "",
        operating_hours: "",
      }}
      initialLogoUrl={logoData?.signedUrl ?? null}
      initialDocuments={documentRows}
    />
  );
}
