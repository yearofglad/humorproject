import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/profile";
import { createAuthClient } from "@/lib/supabase/server";
import type { FeedCaption } from "@/lib/feed";
import { CaptionCard } from "@/app/components/caption-card";

export default async function CaptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createAuthClient();
  const user = await currentUser();
  const { data, error } = await supabase.from("captions").select("id, content, generation_id, topic, created_at, images!inner(url, description, storage_path)").eq("id", id).maybeSingle();
  if (error) throw new Error("Caption unavailable");
  if (!data) notFound();
  const vote = user ? await supabase.from("caption_votes").select("value").eq("caption_id", id).eq("user_id", user.id).maybeSingle() : null;
  return <main className="page-shell narrow"><Link className="inline-link" href="/">← Back to the gallery</Link>
    <div className="single-caption"><CaptionCard caption={data as unknown as FeedCaption} signedIn={Boolean(user)} vote={vote?.data?.value} /></div>
    <Link className="button" href="/create">Make one with your photo →</Link>
  </main>;
}
