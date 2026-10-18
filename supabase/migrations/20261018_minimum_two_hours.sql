-- Run once AFTER schema.sql, for both new and already connected projects.
-- Sets existing machines to the newly agreed minimum; owners can still edit it later.
begin;
alter table public.machines alter column min_hours set default 2;
update public.machines set min_hours = 2;
commit;
