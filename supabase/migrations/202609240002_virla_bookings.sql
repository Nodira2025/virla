-- VIRLA · solicitudes, ocupaciones y avisos. Ejecutar después de 202609240001.
begin;
create extension if not exists btree_gist with schema extensions;
set local search_path=public,extensions;
create table public.virla_bookings (
 id uuid primary key default gen_random_uuid(),
 space_id text not null references public.virla_space_profiles(id),
 title text not null check (length(trim(title)) between 1 and 100),
 description text not null check (length(trim(description)) between 10 and 500),
 activity_type text not null check (activity_type in ('function','rehearsal','meeting','exhibition','academic','assembly','maintenance','other')),
 category text not null default 'unclassified' check (category in ('theatre','music','dance','exhibition','academic','talk','radio','other','unclassified')),
 date date not null, start_time time not null, end_time time not null,
 responsible_name text not null check (length(trim(responsible_name)) between 1 and 80),
 organization text not null default '', expected_attendance integer check (expected_attendance>0),
 status text not null check (status in ('pending','confirmed','rejected')),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 decided_by uuid references auth.users(id), decided_at timestamptz, decision_note text not null default '',
 occupied_range tsrange generated always as (tsrange(date+start_time,date+end_time,'[)')) stored,
 check (end_time-start_time >= interval '30 minutes'),
 constraint virla_no_overlap exclude using gist (space_id with =, occupied_range with &&) where (status='confirmed')
);
create table public.virla_booking_private (
 booking_id uuid primary key references public.virla_bookings(id) on delete cascade,
 contact text not null check (length(trim(contact)) between 6 and 120),
 notes text not null default '' check (length(notes)<=500)
);
create table public.virla_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 booking_id uuid not null references public.virla_bookings(id) on delete cascade,
 kind text not null check (kind in ('pending','confirmed','rejected')),
 message text not null, created_at timestamptz not null default now(), read_at timestamptz,
 unique(recipient_id,booking_id,kind)
);
create index virla_notifications_recipient on public.virla_notifications(recipient_id,created_at desc);
create index virla_bookings_status_date on public.virla_bookings(status,date);
alter table public.virla_bookings enable row level security;
alter table public.virla_booking_private enable row level security;
alter table public.virla_notifications enable row level security;
revoke all on public.virla_bookings,public.virla_booking_private,public.virla_notifications from anon,authenticated;
grant select on public.virla_bookings,public.virla_booking_private,public.virla_notifications to authenticated;
grant update(read_at) on public.virla_notifications to authenticated;
create policy bookings_read on public.virla_bookings for select to authenticated
using ((select public.virla_role()) in ('admin','director') or ((select public.virla_role())='staff' and (status='confirmed' or created_by=(select auth.uid()))));
create policy private_booking_read on public.virla_booking_private for select to authenticated
using ((select public.virla_role()) in ('admin','director') or ((select public.virla_role())='staff' and exists(select 1 from public.virla_bookings b where b.id=booking_id and b.created_by=(select auth.uid()))));
create policy notifications_read on public.virla_notifications for select to authenticated
using (recipient_id=(select auth.uid()) and (select public.virla_role()) is not null);
create policy notifications_seen on public.virla_notifications for update to authenticated
using (recipient_id=(select auth.uid()) and (select public.virla_role()) is not null)
with check (recipient_id=(select auth.uid()) and (select public.virla_role()) is not null);

create function public.virla_booking_notice() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and new.status=old.status then return new; end if;
 if new.status='pending' then
  insert into public.virla_notifications(recipient_id,booking_id,kind,message)
  select id,new.id,'pending','Nueva solicitud: '||new.title from public.virla_profiles where active and role in ('director','admin')
  on conflict do nothing;
 else
  insert into public.virla_notifications(recipient_id,booking_id,kind,message)
  values(new.created_by,new.id,new.status,case when new.status='confirmed' then 'Espacio confirmado: ' else 'Solicitud rechazada: ' end||new.title)
  on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.virla_booking_notice() from public;
create trigger booking_notice after insert or update of status on public.virla_bookings for each row execute function public.virla_booking_notice();

create function public.virla_create_booking(input jsonb) returns public.virla_bookings
language plpgsql security definer set search_path='' as $$
declare r text:=public.virla_role(); result public.virla_bookings; cap integer; new_status text;
begin
 if r is null then raise exception 'Tu cuenta no está autorizada.' using errcode='42501'; end if;
 if coalesce(input->>'website','')<>'' then raise exception 'Solicitud inválida.'; end if;
 if (input->>'date')::date < (now() at time zone 'America/Argentina/Tucuman')::date then raise exception 'La fecha no puede ser anterior a hoy.'; end if;
 select capacity into cap from public.virla_space_profiles where id=input->>'spaceId';
 if not found then raise exception 'El espacio no existe.'; end if;
 if cap is not null and nullif(input->>'expectedAttendance','')::integer>cap then raise exception 'La asistencia supera la capacidad del espacio.'; end if;
 new_status:=case when r in ('admin','director') then 'confirmed' else 'pending' end;
 insert into public.virla_bookings(space_id,title,description,activity_type,category,date,start_time,end_time,responsible_name,organization,expected_attendance,status,created_by,decided_by,decided_at)
 values(input->>'spaceId',trim(input->>'title'),trim(input->>'description'),input->>'activityType',coalesce(nullif(input->>'category',''),'unclassified'),(input->>'date')::date,(input->>'startTime')::time,(input->>'endTime')::time,trim(input->>'responsibleName'),left(coalesce(input->>'organization',''),100),nullif(input->>'expectedAttendance','')::integer,new_status,auth.uid(),case when new_status='confirmed' then auth.uid() end,case when new_status='confirmed' then now() end)
 returning * into result;
 insert into public.virla_booking_private(booking_id,contact,notes) values(result.id,trim(input->>'contact'),coalesce(input->>'notes',''));
 return result;
 exception when exclusion_violation then raise exception 'El espacio ya está ocupado en ese horario.' using errcode='23P01';
end $$;
revoke all on function public.virla_create_booking(jsonb) from public;
grant execute on function public.virla_create_booking(jsonb) to authenticated;

create function public.virla_decide_booking(booking_id uuid, approve boolean, reason text default '') returns public.virla_bookings
language plpgsql security definer set search_path='' as $$
declare result public.virla_bookings; cap integer;
begin
 if public.virla_role() is null or public.virla_role() not in ('admin','director') then raise exception 'Solo dirección o admin pueden decidir solicitudes.' using errcode='42501'; end if;
 select * into result from public.virla_bookings where id=booking_id for update;
 if not found or result.status<>'pending' then raise exception 'La solicitud ya fue resuelta o no existe.'; end if;
 if approve and result.date < (now() at time zone 'America/Argentina/Tucuman')::date then raise exception 'La fecha solicitada ya pasó.'; end if;
 select capacity into cap from public.virla_space_profiles where id=result.space_id;
 if approve and cap is not null and result.expected_attendance>cap then raise exception 'La asistencia supera la capacidad actual del espacio.'; end if;
 if not approve and length(trim(reason))<3 then raise exception 'Indicá el motivo del rechazo.'; end if;
 update public.virla_bookings set status=case when approve then 'confirmed' else 'rejected' end,decided_by=auth.uid(),decided_at=now(),decision_note=left(trim(reason),500) where id=booking_id returning * into result;
 return result;
 exception when exclusion_violation then raise exception 'El espacio ya está ocupado en ese horario. Elegí otro horario.' using errcode='23P01';
end $$;
revoke all on function public.virla_decide_booking(uuid,boolean,text) from public;
grant execute on function public.virla_decide_booking(uuid,boolean,text) to authenticated;

do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.virla_notifications;
 end if;
end $$;
notify pgrst,'reload schema';
commit;
