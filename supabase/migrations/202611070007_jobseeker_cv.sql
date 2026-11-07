-- KerjaLokal: CV ATS otomatis untuk pencari kerja.
-- Jalankan setelah migration 202611070006_fraudguard_instant_publish.sql.

-- 1. Simpan referensi dokumen CV pada setiap lamaran.
-- CV yang tersimpan merupakan snapshot pada saat pengguna mengirim lamaran.
alter table public.job_applications
  add column if not exists cv_path text,
  add column if not exists cv_file_name text,
  add column if not exists cv_generated_at timestamptz;

create index if not exists job_applications_cv_path_idx
  on public.job_applications(cv_path)
  where cv_path is not null;

-- 2. Bucket privat. File hanya dapat dibaca pemilik CV dan pelaku usaha
-- yang menerima lamaran dari pemilik CV tersebut.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-seeker-cvs',
  'job-seeker-cvs',
  false,
  5242880,
  array['application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf'];

-- 3. Pencari kerja hanya dapat mengunggah, membaca, memperbarui, dan
-- menghapus CV miliknya sendiri. Folder pertama wajib berupa UUID user.
drop policy if exists "job_seeker_cv_owner_select" on storage.objects;
create policy "job_seeker_cv_owner_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'job-seeker-cvs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "job_seeker_cv_owner_insert" on storage.objects;
create policy "job_seeker_cv_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'job-seeker-cvs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "job_seeker_cv_owner_update" on storage.objects;
create policy "job_seeker_cv_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'job-seeker-cvs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'job-seeker-cvs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "job_seeker_cv_owner_delete" on storage.objects;
create policy "job_seeker_cv_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'job-seeker-cvs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- 4. Pelaku usaha hanya dapat membaca CV yang benar-benar dilampirkan
-- pada lamaran ke salah satu lowongan miliknya.
drop policy if exists "employer_read_applicant_cv" on storage.objects;
create policy "employer_read_applicant_cv"
on storage.objects for select to authenticated
using (
  bucket_id = 'job-seeker-cvs'
  and public.has_app_role('employer'::public.app_role)
  and exists (
    select 1
    from public.job_applications as application
    join public.jobs as job on job.id = application.job_id
    where application.cv_path = storage.objects.name
      and job.employer_id = (select auth.uid())
  )
);

-- 5. Semua lamaran baru wajib menyertakan CV PDF milik akun yang sedang login.
-- Lamaran lama tetap dapat dibaca meskipun cv_path masih NULL.
drop policy if exists "applications_insert_job_seeker" on public.job_applications;
create policy "applications_insert_job_seeker"
on public.job_applications for insert to authenticated
with check (
  applicant_id = (select auth.uid())
  and public.has_app_role('job_seeker'::public.app_role)
  and status = 'submitted'
  and cv_path is not null
  and cv_file_name is not null
  and (storage.foldername(cv_path))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.jobs as job
    where job.id = job_applications.job_id
      and job.status = 'published'
      and (job.application_deadline is null or job.application_deadline >= current_date)
  )
);

notify pgrst, 'reload schema';
