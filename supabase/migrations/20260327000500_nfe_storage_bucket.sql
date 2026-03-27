INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nfe-attachments', 'nfe-attachments', false, 5242880,
  ARRAY['application/xml', 'text/xml', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin_financeiro_nfe_storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'nfe-attachments'
    AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')
    )
  );
