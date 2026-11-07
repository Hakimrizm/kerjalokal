import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const instant = false;

export default async function DashboardRedirectPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect("/auth/login?next=/dashboard");

	const { data: roleRow } = await supabase
		.from("user_roles")
		.select("role")
		.eq("user_id", user.id)
		.maybeSingle();

	switch (roleRow?.role) {
		case "job_seeker": {
			const { data: profile } = await supabase
				.from("job_seeker_profiles")
				.select("profile_completed")
				.eq("user_id", user.id)
				.maybeSingle();
			redirect(
				profile?.profile_completed
					? "/dashboard/pencari-kerja"
					: "/onboarding/job-seeker",
			);
		}
		case "employer": {
			const { data: profile } = await supabase
				.from("employer_profiles")
				.select("profile_completed")
				.eq("user_id", user.id)
				.maybeSingle();
			redirect(
				profile?.profile_completed
					? "/dashboard/pelaku-usaha"
					: "/onboarding/employer",
			);
		}
		case "admin":
		case "super_admin":
		case "fraud_admin":
			redirect("/admin");
		default:
			redirect("/auth/error?message=role-not-found");
	}
}
