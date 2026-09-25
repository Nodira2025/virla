-- Historical public reservations from the previous app; never used for new bookings.
begin;
create table public.virla_booking_archive (
 id uuid primary key,
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 source text not null default 'netlify-legacy',
 imported_at timestamptz not null default now()
);
alter table public.virla_booking_archive enable row level security;
revoke all on public.virla_booking_archive from anon,authenticated;
grant select on public.virla_booking_archive to authenticated;
create policy archive_team_read on public.virla_booking_archive for select to authenticated
using ((select public.virla_role()) in ('admin','director','staff'));
notify pgrst,'reload schema';
commit;
