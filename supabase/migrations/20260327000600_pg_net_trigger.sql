CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION trigger_parse_nfe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'recebido' THEN
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

CREATE TRIGGER on_nfe_inbox_insert
  AFTER INSERT ON nfe_inbox
  FOR EACH ROW EXECUTE FUNCTION trigger_parse_nfe();
