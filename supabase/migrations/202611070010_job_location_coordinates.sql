-- Menyimpan titik koordinat lokasi kerja per lowongan agar jarak ke domisili pelamar
-- dapat dihitung dengan akurat. Kolom opsional agar lowongan lama tetap kompatibel.
alter table public.jobs
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7);

create index if not exists jobs_published_location_coords_idx
  on public.jobs (status, latitude, longitude)
  where status = 'published' and latitude is not null and longitude is not null;

notify pgrst, 'reload schema';

-- Migration sebelumnya membatasi kolom yang dapat ditulis pelaku usaha.
-- Berikan hak hanya untuk dua kolom koordinat tambahan.
grant insert (latitude, longitude) on public.jobs to authenticated;
grant update (latitude, longitude) on public.jobs to authenticated;
