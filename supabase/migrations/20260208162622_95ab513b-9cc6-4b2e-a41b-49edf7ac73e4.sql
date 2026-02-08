-- Create storage buckets for file uploads (private, not public)
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('client_files', 'client_files', false),
  ('stages', 'stages', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage policies for client_files bucket
-- Only authenticated users can upload files
CREATE POLICY "Authenticated users can upload client files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client_files');

-- Only authenticated users can view files
CREATE POLICY "Authenticated users can view client files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client_files');

-- Only authenticated users can delete files
CREATE POLICY "Authenticated users can delete client files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client_files');

-- Storage policies for stages bucket
-- Only authenticated users can upload photos
CREATE POLICY "Authenticated users can upload stage photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stages');

-- Only authenticated users can view photos
CREATE POLICY "Authenticated users can view stage photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'stages');

-- Only authenticated users can delete photos
CREATE POLICY "Authenticated users can delete stage photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'stages');