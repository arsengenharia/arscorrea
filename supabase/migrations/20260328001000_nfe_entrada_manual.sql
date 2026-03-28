-- Add entrada_manual to nfe_origem enum
DO $$ BEGIN
  ALTER TYPE nfe_origem ADD VALUE IF NOT EXISTS 'entrada_manual';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update trigger to skip parse for manual entries
CREATE OR REPLACE FUNCTION trigger_parse_nfe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only auto-parse for email/upload (not manual entries — they already have data)
  IF NEW.status = 'recebido' AND NEW.origem != 'entrada_manual' THEN
    PERFORM net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/parse-nfe-xml',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body    := jsonb_build_object('nfe_inbox_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;
