-- Unify document storage across client_files, project_documents, proposal_documents
-- 1) client_files: add missing columns to match project_documents/proposal_documents schema
-- 2) proposal_documents: version the schema that was created remotely via Lovable/SQL editor
-- Idempotent: safe to run on environments where objects already exist.

-- ============================================================================
-- 1. client_files — add missing columns (keep file_url as legacy fallback)
-- ============================================================================

ALTER TABLE public.client_files
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS file_type TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

-- Allow file_url to be null for new records that use file_path
ALTER TABLE public.client_files
  ALTER COLUMN file_url DROP NOT NULL;

-- ============================================================================
-- 2. proposal_documents — version the existing remote schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.proposal_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proposal_documents'
      AND policyname = 'Admins can manage proposal_documents'
  ) THEN
    CREATE POLICY "Admins can manage proposal_documents"
      ON public.proposal_documents
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Storage bucket for proposal documents (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal_documents', 'proposal_documents', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload proposal documents'
  ) THEN
    CREATE POLICY "Admins can upload proposal documents"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'proposal_documents'
        AND public.has_role(auth.uid(), 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update proposal documents'
  ) THEN
    CREATE POLICY "Admins can update proposal documents"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'proposal_documents'
        AND public.has_role(auth.uid(), 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete proposal documents'
  ) THEN
    CREATE POLICY "Admins can delete proposal documents"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'proposal_documents'
        AND public.has_role(auth.uid(), 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can view proposal documents'
  ) THEN
    CREATE POLICY "Authenticated users can view proposal documents"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'proposal_documents');
  END IF;
END $$;
