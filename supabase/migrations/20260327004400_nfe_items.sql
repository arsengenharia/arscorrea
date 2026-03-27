-- ══════════════════════════════════════════════════════════════
-- NF-e ITEMS — normalized line items from NF-e invoices
-- ══════════════════════════════════════════════════════════════

CREATE TABLE nfe_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_inbox_id      uuid NOT NULL REFERENCES nfe_inbox(id) ON DELETE CASCADE,
  financial_entry_id uuid REFERENCES project_financial_entries(id) ON DELETE SET NULL,
  item_catalog_id   uuid REFERENCES item_catalog(id),           -- link to standardized catalog

  -- Original data from XML
  descricao_original  text NOT NULL,                            -- xProd from XML (raw)
  ncm                 text,                                     -- NCM code from XML
  cfop                text,                                     -- CFOP code from XML
  quantidade          numeric(12, 4) NOT NULL DEFAULT 1,
  unidade             text,                                     -- uCom from XML
  valor_unitario      numeric(12, 4),                           -- vUnCom from XML
  valor_total         numeric(12, 2) NOT NULL,                  -- vProd from XML

  -- Standardized (filled by AI or manual)
  nome_padronizado    text,                                     -- standardized product name
  categoria_item      text,                                     -- product category

  -- Tracking
  project_id          uuid REFERENCES projects(id),             -- inherited from NF-e approval
  supplier_id         uuid REFERENCES suppliers(id),            -- inherited from NF-e

  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_nfe_items_inbox      ON nfe_items(nfe_inbox_id);
CREATE INDEX idx_nfe_items_entry      ON nfe_items(financial_entry_id);
CREATE INDEX idx_nfe_items_catalog    ON nfe_items(item_catalog_id);
CREATE INDEX idx_nfe_items_ncm        ON nfe_items(ncm);
CREATE INDEX idx_nfe_items_supplier   ON nfe_items(supplier_id);
CREATE INDEX idx_nfe_items_project    ON nfe_items(project_id);

ALTER TABLE nfe_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_financeiro_nfe_items" ON nfe_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro'))
  );

-- ══════════════════════════════════════════════════════════════
-- BACKFILL: normalize existing itens_json into nfe_items
-- ══════════════════════════════════════════════════════════════

INSERT INTO nfe_items (nfe_inbox_id, descricao_original, ncm, cfop, valor_total, supplier_id, project_id)
SELECT
  ni.id,
  item->>'xProd',
  item->>'NCM',
  item->>'CFOP',
  COALESCE((item->>'vProd')::numeric, 0),
  ni.supplier_id,
  ni.project_id_selecionado
FROM nfe_inbox ni,
     jsonb_array_elements(ni.itens_json) AS item
WHERE ni.itens_json IS NOT NULL
  AND jsonb_array_length(ni.itens_json) > 0;

-- Auto-link items to catalog by NCM match
UPDATE nfe_items ni SET
  item_catalog_id = ic.id,
  nome_padronizado = ic.nome_padrao,
  categoria_item = ic.categoria
FROM item_catalog ic
WHERE ni.ncm = ic.ncm
  AND ni.item_catalog_id IS NULL;
