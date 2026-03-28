ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS tipo                text CHECK (tipo IS NULL OR tipo IN ('Pessoa Fisica', 'Juridica', 'Autonomo')),
  ADD COLUMN IF NOT EXISTS categoria_padrao_id uuid REFERENCES financial_categories(id),
  ADD COLUMN IF NOT EXISTS chave_pix           text,
  ADD COLUMN IF NOT EXISTS observacoes         text,
  ADD COLUMN IF NOT EXISTS ativo               boolean NOT NULL DEFAULT true;
