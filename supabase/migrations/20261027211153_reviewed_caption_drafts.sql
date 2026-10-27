begin;
alter table public.generations drop constraint generations_status_check;
alter table public.generations add constraint generations_status_check check(status in ('pending','ready','complete','failed'));
alter table public.generations add column ai_caption text check(ai_caption is null or char_length(btrim(ai_caption)) between 1 and 240),
 add column draft_caption text check(draft_caption is null or char_length(btrim(draft_caption)) between 1 and 240),
 add column draft_updated_at timestamptz;
alter table public.captions add column edited_by_creator boolean not null default false;

create function public.save_generated_draft(p_generation uuid,p_caption text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare g public.generations;
begin
 select * into g from public.generations where id=p_generation for update;
 if not found or g.status<>'pending' or g.image_description is null or g.caption_prompt is null then raise exception 'INVALID_GENERATION'; end if;
 if char_length(btrim(coalesce(p_caption,''))) not between 1 and 240 then raise exception 'INVALID_CAPTION'; end if;
 update public.images set description=g.image_description where id=g.image_id and owner_id=g.user_id and not is_published;
 if not found then raise exception 'INVALID_IMAGE'; end if;
 update public.generations set ai_caption=btrim(p_caption),draft_caption=btrim(p_caption),status='ready',draft_updated_at=now() where id=g.id;
 return g.id;
end $$;
revoke all on function public.save_generated_draft(uuid,text) from public,anon,authenticated;
grant execute on function public.save_generated_draft(uuid,text) to service_role;

create function public.manage_generated_draft(p_actor uuid,p_generation uuid,p_caption text,p_publish boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare g public.generations; result uuid;
begin
 select * into g from public.generations where id=p_generation and user_id=p_actor for update;
 if not found then raise exception 'DRAFT_NOT_FOUND'; end if;
 if p_publish and g.status='complete' then
  select id into result from public.captions where generation_id=g.id;
  if result is not null then return result; end if;
 end if;
 if g.status<>'ready' then raise exception 'DRAFT_NOT_READY'; end if;
 if char_length(btrim(coalesce(p_caption,''))) not between 1 and 240 then raise exception 'INVALID_CAPTION'; end if;
 if not p_publish then
  update public.generations set draft_caption=btrim(p_caption),draft_updated_at=now() where id=g.id;
  return g.id;
 end if;
 update public.images set description=g.image_description,is_published=true where id=g.image_id and owner_id=p_actor;
 if not found then raise exception 'INVALID_IMAGE'; end if;
 insert into public.captions(image_id,content,generation_id,topic,edited_by_creator)
 values(g.image_id,btrim(p_caption),g.id,g.topic,btrim(p_caption) is distinct from g.ai_caption) returning id into result;
 update public.generations set status='complete',draft_caption=btrim(p_caption),draft_updated_at=now() where id=g.id;
 return result;
end $$;
revoke all on function public.manage_generated_draft(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.manage_generated_draft(uuid,uuid,text,boolean) to service_role;

-- A provider outage should not spend a user's draft allowance. The global
-- request cap still counts every call, and invalid model outputs still count.
create or replace function public.reserve_generation(p_user uuid,p_topic text,p_context text,
 p_model text,p_system text,p_description_prompt text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare new_id uuid;
begin
 perform pg_advisory_xact_lock(6142026);
 if not exists(select 1 from public.profiles where id=p_user and first_name is not null and last_name is not null) then raise exception 'PROFILE_REQUIRED'; end if;
 if (select count(*) from public.generations g where user_id=p_user and created_at>now()-interval '24 hours'
   and not (g.status='failed' and (coalesce(g.error_code,'') in ('AI_BUSY','AI_TIMEOUT','AI_CONFIG')
    or exists(select 1 from public.llm_responses r where r.generation_id=g.id and r.http_status in (404,429,500,502,503,504))))) >=5 then raise exception 'USER_LIMIT'; end if;
 if (select count(*) from public.generations where created_at>now()-interval '24 hours')>=100 then raise exception 'SITE_LIMIT'; end if;
 if exists(select 1 from public.generations where user_id=p_user and status='pending' and created_at>now()-interval '2 minutes') then raise exception 'ALREADY_GENERATING'; end if;
 insert into public.generations(user_id,topic,context,model,system_prompt,description_prompt)
 values(p_user,p_topic,p_context,p_model,p_system,p_description_prompt) returning id into new_id;
 return new_id;
end $$;
create or replace function public.admin_catalog_mutate(p_actor uuid,p_entity text,p_action text,p_id uuid,p_values jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare allowed text[]; cols text; vals text; sets text; old_data jsonb; new_data jsonb; target uuid; key text;
begin
 if not exists(select 1 from public.profiles where id=p_actor and is_superadmin) then raise exception 'ADMIN_REQUIRED'; end if;
 if p_action is null or p_action not in ('create','update','delete') or jsonb_typeof(p_values)<>'object' then raise exception 'INVALID_ACTION'; end if;
 allowed:=case p_entity
 when 'terms' then array['term','definition','example','topic']
 when 'ai_generation_examples' then array['image_description','caption','topic','enabled']
 when 'llm_providers' then array['name','slug','protocol','enabled','description']
 when 'llm_models' then array['provider_id','name','api_model','reasoning','supports_temperature','enabled']
 when 'allowed_signup_domains' then array['domain','enabled','notes']
 when 'whitelisted_emails' then array['email','enabled','notes']
 when 'prompt_chain_mix' then array['weight','enabled','notes']
 when 'images' then case when p_action='create' then array['url','description','owner_id','storage_path','is_published'] else array['description','is_published'] end
 else null end;
 if allowed is null or (p_entity='prompt_chain_mix' and p_action<>'update') then raise exception 'ENTITY_READ_ONLY'; end if;
 for key in select jsonb_object_keys(p_values) loop
  if not key=any(allowed) then raise exception 'INVALID_FIELD'; end if;
 end loop;
 if p_entity='prompt_chain_mix' then perform pg_advisory_xact_lock(7272026); end if;
 if p_action<>'create' then
  execute format('select to_jsonb(t) from public.%I t where id=$1 for update',p_entity) into old_data using p_id;
  if old_data is null then raise exception 'RECORD_NOT_FOUND'; end if;
 end if;
 if p_entity='images' then
  if p_action='create' and ((p_values->>'owner_id')::uuid is distinct from p_actor or split_part(p_values->>'storage_path','/',1) is distinct from p_actor::text
   or p_values->>'url' not like 'https://%') then raise exception 'INVALID_IMAGE_OWNER'; end if;
  if p_action='delete' and (exists(select 1 from public.captions where image_id=p_id) or exists(select 1 from public.generations where image_id=p_id and status in ('pending','ready'))) then raise exception 'IMAGE_IN_USE'; end if;
 end if;
 if p_action='delete' then
  execute format('delete from public.%I where id=$1',p_entity) using p_id; target:=p_id;
 else
  select string_agg(format('%I',k),','),string_agg(format('(jsonb_populate_record(null::public.%I,$1)).%I',p_entity,k),','),
   string_agg(format('%I=(jsonb_populate_record(null::public.%I,$1)).%I',k,p_entity,k),',')
   into cols,vals,sets from jsonb_object_keys(p_values) k;
  if cols is null then raise exception 'NO_FIELDS'; end if;
  if p_action='create' then
   execute format('insert into public.%I (%s) select %s returning id,to_jsonb(%I.*)',p_entity,cols,vals,p_entity) into target,new_data using p_values;
  else
   execute format('update public.%I set %s where id=$2 returning id,to_jsonb(%I.*)',p_entity,sets,p_entity) into target,new_data using p_values,p_id;
  end if;
 end if;
 if p_entity='prompt_chain_mix' and not exists(select 1 from public.prompt_chain_mix m join public.prompt_chains c on c.id=m.chain_id where m.enabled and m.weight>0 and c.enabled) then raise exception 'MIX_REQUIRES_ACTIVE_CHAIN'; end if;
 insert into public.admin_catalog_events(actor_id,entity,action,record_id,before_data,after_data) values(p_actor,p_entity,p_action,target,old_data,new_data);
 return target;
end $$;

commit;
