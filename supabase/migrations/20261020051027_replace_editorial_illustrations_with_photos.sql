begin;

-- Retire illustrated editorial entries from discovery, preserving their original
-- content, saved provenance, votes, and shared permalinks.
alter table public.captions add column is_listed boolean not null default true;
update public.captions set is_listed = false where editorial_generation_id is not null
  and image_id in (select id from public.images where url like '/scenes/%');

create or replace view public.caption_rankings with (security_invoker = true) as
  select c.id, c.topic, c.created_at,
    count(v.caption_id) filter (where v.value = 1) as funny_count, c.is_listed
  from public.captions c
  join public.images i on i.id = c.image_id and i.is_published
  left join public.caption_votes v on v.caption_id = c.id
  where c.generation_id is not null or c.editorial_generation_id is not null
  group by c.id, c.topic, c.created_at, c.is_listed;
revoke all on public.caption_rankings from public, anon, authenticated;
grant select on public.caption_rankings to service_role;

-- Real, attributed photographs. Only the captions are AI-generated.
insert into public.images(id, url, description, is_published) values ('f804e1f6-2b6d-5f00-9892-65e2387c1fc4', '/photos/subway.webp', 'A real photograph inside a New York City R46 subway car, with orange and yellow seats, metal poles, and seated passengers.', true);
insert into public.images(id, url, description, is_published) values ('669f0719-2f3d-5a75-b3e9-796bd47593e8', '/photos/pizza.webp', 'A real close-up photograph of a New York-style cheese pizza, with melted cheese, browned crust, and slices cut into a whole pie.', true);
insert into public.images(id, url, description, is_published) values ('4eeaae88-825e-5243-8702-acc0b04b87ce', '/photos/central-park.webp', 'A real photograph of a grassy Central Park baseball field with people, trees, and Manhattan buildings in the background.', true);
insert into public.images(id, url, description, is_published) values ('5dd29dd1-968a-5782-be0a-eef51ec02776', '/photos/butler.webp', 'A real photograph of the front of Butler Library at Columbia University: a long row of stone columns, named authors on the facade, lawns, and people walking toward the entrance.', true);
insert into public.images(id, url, description, is_published) values ('7a4fac69-e0a2-5cba-8338-3d560bd016f1', '/photos/dorm.webp', 'A real photograph of a shared dorm room at Westfield State College with two pink-covered beds, crowded desks, laptops, a window fan, and a narrow rug between the furniture. Do not claim the pictured room is at Columbia.', true);

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('72b4315a-8e3d-58e3-9cd8-7eff8c371372', 'f804e1f6-2b6d-5f00-9892-65e2387c1fc4', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: NYC weekends
Photo description: A real photograph inside a New York City R46 subway car, with orange and yellow seats, metal poles, and seated passengers.
Photo source: https://commons.wikimedia.org/wiki/File:NYCS_R46_interior.jpg');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('71d974c6-b72b-55f7-8ad0-0976391750bd', 'f804e1f6-2b6d-5f00-9892-65e2387c1fc4', 'An entire row of empty seats and I still chose to stand there looking like I knew which stop was mine.', '72b4315a-8e3d-58e3-9cd8-7eff8c371372', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('909fb790-4fc9-5e89-a96c-19933b74a237', 'f804e1f6-2b6d-5f00-9892-65e2387c1fc4', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: NYC weekends
Photo description: A real photograph inside a New York City R46 subway car, with orange and yellow seats, metal poles, and seated passengers.
Photo source: https://commons.wikimedia.org/wiki/File:NYCS_R46_interior.jpg');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('2c5292a9-23f3-5e69-b773-3422dddd3aee', 'f804e1f6-2b6d-5f00-9892-65e2387c1fc4', 'Back home, twenty minutes away meant driving. Here it means getting emotionally attached to an orange plastic seat.', '909fb790-4fc9-5e89-a96c-19933b74a237', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('2e00c038-1ee2-5801-80fe-8fae11676054', '669f0719-2f3d-5a75-b3e9-796bd47593e8', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: NYC weekends
Photo description: A real close-up photograph of a New York-style cheese pizza, with melted cheese, browned crust, and slices cut into a whole pie.
Photo source: https://commons.wikimedia.org/wiki/File:NYPizzaPie.jpg');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('b63d0084-36b8-5254-bec6-ff3686196b94', '669f0719-2f3d-5a75-b3e9-796bd47593e8', 'My weekend itinerary had three neighborhoods. This cheese situation has successfully narrowed the scope.', '2e00c038-1ee2-5801-80fe-8fae11676054', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('0a75b012-24a9-5590-996e-82028301a949', '669f0719-2f3d-5a75-b3e9-796bd47593e8', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: NYC weekends
Photo description: A real close-up photograph of a New York-style cheese pizza, with melted cheese, browned crust, and slices cut into a whole pie.
Photo source: https://commons.wikimedia.org/wiki/File:NYPizzaPie.jpg');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('aa18eca3-9a2d-5508-815f-b4c09e00ee52', '669f0719-2f3d-5a75-b3e9-796bd47593e8', 'The group chat said split a pizza. I have prepared an argument for why my half is six slices.', '0a75b012-24a9-5590-996e-82028301a949', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('8b58d95c-9ba4-5828-a497-d5970284b9df', '4eeaae88-825e-5243-8702-acc0b04b87ce', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: NYC weekends
Photo description: A real photograph of a grassy Central Park baseball field with people, trees, and Manhattan buildings in the background.
Photo source: https://commons.wikimedia.org/wiki/File:Central_Park_Skyline.jpg');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('1dd57d1f-9b2e-5caf-b57d-7ed85e6c3128', '4eeaae88-825e-5243-8702-acc0b04b87ce', 'Moved to New York for the skyline. Spent Saturday staring at grass like I had never seen the Midwest.', '8b58d95c-9ba4-5828-a497-d5970284b9df', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('360b5898-92f4-5b64-b97f-c91a68d8740b', '4eeaae88-825e-5243-8702-acc0b04b87ce', 'city', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: NYC weekends
Photo description: A real photograph of a grassy Central Park baseball field with people, trees, and Manhattan buildings in the background.
Photo source: https://commons.wikimedia.org/wiki/File:Central_Park_Skyline.jpg');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('7e52734f-68ef-5cc7-a034-0bb9f111253e', '4eeaae88-825e-5243-8702-acc0b04b87ce', 'Finally found a Manhattan activity where looking at the expensive buildings does not require entering one.', '360b5898-92f4-5b64-b97f-c91a68d8740b', 'city');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('c5774f8c-8f99-5d4d-bba9-469bd7f43cee', '5dd29dd1-968a-5782-be0a-eef51ec02776', 'campus', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: Campus life
Photo description: A real photograph of the front of Butler Library at Columbia University: a long row of stone columns, named authors on the facade, lawns, and people walking toward the entrance.
Photo source: https://commons.wikimedia.org/wiki/File:2014_Columbia_University_Butler_Library_from_front.jpg');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('6debc9f0-6037-5c45-b22f-2d66309f82be', '5dd29dd1-968a-5782-be0a-eef51ec02776', 'Butler put all those authors on the building. I put one reading on my to-do list and called it ambitious.', 'c5774f8c-8f99-5d4d-bba9-469bd7f43cee', 'campus');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('3e9e60a3-177f-5573-ae71-bb0f5269b023', '5dd29dd1-968a-5782-be0a-eef51ec02776', 'campus', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: Campus life
Photo description: A real photograph of the front of Butler Library at Columbia University: a long row of stone columns, named authors on the facade, lawns, and people walking toward the entrance.
Photo source: https://commons.wikimedia.org/wiki/File:2014_Columbia_University_Butler_Library_from_front.jpg');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('16c2beae-891c-5dc5-8956-ae70464dc6db', '5dd29dd1-968a-5782-be0a-eef51ec02776', 'Walked toward those columns like I was about to become a scholar. First order of business: find an outlet.', '3e9e60a3-177f-5573-ae71-bb0f5269b023', 'campus');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('da61ebc8-bd99-565c-8c16-9beb229edf3b', '5dd29dd1-968a-5782-be0a-eef51ec02776', 'campus', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: Campus life
Photo description: A real photograph of the front of Butler Library at Columbia University: a long row of stone columns, named authors on the facade, lawns, and people walking toward the entrance.
Photo source: https://commons.wikimedia.org/wiki/File:2014_Columbia_University_Butler_Library_from_front.jpg');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('6d9ce69b-e2ea-51bb-b3d2-0c143b63508b', '5dd29dd1-968a-5782-be0a-eef51ec02776', 'A whole lawn between me and the reading I said I would start twenty minutes ago. Powerful campus design.', 'da61ebc8-bd99-565c-8c16-9beb229edf3b', 'campus');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('b7be8c04-0f1c-532b-8770-25e5fb777f4f', '7a4fac69-e0a2-5cba-8338-3d560bd016f1', 'dorm', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: Dorm energy
Photo description: A real photograph of a shared dorm room at Westfield State College with two pink-covered beds, crowded desks, laptops, a window fan, and a narrow rug between the furniture. Do not claim the pictured room is at Columbia.
Photo source: https://commons.wikimedia.org/wiki/File:Dormroom.JPG');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('13114d27-3d84-5467-a5aa-f85ebe03afbf', '7a4fac69-e0a2-5cba-8338-3d560bd016f1', 'Two beds, two desks, one narrow path. My roommate and I have accidentally enrolled in traffic engineering.', 'b7be8c04-0f1c-532b-8770-25e5fb777f4f', 'dorm');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('63390015-901d-5161-89a8-70ce12f7624d', '7a4fac69-e0a2-5cba-8338-3d560bd016f1', 'dorm', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: Dorm energy
Photo description: A real photograph of a shared dorm room at Westfield State College with two pink-covered beds, crowded desks, laptops, a window fan, and a narrow rug between the furniture. Do not claim the pictured room is at Columbia.
Photo source: https://commons.wikimedia.org/wiki/File:Dormroom.JPG');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('610164f2-0353-53f3-be97-5b85a427a3eb', '7a4fac69-e0a2-5cba-8338-3d560bd016f1', 'The matching pink bedding says we have a system. The desk surfaces have declined to comment.', '63390015-901d-5161-89a8-70ce12f7624d', 'dorm');

insert into public.editorial_generations(id, image_id, topic, model, prompt) values ('1aae5047-cd88-5ec9-813d-5069c3d65f1e', '7a4fac69-e0a2-5cba-8338-3d560bd016f1', 'dorm', 'GPT-6 (Codex editorial session)', 'Write one original observational photo caption for Sam, a Columbia junior from the Midwest who lives in a dorm and explores NYC on weekends. Ground the joke in the supplied real photograph description. Keep it under 35 words and 240 characters. Be specific, kind, and relatable; no invented news or claims about identifiable people. Return only the caption.
Topic: Dorm energy
Photo description: A real photograph of a shared dorm room at Westfield State College with two pink-covered beds, crowded desks, laptops, a window fan, and a narrow rug between the furniture. Do not claim the pictured room is at Columbia.
Photo source: https://commons.wikimedia.org/wiki/File:Dormroom.JPG');
insert into public.captions(id, image_id, content, editorial_generation_id, topic) values ('bf82e106-ffd5-5250-b70c-47d8bfadc1e4', '7a4fac69-e0a2-5cba-8338-3d560bd016f1', 'The window fan is the only thing in this room with a consistent work schedule.', '1aae5047-cd88-5ec9-813d-5069c3d65f1e', 'dorm');

commit;
