begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique check (char_length(btrim(email)) > 0),
  first_name text check (first_name is null or char_length(btrim(first_name)) between 1 and 80),
  last_name text check (last_name is null or char_length(btrim(last_name)) between 1 and 80),
  avatar_path text check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Assignment requirement: do not change RLS settings or policies.
-- Instead, deny all direct browser/API access; authenticated server code
-- verifies the session and scopes every privileged query to that user's ID.
revoke all on public.profiles from public, anon, authenticated;
grant select, insert, update, delete on public.profiles to service_role;

create schema humor_private;
revoke all on schema humor_private from public, anon, authenticated;

-- Only invoked by the auth.users INSERT trigger, not through the Data API.
-- NEW.id is the inserted auth identity; no client-supplied owner is accepted.
create function humor_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function humor_private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function humor_private.handle_new_user();

-- Covers users who signed in before this assignment was installed.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- Keep the read-only profile email synchronized if Auth confirms a change.
create function humor_private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email, updated_at = now()
  where id = new.id;
  return new;
end;
$$;
revoke all on function humor_private.sync_profile_email() from public, anon, authenticated;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function humor_private.sync_profile_email();

-- Binary data lives in Storage, never in the profiles table.
-- Server uploads and short-lived signed URLs work without adding Storage policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/webp']);

commit;
