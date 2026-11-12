begin;
alter table public.prompt_chains add column tool_managed boolean not null default false,
 add column revision integer not null default 1 check(revision>0), add column deleted_at timestamptz;
alter table public.prompt_chain_steps drop constraint prompt_chain_steps_output_field_check;
alter table public.prompt_chain_steps add constraint prompt_chain_steps_output_field_check check(output_field ~ '^[a-z][a-z0-9_]{0,30}$'),
 add column input_mode text not null default 'text' check(input_mode in ('text','image'));
update public.prompt_chain_steps set input_mode='image' where position=1;
create table public.studio_runs(
 id uuid primary key default gen_random_uuid(), chain_id uuid not null references public.prompt_chains(id) on delete restrict,
 actor_id uuid not null references public.profiles(id) on delete restrict, chain_name text not null, revision integer not null,
 config_snapshot jsonb not null, input_text text not null check(length(input_text)<=3000), image_path text,
 status text not null default 'running' check(status in ('running','complete','failed')),
 output_text text, error_code text, created_at timestamptz not null default now(), completed_at timestamptz
);
create index studio_runs_chain_time_idx on public.studio_runs(chain_id,created_at desc);
create index studio_runs_actor_time_idx on public.studio_runs(actor_id,created_at desc);
create index studio_runs_time_idx on public.studio_runs(created_at desc);
create table public.studio_run_steps(
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.studio_runs(id) on delete cascade,
 position integer not null check(position between 1 and 6), name text not null, api_model text not null,
 system_prompt text not null, user_prompt text not null, temperature numeric, output_text text,
 status text not null default 'running' check(status in ('running','complete','failed')),
 error_code text,http_status integer,duration_ms integer,input_tokens integer,output_tokens integer,
 created_at timestamptz not null default now(), unique(run_id,position)
);
alter table public.studio_runs enable row level security;
alter table public.studio_run_steps enable row level security;
revoke all on public.studio_runs,public.studio_run_steps from public,anon,authenticated;
grant select,insert,update,delete on public.studio_runs,public.studio_run_steps to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('chain-studio','chain-studio',false,524288,array['image/webp']);
-- No browser policies: the authenticated, role-checked server mediates all access.
create function public.studio_save_chain(p_actor uuid,p_id uuid,p_revision integer,p_name text,p_description text,p_steps jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare target uuid; old_data jsonb; s jsonb; n integer:=0; sid uuid; m public.llm_models;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_superadmin) then raise exception 'ADMIN_REQUIRED'; end if;
 if length(btrim(p_name)) not between 1 and 100 or p_name is null or p_description is null or length(p_description)>2000 or p_steps is null or jsonb_typeof(p_steps)<>'array' or jsonb_array_length(p_steps)>6 then raise exception 'INVALID_CHAIN'; end if;
 if p_id is null then
  insert into public.prompt_chains(name,description,enabled,tool_managed) values(btrim(p_name),p_description,false,true) returning id into target;
 else
  select to_jsonb(c) into old_data from public.prompt_chains c where id=p_id and tool_managed and deleted_at is null for update;
  if old_data is null then raise exception 'CHAIN_READ_ONLY'; end if;
  if (old_data->>'revision')::integer is distinct from p_revision then raise exception 'STALE_REVISION'; end if;
  if exists(select 1 from public.prompt_chain_mix where chain_id=p_id and enabled and weight>0) then raise exception 'CHAIN_IN_PRODUCTION'; end if;
  target:=p_id;
  update public.prompt_chains set name=btrim(p_name),description=p_description,revision=revision+1 where id=target;
  delete from public.prompt_chain_steps where chain_id=target;
 end if;
 for s in select value from jsonb_array_elements(p_steps) loop
  n:=n+1;
  if length(btrim(s->>'name')) not between 1 and 100 or length(s->>'system_prompt')>8000 or length(btrim(s->>'prompt_template')) not between 1 and 8000 then raise exception 'INVALID_STEP'; end if;
  select * into m from public.llm_models where id=(s->>'model_id')::uuid;
  if m.id is null or not m.enabled or not exists(select 1 from public.llm_providers where id=m.provider_id and enabled and protocol='gemini') then raise exception 'MODEL_UNAVAILABLE'; end if;
  if nullif(s->>'temperature','') is not null and (m.reasoning or not m.supports_temperature) then raise exception 'TEMPERATURE_UNSUPPORTED'; end if;
  sid:=gen_random_uuid();
  insert into public.prompt_chain_steps(id,chain_id,model_id,position,name,output_field,system_prompt,prompt_template,temperature,max_output_tokens,input_mode)
  values(sid,target,m.id,n,btrim(s->>'name'),s->>'output_field',coalesce(s->>'system_prompt',''),s->>'prompt_template',nullif(s->>'temperature','')::numeric,(s->>'max_output_tokens')::integer,s->>'input_mode');
 end loop;
 insert into public.admin_catalog_events(actor_id,entity,action,record_id,before_data,after_data) values(p_actor,'prompt_chains',case when p_id is null then 'create' else 'update' end,target,old_data,jsonb_build_object('name',p_name,'steps',p_steps));
 return target;
end $$;
create function public.studio_delete_chain(p_actor uuid,p_id uuid,p_revision integer,p_restore boolean default false)
returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.prompt_chains;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_superadmin) then raise exception 'ADMIN_REQUIRED'; end if;
 select * into c from public.prompt_chains where id=p_id and tool_managed for update;
 if c.id is null then raise exception 'CHAIN_READ_ONLY'; end if;
 if c.revision is distinct from p_revision then raise exception 'STALE_REVISION'; end if;
 if exists(select 1 from public.prompt_chain_mix where chain_id=p_id and enabled and weight>0) then raise exception 'CHAIN_IN_PRODUCTION'; end if;
 update public.prompt_chains set deleted_at=case when p_restore then null else now() end,revision=revision+1 where id=p_id;
 insert into public.admin_catalog_events(actor_id,entity,action,record_id,before_data,after_data) values(p_actor,'prompt_chains',case when p_restore then 'update' else 'delete' end,p_id,to_jsonb(c),jsonb_build_object('restored',p_restore));
 return p_id;
end $$;
create function public.studio_begin_run(p_actor uuid,p_chain uuid,p_revision integer,p_input text,p_image_path text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare c public.prompt_chains; snapshot jsonb; target uuid; total integer;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_superadmin) then raise exception 'ADMIN_REQUIRED'; end if;
 perform pg_advisory_xact_lock(9112026);
 select * into c from public.prompt_chains where id=p_chain and deleted_at is null for update;
 if c.id is null or c.revision is distinct from p_revision then raise exception 'STALE_REVISION'; end if;
 select count(*),jsonb_agg(to_jsonb(s)||jsonb_build_object('model',to_jsonb(m),'protocol',p.protocol) order by s.position) into total,snapshot
 from public.prompt_chain_steps s join public.llm_models m on m.id=s.model_id join public.llm_providers p on p.id=m.provider_id
 where s.chain_id=p_chain and m.enabled and p.enabled and p.protocol='gemini';
 if total not between 1 and 6 or total<>(select count(*) from public.prompt_chain_steps where chain_id=p_chain) then raise exception 'INVALID_STEPS'; end if;
 if p_input is null or length(p_input)>3000 or (length(btrim(p_input))=0 and p_image_path is null) then raise exception 'INPUT_REQUIRED'; end if;
 if p_image_path is not null and p_image_path !~ ('^'||p_actor::text||'/[a-f0-9-]{36}\.webp$') then raise exception 'INVALID_IMAGE'; end if;
 if p_image_path is null and exists(select 1 from public.prompt_chain_steps where chain_id=p_chain and input_mode='image') then raise exception 'IMAGE_REQUIRED'; end if;
 update public.studio_runs set status='failed',error_code='INTERRUPTED',completed_at=now() where status='running' and created_at<now()-interval '10 minutes';
 if exists(select 1 from public.studio_runs where actor_id=p_actor and status='running') then raise exception 'ALREADY_RUNNING'; end if;
 if (select count(*) from public.studio_runs where actor_id=p_actor and created_at>now()-interval '24 hours')>=10 or (select count(*) from public.studio_runs where created_at>now()-interval '24 hours')>=40 then raise exception 'RUN_LIMIT'; end if;
 insert into public.studio_runs(chain_id,actor_id,chain_name,revision,config_snapshot,input_text,image_path) values(p_chain,p_actor,c.name,c.revision,snapshot,p_input,p_image_path) returning id into target;
 return target;
end $$;
revoke all on function public.studio_save_chain(uuid,uuid,integer,text,text,jsonb),public.studio_delete_chain(uuid,uuid,integer,boolean),public.studio_begin_run(uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.studio_save_chain(uuid,uuid,integer,text,text,jsonb),public.studio_delete_chain(uuid,uuid,integer,boolean),public.studio_begin_run(uuid,uuid,integer,text,text) to service_role;
commit;
