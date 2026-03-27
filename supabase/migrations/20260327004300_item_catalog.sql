-- ══════════════════════════════════════════════════════════════
-- ITEM CATALOG — standardized product/service names based on NCM
-- ══════════════════════════════════════════════════════════════

CREATE TABLE item_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncm             text NOT NULL,                    -- NCM code (8 digits)
  nome_padrao     text NOT NULL,                    -- standardized name (e.g., "CIMENTO PORTLAND CP-II")
  unidade_padrao  text,                             -- standard unit (kg, m3, un, m2, etc.)
  categoria       text,                             -- product category (e.g., "Cimento", "Areia", "Ferragem")
  descricao       text,                             -- detailed description
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

CREATE UNIQUE INDEX idx_item_catalog_ncm_nome ON item_catalog(ncm, nome_padrao);
CREATE INDEX idx_item_catalog_ncm ON item_catalog(ncm);
CREATE INDEX idx_item_catalog_categoria ON item_catalog(categoria);

ALTER TABLE item_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_financeiro_item_catalog" ON item_catalog
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro'))
  );

-- Seed common construction NCMs with standardized names
INSERT INTO item_catalog (ncm, nome_padrao, unidade_padrao, categoria) VALUES
  -- Cimentos
  ('25232900', 'Cimento Portland CP-II', 'kg', 'Cimento'),
  ('25232100', 'Cimento Portland Branco', 'kg', 'Cimento'),
  -- Areias e agregados
  ('25059000', 'Areia Média', 'm3', 'Agregados'),
  ('25171000', 'Brita/Pedra Britada', 'm3', 'Agregados'),
  ('25174900', 'Pedregulho', 'm3', 'Agregados'),
  -- Cerâmicos
  ('69041000', 'Tijolo Cerâmico', 'un', 'Alvenaria'),
  ('69049000', 'Bloco Cerâmico', 'un', 'Alvenaria'),
  ('69051000', 'Telha Cerâmica', 'un', 'Cobertura'),
  -- Aço e ferragens
  ('72142000', 'Vergalhão de Aço CA-50', 'kg', 'Ferragem'),
  ('72149900', 'Barra de Aço', 'kg', 'Ferragem'),
  ('73141400', 'Tela de Aço Soldada', 'm2', 'Ferragem'),
  -- Madeira
  ('44071100', 'Madeira Serrada Pinus', 'm3', 'Madeira'),
  ('44079900', 'Madeira Serrada Diversa', 'm3', 'Madeira'),
  -- Tubos PVC
  ('39172300', 'Tubo PVC Esgoto', 'm', 'Hidráulica'),
  ('39172100', 'Tubo PVC Água Fria', 'm', 'Hidráulica'),
  -- Fios e cabos
  ('85444900', 'Fio/Cabo Elétrico', 'm', 'Elétrica'),
  ('85352100', 'Disjuntor', 'un', 'Elétrica'),
  -- Tintas
  ('32091000', 'Tinta Acrílica', 'l', 'Pintura'),
  ('32100010', 'Massa Corrida', 'kg', 'Pintura'),
  -- Impermeabilização
  ('27132000', 'Manta Asfáltica', 'm2', 'Impermeabilização'),
  ('38249090', 'Impermeabilizante Líquido', 'l', 'Impermeabilização'),
  -- Argamassa
  ('38160000', 'Argamassa Pronta', 'kg', 'Argamassa'),
  ('38245090', 'Rejunte', 'kg', 'Acabamento'),
  -- Pisos
  ('69072100', 'Piso Cerâmico', 'm2', 'Acabamento'),
  ('69089000', 'Porcelanato', 'm2', 'Acabamento')
ON CONFLICT DO NOTHING;
