begin;

-- Assignment 4 supersedes the previous assignment's no-RLS constraint.
alter table public.profiles enable row level security;
alter table public.images enable row level security;
alter table public.captions enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (first_name, last_name, avatar_path, updated_at) on public.profiles to authenticated;
create policy "Read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "Update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter table public.images
  add column owner_id uuid references public.profiles(id) on delete cascade,
  add column storage_path text,
  add column is_published boolean not null default false,
  add constraint image_storage_owner check (storage_path is null or split_part(storage_path, '/', 1) = owner_id::text);
-- Existing assignment #2 images are public samples, not AI-generated claims.
update public.images set is_published = true where owner_id is null;
create index images_owner_idx on public.images(owner_id);
create unique index images_storage_path_idx on public.images(storage_path) where storage_path is not null;
drop policy "Read public images" on public.images;
revoke all on public.images from public, anon, authenticated;
grant select on public.images to anon, authenticated;
grant insert (id, url, description, owner_id, storage_path) on public.images to authenticated;
grant delete on public.images to authenticated;
create policy "Read published images or own drafts" on public.images for select to anon, authenticated
  using (is_published or owner_id = (select auth.uid()));
create policy "Insert own image draft" on public.images for insert to authenticated
  with check (owner_id = (select auth.uid()) and storage_path is not null
    and split_part(storage_path, '/', 1) = (select auth.uid())::text and not is_published);
create policy "Delete own unpublished image" on public.images for delete to authenticated
  using (owner_id = (select auth.uid()) and not is_published);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_id uuid references public.images(id) on delete set null,
  topic text not null check (topic in ('campus', 'dorm', 'city')),
  context text not null check (char_length(context) <= 300),
  model text not null,
  system_prompt text not null,
  description_prompt text not null,
  caption_prompt text,
  image_description text,
  status text not null default 'pending' check (status in ('pending', 'complete', 'failed')),
  created_at timestamptz not null default now()
);
alter table public.generations enable row level security;
create index generations_user_created_idx on public.generations(user_id, created_at desc);
create index generations_created_idx on public.generations(created_at desc);
create index generations_image_idx on public.generations(image_id);
revoke all on public.generations from public, anon, authenticated;
grant select on public.generations to authenticated;
grant all on public.generations to service_role;
create policy "Read own generation history" on public.generations for select to authenticated
  using (user_id = (select auth.uid()));

alter table public.captions
  add column generation_id uuid unique references public.generations(id) on delete cascade,
  add column topic text check (topic in ('campus', 'dorm', 'city'));
create index captions_created_idx on public.captions(created_at desc, id);
create index captions_topic_created_idx on public.captions(topic, created_at desc);
revoke all on public.captions from public, anon, authenticated;
grant select on public.captions to anon, authenticated;
grant all on public.images, public.captions to service_role;
-- Only the trusted AI completion transaction can publish captions.
drop policy "Read public captions" on public.captions;
create policy "Read captions for published images" on public.captions for select to anon, authenticated
  using (exists (select 1 from public.images i where i.id = image_id and i.is_published));

create table public.caption_votes (
  caption_id uuid not null references public.captions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (caption_id, user_id)
);
alter table public.caption_votes enable row level security;
create index caption_votes_user_idx on public.caption_votes(user_id, value, created_at desc);
revoke all on public.caption_votes from public, anon, authenticated;
grant select on public.caption_votes to authenticated;
grant insert (caption_id, user_id, value), update (value) on public.caption_votes to authenticated;
grant all on public.caption_votes to service_role;
create policy "Read own votes" on public.caption_votes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Insert own vote on AI caption" on public.caption_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.captions c where c.id = caption_id and c.generation_id is not null));
create policy "Change own vote" on public.caption_votes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Storage's managed tables already use RLS. Add bucket-scoped policies only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('caption-images', 'caption-images', false, 2097152, array['image/webp']);
create policy "Read own avatar" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Upload own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Remove own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Read caption photos" on storage.objects for select to anon, authenticated
  using (bucket_id = 'caption-images' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.images i where i.storage_path = name and i.is_published)));
create policy "Upload own caption photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'caption-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Remove own unpublished caption photo" on storage.objects for delete to authenticated
  using (bucket_id = 'caption-images' and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (select 1 from public.images i where i.storage_path = name and i.is_published));

-- Service-only, invoker-rights functions: no public SECURITY DEFINER endpoints.
-- A short global lock makes the daily quota check atomic across instances.
create function public.reserve_generation(p_user uuid, p_topic text, p_context text,
  p_model text, p_system text, p_description_prompt text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare new_id uuid;
begin
  perform pg_advisory_xact_lock(6142026);
  if not exists (select 1 from public.profiles where id = p_user
    and first_name is not null and last_name is not null) then
    raise exception 'PROFILE_REQUIRED';
  end if;
  if (select count(*) from public.generations where user_id = p_user
      and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'USER_LIMIT';
  end if;
  if (select count(*) from public.generations where created_at > now() - interval '24 hours') >= 100 then
    raise exception 'SITE_LIMIT';
  end if;
  if exists (select 1 from public.generations where user_id = p_user and status = 'pending'
      and created_at > now() - interval '2 minutes') then
    raise exception 'ALREADY_GENERATING';
  end if;
  insert into public.generations(user_id, topic, context, model, system_prompt, description_prompt)
  values(p_user, p_topic, p_context, p_model, p_system, p_description_prompt) returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.reserve_generation(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_generation(uuid, text, text, text, text, text) to service_role;

create function public.complete_generation(p_generation uuid, p_caption text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare g public.generations; new_caption uuid;
begin
  select * into g from public.generations where id = p_generation for update;
  if not found or g.status <> 'pending' or g.image_description is null or g.caption_prompt is null then
    raise exception 'INVALID_GENERATION';
  end if;
  if char_length(btrim(p_caption)) not between 1 and 240 then raise exception 'INVALID_CAPTION'; end if;
  update public.images set description = g.image_description, is_published = true
    where id = g.image_id and owner_id = g.user_id;
  if not found then raise exception 'INVALID_IMAGE'; end if;
  insert into public.captions(image_id, content, generation_id, topic)
    values (g.image_id, btrim(p_caption), g.id, g.topic) returning id into new_caption;
  update public.generations set status = 'complete' where id = g.id;
  return new_caption;
end;
$$;
revoke all on function public.complete_generation(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_generation(uuid, text) to service_role;

commit;
