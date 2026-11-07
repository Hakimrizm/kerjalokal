-- KerjaLokal: schema registrasi dan onboarding pencari kerja.
-- Jalankan satu kali melalui Supabase Dashboard > SQL Editor.

-- 1. Role aplikasi. Role dibuat di database, bukan dipercaya dari metadata browser.
do $$
begin
  create type public.app_role as enum (
    'job_seeker',
    'employer',
    'fraud_admin',
    'super_admin'
  );
exception
  when duplicate_object then null;
end
$$;


-- 2. Profil dasar pengguna.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  birth_date date,
  gender text,
  province text,
  city text,
  district text,
  village text,
  address text,
  postal_code text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists district text;
alter table public.profiles add column if not exists village text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists postal_code text;
alter table public.profiles add column if not exists latitude numeric(10,7);
alter table public.profiles add column if not exists longitude numeric(10,7);
alter table public.profiles add column if not exists photo_path text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- 3. Role pengguna. Pengguna hanya dapat membaca role miliknya sendiri.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'job_seeker',
  created_at timestamptz not null default now()
);

-- 4. Data preferensi pencari kerja dan progres onboarding.
create table if not exists public.job_seeker_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  desired_position text,
  job_category text,
  employment_types text[] not null default '{}',
  expected_salary_min numeric(14,2),
  expected_salary_max numeric(14,2),
  availability text,
  summary text,
  portfolio_url text,
  linkedin_url text,
  languages text[] not null default '{}',
  onboarding_step smallint not null default 1 check (onboarding_step between 1 and 5),
  profile_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Skill pencari kerja.
create table if not exists public.job_seeker_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_name text not null,
  created_at timestamptz not null default now(),
  constraint job_seeker_skills_unique unique (user_id, skill_name)
);

-- 6. Riwayat pendidikan.
create table if not exists public.job_seeker_education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  education_level text not null,
  institution text not null,
  major text,
  start_year smallint,
  end_year smallint,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  constraint education_year_order check (
    start_year is null or end_year is null or is_current or start_year <= end_year
  )
);

-- 7. Riwayat pengalaman kerja. Dapat dikosongkan untuk fresh graduate.
create table if not exists public.job_seeker_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  position text not null,
  employment_type text,
  location text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  constraint experience_date_order check (
    start_date is null or end_date is null or is_current or start_date <= end_date
  )
);

-- 8. Sertifikat dan pelatihan. Seluruh data pada tahap ini opsional.
create table if not exists public.job_seeker_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  certificate_name text not null,
  issuer text not null,
  issue_date date,
  expiry_date date,
  credential_url text,
  description text,
  created_at timestamptz not null default now(),
  constraint certificate_date_order check (
    issue_date is null or expiry_date is null or issue_date <= expiry_date
  )
);

-- 9. Buat/perbarui profil dan role dasar saat akun Auth dibuat.
-- Metadata account_type dari browser tidak digunakan untuk memberi hak admin.
create or replace function public.handle_new_kerjalokal_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'job_seeker'::public.app_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_lokakerja_user_created on auth.users;
drop trigger if exists on_auth_user_created_kerjalokal on auth.users;
create trigger on_auth_user_created_kerjalokal
after insert on auth.users
for each row execute procedure public.handle_new_kerjalokal_user();

-- Backfill akun yang sudah ada sebelum migrasi dijalankan.
insert into public.profiles (id, full_name)
select
  users.id,
  nullif(trim(coalesce(users.raw_user_meta_data ->> 'full_name', '')), '')
from auth.users as users
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select users.id, 'job_seeker'::public.app_role
from auth.users as users
on conflict (user_id) do nothing;

update public.profiles as profile
set full_name = nullif(trim(coalesce(users.raw_user_meta_data ->> 'full_name', '')), '')
from auth.users as users
where profile.id = users.id
  and (profile.full_name is null or profile.full_name = '');

-- 10. Aktifkan RLS pada seluruh tabel profil.
revoke all on public.profiles from anon;
revoke all on public.user_roles from anon, authenticated;
revoke all on public.job_seeker_profiles from anon;
revoke all on public.job_seeker_skills from anon;
revoke all on public.job_seeker_education from anon;
revoke all on public.job_seeker_experiences from anon;
revoke all on public.job_seeker_certificates from anon;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.job_seeker_profiles enable row level security;
alter table public.job_seeker_skills enable row level security;
alter table public.job_seeker_education enable row level security;
alter table public.job_seeker_experiences enable row level security;
alter table public.job_seeker_certificates enable row level security;

-- Bersihkan policy dengan nama yang sama agar migrasi dapat dijalankan ulang.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy "profiles_insert_own"
on public.profiles for insert to authenticated
with check ((select auth.uid()) = id);
create policy "profiles_update_own"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Role tidak dapat diubah langsung oleh pengguna biasa.
drop policy if exists "user_roles_select_own" on public.user_roles;
drop policy if exists "role_select_own" on public.user_roles;
create policy "user_roles_select_own"
on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id);

-- Pengguna hanya dapat mengelola baris onboarding miliknya sendiri.
drop policy if exists "job_seeker_profiles_own_all" on public.job_seeker_profiles;
create policy "job_seeker_profiles_own_all"
on public.job_seeker_profiles for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "job_seeker_skills_own_all" on public.job_seeker_skills;
create policy "job_seeker_skills_own_all"
on public.job_seeker_skills for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "job_seeker_education_own_all" on public.job_seeker_education;
create policy "job_seeker_education_own_all"
on public.job_seeker_education for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "job_seeker_experiences_own_all" on public.job_seeker_experiences;
create policy "job_seeker_experiences_own_all"
on public.job_seeker_experiences for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "job_seeker_certificates_own_all" on public.job_seeker_certificates;
create policy "job_seeker_certificates_own_all"
on public.job_seeker_certificates for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Batasi akses langsung ke role. Pengelolaan role admin dilakukan melalui server tepercaya.
revoke all on public.user_roles from anon, authenticated;
grant select on public.user_roles to authenticated;

-- Izinkan pengguna terautentikasi mengelola data onboarding miliknya.
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.job_seeker_profiles to authenticated;
grant select, insert, update, delete on public.job_seeker_skills to authenticated;
grant select, insert, update, delete on public.job_seeker_education to authenticated;
grant select, insert, update, delete on public.job_seeker_experiences to authenticated;
grant select, insert, update, delete on public.job_seeker_certificates to authenticated;

-- 11. Bucket privat untuk foto profil. Path wajib diawali dengan UUID pemilik.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "profile_photos_select_own" on storage.objects;
drop policy if exists "profile_photos_insert_own" on storage.objects;
drop policy if exists "profile_photos_update_own" on storage.objects;
drop policy if exists "profile_photos_delete_own" on storage.objects;

create policy "profile_photos_select_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "profile_photos_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "profile_photos_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "profile_photos_delete_own"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- 12. Grants untuk sequence/UUID helper dan refresh schema cache.
grant usage on schema public to authenticated;
notify pgrst, 'reload schema';
