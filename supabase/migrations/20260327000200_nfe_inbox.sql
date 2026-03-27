CREATE TYPE nfe_status AS ENUM (
  'recebido', 'processando', 'aguardando_revisao', 'aprovado', 'rejeitado', 'duplicata', 'erro'
);
CREATE TYPE nfe_origem AS ENUM ('email', 'upload_manual');
CREATE TYPE nfe_arquivo_tipo AS ENUM ('xml', 'pdf');

CREATE TABLE nfe_inbox (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status                 nfe_status       NOT NULL DEFAULT 'recebido',
  origem                 nfe_origem       NOT NULL,
  arquivo_path           text             NOT NULL,
  arquivo_tipo           nfe_arquivo_tipo NOT NULL,
  email_remetente        text,
  email_assunto          text,
  email_recebido_em      timestamptz,
  cnpj                   text,
  razao_social           text,
  numero_nota            text,
  data_emissao           date,
  valor_total            numeric(12, 2),
  chave_nfe              text UNIQUE,
  supplier_id            uuid REFERENCES suppliers(id),
  categoria_sugerida     text,
  ai_confianca           numeric(3, 2),
  ai_justificativa       text,
  itens_json             jsonb,
  obras_ativas_json      jsonb,
  project_id_selecionado uuid REFERENCES projects(id),
  bank_account_id_selecionado uuid REFERENCES bank_accounts(id),
  categoria_final        text,
  financial_entry_id     uuid REFERENCES project_financial_entries(id),
  revisado_por           uuid REFERENCES profiles(id),
  revisado_em            timestamptz,
  observacao             text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nfe_inbox_status   ON nfe_inbox(status);
CREATE INDEX idx_nfe_inbox_supplier ON nfe_inbox(supplier_id);
CREATE INDEX idx_nfe_inbox_created  ON nfe_inbox(created_at DESC);

ALTER TABLE nfe_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_financeiro_nfe_inbox" ON nfe_inbox
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro'))
  );
