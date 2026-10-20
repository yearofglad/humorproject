import "server-only";
import { createClient } from "@supabase/supabase-js";

// Never pass this client to a browser. Mutations require a verified user.
// Public feed readers may query only the aggregate caption_rankings view.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("The server's Supabase secret key is missing.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
