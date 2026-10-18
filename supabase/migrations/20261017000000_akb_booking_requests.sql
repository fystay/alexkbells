-- Booking requests and online coaching enquiries from the Alex K Bells site.
-- Written and read only by the site's server with the secret key: RLS is on
-- and there are no policies, so the anon/authenticated roles get nothing.
-- Prefixed "akb_" because this project's public schema also holds another
-- app's tables (see ARCHITECTURE.md).
create table if not exists public.akb_booking_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  idempotency_key text not null unique,
  kind text not null check (kind in ('booking', 'online')),
  service text not null check (char_length(service) <= 100),
  summary text not null default '' check (char_length(summary) <= 300),
  name text not null check (char_length(name) <= 100),
  email text not null check (char_length(email) <= 254),
  phone text not null default '' check (char_length(phone) <= 30),
  message text not null default '' check (char_length(message) <= 1000),
  details jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'confirmed', 'declined'))
);

alter table public.akb_booking_requests enable row level security;
revoke all on public.akb_booking_requests from anon, authenticated;

create index if not exists akb_booking_requests_created_at_idx on public.akb_booking_requests (created_at desc);
