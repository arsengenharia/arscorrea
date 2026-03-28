CREATE TABLE bank_transactions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id      uuid NOT NULL REFERENCES bank_accounts(id),
  data_transacao       date NOT NULL,
  descricao_banco      text NOT NULL,
  valor                numeric(12, 2) NOT NULL,
  tipo_origem          text NOT NULL,
  lancamento_id        uuid REFERENCES project_financial_entries(id),
  status_conciliacao   text NOT NULL DEFAULT 'pendente' CHECK (status_conciliacao IN ('pendente', 'conciliado', 'nao_identificado')),
  importado_em         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bt_account ON bank_transactions(bank_account_id);
CREATE INDEX idx_bt_status ON bank_transactions(status_conciliacao);
CREATE INDEX idx_bt_data ON bank_transactions(data_transacao DESC);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_bank_transactions" ON bank_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "financeiro_crud_bank_transactions" ON bank_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'financeiro')
  );
