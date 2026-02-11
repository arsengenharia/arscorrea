
ALTER TABLE public.client_portal_access ADD COLUMN email text;

-- Backfill existing records won't be possible from client, but new ones will have email
