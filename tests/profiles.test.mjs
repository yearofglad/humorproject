import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { validateNames } from "../lib/profile-validation.ts";

test("names must both be present, trimmed, and bounded", () => {
  assert.deepEqual(validateNames("  Ada ", " Lovelace  "), { first_name: "Ada", last_name: "Lovelace" });
  for (const [first, last] of [[null, "Doe"], ["", "Doe"], ["Jane", "  "], ["a".repeat(81), "Doe"]]) {
    assert.equal(validateNames(first, last), null);
  }
  assert.deepEqual(validateNames("李", "王"), { first_name: "李", last_name: "王" });
});

test("migration creates and backfills profiles without giving browsers access or changing RLS", async () => {
  const db = new PGlite();
  try {
    // Minimal Supabase schemas in an isolated real PostgreSQL engine.
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create schema storage;
      create table auth.users (id uuid primary key, email text);
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      insert into auth.users values ('00000000-0000-4000-8000-000000000001', 'existing@example.com');
      create table public.existing_data (id integer);
      alter table public.existing_data enable row level security;
      create policy existing_policy on public.existing_data for select using (true);
    `);
    const before = await db.query("select * from pg_policies");
    await db.exec(await readFile(new URL("../supabase/migrations/20260927190725_create_profiles_and_avatars.sql", import.meta.url), "utf8"));
    assert.deepEqual((await db.query("select * from pg_policies")).rows, before.rows);
    await db.exec("insert into auth.users values ('00000000-0000-4000-8000-000000000002', 'new@example.com')");
    const profiles = await db.query("select * from public.profiles order by id");
    assert.equal(profiles.rows.length, 2);
    assert.equal(profiles.rows[1].first_name, null);
    assert.equal(profiles.rows[1].last_name, null);
    assert.equal(profiles.rows[0].email, "existing@example.com");
    assert.equal(profiles.rows[1].email, "new@example.com");
    await db.exec("update auth.users set email = 'updated@example.com' where id = '00000000-0000-4000-8000-000000000002'");
    assert.equal((await db.query("select email from public.profiles where id = '00000000-0000-4000-8000-000000000002'")).rows[0].email, "updated@example.com");
    await assert.rejects(db.exec("insert into auth.users values ('00000000-0000-4000-8000-000000000003', null)"), /not-null constraint/);
    await assert.rejects(db.exec("insert into auth.users values ('00000000-0000-4000-8000-000000000003', 'existing@example.com')"), /unique constraint/);
    for (const role of ["anon", "authenticated"]) {
      const privileges = await db.query(`select has_table_privilege('${role}', 'public.profiles', 'SELECT') as read, has_table_privilege('${role}', 'public.profiles', 'UPDATE') as write, has_function_privilege('${role}', 'humor_private.handle_new_user()', 'EXECUTE') as execute`);
      assert.deepEqual(privileges.rows[0], { read: false, write: false, execute: false });
    }
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select * from public.profiles"), /permission denied/);
    await db.exec("reset role");
    await db.exec("set role service_role");
    await db.exec("update public.profiles set first_name = 'Ada', last_name = 'Lovelace' where id = '00000000-0000-4000-8000-000000000002'");
    assert.equal((await db.query("select first_name from public.profiles where id = '00000000-0000-4000-8000-000000000002'")).rows[0].first_name, "Ada");
    await db.exec("reset role");
    await assert.rejects(db.exec("update public.profiles set avatar_path = 'another-user/photo.webp'"), /check constraint/);
    await assert.rejects(db.exec("update public.profiles set first_name = '   '"), /check constraint/);
    assert.equal((await db.query("select public from storage.buckets where id = 'avatars'")).rows[0].public, false);
    await db.exec("delete from auth.users where id = '00000000-0000-4000-8000-000000000002'");
    assert.equal((await db.query("select * from public.profiles")).rows.length, 1);
  } finally {
    await db.close();
  }
});
