-- Document summaries for RAG-like search
-- Stores extracted text and AI summaries from uploaded documents
CREATE TABLE IF NOT EXISTS document_summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type     text NOT NULL,                    -- 'nfe_inbox', 'project_document', 'contract'
  source_id       uuid NOT NULL,                    -- ID of the source record
  filename        text,
  content_text    text,                             -- extracted raw text (for search)
  summary         text,                             -- AI-generated summary
  keywords        text[],                           -- extracted keywords for search
  project_id      uuid REFERENCES projects(id),
  supplier_id     uuid REFERENCES suppliers(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_doc_summaries_source ON document_summaries(source_type, source_id);
CREATE INDEX idx_doc_summaries_project ON document_summaries(project_id);
CREATE INDEX idx_doc_summaries_keywords ON document_summaries USING gin(keywords);
-- Full text search index
CREATE INDEX idx_doc_summaries_text ON document_summaries USING gin(to_tsvector('portuguese', coalesce(content_text, '') || ' ' || coalesce(summary, '')));

ALTER TABLE document_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_financeiro_doc_summaries" ON document_summaries
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'financeiro')));
