-- Integration smoke test. Everything, including test identities, is rolled back.
begin;
insert into auth.users(id,email) values
('00000000-0000-4000-a000-000000000001','virla-qa-admin@example.invalid'),
('00000000-0000-4000-a000-000000000002','virla-qa-director@example.invalid'),
('00000000-0000-4000-a000-000000000003','virla-qa-staff@example.invalid'),
('00000000-0000-4000-a000-000000000004','virla-qa-other@example.invalid');
insert into public.virla_profiles(id,email,role,active)
select id,email,case right(id::text,1) when '1' then 'admin' when '2' then 'director' else 'staff' end,true from auth.users where id in
('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000002','00000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000004');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000003',true);
do $$ declare b public.virla_bookings; begin
select * into b from public.virla_create_booking(jsonb_build_object('spaceId','teatro-300','title','QA rollback only','description','Integration test, not a real event','activityType','meeting','date',current_date+10,'startTime','09:00','endTime','10:00','responsibleName','QA staff','contact','qa@example.invalid'));
if b.status<>'pending' then raise exception 'FAIL: staff request must be pending';end if;
perform set_config('virla.qa_booking',b.id::text,true);
begin perform public.virla_decide_booking(b.id,true,'');raise exception 'FAIL: staff approved a booking';exception when insufficient_privilege then null;end;
begin perform public.virla_set_member(auth.uid(),'admin',true);raise exception 'FAIL: staff escalated role';exception when insufficient_privilege then null;end;
if (select count(*) from public.virla_booking_private where booking_id=b.id)<>1 then raise exception 'FAIL: own private details missing';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000004',true);
do $$ begin
if exists(select 1 from public.virla_bookings where id=current_setting('virla.qa_booking')::uuid) then raise exception 'FAIL: another staff sees pending request';end if;
if exists(select 1 from public.virla_booking_private where booking_id=current_setting('virla.qa_booking')::uuid) then raise exception 'FAIL: another staff sees contact';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000002',true);
do $$ declare b public.virla_bookings;begin
if (select count(*) from public.virla_notifications where booking_id=current_setting('virla.qa_booking')::uuid)<>1 then raise exception 'FAIL: director notice missing';end if;
select * into b from public.virla_decide_booking(current_setting('virla.qa_booking')::uuid,true,'Approved in rollback test');
if b.status<>'confirmed' then raise exception 'FAIL: approval not confirmed';end if;
begin
perform public.virla_create_booking(jsonb_build_object('spaceId','teatro-300','title','QA conflict','description','Integration test, not a real event','activityType','meeting','date',current_date+10,'startTime','09:30','endTime','10:30','responsibleName','QA director','contact','qa@example.invalid'));
raise exception 'FAIL: overlapping booking accepted';exception when exclusion_violation then null;end;
begin perform public.virla_set_member(auth.uid(),'admin',true);raise exception 'FAIL: director escalated role';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000003',true);
do $$ begin if (select count(*) from public.virla_notifications where booking_id=current_setting('virla.qa_booking')::uuid and kind='confirmed')<>1 then raise exception 'FAIL: confirmation notice missing';end if;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000004',true);
do $$ begin
if not exists(select 1 from public.virla_bookings where id=current_setting('virla.qa_booking')::uuid and status='confirmed') then raise exception 'FAIL: confirmed agenda not visible';end if;
if exists(select 1 from public.virla_booking_private where booking_id=current_setting('virla.qa_booking')::uuid) then raise exception 'FAIL: agenda leaks contact';end if;
end $$;
reset role;
rollback;
select 'PASS: staff, director, isolation, approval, notices, overlap; test data rolled back' as result;
