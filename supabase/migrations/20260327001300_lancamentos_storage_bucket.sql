INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lancamentos', 'lancamentos', false, 10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin_financeiro_lancamentos_storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'lancamentos'
    AND EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')
    )
  );
