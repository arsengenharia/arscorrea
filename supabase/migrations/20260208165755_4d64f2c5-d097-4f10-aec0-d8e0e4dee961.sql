-- Create sequence for proposal numbering
CREATE SEQUENCE IF NOT EXISTS proposal_number_seq START 1;

-- Create proposals table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number TEXT UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  title TEXT,
  condo_name TEXT,
  work_address TEXT,
  city TEXT,
  state TEXT,
  scope_text TEXT,
  validity_days INTEGER DEFAULT 10,
  execution_days INTEGER DEFAULT 60,
  payment_terms TEXT,
  warranty_terms TEXT,
  exclusions TEXT,
  notes TEXT,
  discount_type TEXT DEFAULT 'fixed',
  discount_value NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  pdf_path TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposal_items table
CREATE TABLE public.proposal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  category TEXT,
  description TEXT,
  unit TEXT,
  quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to generate proposal number
CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.number IS NULL OR NEW.number = '' THEN
    NEW.number := 'PROP-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.proposal_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for automatic proposal numbering
CREATE TRIGGER generate_proposal_number_trigger
BEFORE INSERT ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.generate_proposal_number();

-- Create trigger for updated_at on proposals
CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on proposals
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- RLS policies for proposals (shared team access)
CREATE POLICY "Authenticated users can view proposals"
ON public.proposals FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create proposals"
ON public.proposals FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update proposals"
ON public.proposals FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete proposals"
ON public.proposals FOR DELETE
USING (auth.role() = 'authenticated');

-- Enable RLS on proposal_items
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for proposal_items (shared team access)
CREATE POLICY "Authenticated users can view proposal items"
ON public.proposal_items FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create proposal items"
ON public.proposal_items FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update proposal items"
ON public.proposal_items FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete proposal items"
ON public.proposal_items FOR DELETE
USING (auth.role() = 'authenticated');

-- Create storage bucket for proposals (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposals', 'proposals', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for proposals bucket
CREATE POLICY "Authenticated users can view proposal files"
ON storage.objects FOR SELECT
USING (bucket_id = 'proposals' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload proposal files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'proposals' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update proposal files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'proposals' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete proposal files"
ON storage.objects FOR DELETE
USING (bucket_id = 'proposals' AND auth.role() = 'authenticated');