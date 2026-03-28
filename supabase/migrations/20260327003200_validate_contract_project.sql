-- Ensure contracts.project_id is consistent with proposals.project_id
CREATE OR REPLACE FUNCTION validate_contract_project_consistency()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_proposal_project_id uuid;
BEGIN
  IF NEW.proposal_id IS NOT NULL THEN
    SELECT project_id INTO v_proposal_project_id
    FROM proposals WHERE id = NEW.proposal_id;

    -- Auto-fill from proposal if contract doesn't have project_id
    IF v_proposal_project_id IS NOT NULL AND NEW.project_id IS NULL THEN
      NEW.project_id := v_proposal_project_id;
    END IF;

    -- Validate consistency if both are set
    IF v_proposal_project_id IS NOT NULL AND NEW.project_id IS NOT NULL
       AND v_proposal_project_id != NEW.project_id THEN
      RAISE EXCEPTION 'Contract project_id (%) differs from proposal project_id (%)',
        NEW.project_id, v_proposal_project_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_contract_project
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION validate_contract_project_consistency();
