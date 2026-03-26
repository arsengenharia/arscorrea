CREATE TABLE bank_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banco               text NOT NULL,
  agencia             text,
  conta               text NOT NULL,
  descricao           text,
  saldo_inicial       numeric(12, 2) NOT NULL DEFAULT 0,
  data_saldo_inicial  date NOT NULL,
  ativo               boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_bank_accounts" ON bank_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "financeiro_read_bank_accounts" ON bank_accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'financeiro')
  );
