CREATE TABLE cost_allocations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id    uuid NOT NULL REFERENCES project_financial_entries(id),
  project_id       uuid NOT NULL REFERENCES projects(id),
  percentual       numeric(5, 2) NOT NULL,
  valor_alocado    numeric(12, 2) NOT NULL,
  criado_por       uuid REFERENCES profiles(id),
  data_rateio      date NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ca_lancamento ON cost_allocations(lancamento_id);
CREATE INDEX idx_ca_project ON cost_allocations(project_id);

ALTER TABLE cost_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_cost_allocations" ON cost_allocations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "financeiro_crud_cost_allocations" ON cost_allocations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'financeiro')
  );
