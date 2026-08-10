-- Migration: Profile Details and Location Setup
-- Timestamp: 20260810000000

-- Add columns to public.profiles if they do not exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS country text DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS city text;

-- Create avatars bucket in storage if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for avatars bucket
-- 1. Permite acesso de leitura público para imagens de perfil
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

-- 2. Permite que usuários autenticados façam upload de suas próprias imagens de avatar
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK ( 
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1] 
  );

-- 3. Permite que usuários autenticados atualizem suas próprias imagens de avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING ( 
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1] 
  );

-- 4. Permite que usuários autenticados deletem suas próprias imagens de avatar
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING ( 
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1] 
  );
