-- KerjaLokal: pengajuan verifikasi ulang usaha setelah perbaikan data.
-- Jalankan setelah migration 202611070005_admin_superadmin_portal.sql.

ALTER TABLE public.employer_profiles
  ADD COLUMN IF NOT EXISTS resubmission_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resubmitted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employer_profiles_resubmission_count_nonnegative'
      AND conrelid = 'public.employer_profiles'::regclass
  ) THEN
    ALTER TABLE public.employer_profiles
      ADD CONSTRAINT employer_profiles_resubmission_count_nonnegative
      CHECK (resubmission_count >= 0);
  END IF;
END;
$$;

-- Riwayat menyimpan keputusan dan setiap pengajuan ulang agar catatan lama
-- tidak hilang ketika Super Admin memberikan keputusan berikutnya.
CREATE TABLE IF NOT EXISTS public.employer_verification_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('approved', 'rejected', 'resubmitted')),
  status text NOT NULL
    CHECK (status IN ('pending', 'verified', 'rejected')),
  note text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employer_verification_history_employer_created_idx
  ON public.employer_verification_history(employer_id, created_at DESC);

ALTER TABLE public.employer_verification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employer_verification_history_read_owner"
  ON public.employer_verification_history;
CREATE POLICY "employer_verification_history_read_owner"
ON public.employer_verification_history FOR SELECT TO authenticated
USING (employer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "employer_verification_history_read_admin"
  ON public.employer_verification_history;
CREATE POLICY "employer_verification_history_read_admin"
ON public.employer_verification_history FOR SELECT TO authenticated
USING (
  public.has_app_role('admin'::public.app_role)
  OR public.has_app_role('super_admin'::public.app_role)
);

REVOKE ALL ON public.employer_verification_history FROM anon, authenticated;
GRANT SELECT ON public.employer_verification_history TO authenticated;

-- Backfill keputusan terakhir yang sudah ada sebelum tabel riwayat dibuat.
INSERT INTO public.employer_verification_history (
  employer_id, action, status, note, actor_id, created_at
)
SELECT
  profile.user_id,
  CASE
    WHEN profile.verification_status = 'verified' THEN 'approved'
    ELSE 'rejected'
  END,
  profile.verification_status,
  profile.decision_notes,
  profile.decided_by,
  COALESCE(profile.decided_at, profile.updated_at, profile.created_at, now())
FROM public.employer_profiles AS profile
WHERE profile.verification_status IN ('verified', 'rejected')
  AND NOT EXISTS (
    SELECT 1
    FROM public.employer_verification_history AS history
    WHERE history.employer_id = profile.user_id
      AND history.action = CASE
        WHEN profile.verification_status = 'verified' THEN 'approved'
        ELSE 'rejected'
      END
  );

-- Hanya pemilik usaha yang sedang berstatus rejected dapat mengajukan ulang.
-- Data profil dan kontak wajib sudah disimpan serta lengkap sebelum dikirim.
CREATE OR REPLACE FUNCTION public.employer_resubmit_verification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  business_label text;
  profile_is_complete boolean;
  business_type_value text;
  description_value text;
  province_value text;
  city_value text;
  district_value text;
  village_value text;
  address_value text;
  pic_name_value text;
  phone_value text;
  contact_email_value text;
  next_count integer;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Sesi akun tidak valid. Silakan masuk kembali.';
  END IF;

  IF NOT public.has_app_role('employer'::public.app_role) THEN
    RAISE EXCEPTION 'Akses ditolak: hanya akun pelaku usaha yang dapat mengajukan verifikasi ulang.';
  END IF;

  SELECT
    business_name,
    profile_completed,
    business_type,
    description,
    province,
    city,
    district,
    village,
    address
  INTO
    business_label,
    profile_is_complete,
    business_type_value,
    description_value,
    province_value,
    city_value,
    district_value,
    village_value,
    address_value
  FROM public.employer_profiles
  WHERE user_id = actor
    AND verification_status = 'rejected'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengajuan ulang hanya tersedia untuk usaha yang berstatus perlu perbaikan.';
  END IF;

  IF NOT COALESCE(profile_is_complete, false)
    OR NULLIF(trim(COALESCE(business_label, '')), '') IS NULL
    OR NULLIF(trim(COALESCE(business_type_value, '')), '') IS NULL
    OR NULLIF(trim(COALESCE(description_value, '')), '') IS NULL
    OR NULLIF(trim(COALESCE(province_value, '')), '') IS NULL
    OR NULLIF(trim(COALESCE(city_value, '')), '') IS NULL
    OR NULLIF(trim(COALESCE(district_value, '')), '') IS NULL
    OR NULLIF(trim(COALESCE(village_value, '')), '') IS NULL
    OR NULLIF(trim(COALESCE(address_value, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Lengkapi dan simpan identitas, deskripsi, serta alamat usaha sebelum mengajukan verifikasi ulang.';
  END IF;

  SELECT pic_name, phone, contact_email
  INTO pic_name_value, phone_value, contact_email_value
  FROM public.employer_contacts
  WHERE user_id = actor;

  IF NOT FOUND
    OR NULLIF(trim(COALESCE(pic_name_value, '')), '') IS NULL
    OR NULLIF(trim(COALESCE(phone_value, '')), '') IS NULL
    OR NULLIF(trim(COALESCE(contact_email_value, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Lengkapi dan simpan nama penanggung jawab, nomor telepon, serta email kontak sebelum mengajukan verifikasi ulang.';
  END IF;

  UPDATE public.employer_profiles
  SET verification_status = 'pending',
      review_recommendation = 'not_reviewed',
      reviewer_notes = NULL,
      reviewed_by = NULL,
      reviewed_at = NULL,
      resubmission_count = COALESCE(resubmission_count, 0) + 1,
      resubmitted_at = now(),
      updated_at = now()
  WHERE user_id = actor
  RETURNING resubmission_count INTO next_count;

  -- Dokumen yang masih ada ikut dikembalikan ke antrean pemeriksaan.
  UPDATE public.employer_verification_documents
  SET verification_status = 'pending',
      review_notes = NULL,
      updated_at = now()
  WHERE user_id = actor;

  INSERT INTO public.employer_verification_history (
    employer_id, action, status, note, actor_id
  )
  VALUES (
    actor,
    'resubmitted',
    'pending',
    'Pelaku usaha mengajukan verifikasi ulang setelah memperbaiki data.',
    actor
  );

  -- Beri tahu Admin dan Super Admin agar pengajuan ulang masuk antrean pemeriksaan.
  INSERT INTO public.user_notifications (
    user_id, title, message, notification_type
  )
  SELECT
    roles.user_id,
    'Pengajuan verifikasi ulang usaha',
    'Usaha ' || business_label || ' telah mengajukan verifikasi ulang ke-' ||
      next_count::text || '. Silakan periksa kembali data dan dokumen terbaru.',
    'employer_verification_resubmission'
  FROM public.user_roles AS roles
  WHERE roles.role IN (
    'admin'::public.app_role,
    'super_admin'::public.app_role
  );

  INSERT INTO public.audit_logs (
    actor_id, action, entity_type, entity_id, details
  )
  VALUES (
    actor,
    'employer.verification_resubmitted',
    'employer',
    actor::text,
    jsonb_build_object(
      'business_name', business_label,
      'resubmission_count', next_count
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.employer_resubmit_verification() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_resubmit_verification() TO authenticated;

-- Catat semua keputusan baru di tabel riwayat, sambil mempertahankan perilaku
-- notifikasi pemilik usaha dan audit log yang sudah digunakan aplikasi.
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

  INSERT INTO public.employer_verification_history (
    employer_id, action, status, note, actor_id
  )
  VALUES (
    target_user_id,
    CASE WHEN next_status = 'verified' THEN 'approved' ELSE 'rejected' END,
    next_status,
    NULLIF(trim(decision_note), ''),
    actor
  );

  INSERT INTO public.user_notifications(user_id, title, message, notification_type)
  VALUES (
    target_user_id,
    CASE
      WHEN next_status = 'verified' THEN 'Usaha berhasil diverifikasi'
      ELSE 'Verifikasi usaha memerlukan perbaikan'
    END,
    CASE
      WHEN next_status = 'verified'
        THEN 'Selamat! Usaha ' || business_label || ' telah diverifikasi. Kamu sekarang dapat membuat dan mengirim lowongan untuk ditinjau.'
      ELSE 'Verifikasi usaha ' || business_label || ' belum dapat disetujui. Catatan: ' ||
        COALESCE(NULLIF(trim(decision_note), ''), 'Silakan periksa kembali data dan dokumen usaha.')
    END,
    'employer_verification'
  );

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, details)
  VALUES (
    actor,
    'employer.verification_decided',
    'employer',
    target_user_id::text,
    jsonb_build_object(
      'status', next_status,
      'business_name', business_label,
      'note', decision_note
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_employer_profile(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_employer_profile(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
