ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS cep        text,
  ADD COLUMN IF NOT EXISTS rua        text,
  ADD COLUMN IF NOT EXISTS numero     text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS bairro     text,
  ADD COLUMN IF NOT EXISTS cidade     text,
  ADD COLUMN IF NOT EXISTS estado     text;
