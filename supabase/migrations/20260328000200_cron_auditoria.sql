-- Daily audit cron — requires pg_cron extension enabled in Supabase Dashboard
-- These will fail silently if pg_cron is not available

DO $$ BEGIN
  -- Daily at 06:00 BRT (09:00 UTC) — scan for anomalies + data quality
  PERFORM cron.schedule(
    'daily-audit-scan',
    '0 9 * * *',
    $$SELECT detect_financial_anomalies(); SELECT detect_data_quality_issues();$$
  );

  -- Monthly on 1st at 07:00 BRT (10:00 UTC) — margin snapshots
  PERFORM cron.schedule(
    'monthly-margin-snapshot',
    '0 10 1 * *',
    $$SELECT capture_margin_snapshots();$$
  );
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'pg_cron not available — cron jobs not scheduled. Enable pg_cron in Supabase Dashboard.';
END $$;
