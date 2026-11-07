-- KerjaLokal: registrasi pelaku usaha, pengelolaan lowongan, dan lamaran.
-- Jalankan SETELAH migration 202611070001_jobseeker_onboarding.sql.
-- Supabase Dashboard > SQL Editor > New query > paste seluruh isi file ini.

-- 1. Role dari metadata registrasi hanya boleh memilih role pengguna biasa.
-- Metadata browser TIDAK pernah dapat memberikan role admin.
create or replace function public.handle_new_kerjalokal_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role public.app_role;
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;

  requested_role :=
    case
      when lower(coalesce(new.raw_user_meta_data ->> 'account_type', '')) = 'employer'
        then 'employer'::public.app_role
      else 'job_seeker'::public.app_role
    end;

  insert into public.user_roles (user_id, role)
  values (new.id, requested_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- 2. Helper untuk pemeriksaan role dari RLS.
create or replace function public.has_app_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = required_role
  );
$$;

revoke all on function public.has_app_role(public.app_role) from public, anon;
grant execute on function public.has_app_role(public.app_role) to anon, authenticated;

-- 3. Profil publik usaha. Dokumen legal dan kontak PIC disimpan di tabel privat terpisah.
create table if not exists public.employer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null,
  business_type text not null,
  description text not null default '',
  established_year smallint,
  logo_path text,
  province text,
  city text,
  district text,
  village text,
  address text,
  postal_code text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  website text,
  instagram_url text,
  facebook_url text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  profile_completed boolean not null default false,
  onboarding_step smallint not null default 1
    check (onboarding_step between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.employer_profiles add column if not exists business_name text;
alter table public.employer_profiles add column if not exists business_type text;
alter table public.employer_profiles add column if not exists description text not null default '';
alter table public.employer_profiles add column if not exists established_year smallint;
alter table public.employer_profiles add column if not exists logo_path text;
alter table public.employer_profiles add column if not exists province text;
alter table public.employer_profiles add column if not exists city text;
alter table public.employer_profiles add column if not exists district text;
alter table public.employer_profiles add column if not exists village text;
alter table public.employer_profiles add column if not exists address text;
alter table public.employer_profiles add column if not exists postal_code text;
alter table public.employer_profiles add column if not exists latitude numeric(10,7);
alter table public.employer_profiles add column if not exists longitude numeric(10,7);
alter table public.employer_profiles add column if not exists website text;
alter table public.employer_profiles add column if not exists instagram_url text;
alter table public.employer_profiles add column if not exists facebook_url text;
alter table public.employer_profiles add column if not exists verification_status text not null default 'pending';
alter table public.employer_profiles add column if not exists profile_completed boolean not null default false;
alter table public.employer_profiles add column if not exists onboarding_step smallint not null default 1;
alter table public.employer_profiles add column if not exists created_at timestamptz not null default now();
alter table public.employer_profiles add column if not exists updated_at timestamptz not null default now();

-- 4. Kontak penanggung jawab usaha (hanya pemilik usaha dan admin yang dapat membaca).
create table if not exists public.employer_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pic_name text not null,
  pic_position text,
  phone text not null,
  contact_email text not null,
  operating_hours text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Dokumen legalitas disimpan terpisah dan privat.
create table if not exists public.employer_verification_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  document_number text,
  file_path text not null,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employer_document_type_unique unique (user_id, document_type)
);

-- 6. Lowongan milik satu akun pelaku usaha.
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  employment_type text not null,
  description text not null,
  responsibilities text,
  requirements text not null,
  experience_level text,
  education_level text,
  salary_min numeric(14,2),
  salary_max numeric(14,2),
  salary_negotiable boolean not null default false,
  vacancies integer not null default 1 check (vacancies > 0),
  application_deadline date,
  province text not null,
  city text not null,
  district text not null,
  village text,
  address text,
  status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'rejected', 'closed')),
  rejection_reason text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_salary_order check (
    salary_min is null or salary_max is null or salary_min <= salary_max
  )
);

create index if not exists jobs_employer_id_idx on public.jobs(employer_id);
create index if not exists jobs_status_deadline_idx on public.jobs(status, application_deadline);
create index if not exists jobs_location_idx on public.jobs(province, city, district);

-- 7. Lamaran terikat pada job_id agar pelamar tidak tercampur antar-lowongan.
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  cover_letter text,
  status text not null default 'submitted'
    check (status in ('submitted', 'reviewing', 'interview', 'accepted', 'rejected')),
  employer_notes text,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_application_per_job unique (job_id, applicant_id)
);

create index if not exists job_applications_job_id_idx on public.job_applications(job_id);
create index if not exists job_applications_applicant_id_idx on public.job_applications(applicant_id);
create index if not exists job_applications_status_idx on public.job_applications(status);

-- 8. Fungsi aman untuk membuka data pencari kerja hanya kepada usaha yang menerima lamarannya.
create or replace function public.employer_can_view_job_seeker(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_app_role('employer'::public.app_role)
    and exists (
      select 1
      from public.job_applications as application
      join public.jobs as job on job.id = application.job_id
      where application.applicant_id = target_user_id
        and job.employer_id = (select auth.uid())
    );
$$;

revoke all on function public.employer_can_view_job_seeker(uuid) from public, anon;
grant execute on function public.employer_can_view_job_seeker(uuid) to authenticated;

-- 9. RLS untuk profil usaha.
alter table public.employer_profiles enable row level security;
alter table public.employer_contacts enable row level security;
alter table public.employer_verification_documents enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;

drop policy if exists "employer_profiles_read_owner_or_verified" on public.employer_profiles;
create policy "employer_profiles_read_owner_or_verified"
on public.employer_profiles for select to anon, authenticated
using (
  user_id = (select auth.uid())
  or verification_status = 'verified'
  or public.has_app_role('super_admin'::public.app_role)
);

drop policy if exists "employer_profiles_insert_owner" on public.employer_profiles;
create policy "employer_profiles_insert_owner"
on public.employer_profiles for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.has_app_role('employer'::public.app_role)
);

drop policy if exists "employer_profiles_update_owner" on public.employer_profiles;
create policy "employer_profiles_update_owner"
on public.employer_profiles for update to authenticated
using (
  user_id = (select auth.uid())
  and public.has_app_role('employer'::public.app_role)
)
with check (
  user_id = (select auth.uid())
  and public.has_app_role('employer'::public.app_role)
);

drop policy if exists "employer_profiles_admin_update" on public.employer_profiles;
create policy "employer_profiles_admin_update"
on public.employer_profiles for update to authenticated
using (public.has_app_role('super_admin'::public.app_role))
with check (public.has_app_role('super_admin'::public.app_role));

-- 10. RLS kontak usaha.
drop policy if exists "employer_contacts_owner_all" on public.employer_contacts;
create policy "employer_contacts_owner_all"
on public.employer_contacts for all to authenticated
using (
  user_id = (select auth.uid())
  and public.has_app_role('employer'::public.app_role)
)
with check (
  user_id = (select auth.uid())
  and public.has_app_role('employer'::public.app_role)
);

drop policy if exists "employer_contacts_admin_read" on public.employer_contacts;
create policy "employer_contacts_admin_read"
on public.employer_contacts for select to authenticated
using (public.has_app_role('super_admin'::public.app_role));

-- 11. RLS dokumen verifikasi usaha.
drop policy if exists "employer_documents_owner_select" on public.employer_verification_documents;
create policy "employer_documents_owner_select"
on public.employer_verification_documents for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "employer_documents_owner_insert" on public.employer_verification_documents;
create policy "employer_documents_owner_insert"
on public.employer_verification_documents for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.has_app_role('employer'::public.app_role)
  and verification_status = 'pending'
);

drop policy if exists "employer_documents_owner_delete" on public.employer_verification_documents;
create policy "employer_documents_owner_delete"
on public.employer_verification_documents for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "employer_documents_admin_read" on public.employer_verification_documents;
create policy "employer_documents_admin_read"
on public.employer_verification_documents for select to authenticated
using (public.has_app_role('super_admin'::public.app_role));

drop policy if exists "employer_documents_admin_update" on public.employer_verification_documents;
create policy "employer_documents_admin_update"
on public.employer_verification_documents for update to authenticated
using (public.has_app_role('super_admin'::public.app_role))
with check (public.has_app_role('super_admin'::public.app_role));

-- 12. RLS lowongan.
drop policy if exists "jobs_read_published_or_owner" on public.jobs;
create policy "jobs_read_published_or_owner"
on public.jobs for select to anon, authenticated
using (
  (
    status = 'published'
    and (application_deadline is null or application_deadline >= current_date)
  )
  or employer_id = (select auth.uid())
  or public.has_app_role('super_admin'::public.app_role)
);

drop policy if exists "jobs_employer_insert" on public.jobs;
create policy "jobs_employer_insert"
on public.jobs for insert to authenticated
with check (
  employer_id = (select auth.uid())
  and public.has_app_role('employer'::public.app_role)
  and exists (
    select 1 from public.employer_profiles as profile
    where profile.user_id = (select auth.uid())
      and profile.profile_completed = true
  )
  and status in ('draft', 'pending_review')
);

drop policy if exists "jobs_employer_update" on public.jobs;
create policy "jobs_employer_update"
on public.jobs for update to authenticated
using (
  employer_id = (select auth.uid())
  and public.has_app_role('employer'::public.app_role)
)
with check (
  employer_id = (select auth.uid())
  and public.has_app_role('employer'::public.app_role)
  and status not in ('published', 'rejected')
);

drop policy if exists "jobs_employer_delete_draft" on public.jobs;
create policy "jobs_employer_delete_draft"
on public.jobs for delete to authenticated
using (
  employer_id = (select auth.uid())
  and status in ('draft', 'rejected')
  and public.has_app_role('employer'::public.app_role)
);

drop policy if exists "jobs_admin_all" on public.jobs;
create policy "jobs_admin_all"
on public.jobs for all to authenticated
using (public.has_app_role('super_admin'::public.app_role))
with check (public.has_app_role('super_admin'::public.app_role));


-- Pencari kerja tetap dapat melihat informasi lowongan yang pernah dilamar,
-- walaupun lowongan tersebut kemudian ditutup.
create or replace function public.user_has_applied_to_job(target_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.job_applications
    where job_id = target_job_id
      and applicant_id = (select auth.uid())
  );
$$;

revoke all on function public.user_has_applied_to_job(uuid) from public, anon;
grant execute on function public.user_has_applied_to_job(uuid) to anon, authenticated;

drop policy if exists "jobs_read_by_applicant_after_application" on public.jobs;
create policy "jobs_read_by_applicant_after_application"
on public.jobs for select to authenticated
using (public.user_has_applied_to_job(id));

-- 13. RLS lamaran.
drop policy if exists "applications_read_applicant_or_employer" on public.job_applications;
create policy "applications_read_applicant_or_employer"
on public.job_applications for select to authenticated
using (
  applicant_id = (select auth.uid())
  or exists (
    select 1 from public.jobs as job
    where job.id = job_applications.job_id
      and job.employer_id = (select auth.uid())
  )
  or public.has_app_role('super_admin'::public.app_role)
);

drop policy if exists "applications_insert_job_seeker" on public.job_applications;
create policy "applications_insert_job_seeker"
on public.job_applications for insert to authenticated
with check (
  applicant_id = (select auth.uid())
  and public.has_app_role('job_seeker'::public.app_role)
  and status = 'submitted'
  and exists (
    select 1 from public.jobs as job
    where job.id = job_applications.job_id
      and job.status = 'published'
      and (job.application_deadline is null or job.application_deadline >= current_date)
  )
);

drop policy if exists "applications_employer_update_status" on public.job_applications;
create policy "applications_employer_update_status"
on public.job_applications for update to authenticated
using (
  exists (
    select 1 from public.jobs as job
    where job.id = job_applications.job_id
      and job.employer_id = (select auth.uid())
  )
  and public.has_app_role('employer'::public.app_role)
)
with check (
  exists (
    select 1 from public.jobs as job
    where job.id = job_applications.job_id
      and job.employer_id = (select auth.uid())
  )
  and public.has_app_role('employer'::public.app_role)
);

drop policy if exists "applications_admin_update" on public.job_applications;
create policy "applications_admin_update"
on public.job_applications for update to authenticated
using (public.has_app_role('super_admin'::public.app_role))
with check (public.has_app_role('super_admin'::public.app_role));

-- 14. Pelaku usaha hanya dapat membaca data pencari kerja yang benar-benar melamar ke lowongannya.
drop policy if exists "profiles_select_for_applicant_employer" on public.profiles;
create policy "profiles_select_for_applicant_employer"
on public.profiles for select to authenticated
using (public.employer_can_view_job_seeker(id));

drop policy if exists "job_seeker_profiles_select_for_applicant_employer" on public.job_seeker_profiles;
create policy "job_seeker_profiles_select_for_applicant_employer"
on public.job_seeker_profiles for select to authenticated
using (public.employer_can_view_job_seeker(user_id));

drop policy if exists "job_seeker_skills_select_for_applicant_employer" on public.job_seeker_skills;
create policy "job_seeker_skills_select_for_applicant_employer"
on public.job_seeker_skills for select to authenticated
using (public.employer_can_view_job_seeker(user_id));

drop policy if exists "job_seeker_education_select_for_applicant_employer" on public.job_seeker_education;
create policy "job_seeker_education_select_for_applicant_employer"
on public.job_seeker_education for select to authenticated
using (public.employer_can_view_job_seeker(user_id));

drop policy if exists "job_seeker_experiences_select_for_applicant_employer" on public.job_seeker_experiences;
create policy "job_seeker_experiences_select_for_applicant_employer"
on public.job_seeker_experiences for select to authenticated
using (public.employer_can_view_job_seeker(user_id));

drop policy if exists "job_seeker_certificates_select_for_applicant_employer" on public.job_seeker_certificates;
create policy "job_seeker_certificates_select_for_applicant_employer"
on public.job_seeker_certificates for select to authenticated
using (public.employer_can_view_job_seeker(user_id));

-- 15. Storage privat untuk logo dan dokumen legalitas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('business-logos', 'business-logos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('employer-verification', 'employer-verification', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = false;

drop policy if exists "business_logos_owner_all" on storage.objects;
create policy "business_logos_owner_all"
on storage.objects for all to authenticated
using (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'business-logos'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "employer_verification_owner_all" on storage.objects;
create policy "employer_verification_owner_all"
on storage.objects for all to authenticated
using (
  bucket_id = 'employer-verification'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'employer-verification'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "employer_verification_admin_read" on storage.objects;
create policy "employer_verification_admin_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'employer-verification'
  and public.has_app_role('super_admin'::public.app_role)
);


-- Super Admin dapat mengubah status verifikasi melalui RPC terkontrol.
-- Akun employer tidak mendapat privilege UPDATE pada kolom verification_status.
create or replace function public.admin_review_employer_profile(
  target_user_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_app_role('super_admin'::public.app_role) then
    raise exception 'Akses ditolak: hanya Super Admin yang dapat memverifikasi usaha.';
  end if;

  if next_status not in ('pending', 'verified', 'rejected') then
    raise exception 'Status verifikasi tidak valid.';
  end if;

  update public.employer_profiles
  set verification_status = next_status,
      updated_at = now()
  where user_id = target_user_id;

  if not found then
    raise exception 'Profil usaha tidak ditemukan.';
  end if;
end;
$$;

revoke all on function public.admin_review_employer_profile(uuid, text) from public, anon;
grant execute on function public.admin_review_employer_profile(uuid, text) to authenticated;

-- 16. Privileges.
grant usage on schema public to authenticated;
grant select on public.employer_profiles to anon, authenticated;
revoke insert, update on public.employer_profiles from authenticated;
grant insert (
  user_id, business_name, business_type, description, established_year, logo_path,
  province, city, district, village, address, postal_code, latitude, longitude,
  website, instagram_url, facebook_url, profile_completed, onboarding_step, updated_at
) on public.employer_profiles to authenticated;
grant update (
  user_id, business_name, business_type, description, established_year, logo_path,
  province, city, district, village, address, postal_code, latitude, longitude,
  website, instagram_url, facebook_url, profile_completed, onboarding_step, updated_at
) on public.employer_profiles to authenticated;

grant select, insert, update on public.employer_contacts to authenticated;
grant select, insert, delete on public.employer_verification_documents to authenticated;
grant update (user_id, document_type, document_number, file_path, updated_at) on public.employer_verification_documents to authenticated;
grant update (verification_status, review_notes) on public.employer_verification_documents to authenticated;

grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;

grant select on public.job_applications to authenticated;
grant insert (job_id, applicant_id, cover_letter) on public.job_applications to authenticated;
grant update (status, employer_notes, updated_at) on public.job_applications to authenticated;

grant select on public.profiles to authenticated;
grant select on public.job_seeker_profiles to authenticated;
grant select on public.job_seeker_skills to authenticated;
grant select on public.job_seeker_education to authenticated;
grant select on public.job_seeker_experiences to authenticated;
grant select on public.job_seeker_certificates to authenticated;

notify pgrst, 'reload schema';
