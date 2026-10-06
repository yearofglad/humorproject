import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { captionPrompt, parseOutput, dailyPrompt, isTopic } from '../lib/generation.ts';
const userA = '00000000-0000-4000-8000-000000000001';
const userB = '00000000-0000-4000-8000-000000000002';
const photoA = '00000000-0000-4000-8000-000000000011';
const photoB = '00000000-0000-4000-8000-000000000012';

test('prompt and output validation preserves context and rejects malformed model results', () => {
  assert.equal(isTopic('__proto__'), false);
  assert.equal(isTopic('city'), true);
  assert.match(captionPrompt('A dog yawning', 'dorm', 'a late assignment'), /A dog yawning/);
  assert.equal(parseOutput('{"caption":"  Office hours for my sleep debt.  "}', 'caption'), 'Office hours for my sleep debt.');
  for (const raw of ['not json', '{}', '{"caption":null}', JSON.stringify({caption:'x'.repeat(241)})]) assert.throws(() => parseOutput(raw,'caption'));
  assert.equal(dailyPrompt(new Date('2026-10-06T05:00:00Z')), dailyPrompt(new Date('2026-10-07T03:00:00Z')));
});

test('full migration chain enforces ownership, safe publication, votes, Storage RLS and quotas', async () => {
  const db = new PGlite();
  const q = (sql, args = []) => db.query(sql, args);
  async function as(role, id = '') {
    await db.exec('reset role');
    await q("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    await db.exec(`set role ${role}`);
  }
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      grant usage on schema auth, storage to anon, authenticated, service_role;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1, '/') $$;
      create table auth.users(id uuid primary key, email text);
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
      grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
    `);
    for (const file of (await readdir(new URL('../supabase/migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()) {
      await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'));
    }
    await q('insert into auth.users values ($1,$2),($3,$4)', [userA, 'a@example.com', userB, 'b@example.com']);
    await db.exec("update public.profiles set first_name='Test', last_name='Person'");
    const tables = await q("select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r'");
    assert.ok(tables.rows.every(t => t.relrowsecurity), 'Every app table has RLS');
    const sample = (await q('select id from public.captions limit 1')).rows[0].id;
    await as('anon');
    assert.ok((await q('select * from public.captions')).rows.length > 0, 'public gallery readable');
    for (const table of ['profiles', 'generations', 'caption_votes']) await assert.rejects(q(`select * from public.${table}`), /permission denied/);
    await assert.rejects(q('insert into public.caption_votes(caption_id,user_id,value) values($1,$2,1)',[sample,userA]), /permission denied/);
    await as('authenticated', userA);
    assert.equal((await q('select id from public.profiles')).rows.length, 1);
    assert.equal((await q('update public.profiles set first_name=$1 where id=$2 returning id',['Intruder',userB])).rows.length,0);
    assert.equal((await q('update public.profiles set first_name=$1 where id=$2 returning id',['Sam',userA])).rows.length,1);
    await assert.rejects(q('update public.profiles set email=$1 where id=$2',['fake@example.com',userA]), /permission denied/);
    await assert.rejects(q('update public.profiles set id=$1 where id=$2',[userB,userA]), /permission denied/);
    await assert.rejects(q('delete from public.profiles'), /permission denied/);
    await assert.rejects(q('select public.reserve_generation($1,$2,$3,$4,$5,$6)',[userA,'campus','','test','system','describe']), /permission denied/);
    await q("insert into storage.objects(bucket_id,name) values('avatars',$1)", [userA+'/avatar.webp']);
    await assert.rejects(q("insert into storage.objects(bucket_id,name) values('avatars',$1)",[userB+'/forged.webp']), /row-level security/);
    await q("insert into storage.objects(bucket_id,name) values('caption-images',$1)",[userA+'/photo.webp']);
    await q('insert into public.images(id,url,description,owner_id,storage_path) values($1,$2,$3,$4,$5)',[photoA,'https://example.com/a','draft',userA,userA+'/photo.webp']);
    await assert.rejects(q('insert into public.images(id,url,description,owner_id,storage_path) values($1,$2,$3,$4,$5)',[photoB,'https://example.com/b','draft',userB,userB+'/photo.webp']), /row-level security/);
    await assert.rejects(q('update public.images set is_published=true where id=$1',[photoA]), /permission denied/);
    await as('authenticated', userB);
    assert.equal((await q('select id from public.images where id=$1',[photoA])).rows.length,0);
    assert.equal((await q('select * from storage.objects')).rows.length,0);
    await as('anon');
    assert.equal((await q("select * from storage.objects where bucket_id='caption-images'")).rows.length,0);
    await as('service_role');
    const reserve = () => q('select public.reserve_generation($1,$2,$3,$4,$5,$6) as id',[userA,'campus','context','test-model','system prompt','description prompt']);
    const generation = (await reserve()).rows[0].id;
    await assert.rejects(reserve(), /ALREADY_GENERATING/);
    await q('update public.generations set image_id=$1,image_description=$2,caption_prompt=$3 where id=$4',[photoA,'A sleepy dog','caption prompt',generation]);
    const caption = (await q('select public.complete_generation($1,$2) as id',[generation,'My sleep schedule has office hours.'])).rows[0].id;
    await assert.rejects(q('select public.complete_generation($1,$2)',[generation,'duplicate']), /INVALID_GENERATION/);
    await as('anon');
    assert.equal((await q('select id from public.captions where id=$1',[caption])).rows.length,1);
    assert.equal((await q("select * from storage.objects where bucket_id='caption-images'")).rows.length,1);
    await as('authenticated',userA);
    assert.equal((await q('select * from public.generations')).rows[0].caption_prompt,'caption prompt');
    await assert.rejects(q('insert into public.captions(image_id,content) values($1,$2)',[photoA,'fake AI']), /permission denied/);
    await assert.rejects(q('insert into public.caption_votes(caption_id,user_id,value) values($1,$2,1)',[sample,userA]), /row-level security/);
    await q('insert into public.caption_votes(caption_id,user_id,value) values($1,$2,1)',[caption,userA]);
    await assert.rejects(q('insert into public.caption_votes(caption_id,user_id,value) values($1,$2,1)',[caption,userA]), /unique constraint/);
    await q('update public.caption_votes set value=-1 where caption_id=$1',[caption]);
    assert.equal((await q('select value from public.caption_votes')).rows[0].value,-1);
    await assert.rejects(q('update public.caption_votes set user_id=$1',[userB]), /permission denied/);
    await assert.rejects(q('update public.caption_votes set value=8'), /check constraint/);
    assert.equal((await q("delete from storage.objects where bucket_id='caption-images' returning id")).rows.length,0,'Published photos cannot be broken by owner');
    await as('authenticated', userB);
    assert.equal((await q('select * from public.generations')).rows.length,0);
    assert.equal((await q('select * from public.caption_votes')).rows.length,0);
    assert.equal((await q('update public.caption_votes set value=1 returning caption_id')).rows.length,0);
    await assert.rejects(q('insert into public.caption_votes(caption_id,user_id,value) values($1,$2,1)',[caption,userA]), /row-level security/);
    await q('insert into public.caption_votes(caption_id,user_id,value) values($1,$2,1)',[caption,userB]);
    await as('service_role');
    for (let i=0;i<4;i++) {
      const id=(await reserve()).rows[0].id;
      await q("update public.generations set status='failed' where id=$1",[id]);
    }
    await assert.rejects(reserve(), /USER_LIMIT/);
  } finally { await db.close(); }
});
