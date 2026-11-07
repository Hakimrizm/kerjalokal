-- KerjaLokal: kuota penerimaan kandidat sesuai jumlah posisi lowongan.
-- Jalankan setelah migration 202611070008_application_status_progression.sql.
-- Satu kandidat diterima TIDAK otomatis menolak kandidat lain kecuali seluruh kuota
-- (kolom jobs.vacancies) sudah terpenuhi.

begin;

-- 1. Tambahkan status final "finished" untuk lowongan yang seluruh posisinya terisi.
alter table public.jobs
  drop constraint if exists jobs_status_check;

alter table public.jobs
  add constraint jobs_status_check
  check (status in ('draft', 'pending_review', 'published', 'rejected', 'closed', 'banned', 'finished'));

-- Migration sebelumnya membatasi satu kandidat diterima per lowongan.
-- Hapus pembatas tersebut karena jumlah kandidat diterima mengikuti jumlah vacancies.
drop index if exists public.job_applications_one_accepted_per_job_idx;

-- 2. Cegah perubahan status mundur, dan validasi kapasitas saat menerima kandidat.
-- Penguncian baris jobs membuat dua proses penerimaan untuk lowongan yang sama
-- berjalan bergantian sehingga jumlah kandidat diterima tidak melewati kuota.
create or replace function public.enforce_job_application_status_progression()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_rank integer;
  new_rank integer;
  job_vacancies integer;
  job_status text;
  accepted_count integer;
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

  if new.status = 'accepted' then
    select job.vacancies, job.status
      into job_vacancies, job_status
    from public.jobs as job
    where job.id = new.job_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'Lowongan tidak ditemukan.';
    end if;

    if job_status = 'finished' then
      raise exception using
        errcode = 'P0001',
        message = 'Lowongan sudah selesai karena seluruh posisi telah terisi.';
    end if;

    select count(*)::integer
      into accepted_count
    from public.job_applications as application
    where application.job_id = new.job_id
      and application.id <> new.id
      and application.status = 'accepted';

    if accepted_count >= job_vacancies then
      raise exception using
        errcode = 'P0001',
        message = 'Kuota tenaga kerja pada lowongan ini sudah terpenuhi.';
    end if;
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

-- Perubahan status wajib melalui RPC agar baris lowongan dikunci lebih dahulu.
-- Ini mencegah dua penerimaan serentak melewati kuota atau deadlock saat
-- sistem menolak pelamar aktif lain setelah seluruh posisi terisi.
revoke update (status) on table public.job_applications from authenticated;

create or replace function public.employer_update_job_application_status(
  target_application_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_job_id uuid;
begin
  if actor is null or not public.has_app_role('employer'::public.app_role) then
    raise exception 'Akses ditolak: hanya pelaku usaha yang dapat memperbarui status lamaran.';
  end if;

  if next_status is null or next_status not in ('reviewing', 'interview', 'accepted', 'rejected') then
    raise exception 'Status seleksi tidak valid.';
  end if;

  -- Kunci lowongan terlebih dahulu agar semua perubahan status untuk lowongan
  -- yang sama diproses berurutan sebelum baris lamaran dikunci.
  select job.id
    into target_job_id
  from public.jobs as job
  join public.job_applications as application on application.job_id = job.id
  where application.id = target_application_id
    and job.employer_id = actor
  for update of job;

  if not found then
    raise exception 'Lamaran tidak ditemukan atau bukan milik lowongan akun ini.';
  end if;

  update public.job_applications
  set status = next_status,
      updated_at = now()
  where id = target_application_id
    and job_id = target_job_id;

  if not found then
    raise exception 'Lamaran tidak ditemukan atau sudah berubah.';
  end if;
end;
$$;

revoke all on function public.employer_update_job_application_status(uuid, text) from public, anon;
grant execute on function public.employer_update_job_application_status(uuid, text) to authenticated;

-- 3. Setelah jumlah kandidat accepted mencapai vacancies:
--    a. tandai lowongan sebagai finished,
--    b. tolak kandidat aktif yang tersisa,
--    c. biarkan kandidat yang sudah accepted/rejected tetap final.
create or replace function public.finish_job_when_vacancies_filled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_vacancies integer;
  accepted_count integer;
begin
  if new.status = 'accepted' and old.status is distinct from new.status then
    select job.vacancies
      into job_vacancies
    from public.jobs as job
    where job.id = new.job_id;

    select count(*)::integer
      into accepted_count
    from public.job_applications as application
    where application.job_id = new.job_id
      and application.status = 'accepted';

    if accepted_count >= job_vacancies then
      update public.jobs
      set status = 'finished',
          updated_at = now()
      where id = new.job_id
        and status not in ('banned', 'finished');

      update public.job_applications as other_application
      set status = 'rejected',
          updated_at = now()
      where other_application.job_id = new.job_id
        and other_application.id <> new.id
        and other_application.status not in ('accepted', 'rejected');
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.finish_job_when_vacancies_filled() from public, anon, authenticated;

-- Jika pelaku usaha mengurangi jumlah posisi setelah ada kandidat diterima,
-- periksa kembali kuota berdasarkan nilai vacancies yang baru.
create or replace function public.sync_job_completion_after_vacancy_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_count integer;
begin
  select count(*)::integer
    into accepted_count
  from public.job_applications as application
  where application.job_id = new.id
    and application.status = 'accepted';

  if accepted_count >= new.vacancies then
    update public.jobs
    set status = 'finished',
        updated_at = now()
    where id = new.id
      and status not in ('banned', 'finished');

    update public.job_applications as other_application
    set status = 'rejected',
        updated_at = now()
    where other_application.job_id = new.id
      and other_application.status not in ('accepted', 'rejected');
  end if;

  return new;
end;
$$;

revoke all on function public.sync_job_completion_after_vacancy_change() from public, anon, authenticated;

drop trigger if exists job_sync_completion_after_vacancy_change on public.jobs;
create trigger job_sync_completion_after_vacancy_change
after update of vacancies on public.jobs
for each row
when (old.vacancies is distinct from new.vacancies)
execute function public.sync_job_completion_after_vacancy_change();

drop trigger if exists job_application_reject_others_after_acceptance on public.job_applications;
drop function if exists public.reject_other_applicants_after_acceptance();
drop trigger if exists job_application_finish_when_vacancies_filled on public.job_applications;
create trigger job_application_finish_when_vacancies_filled
after update of status on public.job_applications
for each row
execute function public.finish_job_when_vacancies_filled();

-- 4. Lowongan yang kuotanya sudah penuh dari data sebelumnya juga ditandai selesai.
with accepted_totals as (
  select
    job.id,
    job.vacancies,
    count(application.id) filter (where application.status = 'accepted') as accepted_count
  from public.jobs as job
  left join public.job_applications as application on application.job_id = job.id
  group by job.id, job.vacancies
)
update public.jobs as job
set status = 'finished',
    updated_at = now()
from accepted_totals as totals
where totals.id = job.id
  and totals.accepted_count >= totals.vacancies
  and job.status not in ('banned', 'finished');

-- Tolak hanya pelamar yang masih aktif pada lowongan yang kuotanya memang sudah penuh.
update public.job_applications as application
set status = 'rejected',
    updated_at = now()
where application.status not in ('accepted', 'rejected')
  and exists (
    select 1
    from public.jobs as job
    where job.id = application.job_id
      and job.status = 'finished'
  );

-- 5. Lowongan finished tidak dapat diedit atau ditayangkan kembali oleh pelaku usaha.
drop policy if exists "jobs_employer_update" on public.jobs;
create policy "jobs_employer_update"
on public.jobs for update to authenticated
using (
  employer_id = (select auth.uid())
  and public.has_app_role('employer'::public.app_role)
  and status not in ('banned', 'finished')
)
with check (
  employer_id = (select auth.uid())
  and public.has_app_role('employer'::public.app_role)
  and status not in ('banned', 'finished')
);

-- Override RPC status agar lowongan finished tidak dapat dibuka kembali.
create or replace function public.employer_set_job_status(
  target_job_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_status text;
begin
  if actor is null or not public.has_app_role('employer'::public.app_role) then
    raise exception 'Akses ditolak: hanya pelaku usaha yang dapat mengubah status lowongannya.';
  end if;

  if next_status not in ('published', 'closed') then
    raise exception 'Status lowongan tidak valid.';
  end if;

  select job.status
    into current_status
  from public.jobs as job
  where job.id = target_job_id
    and job.employer_id = actor
  for update;

  if not found then
    raise exception 'Lowongan tidak ditemukan atau bukan milik akun ini.';
  end if;

  if current_status in ('banned', 'finished') then
    raise exception 'Lowongan yang diblokir atau sudah selesai tidak dapat dibuka kembali.';
  end if;

  if next_status = 'published' and not exists (
    select 1
    from public.employer_profiles as profile
    where profile.user_id = actor
      and profile.profile_completed = true
      and profile.verification_status = 'verified'
  ) then
    raise exception 'Usaha harus berstatus terverifikasi untuk menayangkan lowongan.';
  end if;

  update public.jobs
  set status = next_status,
      published_at = case
        when next_status = 'published' then coalesce(published_at, now())
        else published_at
      end,
      updated_at = now()
  where id = target_job_id
    and employer_id = actor;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (
    actor,
    'job.status_changed',
    'job',
    target_job_id::text,
    jsonb_build_object('status', next_status)
  );
end;
$$;

revoke all on function public.employer_set_job_status(uuid, text) from public, anon;
grant execute on function public.employer_set_job_status(uuid, text) to authenticated;

comment on column public.jobs.vacancies is
  'Jumlah posisi yang dibutuhkan. Lowongan otomatis finished ketika jumlah lamaran accepted mencapai nilai ini.';

commit;

notify pgrst, 'reload schema';
