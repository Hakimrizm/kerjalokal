# Instalasi Portal Admin KerjaLokal

## Urutan migrasi

Jalankan melalui Supabase Dashboard → SQL Editor. Jalankan setiap file secara terpisah dan tunggu sampai berhasil sebelum lanjut.

1. `202611070004_add_admin_role.sql`
2. `202611070005_admin_superadmin_portal.sql`

Migrasi `0001`, `0002`, dan `0003` merupakan prasyarat dari project KerjaLokal sebelumnya dan tidak perlu dijalankan ulang jika sudah berhasil.

## Membuat Super Admin pertama

1. Buat akun Auth untuk calon Super Admin melalui Supabase Dashboard → Authentication → Users → Add user.
2. Isi email dan password yang akan digunakan untuk login.
3. Jalankan SQL berikut di SQL Editor dengan email yang sama:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
FROM auth.users
WHERE lower(email) = lower('EMAIL_SUPER_ADMIN')
ON CONFLICT (user_id)
DO UPDATE SET role = EXCLUDED.role;
```

4. Login melalui `/auth/admin-login`.

Jangan menambahkan role `super_admin` melalui metadata registrasi publik. Registrasi publik hanya untuk Job Seeker dan Employer.

## Mengaktifkan fitur buat akun Admin

Tambahkan service role key pada `.env.local` di root project:

```env
SUPABASE_SERVICE_ROLE_KEY=ISI_SERVICE_ROLE_KEY_SUPABASE
```

Ambil key dari Supabase Dashboard → Project Settings → API Keys → `service_role` / secret key. Jangan menaruh key ini pada variabel `NEXT_PUBLIC_`, jangan commit `.env.local`, dan jangan membagikannya ke browser.

Restart Next.js setelah mengubah environment:

```bash
Ctrl + C
npm run dev
```

Super Admin kemudian dapat membuka menu **Kelola Admin** untuk membuat akun Admin operasional. Pembuatan akun dilakukan di server, email langsung dikonfirmasi, dan role disetel sebagai `admin`. Admin tidak dapat membuat Super Admin lain.

## Hak akses

- `job_seeker`: pencari kerja.
- `employer`: pelaku usaha.
- `admin`: memeriksa data usaha dan mengirim rekomendasi; tidak dapat memutuskan verifikasi final, mengelola laporan fraud, atau melihat audit log.
- `super_admin`: keputusan final verifikasi usaha, moderasi lowongan, penanganan laporan fraud, pengelolaan akun Admin, dan audit aktivitas.

Akun lama dengan role `fraud_admin` akan dikonversi menjadi `super_admin` oleh migrasi 0005. Nilai enum lama tetap ada agar migrasi tidak merusak tipe data, tetapi role tersebut tidak lagi dipakai untuk akun baru.
