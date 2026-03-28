CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_document_unique
  ON suppliers(document) WHERE document IS NOT NULL AND document <> '';
