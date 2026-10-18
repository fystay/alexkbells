-- Email alerts to Alex for new requests: whether each one went, so a failed
-- alert can be retried once (src/app/api/cron/request-alerts) and shown in the
-- coach area. The request row itself is saved first and never depends on
-- these columns. Adds nullable columns only: existing rows are untouched.
--
-- alert_status: null = no alert attempted (email not configured);
--               'sent' = the provider accepted it; 'failed' = not yet sent.
-- alert_subject/alert_text: the exact email, so a retry sends the identical
--   message with the same idempotency key (the provider then drops a duplicate
--   of one it already accepted). Same data as the row's own columns.
-- alert_error: an HTTP status or "network", never provider response text.

begin;

alter table public.akb_booking_requests
  add column if not exists alert_status text check (alert_status in ('sent', 'failed')),
  add column if not exists alert_attempts integer not null default 0 check (alert_attempts between 0 and 20),
  add column if not exists alert_sent_at timestamptz,
  add column if not exists alert_error text not null default '' check (char_length(alert_error) <= 40),
  add column if not exists alert_subject text not null default '' check (char_length(alert_subject) <= 150),
  add column if not exists alert_text text not null default '' check (char_length(alert_text) <= 10000);

create index if not exists akb_booking_requests_alert_failed_idx
  on public.akb_booking_requests (created_at) where alert_status = 'failed';

-- Unchanged access: server only.
alter table public.akb_booking_requests enable row level security;
revoke all on public.akb_booking_requests from anon, authenticated;

commit;

notify pgrst, 'reload schema';
