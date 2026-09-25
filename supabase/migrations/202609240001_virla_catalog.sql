-- VIRLA · proyecto iiehofyypkmjbcwqnwlg. Ejecutar antes de 202609240002.
-- Nuevas tablas con RLS. No modifica ni elimina datos existentes de otras apps.
begin;

create table public.virla_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text check (role in ('admin','director','staff')),
  active boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.virla_profiles enable row level security;
revoke all on public.virla_profiles from anon, authenticated;
grant select on public.virla_profiles to authenticated;

create function public.virla_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.virla_profiles where id = (select auth.uid()) and active;
$$;
revoke all on function public.virla_role() from public;
grant execute on function public.virla_role() to authenticated;
create policy profiles_self_or_admin on public.virla_profiles for select to authenticated
using (id = (select auth.uid()) or (select public.virla_role()) = 'admin');

create function public.virla_ensure_profile() returns public.virla_profiles
language plpgsql security definer set search_path = '' as $$
declare result public.virla_profiles;
begin
  if auth.uid() is null then raise exception 'Iniciá sesión.' using errcode = '42501'; end if;
  insert into public.virla_profiles(id,email,display_name)
  select id,coalesce(email,''),left(coalesce(raw_user_meta_data->>'display_name',''),100)
  from auth.users where id=auth.uid() on conflict (id) do nothing;
  select * into result from public.virla_profiles where id=auth.uid();
  return result;
end $$;
revoke all on function public.virla_ensure_profile() from public;
grant execute on function public.virla_ensure_profile() to authenticated;

create function public.virla_set_member(member_id uuid, member_role text, member_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.virla_role() is distinct from 'admin' then raise exception 'Solo el admin puede gestionar usuarios.' using errcode='42501'; end if;
  if member_role is null or member_role not in ('admin','director','staff') or member_active is null then raise exception 'Rol inválido.'; end if;
  if member_id=auth.uid() and (member_role <> 'admin' or not member_active) then raise exception 'No podés quitar tu propio acceso de admin.'; end if;
  update public.virla_profiles set role=member_role,active=member_active where id=member_id;
  if not found then raise exception 'Usuario no encontrado.'; end if;
end $$;
revoke all on function public.virla_set_member(uuid,text,boolean) from public;
grant execute on function public.virla_set_member(uuid,text,boolean) to authenticated;

create table public.virla_space_profiles (
  id text primary key check (id in ('teatro-300','subsuelo-muestras','bar','radio','boleteria','recepcion')),
  schema_version integer not null default 1 check (schema_version=1),
  status text not null default 'pending' check (status in ('pending','verified')),
  verified_at timestamptz,
  capacity integer check (capacity between 1 and 100000),
  summary text not null default '' check (length(summary)<=1500),
  area text not null default '', dimensions text not null default '', height text not null default '',
  layout text not null default '', access text not null default '',
  equipment text[] not null default '{}', uses text[] not null default '{}',
  considerations text not null default '', stage text not null default '', sound text not null default '',
  lighting text not null default '', projection text not null default '', connectivity text not null default '',
  backstage text not null default '', photo_url text, photo_alt text,
  check (status<>'verified' or verified_at is not null)
);
alter table public.virla_space_profiles enable row level security;
revoke all on public.virla_space_profiles from anon,authenticated;
grant select,insert,update,delete on public.virla_space_profiles to authenticated;
create policy rooms_members_read on public.virla_space_profiles for select to authenticated
using ((select public.virla_role()) in ('admin','director','staff'));
create policy rooms_admin_write on public.virla_space_profiles for all to authenticated
using ((select public.virla_role())='admin') with check ((select public.virla_role())='admin');

-- Identidades operativas existentes; las características quedan por confirmar.
insert into public.virla_space_profiles(id) values
('teatro-300'),('subsuelo-muestras'),('bar'),('radio'),('boleteria'),('recepcion');

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('virla-room-photos','virla-room-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy virla_photos_admin_insert on storage.objects for insert to authenticated
with check (bucket_id='virla-room-photos' and (select public.virla_role())='admin');
create policy virla_photos_admin_update on storage.objects for update to authenticated
using (bucket_id='virla-room-photos' and (select public.virla_role())='admin')
with check (bucket_id='virla-room-photos' and (select public.virla_role())='admin');
create policy virla_photos_admin_delete on storage.objects for delete to authenticated
using (bucket_id='virla-room-photos' and (select public.virla_role())='admin');
create policy virla_photos_admin_read on storage.objects for select to authenticated
using (bucket_id='virla-room-photos' and (select public.virla_role())='admin');
notify pgrst,'reload schema';
commit;
