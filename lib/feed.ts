import "server-only";
import { createAuthClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export type FeedCaption = { id: string; content: string; generation_id: string | null; editorial_generation_id: string | null; topic: string | null; created_at: string; images: { url: string; description: string; storage_path: string | null } };
export const CAPTION_FIELDS = "id, content, generation_id, editorial_generation_id, topic, created_at, images!inner(url, description, storage_path)";

// The service-only view returns aggregate counts, never voters or private prompts.
// Read captions themselves with the visitor's client so publication RLS still applies.
export async function captionLikes(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const { data, error } = await createAdminClient().from("caption_rankings")
    .select("id, funny_count").in("id", ids);
  if (error) throw new Error("Caption counts unavailable");
  return new Map<string, number>(data.map(row => [row.id, Number(row.funny_count)]));
}
export async function imageUrl(image: FeedCaption["images"]) {
  if (!image.storage_path) return image.url;
  const supabase = await createAuthClient();
  const { data } = await supabase.storage.from("caption-images").createSignedUrl(image.storage_path, 3600);
  return data?.signedUrl ?? null;
}
