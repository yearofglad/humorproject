begin;

-- Separate editorial provenance from users' private upload/generation histories.
-- These captions were AI-written in the Codex session; no Gemini request is claimed.
create table public.editorial_generations (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.images(id) on delete cascade,
  topic text not null check (topic in ('campus', 'dorm', 'city')),
  model text not null check (char_length(btrim(model)) > 0),
  prompt text not null check (char_length(btrim(prompt)) > 0),
  created_at timestamptz not null default now()
);
alter table public.editorial_generations enable row level security;
create index editorial_generations_image_idx on public.editorial_generations(image_id);
revoke all on public.editorial_generations from public, anon, authenticated;
grant select on public.editorial_generations to anon, authenticated;
grant all on public.editorial_generations to service_role;
create policy "Read published editorial provenance" on public.editorial_generations
  for select to anon, authenticated using (exists (
    select 1 from public.images i where i.id = image_id and i.is_published));

alter table public.captions
  add column editorial_generation_id uuid unique references public.editorial_generations(id) on delete cascade,
  add constraint one_generation_source check (generation_id is null or editorial_generation_id is null);

drop policy "Insert own vote on AI caption" on public.caption_votes;
create policy "Insert own vote on AI caption" on public.caption_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.captions c where c.id = caption_id
      and (c.generation_id is not null or c.editorial_generation_id is not null)));

-- Invoker-rights view: browser roles cannot query this view or other users' votes.
-- Only trusted server code reads totals, then fetches captions using visitor RLS.
create view public.caption_rankings with (security_invoker = true) as
  select c.id, c.topic, c.created_at,
    count(v.caption_id) filter (where v.value = 1) as funny_count
  from public.captions c
  join public.images i on i.id = c.image_id and i.is_published
  left join public.caption_votes v on v.caption_id = c.id
  where c.generation_id is not null or c.editorial_generation_id is not null
  group by c.id, c.topic, c.created_at;
revoke all on public.caption_rankings from public, anon, authenticated;
grant select on public.caption_rankings to service_role;

insert into public.images(id, url, description, is_published) values ('25efc727-d485-5668-b389-2e404bc87737', '/scenes/subway.svg', 'A student waits inside a subway car with blue seats and dark windows.', true);
insert into public.images(id, url, description, is_published) values ('60b2af7c-f429-5fcd-bcde-d50ac27c44de', '/scenes/pizza.svg', 'A student stands at a New York pizza counter beside a large slice.', true);
insert into public.images(id, url, description, is_published) values ('1c5f62ae-33b4-5a40-af73-32e2a82386f5', '/scenes/skyline.svg', 'A student with a tote bag looks toward a city skyline from a park.', true);
insert into public.images(id, url, description, is_published) values ('905b25c5-e801-58b7-916f-44f1854faffe', '/scenes/library.svg', 'A student works at a laptop between library shelves, with a mug on the table.', true);
insert into public.images(id, url, description, is_published) values ('08512094-b971-5b1f-84cc-3de1412f60e1', '/scenes/dorm.svg', 'A student sits at a dorm desk with a laptop and steaming mug; a bed is nearby.', true);

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('bf81e492-9a14-5efc-b918-02172fc0b4a1', '25efc727-d485-5668-b389-2e404bc87737', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: NYC weekends
Scene: A student waits inside a subway car with blue seats and dark windows.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('5eb71695-dec1-5b2a-a68f-ed231cb6df5e', '25efc727-d485-5668-b389-2e404bc87737', 'I left campus to become a city person. Currently becoming a person on the wrong train.', 'bf81e492-9a14-5efc-b918-02172fc0b4a1', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('aecdb132-37bc-5715-8f0c-561f89de43ee', '25efc727-d485-5668-b389-2e404bc87737', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: NYC weekends
Scene: A student waits inside a subway car with blue seats and dark windows.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('1c2cec84-26ba-5cda-8f9e-0699f8e6e7f2', '25efc727-d485-5668-b389-2e404bc87737', 'Back home, twenty minutes away meant driving. Here it means standing still underground.', 'aecdb132-37bc-5715-8f0c-561f89de43ee', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('e82f6030-56b1-5cf1-b1ae-36d4d2d34c99', '60b2af7c-f429-5fcd-bcde-d50ac27c44de', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: NYC weekends
Scene: A student stands at a New York pizza counter beside a large slice.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('b83851c1-b1df-58fb-9eb3-b75ec94bd9ee', '60b2af7c-f429-5fcd-bcde-d50ac27c44de', 'Called it a cheap weekend. The slice was affordable; getting here became a separate budget category.', 'e82f6030-56b1-5cf1-b1ae-36d4d2d34c99', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('fd4cf6ee-c86f-5bf4-8942-b62dd01b5758', '60b2af7c-f429-5fcd-bcde-d50ac27c44de', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: NYC weekends
Scene: A student stands at a New York pizza counter beside a large slice.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('3170ab02-43d3-5175-a9fa-b59fab48a55b', '60b2af7c-f429-5fcd-bcde-d50ac27c44de', 'My weekend itinerary has three neighborhoods and one actual objective: this slice.', 'fd4cf6ee-c86f-5bf4-8942-b62dd01b5758', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('c7055e0c-ae3b-5f8e-91d2-80f322262b7d', '1c5f62ae-33b4-5a40-af73-32e2a82386f5', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: NYC weekends
Scene: A student with a tote bag looks toward a city skyline from a park.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('d56bb50f-023a-5fbc-82b9-57fa4efb6b49', '1c5f62ae-33b4-5a40-af73-32e2a82386f5', 'Packed my tote for a spontaneous afternoon with the confidence of someone preparing to cross an ocean.', 'c7055e0c-ae3b-5f8e-91d2-80f322262b7d', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('99980991-a9e4-5c03-9d15-3a28d3004619', '1c5f62ae-33b4-5a40-af73-32e2a82386f5', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: NYC weekends
Scene: A student with a tote bag looks toward a city skyline from a park.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('6e3eab72-ef2f-5dc5-b780-1d9b34e81563', '1c5f62ae-33b4-5a40-af73-32e2a82386f5', 'Came for the skyline. Stayed because sitting in the park is the only part of this itinerary under budget.', '99980991-a9e4-5c03-9d15-3a28d3004619', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('5ddcd70d-a254-5e63-a6c6-09fc98d4ab59', '905b25c5-e801-58b7-916f-44f1854faffe', 'campus', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: Campus life
Scene: A student works at a laptop between library shelves, with a mug on the table.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('152fb54f-09cd-50c8-b6db-ca854dc91a63', '905b25c5-e801-58b7-916f-44f1854faffe', 'Found the perfect library spot. Now I have to do the work I used finding it to avoid.', '5ddcd70d-a254-5e63-a6c6-09fc98d4ab59', 'campus');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('2c1f20f1-36a2-5c69-bdcc-97c0fff99ecd', '905b25c5-e801-58b7-916f-44f1854faffe', 'campus', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: Campus life
Scene: A student works at a laptop between library shelves, with a mug on the table.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('815090ae-7920-5fba-8215-02dba5f66690', '905b25c5-e801-58b7-916f-44f1854faffe', 'The books are organized by subject. My tabs are organized by panic.', '2c1f20f1-36a2-5c69-bdcc-97c0fff99ecd', 'campus');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('79b07565-9b68-51ac-b609-1feb98d48873', '905b25c5-e801-58b7-916f-44f1854faffe', 'campus', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: Campus life
Scene: A student works at a laptop between library shelves, with a mug on the table.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('3db21a18-a2dd-56ce-8d68-3ac3d20cb21a', '905b25c5-e801-58b7-916f-44f1854faffe', 'Opened my laptop for one reading. The mug has seen three refills and no conclusions.', '79b07565-9b68-51ac-b609-1feb98d48873', 'campus');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('0ce743b0-79c1-5c27-9050-9777676d4539', '08512094-b971-5b1f-84cc-3de1412f60e1', 'dorm', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: Dorm energy
Scene: A student sits at a dorm desk with a laptop and steaming mug; a bed is nearby.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('b6aa400b-e620-5631-85c8-9364152d9065', '08512094-b971-5b1f-84cc-3de1412f60e1', 'The bed is three feet from my desk. Somehow the commute still makes me late.', '0ce743b0-79c1-5c27-9050-9777676d4539', 'dorm');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('30599538-f0cf-5743-b439-0f4dbcf0b9ea', '08512094-b971-5b1f-84cc-3de1412f60e1', 'dorm', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: Dorm energy
Scene: A student sits at a dorm desk with a laptop and steaming mug; a bed is nearby.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('42e7eb6b-2d12-547f-92d9-d85254f02c3c', '08512094-b971-5b1f-84cc-3de1412f60e1', 'Made coffee to finish the assignment. Now I am awake enough to reorganize every folder except that one.', '30599538-f0cf-5743-b439-0f4dbcf0b9ea', 'dorm');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('ecf95532-7a99-5b22-b03c-ad22bdde29e0', '08512094-b971-5b1f-84cc-3de1412f60e1', 'dorm', 'GPT-6 (Codex editorial session)', 'Write one original observational caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Use the supplied pixel illustration scene and topic. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news. Return only the caption.
Topic: Dorm energy
Scene: A student sits at a dorm desk with a laptop and steaming mug; a bed is nearby.');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('38f4aeb6-4720-58af-9de4-9d496a89e592', '08512094-b971-5b1f-84cc-3de1412f60e1', 'Small dorm, big dreams, and a mug occupying the last available square foot.', 'ecf95532-7a99-5b22-b03c-ad22bdde29e0', 'dorm');

commit;
