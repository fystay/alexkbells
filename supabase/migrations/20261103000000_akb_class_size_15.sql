-- The usual class size is 15 (Alex's mockup, via the owner, 2026-10-29: "15 places
-- max"; it was 12 "for now"). Alex still changes it in the coach portal.
-- Changes one setting row and the fallback inside akb_default_class_capacity();
-- no booking is touched (a higher size only makes room). Safe to run again.

begin;

update public.akb_settings set int_value = 15, updated_at = now() where key = 'default_class_capacity';

create or replace function public.akb_default_class_capacity()
returns integer language sql stable set search_path = public as $$
  select coalesce((select int_value from public.akb_settings where key = 'default_class_capacity'), 15);
$$;

notify pgrst, 'reload schema';

commit;
