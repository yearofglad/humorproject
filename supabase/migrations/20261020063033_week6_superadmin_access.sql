begin;
alter table public.profiles add column is_superadmin boolean not null default false;
-- Existing column-scoped UPDATE grants deliberately exclude the new role field.
update public.profiles set is_superadmin = true
where id in ('071c6a40-4930-480c-98ff-e7fc551a665f','1ba19d50-638f-4095-bd9a-5d9025b50fd0');

create table public.admin_media_events (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references public.profiles(id),
 action text not null check (action in ('create','update','delete')),
 caption_id uuid not null,
 before_data jsonb,
 after_data jsonb,
 created_at timestamptz not null default now()
);
alter table public.admin_media_events enable row level security;
revoke all on public.admin_media_events from public, anon, authenticated;
grant select,insert on public.admin_media_events to service_role;
create index admin_media_events_created_idx on public.admin_media_events(created_at desc);

create function public.admin_manage_caption(p_actor uuid, p_action text, p_data jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare old_row public.captions; new_row public.captions; editorial uuid; target uuid;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_superadmin) then
  raise exception 'ADMIN_REQUIRED';
 end if;
 if p_action not in ('create','update','delete') then raise exception 'INVALID_ACTION'; end if;
 if p_action <> 'delete' then
  if char_length(btrim(coalesce(p_data->>'content',''))) not between 1 and 240
   or coalesce(p_data->>'topic','') not in ('campus','dorm','city') then raise exception 'INVALID_CAPTION'; end if;
 end if;
 if p_action='create' then
  if char_length(btrim(coalesce(p_data->>'model',''))) not between 1 and 120
   or char_length(btrim(coalesce(p_data->>'prompt',''))) not between 1 and 20000 then raise exception 'PROVENANCE_REQUIRED'; end if;
  if not exists(select 1 from public.images where id=(p_data->>'image_id')::uuid and is_published) then raise exception 'INVALID_IMAGE'; end if;
  insert into public.editorial_generations(image_id,topic,model,prompt)
  values((p_data->>'image_id')::uuid,p_data->>'topic',btrim(p_data->>'model'),btrim(p_data->>'prompt')) returning id into editorial;
  insert into public.captions(image_id,content,topic,editorial_generation_id,is_listed)
  values((p_data->>'image_id')::uuid,btrim(p_data->>'content'),p_data->>'topic',editorial,coalesce((p_data->>'is_listed')::boolean,false)) returning * into new_row;
  target:=new_row.id;
 else
  select * into old_row from public.captions where id=(p_data->>'id')::uuid for update;
  if not found or (old_row.generation_id is null and old_row.editorial_generation_id is null) then raise exception 'AI_CAPTION_NOT_FOUND'; end if;
  target:=old_row.id;
  if p_action='update' then
   update public.captions set content=btrim(p_data->>'content'),topic=p_data->>'topic',is_listed=coalesce((p_data->>'is_listed')::boolean,false)
    where id=target returning * into new_row;
  else
   delete from public.captions where id=target;
   if old_row.editorial_generation_id is not null then delete from public.editorial_generations where id=old_row.editorial_generation_id; end if;
  end if;
 end if;
 insert into public.admin_media_events(actor_id,action,caption_id,before_data,after_data)
 values(p_actor,p_action,target,case when p_action='create' then null else to_jsonb(old_row) end,case when p_action='delete' then null else to_jsonb(new_row) end);
 return target;
end;
$$;
revoke all on function public.admin_manage_caption(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_manage_caption(uuid,text,jsonb) to service_role;
commit;
