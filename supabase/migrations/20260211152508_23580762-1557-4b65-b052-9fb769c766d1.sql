
-- Create table for documents shared with clients via portal
CREATE TABLE public.project_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage project_documents"
ON public.project_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Portal clients can view documents of their projects
CREATE POLICY "Portal clients can view project documents"
ON public.project_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_portal_access cpa
    WHERE cpa.project_id = project_documents.project_id
    AND cpa.user_id = auth.uid()
  )
);

-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public) VALUES ('project_documents', 'project_documents', false);

-- Storage policies for project_documents bucket
CREATE POLICY "Admins can upload project documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project_documents'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update project documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project_documents'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete project documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project_documents'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated users can view project documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'project_documents');
