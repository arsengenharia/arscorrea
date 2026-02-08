-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  document TEXT,
  responsible TEXT,
  phone TEXT,
  email TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_files table
CREATE TABLE public.client_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  project_manager TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stages table
CREATE TABLE public.stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  report TEXT,
  report_start_date DATE,
  report_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stage_photos table
CREATE TABLE public.stage_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
-- Clients policies
CREATE POLICY "Authenticated users can view clients" ON public.clients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create clients" ON public.clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete clients" ON public.clients
  FOR DELETE USING (auth.role() = 'authenticated');

-- Client files policies
CREATE POLICY "Authenticated users can view client files" ON public.client_files
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create client files" ON public.client_files
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete client files" ON public.client_files
  FOR DELETE USING (auth.role() = 'authenticated');

-- Projects policies
CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update projects" ON public.projects
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete projects" ON public.projects
  FOR DELETE USING (auth.role() = 'authenticated');

-- Stages policies
CREATE POLICY "Authenticated users can view stages" ON public.stages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create stages" ON public.stages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update stages" ON public.stages
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete stages" ON public.stages
  FOR DELETE USING (auth.role() = 'authenticated');

-- Stage photos policies
CREATE POLICY "Authenticated users can view stage photos" ON public.stage_photos
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create stage photos" ON public.stage_photos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete stage photos" ON public.stage_photos
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stages_updated_at
  BEFORE UPDATE ON public.stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequence for client code generation
CREATE SEQUENCE IF NOT EXISTS public.client_code_seq START 1;

-- Create function to generate client code
CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'CLI-' || LPAD(nextval('public.client_code_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for client code generation
CREATE TRIGGER generate_client_code_trigger
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_client_code();