-- Add new columns to clients table for lead qualification and address
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS neighborhood text,
ADD COLUMN IF NOT EXISTS service_rep text,
ADD COLUMN IF NOT EXISTS lead_channel text,
ADD COLUMN IF NOT EXISTS lead_referral text,
ADD COLUMN IF NOT EXISTS lead_date date DEFAULT CURRENT_DATE;