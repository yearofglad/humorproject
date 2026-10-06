import "server-only";
import { createAuthClient } from "@/lib/supabase/server";
export type FeedCaption = { id: string; content: string; generation_id: string | null; topic: string | null; created_at: string; images: { url: string; description: string; storage_path: string | null } };
export async function imageUrl(image: FeedCaption["images"]) {
  if (!image.storage_path) return image.url;
  const supabase = await createAuthClient();
  const { data } = await supabase.storage.from("caption-images").createSignedUrl(image.storage_path, 3600);
  return data?.signedUrl ?? null;
}
