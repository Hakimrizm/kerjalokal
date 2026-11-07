import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

async function authorizeSuperAdmin() {
	const supabase = await createClient();
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user)
		return {
			error: NextResponse.json(
				{ error: "Sesi tidak valid. Silakan login kembali." },
				{ status: 401 },
			),
		};

	const { data: roleRow, error: roleError } = await supabase
		.from("user_roles")
		.select("role")
		.eq("user_id", user.id)
		.maybeSingle();
	if (roleError || roleRow?.role !== "super_admin") {
		return {
			error: NextResponse.json(
				{ error: "Hanya Super Admin yang dapat mengelola akun Admin." },
				{ status: 403 },
			),
		};
	}

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !serviceKey) {
		return {
			error: NextResponse.json(
				{
					error:
						"SUPABASE_SERVICE_ROLE_KEY belum dipasang di .env.local. Tambahkan service role key di server, jangan gunakan awalan NEXT_PUBLIC_.",
				},
				{ status: 500 },
			),
		};
	}

	const service = createSupabaseClient(url, serviceKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
	return { service, actor: user };
}

export async function GET() {
	const auth = await authorizeSuperAdmin();
	if ("error" in auth) return auth.error;

	const { data: roleRows, error } = await auth.service
		.from("user_roles")
		.select("user_id,role")
		.eq("role", "admin");

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	const users = await Promise.all(
		(roleRows ?? []).map(async (row) => {
			const [{ data: authUser }, { data: profile }] = await Promise.all([
				auth.service.auth.admin.getUserById(row.user_id),
				auth.service
					.from("profiles")
					.select("full_name")
					.eq("id", row.user_id)
					.maybeSingle(),
			]);

			return {
				user_id: row.user_id,
				email: authUser.user?.email ?? "Email tidak tersedia",
				full_name:
					profile?.full_name ??
					authUser.user?.user_metadata?.full_name ??
					"Admin",
				created_at: authUser.user?.created_at ?? null,
				last_sign_in_at: authUser.user?.last_sign_in_at ?? null,
			};
		}),
	);

	users.sort((a, b) => {
		return (
			new Date(b.created_at ?? 0).getTime() -
			new Date(a.created_at ?? 0).getTime()
		);
	});

	return NextResponse.json({ users });
}

export async function POST(request: Request) {
	const auth = await authorizeSuperAdmin();
	if ("error" in auth) return auth.error;

	const body = (await request.json().catch(() => null)) as {
		fullName?: string;
		email?: string;
		password?: string;
	} | null;

	const fullName = body?.fullName?.trim() ?? "";
	const email = body?.email?.trim().toLowerCase() ?? "";
	const password = body?.password ?? "";

	if (fullName.length < 3)
		return NextResponse.json(
			{ error: "Nama admin minimal 3 karakter." },
			{ status: 400 },
		);
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
		return NextResponse.json(
			{ error: "Format email tidak valid." },
			{ status: 400 },
		);
	if (password.length < 12)
		return NextResponse.json(
			{ error: "Password admin minimal 12 karakter." },
			{ status: 400 },
		);
	if (
		!/[A-Z]/.test(password) ||
		!/[a-z]/.test(password) ||
		!/[0-9]/.test(password)
	) {
		return NextResponse.json(
			{ error: "Password harus memiliki huruf besar, huruf kecil, dan angka." },
			{ status: 400 },
		);
	}

	const { data: created, error: createError } =
		await auth.service.auth.admin.createUser({
			email,
			password,
			email_confirm: true,
			user_metadata: {
				full_name: fullName,
				account_type: "admin",
				provisioned_by: "super_admin",
			},
		});

	if (createError || !created.user) {
		return NextResponse.json(
			{ error: createError?.message ?? "Akun Admin gagal dibuat." },
			{ status: 400 },
		);
	}

	const userId = created.user.id;
	const { error: roleError } = await auth.service.from("user_roles").upsert(
		{
			user_id: userId,
			role: "admin",
		},
		{ onConflict: "user_id" },
	);

	if (roleError) {
		await auth.service.auth.admin.deleteUser(userId);
		return NextResponse.json(
			{
				error: `Akun dibatalkan karena role gagal disimpan: ${roleError.message}`,
			},
			{ status: 500 },
		);
	}

	await auth.service.from("profiles").upsert(
		{
			id: userId,
			full_name: fullName,
		},
		{ onConflict: "id" },
	);

	await auth.service.from("audit_logs").insert({
		actor_id: auth.actor.id,
		action: "admin.account_created",
		entity_type: "user",
		entity_id: userId,
		details: { email, full_name: fullName, role: "admin" },
	});

	return NextResponse.json(
		{
			message:
				"Akun Admin berhasil dibuat. Pengguna dapat langsung login menggunakan email dan password yang ditentukan.",
			user: { user_id: userId, email, full_name: fullName, role: "admin" },
		},
		{ status: 201 },
	);
}
