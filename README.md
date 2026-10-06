# The Humor Project

The assignment #2 caption gallery, extended with Google sign-in, profiles, private photo uploads, and a protected `/members` lounge. Continue using the existing GitHub repository, Supabase project, and Vercel project.

## Run locally

Use Node.js 22.18+ (or Node.js 24+). The tests use Node's built-in TypeScript support.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

If `.env.local` already exists, add the missing variables without replacing its existing connection settings:

| Variable | Where to get it | Visibility |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project's Connect panel | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase API keys | Public |
| `SUPABASE_SECRET_KEY` | Supabase secret key, or legacy `service_role` key | **Server only** |

Never put the Supabase secret key in a `NEXT_PUBLIC_` variable, source control, a screenshot, or browser code. `.env.local` is ignored by Git. There is no Google Client Secret environment variable.

## 1. Install the profiles migration in the existing Supabase project

The new migration is prepared locally; it has **not** been applied to the hosted database:

`supabase/migrations/20260927190725_create_profiles_and_avatars.sql`

Open the existing project's SQL Editor and run that file once, in full. Do not rerun the assignment #2 migration. The new migration is transactional and intentionally fails if the new table, schema, trigger, or `avatars` bucket already exists, so inspect any collision rather than overwriting existing resources.

It creates:

- `public.profiles`: one row per `auth.users.id`, a required unique `email`, nullable `first_name` and `last_name`, an optional `avatar_path`, and timestamps.
- An `AFTER INSERT` trigger on `auth.users` that inserts the profile on the first successful sign-in. Names start as `NULL`, so the app prompts the user to provide them.
- A backfill for accounts that existed before this migration and an email-change trigger to keep the profile email synchronized with Auth. The profile form cannot edit email. This Google-only app requires an email for every existing account; inspect phone-only or anonymous accounts before applying the migration.
- A private `avatars` Storage bucket. Actual photo bytes live in Storage, never in the relational profile row.

**No RLS settings or policies are created, enabled, disabled, or updated.** To avoid exposing profiles while complying with the assignment, direct `anon` and `authenticated` table privileges are revoked. The server verifies the user's identity with `auth.getUser()` and scopes all profile queries to that verified ID. Its privileged Supabase client is guarded by `server-only`.

The trigger function is isolated in `humor_private`, has an empty search path, and cannot be called by browser roles. The trigger itself runs with its owner's privileges. Photos are uploaded by authenticated server code and displayed using signed URLs valid for five minutes; no Storage policies are added. A database advisor may flag the intentional lack of RLS on `profiles`; direct browser table access is denied through privileges instead for this assignment.

After applying the migration, verify in SQL Editor:

```sql
select count(*) as users_without_profiles
from auth.users u left join public.profiles p on p.id = u.id
where p.id is null;
-- Expected: 0

select has_table_privilege('anon', 'public.profiles', 'SELECT') as anonymous_read,
       has_table_privilege('authenticated', 'public.profiles', 'UPDATE') as browser_write;
-- Expected: false, false

select tgname from pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal;
-- Includes on_auth_user_created_profile

select id, public from storage.buckets where id = 'avatars';
-- Expected: avatars, false
```

## 2. Create your own Google OAuth client

This implementation follows the lecture's **Supabase OAuth authorization-code flow with PKCE**. Supabase handles the Google provider; the browser stores a code verifier, and `/auth/callback` exchanges the returned code for session cookies using `exchangeCodeForSession`.

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview) in your Google Cloud project. Configure Branding, Audience, and the basic `openid`, email, and profile scopes. If the app is in Testing, add your own account and any grader accounts as test users; alternatively configure the appropriate published audience.
2. Create a **Web application** OAuth client in Clients. Add the app's local and deployed origins under Authorized JavaScript origins.
3. In Google, set the authorized redirect URI to **`https://YOUR-PROJECT.supabase.co/auth/v1/callback`**. Copy the exact callback URL from your existing Supabase project's Google provider settings, especially if you use a custom Auth domain.
4. In Supabase → Authentication → Sign In / Providers → Google, enable the provider and enter that Google client ID and client secret. These credentials stay in Supabase; **the Next.js app needs neither a Google client secret nor a Google client ID environment variable**. Current Supabase documentation requires the provider secret for this authorization-code flow. The lecture's statement about not needing a secret in the application should not be interpreted as omitting Supabase's provider configuration.
5. In Supabase → Authentication → URL Configuration, set the Site URL to the main app URL. Add **`http://localhost:3000/auth/callback`** and **`https://YOUR-DEPLOYMENT.vercel.app/auth/callback`** to the redirect allowlist. Use the actual local port if it differs. Do not append `?next=`, other custom query parameters, or a trailing slash.
6. Restart the app after setting its Supabase environment variables.

The two redirect settings serve different hops:

| Configured in | Redirect destination |
| --- | --- |
| Google OAuth client | Supabase's `/auth/v1/callback` |
| Supabase Auth allowlist and app `redirectTo` | Your app's `/auth/callback` |

The browser calls `signInWithOAuth` with exactly the app's `/auth/callback` as `redirectTo`. Supabase sends the browser through Google and back through Supabase, then returns to the app with a provider-generated `?code=...`. That returned code parameter is necessary and is different from adding custom parameters to the configured redirect URI. The callback exchanges it for a session and redirects to `/members`, which prompts for missing names through `/profile`.

Codes are short-lived and single-use. Do not implement a fixed 30-second timeout based on the lecture's illustrative duration; Supabase controls their expiry. Sessions use expiring access tokens plus refresh tokens, rather than one permanently valid token.

References: [Supabase Google OAuth setup](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Supabase server-side clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

## Routes and behavior

| Route | Behavior |
| --- | --- |
| `/` | Public assignment #2 image and caption gallery; navigation changes with sign-in state |
| `/login` | Google sign-in; existing sessions go to the lounge |
| `/auth/callback` | Exchanges a one-use OAuth code using the browser’s PKCE verifier; failures return to sign-in |
| `/profile` | Requires a verified session; prompts for missing names and allows name/photo edits |
| `/members` | Requires a verified session and both names; contains members-only content |

`proxy.ts` refreshes session cookies. Authorization also runs in protected pages and the profile action; hiding navigation alone never grants access. Sign-out is a POST Server Action. Profile updates use the session's user ID, not a hidden form field or editable metadata.

Photos are limited to 2 MB and JPEG, PNG, or WebP input. The server checks and decodes the content, rejects excessive pixel dimensions, removes metadata, crops to 512×512, and uploads WebP to the private bucket. The form allows 3 MB of request data for upload overhead. A successful replacement removes the old photo; a failed database update attempts to remove the new upload.

## 3. Deploy to the same Vercel project

1. Add all three environment variables above in the existing Vercel project for Production and Preview as needed. Keep `SUPABASE_SECRET_KEY` marked sensitive and server-only.
2. Commit and push the changes to the same repository, then let the existing integration deploy that commit. A new Vercel or Supabase project is unnecessary.
3. Open that deployment's details and copy its unique deployment URL. Use the deployment tied to the submitted commit, not a moving production or branch alias.
4. Add that **exact deployment `/auth/callback` URI** to Supabase's redirect allowlist and the deployment origin to Google's authorized JavaScript origins. Google's redirect URI stays pointed at Supabase's `/auth/v1/callback`.
5. In the existing Vercel project's Settings → Deployment Protection, turn off Vercel Authentication for the deployment being submitted (and any other configured deployment gate). Save. This removes Vercel's outer login screen; the app's own `/members` authentication remains enforced.
6. Open the unique URL in a fresh Incognito window and complete the checks below.
7. Submit that unique, commit-specific URL in the assignment's Submissions section.

This code-only preparation does not create the Google client, change hosted settings, deploy, or submit a URL.

## Verification

```sh
npm test
npm run lint
npm run build
```

In environments that prevent Turbopack from opening a local worker port, use `npm run build -- --webpack`. This production build was verified with that alternate bundler.

To repeat the signed-out HTTP checks, start the built app with `npm run start -- --port 3100`, then run `node scripts/check-auth.mjs` in another terminal. Set `TEST_BASE_URL` to use another host or port. This checks protected-route redirects and safe handling of missing codes/provider errors and rejection of the removed ID-token POST endpoint without signing anyone in.

The automated tests run the actual migration in an isolated PostgreSQL engine with minimal Auth and Storage schemas. They verify backfill, synchronized Auth/profile IDs and emails, trigger-created nullable names, database constraints, restricted browser privileges, privileged server writes, cascade deletion, and unchanged existing RLS policies. They also test name validation. These tests do not replace a hosted Supabase/Google integration test.

Once configured, verify manually:

1. In Incognito, the gallery opens without a Vercel login prompt. Direct visits to `/members` and `/profile` redirect to `/login`.
2. Sign in with a new Google account. Confirm exactly one profile row appears with the matching Auth user ID, and that the app prompts for both names.
3. Submit an empty or whitespace-only name: the form must reject it. Save both names, then open the members' lounge.
4. Upload a valid photo. Refresh `/profile` and confirm names and photo persist. Replace the photo and confirm the new image appears. Try a non-image and a file over 2 MB: neither should save.
5. Sign out, then directly revisit both protected URLs; neither should show private content. Sign in again and confirm the profile remains and no duplicate row is created.
6. Test a second account. It must have its own profile and photo. First-user data must never appear for the second user.
7. Confirm the unique deployment URL has its `/auth/callback` registered in Supabase before submission.

The required [OAuth/OpenID Connect video](https://youtu.be/996OiexHze0) is linked for viewing; its transcript was not available during code preparation.

## Lecture alignment

The supplied September 25 lecture transcript was reviewed. It recommends matching Auth/profile UUIDs (11:18 and 59:16), copying email (12:47 and 18:47), exchanging OAuth codes (26:28–30:46), configuring the two separate callback destinations (32:03–37:20), and storing profile photos in object storage (1:01:43–1:05:56).

The app stores the persistent Storage object path and creates a temporary signed URL when displaying the private photo. Storing that expiring URL permanently would break the image after it expires. Re-uploading replaces the single profile reference. Historical meme uploads belong in a separate, user-linked table when that future feature is implemented; they are not part of this profile assignment.

A signed-in JWT identifies the user but does not itself grant unrestricted write access: database privileges and, once introduced, RLS determine authorization. We retain the original assignment's instruction not to modify RLS. The lecture's permission to turn it off during testing is not needed here.

Writer-room meetings, Bradley Fang's research, and humor-study announcements are course participation information, not additional app features.
