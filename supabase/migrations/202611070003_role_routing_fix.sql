-- KerjaLokal: perbaikan permanen role registrasi dan redirect akun.
-- Jalankan SETELAH:
-- 202611070001_jobseeker_onboarding.sql
-- 202611070002_employer_jobs_applications.sql
--
-- Tujuan:
-- 1. Role akun baru dibaca dari metadata account_type saat sign-up.
-- 2. Metadata hanya boleh menghasilkan role job_seeker atau employer.
-- 3. Memperbaiki akun lama yang metadata registrasinya secara eksplisit menyatakan employer.
-- 4. Tidak menurunkan atau mengganti role admin yang sudah ada.

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
      when lower(trim(coalesce(new.raw_user_meta_data ->> 'account_type', ''))) = 'employer'
        then 'employer'::public.app_role
      else 'job_seeker'::public.app_role
    end;

  insert into public.user_roles (user_id, role)
  values (new.id, requested_role)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Pastikan trigger Auth benar-benar memakai fungsi yang sudah diperbarui.
drop trigger if exists on_lokakerja_user_created on auth.users;
drop trigger if exists on_auth_user_created_kerjalokal on auth.users;

create trigger on_auth_user_created_kerjalokal
after insert on auth.users
for each row
execute procedure public.handle_new_kerjalokal_user();

-- Perbaiki akun lama yang metadata pendaftarannya secara eksplisit employer.
-- Role super_admin/fraud_admin tidak akan pernah diturunkan oleh query ini.
insert into public.user_roles (user_id, role)
select users.id, 'employer'::public.app_role
from auth.users as users
where lower(trim(coalesce(users.raw_user_meta_data ->> 'account_type', ''))) = 'employer'
on conflict (user_id)
do update set role = excluded.role
where public.user_roles.role = 'job_seeker'::public.app_role;

-- Pastikan pengguna terautentikasi dapat membaca role miliknya sendiri.
-- Policy pembatasan per user tetap menjadi pengaman utamanya.
grant select on public.user_roles to authenticated;

notify pgrst, 'reload schema';
