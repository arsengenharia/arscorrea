-- Add FK constraints for user reference columns
-- All use ON DELETE SET NULL to preserve data if user is removed
-- Using DO blocks to skip gracefully if constraint already exists

-- calendar_events.created_by: already has FK (calendar_events_created_by_fkey), skip.

-- contracts.created_by (nullable, no orphans)
DO $$ BEGIN
  ALTER TABLE contracts
    ADD CONSTRAINT contracts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- project_documents.uploaded_by (nullable, has orphans — null them first)
UPDATE project_documents SET uploaded_by = NULL
WHERE uploaded_by IS NOT NULL AND uploaded_by NOT IN (SELECT id FROM profiles);

DO $$ BEGIN
  ALTER TABLE project_documents
    ADD CONSTRAINT project_documents_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
