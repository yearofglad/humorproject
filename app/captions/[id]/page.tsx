import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/profile";
import { createAuthClient } from "@/lib/supabase/server";
import { CAPTION_FIELDS, captionLikes, type FeedCaption } from "@/lib/feed";
import { CaptionCard } from "@/app/components/caption-card";

export default async function CaptionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{published?:string}> }) {
  const { id } = await params;
  const {published}=await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createAuthClient();
  const user = await currentUser();
  const { data, error } = await supabase.from("captions").select(CAPTION_FIELDS).eq("id", id).maybeSingle();
  if (error) throw new Error("Caption unavailable");
  if (!data) notFound();
  const caption = data as unknown as FeedCaption;
  const vote = user ? await supabase.from("caption_votes").select("value").eq("caption_id", id).eq("user_id", user.id).maybeSingle() : null;
  let likes: number | undefined;
  try { likes = (await captionLikes([id])).get(id); } catch { /* Reading and rating still work while totals recover. */ }
  const editorial = caption.editorial_generation_id ? await supabase.from("editorial_generations")
    .select("model, prompt").eq("id", caption.editorial_generation_id).maybeSingle() : null;
  // RLS allows the creator to inspect exact prompts without exposing their context to other users.
  const generation = caption.generation_id && user ? await supabase.from("generations")
    .select("model, system_prompt, description_prompt, caption_prompt").eq("id", caption.generation_id).maybeSingle() : null;
  return <main className="page-shell narrow"><Link className="inline-link" href="/">← Back to the gallery</Link>
    {published==="1"&&generation?.data&&<div className="publish-success" role="status"><h1>Your caption is published</h1><p>It’s now in the gallery and ready to share.</p></div>}
    {vote?.error && <p className="notice" role="alert">We couldn’t load your rating. Refresh before rating again.</p>}
    <div className="single-caption"><CaptionCard key={`${id}-${vote?.data?.value ?? 0}-${likes ?? "unknown"}`} caption={caption} signedIn={Boolean(user) && !vote?.error} vote={vote?.data?.value} likes={likes} /></div>
    {(caption.generation_id || caption.editorial_generation_id) && <section className="prompt-panel" id="prompt" aria-labelledby="prompt-heading">
      <h2 id="prompt-heading">Behind the caption</h2>
      {editorial?.error || generation?.error ? <p role="alert">The saved prompt is temporarily unavailable. Please refresh.</p> : editorial?.data ? <>
        <p>AI caption · {caption.images.url.startsWith("/photos/") ? "Real photograph" : "Illustration"}</p>
        <dl><div><dt>Model</dt><dd>{editorial.data.model}</dd></div></dl>
        <details open><summary>Saved AI prompt</summary><dl><div><dt>Editorial generation brief</dt><dd>{editorial.data.prompt}</dd></div></dl></details>
      </> : generation?.data ? <>
        <p>Your saved prompts are private.</p>
        <dl><div><dt>Model</dt><dd>{generation.data.model}</dd></div></dl>
        <details open><summary>Saved AI prompts</summary><dl>
          <div><dt>Caption prompt</dt><dd>{generation.data.caption_prompt}</dd></div>
          <div><dt>Photo description prompt</dt><dd>{generation.data.description_prompt}</dd></div>
          <div><dt>System prompt</dt><dd>{generation.data.system_prompt}</dd></div>
        </dl></details>
      </> : <p>Prompts are private to the creator. <Link className="text-button" href={user ? "/create" : "/login"}>View your prompts →</Link></p>}
    </section>}
    <Link className="button" href="/create">Create a caption →</Link>
  </main>;
}
