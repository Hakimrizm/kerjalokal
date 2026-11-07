-- KerjaLokal: tambahkan role admin operasional.
-- Jalankan file ini TERPISAH terlebih dahulu, lalu jalankan migration 0005.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
