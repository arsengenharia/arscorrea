CREATE TABLE project_financial_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  bank_account_id  uuid NOT NULL REFERENCES bank_accounts(id),
  category_id      uuid NOT NULL REFERENCES financial_categories(id),
  supplier_id      uuid REFERENCES suppliers(id),
  data             date NOT NULL,
  valor            numeric(12, 2) NOT NULL,
  tipo_documento   text NOT NULL CHECK (tipo_documento IN ('Pix', 'Boleto', 'Transferência', 'Dinheiro', 'Outros', 'NF-e')),
  numero_documento text,
  situacao         text NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente', 'conciliado', 'divergente')),
  is_comprometido  boolean NOT NULL DEFAULT false,
  nota_fiscal      text,
  chave_nfe        text UNIQUE,
  arquivo_url      text,
  observacoes      text,
  created_by       uuid REFERENCES profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pfe_project    ON project_financial_entries(project_id);
CREATE INDEX idx_pfe_category   ON project_financial_entries(category_id);
CREATE INDEX idx_pfe_supplier   ON project_financial_entries(supplier_id);
CREATE INDEX idx_pfe_data       ON project_financial_entries(data DESC);
CREATE INDEX idx_pfe_situacao   ON project_financial_entries(situacao);

ALTER TABLE project_financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_entries" ON project_financial_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "financeiro_crud_entries" ON project_financial_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'financeiro')
  );
