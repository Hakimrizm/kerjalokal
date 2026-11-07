-- KerjaLokal: aturan progres status seleksi dan penerimaan satu kandidat per lowongan.
-- Jalankan setelah migration 202611070002_employer_jobs_applications.sql.
-- Supabase Dashboard > SQL Editor > New query > paste seluruh isi file ini.

begin;

-- Rapikan data lama jika ada lebih dari satu kandidat yang sudah berstatus accepted.
-- Kandidat dengan waktu lamaran paling awal dipertahankan sebagai kandidat diterima.
with ranked_accepted as (
  select
    id,
    row_number() over (
      partition by job_id
      order by applied_at asc, id asc
    ) as accepted_order
  from public.job_applications
  where status = 'accepted'
)
update public.job_applications as application
set status = 'rejected',
    updated_at = now()
from ranked_accepted as ranked
where application.id = ranked.id
  and ranked.accepted_order > 1;

-- Pengaman tingkat database: satu lowongan hanya boleh memiliki satu kandidat accepted.
create unique index if not exists job_applications_one_accepted_per_job_idx
  on public.job_applications (job_id)
  where status = 'accepted';

-- Mencegah status lamaran bergerak mundur atau diubah setelah menjadi status final.
create or replace function public.enforce_job_application_status_progression()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_rank integer;
  new_rank integer;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status in ('accepted', 'rejected') then
    raise exception using
      errcode = 'P0001',
      message = 'Status seleksi sudah final dan tidak dapat diubah kembali.';
  end if;

  old_rank := case old.status
    when 'submitted' then 0
    when 'reviewing' then 1
    when 'interview' then 2
    when 'accepted' then 3
    when 'rejected' then 3
    else -1
  end;

  new_rank := case new.status
    when 'submitted' then 0
    when 'reviewing' then 1
    when 'interview' then 2
    when 'accepted' then 3
    when 'rejected' then 3
    else -1
  end;

  if new_rank < old_rank then
    raise exception using
      errcode = 'P0001',
      message = 'Status seleksi tidak dapat dimundurkan ke tahap sebelumnya.';
  end if;

  if new.status = 'accepted' and exists (
    select 1
    from public.job_applications as other_application
    where other_application.job_id = new.job_id
      and other_application.id <> new.id
      and other_application.status = 'accepted'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Lowongan ini sudah memiliki kandidat yang diterima.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_job_application_status_progression() from public, anon, authenticated;

drop trigger if exists job_application_status_progression on public.job_applications;
create trigger job_application_status_progression
before update of status on public.job_applications
for each row
execute function public.enforce_job_application_status_progression();

-- Saat satu kandidat diterima, seluruh kandidat lain untuk lowongan yang sama
-- otomatis ditolak. Fungsi SECURITY DEFINER agar aturan ini tetap berjalan
-- meskipun RLS membatasi employer hanya mengubah lamaran yang dipilihnya.
create or replace function public.reject_other_applicants_after_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from new.status then
    update public.job_applications as other_application
    set status = 'rejected',
        updated_at = now()
    where other_application.job_id = new.job_id
      and other_application.id <> new.id
      and other_application.status <> 'rejected';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_other_applicants_after_acceptance() from public, anon, authenticated;

drop trigger if exists job_application_reject_others_after_acceptance on public.job_applications;
create trigger job_application_reject_others_after_acceptance
after update of status on public.job_applications
for each row
execute function public.reject_other_applicants_after_acceptance();

comment on index public.job_applications_one_accepted_per_job_idx is
  'Memastikan hanya satu kandidat yang dapat diterima untuk setiap lowongan KerjaLokal.';

commit;

notify pgrst, 'reload schema';
