-- Add granular revenue categories for construction
-- Currently only "Aporte de Clientes" and "Serviços Prestados (receita)" exist
INSERT INTO financial_categories (nome, prefixo, e_receita, cor_hex, codigo) VALUES
  ('Sinal / Entrada', 'ROP', true, '#22C55E', 'sinal_entrada'),
  ('Aditivo Contratual', 'ROP', true, '#14B8A6', 'aditivo_contratual'),
  ('Reembolso do Cliente', 'ROP', true, '#06B6D4', 'reembolso_cliente'),
  ('Medição Aprovada', 'ROP', true, '#8B5CF6', 'medicao_aprovada'),
  ('Receita Financeira', 'ROP', true, '#F59E0B', 'receita_financeira')
ON CONFLICT DO NOTHING;
