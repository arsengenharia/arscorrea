-- Create storage bucket for proposal uploads (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposal_uploads', 'proposal_uploads', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for proposal_uploads bucket
CREATE POLICY "Users can upload proposal PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'proposal_uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own proposal PDFs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proposal_uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own proposal PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'proposal_uploads' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create proposal_imports table for audit/tracking
CREATE TABLE public.proposal_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  client_id UUID REFERENCES public.clients(id),
  proposal_id UUID REFERENCES public.proposals(id),
  file_path TEXT NOT NULL,
  extracted_text TEXT,
  parsed_json JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'extracting', 'parsing', 'done', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposal_imports ENABLE ROW LEVEL SECURITY;

-- RLS policies for proposal_imports
CREATE POLICY "Users can view their own imports"
ON public.proposal_imports FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own imports"
ON public.proposal_imports FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own imports"
ON public.proposal_imports FOR UPDATE
USING (auth.uid() = created_by);

-- Add updated_at trigger
CREATE TRIGGER update_proposal_imports_updated_at
BEFORE UPDATE ON public.proposal_imports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_proposal_imports_created_by ON public.proposal_imports(created_by);
CREATE INDEX idx_proposal_imports_status ON public.proposal_imports(status);