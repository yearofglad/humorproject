create table public.images (
  id uuid primary key default gen_random_uuid(),
  url text not null check (length(trim(url)) > 0),
  description text not null,
  created_at timestamptz not null default now()
);

create table public.captions (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.images(id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index captions_image_id_idx on public.captions(image_id);
alter table public.images enable row level security;
alter table public.captions enable row level security;

-- This starter contains public sample content only. Public clients may read,
-- but edits are made through the Supabase dashboard or authorized admin tools.
revoke all on public.images, public.captions from anon, authenticated;
grant select on public.images, public.captions to anon, authenticated;
create policy "Read public images" on public.images
  for select to anon, authenticated using (true);
create policy "Read public captions" on public.captions
  for select to anon, authenticated using (true);

with image as (
  insert into public.images (url, description)
  values ('https://picsum.photos/id/10/900/600', 'A peaceful forest and lake landscape')
  returning id
)
insert into public.captions (image_id, content)
select image.id, caption.content from image cross join (values
  ('My five-minute study break has entered its wilderness era.'),
  ('Great Wi-Fi password. Terrible Wi-Fi location.')
) as caption(content);

with image as (
  insert into public.images (url, description)
  values ('https://picsum.photos/id/29/900/600', 'Mountains beneath a dramatic sky')
  returning id
)
insert into public.captions (image_id, content)
select id, 'The learning curve after the professor says this part is straightforward.' from image;

with image as (
  insert into public.images (url, description)
  values ('https://picsum.photos/id/1062/900/600', 'A dog bundled in a blanket')
  returning id
)
insert into public.captions (image_id, content)
select id, 'Camera off. Academic potential on.' from image;
