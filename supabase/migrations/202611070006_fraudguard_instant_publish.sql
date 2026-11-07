-- KerjaLokal: publikasi instan lowongan dan pemeriksaan risiko otomatis FraudGuard.
-- Jalankan SETELAH migration 202611070005_admin_superadmin_portal.sql.
-- Lowongan baru langsung tayang. Sistem memberi indikator risiko; Super Admin tetap
-- melakukan pemeriksaan manual sebelum memutuskan pemblokiran.

-- 1. Status banned adalah soft-ban: data dan lamaran tetap tersimpan untuk audit.
ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'closed', 'banned'));

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS fraud_risk_score smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fraud_risk_level text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS fraud_risk_reasons text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS fraud_review_status text NOT NULL DEFAULT 'clear',
  ADD COLUMN IF NOT EXISTS fraud_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ban_reason text;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_fraud_risk_score_check,
  DROP CONSTRAINT IF EXISTS jobs_fraud_risk_level_check,
  DROP CONSTRAINT IF EXISTS jobs_fraud_review_status_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_fraud_risk_score_check CHECK (fraud_risk_score BETWEEN 0 AND 100),
  ADD CONSTRAINT jobs_fraud_risk_level_check CHECK (fraud_risk_level IN ('low', 'medium', 'high')),
  ADD CONSTRAINT jobs_fraud_review_status_check CHECK (fraud_review_status IN ('clear', 'pending_review', 'cleared', 'banned'));

CREATE INDEX IF NOT EXISTS jobs_fraud_review_queue_idx
  ON public.jobs(fraud_review_status, fraud_risk_score DESC, created_at DESC);

-- 2. Pemeriksaan otomatis berbasis indikator teks yang transparan.
-- Ini adalah rule-based screening untuk MVP, bukan keputusan AI final.
CREATE OR REPLACE FUNCTION public.evaluate_job_fraud_risk()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  content_text text;
  score integer := 0;
  reasons text[] := ARRAY[]::text[];
BEGIN
  content_text := lower(
    regexp_replace(
      concat_ws(' ', NEW.title, NEW.description, NEW.responsibilities, NEW.requirements),
      E'[\\n\\r\\t]+',
      ' ',
      'g'
    )
  );

  -- Permintaan biaya, deposit, atau uang jaminan dari pelamar.
  IF content_text ~ '(biaya[[:space:]]+(pendaftaran|administrasi|rekrutmen|seleksi|pelatihan)|uang[[:space:]]+(jaminan|administrasi)|deposit|top[[:space:]-]?up)'
     AND content_text !~ '(tanpa|tidak[[:space:]]+ada|gratis|bebas).{0,40}(biaya[[:space:]]+(pendaftaran|administrasi|rekrutmen|seleksi)|deposit)' THEN
    score := score + 45;
    reasons := array_append(reasons, 'Terdapat frasa yang mengarah pada permintaan biaya pendaftaran, administrasi, deposit, atau top up.');
  END IF;

  -- Instruksi transfer atau pengiriman uang sebagai syarat pekerjaan.
  IF content_text ~ '(transfer|kirim[[:space:]]+uang|setor[[:space:]]+uang).{0,60}(sebelum|agar|untuk|biaya|deposit|diterima)'
     OR content_text ~ '(sebelum|agar|untuk|biaya|deposit).{0,60}(transfer|kirim[[:space:]]+uang|setor[[:space:]]+uang)' THEN
    score := score + 40;
    reasons := array_append(reasons, 'Terdapat instruksi transfer atau pengiriman uang yang dikaitkan dengan proses rekrutmen.');
  END IF;

  -- Janji penerimaan tanpa proses seleksi yang wajar.
  IF content_text ~ '(pasti[[:space:]]+diterima|jaminan[[:space:]]+diterima|100[[:space:]]*%[[:space:]]+diterima|tanpa[[:space:]]+(wawancara|interview))' THEN
    score := score + 20;
    reasons := array_append(reasons, 'Terdapat janji diterima atau klaim proses rekrutmen tanpa wawancara.');
  END IF;

  -- Skema investasi, money game, atau komisi untuk merekrut anggota.
  IF content_text ~ '(investasi|money[[:space:]]*game|ponzi|(^|[^a-z])mlm([^a-z]|$)|multi[[:space:]]+level[[:space:]]+marketing|komisi[[:space:]]+(merekrut|rekrut)|rekrut[[:space:]]+anggota)' THEN
    score := score + 35;
    reasons := array_append(reasons, 'Terdapat istilah investasi, money game, MLM, atau komisi perekrutan anggota.');
  END IF;

  -- Janji pendapatan tinggi dari aktivitas yang tidak menggambarkan pekerjaan jelas.
  IF content_text ~ '(kerja[[:space:]]+mudah|cukup[[:space:]]+(like|subscribe|klik)|tugas[[:space:]]+(like|subscribe)|klik[[:space:]]+iklan).{0,80}(jutaan|juta|penghasilan|gaji|komisi)' THEN
    score := score + 25;
    reasons := array_append(reasons, 'Terdapat pola tawaran penghasilan dari aktivitas sederhana yang perlu diverifikasi.');
  END IF;

  -- Indikator tambahan, bukan dasar tunggal untuk menyimpulkan penipuan.
  IF COALESCE(NEW.salary_max, 0) >= 50000000
     AND lower(COALESCE(NEW.experience_level, '')) ~ '(tidak harus|fresh graduate|tanpa pengalaman)' THEN
    score := score + 15;
    reasons := array_append(reasons, 'Rentang gaji sangat tinggi untuk persyaratan pengalaman tingkat awal; kewajaran perlu diperiksa.');
  END IF;

  score := LEAST(score, 100);

  NEW.fraud_risk_score := score;
  NEW.fraud_risk_level := CASE
    WHEN score >= 40 THEN 'high'
    WHEN score >= 20 THEN 'medium'
    ELSE 'low'
  END;
  NEW.fraud_review_status := CASE
    WHEN NEW.status = 'banned' THEN 'banned'
    WHEN score >= 20 THEN 'pending_review'
    ELSE 'clear'
  END;
  NEW.fraud_risk_reasons := reasons;
  NEW.fraud_checked_at := now();

  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_fraud_risk_assessment ON public.jobs;
CREATE TRIGGER jobs_fraud_risk_assessment
BEFORE INSERT OR UPDATE OF title, description, responsibilities, requirements, salary_min, salary_max, experience_level
ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.evaluate_job_fraud_risk();

-- Hitung indikator untuk lowongan yang sudah ada.
UPDATE public.jobs SET title = title;

-- Lowongan lama yang sebelumnya tertahan moderasi diterbitkan otomatis
-- jika usaha pemiliknya sudah terverifikasi.
UPDATE public.jobs AS job
SET status = 'published',
    published_at = COALESCE(job.published_at, now()),
    updated_at = now()
FROM public.employer_profiles AS employer
WHERE employer.user_id = job.employer_id
  AND employer.verification_status = 'verified'
  AND job.status = 'pending_review';

-- 3. RLS: publik hanya melihat lowongan published dari usaha terverifikasi.
DROP POLICY IF EXISTS "jobs_read_published_or_owner" ON public.jobs;
CREATE POLICY "jobs_read_published_or_owner"
ON public.jobs FOR SELECT TO anon, authenticated
USING (
  (
    status = 'published'
    AND (application_deadline IS NULL OR application_deadline >= current_date)
    AND EXISTS (
      SELECT 1
      FROM public.employer_profiles AS profile
      WHERE profile.user_id = jobs.employer_id
        AND profile.verification_status = 'verified'
    )
  )
  OR employer_id = (SELECT auth.uid())
  OR public.has_app_role('admin'::public.app_role)
  OR public.has_app_role('super_admin'::public.app_role)
);

DROP POLICY IF EXISTS "jobs_employer_insert" ON public.jobs;
CREATE POLICY "jobs_employer_insert"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  employer_id = (SELECT auth.uid())
  AND public.has_app_role('employer'::public.app_role)
  AND status IN ('draft', 'published')
  AND EXISTS (
    SELECT 1
    FROM public.employer_profiles AS profile
    WHERE profile.user_id = (SELECT auth.uid())
      AND profile.profile_completed = true
      AND profile.verification_status = 'verified'
  )
);

DROP POLICY IF EXISTS "jobs_employer_update" ON public.jobs;
CREATE POLICY "jobs_employer_update"
ON public.jobs FOR UPDATE TO authenticated
USING (
  employer_id = (SELECT auth.uid())
  AND public.has_app_role('employer'::public.app_role)
  AND status <> 'banned'
)
WITH CHECK (
  employer_id = (SELECT auth.uid())
  AND public.has_app_role('employer'::public.app_role)
  AND status <> 'banned'
);

-- Kolom status dan metadata FraudGuard tidak dapat diubah langsung dari browser.
-- Perubahan status memakai RPC yang memvalidasi pemilik atau role Super Admin.
REVOKE INSERT, UPDATE, DELETE ON public.jobs FROM authenticated;

GRANT INSERT (
  employer_id, title, category, employment_type, description, responsibilities,
  requirements, experience_level, education_level, salary_min, salary_max,
  salary_negotiable, vacancies, application_deadline, province, city, district,
  village, address, status, updated_at
) ON public.jobs TO authenticated;

GRANT UPDATE (
  title, category, employment_type, description, responsibilities, requirements,
  experience_level, education_level, salary_min, salary_max, salary_negotiable,
  vacancies, application_deadline, province, city, district, village, address,
  updated_at
) ON public.jobs TO authenticated;

-- 4. Pelaku usaha dapat menutup atau menayangkan kembali lowongan miliknya.
CREATE OR REPLACE FUNCTION public.employer_set_job_status(
  target_job_id uuid,
  next_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT public.has_app_role('employer'::public.app_role) THEN
    RAISE EXCEPTION 'Akses ditolak: hanya pelaku usaha yang dapat mengubah status lowongannya.';
  END IF;

  IF next_status NOT IN ('published', 'closed') THEN
    RAISE EXCEPTION 'Status lowongan tidak valid.';
  END IF;

  IF next_status = 'published' AND NOT EXISTS (
    SELECT 1
    FROM public.employer_profiles AS profile
    WHERE profile.user_id = actor
      AND profile.profile_completed = true
      AND profile.verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Usaha harus berstatus terverifikasi untuk menayangkan lowongan.';
  END IF;

  UPDATE public.jobs
  SET status = next_status,
      published_at = CASE WHEN next_status = 'published' THEN COALESCE(published_at, now()) ELSE published_at END,
      updated_at = now()
  WHERE id = target_job_id
    AND employer_id = actor
    AND status <> 'banned';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lowongan tidak ditemukan, bukan milik akun ini, atau telah diblokir.';
  END IF;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (
    actor, 'job.status_changed', 'job', target_job_id::text,
    jsonb_build_object('status', next_status)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.employer_set_job_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_set_job_status(uuid, text) TO authenticated;

-- 5. Super Admin dapat menyatakan hasil pemeriksaan aman tanpa mengubah status tayang.
CREATE OR REPLACE FUNCTION public.admin_clear_job_fraud_review(
  target_job_id uuid,
  note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  owner_id uuid;
  job_title text;
BEGIN
  IF NOT public.has_app_role('super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Super Admin yang dapat menyelesaikan pemeriksaan FraudGuard.';
  END IF;

  UPDATE public.jobs
  SET fraud_review_status = 'cleared',
      updated_at = now()
  WHERE id = target_job_id
    AND status <> 'banned'
    AND fraud_review_status = 'pending_review'
  RETURNING employer_id, title INTO owner_id, job_title;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lowongan tidak ditemukan, sudah diblokir, atau tidak sedang menunggu pemeriksaan.';
  END IF;

  INSERT INTO public.user_notifications(user_id, title, message, notification_type)
  VALUES (
    owner_id,
    'Pemeriksaan lowongan selesai',
    'Lowongan "' || job_title || '" telah diperiksa oleh tim KerjaLokal dan dinyatakan aman untuk tetap tayang.',
    'job_fraud_cleared'
  );

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (
    actor, 'job.fraud_review_cleared', 'job', target_job_id::text,
    jsonb_build_object('note', NULLIF(trim(note), ''), 'title', job_title)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_clear_job_fraud_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_clear_job_fraud_review(uuid, text) TO authenticated;

-- 6. Pemblokiran fraud bersifat permanen pada status, tidak menghapus data.
-- Lowongan langsung tidak dapat dilihat publik dan tidak dapat menerima lamaran baru.
-- Pemilik menerima notifikasi berisi alasan, sedangkan bukti dan lamaran tetap tersimpan.
CREATE OR REPLACE FUNCTION public.admin_ban_job(
  target_job_id uuid,
  note text,
  target_report_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  owner_id uuid;
  job_title text;
  current_status text;
BEGIN
  IF NOT public.has_app_role('super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Super Admin yang dapat memblokir lowongan.';
  END IF;

  IF note IS NULL OR length(trim(note)) < 5 THEN
    RAISE EXCEPTION 'Alasan pemblokiran wajib diisi minimal 5 karakter.';
  END IF;

  SELECT employer_id, title, status
  INTO owner_id, job_title, current_status
  FROM public.jobs
  WHERE id = target_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lowongan tidak ditemukan.';
  END IF;

  IF current_status <> 'banned' THEN
    UPDATE public.jobs
    SET status = 'banned',
        fraud_review_status = 'banned',
        ban_reason = trim(note),
        banned_at = now(),
        banned_by = actor,
        updated_at = now()
    WHERE id = target_job_id;

    INSERT INTO public.user_notifications(user_id, title, message, notification_type)
    VALUES (
      owner_id,
      'Lowongan diblokir oleh KerjaLokal',
      'Lowongan "' || job_title || '" telah diblokir setelah pemeriksaan keamanan. Alasan: ' || trim(note) ||
      ' Lowongan tidak lagi tampil kepada pencari kerja dan tidak dapat menerima lamaran baru. Lamaran yang sudah masuk tetap tersimpan.',
      'job_banned'
    );

    INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
    VALUES (
      actor, 'job.fraud_banned', 'job', target_job_id::text,
      jsonb_build_object('title', job_title, 'reason', trim(note), 'previous_status', current_status)
    );
  END IF;

  IF target_report_id IS NOT NULL THEN
    UPDATE public.fraud_reports
    SET status = 'resolved',
        admin_notes = trim(note),
        reviewed_by = actor,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = target_report_id
      AND target_type = 'job'
      AND target_id = target_job_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Laporan tidak cocok dengan lowongan yang akan diblokir.';
    END IF;
  END IF;

  UPDATE public.fraud_reports
  SET status = 'resolved',
      admin_notes = COALESCE(NULLIF(trim(admin_notes), ''), trim(note)),
      reviewed_by = actor,
      reviewed_at = now(),
      updated_at = now()
  WHERE target_type = 'job'
    AND target_id = target_job_id
    AND status IN ('open', 'investigating');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ban_job(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ban_job(uuid, text, uuid) TO authenticated;

-- Laporan yang dinyatakan selesai harus menggunakan aksi blokir lowongan.
-- Status investigating/dismissed tetap tersedia untuk tindak lanjut atau laporan keliru.
CREATE OR REPLACE FUNCTION public.admin_update_fraud_report(
  target_report_id uuid,
  next_status text,
  note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF NOT public.has_app_role('super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Akses ditolak: laporan penipuan hanya dapat ditangani Super Admin.';
  END IF;

  IF next_status NOT IN ('investigating', 'dismissed') THEN
    RAISE EXCEPTION 'Untuk laporan terbukti fraud, gunakan tindakan Blokir Lowongan. Status laporan tidak valid.';
  END IF;

  UPDATE public.fraud_reports
  SET status = next_status,
      admin_notes = NULLIF(trim(note), ''),
      reviewed_by = actor,
      reviewed_at = now(),
      updated_at = now()
  WHERE id = target_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Laporan tidak ditemukan.';
  END IF;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (
    actor, 'fraud_report.updated', 'fraud_report', target_report_id::text,
    jsonb_build_object('status', next_status, 'note', note)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_fraud_report(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_fraud_report(uuid, text, text) TO authenticated;

-- Matikan RPC moderasi lama agar alur lama tidak dapat dipanggil lagi.
REVOKE ALL ON FUNCTION public.admin_review_job(uuid, text, text) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
