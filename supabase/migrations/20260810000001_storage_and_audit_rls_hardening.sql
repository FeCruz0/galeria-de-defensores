-- Migration: Storage RLS Hardening, Audit Logs Enforcement & Table Password Security
-- Timestamp: 20260810000001

-- 1. Enable pgcrypto extension for secure hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Storage RLS policies for avatars bucket (Ensure folder path = auth.uid())
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Audit Logs RLS Policy Hardening
DROP POLICY IF EXISTS "Admins e sistema registram logs de auditoria" ON public.audit_logs;
CREATE POLICY "Usuarios autenticados registram proprios logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR user_id IS NULL
  );

-- 4. Secure RPC function to verify private table password without exposing password column to clients
CREATE OR REPLACE FUNCTION public.verify_table_password(p_table_id uuid, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_password text;
  v_is_private boolean;
BEGIN
  SELECT password, is_private INTO v_stored_password, v_is_private
  FROM public.tables
  WHERE id = p_table_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Se a mesa não for privada ou não houver senha cadastrada
  IF NOT v_is_private OR v_stored_password IS NULL OR v_stored_password = '' THEN
    RETURN true;
  END IF;

  -- Verifica se a senha confere (com suporte a hash pgcrypto e fallback para texto plano pré-existente)
  IF v_stored_password = p_password OR v_stored_password = crypt(p_password, v_stored_password) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
