CREATE TABLE financial_categories (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL,
  prefixo   text NOT NULL CHECK (prefixo IN ('CV', 'ROP', 'ADM')),
  e_receita boolean NOT NULL DEFAULT false,
  cor_hex   text NOT NULL,
  ativo     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_categories" ON financial_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "financeiro_read_categories" ON financial_categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'financeiro')
  );

INSERT INTO financial_categories (nome, prefixo, e_receita, cor_hex) VALUES
  ('Mão de Obra Direta', 'CV', false, '#7C3AED'),
  ('Materiais de Obra', 'CV', false, '#D97706'),
  ('Serviços Prestados', 'CV', false, '#065F46'),
  ('Equipamentos e Ferramentas', 'CV', false, '#2563EB'),
  ('Reembolsos e Outras Despesas de Obras', 'CV', false, '#6B7280'),
  ('Aporte de Clientes', 'ROP', true, '#16A34A'),
  ('Serviços Prestados (receita)', 'ROP', true, '#0D9488'),
  ('Custo Administrativo (indireto)', 'ADM', false, '#EC4899');
