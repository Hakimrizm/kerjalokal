-- KerjaLokal: portal Admin dan Super Admin, verifikasi usaha, moderasi, FraudGuard, audit.
-- Prasyarat: migrations 0001, 0002, 0003, dan 0004 sudah berhasil dijalankan.

-- Role fraud_admin sudah tidak digunakan lagi. Semua akun lama dipindahkan ke Super Admin.
UPDATE public.user_roles
SET role = 'super_admin'::public.app_role
WHERE role = 'fraud_admin'::public.app_role;

-- Metadata review internal. Keputusan akhir tetap hanya dapat dibuat Super Admin.
ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS review_recommendation text NOT NULL DEFAULT 'not_reviewed'
    CHECK (review_recommendation IN ('not_reviewed', 'recommend_approve', 'recommend_reject', 'needs_more_info')),
  ADD COLUMN IF NOT EXISTS reviewer_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_notes text,
  ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz;

-- Notifikasi in-app untuk pelaku usaha saat ada keputusan verifikasi.
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL DEFAULT 'general',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx
  ON public.user_notifications(user_id, created_at DESC);

-- Pelaporan dugaan penipuan. Saat ini laporan dapat dibuat dari detail lowongan.
CREATE TABLE IF NOT EXISTS public.fraud_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('job', 'employer')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fraud_reports_status_created_idx
  ON public.fraud_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS fraud_reports_target_idx
  ON public.fraud_reports(target_type, target_id);

-- Audit trail untuk tindakan administratif yang penting.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON public.audit_logs(actor_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin operasional boleh memeriksa data usaha, tetapi tidak dapat menyetujui final.
DROP POLICY IF EXISTS "employer_profiles_admin_read" ON public.employer_profiles;
CREATE POLICY "employer_profiles_admin_read"
ON public.employer_profiles FOR SELECT TO authenticated
USING (
  public.has_app_role('admin'::public.app_role)
  OR public.has_app_role('super_admin'::public.app_role)
);

DROP POLICY IF EXISTS "employer_contacts_admin_read" ON public.employer_contacts;
CREATE POLICY "employer_contacts_admin_read"
ON public.employer_contacts FOR SELECT TO authenticated
USING (
  public.has_app_role('admin'::public.app_role)
  OR public.has_app_role('super_admin'::public.app_role)
);

DROP POLICY IF EXISTS "employer_documents_admin_read" ON public.employer_verification_documents;
CREATE POLICY "employer_documents_admin_read"
ON public.employer_verification_documents FOR SELECT TO authenticated
USING (
  public.has_app_role('admin'::public.app_role)
  OR public.has_app_role('super_admin'::public.app_role)
);

DROP POLICY IF EXISTS "employer_verification_admin_read" ON storage.objects;
CREATE POLICY "employer_verification_admin_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'employer-verification'
  AND (
    public.has_app_role('admin'::public.app_role)
    OR public.has_app_role('super_admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "business_logos_admin_read" ON storage.objects;
CREATE POLICY "business_logos_admin_read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (
    public.has_app_role('admin'::public.app_role)
    OR public.has_app_role('super_admin'::public.app_role)
  )
);

-- Admin dapat membaca data lowongan untuk pemeriksaan. Hanya Super Admin yang memoderasi.
DROP POLICY IF EXISTS "jobs_admin_read" ON public.jobs;
CREATE POLICY "jobs_admin_read"
ON public.jobs FOR SELECT TO authenticated
USING (
  public.has_app_role('admin'::public.app_role)
  OR public.has_app_role('super_admin'::public.app_role)
);

-- Hanya usaha terverifikasi yang boleh membuat lowongan baru.
DROP POLICY IF EXISTS "jobs_employer_insert" ON public.jobs;
CREATE POLICY "jobs_employer_insert"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  employer_id = (SELECT auth.uid())
  AND public.has_app_role('employer'::public.app_role)
  AND status IN ('draft', 'pending_review')
  AND EXISTS (
    SELECT 1
    FROM public.employer_profiles AS profile
    WHERE profile.user_id = (SELECT auth.uid())
      AND profile.profile_completed = true
      AND profile.verification_status = 'verified'
  )
);

-- Lowongan publik hanya terlihat jika pemilik usaha sudah terverifikasi.
DROP POLICY IF EXISTS "jobs_read_published_or_owner" ON public.jobs;
CREATE POLICY "jobs_read_published_or_owner"
ON public.jobs FOR SELECT TO anon, authenticated
USING (
  (
    status = 'published'
    AND (application_deadline IS NULL OR application_deadline >= current_date)
    AND EXISTS (
      SELECT 1 FROM public.employer_profiles AS profile
      WHERE profile.user_id = jobs.employer_id
        AND profile.verification_status = 'verified'
    )
  )
  OR employer_id = (SELECT auth.uid())
  OR public.has_app_role('admin'::public.app_role)
  OR public.has_app_role('super_admin'::public.app_role)
);

-- Pengguna dapat membaca dan menandai notifikasi miliknya sendiri.
DROP POLICY IF EXISTS "user_notifications_read_own" ON public.user_notifications;
CREATE POLICY "user_notifications_read_own"
ON public.user_notifications FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "user_notifications_update_own" ON public.user_notifications;
CREATE POLICY "user_notifications_update_own"
ON public.user_notifications FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Pelapor hanya dapat membuat laporan atas lowongan yang ada.
DROP POLICY IF EXISTS "fraud_reports_insert_authenticated" ON public.fraud_reports;
CREATE POLICY "fraud_reports_insert_authenticated"
ON public.fraud_reports FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = (SELECT auth.uid())
  AND target_type = 'job'
  AND status = 'open'
  AND reviewed_by IS NULL
  AND EXISTS (SELECT 1 FROM public.jobs WHERE id = target_id)
);

-- Isi laporan dan audit hanya dapat dibaca Super Admin.
DROP POLICY IF EXISTS "fraud_reports_super_admin_read" ON public.fraud_reports;
CREATE POLICY "fraud_reports_super_admin_read"
ON public.fraud_reports FOR SELECT TO authenticated
USING (public.has_app_role('super_admin'::public.app_role));

DROP POLICY IF EXISTS "audit_logs_super_admin_read" ON public.audit_logs;
CREATE POLICY "audit_logs_super_admin_read"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_app_role('super_admin'::public.app_role));

GRANT SELECT ON public.employer_profiles TO authenticated;
GRANT SELECT ON public.employer_contacts TO authenticated;
GRANT SELECT ON public.employer_verification_documents TO authenticated;
GRANT SELECT ON public.jobs TO authenticated;
REVOKE ALL ON public.user_notifications FROM anon, authenticated;
GRANT SELECT ON public.user_notifications TO authenticated;
GRANT UPDATE (read_at) ON public.user_notifications TO authenticated;

REVOKE ALL ON public.fraud_reports FROM anon, authenticated;
GRANT SELECT ON public.fraud_reports TO authenticated;
GRANT INSERT (reporter_id, target_type, target_id, reason, description) ON public.fraud_reports TO authenticated;

REVOKE ALL ON public.audit_logs FROM anon, authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "profiles_super_admin_read" ON public.profiles;
CREATE POLICY "profiles_super_admin_read"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_app_role('super_admin'::public.app_role));

-- Admin operasional mengirim hasil pemeriksaan awal. Tidak mengubah status verified/rejected.
CREATE OR REPLACE FUNCTION public.admin_submit_employer_review(
  target_user_id uuid,
  next_recommendation text,
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
  IF NOT (
    public.has_app_role('admin'::public.app_role)
    OR public.has_app_role('super_admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: hanya Admin atau Super Admin yang dapat memeriksa usaha.';
  END IF;

  IF next_recommendation NOT IN ('recommend_approve', 'recommend_reject', 'needs_more_info') THEN
    RAISE EXCEPTION 'Rekomendasi pemeriksaan tidak valid.';
  END IF;

  UPDATE public.employer_profiles
  SET review_recommendation = next_recommendation,
      reviewer_notes = NULLIF(trim(note), ''),
      reviewed_by = actor,
      reviewed_at = now(),
      updated_at = now()
  WHERE user_id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil usaha tidak ditemukan.';
  END IF;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (
    actor, 'employer.review_submitted', 'employer', target_user_id::text,
    jsonb_build_object('recommendation', next_recommendation, 'note', note)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_submit_employer_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_submit_employer_review(uuid, text, text) TO authenticated;

-- Keputusan akhir verifikasi usaha hanya boleh dilakukan Super Admin.
DROP FUNCTION IF EXISTS public.admin_review_employer_profile(uuid, text);
CREATE OR REPLACE FUNCTION public.admin_review_employer_profile(
  target_user_id uuid,
  next_status text,
  decision_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  business_label text;
BEGIN
  IF NOT public.has_app_role('super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Akses ditolak: keputusan verifikasi hanya dapat dilakukan Super Admin.';
  END IF;

  IF next_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Keputusan verifikasi tidak valid.';
  END IF;

  SELECT business_name INTO business_label
  FROM public.employer_profiles
  WHERE user_id = target_user_id;

  IF business_label IS NULL THEN
    RAISE EXCEPTION 'Profil usaha tidak ditemukan.';
  END IF;

  UPDATE public.employer_profiles
  SET verification_status = next_status,
      decision_notes = NULLIF(trim(decision_note), ''),
      decided_by = actor,
      decided_at = now(),
      updated_at = now()
  WHERE user_id = target_user_id;

  UPDATE public.employer_verification_documents
  SET verification_status = next_status,
      review_notes = NULLIF(trim(decision_note), ''),
      updated_at = now()
  WHERE user_id = target_user_id;

  INSERT INTO public.user_notifications(user_id, title, message, notification_type)
  VALUES (
    target_user_id,
    CASE WHEN next_status = 'verified' THEN 'Usaha berhasil diverifikasi' ELSE 'Verifikasi usaha memerlukan perbaikan' END,
    CASE
      WHEN next_status = 'verified'
        THEN 'Selamat! Usaha ' || business_label || ' telah diverifikasi. Kamu sekarang dapat membuat dan mengirim lowongan untuk ditinjau.'
      ELSE 'Verifikasi usaha ' || business_label || ' belum dapat disetujui. Catatan: ' || COALESCE(NULLIF(trim(decision_note), ''), 'Silakan periksa kembali data dan dokumen usaha.')
    END,
    'employer_verification'
  );

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (
    actor, 'employer.verification_decided', 'employer', target_user_id::text,
    jsonb_build_object('status', next_status, 'business_name', business_label, 'note', decision_note)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_employer_profile(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_employer_profile(uuid, text, text) TO authenticated;

-- Moderasi lowongan dan keputusan FraudGuard hanya untuk Super Admin.
CREATE OR REPLACE FUNCTION public.admin_review_job(
  target_job_id uuid,
  next_status text,
  rejection_note text
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
    RAISE EXCEPTION 'Akses ditolak: moderasi lowongan hanya dapat dilakukan Super Admin.';
  END IF;

  IF next_status NOT IN ('published', 'rejected') THEN
    RAISE EXCEPTION 'Status moderasi lowongan tidak valid.';
  END IF;

  IF next_status = 'published' AND NOT EXISTS (
    SELECT 1
    FROM public.jobs AS job
    JOIN public.employer_profiles AS profile ON profile.user_id = job.employer_id
    WHERE job.id = target_job_id
      AND profile.verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Lowongan tidak dapat diterbitkan karena usaha belum terverifikasi.';
  END IF;

  UPDATE public.jobs
  SET status = next_status,
      rejection_reason = CASE WHEN next_status = 'rejected' THEN NULLIF(trim(rejection_note), '') ELSE NULL END,
      published_at = CASE WHEN next_status = 'published' THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = target_job_id
    AND status = 'pending_review';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lowongan tidak ditemukan atau sudah diproses.';
  END IF;

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (actor, 'job.moderation_decided', 'job', target_job_id::text,
    jsonb_build_object('status', next_status, 'note', rejection_note));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_job(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_job(uuid, text, text) TO authenticated;

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

  IF next_status NOT IN ('investigating', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Status laporan tidak valid.';
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
  VALUES (actor, 'fraud_report.updated', 'fraud_report', target_report_id::text,
    jsonb_build_object('status', next_status, 'note', note));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_fraud_report(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_fraud_report(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
