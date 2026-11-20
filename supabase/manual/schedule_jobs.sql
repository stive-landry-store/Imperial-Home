-- Imperial Home — schedule the background jobs (run once in the Supabase SQL editor).
-- Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
--
-- 1. Database > Extensions: enable pg_cron and pg_net.
-- 2. Replace YOUR_PROJECT_REF and paste a CRON_SECRET you also set with:
--      npx supabase secrets set CRON_SECRET=<same value>
-- 3. Run this file.

select vault.create_secret('YOUR_LONG_RANDOM_CRON_SECRET', 'imperial_cron_secret');

create or replace function public.call_imperial_job(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/' || p_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'imperial_cron_secret')
    ),
    body := '{}'::jsonb
  );
end;
$$;
revoke all on function public.call_imperial_job(text) from public, anon, authenticated;

select cron.schedule('imperial-expire-holds', '*/5 * * * *', $$select public.call_imperial_job('expire-holds')$$);
select cron.schedule('imperial-guest-messages', '*/15 * * * *', $$select public.call_imperial_job('guest-messages')$$);
select cron.schedule('imperial-ical-sync', '7 * * * *', $$select public.call_imperial_job('ical-sync')$$);
select cron.schedule('imperial-monthly-report', '13 6 1 * *', $$select public.call_imperial_job('monthly-report')$$);
