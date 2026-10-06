# The Humor Project

A photo-caption feed for Columbia students: upload a photo, generate a campus, dorm, or NYC caption with Gemini, vote Funny / Not for me, revisit My likes, and share a caption permalink. Existing Google sign-in and profiles are retained.

## Setup

Use Node 22.18+ or 24+. Run `npm ci`, copy `.env.example` to `.env.local` only if it does not already exist, fill in the settings, then run `npm run dev`.

| Variable | Source | Visibility |
| --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Existing Supabase project | Public |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Supabase API keys | Public |
| SUPABASE_SECRET_KEY | Supabase secret key | Server only |
| GEMINI_API_KEY | Google AI Studio API keys | Server only |
| GEMINI_MODEL | Defaults to gemini-3.1-flash-lite | Server configuration |

Never commit `.env.local` or expose secret keys with a NEXT_PUBLIC prefix. Add the same values in the existing Vercel project's environment settings and redeploy. Gemini availability and quotas depend on your Google project.

## Database

The Assignment 4 migration is `supabase/migrations/20261006050245_caption_generation_votes_rls.sql`. It was applied to the existing Humor Project on October 6, 2026. Do not run it again. For a fresh database, run all migration files in timestamp order. SQL Editor takes the **contents** of a file, not its filename.

All five public tables have RLS. Profiles and generation history are visible only to their owner. Profile writes use the signed-in user's client and permit only editable fields. Uploaded photos live in private Storage buckets; database rows store paths and URLs, never image bytes. Published caption photos can receive signed viewing URLs; profile photos remain owner-only.

Users insert their own votes. The first vote creates a row; changing a vote updates that same row. A composite primary key prevents duplicate votes per person and caption. Users cannot read or change anyone else's votes, forge an AI caption, or publish a draft through the browser API. Human-written starter examples are labeled and cannot receive votes.

Generation reserves an attempt using a server-only database function, describes the uploaded photo with Gemini, saves the exact prompts and description, requests a caption, and publishes the image and caption atomically. Only trusted server code can invoke these functions. Limits are five attempts per user per rolling 24 hours, one recent in-flight attempt, and 100 attempts across the site per rolling 24 hours. Failed attempts count toward limits; failures never publish unfinished captions. Private generation history shows prompts, model, and status.

Supabase's security advisor reported only the existing leaked-password-protection setting; this app uses Google OAuth. No database security warnings remained after the migration.

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

## Routes

| Route | Access |
| --- | --- |
| / | Public feed, theme filters, paginated newest captions |
| /?view=likes | Signed-in user's Funny votes |
| /captions/[id] | Public caption permalink |
| /create | Signed in, completed profile; upload and generation history |
| /profile | Signed in; edit names and photo |
| /members | Signed in, completed profile; welcome page |
| /login | Google sign-in |
| /auth/callback | PKCE code exchange |

Pages and server actions both check authentication. RLS independently enforces database ownership. Uploads must be JPEG, PNG, or WebP under 2 MB; the server decodes, resizes and strips metadata before storing WebP.

## Deploy and submit

Use the existing Vercel project. Set all environment variables above for Production (and Preview if used). Push the commit to the linked repository. In Vercel Settings → Deployment Protection, disable Vercel Authentication for the submitted deployment. Add the new unique deployment URL plus `/auth/callback` to Supabase's redirect allowlist. Keep Site URL set to `https://humorproject-psi.vercel.app`. Google's OAuth redirect remains Supabase's `/auth/v1/callback`.

Submit the unique deployment URL tied to the tested commit, rather than the moving main or production alias. Check it in Incognito before submission.

## Verification

Run `npm test`, `npm run lint`, and `npm run build -- --webpack`. Tests execute the full migration chain in isolated PostgreSQL, verifying RLS across anonymous and two authenticated users, profile and Storage ownership, publication, vote insert/update restrictions, private prompts, quotas, and malformed AI output.

Start the production app on port 3100, then run `node scripts/check-auth.mjs`. For a deployed app set TEST_BASE_URL. This checks protected routes and callback handling.

With real Google and Gemini accounts, additionally verify:

1. Incognito opens the feed without a Vercel gate; Create and Profile require sign-in.
2. A new account completes its names and can update its avatar.
3. Upload a photo and generate a caption; refresh and confirm the published image and caption persist. Inspect saved prompts under Create.
4. Vote Funny, refresh, and find it under My likes. Change to Not for me and confirm it leaves My likes.
5. A second account has independent votes, profile, and generation history.
6. Share a caption link and open it signed out; reading works and voting requests sign-in.
7. Record PM feedback in `docs/product.md`, implement agreed changes, and repeat relevant checks.

A successful build and isolated database tests do not replace the real Google/Gemini end-to-end checks.
