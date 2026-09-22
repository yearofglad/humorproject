# The Humor Project

A Next.js app that reads images and captions from Supabase. Homework 2 includes three sample images and four sample captions; one image has two captions to demonstrate a one-to-many relationship.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 (or the port printed by Next.js).

The current local checkout already has `.env.local` configured. For a fresh checkout, copy `.env.example` to `.env.local`, then fill in your project's URL and publishable key from Supabase's Connect panel:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Restart the development server after changing environment variables. `.env.local` is excluded from Git. Never put a secret or service-role key in a `NEXT_PUBLIC_` variable.

## How the connection works

1. `lib/supabase.ts` reads the connection variables and creates an anonymous Supabase client using `@supabase/supabase-js`.
2. `app/page.tsx` runs a query on the Next.js server:

   ```ts
   const { data, error } = await supabase
     .from("images")
     .select("id, url, description, captions(id, content)");
   ```

3. Supabase uses `captions.image_id` to return each image with its related captions.
4. Next.js renders the records as cards. Refresh the page after editing data to see fresh results.

The MCP connection lets Codex manage the database during development. Your running app connects independently using its environment variables; it does not depend on Codex being open.

## Database

| Table | Columns |
| --- | --- |
| `images` | `id` (UUID primary key), `url`, `description`, `created_at` |
| `captions` | `id` (UUID primary key), `image_id` (foreign key), `content`, `created_at` |

An image can have many captions. Deleting an image also deletes its associated captions. The setup SQL is saved under `supabase/migrations/` and has already been applied to the connected project. Do not run it again on that project. It includes sample data and can initialize a separate empty project.

RLS is enabled on both tables. Anonymous and signed-in visitors have SELECT access only. All rows in these two tables are public sample content. Add ownership and appropriate policies before storing private user data or enabling uploads and edits.

To try the connection, open Supabase's Table Editor, edit a caption's `content`, save, and refresh the app. Use the dashboard to add images and captions for now. Photos are hosted by Lorem Picsum, so they require internet access. Sample captions are fixed examples, not live AI generations.

## Deploy to Vercel

Import this repository into Vercel. In the project's Environment Variables settings, add the same two variables from `.env.local` for the environments you use, then deploy or redeploy. Local environment files are not uploaded through Git.

## Checks

```bash
npm run lint
npm run build
```

Sign-in, uploads, voting, AI generation, and the admin and prompt-testing apps are future work.
